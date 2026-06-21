/**
 * KR Set.series 정리 — "KR"/"剣と盾"/"DP" 플레이스홀더를 era 기반 영문 series 명으로(EN 과 일관).
 *   series 는 사이드바 무관(grouped=eraRef)이나 데이터 정합성용. effective era = eraRef(grouped) | canonEra(series).
 *
 * 실행: npx tsx scripts/fix-kr-series.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";
import { canonEra } from "../src/lib/cards/eras";

const ERA_SERIES: Record<string, string> = {
  MEGA: "Mega Evolution", SV: "Scarlet & Violet", S: "Sword & Shield", SM: "Sun & Moon",
  XY: "XY", BW: "Black & White", HGSS: "HeartGold & SoulSilver", LEGEND: "HeartGold & SoulSilver",
  Pt: "Platinum", DP: "Diamond & Pearl", PCG: "EX", ADV: "EX", "e-Card": "e-Card",
  NEO: "Neo", BASE: "Original",
};

async function main() {
  const apply = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({
    where: { region: "KR" },
    select: { id: true, name: true, series: true, cardPackId: true,
      cardPack: { select: { eraRef: { select: { key: true } } } } },
  });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !apply, tool: "fix-kr-series" });

  let changed = 0, skip = 0; const unmapped: string[] = [];
  for (const s of sets) {
    const era = s.cardPack?.eraRef?.key ?? canonEra(s.series);
    const target = ERA_SERIES[era];
    if (!target) { unmapped.push(`${s.id}(era=${era})`); continue; }
    if (s.series === target) { skip++; continue; }
    changed++;
    if (changed <= 40) console.log(`${apply ? "[APPLY]" : "[DRY]"} ${s.id.padEnd(12)} ${s.series} → ${target}  (era ${era})`);
    if (apply) await prisma.set.update({ where: { id: s.id }, data: { series: target } });
  }
  if (changed > 40 && !apply) console.log(`  … 외 ${changed - 40}건`);
  if (unmapped.length) console.warn(`\n⚠ era 매핑 없음(유지): ${unmapped.join(", ")}`);
  console.log(`\n${apply ? "완료" : "dry-run"} — 변경 ${changed} · 이미일치 ${skip} · 미매핑 ${unmapped.length}`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
