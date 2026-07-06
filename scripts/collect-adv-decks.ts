/**
 * ADV 시대(루비·사파이어) 덱/킷/기프트박스/프로모 11개 수집 — tcgcollector 기반(PCG 동일 파이프라인).
 *   - 구축스타터덱(키모리/아챠모/미즈고로우/플라이곤/보만다/메타그로스) + 아쿠아/마그마 덱킷 + 기프트박스(라티오스/라티아스) + ADV-P 프로모(63장).
 *   - 포켓몬 재판=기존 Card 연결(이미지검증 1건: GiftBox라티아스#007 Ludicolo→ADV2#20[홀로차이만]).
 *     그 외 덱카드는 덱 전용 프린트(부스터판과 다른 아트)라 전부 신규 Card(서브에이전트 10덱 전수검증).
 *   - 트레이너/에너지=덱 자체 Card. JP명=Species.nameJa(특수명: 팀아쿠아/마그마's·소유자명 오버라이드)·trainer-jp(이미지판독).
 *   - ADV 미잠금 → 매핑가드 불필요. era="ADV (루비·사파이어)"/eraKey=ADV.
 * dry: npx tsx scripts/collect-adv-decks.ts   적용: --apply
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
const enriched = JSON.parse(readFileSync(`${SC}/adv-enriched.json`, "utf8")) as Record<string, any>;
const matches = JSON.parse(readFileSync(`${SC}/matches-adv.json`, "utf8")) as Record<string, Record<string, string>>;
const trainerJp = JSON.parse(readFileSync(`${SC}/adv-trainer-jp.json`, "utf8")) as Record<string, string>;
const specialJp = JSON.parse(readFileSync(`${SC}/adv-special-jp.json`, "utf8")) as Record<string, string>;
const grid = JSON.parse(readFileSync(`${SC}/grid-items.json`, "utf8")) as any[];
const gridById = new Map(grid.map((g) => [g.id, g]));

const NEWSETS: Record<string, { setId: string; code: string; cp: string; nameJa: string; rel: string; pt: string }> = {
  "11262": { setId: "jp-tcg-ADV-P", code: "ADV-P", cp: "og-adv-p", nameJa: "ポケモンカードゲームADV プロモーションカード", rel: "2003-01-01", pt: "promo" },
  "11526": { setId: "jp-tcg-MGcsd", code: "MGcsd", cp: "og-jp-mgcsd", nameJa: "メタグロス 構築スターターデッキ", rel: "2004-01-16", pt: "starter" },
  "11528": { setId: "jp-tcg-GB-Latias", code: "GB-Latias", cp: "og-jp-gblatias", nameJa: "ギフトボックス（ラティアス）", rel: "2003-11-17", pt: "box_set" },
  "11527": { setId: "jp-tcg-GB-Latios", code: "GB-Latios", cp: "og-jp-gblatios", nameJa: "ギフトボックス（ラティオス）", rel: "2003-11-17", pt: "box_set" },
  "11530": { setId: "jp-tcg-AquaDK", code: "AquaDK", cp: "og-jp-aquadk", nameJa: "アクアデッキキット", rel: "2003-10-24", pt: "deck" },
  "11529": { setId: "jp-tcg-MagmaDK", code: "MagmaDK", cp: "og-jp-magmadk", nameJa: "マグマデッキキット", rel: "2003-10-24", pt: "deck" },
  "11524": { setId: "jp-tcg-FLcsd", code: "FLcsd", cp: "og-jp-flcsd", nameJa: "フライゴン 構築スターターデッキ", rel: "2003-06-25", pt: "starter" },
  "11525": { setId: "jp-tcg-SAcsd", code: "SAcsd", cp: "og-jp-sacsd", nameJa: "ボーマンダ 構築スターターデッキ", rel: "2003-06-25", pt: "starter" },
  "11523": { setId: "jp-tcg-MUcsd", code: "MUcsd", cp: "og-jp-mucsd", nameJa: "ミズゴロウ 構築スターターデッキ", rel: "2003-01-31", pt: "starter" },
  "11522": { setId: "jp-tcg-TOcsd", code: "TOcsd", cp: "og-jp-tocsd", nameJa: "アチャモ 構築スターターデッキ", rel: "2003-01-31", pt: "starter" },
  "11521": { setId: "jp-tcg-TRcsd", code: "TRcsd", cp: "og-jp-trcsd", nameJa: "キモリ 構築スターターデッキ", rel: "2003-01-31", pt: "starter" },
};

async function dl(url: string): Promise<Buffer> { const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { encoding: "buffer", maxBuffer: 30 * 1024 * 1024 } as any); const b = stdout as unknown as Buffer; if (b.length < 300) throw new Error("small"); return b; }
async function mirror(url: string, key: string): Promise<string> { const buf = await sharp(await dl(url)).webp({ quality: 92 }).toBuffer(); await uploadBuffer(key, buf, "image/webp"); if (!(await headExists(key))) throw new Error(`verify ${key}`); return r2PublicUrl(key); }

async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY"} collect-adv-decks`);
  const spIds = new Set<number>();
  for (const id in enriched) for (const c of enriched[id].cards) if (c.spId) spIds.add(c.spId);
  const species = await prisma.species.findMany({ where: { id: { in: [...spIds] } }, select: { id: true, nameJa: true } });
  const spJa = new Map(species.map((s) => [s.id, s.nameJa]));

  let setsCreated = 0, rcCreated = 0, cardsCreated = 0, linked = 0, skipped = 0, noImg = 0;
  for (const tid of Object.keys(NEWSETS)) {
    const ns = NEWSETS[tid]; const setId = ns.setId, cp = ns.cp;
    const set = enriched[tid]; if (!set) { console.log(`⚠ ${tid} no data`); continue; }
    const g = gridById.get(tid);
    console.log(`\n■ ${setId} (${ns.nameJa}) cards=${set.cards.length} pt=${ns.pt}`);
    if (APPLY) {
      await prisma.cardPack.upsert({ where: { id: cp }, update: {}, create: { id: cp, era: "ADV (루비·사파이어)", eraKey: "ADV", nameJa: ns.nameJa, order: 0, releaseDate: new Date(ns.rel) } });
      let logoUrl: string | null = null, symUrl: string | null = null;
      if (g?.logo) logoUrl = await mirror(g.logo, `set-assets/logo/${setId}.webp`);
      if (g?.symbol) symUrl = await mirror(g.symbol, `set-assets/symbol/${setId}.webp`);
      await prisma.set.upsert({
        where: { id: setId },
        update: { logoUrl: logoUrl ?? undefined, symbolUrl: symUrl ?? undefined },
        create: { id: setId, name: ns.nameJa, series: "ADV", region: "JP", packType: ns.pt, code: ns.code, cardPackId: cp, releaseDate: new Date(ns.rel), cardCount: set.cards.length, logoUrl, symbolUrl: symUrl },
      });
      setsCreated++;
    }
    const linkMap = matches[tid] || {};
    for (const c of set.cards) {
      const rcId = `${setId}-${c.num}`;
      if (await prisma.regionCard.findUnique({ where: { id: rcId }, select: { id: true } })) { skipped++; continue; }
      const isPoke = c.supertype === "Pokémon";
      let jpName: string;
      if (specialJp[c.name]) jpName = specialJp[c.name];
      else if (isPoke && c.spId && spJa.get(c.spId)) jpName = spJa.get(c.spId)!;
      else if (!isPoke && trainerJp[c.name]) jpName = trainerJp[c.name];
      else jpName = c.name;
      let cardId: string;
      const linkTo = linkMap[c.num];
      if (linkTo && linkTo !== "new") { cardId = linkTo; linked++; }
      else {
        cardId = `lc-${setId}-${c.num}`;
        if (APPLY) {
          await prisma.card.upsert({ where: { id: cardId }, update: {}, create: { id: cardId, supertype: c.supertype, pokedexNumbers: isPoke && c.spId ? [c.spId] : [] } });
          if (isPoke && c.spId) await prisma.cardSpecies.upsert({ where: { cardId_speciesId: { cardId, speciesId: c.spId } }, update: {}, create: { cardId, speciesId: c.spId } });
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
