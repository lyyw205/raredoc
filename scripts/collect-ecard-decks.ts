/**
 * e-Card(ポケモンカードe) 시대 2개 수집 — tcgcollector 기반(PCG/ADV 동일 파이프라인).
 *   - Pokémon-e Starter Deck(29장, 전부 덱 전용 아트=신규) + P Promos(Pカード 47장, source identity=신규).
 *   - 재판 매칭: starter 24장 전수 이미지검증 → 매칭 0(전부 덱 전용 프린트). 링크 없음.
 *   - 트레이너/에너지=덱 자체 Card. JP명=Species.nameJa(특수: Rocket's=ロケット団の)·trainer-jp(이미지판독).
 *   - e-Card 미잠금 → 매핑가드 불필요. era="e카드"/eraKey="e-Card".
 * dry: npx tsx scripts/collect-ecard-decks.ts   적용: --apply
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SC = "/tmp/claude-1000/-home-lyyw205-repos-raredoc/60e9a6a7-1ee9-432f-a989-3be3e5e4c704/scratchpad";
const enriched = JSON.parse(readFileSync(`${SC}/ecard-enriched.json`, "utf8")) as Record<string, any>;
const matches = JSON.parse(readFileSync(`${SC}/matches-ecard.json`, "utf8")) as Record<string, Record<string, string>>;
const trainerJp = JSON.parse(readFileSync(`${SC}/ecard-trainer-jp.json`, "utf8")) as Record<string, string>;
const specialJp = JSON.parse(readFileSync(`${SC}/ecard-special-jp.json`, "utf8")) as Record<string, string>;
const grid = JSON.parse(readFileSync(`${SC}/grid-items.json`, "utf8")) as any[];
const gridById = new Map(grid.map((g) => [g.id, g]));
// force-Pokémon overrides (name → speciesId) for odd cards classified as Trainer
const POKE_OVERRIDE: Record<string, number> = { "Pichu Bros.": 172 };

const NEWSETS: Record<string, { setId: string; code: string; cp: string; nameJa: string; rel: string; pt: string; series: string }> = {
  "11198": { setId: "jp-tcg-P-P", code: "P", cp: "og-p-p", nameJa: "Pプロモーションカード", rel: "2001-07-01", pt: "promo", series: "P" },
  "11520": { setId: "jp-tcg-PMe-SD", code: "PMe-SD", cp: "og-jp-pmesd", nameJa: "ポケモンカードe スターターデッキ", rel: "2001-12-01", pt: "starter", series: "ポケモンカードe" },
};

async function dl(url: string): Promise<Buffer> { const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { encoding: "buffer", maxBuffer: 30 * 1024 * 1024 } as any); const b = stdout as unknown as Buffer; if (b.length < 300) throw new Error("small"); return b; }
async function mirror(url: string, key: string): Promise<string> { const buf = await sharp(await dl(url)).webp({ quality: 92 }).toBuffer(); await uploadBuffer(key, buf, "image/webp"); if (!(await headExists(key))) throw new Error(`verify ${key}`); return r2PublicUrl(key); }

async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY"} collect-ecard-decks`);
  const spIds = new Set<number>();
  for (const id in enriched) for (const c of enriched[id].cards) { if (c.spId) spIds.add(c.spId); if (POKE_OVERRIDE[c.name]) spIds.add(POKE_OVERRIDE[c.name]); }
  const species = await prisma.species.findMany({ where: { id: { in: [...spIds] } }, select: { id: true, nameJa: true } });
  const spJa = new Map(species.map((s) => [s.id, s.nameJa]));

  let setsCreated = 0, rcCreated = 0, cardsCreated = 0, linked = 0, skipped = 0, noImg = 0;
  for (const tid of Object.keys(NEWSETS)) {
    const ns = NEWSETS[tid]; const setId = ns.setId, cp = ns.cp;
    const set = enriched[tid]; if (!set) { console.log(`⚠ ${tid} no data`); continue; }
    const g = gridById.get(tid);
    console.log(`\n■ ${setId} (${ns.nameJa}) cards=${set.cards.length} pt=${ns.pt}`);
    if (APPLY) {
      await prisma.cardPack.upsert({ where: { id: cp }, update: {}, create: { id: cp, era: "e카드", eraKey: "e-Card", nameJa: ns.nameJa, order: 0, releaseDate: new Date(ns.rel) } });
      let logoUrl: string | null = null, symUrl: string | null = null;
      if (g?.logo) logoUrl = await mirror(g.logo, `set-assets/logo/${setId}.webp`);
      if (g?.symbol) symUrl = await mirror(g.symbol, `set-assets/symbol/${setId}.webp`);
      await prisma.set.upsert({ where: { id: setId }, update: { logoUrl: logoUrl ?? undefined, symbolUrl: symUrl ?? undefined }, create: { id: setId, name: ns.nameJa, series: ns.series, region: "JP", packType: ns.pt, code: ns.code, cardPackId: cp, releaseDate: new Date(ns.rel), cardCount: set.cards.length, logoUrl, symbolUrl: symUrl } });
      setsCreated++;
    }
    const linkMap = matches[tid] || {};
    for (const c of set.cards) {
      const rcId = `${setId}-${c.num}`;
      if (await prisma.regionCard.findUnique({ where: { id: rcId }, select: { id: true } })) { skipped++; continue; }
      const ovSp = POKE_OVERRIDE[c.name];
      const spId: number | null = c.spId ?? ovSp ?? null;
      const isPoke = c.supertype === "Pokémon" || ovSp != null;
      let jpName: string;
      if (specialJp[c.name]) jpName = specialJp[c.name];
      else if (isPoke && spId && spJa.get(spId)) jpName = spJa.get(spId)!;
      else if (!isPoke && trainerJp[c.name]) jpName = trainerJp[c.name];
      else if (trainerJp[c.name]) jpName = trainerJp[c.name];
      else jpName = c.name;
      let cardId: string;
      const linkTo = linkMap[c.num];
      if (linkTo && linkTo !== "new") { cardId = linkTo; linked++; }
      else {
        cardId = `lc-${setId}-${c.num}`;
        const supertype = isPoke ? "Pokémon" : (/energy/i.test(c.name) ? "Energy" : "Trainer");
        if (APPLY) {
          await prisma.card.upsert({ where: { id: cardId }, update: {}, create: { id: cardId, supertype, pokedexNumbers: isPoke && spId ? [spId] : [] } });
          if (isPoke && spId) await prisma.cardSpecies.upsert({ where: { cardId_speciesId: { cardId, speciesId: spId } }, update: {}, create: { cardId, speciesId: spId } });
        }
        cardsCreated++;
      }
      let imgUrl: string | null = null;
      if (APPLY && c.img) { try { imgUrl = await mirror(c.img, `${cp}/ja/large/${setId}/${c.num}.webp`); } catch (e) { console.log(`   img fail #${c.num}: ${(e as Error).message}`); } }
      if (!c.img) noImg++;
      if (APPLY) await prisma.regionCard.create({ data: { id: rcId, cardId, language: "ja", region: "JP", setId, number: c.num, name: jpName, imageLarge: imgUrl, imageSmall: imgUrl } });
      rcCreated++;
    }
    if (APPLY) { const cnt = await prisma.regionCard.count({ where: { setId } }); await prisma.set.update({ where: { id: setId }, data: { cardCount: cnt } }); }
    console.log(`   done`);
  }
  console.log(`\n${APPLY ? "완료" : "dry"} — sets+${setsCreated} newCards+${cardsCreated} linked=${linked} regionCards+${rcCreated} skipped=${skipped} noImg=${noImg}`);
  if (!APPLY) console.log("적용: --apply");
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error("FAIL:", e); prisma.$disconnect(); process.exit(1); });
