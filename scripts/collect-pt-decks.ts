/**
 * Platinum 시대 LV.X 컬렉션팩 3개 수집 — tcgcollector 기반(LEGEND 덱과 동일 파이프라인).
 *   Mewtwo/Regigigas/Shaymin LV.X Collection Pack (전부 신규). DPt 코드, 2009-04-18, series=Platinum.
 *   포켓몬=재판이면 기존 Card 연결(dp5 Majestic Dawn 등, 서브에이전트 이미지검증), LV.X·알트아트·아이템=덱 자체 Card.
 * dry: npx tsx scripts/collect-pt-decks.ts   적용: --apply
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
const all = JSON.parse(readFileSync(`${SC}/all8.json`, "utf8"));
const matches = JSON.parse(readFileSync(`${SC}/matches-pt.json`, "utf8"));
const logosym = JSON.parse(readFileSync(`${SC}/legend8-logosym.json`, "utf8")); // not used for these; logos from grid below

const NEWSETS: Record<string, { setId: string; code: string; cp: string; nameJa: string; rel: string; logo: string }> = {
  "11329": { setId: "jp-tcg-DPtM", code: "DPtM", cp: "og-jp-dptm", nameJa: "ミュウツーLV.X コレクションパック", rel: "2009-04-18", logo: "https://static.tcgcollector.com/content/images/18/ae/54/18ae540d4cf585363da4bfe9beef9b4e6250142efcd8a0ce1f2a8099d0e6afe0.webp" },
  "11330": { setId: "jp-tcg-DPtR", code: "DPtR", cp: "og-jp-dptr", nameJa: "レジギガスLV.X コレクションパック", rel: "2009-04-18", logo: "https://static.tcgcollector.com/content/images/0b/b8/e9/0bb8e9af974bb0c812346df5a7afb5dd9c0f7aabb6c4071cdbe37d55ac129f48.webp" },
  "11324": { setId: "jp-tcg-DPtS", code: "DPtS", cp: "og-jp-dpts", nameJa: "シェイミLV.X コレクションパック", rel: "2009-04-18", logo: "https://static.tcgcollector.com/content/images/f5/a8/e7/f5a8e74279696ea5bb97d5d401ed6e786ad522c74d8e481060035d9bd484a3c8.webp" },
};
const NEW_JP: Record<string, string> = {"Yanmega":"メガヤンマ","Shaymin LV.X":"シェイミLV.X","Pikachu":"ピカチュウ","Raichu":"ライチュウ","Probopass":"ダイノーズ","Time-Space Distortion":"時空のゆがみ","Burmy Sandy Cloak":"ミノムッチ","Buizel":"ブイゼル","Luxray":"レントラー","Pachirisu":"パチリス","Mewtwo LV.X":"ミュウツーLV.X","Riolu":"リオル","Lucario":"ルカリオ","Heatran":"ヒードラン","Shellos East Sea":"カラナクシ","Buneary":"ミミロル","Lopunny":"ミミロップ","Regigigas LV.X":"レジギガスLV.X"};

const baseEn = (n: string) => n.replace(/ LV\.X$/i, "").replace(/ (Sandy Cloak|Plant Cloak|Trash Cloak|East Sea|West Sea)$/i, "").trim();

async function dl(url: string): Promise<Buffer> { const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { encoding: "buffer", maxBuffer: 30 * 1024 * 1024 } as any); const b = stdout as unknown as Buffer; if (b.length < 300) throw new Error("small"); return b; }
async function mirror(url: string, key: string): Promise<string> { const buf = await sharp(await dl(url)).webp({ quality: 92 }).toBuffer(); await uploadBuffer(key, buf, "image/webp"); if (!(await headExists(key))) throw new Error(`verify ${key}`); return r2PublicUrl(key); }

async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY"} collect-pt-decks`);
  const spCache = new Map<string, { id: number; nameJa: string | null } | null>();
  async function species(en: string) { const k = baseEn(en); if (spCache.has(k)) return spCache.get(k)!; const sp = await prisma.species.findFirst({ where: { nameEn: { equals: k, mode: "insensitive" } }, select: { id: true, nameJa: true } }); spCache.set(k, sp); return sp; }

  let setsCreated = 0, rcCreated = 0, cardsCreated = 0;
  for (const tid of Object.keys(matches)) {
    const ns = NEWSETS[tid]; const setId = ns.setId, cp = ns.cp;
    const cards = all[tid].cards; const mset = matches[tid].m;
    console.log(`\n■ ${setId} (${ns.nameJa}) cards=${cards.length}`);
    if (APPLY) {
      await prisma.cardPack.upsert({ where: { id: cp }, update: {}, create: { id: cp, era: "Pt", eraKey: "Pt", nameJa: ns.nameJa, order: 0, releaseDate: new Date(ns.rel) } });
      const logoUrl = await mirror(ns.logo, `set-assets/logo/${setId}.webp`);
      const symUrl = await mirror(ns.logo, `set-assets/symbol/${setId}.webp`);
      await prisma.set.upsert({ where: { id: setId }, update: { logoUrl, symbolUrl: symUrl }, create: { id: setId, name: ns.nameJa, series: "Platinum", region: "JP", packType: "deck", code: ns.code, cardPackId: cp, releaseDate: new Date(ns.rel), cardCount: cards.length, logoUrl, symbolUrl: symUrl } });
      setsCreated++;
    }
    for (const c of cards) {
      const m = mset.find((x: any) => x.num === c.num); if (!m) { console.log(`   ⚠ #${c.num} no match`); continue; }
      const rcId = `${setId}-${c.num}`;
      if (await prisma.regionCard.findUnique({ where: { id: rcId }, select: { id: true } })) { console.log(`   #${c.num} exists — skip`); continue; }
      const isItem = c.name === "Time-Space Distortion";
      const sp = isItem ? null : await species(c.name);
      const jpName = m.action === "link" ? (sp?.nameJa || NEW_JP[c.name] || c.name) : (NEW_JP[c.name] || sp?.nameJa || c.name);
      let cardId: string;
      if (m.action === "link") cardId = m.cardId;
      else {
        cardId = `lc-${setId}-${c.num}`;
        const supertype = sp ? "Pokémon" : (/energy/i.test(c.name) ? "Energy" : "Trainer");
        if (APPLY) {
          await prisma.card.upsert({ where: { id: cardId }, update: {}, create: { id: cardId, supertype, pokedexNumbers: sp ? [sp.id] : [] } });
          if (sp) await prisma.cardSpecies.upsert({ where: { cardId_speciesId: { cardId, speciesId: sp.id } }, update: {}, create: { cardId, speciesId: sp.id } });
        }
        cardsCreated++;
      }
      let imgUrl = ""; if (APPLY && c.img) imgUrl = await mirror(c.img, `${cp}/ja/large/${setId}/${c.num}.webp`);
      if (APPLY) await prisma.regionCard.create({ data: { id: rcId, cardId, language: "ja", region: "JP", setId, number: c.num, name: jpName, imageLarge: imgUrl || null, imageSmall: imgUrl || null } });
      rcCreated++;
      console.log(`   #${c.num} ${(jpName || "").padEnd(14)} ${m.action === "link" ? "→ " + m.cardId.slice(0, 24) : "NEW " + (sp ? "Pokémon" : isItem ? "Trainer" : "?")}`);
    }
    if (APPLY) { const cnt = await prisma.regionCard.count({ where: { setId } }); await prisma.set.update({ where: { id: setId }, data: { cardCount: cnt } }); }
  }
  console.log(`\n${APPLY ? "완료" : "dry"} — sets+${setsCreated} cards(new)+${cardsCreated} regionCards+${rcCreated}`);
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error("FAIL:", e); prisma.$disconnect(); process.exit(1); });
