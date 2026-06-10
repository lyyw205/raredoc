// ── P-1 진단 PR (읽기전용, DB 무변경) ──────────────────────────────────────────
// 계획서 docs/migration/identity-model-migration-plan.md §P-1 의 4개 진단 +
// 각 층 묶음 기준(GameCard/ArtCard/Species) DB 검증.
// 실행: npx tsx scripts/migration/p1-diagnostic.ts
import "dotenv/config";
import fs from "fs";
import { prisma } from "../../src/lib/prisma";
import { normSpace as norm } from "../lib/text-norm";

const n = (x: any) => Number(x ?? 0);
const pct = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(1) : "0.0") + "%";
const isPkmn = (st: string | null) => st === "Pokémon" || st === "Pokemon";

async function rawCount(sql: string): Promise<number | null> {
  try { const r: any[] = await prisma.$queryRawUnsafe(sql); return n(r?.[0]?.c); }
  catch (e: any) { console.log(`    (쿼리 실패: ${e.message?.split("\n")[0]})`); return null; }
}

async function main() {
  console.log("══════════════════ P-1 진단 (읽기전용) ══════════════════\n");

  // ── 항목1: MarketStat.cardId 참조 대상 (C2) ──
  console.log("【1】 MarketStat.cardId 참조 대상");
  const msTotal = await rawCount(`SELECT count(*)::int c FROM "MarketStat"`);
  if (msTotal === null) console.log("  → MarketStat 테이블 없음/접근불가");
  else if (msTotal === 0) console.log("  → 행 0개 (참조 미사용)");
  else {
    const notCL = await rawCount(`SELECT count(*)::int c FROM "MarketStat" ms WHERE NOT EXISTS (SELECT 1 FROM "CardLocale" cl WHERE cl.id = ms."cardId")`);
    const inLC = await rawCount(`SELECT count(*)::int c FROM "MarketStat" ms WHERE EXISTS (SELECT 1 FROM "LogicalCard" lc WHERE lc.id = ms."cardId")`);
    console.log(`  총 ${msTotal} · CL.id 아님 ${notCL} · LC.id 매칭 ${inLC}`);
    console.log(`  판정: ${notCL === 0 ? "cardId=CL.id 확정 → S12 'localeId FK 명시화' 유효" : "CL 아닌 참조 존재 → FK 대상 PC, S12 재작성(P5 이후)"}`);
  }

  // ── 항목2: Conversation.sourceCardId / Message.attachedCardId (M16) ──
  console.log("\n【2】 약참조(Conversation/Message) 참조 대상");
  for (const [tbl, col] of [["Conversation", "sourceCardId"], ["Message", "attachedCardId"]]) {
    const tot = await rawCount(`SELECT count(*)::int c FROM "${tbl}" WHERE "${col}" IS NOT NULL`);
    if (tot === null) { console.log(`  ${tbl}.${col}: 테이블/컬럼 없음`); continue; }
    if (tot === 0) { console.log(`  ${tbl}.${col}: 비어있음(0)`); continue; }
    const notCL = await rawCount(`SELECT count(*)::int c FROM "${tbl}" t WHERE t."${col}" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "CardLocale" cl WHERE cl.id = t."${col}")`);
    const inLC = await rawCount(`SELECT count(*)::int c FROM "${tbl}" t WHERE EXISTS (SELECT 1 FROM "LogicalCard" lc WHERE lc.id = t."${col}")`);
    console.log(`  ${tbl}.${col}: 총 ${tot} · CL.id 아님 ${notCL} · LC.id 매칭 ${inLC}`);
  }

  // ── LogicalCard 전량 로드 (이후 묶음검증 공용) ──
  console.log("\n  …LogicalCard 로드중");
  const lcs = await prisma.logicalCard.findMany({
    select: {
      id: true, supertype: true, pokedexNumbers: true, regulationMark: true,
      illustrator: true, hp: true, attacks: true, rules: true, setGroupId: true,
      locales: { select: { region: true, name: true } },
    },
  });
  console.log(`  LogicalCard ${lcs.length}개`);

  const canonName = (lc: typeof lcs[0]) => {
    const by = (r: string) => lc.locales.find((l) => l.region === r)?.name;
    return norm(by("EN") || by("JP") || by("KR") || "");
  };
  const effectSig = (lc: typeof lcs[0]) => {
    if (isPkmn(lc.supertype)) {
      let dmg = "";
      try { const a: any = lc.attacks; if (Array.isArray(a)) dmg = a.map((x) => String(x?.damage ?? "")).sort().join(","); }
      catch {}
      return `${lc.hp ?? "?"}|${dmg || "noatk"}`;
    }
    return norm((lc.rules || []).join("¶")) || "norules";
  };

  // ── 항목4: pokedexNumbers 오저장 (M13) ──
  console.log("\n【4】 pokedexNumbers 오저장 규모");
  let dexBad = 0, dexBadEx: string[] = [];
  for (const lc of lcs) {
    const bad = (lc.pokedexNumbers || []).filter((d) => d > 1025 || d <= 0);
    if (bad.length) { dexBad++; if (dexBadEx.length < 8) dexBadEx.push(`${lc.id.slice(0, 20)} dex=[${lc.pokedexNumbers}] (${canonName(lc)})`); }
  }
  console.log(`  pokedexNumbers에 1025초과/0이하 의심값 보유 LC: ${dexBad} (${pct(dexBad, lcs.length)})`);
  dexBadEx.forEach((e) => console.log("    " + e));

  // ── 묶음검증 A: GameCard 3키 [supertype, name, regulationMark] ──
  console.log("\n【A】 GameCard 묶음키 검증 — [supertype, name, regulationMark]");
  const gcMap = new Map<string, typeof lcs>(); // key → members
  for (const lc of lcs) {
    const key = `${lc.supertype === "Pokemon" ? "Pokémon" : lc.supertype}|${canonName(lc)}|${lc.regulationMark ?? "∅"}`;
    (gcMap.get(key) ?? gcMap.set(key, []).get(key)!).push(lc);
  }
  const lcToGc = new Map<string, string>();
  for (const [key, ms] of gcMap) for (const m of ms) lcToGc.set(m.id, key);
  let multi = 0, multiLcs = 0, reprintGroups = 0, mixedGroups = 0; const mixedEx: string[] = [];
  for (const [key, ms] of gcMap) {
    if (ms.length < 2) continue;
    multi++; multiLcs += ms.length;
    const groups = new Set(ms.map((m) => m.setGroupId));
    if (groups.size > 1) reprintGroups++;
    const sigs = new Set(ms.map(effectSig));
    if (sigs.size > 1) { mixedGroups++; if (mixedEx.length < 12) mixedEx.push(`    "${key.split("|")[1]}" [${key.split("|")[0]}/${key.split("|")[2]}]: ${ms.length}장, 효과 ${sigs.size}종 → 동명이카드 의심`); }
  }
  console.log(`  총 그룹 ${gcMap.size} (단일 ${gcMap.size - multi} · 복수멤버 ${multi})`);
  console.log(`  복수멤버 그룹의 LC ${multiLcs}장 — 이들이 GameCard 1개로 합쳐짐(재수록·알트아트 통합)`);
  console.log(`  └ 여러 setGroup에 걸친 그룹(진짜 재수록 통합): ${reprintGroups}`);
  console.log(`  └ ★효과 불일치 그룹(같은 이름인데 효과 2종+ = 오병합 위험): ${mixedGroups} (${pct(mixedGroups, multi)})`);
  mixedEx.forEach((e) => console.log(e));
  console.log(`  ⇒ 판정: 오병합 위험 그룹이 적으면 3키 OK / 많으면 U3대로 'rules 해시' 키 추가 필요`);

  // ── 항목3: unique 충돌행 (TierEntry/DeckCard) — 위 gcMap 사용 ──
  console.log("\n【3】 unique 충돌행 (GameCard 키 전환 시)");
  for (const [tbl, idCol, grpCol] of [["TierEntry", "logicalCardId", "setId"], ["DeckCard", "logicalCardId", "archetypeId"]] as const) {
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT "${idCol}" lcid, "${grpCol}" grp FROM "${tbl}"`);
      if (!rows.length) { console.log(`  ${tbl}: 행 0개 → P6.5 no-op`); continue; }
      const seen = new Map<string, number>();
      let collide = 0, mapped = 0;
      for (const r of rows) {
        const gc = lcToGc.get(r.lcid); if (!gc) continue; mapped++;
        const k = `${r.grp}|${gc}`; const c = (seen.get(k) || 0) + 1; seen.set(k, c); if (c === 2) collide++;
      }
      console.log(`  ${tbl}: 총 ${rows.length} (매핑됨 ${mapped}) → (${grpCol}, gameCardId) 충돌 그룹 ${collide}개`);
    } catch (e: any) { console.log(`  ${tbl}: ${e.message?.split("\n")[0]}`); }
  }

  // ── 묶음검증 B: ArtCard cross-pack 후보 [dex, illustrator, name] ──
  console.log("\n【B】 ArtCard 묶음 검증 — 같은 그림이 여러 setGroup에 분산(cross-pack 후보)");
  const acMap = new Map<string, typeof lcs>();
  for (const lc of lcs) {
    if (!isPkmn(lc.supertype)) continue; // 우선 포켓몬만(트레이너는 dex 없음)
    const dex = (lc.pokedexNumbers || [])[0] ?? 0;
    if (!dex || !lc.illustrator) continue;
    const key = `${dex}|${norm(lc.illustrator)}|${canonName(lc)}`;
    (acMap.get(key) ?? acMap.set(key, []).get(key)!).push(lc);
  }
  let acMerge = 0, acCrossPack = 0, acLcs = 0;
  for (const [, ms] of acMap) {
    if (ms.length < 2) continue;
    acMerge++; acLcs += ms.length;
    if (new Set(ms.map((m) => m.setGroupId)).size > 1) acCrossPack++;
  }
  console.log(`  (dex+작가+이름) 동일 ArtCard 후보 그룹 ${acMerge}개 — LC ${acLcs}장이 ArtCard ${acMerge}개로 통합`);
  console.log(`  └ 여러 setGroup에 걸친(진짜 cross-pack 재수록) 그룹: ${acCrossPack}`);
  console.log(`  ⚠ 최종 same-art 판정은 이미지 pHash(U4) — 여기선 후보 규모만. 작가 같아도 다른그림 가능(디아루가/펄기아 함정)`);

  // ── 묶음검증 C: Species dex 커버리지 ──
  console.log("\n【C】 Species 묶음 검증 — dex → 종 커버리지");
  let validIds = new Set<number>();
  try {
    const csv = fs.readFileSync("data/pokeapi/pokemon_species.csv", "utf8").split("\n").slice(1);
    for (const line of csv) { const id = parseInt(line.split(",")[0]); if (id) validIds.add(id); }
  } catch { console.log("  (pokemon_species.csv 못읽음 — 1..1025 가정)"); for (let i = 1; i <= 1025; i++) validIds.add(i); }
  let pk = 0, single = 0, multi2 = 0, noDex = 0, outOfRange = 0, notInCsv = 0;
  for (const lc of lcs) {
    if (!isPkmn(lc.supertype)) continue; pk++;
    const dn = (lc.pokedexNumbers || []).filter((d) => d > 0);
    if (!dn.length) { noDex++; continue; }
    if (dn.length >= 2) multi2++;
    else single++;
    for (const d of dn) { if (d > 1025 || d <= 0) outOfRange++; else if (!validIds.has(d)) notInCsv++; }
  }
  console.log(`  포켓몬 LC ${pk} · 단일dex ${single} · 복수dex(태그팀=N:M) ${multi2} · dex없음 ${noDex}`);
  console.log(`  dex값 범위밖(>1025/≤0) ${outOfRange} · CSV(1..${validIds.size})에 없는 dex ${notInCsv}`);
  const tr = lcs.filter((l) => l.supertype === "Trainer").length;
  const en = lcs.filter((l) => l.supertype === "Energy").length;
  const nullSt = lcs.filter((l) => !l.supertype).length;
  console.log(`  무종(트레이너 ${tr} · 에너지 ${en} · supertype null ${nullSt}) → speciesId NULL 정상`);

  console.log("\n══════════════════ 진단 끝 (DB 무변경) ══════════════════");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
