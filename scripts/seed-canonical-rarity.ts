/**
 * Phase 2 (레어도 재정립) — Rarity.abbr + Rarity.canonicalCode 백필
 *
 * 목적: 원본 레어도(Rarity.code, 인쇄된 값)는 보존하면서, 표시·그룹용 2축을 얹는다.
 *   - canonicalCode: 시대무관 정규 그룹 키. 출처별 중복(C↔Common, Holo Rare↔Rare Holo,
 *     Art Rare↔Illustration Rare, Special Art Rare↔Special Illustration Rare)을 한 키로 통합.
 *   - abbr: 공식 JP식 표시 약어(C/U/R/RR/AR/SAR/SR/UR/HR/MUR …). 세트 상세 구성표에서 사용.
 *
 * 안전: additive(컬럼 abbr/canonicalCode 만 채움). 원본 code/표시명/카테고리 미변경.
 *   레어도 작업은 카드 EN/KR 연결을 건드리지 않음(freeze 규칙 무관) — 전역 마스터 데이터만.
 *   멱등(re-run 안전). 검증: 어비스아이 = C38/U27/R8/RR8/AR12/SAR6/SR18/MUR1 = 118.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// canonicalCode → { abbr(JP식), nameKo, raws[](원본 Rarity.code) }
const CANON: Record<string, { abbr: string; nameKo: string; raws: string[] }> = {
  common:           { abbr: "C",     nameKo: "커먼",          raws: ["C", "Common"] },
  uncommon:         { abbr: "U",     nameKo: "언커먼",        raws: ["U", "Uncommon"] },
  rare:             { abbr: "R",     nameKo: "레어",          raws: ["R", "Rare"] },
  holo_rare:        { abbr: "R",     nameKo: "홀로레어",      raws: ["Holo Rare", "Rare Holo", "Rare Holo Star", "Rare Shining", "Shining", "Black White Rare", "Classic Collection"] },
  double_rare:      { abbr: "RR",    nameKo: "더블레어",      raws: ["Double Rare"] },
  triple_rare:      { abbr: "RRR",   nameKo: "트리플레어",    raws: ["Triple Rare"] },
  art_rare:         { abbr: "AR",    nameKo: "아트레어",      raws: ["Art Rare", "Illustration Rare"] },
  special_art_rare: { abbr: "SAR",   nameKo: "스페셜아트레어", raws: ["Special Art Rare", "Special Illustration Rare"] },
  super_rare:       { abbr: "SR",    nameKo: "슈퍼레어",      raws: ["Super Rare", "Super Rare Holo", "Character Super Rare"] },
  ultra_rare:       { abbr: "UR",    nameKo: "울트라레어",    raws: ["Ultra Rare", "Rare Ultra", "Rare Holo EX", "Rare Holo GX", "Rare Holo V", "Rare Holo VMAX", "Rare Holo VSTAR", "Rare Holo LV.X", "Secret Rare", "Shiny Ultra Rare", "Trainer Rare", "Character Rare"] },
  ace_spec:         { abbr: "ACE",   nameKo: "에이스스펙",    raws: ["ACE SPEC Rare", "Rare ACE"] },
  shiny:            { abbr: "S",     nameKo: "시너레어",      raws: ["Rare Shiny", "Shiny Rare", "Shiny Secret Rare", "Rare Shiny GX"] },
  radiant:          { abbr: "K",     nameKo: "카가야쿠",      raws: ["Radiant Rare", "Kagayaku"] },
  amazing:          { abbr: "AM",    nameKo: "어메이징레어",  raws: ["Amazing Rare"] },
  prism:            { abbr: "PR",    nameKo: "프리즘스타",    raws: ["Prism Rare", "Rare Prism Star"] },
  trainer_gallery:  { abbr: "TG",    nameKo: "트레이너갤러리", raws: ["Trainer Gallery Rare Holo"] },
  legend:           { abbr: "LEG",   nameKo: "레전드",        raws: ["LEGEND", "Rare Holo LEGEND"] },
  rare_break:       { abbr: "BR",    nameKo: "브레이크",      raws: ["Rare BREAK"] },
  prime:            { abbr: "PRM",   nameKo: "프라임",        raws: ["Rare Prime"] },
  hyper_rare:       { abbr: "HR",    nameKo: "하이퍼레어",    raws: ["Hyper Rare", "Rare Rainbow", "Rare Secret", "Mega Hyper Rare"] },
  mega_ultra_rare:  { abbr: "MUR",   nameKo: "메가울트라레어", raws: ["Mega Ultra Rare"] },
  mega_attack:      { abbr: "MAR",   nameKo: "메가어택레어",  raws: ["Mega Attack Rare"] },
  promo:            { abbr: "P",     nameKo: "프로모",        raws: ["Promo"] },
  unknown:          { abbr: "?",     nameKo: "미상",          raws: ["None"] },
};

// 원본 code → { canonicalCode, abbr }
const RAW: Record<string, { canonicalCode: string; abbr: string }> = {};
for (const [code, { abbr, raws }] of Object.entries(CANON)) {
  for (const raw of raws) RAW[raw] = { canonicalCode: code, abbr };
}

async function main() {
  console.log("=== Phase 2: Rarity.abbr + canonicalCode 백필 ===\n");

  const rarities = await prisma.rarity.findMany({ select: { id: true, code: true } });
  const dbCodes = new Set(rarities.map((r) => r.code));

  // 커버리지 점검 — DB 의 모든 raw code 가 매핑돼 있는지, 매핑에만 있고 DB엔 없는 잉여는 무엇인지
  const uncovered = [...dbCodes].filter((c) => !RAW[c]);
  const mappedNotInDb = Object.keys(RAW).filter((c) => !dbCodes.has(c));
  if (uncovered.length) console.log(`⚠ 매핑 안 된 DB 레어도 ${uncovered.length}: ${uncovered.join(", ")}`);
  if (mappedNotInDb.length) console.log(`(참고) 맵에만 있고 DB엔 없는 코드: ${mappedNotInDb.join(", ")}`);

  let updated = 0;
  for (const r of rarities) {
    const m = RAW[r.code];
    if (!m) continue; // 미매핑은 NULL 유지
    await prisma.rarity.update({ where: { id: r.id }, data: { abbr: m.abbr, canonicalCode: m.canonicalCode } });
    updated++;
  }
  console.log(`\n✓ abbr/canonicalCode 채움: ${updated}/${rarities.length}`);

  // ── 검증: 어비스아이 canonical 구성 ──────────────────────────────────────
  const rcs = await prisma.regionCard.findMany({
    where: { setId: "jp-mega-abyss-eye" },
    select: { rarity: { select: { canonicalCode: true, abbr: true } } },
  });
  const byCanon = new Map<string, { abbr: string; n: number }>();
  for (const c of rcs) {
    const cc = c.rarity?.canonicalCode ?? "(none)";
    const ab = c.rarity?.abbr ?? "?";
    const cur = byCanon.get(cc) ?? { abbr: ab, n: 0 };
    byCanon.set(cc, { abbr: ab, n: cur.n + 1 });
  }
  console.log(`\n=== 어비스아이 canonical 구성 (total ${rcs.length}) ===`);
  const expect: Record<string, number> = { common: 38, uncommon: 27, rare: 8, double_rare: 8, art_rare: 12, special_art_rare: 6, super_rare: 18, mega_ultra_rare: 1 };
  for (const [cc, v] of [...byCanon.entries()]) console.log(`  ${v.abbr.padEnd(4)} ${cc}: ${v.n}`);
  const ok = rcs.length === 118 &&
    Object.entries(expect).every(([k, v]) => byCanon.get(k)?.n === v) &&
    [...byCanon.keys()].every((k) => k in expect);
  console.log(`\nAbyss Eye = C38/U27/R8/RR8/AR12/SAR6/SR18/MUR1=118 ? ${ok ? "✅ YES" : "❌ NO"}`);

  await prisma.$disconnect();
  if (!ok) process.exit(2);
  console.log("\n=== 완료 ===");
}

main().catch((e) => { console.error(e); process.exit(1); });
