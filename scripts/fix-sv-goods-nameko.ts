/**
 * sv-goods JP 세트 nameKo 일괄 교정 — KR 트윈(같은 code)의 정식 한글 제품명으로 맞춤.
 * 다수 JP goods 세트가 placeholder("...프리미엄 트레이너 박스 ex")를 공유 → KR 트윈 기준 교정.
 * 규칙: JP.nameKo := KR(같은 setGroupId+code).name  (다를 때만). KR 트윈 없으면 스킵.
 * 실행: npx tsx scripts/fix-sv-goods-nameko.ts --apply   (인자로 다른 group 지정 가능: --group=swsh-goods)
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const groupArg = process.argv.find((a) => a.startsWith("--group="));
  const GROUP = groupArg ? groupArg.split("=")[1] : "sv-goods";
  assertWritable([GROUP], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-goods-nameko" });

  const sets = await prisma.set.findMany({ where: { cardPackId: GROUP }, select: { id: true, code: true, region: true, name: true, nameKo: true } });
  const krByCode = new Map<string, { name: string; nameKo: string | null }>();
  for (const s of sets) if (s.region === "KR" && s.code) krByCode.set(s.code, { name: s.name, nameKo: s.nameKo });

  console.log(`■ ${GROUP} nameKo 교정 | ${APPLY ? "★APPLY" : "(dry-run)"} | KR 트윈 ${krByCode.size}개`);
  let planned = 0, skipNoTwin = 0, already = 0;
  for (const s of sets.filter((x) => x.region === "JP")) {
    const twin = s.code ? krByCode.get(s.code) : undefined;
    if (!twin) { console.log(`  - ${s.id} (code=${s.code}) : KR 트윈 없음 → 스킵`); skipNoTwin++; continue; }
    const target = twin.nameKo || twin.name;
    if (s.nameKo === target) { already++; continue; }
    console.log(`  • ${s.id} (code=${s.code})`);
    console.log(`      현재: ${s.nameKo}`);
    console.log(`      교정: ${target}`);
    planned++;
    if (APPLY) { await prisma.set.update({ where: { id: s.id }, data: { nameKo: target } }); console.log(`      ✓ 적용`); }
  }
  console.log(`\n요약: 교정 ${planned} · 이미일치 ${already} · KR트윈없음 ${skipNoTwin}`);
  console.log(APPLY ? "적용 완료" : "(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
