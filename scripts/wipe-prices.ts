/**
 * Price 삭제 유지보수 도구 — ★파괴적(비가역). 기존 stale 시세 정리/재구축용.
 *
 * 옵션(택1):
 *   --before=YYYY-MM-DD   그 날짜(UTC) 미만 recordedAt 행 삭제 (오늘 신규는 보존)
 *   --all                 전체 Price 삭제
 *   --source=code         특정 PriceSource code 로 한정(다른 옵션과 AND)
 *   --dry                 삭제 없이 대상 카운트만
 *
 * 예: npm run wipe:prices -- --before=2026-06-29        # ≤어제 stale 전부 제거
 *     npm run wipe:prices -- --all --dry
 *
 * 주의: MarketStat 은 Price 파생 집계 — 삭제 후 'npm run market:rebuild' 로 재구축 필요.
 */
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

async function main() {
  const args = process.argv.slice(2);
  const before = args.find((a) => a.startsWith("--before="))?.split("=")[1];
  const all = args.includes("--all");
  const sourceCode = args.find((a) => a.startsWith("--source="))?.split("=")[1];
  const dry = args.includes("--dry");

  if (!before && !all && !sourceCode) {
    console.error("범위 옵션 필요: --before=YYYY-MM-DD | --all | --source=code (--dry 로 미리보기)");
    process.exit(1);
  }

  const where: Prisma.PriceWhereInput = {};
  if (before) {
    const d = new Date(`${before}T00:00:00.000Z`);
    if (isNaN(d.getTime())) { console.error(`--before 날짜 파싱 실패: ${before}`); process.exit(1); }
    where.recordedAt = { lt: d };
  }
  if (sourceCode) {
    const src = await prisma.priceSource.findUnique({ where: { code: sourceCode }, select: { id: true } });
    if (!src) { console.error(`PriceSource code '${sourceCode}' 없음`); process.exit(1); }
    where.sourceId = src.id;
  }

  const total = await prisma.price.count();
  const target = await prisma.price.count({ where });
  console.log(`Price 총 ${total}행 중 삭제대상 ${target}행 (보존 ${total - target}행)`);
  console.log(`조건: ${JSON.stringify(where)}`);

  if (dry) {
    console.log("DRY — 삭제 안 함.");
    return prisma.$disconnect();
  }
  const res = await prisma.price.deleteMany({ where });
  const remain = await prisma.price.count();
  console.log(`WIPE done: 삭제 ${res.count}행, 남은 Price ${remain}행`);
  console.log("⚠ MarketStat 은 파생 집계 — 'npm run market:rebuild' 로 재구축 권장.");
  return prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
