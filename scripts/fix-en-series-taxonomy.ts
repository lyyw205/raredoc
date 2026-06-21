/**
 * EN Set.series 를 tcgcollector 시리즈 분류에 맞춤(36건). 메타데이터만(EN/KR 매칭 무관).
 *   Base·Gym→Original · E-Card→e-Card · Legendary Collection · NP(np)→EX ·
 *   EX 트레이너킷→Trainer & Deck Kits · POP→Play! Pokémon · col1→Call of Legends · mcd*→McDonald's.
 *   sidebar era 는 grouped=eraRef 우선(변동없음), ungrouped 은 canonEra(series)로 분류(eras.ts 매핑 동반).
 *
 * 실행: npx tsx scripts/fix-en-series-taxonomy.ts            (dry-run)
 *       npx tsx scripts/fix-en-series-taxonomy.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable } from "./lib/protected-groups";

const CH: { ids: string[]; series: string }[] = [
  { series: "Original", ids: ["en-tcg-base1","en-tcg-base2","en-tcg-basep","en-tcg-base3","en-tcg-base4","en-tcg-base5","en-tcg-gym1","en-tcg-gym2"] },
  { series: "e-Card", ids: ["en-tcg-ecard1","en-tcg-ecard2","en-tcg-ecard3"] },
  { series: "Legendary Collection", ids: ["en-tcg-base6"] },
  { series: "EX", ids: ["np"] },
  { series: "Trainer & Deck Kits", ids: ["tk1a","tk1b","tk2a","tk2b"] },
  { series: "Play! Pokémon", ids: ["pop1","pop2","pop3","pop4","pop5","pop6","pop7","pop8","pop9"] },
  { series: "Call of Legends", ids: ["en-tcg-col1"] },
  { series: "McDonald's", ids: ["mcd11","mcd12","mcd14","mcd15","mcd16","mcd17","mcd18","mcd19","mcd21","mcd22"] },
];

async function main() {
  const apply = process.argv.includes("--apply");
  const allIds = CH.flatMap((c) => c.ids);
  const sets = await prisma.set.findMany({ where: { id: { in: allIds }, region: "EN" }, select: { id: true, name: true, series: true, cardPackId: true } });
  const byId = new Map(sets.map((s) => [s.id, s]));
  assertWritable(sets.map((s) => s.cardPackId), { dryRun: !apply, tool: "fix-en-series-taxonomy" });

  let changed = 0, missing: string[] = [];
  for (const c of CH) for (const id of c.ids) {
    const s = byId.get(id);
    if (!s) { missing.push(id); continue; }
    if (s.series === c.series) continue;
    console.log(`${apply ? "[APPLY]" : "[DRY]"} ${id.padEnd(18)} "${s.name}"  series: ${s.series} → ${c.series}`);
    changed++;
    if (apply) await prisma.set.update({ where: { id }, data: { series: c.series } });
  }
  if (missing.length) console.warn(`⚠ 못 찾은 id: ${missing.join(", ")}`);
  console.log(`\n${apply ? "완료" : "dry-run"} — ${changed}건 변경${apply ? "" : " 예정"}`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
