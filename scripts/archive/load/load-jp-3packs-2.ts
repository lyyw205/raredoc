/**
 * JP 미수집 3팩(SK VSTAR프리박스 · S-P SWSH프로모 · S8a-P 25th프로모) → DB 적재.
 * JP 지역·일본어 전용. 멱등 upsert. 각 카드 = Card(JP단독) + RegionCard(JP/ja). ★EN/KR 연결 안 만듦.
 * 붙는 그룹(swsh-goods/og-kr-swsh-promo/og-s8a) 전부 비동결 확인됨.
 * Run: npx tsx scripts/load-jp-3packs-2.ts [--apply]
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../../../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const DIR = "data/collect";

type Card = { number: string; numberInt: number | null; name: string; supertype: string | null; imageLarge: string | null };
type SetDef = { id: string; code: string; nameJa: string; nameKo: string; titleJa: string; titleKo: string;
  series: string; releaseDate: string; group: string; packType: string; file: string };

const SETS: SetDef[] = [
  { id: "jp-sk", code: "SK", nameJa: "VSTAR プレミアムトレーナーボックス", nameKo: "소드&실드 VSTAR 프리미엄 트레이너 박스", titleJa: "VSTAR プレミアムトレーナーボックス", titleKo: "VSTAR 프리미엄 트레이너 박스",
    series: "Sword & Shield", releaseDate: "2022-12-02", group: "swsh-goods", packType: "box_set", file: "jp-sk.json" },
  { id: "jp-s-p", code: "S-P", nameJa: "ソード&シールド プロモカード", nameKo: "소드&실드 프로모", titleJa: "プロモカード", titleKo: "프로모",
    series: "Sword & Shield", releaseDate: "2019-12-06", group: "og-kr-swsh-promo", packType: "promo", file: "jp-s-p.json" },
  { id: "jp-s8a-p", code: "S8a-P", nameJa: "プロモカードパック 25th ANNIVERSARY edition", nameKo: "25th ANNIVERSARY 프로모 카드팩", titleJa: "25th ANNIVERSARY プロモ", titleKo: "25th ANNIVERSARY 프로모",
    series: "Sword & Shield", releaseDate: "2021-10-22", group: "og-s8a", packType: "promo", file: "jp-s8a-p.json" },
];

const isJa = (s: string) => /[ぁ-ゟァ-ヿ一-鿿]/.test(s);
const numKey = (c: Card) => (c.number != null && String(c.number).trim()) ? String(c.number).trim() : (c.imageLarge?.match(/\/([^/]+)\.(?:png|jpe?g|webp)$/i)?.[1] ?? "x");
const idSafe = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, "-"); // "001/025" → "001-025"

async function main() {
  let totSets = 0, totCards = 0;
  for (const def of SETS) {
    let cards: Card[];
    try { const raw = JSON.parse(readFileSync(`${DIR}/${def.file}`, "utf8")); cards = (Array.isArray(raw) ? raw : raw.cards ?? []) as Card[]; }
    catch { console.warn(`⚠ ${def.id}: ${def.file} 읽기실패 — 스킵`); continue; }
    const bad = cards.filter((c) => !isJa(c.name));
    if (bad.length) console.warn(`  ⚠ ${def.id}: 비일본어 ${bad.length}건 (${bad.slice(0, 2).map((b) => b.name).join(",")})`);
    console.log(`\n${APPLY ? "✅" : "🔍"} ${def.id} (${def.code}) — ${cards.length}장 → ${def.group} (${def.packType})`);
    console.log(`   샘플: ${cards.slice(0, 3).map((c) => `${c.number} ${c.name}`).join(" / ")}`);
    totSets++; totCards += cards.length;
    if (!APPLY) continue;

    await prisma.set.upsert({
      where: { id: def.id },
      create: { id: def.id, name: def.nameJa, nameJa: def.nameJa, nameKo: def.nameKo, series: def.series,
        releaseDate: new Date(def.releaseDate + "T00:00:00Z"), cardCount: cards.length, region: "JP", code: def.code,
        cardPackId: def.group, packType: def.packType, titleCleanJa: def.titleJa, titleCleanKo: def.titleKo },
      update: { cardCount: cards.length, code: def.code, cardPackId: def.group, packType: def.packType, nameJa: def.nameJa, nameKo: def.nameKo, titleCleanJa: def.titleJa, titleCleanKo: def.titleKo },
    });
    for (const c of cards) {
      const k = numKey(c);
      const cid = `${def.id}-${idSafe(k)}`;
      await prisma.card.upsert({ where: { id: cid },
        create: { id: cid, cardPackId: def.group, primarySetId: def.id, primaryNumber: k, primaryNumberInt: c.numberInt, supertype: c.supertype ?? null, pokedexNumbers: [], subtypes: [], types: [], evolvesTo: [], rules: [] },
        update: { supertype: c.supertype ?? null } });
      await prisma.regionCard.upsert({ where: { id: cid },
        create: { id: cid, cardId: cid, language: "ja", region: "JP", setId: def.id, number: k, numberInt: c.numberInt, name: c.name, imageLarge: c.imageLarge, imageSmall: c.imageLarge },
        update: { name: c.name, imageLarge: c.imageLarge, imageSmall: c.imageLarge, numberInt: c.numberInt } });
    }
  }
  console.log(`\n${APPLY ? "적용완료" : "DRY-RUN — 적용: --apply"}: ${totSets} sets / ${totCards} cards`);
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); }).finally(() => prisma.$disconnect());
