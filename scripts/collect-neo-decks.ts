/**
 * NEO + ORIGINAL(구판) 시대 12개 수집 — tcgcollector 기반(PCG/ADV/e-Card 동일 파이프라인).
 *   NEO: イントロパックネオ(チコリータ/ワニノコ).
 *   구판: イントロパック(フシギダネ/ゼニガメ) · 6시티 짐덱(ニビ/ハナダ/タマムシ/クチバ/グレン/ヤマブキ) · クイックスターターギフト(赤/緑).
 *   ★빈티지 컴파일레이션 제품 — 카드가 출처세트(Expansion Pack=PMCG1·Leaders' Stadium=PMCG5 등)로 라벨됨.
 *     포켓몬 재판=기존 Card 연결(이미지검증 25건, 전수 자가검증: 인트로팩→PMCG1/web1/neo2-3, 일러동일·JP/EN차이만).
 *     짐덱 짐리더 포켓몬(タケシの 등)은 후보(PMCG5/6 갭)에 없어 전부 신규. 트레이너/에너지=덱 자체 Card.
 *   - 제품별 순차번호 1-N(DOM순, tcgc 카탈로그번호는 출처충돌로 비사용). JP명=특수(짐리더's)·Species.nameJa·trainer-jp(판독).
 *   - 구판/네오 미잠금 → 매핑가드 불필요. POKE_OVERRIDE: Nidoran♀♂/Pichu Bros 강제 포켓몬.
 * dry: npx tsx scripts/collect-neo-decks.ts   적용: --apply
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
const enriched = JSON.parse(readFileSync(`${SC}/neo-enriched.json`, "utf8")) as Record<string, any>;
const matches = JSON.parse(readFileSync(`${SC}/matches-neo.json`, "utf8")) as Record<string, Record<string, string>>;
const trainerJp = JSON.parse(readFileSync(`${SC}/neo-trainer-jp.json`, "utf8")) as Record<string, string>;
const specialJp = JSON.parse(readFileSync(`${SC}/neo-special-jp.json`, "utf8")) as Record<string, string>;
const grid = JSON.parse(readFileSync(`${SC}/grid-items.json`, "utf8")) as any[];
const gridById = new Map(grid.map((g) => [g.id, g]));
const POKE_OVERRIDE: Record<string, number> = { "Nidoran ♀": 29, "Nidoran ♂": 32, "Pichu Bros.": 172 };

type NS = { setId: string; code: string; cp: string; nameJa: string; rel: string; pt: string; era: string; eraKey: string; series: string };
const NEWSETS: Record<string, NS> = {
  "11333": { setId: "jp-tcg-IPN-C", code: "IPN-C", cp: "og-jp-ipnc", nameJa: "イントロパックネオ（チコリータ）", rel: "2001-04-06", pt: "starter", era: "네오", eraKey: "NEO", series: "ネオ" },
  "11334": { setId: "jp-tcg-IPN-T", code: "IPN-T", cp: "og-jp-ipnt", nameJa: "イントロパックネオ（ワニノコ）", rel: "2001-04-06", pt: "starter", era: "네오", eraKey: "NEO", series: "ネオ" },
  "11331": { setId: "jp-tcg-IP-B", code: "IP-B", cp: "og-jp-ipb", nameJa: "イントロパック（フシギダネ）", rel: "1999-07-30", pt: "starter", era: "구판", eraKey: "BASE", series: "ポケットモンスターカードゲーム" },
  "11332": { setId: "jp-tcg-IP-S", code: "IP-S", cp: "og-jp-ips", nameJa: "イントロパック（ゼニガメ）", rel: "1999-07-30", pt: "starter", era: "구판", eraKey: "BASE", series: "ポケットモンスターカードゲーム" },
  "12115": { setId: "jp-tcg-GymN", code: "GymN", cp: "og-jp-gymn", nameJa: "ニビシティジムデッキ", rel: "1998-04-26", pt: "deck", era: "구판", eraKey: "BASE", series: "ポケットモンスターカードゲーム" },
  "12116": { setId: "jp-tcg-GymH", code: "GymH", cp: "og-jp-gymh", nameJa: "ハナダシティジムデッキ", rel: "1998-04-26", pt: "deck", era: "구판", eraKey: "BASE", series: "ポケットモンスターカードゲーム" },
  "12117": { setId: "jp-tcg-GymT", code: "GymT", cp: "og-jp-gymt", nameJa: "タマムシシティジムデッキ", rel: "1998-07-25", pt: "deck", era: "구판", eraKey: "BASE", series: "ポケットモンスターカードゲーム" },
  "12118": { setId: "jp-tcg-GymK", code: "GymK", cp: "og-jp-gymk", nameJa: "クチバシティジムデッキ", rel: "1998-07-25", pt: "deck", era: "구판", eraKey: "BASE", series: "ポケットモンスターカードゲーム" },
  "12119": { setId: "jp-tcg-GymG", code: "GymG", cp: "og-jp-gymg", nameJa: "グレンタウンジムデッキ", rel: "1999-02-26", pt: "deck", era: "구판", eraKey: "BASE", series: "ポケットモンスターカードゲーム" },
  "12120": { setId: "jp-tcg-GymY", code: "GymY", cp: "og-jp-gymy", nameJa: "ヤマブキシティジムデッキ", rel: "1999-02-26", pt: "deck", era: "구판", eraKey: "BASE", series: "ポケットモンスターカードゲーム" },
  "12123": { setId: "jp-tcg-QSGS-R", code: "QSGS-R", cp: "og-jp-qsgsr", nameJa: "クイックスターターギフト（赤）", rel: "1998-12-04", pt: "box_set", era: "구판", eraKey: "BASE", series: "ポケットモンスターカードゲーム" },
  "12124": { setId: "jp-tcg-QSGS-G", code: "QSGS-G", cp: "og-jp-qsgsg", nameJa: "クイックスターターギフト（緑）", rel: "1998-12-04", pt: "box_set", era: "구판", eraKey: "BASE", series: "ポケットモンスターカードゲーム" },
};

async function dl(url: string): Promise<Buffer> { const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { encoding: "buffer", maxBuffer: 30 * 1024 * 1024 } as any); const b = stdout as unknown as Buffer; if (b.length < 300) throw new Error("small"); return b; }
async function mirror(url: string, key: string): Promise<string> { const buf = await sharp(await dl(url)).webp({ quality: 92 }).toBuffer(); await uploadBuffer(key, buf, "image/webp"); if (!(await headExists(key))) throw new Error(`verify ${key}`); return r2PublicUrl(key); }

async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY"} collect-neo-decks`);
  const spIds = new Set<number>();
  for (const id in enriched) for (const c of enriched[id].cards) { if (c.spId) spIds.add(c.spId); if (POKE_OVERRIDE[c.name]) spIds.add(POKE_OVERRIDE[c.name]); }
  const species = await prisma.species.findMany({ where: { id: { in: [...spIds] } }, select: { id: true, nameJa: true } });
  const spJa = new Map(species.map((s) => [s.id, s.nameJa]));

  let setsCreated = 0, rcCreated = 0, cardsCreated = 0, linked = 0, skipped = 0, noImg = 0;
  for (const tid of Object.keys(NEWSETS)) {
    const ns = NEWSETS[tid]; const setId = ns.setId, cp = ns.cp;
    const set = enriched[tid]; if (!set) { console.log(`⚠ ${tid} no data`); continue; }
    const g = gridById.get(tid);
    console.log(`\n■ ${setId} (${ns.nameJa}) cards=${set.cards.length} pt=${ns.pt} era=${ns.era}`);
    if (APPLY) {
      await prisma.cardPack.upsert({ where: { id: cp }, update: {}, create: { id: cp, era: ns.era, eraKey: ns.eraKey, nameJa: ns.nameJa, order: 0, releaseDate: new Date(ns.rel) } });
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
    console.log(`   done (linked so far=${linked})`);
  }
  console.log(`\n${APPLY ? "완료" : "dry"} — sets+${setsCreated} newCards+${cardsCreated} linked=${linked} regionCards+${rcCreated} skipped=${skipped} noImg=${noImg}`);
  if (!APPLY) console.log("적용: --apply");
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error("FAIL:", e); prisma.$disconnect(); process.exit(1); });
