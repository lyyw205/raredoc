/**
 * XY8 쌍둥이 마무리 — nameKo 스왑교정 + KR발매일. (공식검증 high conf: カイロス#1=青い衝撃Blue, パラス#1=赤い閃光Red.)
 * 카드레벨 페어링은 정상: jp-tcg-XY8a(Blue,カイロス)↔kr-xy8(Blue,쁘사이저) 공유LC, jp-tcg-XY8b(Red,パラス)↔kr-xy8b(Red,파라스) 공유LC.
 * JP명도 정상(XY8a=青い衝撃·XY8b=赤い閃光). ★오직 JP nameKo만 스왑됨 → 교정:
 *   · jp-tcg-XY8a nameKo 붉은섬광(Red,오류)→"XY BREAK 확장팩 제8탄 「푸른 충격」"(Blue, kr-xy8 일치).
 *   · jp-tcg-XY8b nameKo 푸른충격(Blue,오류)→"XY BREAK 확장팩 제8탄 「붉은 섬광」"(Red, kr-xy8b 일치).
 * KR발매일(namu 국기태그 high conf): 양쪽 2015-09-28. ★kr-xy8b 기존 2015-09-26은 JP날짜 오입력→교정.
 * 실행: npx tsx scripts/fix-xy8-finalize.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const JOBS: { id: string; nameKo?: string; date?: string }[] = [
  { id: "jp-tcg-XY8a", nameKo: "XY BREAK 확장팩 제8탄 「푸른 충격」" },
  { id: "jp-tcg-XY8b", nameKo: "XY BREAK 확장팩 제8탄 「붉은 섬광」" },
  { id: "kr-xy8", date: "2015-09-28" },
  { id: "kr-xy8b", date: "2015-09-28" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ XY8 nameKo 스왑 + KR date | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  for (const j of JOBS) {
    const s = await prisma.set.findUnique({ where: { id: j.id }, select: { nameKo: true, releaseDate: true } });
    console.log(`  ${j.id}: ${j.nameKo ? `nameKo "${s?.nameKo}"→"${j.nameKo}"` : ""}${j.date ? `date ${s?.releaseDate?.toISOString().slice(0,10)}→${j.date}` : ""}`);
    if (APPLY) {
      const data: any = {};
      if (j.nameKo) data.nameKo = j.nameKo;
      if (j.date) data.releaseDate = new Date(`${j.date}T00:00:00Z`);
      await prisma.set.update({ where: { id: j.id }, data });
    }
  }
  if (APPLY) {
    console.log("\n=== 검증 ===");
    const rows = await prisma.set.findMany({ where: { id: { in: JOBS.map(j=>j.id) } }, select: { id: true, name: true, nameKo: true, releaseDate: true }, orderBy: { id: "asc" } });
    rows.forEach((s) => console.log(`  ${s.id}: name="${s.name}" nameKo="${s.nameKo}" date=${s.releaseDate?.toISOString().slice(0,10)}`));
  } else console.log("\n(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
