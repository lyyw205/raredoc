/**
 * THE BEST OF XY (sm-best-of-xy) 시대 분류 교정 — SM → XY.
 *
 * 배경: 「THE BEST OF XY」(jp-tcg-SMXY/kr-smxy, 2017 발매)는 XY 카드 재록 컴필레이션인데
 *   og-sma 분리 신설 시 SM era 를 상속받아 도감 사이드바에서 SM 시대로 노출됨([P8] 기록).
 *   사용자 요청: XY 시대로 이동. → CardPack.era 를 "XY (컨셉팩)"(canonEra→XY)로 변경.
 *   ※ era 정의는 DB-only(group JSON·build-group.ts·seed 에 era 필드 없음, build-group 재빌드 시 era 미변경)
 *     → 소스 수정 불필요, DB 업데이트가 영구 교정.
 *
 * 적용: npx tsx scripts/move-bestxy-era.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { canonEra, eraLabel } from "../src/lib/cards/eras";

const APPLY = process.argv.includes("--apply");
const PACK = "sm-best-of-xy", NEW_ERA = "XY (컨셉팩)";

async function main() {
  const before = await prisma.cardPack.findUnique({ where: { id: PACK }, select: { era: true } });
  console.log(`현재: "${before?.era}" → ${canonEra(before?.era ?? "")} (${eraLabel(canonEra(before?.era ?? ""))})`);
  if (canonEra(NEW_ERA) !== "XY") throw new Error("새 era가 XY로 정규화 안 됨");
  console.log(`${APPLY ? "APPLY" : "DRY"} → "${NEW_ERA}" (canon=${canonEra(NEW_ERA)} / ${eraLabel(canonEra(NEW_ERA))})`);
  if (!APPLY) { console.log("적용: --apply"); return; }
  await prisma.cardPack.update({ where: { id: PACK }, data: { era: NEW_ERA } });
  const after = await prisma.cardPack.findUnique({ where: { id: PACK }, select: { era: true } });
  console.log(`✓ 적용됨: era="${after?.era}" → ${eraLabel(canonEra(after?.era ?? ""))}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
