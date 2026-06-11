/**
 * 팩 마감 인스펙터 (읽기전용) — 한 CardPack의 JP/KR/EN을 0~4단계 한 번에 진단·검증.
 *   Phase 0: 구조(region별 카드수·번호중복·rarity 문자열 3국 대조)
 *   Phase 1: JP 정본화 검증(ja이름→dex 독립신호·supertype/subtypes/일러/이미지 커버리지)
 *   Phase 2: KR 정합(공유 lcid 병합 여부·koName→dex == 앵커 dex; 폼카드 KO_FORM 반영)
 *   Phase 4: 정합(JP앵커/KR/EN/orphan cardPackId 적재·EN 병합/고아·JSON↔DB 카드수)
 *   ※ Phase 3(EN 매칭 dry)은 pokemontcg.io 필요 → merge-en-identity/verify-en-dex 별도 실행.
 *
 * 실행: npx tsx scripts/inspect-pack-closeout.ts <groupId>
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { resolveCardDexes } from "./lib/pokeapi-names";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { POKE, isPokemonSupertype } from "./lib/supertype";
import { normLower as norm } from "./lib/text-norm";
const cap = <T,>(a: T[], n = 15) => a.slice(0, n);

// 폼카드 dex (ja/ko 인덱스가 못 푸는 테라/폼 — verify 사각지대 보정)
const JA_FORM: [RegExp, number][] = [[/オーガポン/, 1017], [/ガチグマ/, 901], [/ロトム/, 479], [/ポワルン/, 351]];
const KO_FORM: [RegExp, number][] = [[/오거폰/, 1017], [/다투곰/, 901], [/(커트|스핀|프로스트|워시|히트)?\s*로토무/, 479], [/캐스퐁/, 351]];
const jaClean = (n: string) => n
  .replace(/^(なみのり|そらをとぶ|ガラル|アローラ|ヒスイ|パルデア)\s*/, "")
  .replace(/^(ヒート|ウォッシュ|フロスト|スピン|カット)(?=ロトム)/, "")
  .replace(/(ex|ＥＸ|Ｖ|V|VMAX|VSTAR|GX)$/i, "").replace(/\s+/g, "").trim();
const jaDex = (n: string): number[] => {
  for (const [re, d] of JA_FORM) if (re.test(n)) return [d];
  let d = resolveCardDexes(jaClean(n), "ja" as "ko"); if (!d.length) d = resolveCardDexes(n.replace(/\s+/g, ""), "ja" as "ko"); return d;
};
const koDex = (n: string): number[] => { for (const [re, d] of KO_FORM) if (re.test(n)) return [d]; return resolveCardDexes(n, "ko"); };

async function main() {
  const groupId = process.argv[2];
  if (!groupId) { console.error("usage: inspect-pack-closeout.ts <groupId>"); process.exit(1); }
  const g = await prisma.cardPack.findUnique({ where: { id: groupId }, include: { sets: { select: { id: true, region: true, code: true, name: true, cardCount: true } } } });
  if (!g) { console.error(`그룹 없음: ${groupId}`); process.exit(1); }

  const setIds = g.sets.map((s) => s.id);
  const jpSetIds = g.sets.filter((s) => s.region === "JP").map((s) => s.id);
  const locales = await prisma.cardLocale.findMany({
    where: { setId: { in: setIds } },
    select: {
      id: true, setId: true, region: true, number: true, numberInt: true, name: true, imageSmall: true, imageLarge: true, logicalCardId: true,
      logicalCard: { select: { supertype: true, subtypes: true, pokedexNumbers: true, illustrator: true, cardPackId: true, primarySetId: true, rarity: { select: { code: true, nameJa: true, nameKo: true, nameEn: true, tier: true } } } },
    },
  });

  // lcid → region 집합 (병합 판정)
  const byLcid = new Map<string, typeof locales>();
  for (const l of locales) { const a = byLcid.get(l.logicalCardId) ?? []; a.push(l); byLcid.set(l.logicalCardId, a); }
  const lcidHasJp = new Set<string>();
  for (const [lcid, ls] of byLcid) if (ls.some((l) => l.region === "JP")) lcidHasJp.add(lcid);

  console.log(`\n████ ${groupId} — ${g.nameKo ?? g.nameEn ?? groupId} (era ${g.era}) ████`);
  console.log(`세트: ${g.sets.map((s) => `${s.region}:${s.id}(${s.cardCount})`).join("  ")}`);

  // ── Phase 0 ──────────────────────────────────────────
  console.log(`\n── Phase 0 구조 진단 ──`);
  for (const s of g.sets) {
    const rows = locales.filter((l) => l.setId === s.id);
    const dupNum = [...rows.reduce((m, r) => m.set(r.numberInt ?? -1, (m.get(r.numberInt ?? -1) ?? 0) + 1), new Map<number, number>())].filter(([, n]) => n > 1);
    console.log(`  ${s.region} ${s.id}: locale ${rows.length} / cardCount ${s.cardCount}${dupNum.length ? ` · ⚠번호중복 ${dupNum.length}건(${cap(dupNum, 5).map(([n, c]) => `#${n}×${c}`).join(",")})` : ""}`);
  }
  // rarity 문자열 3국 대조 (RANK 맵 커버 점검용)
  for (const r of ["JP", "KR", "EN"]) {
    const rs = [...new Set(locales.filter((l) => l.region === r).map((l) => l.logicalCard.rarity?.code ?? "—"))].sort();
    if (rs.length) console.log(`  rarity[${r}] {${rs.join(", ")}}`);
  }

  // ── Phase 1 (JP 정본화 검증) ─────────────────────────
  console.log(`\n── Phase 1 JP 앵커 정본화 검증 ──`);
  for (const sid of jpSetIds) {
    const rows = locales.filter((l) => l.setId === sid);
    const poke = rows.filter((l) => isPokemonSupertype(l.logicalCard.supertype));
    const stNull = rows.filter((l) => !l.logicalCard.supertype).length;
    const subEmpty = rows.filter((l) => (l.logicalCard.subtypes ?? []).length === 0).length;
    const illNull = rows.filter((l) => !l.logicalCard.illustrator).length;
    const imgNull = rows.filter((l) => !l.imageSmall && !l.imageLarge).length;
    const dexMism: string[] = [];
    for (const l of poke) {
      const want = jaDex(l.name); const have = l.logicalCard.pokedexNumbers?.[0];
      if (want.length && have != null && !want.includes(have)) dexMism.push(`#${l.number} ${l.name}: 이름→${want} ≠ 저장 ${have}`);
    }
    console.log(`  ${sid}: 포켓몬 ${poke.length} | supertype=null ${stNull} · subtypes빈 ${subEmpty} · 일러null ${illNull} · 이미지null ${imgNull}`);
    console.log(`    dex(ja이름 독립신호) 불일치 ${dexMism.length}${dexMism.length ? ":" : " ✔"}`);
    for (const x of cap(dexMism)) console.log(`      ✗ ${x}`);
    if (stNull) console.log(`    ⚠ supertype=null ${stNull}장 → dex체크 vacuous(포켓몬 인식 누락 가능). supertype 채운 뒤 재점검`);
  }

  // ── Phase 2 (KR 정합) ────────────────────────────────
  console.log(`\n── Phase 2 KR 정합 검증 ──`);
  for (const s of g.sets.filter((x) => x.region === "KR")) {
    const rows = locales.filter((l) => l.setId === s.id);
    const merged = rows.filter((l) => lcidHasJp.has(l.logicalCardId)).length;
    const poke = rows.filter((l) => isPokemonSupertype(l.logicalCard.supertype));
    const dexBad: string[] = [];
    for (const l of poke) {
      const want = koDex(l.name); const anchor = l.logicalCard.pokedexNumbers ?? [];
      if (want.length && !want.some((d) => anchor.includes(d))) dexBad.push(`#${l.number} ${l.name}: 이름→${want} ≠ 앵커 [${anchor}]`);
    }
    console.log(`  ${s.id}: locale ${rows.length} · JP앵커 공유(병합) ${merged}/${rows.length} · 포켓몬 ${poke.length}`);
    console.log(`    KR koName→dex == 앵커 dex 불일치 ${dexBad.length}${dexBad.length ? ":" : " ✔"}`);
    for (const x of cap(dexBad)) console.log(`      ✗ ${x}`);
  }

  // ── Phase 4 (정합·표시) ──────────────────────────────
  console.log(`\n── Phase 4 정합·표시 검증 ──`);
  const sg = (r: string) => { const m = new Map<string, number>(); for (const l of locales.filter((x) => x.region === r)) m.set(l.logicalCard.cardPackId ?? "(null)", (m.get(l.logicalCard.cardPackId ?? "(null)") ?? 0) + 1); return [...m].map(([k, n]) => `${k}=${n}`).join(" "); };
  console.log(`  cardPackId 적재 — JP:[${sg("JP")}]  KR:[${sg("KR")}]  EN:[${sg("EN")}]`);
  const enRows = locales.filter((l) => l.region === "EN");
  const enMerged = enRows.filter((l) => lcidHasJp.has(l.logicalCardId)).length;
  console.log(`  EN: 총 ${enRows.length} · JP앵커 병합 ${enMerged} · 고아(영판전용) ${enRows.length - enMerged}`);
  // JP primarySetId 분포(합본 2분할 가능성)
  const prim = new Map<string, number>();
  for (const [lcid, ls] of byLcid) if (ls.some((l) => l.region === "JP")) { const p = ls[0].logicalCard.primarySetId ?? "(null)"; prim.set(p, (prim.get(p) ?? 0) + 1); }
  console.log(`  JP앵커 LC primarySetId 분포(합본 분할 키): ${[...prim].map(([k, n]) => `${k}=${n}`).join(" ")}`);
  // JSON ↔ DB
  const jsonPath = join(process.cwd(), "src", "data", `group-${groupId}.json`);
  if (existsSync(jsonPath)) {
    const j = JSON.parse(readFileSync(jsonPath, "utf8"));
    const jpAnchorDb = locales.filter((l) => l.region === "JP").length;
    console.log(`  JSON group-${groupId}.json: anchors ${j.counts?.anchors} (DB JP locale ${jpAnchorDb}) · enMatched ${j.counts?.enMatched} · krMatched ${j.counts?.krMatched} · enOnly ${j.counts?.enOnly}`);
  } else console.log(`  JSON 없음(group-${groupId}.json) — 표시 미등록`);

  await prisma.$disconnect();
}
main().catch((e) => { console.error("ERR", e?.message ?? e); process.exit(1); });
