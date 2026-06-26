import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const tcg: any[] = JSON.parse(readFileSync("tmp/neo1/tcg.json", "utf8"));
  const byNum = new Map(tcg.map((x) => [x.number, x]));
  const db = await prisma.regionCard.findMany({
    where: { setId: "jp-tcg-neo1", region: "JP" },
    select: { number: true, name: true, cardId: true },
    orderBy: { numberInt: "asc" },
  });
  console.log("DB JP cards:", db.length, "| tcg:", tcg.length);
  console.log("DB nulls?:", db.filter((r) => !r.cardId).length);
  let match = 0, noDex = 0;
  const mism: any[] = [];
  for (const r of db) {
    const t = byNum.get(r.number);
    const sp = await prisma.cardSpecies.findMany({ where: { cardId: r.cardId }, select: { species: { select: { nameEn: true } } } });
    const spNames = sp.map((s) => s.species.nameEn?.toLowerCase()).filter(Boolean) as string[];
    if (!t) { mism.push({ n: r.number, db: r.name, reason: "NO_TCG" }); continue; }
    const en = (t.enName || "").toLowerCase().replace(/&#0?39;/g, "'");
    if (spNames.length === 0) { noDex++; continue; }
    const ok = spNames.some((s) => en.includes(s) || s.includes(en));
    if (ok) match++;
    else mism.push({ n: r.number, db: r.name, tcg: t.enName, sp: spNames.join("/") });
  }
  console.log("species-match=" + match + " noDex(trainer/energy)=" + noDex + " mismatch/notcg=" + mism.length);
  for (const m of mism) console.log("  #" + m.n, JSON.stringify(m));
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
