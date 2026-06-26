/**
 * THE BEST OF XY (sm-best-of-xy) 를 도감/팩/컬렉션 페이지에서 XY 시대로 이동 — 진짜 픽스.
 *
 * 배경: 이전 세션에 CardPack.era(raw 문자열)만 "SM (썬·문)"→"XY (컨셉팩)"로 바꿨으나,
 *   페이지의 시대 그룹·정렬은 CardPack.era 가 아니라 **eraKey(→Era 테이블 FK, eraRef)** 로 결정됨
 *   (src/lib/cards/dex-region.ts: ref=cardPack.eraRef → era=ref.key, eraOrder=ref.order).
 *   eraKey 는 과거 마이그레이션이 canonEra(era)로 1회 백필한 값이라 "SM"으로 굳어 있었음
 *   → THE BEST OF XY 가 여전히 SM 사이에 노출. (raw era 만으론 안 움직임)
 *
 * 픽스: eraKey "SM" → "XY". (raw era 는 이미 "XY (컨셉팩)"=canonEra→XY 로 일관, 비교군 og-cp6 와 동일 패턴)
 *   eraKey 는 build-group/seed 가 안 건드리므로 DB 직접 수정이 영구.
 *   order(91) 는 이 페이지들 정렬(eraOrder→releaseDate)에 미사용이라 그대로 둠
 *   (THE BEST OF XY=2017 발매라 XY 시대 안에서 releaseDate 기준 자연히 맨 끝).
 *
 * dry: npx tsx scripts/fix-bestxy-erakey.ts
 * 적용: npx tsx scripts/fix-bestxy-erakey.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { canonEra } from "../src/lib/cards/eras";

const APPLY = process.argv.includes("--apply");
const PACK = "sm-best-of-xy";
const NEW_ERA_KEY = "XY";

async function main() {
  const before = await prisma.cardPack.findUnique({
    where: { id: PACK },
    select: { id: true, era: true, eraKey: true, eraRef: { select: { key: true, labelKo: true, order: true } } },
  });
  if (!before) throw new Error(`${PACK} CardPack 없음`);
  console.log("변경 전:", JSON.stringify(before));

  // 검증: 새 eraKey 가 Era 테이블에 존재하고, raw era 의 canonEra 와 일치해야 함
  const eraRow = await prisma.era.findUnique({ where: { key: NEW_ERA_KEY }, select: { key: true, labelKo: true, order: true } });
  if (!eraRow) throw new Error(`Era 테이블에 key=${NEW_ERA_KEY} 없음`);
  if (canonEra(before.era) !== NEW_ERA_KEY) throw new Error(`raw era(${before.era})의 canonEra(${canonEra(before.era)}) ≠ ${NEW_ERA_KEY}`);
  console.log(`타깃 Era: ${JSON.stringify(eraRow)} (canonEra("${before.era}")=${canonEra(before.era)} 일치)`);

  if (before.eraKey === NEW_ERA_KEY) { console.log("이미 XY — 변경 불필요"); return; }
  if (!APPLY) { console.log("\n적용: --apply"); return; }

  await prisma.cardPack.update({ where: { id: PACK }, data: { eraKey: NEW_ERA_KEY } });
  const after = await prisma.cardPack.findUnique({
    where: { id: PACK },
    select: { id: true, era: true, eraKey: true, eraRef: { select: { key: true, labelKo: true, order: true } } },
  });
  console.log("✓ 변경 후:", JSON.stringify(after));
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
