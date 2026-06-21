/**
 * EN 도감 중복 stub 세트 정리 — SM 세대 12팩 + Celebrations Classic 의 중복 등재 제거.
 *
 * 배경: pokemontcg.io 식 import 로 만들어진 짧은-ID 세트(sm1..sm12, cel25c)가
 *   TCGdex 정본 세트(en-tcg-sm*, en-tcg-cel25c)와 같은 이름으로 중복 등재돼 EN 사이드바에
 *   2번씩 뜬다. stub 쪽에는 letter-suffix 별쩜 변형 프린트(60a/101a/182a 등) 50장이
 *   고립돼 있고, 전부 EN 단독(JP/KR 형제 0) + 시세 보유. 삭제하면 시세 손실 →
 *   정본 확장팩으로 repoint(setId + LogicalCard.primarySetId) 후 빈 stub 삭제(무손실).
 *
 * 동결: 정본 SM 세트는 og-sm* 그룹(2026-06-16 동결). 옮기는 카드는 EN 단독 orphan 이라
 *   기존 EN/KR 매칭 불변 — 사용자 확인 후 --allow-protected 로 진행.
 *
 * 실행: npx tsx scripts/dedupe-en-sm-stubs.ts            (dry-run)
 *       npx tsx scripts/dedupe-en-sm-stubs.ts --apply --allow-protected
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

// stub setId → 정본 setId
const MAP: Record<string, string> = {
  sm1: "en-tcg-sm1", sm2: "en-tcg-sm2", sm3: "en-tcg-sm3", sm4: "en-tcg-sm4",
  sm35: "en-tcg-sm35", sm6: "en-tcg-sm6", sm7: "en-tcg-sm7", sm8: "en-tcg-sm8",
  sm9: "en-tcg-sm9", sm10: "en-tcg-sm10", sm11: "en-tcg-sm11", sm12: "en-tcg-sm12",
  cel25c: "en-tcg-cel25c",
};

async function main() {
  const apply = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const stubs = Object.keys(MAP);
  const canon = [...new Set(Object.values(MAP))];

  // 영향권 동결 검사 — 정본 세트의 cardPack(setGroup) 기준
  const canonSets = await prisma.set.findMany({
    where: { id: { in: canon } },
    select: { id: true, cardPackId: true, name: true },
  });
  const foundCanon = new Set(canonSets.map((s) => s.id));
  const missingCanon = canon.filter((c) => !foundCanon.has(c));
  if (missingCanon.length) {
    console.error(`🛑 정본 세트 누락(매핑 오류?): ${missingCanon.join(", ")}`);
    process.exit(1);
  }
  assertWritable(canonSets.map((s) => s.cardPackId), {
    allow, dryRun: !apply, tool: "dedupe-en-sm-stubs",
  });

  // 현황 집계
  let totalLocale = 0, totalPrimary = 0;
  const plan: { stub: string; canon: string; locale: number; primary: number }[] = [];
  for (const stub of stubs) {
    const locale = await prisma.regionCard.count({ where: { setId: stub } });
    const primary = await prisma.card.count({ where: { primarySetId: stub } });
    totalLocale += locale; totalPrimary += primary;
    plan.push({ stub, canon: MAP[stub], locale, primary });
  }

  console.log(`\n${apply ? "[APPLY]" : "[DRY-RUN]"} EN SM/cel25c stub 정리 — repoint→정본 후 stub 삭제`);
  for (const p of plan) {
    console.log(`  ${p.stub.padEnd(7)} → ${p.canon.padEnd(15)}  locale ${p.locale}장 · primarySet ${p.primary}건`);
  }
  console.log(`  합계: CardLocale ${totalLocale}장 · LogicalCard.primarySetId ${totalPrimary}건 · stub 세트 ${stubs.length}개 삭제`);

  if (!apply) {
    console.log("\n(dry-run — 실제 적용하려면 --apply --allow-protected)");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const stub of stubs) {
      const canonId = MAP[stub];
      await tx.regionCard.updateMany({ where: { setId: stub }, data: { setId: canonId } });
      await tx.card.updateMany({ where: { primarySetId: stub }, data: { primarySetId: canonId } });
    }
    // 빈 stub 세트 삭제(잔여 참조 0 확인 후)
    for (const stub of stubs) {
      const left = await tx.regionCard.count({ where: { setId: stub } });
      const leftP = await tx.card.count({ where: { primarySetId: stub } });
      if (left > 0 || leftP > 0) throw new Error(`stub ${stub} 잔여 참조 — locale ${left}, primary ${leftP}. 롤백.`);
      await tx.set.delete({ where: { id: stub } });
    }
  });

  console.log(`\n✅ 완료 — ${totalLocale}장 repoint, stub ${stubs.length}개 삭제. (in-memory 캐시는 배포/재시작 또는 clearRegionCaches() 시 갱신)`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
