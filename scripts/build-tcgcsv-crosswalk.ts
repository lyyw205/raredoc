/**
 * TCGCSV 크로스워크 빌더 — price-collector "map once" 단계 (결정적 스크립트, LLM 없음).
 *
 * 무엇: TCGCSV 상품(productId) → 우리 RegionCard 매핑을 ExternalIdMapping(sourceId=tcgcsv)에 1회 적재.
 *       이후 sync-prices-tcgcsv 가 productId 로 id-join 해서 *가격만* 매일 새로고침("id-join-forever").
 *
 * 정체성(N5): ExternalIdMapping.sourceId → ExternalSource('tcgcsv')  [매핑/카탈로그 레지스트리]
 *            가격은 별개로 Price.sourceId → PriceSource('tcgplayer') 가 받음(sync 단계).
 *
 * ★매칭 = (세트코드패밀리 + 번호) + 이름검증:
 *   ① 그룹 → 우리 세트'들'(union): TCGplayer는 본탄+갤러리(TG/SV/GG)를 한 그룹에 담는데 우리는 두 Set 로
 *      쪼개 같은 공식코드를 (정당히) 공유한다 → 한 그룹을 그 코드를 공유하는 우리 세트 전부의 번호 union 에 매칭.
 *   ② product Number → union 내 RegionCard 로 라우팅(SV##→Shiny Vault, 1..N→본탄 자동 분류).
 *   ③ ★이름검증: product 이름 ↔ 우리 카드 이름 대조. 번호는 맞아도 이름 불일치면 매핑 안 함(오매칭 방지).
 *      번호 모호(복수 후보, 예: Celebrations Classic) → 이름으로 결정.
 * 안전: additive/가역(ExternalIdMapping 만). full live 실행은 해당 region 의 tcgcsv 매핑을 먼저 리셋(클린 재빌드).
 *
 * 실행:
 *   npm run crosswalk:tcgcsv -- --cat=3                 # EN 전체(클린 재빌드)
 *   npm run crosswalk:tcgcsv -- --cat=3 --dry           # 적재 없이 커버리지/위험 리포트만
 *   npm run crosswalk:tcgcsv -- --cat=3 --group=23286   # 특정 그룹만(테스트, 리셋 안 함)
 *
 * docs/agents/price-collector-plan.md · docs/plans/card-model-and-pricing-taxonomy.md
 */
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";
import { Logger, fetchJsonWithRetry } from "./lib/price-sync-lib";

const CAT_REGION: Record<number, "EN" | "JP"> = { 3: "EN", 85: "JP" };
const BASE = "https://tcgcsv.com/tcgplayer";

// ── B층: 큐레이션 그룹→세트 별칭 (퍼지매칭이 못 잡는 이름/코드 불일치를 데이터로 고정) ──
//   key = normCode(TCGCSV abbreviation) → 우리 setId. 번호+이름검증은 동일하게 적용(오매칭 방지 유지).
const ALIAS: Record<number, Record<string, string>> = {
  3: {
    swsh01: "en-tcg-swsh1", // "SWSH01: Sword & Shield Base Set" → SSH base (우리명 "Sword & Shield"라 이름 폴백 실패)
    sm01: "en-tcg-sm1", // "SM01: SM Base Set" → Sun & Moon (SUM)
    swsd: "en-tcg-swshp", // "SWSD: SWSH Sword & Shield Promo Cards" → SWSH Black Star Promos (PR-SW)
  },
};

// ── 번호/코드/이름 정규화 ──
const normNum = (n: string) =>
  (n || "").split("/")[0].trim().toUpperCase().replace(/^0+(?=[0-9])/, "").replace(/([A-Z]+)0+(?=[0-9])/, "$1");
const normName = (s: string) =>
  (s || "").replace(/^[A-Za-z0-9]{1,8}\s*[-:]\s+/, "").toLowerCase()
    .replace(/pok[eé]mon|tcg|expansion|the|trainer gallery|galarian gallery/g, "").replace(/[^a-z0-9]/g, "");
const normCode = (c: string) => (c || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// 카드 이름 핵심부만(번호접미·괄호·랭크 접미 제거) → 양쪽 출처 표기차 흡수
const cleanCardName = (s: string) =>
  (s || "")
    .replace(/\s*[-–—]\s*[A-Za-z0-9/]+\s*$/, "") // 끝의 " - 223/197" / " - SWSH001"
    .replace(/\([^)]*\)/g, "") // 괄호 주석
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // 다이어크리틱 폴딩(Poké→poke, Pokémon→pokemon)
    .toLowerCase()
    // TCGplayer 에너지 타입어 약칭 정규화(Water→W 등) 양쪽 통일
    .replace(/\b(grass|fire|water|lightning|psychic|fighting|darkness|metal|fairy|dragon|colorless)\b/g,
      (m) => ({ grass: "g", fire: "r", water: "w", lightning: "l", psychic: "p", fighting: "f", darkness: "d", metal: "m", fairy: "y", dragon: "n", colorless: "c" }[m] ?? m))
    .replace(/\b(ex|gx|v|vmax|vstar|v-?union|prime|break|lv\.?\s*x|star|delta)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
/** 이름 일치(관대): 동일 or 한쪽이 다른쪽 포함(4자+). 표기차 흡수하되 다른 종은 거름. */
function nameAgree(tcgName: string, ourName: string): boolean {
  const x = cleanCardName(tcgName), y = cleanCardName(ourName);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x))) return true;
  return false;
}

// ── 변형(패럴렐) 라벨 인식 — 괄호 안 텍스트 중 "알려진" 변형만 kind 로 승격, 그 외는 기존처럼 base name 취급 ──
//   화이트리스트 방식: "Delta Species" 같은 진짜 카드 정체성 표기(δ)는 목록에 없어 변형으로 오분류되지 않는다(의도).
//   같은 번호를 공유하는 TCGplayer 상품(베이스/마스터볼/포켓볼 등)을 RegionCard 하나에 뭉치지 않고
//   PrintVariant(SKU)로 분리하기 위함 — cleanCardName 의 괄호제거는 "같은 카드인지" 판정용으로 그대로 둔다.
const VARIANT_LABELS: Record<string, string> = {
  "master ball pattern": "masterball",
  "poke ball pattern": "pokeball",
  "prerelease": "prerelease",
  "pokemon center exclusive": "pokemon_center",
  "staff": "staff",
};
/** 상품명 괄호 안에서 알려진 변형 라벨만 추출. 못 찾으면 null(표준 취급). */
function extractVariantLabel(name: string): { kind: string; label: string } | null {
  const m = (name || "").match(/\(([^)]*)\)/);
  if (!m) return null;
  const raw = m[1].trim();
  const kind = VARIANT_LABELS[raw.toLowerCase()];
  return kind ? { kind, label: raw } : null;
}

type TcgGroup = { groupId: number; name: string; abbreviation: string | null };
type TcgProduct = { productId: number; name: string; url?: string; extendedData?: { name: string; value: string }[] };
type Opts = { cat: number; dry: boolean; group?: number };
type RC = { id: string; num: string; name: string };

export async function run(opts: Opts) {
  const region = CAT_REGION[opts.cat];
  if (!region) throw new Error(`지원하지 않는 cat=${opts.cat} (3=EN, 85=JP)`);
  const log = new Logger(`crosswalk tcgcsv cat${opts.cat}/${region}`);

  const src = await prisma.externalSource.findUnique({ where: { code: "tcgcsv" }, select: { id: true } });
  if (!src) throw new Error("ExternalSource 'tcgcsv' 미시드");

  // ── 우리 Set 색인: code → setId[] (코드패밀리, 본탄+갤러리 공유 코드 지원) ──
  const sets = await prisma.set.findMany({ where: { region }, select: { id: true, code: true, name: true } });
  const byCodeFam = new Map<string, string[]>();
  const byNameFam = new Map<string, string[]>(); // ★이름도 패밀리(union) — 갤러리 트윈 차단 대신 union 라우팅
  for (const s of sets) {
    if (s.code) { const k = normCode(s.code); byCodeFam.set(k, [...(byCodeFam.get(k) ?? []), s.id]); }
    const nn = normName(s.name);
    if (nn) byNameFam.set(nn, [...(byNameFam.get(nn) ?? []), s.id]);
  }
  const families = [...byCodeFam.values()].filter((a) => a.length > 1).length;
  log.info(`우리 ${region} Set ${sets.length} (코드 ${byCodeFam.size}, 공유코드패밀리 ${families}, 이름 ${byNameFam.size})`);

  // RegionCard 캐시(setId → RC[])
  const rcCache = new Map<string, RC[]>();
  async function rcsOf(setId: string): Promise<RC[]> {
    let v = rcCache.get(setId);
    if (!v) {
      const rows = await prisma.regionCard.findMany({ where: { setId, region }, select: { id: true, number: true, name: true } });
      v = rows.map((r) => ({ id: r.id, num: r.number, name: r.name }));
      rcCache.set(setId, v);
    }
    return v;
  }
  // 그룹의 후보 세트들(코드패밀리 우선, 없으면 이름 단일)
  const alias = ALIAS[opts.cat] ?? {};
  function candidateSets(g: TcgGroup): { ids: string[]; method: string } {
    const ab = normCode(g.abbreviation ?? "");
    if (ab && alias[ab]) return { ids: [alias[ab]], method: "alias" }; // 큐레이션 우선
    const fam = ab ? byCodeFam.get(ab) : undefined;
    if (fam?.length) return { ids: fam, method: fam.length > 1 ? "code-family" : "code" };
    const nameFam = byNameFam.get(normName(g.name)); // TCGCSV "SWSH11: Lost Origin" → "lostorigin" 패밀리
    if (nameFam?.length) return { ids: nameFam, method: nameFam.length > 1 ? "name-family" : "name" };
    return { ids: [], method: "none" };
  }

  // ── full live 실행: region 의 기존 tcgcsv 매핑 리셋(클린 재빌드) ──
  if (!opts.dry && !opts.group) {
    const del = await prisma.externalIdMapping.deleteMany({ where: { sourceId: src.id, regionCard: { region } } });
    log.info(`기존 tcgcsv(${region}) 매핑 ${del.count} 삭제 → 클린 재빌드`);
  }

  // ── 그룹 로드 ──
  const groupsResp = await fetchJsonWithRetry<{ results: TcgGroup[] }>(`${BASE}/${opts.cat}/groups`, { log });
  let groups = groupsResp?.results ?? [];
  if (opts.group) groups = groups.filter((g) => g.groupId === opts.group);

  let groupMatched = 0; const unmatchedGroups: { name: string; abbr: string | null }[] = [];
  let prodTotal = 0, sealedNoNum = 0, mapped = 0, ambiguous = 0, numMiss = 0, nameReject = 0;
  const rejectSamples: string[] = [];
  const variantCounts = new Map<string, number>(); // kind → 건수(표준=집계 안 함)

  for (const g of groups) {
    const cand = candidateSets(g);
    if (!cand.ids.length) { unmatchedGroups.push({ name: g.name, abbr: g.abbreviation }); continue; }
    groupMatched++;

    // union 번호 인덱스: normNum → 후보 RC[]
    const idx = new Map<string, RC[]>();
    for (const setId of cand.ids)
      for (const rc of await rcsOf(setId)) {
        const k = normNum(rc.num); if (!k) continue;
        idx.set(k, [...(idx.get(k) ?? []), rc]);
      }

    const prodResp = await fetchJsonWithRetry<{ results: TcgProduct[] }>(`${BASE}/${opts.cat}/${g.groupId}/products`, { log });
    for (const p of prodResp?.results ?? []) {
      const numRaw = p.extendedData?.find((e) => e.name === "Number")?.value;
      if (!numRaw) { sealedNoNum++; continue; }
      prodTotal++;
      const hits = idx.get(normNum(numRaw));
      if (!hits || hits.length === 0) { numMiss++; continue; }

      let target: RC | null = null;
      if (hits.length === 1) {
        target = nameAgree(p.name, hits[0].name) ? hits[0] : null; // 단일후보라도 이름 불일치면 거름
        if (!target) { nameReject++; if (rejectSamples.length < 12) rejectSamples.push(`${g.abbreviation}#${numRaw} tcg"${p.name.slice(0, 22)}" ≠ our"${hits[0].name.slice(0, 22)}"`); continue; }
      } else {
        const agree = hits.filter((h) => nameAgree(p.name, h.name)); // 번호 모호 → 이름으로 결정
        if (agree.length === 1) target = agree[0];
        else { ambiguous++; continue; }
      }

      mapped++;
      const variant = extractVariantLabel(p.name);
      if (variant) variantCounts.set(variant.kind, (variantCounts.get(variant.kind) ?? 0) + 1);
      if (opts.dry) continue;
      const externalId = String(p.productId);
      let printVariantId: string | null = null;
      if (variant) {
        printVariantId = `pv-${target.id}-${variant.kind}`;
        await prisma.printVariant.upsert({
          where: { regionCardId_kind_slug: { regionCardId: target.id, kind: variant.kind, slug: variant.kind } },
          create: { id: printVariantId, regionCardId: target.id, kind: variant.kind, slug: variant.kind, label: variant.label },
          update: { label: variant.label },
        });
      }
      await prisma.externalIdMapping.upsert({
        where: { sourceId_externalId: { sourceId: src.id, externalId } },
        create: {
          sourceId: src.id, externalId, regionCardId: target.id, setId: undefined, printVariantId,
          url: p.url ?? null, verifiedBy: "auto:build-tcgcsv-crosswalk",
          confidence: cand.method === "name" ? 0.9 : 0.97, // 번호+이름 검증됨
          verifiedAt: new Date(),
        },
        update: { regionCardId: target.id, url: p.url ?? null, printVariantId },
      });
    }
  }

  log.info(`그룹→세트 매칭 ${groupMatched}/${groups.length} (미매칭 ${unmatchedGroups.length})`);
  const variantTotal = [...variantCounts.values()].reduce((a, b) => a + b, 0);
  log.info(`상품(번호有)=${prodTotal} → 매핑=${mapped}(변형 ${variantTotal}/표준 ${mapped - variantTotal}) · 이름거부=${nameReject} · 번호모호=${ambiguous} · 번호미스=${numMiss} (sealed=${sealedNoNum})`);
  if (variantCounts.size)
    log.info(`변형 kind별: ${[...variantCounts.entries()].map(([k, n]) => `${k}=${n}`).join(" · ")}`);
  if (rejectSamples.length) log.warn(`이름거부 샘플: ${rejectSamples.join(" | ")}`);
  if (unmatchedGroups.length)
    log.warn(`미매칭 그룹 ${unmatchedGroups.length} 예시: ${unmatchedGroups.slice(0, 8).map((u) => `${u.abbr}|${u.name}`).join(" · ")}`);

  return { region, groups: groups.length, groupMatched, prodTotal, mapped, nameReject, ambiguous, numMiss, sealedNoNum, unmatchedGroups: unmatchedGroups.length, variantCounts: Object.fromEntries(variantCounts) };
}

// ── 단독 실행 ──
const isMain = process.argv[1]?.includes("build-tcgcsv-crosswalk");
if (isMain) {
  const args = process.argv.slice(2);
  const opts: Opts = {
    cat: Number(args.find((a) => a.startsWith("--cat="))?.split("=")[1]) || 3,
    dry: args.includes("--dry"),
    group: Number(args.find((a) => a.startsWith("--group="))?.split("=")[1]) || undefined,
  };
  run(opts)
    .then((s) => {
      console.log(
        `CROSSWALK-TCGCSV done: ${s.region} groups ${s.groupMatched}/${s.groups}, mapped=${s.mapped} nameReject=${s.nameReject} ambiguous=${s.ambiguous} numMiss=${s.numMiss} sealed=${s.sealedNoNum}`
      );
      return prisma.$disconnect();
    })
    .catch((e) => { console.error(e); process.exit(1); });
}
