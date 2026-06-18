/**
 * KR 시크릿 수집 — 3팩 (S3 무한존 · S3a 전설의 고동 · S4 앙천의 볼트태클) 충돌 없는 20장.
 *
 * 공식 pokemoncard.co.kr 이 최상위 시크릿 티어 누락 → namu 메타, JP 논리카드에 정체성 매핑.
 * ⚠️ VMAX 시크릿 8장(S3 #111-114, S3a #86-88, S4 #114)은 본세트 V/VMAX 스크램블이 해당
 *    논리카드를 점유 중이라 이 스크립트에서 제외(스크램블 선해결 필요).
 * 이미지 미수집(null) → 도감 EN→JP 표시폴백+미수집마커.  S4 트레이너 HR 순열(단델/야청) 정체성 반영됨.
 *
 * 매핑 데이터: data/kr-secret-collect-3packs.json (병렬 워크플로 + 충돌 제외 검증).
 * 실행: npx tsx scripts/collect-kr-secrets-3packs.ts [--apply]   (기본 dry-run)
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
type Row = { code: string; krSet: string; pad: number; cc: number; num: number; name: string; rarityId: string; rarityLabel: string; lc: string };
const ROWS: Row[] = JSON.parse(readFileSync("data/kr-secret-collect-3packs.json", "utf8"));
const CODE2GROUP: Record<string, string> = { S3: "og-s3", S3a: "og-s3a", S4: "og-s4" };
const fmt = (n: number, pad: number) => (pad === 3 ? String(n).padStart(3, "0") : String(n));

async function main() {
  console.log(`\n=== KR 시크릿 수집 3팩 (${ROWS.length}장) ${APPLY ? "[APPLY]" : "[DRY-RUN]"} ===`);
  const groups = [...new Set(ROWS.map((r) => CODE2GROUP[r.code]))];
  assertWritable(groups, { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-kr-secrets-3packs" });

  const allLc = [...new Set(ROWS.map((r) => r.lc))];
  const found = await prisma.card.findMany({ where: { id: { in: allLc } }, select: { id: true } });
  const missing = allLc.filter((id) => !found.find((f) => f.id === id));
  if (missing.length) { console.error("🛑 논리카드 누락:", missing); process.exit(1); }
  // 안전장치: 타깃 논리카드에 이미 KR 행이 있으면 중단(충돌 방지)
  const occupied = await prisma.regionCard.findMany({ where: { cardId: { in: allLc }, region: "KR" }, select: { id: true, cardId: true } });
  if (occupied.length) { console.error("🛑 타깃 논리카드에 기존 KR 행 존재(충돌):", occupied); process.exit(1); }
  console.log(`논리카드 확인: ${found.length}/${allLc.length} OK, KR 충돌 0\n`);

  let created = 0, updated = 0;
  const byCode: Record<string, number> = {};
  for (const r of ROWS) {
    const numStr = fmt(r.num, r.pad);
    const id = `${r.krSet}-${numStr}`;
    const data = {
      language: "ko", region: "KR", number: numStr, numberInt: r.num, name: r.name,
      imageSmall: null, imageLarge: null,
      card: { connect: { id: r.lc } }, set: { connect: { id: r.krSet } }, rarity: { connect: { id: r.rarityId } },
    };
    const exists = await prisma.regionCard.findUnique({ where: { id }, select: { id: true } });
    byCode[r.code] = (byCode[r.code] ?? 0) + 1;
    if (!APPLY) {
      console.log(`  ${id}  ${r.rarityLabel.padEnd(3)} ${r.name.padEnd(16)} → ${r.lc}  ${exists ? "(update)" : "(create)"}`);
    } else {
      await prisma.regionCard.upsert({ where: { id }, create: { id, ...data }, update: data });
      exists ? updated++ : created++;
    }
  }

  const ccBySet = new Map<string, number>();
  for (const r of ROWS) ccBySet.set(r.krSet, r.cc);
  console.log(`\n--- Set.cardCount 갱신 ---`);
  for (const [krSet, cc] of ccBySet) { console.log(`  ${krSet} → ${cc}`); if (APPLY) await prisma.set.update({ where: { id: krSet }, data: { cardCount: cc } }); }

  console.log(`\n팩별: ${JSON.stringify(byCode)}`);
  console.log(`=== ${APPLY ? `완료: create ${created}, update ${updated}` : "DRY-RUN. --apply 로 실행."} ===`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
