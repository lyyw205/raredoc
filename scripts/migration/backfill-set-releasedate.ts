// Slice 2 (docs/migration/identity-model-migration-plan.md §0′) — 발매일 센티넬 백필.
//
// 목적: D3 형제 리졸버의 "최근접 발매일" tie-break 와 도감 사이드바 정렬을 위해,
//   releaseDate = 1970-01-01 센티넬(=불명)을 **추측 없이** 실제 발매일로 채운다.
//
// 출처(추측 0): 같은 CardPack(setGroupId) 안의 **유일한 JP 트윈** 발매일(JP 원본 발매일).
//   - 대상 조건(전부 충족): ① releaseDate ≤ 1996-01-01(센티넬) ② cardPackId 존재
//     ③ cardPackId 가 프로모 아님(/promo/i) ④ 같은 CardPack 의 region=JP·실발매일 세트가
//        **정확히 1개의 날짜**를 가짐(다중 날짜=덱류 묶음팩 → 모호하므로 제외).
//   - 제외(센티넬 유지, 리졸버가 ≤1996 을 무시하므로 안전): 프로모 6 · 덱/묶음팩(dp/xy/sm-decks) · 트윈 없음 · kr-temp.
//   ※ KR 세트에 JP 원본일을 부여 = "확장팩의 정전(canonical) 발매일"(도감은 JP 앵커). 표시용 KR 가두(街頭)일 아님 — 정렬·tie-break 목적.
//
// 안전: dry-run 기본. --apply 로만 기록. assertWritable 가드(--allow-protected). Set 테이블만(정체성 행 무변경). 멱등(재실행=no-op).
//   실행:  npx tsx scripts/migration/backfill-set-releasedate.ts            (dry-run)
//          npx tsx scripts/migration/backfill-set-releasedate.ts --apply
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const ALLOW_PROTECTED = hasAllowProtectedFlag();
// 포켓몬 TCG 개시(1996-10) 이전 = 센티넬/불명. 실세트 최소 발매일(JP PMCG1 1996-10-20)보다 앞.
const TCG_EPOCH = new Date("1996-01-01T00:00:00.000Z");

type Plan = { id: string; name: string; cardPackId: string; from: Date; to: Date; jpTwin: string };
type Skip = { id: string; reason: string };

async function main() {
  const sentinels = await prisma.set.findMany({
    where: { releaseDate: { lte: TCG_EPOCH } },
    select: { id: true, name: true, region: true, cardPackId: true, releaseDate: true },
    orderBy: { id: "asc" },
  });

  const plans: Plan[] = [];
  const skipped: Skip[] = [];

  for (const s of sentinels) {
    if (!s.cardPackId) {
      skipped.push({ id: s.id, reason: "cardPackId 없음" });
      continue;
    }
    if (/promo/i.test(s.cardPackId)) {
      skipped.push({ id: s.id, reason: `프로모 제외 (${s.cardPackId})` });
      continue;
    }
    const jpTwins = await prisma.set.findMany({
      where: { cardPackId: s.cardPackId, region: "JP", releaseDate: { gt: TCG_EPOCH } },
      select: { id: true, releaseDate: true },
      orderBy: { releaseDate: "asc" },
    });
    if (jpTwins.length === 0) {
      skipped.push({ id: s.id, reason: `JP 트윈 없음 (${s.cardPackId})` });
      continue;
    }
    const distinctDates = [...new Set(jpTwins.map((t) => t.releaseDate.toISOString()))];
    if (distinctDates.length !== 1) {
      skipped.push({ id: s.id, reason: `JP 트윈 날짜 다중 ${distinctDates.length}개 → 덱/묶음팩 (${s.cardPackId})` });
      continue;
    }
    plans.push({
      id: s.id,
      name: s.name,
      cardPackId: s.cardPackId,
      from: s.releaseDate,
      to: jpTwins[0].releaseDate,
      jpTwin: jpTwins[0].id,
    });
  }

  // 동결 가드 — plans 의 cardPackId 만 검사(skip 된 sm-decks 등은 plans 에 없음).
  assertWritable(
    plans.map((p) => p.cardPackId),
    { allow: ALLOW_PROTECTED, dryRun: !APPLY, tool: "backfill-set-releasedate" },
  );

  const d = (x: Date) => x.toISOString().slice(0, 10);
  console.log(`\n센티넬(≤1996-01-01): ${sentinels.length} · 백필 대상: ${plans.length} · 건너뜀: ${skipped.length}`);
  console.log(`\n[백필 대상]`);
  for (const p of plans) {
    console.log(`  ${p.id.padEnd(16)} ${d(p.from)} → ${d(p.to)}  (JP twin ${p.jpTwin}) · ${p.name}`);
  }
  console.log(`\n[건너뜀]`);
  for (const s of skipped) console.log(`  ${s.id.padEnd(16)} — ${s.reason}`);

  if (!APPLY) {
    console.log(`\n[dry-run] 변경 없음. 적용하려면 --apply.`);
    return;
  }
  let n = 0;
  for (const p of plans) {
    await prisma.set.update({ where: { id: p.id }, data: { releaseDate: p.to } });
    n++;
  }
  console.log(`\n✅ ${n}개 Set.releaseDate 백필 완료.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
