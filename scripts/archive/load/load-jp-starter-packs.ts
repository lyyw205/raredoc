/**
 * JP 스타터세트 미수집 7종(스타터세트V 闘/炎/草/水 + VMAX 리자몽/오롱털 + SC2) → DB 적재.
 * 전부 swsh-decks 그룹(era S)·packType=starter. JP 지역·일본어 전용. 멱등 upsert.
 * 각 카드 = Card(JP단독 LogicalCard) + RegionCard(region=JP, language=ja). ★EN/KR 연결 안 만듦.
 * Run: npx tsx scripts/load-jp-starter-packs.ts [--apply]
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../../../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const DIR = "data/collect";
const GROUP = "swsh-decks";

type Card = { number: string; numberInt: number | null; name: string; supertype: string | null; imageLarge: string | null };
type SetDef = { id: string; code: string; nameJa: string; nameKo: string; titleJa: string; titleKo: string; releaseDate: string; file: string };

const SETS: SetDef[] = [
  { id: "jp-sa-fighting", code: "SA", nameJa: "スターターセットV 闘", nameKo: "소드&실드 스타터 세트 V 격투", titleJa: "V 闘", titleKo: "V 격투", releaseDate: "2020-01-25", file: "jp-sa-fighting.json" },
  { id: "jp-sa-fire", code: "SA", nameJa: "スターターセットV 炎", nameKo: "소드&실드 스타터 세트 V 불꽃", titleJa: "V 炎", titleKo: "V 불꽃", releaseDate: "2020-01-25", file: "jp-sa-fire.json" },
  { id: "jp-sa-grass", code: "SA", nameJa: "スターターセットV 草", nameKo: "소드&실드 스타터 세트 V 풀", titleJa: "V 草", titleKo: "V 풀", releaseDate: "2020-01-25", file: "jp-sa-grass.json" },
  { id: "jp-sa-water", code: "SA", nameJa: "スターターセットV 水", nameKo: "소드&실드 스타터 세트 V 물", titleJa: "V 水", titleKo: "V 물", releaseDate: "2020-01-25", file: "jp-sa-water.json" },
  { id: "jp-scr", code: "SCr", nameJa: "スターターセットVMAX リザードン", nameKo: "소드&실드 스타터 세트 VMAX 리자몽", titleJa: "VMAX リザードン", titleKo: "VMAX 리자몽", releaseDate: "2020-03-06", file: "jp-scr.json" },
  { id: "jp-scd", code: "SCd", nameJa: "スターターセットVMAX オーロンゲ", nameKo: "소드&실드 스타터 세트 VMAX 오롱털", titleJa: "VMAX オーロンゲ", titleKo: "VMAX 오롱털", releaseDate: "2020-09-18", file: "jp-scd.json" },
  { id: "jp-sc2", code: "SC2", nameJa: "スターターセットVMAX リザードンV", nameKo: "소드&실드 스타터 세트 VMAX 리자몽 V", titleJa: "VMAX リザードンV", titleKo: "VMAX 리자몽 V", releaseDate: "2021-07-09", file: "jp-sc2.json" },
];

const isJa = (s: string) => /[ぁ-ゟァ-ヿ一-鿿]/.test(s);
const numKey = (c: Card) => (c.number != null && String(c.number).trim()) ? String(c.number).trim() : (c.imageLarge?.match(/\/([^/]+)\.(?:png|jpe?g|webp)$/i)?.[1] ?? "x");

async function main() {
  let totSets = 0, totCards = 0;
  for (const def of SETS) {
    let cards: Card[];
    try { const raw = JSON.parse(readFileSync(`${DIR}/${def.file}`, "utf8")); cards = (Array.isArray(raw) ? raw : raw.cards ?? []) as Card[]; }
    catch (e) { console.warn(`⚠ ${def.id}: ${def.file} 읽기실패 — 스킵`); continue; }
    const bad = cards.filter((c) => !isJa(c.name));
    if (bad.length) console.warn(`  ⚠ ${def.id}: 비일본어 ${bad.length}건`);
    console.log(`\n${APPLY ? "✅" : "🔍"} ${def.id} (${def.code}) — ${cards.length}장 → ${GROUP}`);
    console.log(`   샘플: ${cards.slice(0, 3).map((c) => `${c.number} ${c.name}`).join(" / ")}`);
    totSets++; totCards += cards.length;
    if (!APPLY) continue;

    await prisma.set.upsert({
      where: { id: def.id },
      create: { id: def.id, name: def.nameJa, nameJa: def.nameJa, nameKo: def.nameKo, series: "Sword & Shield",
        releaseDate: new Date(def.releaseDate + "T00:00:00Z"), cardCount: cards.length, region: "JP", code: def.code,
        cardPackId: GROUP, packType: "starter", titleCleanJa: def.titleJa, titleCleanKo: def.titleKo },
      update: { cardCount: cards.length, code: def.code, cardPackId: GROUP, packType: "starter", nameJa: def.nameJa, nameKo: def.nameKo, titleCleanJa: def.titleJa, titleCleanKo: def.titleKo },
    });
    for (const c of cards) {
      const cid = `${def.id}-${numKey(c)}`;
      await prisma.card.upsert({ where: { id: cid },
        create: { id: cid, cardPackId: GROUP, primarySetId: def.id, primaryNumber: numKey(c), primaryNumberInt: c.numberInt, supertype: c.supertype ?? null, pokedexNumbers: [], subtypes: [], types: [], evolvesTo: [], rules: [] },
        update: { supertype: c.supertype ?? null } });
      await prisma.regionCard.upsert({ where: { id: cid },
        create: { id: cid, cardId: cid, language: "ja", region: "JP", setId: def.id, number: numKey(c), numberInt: c.numberInt, name: c.name, imageLarge: c.imageLarge, imageSmall: c.imageLarge },
        update: { name: c.name, imageLarge: c.imageLarge, imageSmall: c.imageLarge, numberInt: c.numberInt } });
    }
  }
  console.log(`\n${APPLY ? "적용완료" : "DRY-RUN — 적용: --apply"}: ${totSets} sets / ${totCards} cards`);
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); }).finally(() => prisma.$disconnect());
