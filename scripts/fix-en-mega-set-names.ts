/**
 * 신규 EN 세트 en-tcg-mee / en-tcg-mep 이름·발매일 정정 — 레포 명명 관례 일치.
 *   - en-tcg-mee: "Mega Evolution Energy" → "Mega Evolution Energies" (cf. sve="Scarlet & Violet Energies")
 *   - en-tcg-mep: "MEP Black Star Promos" → "Mega Evolution Black Star Promos"
 *                  (cf. en-tcg-smp="SM Black Star Promos", en-tcg-swshp="SWSH Black Star Promos")
 *   - releaseDate 를 외부 카탈로그 기준으로: MEE 2025-09-26, MEP 2025-09-13.
 *   둘 다 EN 단독 신규 세트(grp=null, 비동결).
 *
 * 실행: npx tsx scripts/fix-en-mega-set-names.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable } from "./lib/protected-groups";

const FIX = [
  { id: "en-tcg-mee", name: "Mega Evolution Energies",        rel: "2025-09-26" },
  { id: "en-tcg-mep", name: "Mega Evolution Black Star Promos", rel: "2025-09-13" },
];

async function main() {
  const apply = process.argv.includes("--apply");
  const sets = await prisma.set.findMany({ where: { id: { in: FIX.map((f) => f.id) } }, select: { id: true, name: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { dryRun: !apply, tool: "fix-en-mega-set-names" });
  for (const f of FIX) {
    const cur = sets.find((s) => s.id === f.id);
    if (!cur) { console.warn(`⚠ ${f.id} 없음 — skip`); continue; }
    console.log(`${apply ? "[APPLY]" : "[DRY]"} ${f.id}: "${cur.name}" → "${f.name}", rel→${f.rel}`);
    if (apply) await prisma.set.update({ where: { id: f.id }, data: { name: f.name, releaseDate: new Date(f.rel + "T00:00:00Z") } });
  }
  console.log(apply ? "✅ 완료" : "(dry-run — --apply 로 적용)");
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
