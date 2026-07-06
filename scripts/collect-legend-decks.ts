/**
 * LEGEND 시대 덱 8개 수집/채우기 — tcgcollector 카드리스트 기반.
 *   - 신규 6덱(L2-Sh Steelix · Bb/Bm/Bt Battle Starter · E-Sl/E-Sm Expert) 생성 + 카드 + 로고 + 심볼.
 *   - 기존 2덱(L2-Sb Tyranitar · Br Raichu, PROTECTED) 카드 채우기 (--allow-protected).
 *   - 포켓몬=재판이면 기존 Card 에 연결(A 방식, 서브에이전트 이미지 검증), 트레이너/에너지=덱 자체 Card.
 *   - 카드 이미지는 tcgc → R2 미러. JP명=Species.nameJa(포켓몬)/이미지판독맵(트레이너).
 * dry:  npx tsx scripts/collect-legend-decks.ts
 * 적용: npx tsx scripts/collect-legend-decks.ts --apply --allow-protected
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertMappingWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SC = "/tmp/claude-1000/-home-lyyw205-repos-raredoc/60e9a6a7-1ee9-432f-a989-3be3e5e4c704/scratchpad";
const all = JSON.parse(readFileSync(`${SC}/all8.json`, "utf8"));
const matches = JSON.parse(readFileSync(`${SC}/matches.json`, "utf8"));
const logosym = JSON.parse(readFileSync(`${SC}/legend8-logosym.json`, "utf8"));

const NEWSETS: Record<string, { setId: string; code: string; cp: string; nameJa: string; rel: string }> = {
  "11417": { setId: "jp-tcg-L2-Sh", code: "L2-Sh", cp: "og-jp-l2sh", nameJa: "LEGEND構築スタンダードデッキ「ハガネール鋼」", rel: "2010-02-11" },
  "11415": { setId: "jp-tcg-Bb", code: "Bb", cp: "og-jp-bb", nameJa: "バトルスタートデッキ「カメックス」", rel: "2009-11-20" },
  "11414": { setId: "jp-tcg-Bm", code: "Bm", cp: "og-jp-bm", nameJa: "バトルスタートデッキ「ブーバーン」", rel: "2009-11-20" },
  "11413": { setId: "jp-tcg-Bt", code: "Bt", cp: "og-jp-bt", nameJa: "バトルスタートデッキ「ドダイトス」", rel: "2009-11-20" },
  "11620": { setId: "jp-tcg-E-Sl", code: "E-Sl", cp: "og-jp-esl", nameJa: "エキスパートデッキ「リーフィア対メタグロス」(リーフィアデッキ)", rel: "2009-11-20" },
  "11621": { setId: "jp-tcg-E-Sm", code: "E-Sm", cp: "og-jp-esm", nameJa: "エキスパートデッキ「リーフィア対メタグロス」(メタグロスデッキ)", rel: "2009-11-20" },
};
// existing (fill only) — protected
const EXISTING: Record<string, { setId: string; cp: string }> = {
  "11619": { setId: "jp-tcg-L2-Sb", cp: "og-jp-l2sb" },
  "11416": { setId: "jp-tcg-Br", cp: "og-jp-br" },
};
const TRAINER_JP: Record<string, string> = {"Bill":"マサキ","Cheerleader's Cheer":"チアガールの声援","Darkness Energy":"特殊悪エネルギー","Dual Ball":"デュアルボール","Dunsparce":"ノコッチ","Emcee's Chatter":"MCのおしゃべり","Energy Exchanger":"エネルギー交換装置","Energy Returner":"エネルギーリターナー","Engineer's Adjustments":"エンジニアの調整","Good Rod":"いいつりざお","Interviewer's Questions":"インタビュアーの質問","Judge":"ジャッジマン","Life Herb":"ふっかつそう","Metal Energy":"特殊鋼エネルギー","Moomoo Milk":"モーモーミルク","PlusPower":"プラスパワー","Poké Ball":"モンスターボール","Pokémon Circulator":"ポケモンサーキュレーター","Pokémon Collector":"ポケモンコレクター","Pokémon Reversal":"ポケモンリバース","Professor Elm's Training Method":"ウツギはかせの育てかた","Professor Oak's New Theory":"オーキドはかせの新理論","Rainbow Energy":"レインボーエネルギー","Rare Candy":"ふしぎなアメ","Sage's Training":"ぼうずの修行","Super Scoop Up":"スーパーポケモン回収","Switch":"ポケモンいれかえ","Team Rocket's Trickery":"ロケット団の手口"};

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { encoding: "buffer", maxBuffer: 30 * 1024 * 1024 } as any);
  const b = stdout as unknown as Buffer; if (b.length < 300) throw new Error(`small ${b.length}`); return b;
}
async function mirror(url: string, key: string, asWebp = false): Promise<string> {
  let buf = await dl(url);
  if (asWebp) buf = await sharp(buf).webp({ quality: 92 }).toBuffer();
  await uploadBuffer(key, buf, "image/webp");
  if (!(await headExists(key))) throw new Error(`R2 verify fail ${key}`);
  return r2PublicUrl(key);
}

async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY"} collect-legend-decks  allow-protected=${hasAllowProtectedFlag()}`);
  // protected guard for the 2 existing
  assertMappingWritable(["og-jp-l2sb", "og-jp-br"], { regions: ["JP"], allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-legend-decks", what: "LEGEND 덱 카드 채우기(RegionCard/Card 생성)" });

  // species cache
  const spCache = new Map<string, { id: number; nameJa: string | null } | null>();
  async function species(nameEn: string) {
    if (spCache.has(nameEn)) return spCache.get(nameEn)!;
    const sp = await prisma.species.findFirst({ where: { nameEn: { equals: nameEn, mode: "insensitive" } }, select: { id: true, nameJa: true } });
    spCache.set(nameEn, sp); return sp;
  }

  let setsCreated = 0, rcCreated = 0, cardsCreated = 0, skipped = 0;
  for (const tid of Object.keys(matches)) {
    const info = NEWSETS[tid] || EXISTING[tid];
    const isNew = !!NEWSETS[tid];
    const setId = info.setId, cp = (info as any).cp;
    const cards = all[tid].cards;
    const mset = matches[tid].m;
    const ls = logosym[tid];

    // --- Set + CardPack (new only) ---
    if (isNew) {
      const ns = NEWSETS[tid];
      console.log(`\n■ NEW SET ${setId} (${ns.nameJa}) cp=${cp} cards=${cards.length}`);
      if (APPLY) {
        await prisma.cardPack.upsert({ where: { id: cp }, update: {}, create: { id: cp, era: "HGSS", nameJa: ns.nameJa, order: 0, releaseDate: new Date(ns.rel) } });
        const logoUrl = await mirror(ls.logo, `set-assets/logo/${setId}.webp`, true);
        const symUrl = await mirror(ls.symbol, `set-assets/symbol/${setId}.webp`, true);
        await prisma.set.upsert({
          where: { id: setId }, update: { logoUrl, symbolUrl: symUrl },
          create: { id: setId, name: ns.nameJa, series: "LEGEND", region: "JP", packType: "deck", code: ns.code, cardPackId: cp, releaseDate: new Date(ns.rel), cardCount: cards.length, logoUrl, symbolUrl: symUrl },
        });
        setsCreated++;
      }
    } else {
      console.log(`\n■ FILL SET ${setId} (PROTECTED) cards=${cards.length}`);
    }

    // --- cards ---
    for (const c of cards) {
      const m = mset.find((x: any) => x.num === c.num);
      if (!m) { console.log(`   ⚠ #${c.num} no match entry — skip`); continue; }
      const rcId = `${setId}-${c.num}`;
      const exists = await prisma.regionCard.findUnique({ where: { id: rcId }, select: { id: true } });
      if (exists) { skipped++; continue; }
      const sp = await species(c.name);
      const jpName = sp?.nameJa || TRAINER_JP[c.name] || c.name;
      let cardId: string;
      if (m.action === "link") {
        cardId = m.cardId;
      } else {
        cardId = `lc-${setId}-${c.num}`;
        const supertype = sp ? "Pokémon" : (/energy/i.test(c.name) ? "Energy" : "Trainer");
        if (APPLY) {
          await prisma.card.upsert({ where: { id: cardId }, update: {}, create: { id: cardId, supertype, pokedexNumbers: sp ? [sp.id] : [] } });
          if (sp) await prisma.cardSpecies.upsert({ where: { cardId_speciesId: { cardId, speciesId: sp.id } }, update: {}, create: { cardId, speciesId: sp.id } });
        }
        cardsCreated++;
      }
      // image mirror
      let imgUrl = "";
      if (APPLY && c.img) imgUrl = await mirror(c.img, `${cp}/ja/large/${setId}/${c.num}.webp`, true);
      if (APPLY) {
        await prisma.regionCard.create({ data: { id: rcId, cardId, language: "ja", region: "JP", setId, number: c.num, name: jpName, imageLarge: imgUrl || null, imageSmall: imgUrl || null } });
      }
      rcCreated++;
      console.log(`   #${c.num} ${(jpName||"").padEnd(14)} ${m.action==="link"?"→ "+m.cardId.slice(0,22):"NEW "+(sp?"Pokémon":/energy/i.test(c.name)?"Energy":"Trainer")}`);
    }
    // update cardCount
    if (APPLY) {
      const cnt = await prisma.regionCard.count({ where: { setId } });
      await prisma.set.update({ where: { id: setId }, data: { cardCount: cnt } });
    }
  }
  console.log(`\n${APPLY ? "완료" : "dry"} — sets+${setsCreated} cards(new)+${cardsCreated} regionCards+${rcCreated} skipped(exists)=${skipped}`);
  if (!APPLY) console.log("적용: --apply --allow-protected");
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error("FAIL:", e); prisma.$disconnect(); process.exit(1); });
