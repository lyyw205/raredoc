// ── RK: GameCard 재빌드 (언어중립 키 v3) ──────────────────────────────────────
// p3-gamecard.ts(archive) 실행본. 키 구조는 원본 유지(폼/오너 구분 위해 nm:canonName 보존),
// **canonName 만 언어중립화**:
//   ① EN 있으면 → EN명에서 티어접미(ex/V/VMAX/GX…) 제거(서브타입에 이미 있음). 오너/폼 접두는 보존.
//   ② EN 없는 '평범한' 포켓몬(폼마커 없음·단일 dex) → dex→Species.nameEn 으로 종영문명. (フシギダネ→Bulbasaur)
//   ③ 그 외(트레이너=JA2EN 사전, EN없는 폼/태그팀) → 기존 로직.
//   효과: 'bulbasaur↔フシギダネ' 언어split 해소하되, 'team aqua's sharpedo'↔'sharpedo' 같은 오너/폼은 분리 유지.
// 키: 포켓몬=[supertype, dexUnion, nm:canon, types, subtypes, effSig] / 트레이너=[supertype, nm:canon, subtypes]
// ★빈-LC 제외. id=결정적 gc_+sha1 멱등. 전역 → assertWritable([all packs]) (동결 포함, --allow-protected 필요).
// 기본 dry-run(+over-merge 진단). 적용 --apply --allow-protected.
import "dotenv/config";
import crypto from "crypto";
import { prisma } from "../../src/lib/prisma";
import { TR_ALL as JA2EN } from "../lib/trainer-names";
import { normSpace as norm } from "../lib/text-norm";
import { assertWritable, hasAllowProtectedFlag } from "../lib/protected-groups";
const NFC = (s: string) => (s || "").normalize("NFC");

const APPLY = process.argv.includes("--apply");
const isPk = (st: string | null) => st === "Pokémon" || st === "Pokemon";
const esc = (s: string) => s.replace(/'/g, "''");
const gcId = (key: string) => "gc_" + crypto.createHash("sha1").update(key).digest("hex").slice(0, 20);
// 티어 접미(서브타입 중복) — EN명에서만 제거. 오너/폼 접두는 보존.
const TIER_SUFFIX = /\s+(ex|gx|v|vmax|vstar|v-?union|break|prism\s*star|lv\.?\s*x|δ|☆)$/i;
const stripTier = (s: string) => s.replace(TIER_SUFFIX, "").trim();
// EN 없는 포켓몬: 이 마커 있으면 종영문명 브릿지 안 함(폼 보존 → 안전한 under-merge)
const FORM_MARK = /(ガラル|アローラ|ヒスイ|パルデア|メガ|キョダイ|ダイマックス)/;

async function main() {
  const [lcs, speciesRows] = await Promise.all([
    prisma.card.findMany({
      where: { locales: { some: {} } },
      select: { id: true, supertype: true, hp: true, attacks: true, abilities: true, subtypes: true, types: true, cardPackId: true, pokedexNumbers: true,
        locales: { select: { region: true, name: true } } },
    }),
    prisma.species.findMany({ select: { id: true, nameEn: true } }),
  ]);
  const dexToEn = new Map<number, string>(); speciesRows.forEach((s) => dexToEn.set(s.id, s.nameEn));
  const reg = (lc: typeof lcs[0], r: string) => lc.locales.find((l) => l.region === r)?.name;
  const origBest = (lc: typeof lcs[0]) => reg(lc, "EN") || reg(lc, "JP") || reg(lc, "KR") || "";

  const nameCanon = new Map<string, string>();
  for (const lc of lcs) {
    const en = norm(reg(lc, "EN")), jp = norm(reg(lc, "JP")), ko = norm(reg(lc, "KR"));
    const canon = en || jp || ko; if (!canon) continue;
    for (const x of [en, jp, ko]) if (x && !nameCanon.has(x)) nameCanon.set(x, canon);
  }
  const stripSub = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, "").trim();
  // ★언어중립 canonName
  const canonRaw = (lc: typeof lcs[0]) => {
    const enRaw = reg(lc, "EN");
    if (enRaw) return norm(stripTier(stripSub(enRaw)));           // ① EN: 부제·티어접미 제거(오너/폼 접두 보존)
    const jpRaw = reg(lc, "JP");
    if (jpRaw) {
      const j = NFC(jpRaw);
      const hit = JA2EN[j] ?? JA2EN[j.replace(/\s+/g, "")];        // 트레이너 사전
      if (hit) return norm(stripTier(hit));
      // ② EN 없는 평범한 포켓몬(폼마커 없음·단일 dex) → 종 영문명
      if (isPk(lc.supertype) && !FORM_MARK.test(j)) {
        const dex = (lc.pokedexNumbers || []).filter((d) => d > 0);
        if (dex.length === 1 && dexToEn.has(dex[0])) return norm(dexToEn.get(dex[0])!);
      }
      const nj = norm(jpRaw);
      return nameCanon.get(nj) ?? nj;                              // ③ 기존 폴백
    }
    return norm(reg(lc, "KR"));
  };
  const canonName = (lc: typeof lcs[0]) => stripSub(canonRaw(lc));

  // 포켓몬 dex union(canonName 기준 — 태그팀 불완전dex 보정)
  const nameDex = new Map<string, Set<number>>();
  for (const lc of lcs) if (isPk(lc.supertype)) {
    const cn = canonName(lc); const s = nameDex.get(cn) ?? nameDex.set(cn, new Set()).get(cn)!;
    for (const d of lc.pokedexNumbers || []) if (d > 0) s.add(d);
  }
  const effPart = (lc: typeof lcs[0]) => {
    let dmg: string[] = [], natk = 0;
    try { const a: any = lc.attacks; if (Array.isArray(a)) { natk = a.length; dmg = a.map((x) => String(x?.damage ?? "")).sort(); } } catch {}
    let nab = 0; try { const b: any = lc.abilities; if (Array.isArray(b)) nab = b.length; } catch {}
    return `hp${lc.hp ?? "?"}|dmg${dmg.join(",")}|na${natk}|ab${nab}`;
  };
  const subOf = (lc: typeof lcs[0]) => `sub:${[...(lc.subtypes || [])].sort().join("/")}`;
  const pkBaseKey = (lc: typeof lcs[0]) => {
    const cn = canonName(lc);
    const dexU = [...(nameDex.get(cn) || [])].sort((a, b) => a - b);
    const dexK = dexU.length ? `dex:${dexU.join(",")}` : `nm:${cn}`;
    return `${lc.supertype}|${dexK}|nm:${cn}|${subOf(lc)}|${effPart(lc)}`;
  };
  const baseTypes = new Map<string, string | null>();
  for (const lc of lcs) if (isPk(lc.supertype) && canonName(lc)) {
    const t = [...new Set(lc.types || [])].sort().join("/"); if (!t) continue;
    const bk = pkBaseKey(lc);
    if (!baseTypes.has(bk)) baseTypes.set(bk, t);
    else if (baseTypes.get(bk) !== t) baseTypes.set(bk, null);
  }
  const tyOf = (lc: typeof lcs[0]) => {
    let t = [...new Set(lc.types || [])].sort().join("/");
    if (!t) { const bt = baseTypes.get(pkBaseKey(lc)); if (bt) t = bt; }
    return t;
  };
  const keyOf = (lc: typeof lcs[0]) => {
    const cn = canonName(lc);
    if (isPk(lc.supertype)) {
      const dexU = [...(nameDex.get(cn) || [])].sort((a, b) => a - b);
      const dexK = dexU.length ? `dex:${dexU.join(",")}` : `nm:${cn}`;
      return `${lc.supertype}|${dexK}|nm:${cn}|ty:${tyOf(lc)}|${subOf(lc)}|${effPart(lc)}`;
    }
    return `${lc.supertype ?? "∅"}|nm:${cn}|${subOf(lc)}`;
  };

  const groups = new Map<string, { id: string; supertype: string | null; name: string; hp: number | null; n: number }>();
  const lcToGc: [string, string][] = [];
  let noName = 0;
  for (const lc of lcs) {
    if (!canonName(lc)) { noName++; continue; }
    const key = keyOf(lc); const id = gcId(key);
    let g = groups.get(key);
    if (!g) { g = { id, supertype: lc.supertype, name: origBest(lc), hp: isPk(lc.supertype) ? lc.hp : null, n: 0 }; groups.set(key, g); }
    if (reg(lc, "EN") && /[ぁ-んァ-ヶ一-龯가-힣]/.test(g.name)) g.name = reg(lc, "EN")!;
    g.n++; lcToGc.push([lc.id, id]);
  }
  const arr = [...groups.values()];
  console.log(`【RK GameCard v3 — 언어중립】${APPLY ? " ★APPLY" : " (dry-run)"}`);
  console.log(`  대상 LC ${lcs.length} · 이름없음 ${noName} · GameCard 그룹 ${arr.length}(복수멤버 ${arr.filter((g) => g.n > 1).length}) · 연결 ${lcToGc.length}`);

  if (!APPLY) {
    console.log(`  [진단] 현재 DB GameCard ${await prisma.gameCard.count()} → 새 키 ${arr.length}`);
    for (const [label, dex] of [["오거폰", 1017], ["칼렉스", 898], ["우라오스", 892], ["야돈", 79], ["뮤츠", 150]] as [string, number][]) {
      const mem = lcs.filter((lc) => (lc.pokedexNumbers || []).includes(dex) && isPk(lc.supertype));
      const g = new Set(mem.map(keyOf));
      console.log(`  [폼] ${label}(dex${dex}) ${mem.length}장 → ${g.size} GameCard`);
    }
    const enBase = (en: string) => stripTier(stripSub(norm(en)));
    const gcEn = new Map<string, Set<string>>();
    for (const lc of lcs) { if (!isPk(lc.supertype)) continue; const en = reg(lc, "EN"); if (!en) continue; const k = keyOf(lc); (gcEn.get(k) ?? gcEn.set(k, new Set()).get(k)!).add(enBase(en)); }
    const over = [...gcEn.entries()].filter(([, s]) => s.size > 1);
    console.log(`  [진단] ⚠over-merge 의심(한 GameCard에 EN base명 ≥2) = ${over.length}`);
    over.slice(0, 25).forEach(([, s]) => console.log(`       · ${[...s].join("  |  ")}`));
    console.log("\n  (dry-run) — 이상 없으면 --apply --allow-protected"); await prisma.$disconnect(); return;
  }

  const packs = [...new Set(lcs.map((l) => l.cardPackId).filter(Boolean))] as string[];
  assertWritable(packs, { allow: hasAllowProtectedFlag(), dryRun: false, tool: "p3-gamecard-rk" });
  let s = 0;
  const rows = arr.map((g) => ({ id: g.id, supertype: g.supertype, name: g.name, hp: g.hp }));
  for (let i = 0; i < rows.length; i += 3000) s += (await prisma.gameCard.createMany({ data: rows.slice(i, i + 3000), skipDuplicates: true })).count;
  let u = 0;
  for (let i = 0; i < lcToGc.length; i += 1000) {
    const vals = lcToGc.slice(i, i + 1000).map(([lc, gc]) => `('${esc(lc)}','${esc(gc)}')`).join(",");
    u += await prisma.$executeRawUnsafe(`UPDATE "LogicalCard" SET "gameCardId"=v.gc FROM (VALUES ${vals}) AS v(lcid,gc) WHERE "LogicalCard".id=v.lcid`);
  }
  const del = await prisma.$executeRawUnsafe(`DELETE FROM "GameCard" WHERE id NOT IN (SELECT DISTINCT "gameCardId" FROM "LogicalCard" WHERE "gameCardId" IS NOT NULL)`);
  console.log(`\n  ✅ GameCard +${s} · LC링크 ${u} · 고아 삭제 ${del} · 최종 ${await prisma.gameCard.count()}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
