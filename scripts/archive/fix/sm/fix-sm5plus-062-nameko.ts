// #062 ビーストリング 의 nameKo 교정 — 본문 #041 에서 복제했으나 그 base 의 nameKo 가
// (DB 선재 결함) #038 アクアパッチ 와 swap 되어 "아쿠아패치" 로 잘못 들어옴.
// gameCardId gc_c9c982a011bfc25d0335 의 정본 nameKo 는 "비스트링"(jp-tcg-SM9b-52 확인).
// 내가 새로 만든 orphan LC(lc-orphan-jp-tcg-SM5+-062) 만 교정. base 행은 건드리지 않음(범위 밖·동결무관 별도감사).
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const LC = "lc-orphan-jp-tcg-SM5+-062";

async function main() {
  assertWritable(["og-sm5+"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-sm5plus-062-nameko" });
  const before = await prisma.card.findUnique({ where: { id: LC }, select: { nameKo: true, gameCardId: true } });
  console.log(`before: nameKo=${before?.nameKo} gc=${before?.gameCardId}`);
  if (!APPLY) { console.log("(dry-run) → would set nameKo='비스트링'"); await prisma.$disconnect(); return; }
  await prisma.card.update({ where: { id: LC }, data: { nameKo: "비스트링" } });
  const after = await prisma.card.findUnique({ where: { id: LC }, select: { nameKo: true } });
  console.log(`after: nameKo=${after?.nameKo} ✅`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
