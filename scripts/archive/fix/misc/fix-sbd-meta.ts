/**
 * SZD = サザンドラデッキ30 (Hydreigon Half Deck, code SBD, BW era, 2012-03-16) 메타 교정 — 카드연결 무관.
 *  (A) jp-tcg-SBD nameKo 오염("BW 「볼트로스 덱」")→ "BW 「삼삼드래 덱 30」"(KR형제명), date 1970→2012-03-16.
 *  (B) kr-sbd nameKo null→"BW 「삼삼드래 덱 30」"(자기 name).
 *  (C) kr-sbd date: 하프덱 트윈 KR 날짜 리서치 확정 시(detailId ST2012=2012).
 *  ※ kr-sbd=15장은 KR 공식정합(KR 카탈로그가 기본에너지 #16-18 미수록; GBR과 동일 패턴, 충돌·누락 아님).
 *  ※ kr-sbd.code="BGR"(이상, kr-gbd와 동일 잘못된 값) — 추측 안 함, 별도 플래그.
 *  실행: npx tsx scripts/fix-sbd-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const JP_DATE = "2012-03-16";
const JP_NAMEKO = "BW 「삼삼드래 덱 30」"; // kr-sbd name 미러
// 리서치 wf wgn6a2qyy (high conf): 하프덱 KR 발매일 = 2012-09-13 (Garchomp·Hydreigon 동시발매 통합제품)
//  pokemoncard.co.kr/card/3 "발매일 2012-09-13" + namu 한카리아스/삼삼드래 인포박스. detailId ST2012005 일치.
const KR_DATE: string | null = "2012-09-13";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-SBD", "kr-sbd"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-sbd" });

  console.log(`■ Hydreigon Half Deck(SBD) 메타 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-SBD" }, select: { nameKo: true, releaseDate: true } });
  console.log(`· (A) jp-tcg-SBD nameKo "${jp?.nameKo}" → "${JP_NAMEKO}" | date ${jp?.releaseDate?.toISOString().slice(0,10)} → ${JP_DATE}`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-SBD" }, data: { nameKo: JP_NAMEKO, releaseDate: new Date(`${JP_DATE}T00:00:00Z`) } });

  const kr = await prisma.set.findUnique({ where: { id: "kr-sbd" }, select: { name: true, nameKo: true } });
  const KR_NAMEKO = kr?.name ?? JP_NAMEKO;
  console.log(`· (B) kr-sbd nameKo ${kr?.nameKo === null ? "(null)" : `"${kr?.nameKo}"`} → "${KR_NAMEKO}"`);
  if (APPLY) await prisma.set.update({ where: { id: "kr-sbd" }, data: { nameKo: KR_NAMEKO } });

  console.log(`· (C) kr-sbd date: ${KR_DATE ? `→ ${KR_DATE}` : "유지(리서치 대기)"}`);
  if (APPLY && KR_DATE) await prisma.set.update({ where: { id: "kr-sbd" }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } });

  if (APPLY) {
    const rows = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-SBD", "kr-sbd"] } }, select: { id: true, cardCount: true, nameKo: true, releaseDate: true } });
    console.log("\n=== 검증 ===");
    rows.forEach((r) => console.log(`  ${r.id}: cardCount=${r.cardCount}, releaseDate=${r.releaseDate?.toISOString().slice(0,10)}, nameKo=${r.nameKo}`));
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
