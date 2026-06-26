import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const tcg: any[] = JSON.parse(readFileSync("tmp/neo2/tcg.json", "utf8"));
  const byNum = new Map(tcg.map((x) => [x.number, x]));
  const db = await prisma.regionCard.findMany({
    where: { setId: "jp-tcg-neo2", region: "JP" },
    select: { number: true, name: true, cardId: true },
    orderBy: { numberInt: "asc" },
  });
  console.log("num | DB-name (species) | tcg-enName");
  for (const r of db) {
    const sp = await prisma.cardSpecies.findMany({ where: { cardId: r.cardId }, select: { species: { select: { nameEn: true } } } });
    const spNames = sp.map((s) => s.species.nameEn).filter(Boolean).join("/");
    const t = byNum.get(r.number);
    const dbn = (r.name || "").slice(0, 22).padEnd(22);
    const spc = (spNames || "—").slice(0, 14).padEnd(14);
    const tcgn = t ? t.enName : "‼ NO_TCG";
    console.log(`#${r.number} | ${dbn} (${spc}) | ${tcgn}`);
  }
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
