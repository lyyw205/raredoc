/**
 * Cold Flare(コールドフレア, code BW6C, BW era, 2012-07-13) 메타 교정 — 카드연결 무관.
 *  (A) jp-tcg-BW6C cardCount 59(stale, base /059만)→65(실제 rows=트래커 65). base59+시크릿6(#60-65=SR4/UR2).
 *      레어도 C28/U18/R13/SR4/UR2=65 트래커 정확일치(확인됨).
 *  (B) kr-bw6c nameKo null→"BW 확장팩 제6탄 「콜드플레어」"(자기 name 미러). KR=63(JP 65−UR2, UR골드 KR미발매).
 *  (C) KR 발매일: 현재 2012-07-13(=JP, 의심). 리서치 확정 시 KR_DATE 채움(미확정=유지).
 *  ※ 메타 전용이지만 레포 규칙대로 assertWritable 가드. BW6 비보호 통과.
 *  실행: npx tsx scripts/fix-bw6c-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

// 리서치 wf w1rf06kir (high conf, 3중확인): BW6 트윈 KR 발매일 = 2012-12-01
//  pokemoncard.co.kr/card/10(HTTP200 "발매일 2012-12-01") + namu 콜드플레어·프리즈볼트 인포박스([KR]2012-12-01).
//  현재 kr-bw6·kr-bw6c = 2012-07-13(=JP 복붙) → 틀림, UI(DexCatalog/PackGallery)에 KR발매일로 노출되므로 교정.
const KR_DATE: string | null = "2012-12-01";
const KR_SETS = ["kr-bw6c", "kr-bw6"]; // 콜드플레어 + 프리즈볼트(트윈 공통 KR날짜)

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-BW6C", "kr-bw6c"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-bw6c" });

  console.log(`■ Cold Flare(BW6C) 메타 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  // (A) jp-tcg-BW6C cardCount sync
  const jpRows = await prisma.regionCard.count({ where: { setId: "jp-tcg-BW6C" } });
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-BW6C" }, select: { cardCount: true } });
  console.log(`· (A) jp-tcg-BW6C cardCount ${jp?.cardCount} → ${jpRows}`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-BW6C" }, data: { cardCount: jpRows } });

  // (B) kr-bw6c nameKo
  const kr = await prisma.set.findUnique({ where: { id: "kr-bw6c" }, select: { name: true, nameKo: true } });
  const KR_NAMEKO = kr?.name ?? "BW 확장팩 제6탄 「콜드플레어」";
  console.log(`· (B) kr-bw6c nameKo ${kr?.nameKo === null ? "(null)" : `"${kr?.nameKo}"`} → "${KR_NAMEKO}"`);
  if (APPLY) await prisma.set.update({ where: { id: "kr-bw6c" }, data: { nameKo: KR_NAMEKO } });

  // (C) KR date — 트윈 공통(kr-bw6c 콜드플레어 + kr-bw6 프리즈볼트)
  console.log(`· (C) KR date → ${KR_DATE ?? "(유지)"} : ${KR_SETS.join(", ")}`);
  if (APPLY && KR_DATE) {
    for (const id of KR_SETS) {
      await prisma.set.update({ where: { id }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } });
    }
  }

  if (APPLY) {
    const rows = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-BW6C", "jp-tcg-BW6F", "kr-bw6c", "kr-bw6"] } }, select: { id: true, cardCount: true, nameKo: true, releaseDate: true } });
    console.log("\n=== 검증 ===");
    rows.forEach((r) => console.log(`  ${r.id}: cardCount=${r.cardCount}, releaseDate=${r.releaseDate?.toISOString().slice(0,10)}, nameKo=${r.nameKo}`));
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
