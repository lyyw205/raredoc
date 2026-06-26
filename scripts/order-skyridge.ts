/**
 * Skyridge (en-tcg-ecard3, SK) 정렬 교정 — H1–H32 를 메인 #1–150 앞에 오게 numberInt 재배치.
 *
 * 문제: H1–H32 의 numberInt 가 1–32 라서 메인 #1–150(numberInt 1–150)과 **충돌** →
 *   정렬(numberInt asc → number)에서 `1, H1, 2, H2, …` 로 교차됨.
 * 조치(요청 순서): H1–H32 먼저, 그다음 1–150. H 카드만 음수 numberInt 로:
 *   H{k} → numberInt = k - 33  (H1=-32 … H32=-1).  메인 1–150 은 그대로(자연 번호).
 *   → 정렬: H1(-32) … H32(-1) < 메인 1 … 150. 표시 번호("H1","1")·이미지·정체성 불변.
 *   ※ 모든 정렬 comparator 가 수치 뺄셈(an-bn)이라 음수 안전. numberInt 비잠금 + e-Card 비잠금 + EN → 자유.
 *
 * dry: npx tsx scripts/order-skyridge.ts
 * 적용: npx tsx scripts/order-skyridge.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const SET = "en-tcg-ecard3";

async function main() {
  const rcs = await prisma.regionCard.findMany({
    where: { setId: SET },
    select: { id: true, number: true, numberInt: true },
  });
  const H = rcs.filter((r) => /^H\d+$/i.test(r.number ?? ""));
  console.log(`${APPLY ? "APPLY" : "DRY"} order-skyridge | 전체 ${rcs.length} | H 카드 ${H.length} (기대 32)`);
  if (H.length !== 32) console.warn(`  ⚠ H 카드 수 ${H.length} ≠ 32 — 확인 필요`);

  const updates: { id: string; number: string; from: number | null; to: number }[] = [];
  for (const r of H) {
    const k = parseInt((r.number ?? "").slice(1), 10); // "H1" → 1
    if (!Number.isFinite(k)) { console.warn(`  ⚠ 파싱 실패: ${r.number}`); continue; }
    const to = k - 33; // H1=-32 … H32=-1
    if (r.numberInt === to) continue;
    updates.push({ id: r.id, number: r.number!, from: r.numberInt, to });
  }
  updates.sort((a, b) => a.to - b.to);
  console.log(`  변경 ${updates.length}장 (H1→-32 … H32→-1, 메인 앞으로):`);
  for (const u of updates) console.log(`    ${u.number.padEnd(4)} numberInt ${u.from} → ${u.to}`);

  if (!APPLY) { console.log("\n[dry-run] 변경 없음. --apply 로 실행."); return; }
  let done = 0;
  for (const u of updates) { await prisma.regionCard.update({ where: { id: u.id }, data: { numberInt: u.to } }); done++; }
  console.log(`\n✅ numberInt 재배치 ${done}장 — Skyridge 가 H1–H32 → 1–150 순으로 정렬됩니다.`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
