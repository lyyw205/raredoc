import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
const SPIRAL = "BW 확장팩 제8탄 「스파이럴포스」";
const BOLT = "BW 확장팩 제8탄 「볼트너클」";
(async () => {
  const APPLY = process.argv.includes("--apply");
  const jobs = [
    { id: "jp-tcg-BW8S", nameKo: SPIRAL },   // ラセンフォース = Spiral
    { id: "jp-tcg-BW8T", nameKo: BOLT },     // ライデンナックル = Bolt (nameKo였던 스파이럴포스 오염 교정)
    { id: "kr-bw8", nameKo: BOLT },          // kr-bw8 = Bolt twin (LC=BW8T 확인), nameKo 스파이럴포스 오염 교정
  ];
  for (const j of jobs) {
    const s = await prisma.set.findUnique({ where: { id: j.id }, select: { nameKo: true } });
    console.log(`${j.id}: nameKo "${s?.nameKo}" -> "${j.nameKo}" | ${APPLY?"APPLY":"dry"}`);
    if (APPLY) await prisma.set.update({ where: { id: j.id }, data: { nameKo: j.nameKo } });
  }
  if (APPLY) console.log("applied");
  await prisma.$disconnect();
})();
