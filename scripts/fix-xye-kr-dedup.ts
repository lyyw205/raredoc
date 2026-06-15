/**
 * kr-xye 정확중복행 dedup — 32행 → 26행.
 * #16·18·19·20·21·22 가 각각 2행씩(동일 numberInt·name·cardId=lc-jp-tcg-XYE-NNN). 순수 DB 행 중복(팬텀LC 아님).
 *   같은 cardId라 한 행만 남겨도 LC 보존(공유 lc-jp, 미삭제). numberInt당 1행만 유지(min id keep).
 * 실행: npx tsx scripts/fix-xye-kr-dedup.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const SET = "kr-xye";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const all = await prisma.regionCard.findMany({ where: { setId: SET }, select: { id: true, numberInt: true, name: true, cardId: true }, orderBy: { id: "asc" } });
  const seen = new Map<number, typeof all[0]>();
  const victims: typeof all = [];
  for (const r of all) {
    const k = r.numberInt;
    if (!seen.has(k)) seen.set(k, r);
    else {
      const keep = seen.get(k)!;
      // 안전: 중복은 같은 name·같은 cardId여야(정확중복)
      if (keep.name === r.name && keep.cardId === r.cardId) victims.push(r);
      else { console.log(`  🔴 #${k} 비정확중복(name/cardId 다름) keep=${keep.name}/${keep.cardId} vs ${r.name}/${r.cardId} → 중단`); }
    }
  }
  const bad = all.filter((r) => {
    const k = seen.get(r.numberInt)!;
    return r !== k && !(k.name === r.name && k.cardId === r.cardId);
  });
  console.log(`■ ${SET} 정확중복 dedup | 전체 ${all.length} → ${all.length - victims.length} (victim ${victims.length}) | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  console.log(`  victim: ${victims.map(v=>`#${v.numberInt} ${v.name}`).join(", ")}`);
  if (bad.length) { console.log("  🔴 비정확중복 존재 → 중단"); await prisma.$disconnect(); return; }
  if (!APPLY) { console.log("(dry-run) --apply"); await prisma.$disconnect(); return; }
  const del = await prisma.regionCard.deleteMany({ where: { id: { in: victims.map(v=>v.id) } } });
  const actual = await prisma.regionCard.count({ where: { setId: SET } });
  await prisma.set.update({ where: { id: SET }, data: { cardCount: actual } });
  console.log(`  CardLocale 삭제: ${del.count} (LC는 lc-jp 공유라 미삭제)\n=== 검증 === ${SET} actual=${actual} cardCount=${actual}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
