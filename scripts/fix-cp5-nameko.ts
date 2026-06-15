/**
 * CP5(幻・伝説ドリームキラコレクション) JP nameKo 교정 — "냉혹한 반역자"(타 세트명 오입력) → KR세트명 일치.
 *   kr-cp5 name="XY BREAK 확장팩 「환상 전설 드림 컬렉션」" 에 맞춤.
 * ※ 레어도(C/U/R vs 무) 판정·KR발매일은 공식검증 후 별도. 실행: npx tsx scripts/fix-cp5-nameko.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const TO = "XY BREAK 확장팩 「환상 전설 드림 컬렉션」";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-CP5" }, select: { nameKo: true } });
  console.log(`■ CP5 nameKo "${s?.nameKo}" → "${TO}" | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  if (s && s.nameKo !== TO) {
    if (APPLY) { await prisma.set.update({ where: { id: "jp-tcg-CP5" }, data: { nameKo: TO } }); console.log("✅ 적용"); }
    else console.log("(dry-run) --apply");
  } else console.log("= 이미 동일/없음");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
