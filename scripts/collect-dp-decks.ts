/**
 * DP 시대 덱/킷 5개 수집 — tcgcollector 합본 세트 기준(LEGEND/Pt 동일 파이프라인).
 *   Heatran vs Regigigas Deck Kit · Magmortar vs Electivire Deck Kit · Dialga&Palkia LV.X CSD ·
 *   Bastiodon&Rampardos CHD · Entry Pack '08. (절반은 합본의 부분뷰라 합본 1세트로 수집.)
 *   포켓몬 재판=기존 Card 연결(서브에이전트 이미지검증), LV.X·CG전용아트·트레이너=덱 자체 Card.
 *   DP는 잠금 아님 → 매핑가드 불필요. dry: npx tsx scripts/collect-dp-decks.ts  적용: --apply
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
const matches = JSON.parse(readFileSync(`${SC}/matches-dp.json`, "utf8"));
const LOGOS = JSON.parse(readFileSync(`${SC}/dp-logos.json`, "utf8"));

const NEWSETS: Record<string, { setId: string; code: string; cp: string; nameJa: string; rel: string }> = {
  "11608": { setId: "jp-tcg-DPhr", code: "DPhr", cp: "og-jp-dphr", nameJa: "ヒードランVSレジギガス デッキキット", rel: "2008-03-14" },
  "11609": { setId: "jp-tcg-DPme", code: "DPme", cp: "og-jp-dpme", nameJa: "ブーバーンVSエレキブル デッキキット", rel: "2007-10-26" },
  "11681": { setId: "jp-tcg-DPcs", code: "DPcs", cp: "og-jp-dpcs", nameJa: "ディアルガ&パルキア LV.X こうちくスタンダードデッキ", rel: "2007-07-05" },
  "11682": { setId: "jp-tcg-DPch", code: "DPch", cp: "og-jp-dpch", nameJa: "トリデプス&ラムパルド こうちくハーフデッキ", rel: "2007-03-02" },
  "11610": { setId: "jp-tcg-DP-EP08", code: "DP-EP08", cp: "og-jp-dp-ep08", nameJa: "エントリーパック'08", rel: "2007-11-30" },
};
const NEW_JP: Record<string, string> = {"Armor Fossil":"たての化石","Bastiodon":"トリデプス","Bebe's Search":"ミズキの検索","Bubble Coat":"バブルコート","Burmy Plant Cloak":"ミノムッチ（くさきのミノ）","Burmy Sandy Cloak":"ミノムッチ（すなちのミノ）","Cranidos":"ズガイドス","Dialga LV.X":"ディアルガLV.X","Double Full Heal":"なんでもなおしW","Dunsparce":"ノコッチ","Energy Restore":"エネルギー再生","Energy Search":"エネルギー転送","Energy Switch":"エネルギーつけかえ","Girafarig":"キリンリキ","Gliscor LV.X":"グライオンLV.X","Magby":"ブビィ","Magmar":"ブーバー","Magmortar":"ブーバーン","Mewtwo LV.X":"ミュウツーLV.X","Mom's Kindness":"ママのきづかい","Night Maintenance":"夜のメンテナンス","Palkia LV.X":"パルキアLV.X","Pichu":"ピチュー","Pikachu":"ピカチュウ","PlusPower":"プラスパワー","Poké Ball":"モンスターボール","Pokédex HANDY910is":"ポケモン図鑑HANDY910is","Potion":"きずぐすり","Professor Oak's Visit":"オーキドはかせの訪問","Professor Rowan":"ナナカマドはかせ","Raichu":"ライチュウ","Rampardos":"ラムパルド","Rival":"ライバル","Shieldon":"タテトプス","Skull Fossil":"ずがいの化石","Super Scoop Up":"スーパーポケモン回収","Switch":"ポケモンいれかえ","Unown M":"アンノーン","Unown T":"アンノーン","Warp Point":"ワープポイント","Wormadam Sandy Cloak":"ミノマダム（すなちのミノ）"};

const baseEn = (n: string) => n.replace(/ LV\.X$/i, "").replace(/ (Sandy Cloak|Plant Cloak|Trash Cloak|East Sea|West Sea)$/i, "").replace(/ [A-Z!?]$/, "").trim();
async function dl(url: string): Promise<Buffer> { const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { encoding: "buffer", maxBuffer: 30 * 1024 * 1024 } as any); const b = stdout as unknown as Buffer; if (b.length < 300) throw new Error("small"); return b; }
async function mirror(url: string, key: string): Promise<string> { const buf = await sharp(await dl(url)).webp({ quality: 92 }).toBuffer(); await uploadBuffer(key, buf, "image/webp"); if (!(await headExists(key))) throw new Error(`verify ${key}`); return r2PublicUrl(key); }

async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY"} collect-dp-decks`);
  const spCache = new Map<string, { id: number; nameJa: string | null } | null>();
  async function species(en: string) { const k = baseEn(en); if (spCache.has(k)) return spCache.get(k)!; const sp = await prisma.species.findFirst({ where: { nameEn: { equals: k, mode: "insensitive" } }, select: { id: true, nameJa: true } }); spCache.set(k, sp); return sp; }
  let setsCreated = 0, rcCreated = 0, cardsCreated = 0;
  for (const tid of Object.keys(matches)) {
    const ns = NEWSETS[tid]; const setId = ns.setId, cp = ns.cp;
    const cards = all[tid].cards; const mset = matches[tid].m;
    console.log(`\n■ ${setId} (${ns.nameJa}) cards=${cards.length}`);
    if (APPLY) {
      await prisma.cardPack.upsert({ where: { id: cp }, update: {}, create: { id: cp, era: "DP", eraKey: "DP", nameJa: ns.nameJa, order: 0, releaseDate: new Date(ns.rel) } });
      const logoUrl = await mirror(LOGOS[tid], `set-assets/logo/${setId}.webp`);
      const symUrl = await mirror(LOGOS[tid], `set-assets/symbol/${setId}.webp`);
      await prisma.set.upsert({ where: { id: setId }, update: { logoUrl, symbolUrl: symUrl }, create: { id: setId, name: ns.nameJa, series: "DP", region: "JP", packType: "deck", code: ns.code, cardPackId: cp, releaseDate: new Date(ns.rel), cardCount: cards.length, logoUrl, symbolUrl: symUrl } });
      setsCreated++;
    }
    for (const c of cards) {
      const m = mset.find((x: any) => x.num === c.num); if (!m) { console.log(`   ⚠ #${c.num} no match`); continue; }
      const rcId = `${setId}-${c.num}`;
      if (await prisma.regionCard.findUnique({ where: { id: rcId }, select: { id: true } })) { console.log(`   #${c.num} exists — skip`); continue; }
      const sp = await species(c.name);
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
      console.log(`   #${c.num} ${(jpName || "").slice(0,16).padEnd(16)} ${m.action === "link" ? "→ " + m.cardId.slice(0, 24) : "NEW " + (sp ? "Pokémon" : "Trainer")}`);
    }
    if (APPLY) { const cnt = await prisma.regionCard.count({ where: { setId } }); await prisma.set.update({ where: { id: setId }, data: { cardCount: cnt } }); }
  }
  console.log(`\n${APPLY ? "완료" : "dry"} — sets+${setsCreated} cards(new)+${cardsCreated} regionCards+${rcCreated}`);
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error("FAIL:", e); prisma.$disconnect(); process.exit(1); });
