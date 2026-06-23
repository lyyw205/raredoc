/**
 * JP 3팩 수집분(data/collect/*.json) → DB 적재. JP 지역·일본어 전용(언어격리). 멱등 upsert.
 * 각 카드 = Card(LogicalCard) + RegionCard(CardLocale, region=JP, language=ja). Set 신설.
 * ★EN/KR 연결(logicalCardId 공유) 만들지 않음 — JP 단독 LogicalCard.
 * Run: npx tsx scripts/load-jp-collect-packs.ts            # dry-run
 *      npx tsx scripts/load-jp-collect-packs.ts --apply
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const DIR = "data/collect";

type Card = {
  number: string; numberInt: number | null; name: string;
  language: string; region: string; supertype: string | null;
  imageLarge: string | null; deck?: string | null;
};

type SetDef = {
  id: string; code: string; name: string; nameJa: string; nameKo?: string;
  series: string; releaseDate: string; cardPackId: string | null;
  packType: string; src: { file: string; deck?: string };
};

const SETS: SetDef[] = [
  { id: "jp-svp", code: "SVP", name: "Scarlet & Violet Promotional Cards", nameJa: "プロモカード(SV-P)", nameKo: "SV 프로모(일본판)",
    series: "Scarlet & Violet", releaseDate: "2023-01-20", cardPackId: "og-kr-sv-promo", packType: "promo", src: { file: "jp-svp.json" } },
  { id: "jp-wcs23", code: "WCS23", name: "World Championships 2023 Yokohama", nameJa: "WCS2023 横浜 ピカチュウデッキ",
    series: "Scarlet & Violet", releaseDate: "2023-08-11", cardPackId: null, packType: "deck", src: { file: "jp-wcs23.json" } },
  { id: "jp-clf", code: "CLF", name: "Pokémon Card Game Classic (CLF)", nameJa: "ポケモンカードゲーム Classic 「CLF」",
    series: "Classic", releaseDate: "2023-11-10", cardPackId: null, packType: "deck", src: { file: "jp-classic.json", deck: "clf" } },
  { id: "jp-cll", code: "CLL", name: "Pokémon Card Game Classic (CLL)", nameJa: "ポケモンカードゲーム Classic 「CLL」",
    series: "Classic", releaseDate: "2023-11-10", cardPackId: null, packType: "deck", src: { file: "jp-classic.json", deck: "cll" } },
  { id: "jp-clk", code: "CLK", name: "Pokémon Card Game Classic (CLK)", nameJa: "ポケモンカードゲーム Classic 「CLK」",
    series: "Classic", releaseDate: "2023-11-10", cardPackId: null, packType: "deck", src: { file: "jp-classic.json", deck: "clk" } },
];

const isJa = (s: string) => /[ぁ-ゟァ-ヿ一-鿿]/.test(s);

function loadCards(def: SetDef): Card[] {
  const raw = JSON.parse(readFileSync(`${DIR}/${def.src.file}`, "utf8"));
  const all = (Array.isArray(raw) ? raw : raw.cards ?? []) as Card[]; // svp=array, wcs23/classic={cards:[]}
  return def.src.deck ? all.filter((c) => (c.deck ?? "").toLowerCase() === def.src.deck) : all;
}

// null/빈 번호(기본에너지 등)는 이미지 파일명으로 유니크 키 — id 충돌 방지.
function numKey(c: Card): string {
  if (c.number != null && String(c.number).trim()) return String(c.number).trim();
  return c.imageLarge?.match(/\/([^/]+)\.(?:png|jpe?g|webp)$/i)?.[1] ?? "x";
}

async function main() {
  let totalSets = 0, totalCards = 0, skipped = 0;
  for (const def of SETS) {
    let cards: Card[];
    try { cards = loadCards(def); } catch (e) { console.warn(`⚠ ${def.id}: ${def.src.file} 읽기 실패(${(e as Error).message}) — 스킵`); continue; }
    const bad = cards.filter((c) => !isJa(c.name));
    if (bad.length) console.warn(`  ⚠ ${def.id}: 비일본어 이름 ${bad.length}건 (예: ${bad.slice(0, 3).map((b) => `${b.number}:${b.name}`).join(", ")})`);

    console.log(`\n${APPLY ? "✅" : "🔍"} ${def.id} (${def.code}) — ${cards.length}장 ${def.cardPackId ? `→ group ${def.cardPackId}` : "(기타)"}`);
    console.log(`   샘플: ${cards.slice(0, 3).map((c) => `${c.number} ${c.name}`).join(" / ")}`);
    totalSets++; totalCards += cards.length;

    if (!APPLY) continue;

    await prisma.set.upsert({
      where: { id: def.id },
      create: {
        id: def.id, name: def.name, nameJa: def.nameJa, nameKo: def.nameKo ?? null,
        series: def.series, releaseDate: new Date(def.releaseDate + "T00:00:00Z"),
        cardCount: cards.length, region: "JP", code: def.code, cardPackId: def.cardPackId,
        packType: def.packType, titleCleanJa: def.nameJa,
      },
      update: { cardCount: cards.length, code: def.code, packType: def.packType, cardPackId: def.cardPackId },
    });

    for (const c of cards) {
      const key = numKey(c);
      const cid = `${def.id}-${key}`;
      await prisma.card.upsert({
        where: { id: cid },
        create: {
          id: cid, primarySetId: def.id,
          primaryNumber: key, primaryNumberInt: c.numberInt,
          supertype: c.supertype ?? null,
          pokedexNumbers: [], subtypes: [], types: [], evolvesTo: [], rules: [],
        },
        update: { supertype: c.supertype ?? null },
      });
      await prisma.regionCard.upsert({
        where: { id: cid },
        create: {
          id: cid, cardId: cid, language: "ja", region: "JP", setId: def.id,
          number: key, numberInt: c.numberInt, name: c.name,
          imageLarge: c.imageLarge, imageSmall: c.imageLarge,
        },
        update: { name: c.name, imageLarge: c.imageLarge, imageSmall: c.imageLarge, numberInt: c.numberInt },
      });
    }
  }
  console.log(`\n${APPLY ? "적용완료" : "DRY-RUN"}: ${totalSets} sets / ${totalCards} cards${skipped ? ` / skip ${skipped}` : ""}`);
  if (!APPLY) console.log("적용: npx tsx scripts/load-jp-collect-packs.ts --apply");
}

main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); }).finally(() => prisma.$disconnect());
