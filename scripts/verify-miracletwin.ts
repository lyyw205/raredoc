import "dotenv/config";
import { prisma } from "../src/lib/prisma";
const JP = "jp-tcg-sn11";
const KR = "kr-sm11";
const PACK = "og-sn11";
const HR = "cmpp4wysu0016yjurcnv0ys4l";
const UR = "cmpp4wyzt001wyjuriy5esk1h";
const rl = (id: string | null) => (id === HR ? "HR" : id === UR ? "UR" : id ?? "-");
const NEW = [107, 108, 109, 110, 111, 112, 113, 114, 115];

async function main() {
  // STEP7: 신규 번호 재조회
  console.log("=== STEP7: jp-tcg-sn11 신규 시크릿 재조회 ===");
  const rows = await prisma.regionCard.findMany({
    where: { setId: JP, numberInt: { in: NEW } },
    select: { id: true, number: true, numberInt: true, name: true, rarityId: true, imageSmall: true, imageLarge: true,
      card: { select: { id: true, supertype: true, gameCardId: true, rarityId: true, primaryNumber: true, cardPackId: true } } },
    orderBy: { numberInt: "asc" },
  });
  for (const r of rows) {
    const imgOk = !!r.imageSmall && r.imageSmall === r.imageLarge;
    console.log(`  #${r.numberInt} num="${r.number}" ${r.name} [${rl(r.rarityId)}] img=${imgOk ? "OK" : "MISSING"} LC=${r.card?.id} primNum=${r.card?.primaryNumber} pack=${r.card?.cardPackId} gc=${r.card?.gameCardId}`);
  }
  console.log(`  신규 RC 수: ${rows.length} (기대 9)`);

  // 카운트 검증
  const jpAfter = await prisma.regionCard.count({ where: { setId: JP } });
  const rcTotal = await prisma.regionCard.count();
  const lcTotal = await prisma.card.count();
  console.log(`\njpAfter=${jpAfter} (기대 115), rcTotalAfter=${rcTotal} (기대 60983 = 60974+9), lcTotalAfter=${lcTotal} (기대 29142 = 29133+9)`);

  // STEP6: KR 동일카드 프린트 실재 여부
  console.log("\n=== STEP6: KR(kr-sm11) 매핑 검사 ===");
  const krCount = await prisma.regionCard.count({ where: { setId: KR } });
  console.log(`kr-sm11 총 ${krCount} 행.`);
  // 신규 LC 들에 ko 로케일이 붙었나?
  const lcIds = rows.map((r) => r.card!.id);
  const koOnNew = await prisma.regionCard.findMany({
    where: { cardId: { in: lcIds }, language: "ko" },
    select: { cardId: true, setId: true, number: true, name: true },
  });
  console.log(`신규 LC 에 붙은 ko 로케일: ${koOnNew.length} (기대 0 — JP 단독)`);
  for (const k of koOnNew) console.log(`  ${k.cardId} ${k.setId} #${k.number} ${k.name}`);
  // KR set 에 시크릿번호(107~115 또는 한국식 번호)로 동일카드 존재하나? (게임카드 기준 교차)
  const gcs = rows.map((r) => r.card!.gameCardId).filter(Boolean) as string[];
  const krSameGame = await prisma.regionCard.findMany({
    where: { setId: KR, card: { gameCardId: { in: gcs } } },
    select: { number: true, name: true, rarityId: true, card: { select: { gameCardId: true } } },
    orderBy: { number: "asc" },
  });
  console.log(`\nkr-sm11 안에 같은 게임카드(=신규 시크릿 본문) 프린트: ${krSameGame.length}`);
  for (const k of krSameGame) console.log(`  #${k.number} ${k.name} [${rl(k.rarityId)}] gc=${k.card?.gameCardId}`);
  // 그 중 HR/UR 레어도(=시크릿 동일 프린트)가 KR 에 실재하나?
  const krSecrets = krSameGame.filter((k) => k.rarityId === HR || k.rarityId === UR);
  console.log(`그 중 HR/UR(시크릿 동일 프린트): ${krSecrets.length} → ${krSecrets.length ? "KR 시크릿 실재" : "KR 시크릿 미존재(JP 단독 유지)"}`);

  // 다른 팩 손실 0 확인: 인접 set 표본
  const sampleSets = ["jp-tcg-SM12", "jp-tcg-SM12a", "kr-sm11"];
  console.log("\n인접 set 카운트(손실 0 점검):");
  for (const s of sampleSets) console.log(`  ${s}: ${await prisma.regionCard.count({ where: { setId: s } })}`);

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
