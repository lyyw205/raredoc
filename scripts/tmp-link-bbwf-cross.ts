// BBWF(블랙볼트/화이트플레어) JP↔EN 교차 이동 카드 연결 (2026-06-07)
//   EN 발매가 일부 진화 라인을 JP와 반대 세트에 배치: ヒトモシ라인·バルチャイ라인(JP B → EN WF),
//   ギアル라인·ワシボン라인(JP W → EN BB). + 세트 내 미병합 4(슈바르고·박사연구·에너지 2종).
//   페어는 이름+dex+일러 양방향 유일쌍으로 수동 확정(전수 목록 대조 완료 — registry §26).
//   사용: npx tsx scripts/tmp-link-bbwf-cross.ts [--apply]
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

// [JP setId, JP number, EN setId, EN number, 메모]
const PAIRS: [string, string, string, string, string][] = [
  // JP 블랙볼트 → EN White Flare (교차 이동 10)
  ["jp-tcg-SV11B", "015", "rsv10pt5", "16", "Litwick satoma"],
  ["jp-tcg-SV11B", "016", "rsv10pt5", "17", "Lampent satoma"],
  ["jp-tcg-SV11B", "017", "rsv10pt5", "18", "Chandelure satoma"],
  ["jp-tcg-SV11B", "063", "rsv10pt5", "63", "Vullaby Pani Kobayashi"],
  ["jp-tcg-SV11B", "064", "rsv10pt5", "64", "Mandibuzz Pani Kobayashi"],
  ["jp-tcg-SV11B", "100", "rsv10pt5", "101", "Litwick IR Naoyo Kimura"],
  ["jp-tcg-SV11B", "101", "rsv10pt5", "102", "Lampent IR Ligton"],
  ["jp-tcg-SV11B", "102", "rsv10pt5", "103", "Chandelure IR Kuroimori"],
  ["jp-tcg-SV11B", "144", "rsv10pt5", "144", "Vullaby IR Saya Tsuruta"],
  ["jp-tcg-SV11B", "145", "rsv10pt5", "145", "Mandibuzz IR Bun Toujo"],
  // JP 블랙볼트 ↔ EN Black Bolt (세트 내 미병합 3)
  // ⚠ zsv10pt5 #60 중복(실물 인쇄에러: Antique Cover Fossil 060/086 오인쇄 — 정상 080) → 이름 가드 필수
  ["jp-tcg-SV11B", "065", "zsv10pt5", "60|Escavalier", "Escavalier DOM (EN dex누락으로 병합 누락)"],
  ["jp-tcg-SV11B", "084", "zsv10pt5", "85", "Professor's Research Taira Akitsu"],
  ["jp-tcg-SV11B", "086", "zsv10pt5", "86", "Prism Energy (일러 無·이름+번호 일치)"],
  // JP 화이트플레어 → EN Black Bolt (교차 이동 10)
  ["jp-tcg-SV11W", "065", "zsv10pt5", "61", "Klink Amelicart"],
  ["jp-tcg-SV11W", "066", "zsv10pt5", "62", "Klang Amelicart"],
  ["jp-tcg-SV11W", "067", "zsv10pt5", "63", "Klinklang Amelicart"],
  ["jp-tcg-SV11W", "076", "zsv10pt5", "77", "Rufflet Kedamahadaitai"],
  ["jp-tcg-SV11W", "077", "zsv10pt5", "78", "Braviary Kedamahadaitai"],
  ["jp-tcg-SV11W", "146", "zsv10pt5", "139", "Klink AR Nobuhiro Imagawa"],
  ["jp-tcg-SV11W", "147", "zsv10pt5", "140", "Klang AR okayamatakatoshi"],
  ["jp-tcg-SV11W", "148", "zsv10pt5", "141", "Klinklang AR Yuka Morii (EN dex 599 오기 — JP 601 권위)"],
  ["jp-tcg-SV11W", "156", "zsv10pt5", "154", "Rufflet AR Miki Tanaka"],
  ["jp-tcg-SV11W", "157", "zsv10pt5", "155", "Braviary AR kamonabe"],
  // JP 화이트플레어 ↔ EN White Flare (세트 내 미병합 1)
  ["jp-tcg-SV11W", "086", "rsv10pt5", "86", "Ignition Energy (일러 無·이름+번호 일치)"],
];

async function main() {
  console.log(`■ BBWF 교차 연결 ${PAIRS.length}쌍 ${APPLY ? "★적용" : "(dry)"}`);
  let ok = 0, skip = 0;
  for (const [jpSet, jpNum, enSet, enNum, memo] of PAIRS) {
    const jp = await prisma.regionCard.findFirst({ where: { setId: jpSet, number: jpNum },
      select: { name: true, logicalCardId: true, logicalCard: { select: { illustrator: true, locales: { where: { region: "EN" }, select: { id: true } } } } } });
    const [enNumOnly, enNameGuard] = enNum.split("|");
    const en = await prisma.regionCard.findFirst({ where: { setId: enSet, number: enNumOnly, ...(enNameGuard ? { name: enNameGuard } : {}) },
      select: { id: true, name: true, logicalCardId: true, logicalCard: { select: { illustrator: true, locales: { select: { region: true } } } } } });
    if (!jp || !en) { console.log(`❌ 누락: ${jpSet}#${jpNum} / ${enSet}#${enNum}`); skip++; continue; }
    // 가드: JP에 이미 EN 있으면 스킵 / EN이 orphan(EN로케일만) 아니면 스킵
    if (jp.logicalCard?.locales.length) { console.log(`⚠ JP 기연결 스킵: ${jpSet}#${jpNum} ${jp.name}`); skip++; continue; }
    if (!en.logicalCard?.locales.every((l) => l.region === "EN")) { console.log(`⚠ EN 비orphan 스킵: ${enSet}#${enNum} ${en.name}`); skip++; continue; }
    console.log(`연결 ${jpSet.replace("jp-tcg-", "")}#${jpNum} ${jp.name} [${jp.logicalCard?.illustrator}] ← ${enSet}#${enNum} ${en.name} [${en.logicalCard?.illustrator}] (${memo})`);
    if (APPLY) {
      const oldLc = en.logicalCardId!;
      await prisma.regionCard.update({ where: { id: en.id }, data: { logicalCardId: jp.logicalCardId! } });
      await migrateAndDelete(oldLc, jp.logicalCardId!);
    }
    ok++;
  }
  // 잔여 빈 orphan 청소 (중단 재실행 대비): EN 로케일이 이미 이관됐는데 LC만 남은 경우
  if (APPLY) {
    for (const [, , enSet, enNum] of PAIRS) {
      const oldId = `lc-orphan-${enSet}-${enNum.split("|")[0]}`;
      const lc = await prisma.logicalCard.findUnique({ where: { id: oldId }, select: { id: true, locales: { select: { id: true } } } });
      if (lc && lc.locales.length === 0) {
        const enLoc = await prisma.regionCard.findFirst({ where: { setId: enSet, number: enNum.split("|")[0] }, select: { logicalCardId: true } });
        if (enLoc?.logicalCardId) { console.log(`잔여 빈 orphan 청소: ${oldId} → 참조 ${enLoc.logicalCardId} 이관`); await migrateAndDelete(oldId, enLoc.logicalCardId); }
      }
    }
  }
  console.log(`\n연결 ${ok} · 스킵 ${skip}`);
}

// orphan LC 삭제 전 사용자 데이터(Trade/CollectionItem/덱/티어/룰링/외부ID) 참조를 새 LC로 이관.
// CardText는 (lcid,language) 유니크 — 새 LC에 같은 언어 있으면 cascade 삭제에 맡김, 없으면 이관.
async function migrateAndDelete(oldLc: string, newLc: string) {
  const left = await prisma.regionCard.count({ where: { logicalCardId: oldLc } });
  if (left > 0) return;
  for (const model of ["trade", "collectionItem", "deckRecipeCard", "deckCard", "ruling", "externalIdMapping"] as const) {
    // @ts-expect-error 동적 모델 접근
    const r = await prisma[model].updateMany({ where: { logicalCardId: oldLc }, data: { logicalCardId: newLc } });
    if (r.count) console.log(`  참조 이관 ${model}: ${r.count} (${oldLc} → ${newLc})`);
  }
  // TierEntry: unique(logicalCardId,setId) 충돌 시 구 항목 삭제
  const tiers = await prisma.tierEntry.findMany({ where: { logicalCardId: oldLc }, select: { id: true, setId: true } });
  for (const t of tiers) {
    const dup = await prisma.tierEntry.findFirst({ where: { logicalCardId: newLc, setId: t.setId }, select: { id: true } });
    if (dup) await prisma.tierEntry.delete({ where: { id: t.id } });
    else await prisma.tierEntry.update({ where: { id: t.id }, data: { logicalCardId: newLc } });
    console.log(`  참조 이관 tierEntry(${t.setId})${dup ? " — 중복으로 구항목 삭제" : ""}`);
  }
  // CardText: 새 LC에 없는 언어만 이관
  const texts = await prisma.cardText.findMany({ where: { logicalCardId: oldLc }, select: { id: true, language: true } });
  for (const tx of texts) {
    const dup = await prisma.cardText.findFirst({ where: { logicalCardId: newLc, language: tx.language }, select: { id: true } });
    if (!dup) { await prisma.cardText.update({ where: { id: tx.id }, data: { logicalCardId: newLc } }); console.log(`  CardText(${tx.language}) 이관`); }
  }
  await prisma.logicalCard.delete({ where: { id: oldLc } });
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
