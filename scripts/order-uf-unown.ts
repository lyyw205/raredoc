/**
 * EX Unseen Forces (en-tcg-ex10, UF) Unown 28장(!,?,A–Z) 정렬 교정 — numberInt 부여.
 *
 * 문제: Unown 28장이 모두 numberInt=null 이라 카탈로그 정렬(numberInt asc[null 뒤] → number.localeCompare)에서
 *   #117 뒤로 몰리고 문장부호(!,?) 로케일 정렬이 불안정 → "순서 뒤섞임"으로 보임.
 * 조치: numberInt 를 정렬 키로 부여(표시 번호=글자 그대로, 이미지/이름/정체성 불변).
 *   #117 다음에 A–Z(118–143) → !(144) → ?(145) 순. (레터번호 카드의 numberInt 정렬키 패턴은 기존 에너지 F/L 과 동일)
 *   ※ RegionCard.numberInt 는 잠금 필드 아님 + EX 비잠금 + EN → 자유(가드 불필요).
 *
 * dry: npx tsx scripts/order-uf-unown.ts
 * 적용: npx tsx scripts/order-uf-unown.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const SET = "en-tcg-ex10";

// 표시순: A–Z → ! → ? . numberInt = #117 다음부터.
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const ORDER: string[] = [...LETTERS, "!", "?"]; // 28
const START = 118;
const PLAN = new Map<string, number>(ORDER.map((l, i) => [l, START + i])); // A=118 … Z=143, !=144, ?=145

async function main() {
  const rcs = await prisma.regionCard.findMany({
    where: { setId: SET, name: { contains: "Unown" } },
    select: { id: true, number: true, numberInt: true },
  });
  console.log(`${APPLY ? "APPLY" : "DRY"} order-uf-unown | 대상 ${rcs.length}장 (기대 28)`);
  if (rcs.length !== 28) console.warn(`  ⚠ 대상 수 ${rcs.length} ≠ 28 — 확인 필요`);

  const updates: { id: string; number: string; from: number | null; to: number }[] = [];
  for (const r of rcs) {
    const to = PLAN.get(r.number ?? "");
    if (to == null) { console.warn(`  ⚠ 매핑 없음: number="${r.number}" (${r.id})`); continue; }
    if (r.numberInt === to) continue; // 이미 맞음
    updates.push({ id: r.id, number: r.number!, from: r.numberInt, to });
  }
  updates.sort((a, b) => a.to - b.to);
  console.log(`  변경 ${updates.length}장 (A–Z → ! → ? , #117 다음):`);
  for (const u of updates) console.log(`    "${u.number}"  numberInt ${u.from} → ${u.to}`);

  if (!APPLY) { console.log("\n[dry-run] 변경 없음. --apply 로 실행."); return; }
  let done = 0;
  for (const u of updates) { await prisma.regionCard.update({ where: { id: u.id }, data: { numberInt: u.to } }); done++; }
  console.log(`\n✅ numberInt 부여 ${done}장 — Unown 이 #117 다음 A–Z, !, ? 순으로 정렬됩니다.`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
