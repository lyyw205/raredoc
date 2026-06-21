/**
 * KR Set.logoUrl 백필 — 무로고 KR 세트에 같은 그룹 JP 트윈의 로고를 재사용(기존 패턴: kr-ma→jp-tcg-MA).
 *   세트 로고 아트워크는 지역 공유(텍스트만 현지화). JP 트윈 없는 ungrouped/프로모는 null 유지.
 *
 * 실행: npx tsx scripts/backfill-kr-logos.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

async function main() {
  const apply = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const targets = await prisma.set.findMany({
    where: { region: "KR", logoUrl: null },
    select: { id: true, name: true, cardPackId: true },
  });
  assertWritable(targets.map((s) => s.cardPackId), { allow, dryRun: !apply, tool: "backfill-kr-logos" });

  let filled = 0; const noTwin: string[] = [];
  for (const s of targets) {
    if (!s.cardPackId) { noTwin.push(s.id); continue; }
    const jp = await prisma.set.findFirst({
      where: { cardPackId: s.cardPackId, region: "JP", logoUrl: { not: null } },
      select: { logoUrl: true }, orderBy: { releaseDate: "asc" },
    });
    if (!jp?.logoUrl) { noTwin.push(s.id); continue; }
    filled++;
    if (filled <= 30) console.log(`${apply ? "[APPLY]" : "[DRY]"} ${s.id.padEnd(12)} ← ${jp.logoUrl.split("/").pop()}`);
    if (apply) await prisma.set.update({ where: { id: s.id }, data: { logoUrl: jp.logoUrl } });
  }
  if (filled > 30 && !apply) console.log(`  … 외 ${filled - 30}건`);
  if (noTwin.length) console.warn(`\n⚠ JP 트윈 로고 없음(null 유지) ${noTwin.length}: ${noTwin.join(", ")}`);
  console.log(`\n${apply ? "완료" : "dry-run"} — 채움 ${filled} · 트윈없음 ${noTwin.length} / 대상 ${targets.length}`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
