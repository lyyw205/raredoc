/**
 * e-Card 시대 H세트(H1–Hxx + 메인 1–N) 정렬 교정 — 범용. H 카드를 메인 앞으로.
 *
 * 문제: Aquapolis/Skyridge 등은 H1–H32 의 numberInt(1–32)가 메인 #1–150(1–150)과 충돌 →
 *   정렬에서 `1, H1, 2, H2, …` 교차.
 * 조치: H 카드만 음수 numberInt 로 — H{k} → numberInt = k - (Hmax+1)  (Hmax=H 최대번호).
 *   예) H32 까지면 H1=-32 … H32=-1 < 메인 1 … . 표시 번호·이미지·정체성 불변(numberInt=정렬키).
 *   ※ 정렬 comparator 전부 수치 뺄셈 → 음수 안전. numberInt 비잠금 + e-Card 비잠금 + EN → 자유.
 *
 * dry:  npx tsx scripts/order-ecard-h.ts --set <setId>
 * 적용: npx tsx scripts/order-ecard-h.ts --set <setId> --apply
 *   (예: --set en-tcg-ecard2  [Aquapolis] / --set en-tcg-ecard3 [Skyridge])
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const SET = (() => { const i = process.argv.indexOf("--set"); return i >= 0 ? process.argv[i + 1] : undefined; })();

async function main() {
  if (!SET) { console.error("usage: --set <setId> [--apply]"); process.exit(1); }
  const rcs = await prisma.regionCard.findMany({ where: { setId: SET }, select: { id: true, number: true, numberInt: true } });
  const H = rcs.filter((r) => /^H\d+$/i.test(r.number ?? ""));
  if (!H.length) { console.error(`✗ ${SET}: H 카드 없음 — 대상 아님`); process.exit(1); }
  const ks = H.map((r) => parseInt((r.number ?? "").slice(1), 10));
  const Hmax = Math.max(...ks);
  console.log(`${APPLY ? "APPLY" : "DRY"} order-ecard-h | ${SET} | 전체 ${rcs.length} | H ${H.length} (H1–H${Hmax})`);

  const updates: { id: string; number: string; from: number | null; to: number }[] = [];
  for (const r of H) {
    const k = parseInt((r.number ?? "").slice(1), 10);
    if (!Number.isFinite(k)) { console.warn(`  ⚠ 파싱 실패: ${r.number}`); continue; }
    const to = k - (Hmax + 1); // H1 = -(Hmax) … HHmax = -1
    if (r.numberInt === to) continue;
    updates.push({ id: r.id, number: r.number!, from: r.numberInt, to });
  }
  updates.sort((a, b) => a.to - b.to);
  console.log(`  변경 ${updates.length}장 (H1→${-Hmax} … H${Hmax}→-1, 메인 앞으로):`);
  for (const u of updates) console.log(`    ${u.number.padEnd(4)} numberInt ${u.from} → ${u.to}`);

  if (!APPLY) { console.log("\n[dry-run] 변경 없음. --apply 로 실행."); return; }
  let done = 0;
  for (const u of updates) { await prisma.regionCard.update({ where: { id: u.id }, data: { numberInt: u.to } }); done++; }
  console.log(`\n✅ numberInt 재배치 ${done}장 — ${SET} 가 H1–H${Hmax} → 메인 순으로 정렬됩니다.`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
