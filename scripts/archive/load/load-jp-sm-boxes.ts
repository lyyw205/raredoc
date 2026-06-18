/**
 * SM시대 JP 5팩 적재(워크플로 wrg0zj7va + collect-jp-smp-limitless 산출).
 *   jp-smg(USUM 덱빌드BOX) · jp-smf(USUM 트레이너박스) · jp-smb(SM 트레이너박스, 고유6장)
 *   · jp-smp1(루가루암GX 전력덱, KR=kr-sm60a) → 그룹 sm-decks
 *   jp-smp(SM-P 프로모 405장) → 그룹 og-smp (EN 트윈 en-tcg-smp)
 * JP 지역·일본어 전용. 멱등 upsert. ★EN/KR 연결 안 만듦. assertWritable 가드(sm-decks·og-smp 비동결).
 * Run: npx tsx scripts/load-jp-sm-boxes.ts [--apply] [--only=jp-smp]
 */
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { prisma } from "../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const DIR = "data/collect";

type Card = { number: string; numberInt: number | null; name: string; supertype: string | null; imageLarge: string | null };
type SetDef = { id: string; code: string; nameJa: string; nameKo: string; titleJa: string; titleKo: string;
  releaseDate: string; group: string; packType: string; file: string };

const SETS: SetDef[] = [
  { id: "jp-smg", code: "SMG", nameJa: "ポケモンカードゲーム サン&ムーン デッキビルドBOX「ウルトラサン」「ウルトラムーン」", nameKo: "썬&문 데크 빌드 박스 「울트라썬」「울트라문」",
    titleJa: "デッキビルドBOX「ウルトラサン」「ウルトラムーン」", titleKo: "데크 빌드 박스 「울트라썬」「울트라문」", releaseDate: "2018-02-16", group: "sm-decks", packType: "box_set", file: "jp-smg.json" },
  { id: "jp-smf", code: "SMF", nameJa: "プレミアムトレーナーボックス ウルトラサン&ウルトラムーン", nameKo: "프리미엄 트레이너 박스 울트라썬&울트라문",
    titleJa: "プレミアムトレーナーボックス US&UM", titleKo: "프리미엄 트레이너 박스 US&UM", releaseDate: "2017-12-08", group: "sm-decks", packType: "box_set", file: "jp-smf.json" },
  { id: "jp-smb", code: "SMB", nameJa: "プレミアムトレーナーボックス", nameKo: "프리미엄 트레이너 박스 (썬&문)",
    titleJa: "プレミアムトレーナーボックス", titleKo: "프리미엄 트레이너 박스", releaseDate: "2016-12-09", group: "sm-decks", packType: "box_set", file: "jp-smb.json" },
  { id: "jp-smp1", code: "SMP1", nameJa: "イワンコ 全力デッキ ルガルガンGX", nameKo: "이완코 전력 덱 루가루암GX",
    titleJa: "イワンコ 全力デッキ ルガルガンGX", titleKo: "이완코 전력 덱 루가루암GX", releaseDate: "2016-12-15", group: "sm-decks", packType: "starter", file: "jp-smp1.json" },
  { id: "jp-smp", code: "SMP", nameJa: "サン&ムーン プロモカード (SM-P)", nameKo: "썬&문 프로모카드 (SM-P)",
    titleJa: "プロモカード (SM-P)", titleKo: "프로모카드 (SM-P)", releaseDate: "2016-12-09", group: "og-smp", packType: "promo", file: "jp-smp.json" },
];

const isJa = (s: string) => /[ぁ-ゟァ-ヿ一-鿿]/.test(s);
const idSafe = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, "-");

async function main() {
  const targets = SETS.filter((s) => !ONLY || s.id === ONLY);
  assertWritable([...new Set(targets.map((s) => s.group))], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "load-jp-sm-boxes" });

  let totSets = 0, totCards = 0;
  for (const def of targets) {
    const path = `${DIR}/${def.file}`;
    if (!existsSync(path)) { console.warn(`⚠ ${def.id}: ${def.file} 없음 — 스킵`); continue; }
    const raw = JSON.parse(readFileSync(path, "utf8"));
    const cards = (Array.isArray(raw) ? raw : raw.cards ?? []) as Card[];
    if (!cards.length) { console.warn(`⚠ ${def.id}: 0장 — 스킵`); continue; }
    const bad = cards.filter((c) => !isJa(c.name));
    if (bad.length) console.warn(`  ⚠ ${def.id}: 비일본어 ${bad.length}건 (${bad.slice(0, 2).map((b) => b.name).join(",")})`);
    console.log(`\n${APPLY ? "✅" : "🔍"} ${def.id} (${def.code}) — ${cards.length}장 → ${def.group} (${def.packType}) | img ${cards.filter((c) => c.imageLarge).length}`);
    console.log(`   샘플: ${cards.slice(0, 3).map((c) => `${c.number} ${c.name}`).join(" / ")}`);
    totSets++; totCards += cards.length;
    if (!APPLY) continue;

    await prisma.set.upsert({
      where: { id: def.id },
      create: { id: def.id, name: def.nameJa, nameJa: def.nameJa, nameKo: def.nameKo, series: "Sun & Moon",
        releaseDate: new Date(def.releaseDate + "T00:00:00Z"), cardCount: cards.length, region: "JP", code: def.code,
        cardPackId: def.group, packType: def.packType, titleCleanJa: def.titleJa, titleCleanKo: def.titleKo },
      update: { cardCount: cards.length, code: def.code, cardPackId: def.group, packType: def.packType, nameJa: def.nameJa, nameKo: def.nameKo, titleCleanJa: def.titleJa, titleCleanKo: def.titleKo },
    });
    for (const c of cards) {
      const cid = `${def.id}-${idSafe(String(c.number))}`;
      await prisma.card.upsert({ where: { id: cid },
        create: { id: cid, cardPackId: def.group, primarySetId: def.id, primaryNumber: String(c.number), primaryNumberInt: c.numberInt, supertype: c.supertype ?? null, pokedexNumbers: [], subtypes: [], types: [], evolvesTo: [], rules: [] },
        update: { supertype: c.supertype ?? null } });
      await prisma.regionCard.upsert({ where: { id: cid },
        create: { id: cid, cardId: cid, language: "ja", region: "JP", setId: def.id, number: String(c.number), numberInt: c.numberInt, name: c.name, imageLarge: c.imageLarge, imageSmall: c.imageLarge },
        update: { name: c.name, imageLarge: c.imageLarge, imageSmall: c.imageLarge, numberInt: c.numberInt } });
    }
    console.log(`   적용완료`);
  }
  console.log(`\n${APPLY ? "적용완료" : "DRY-RUN — 적용: --apply"}: ${totSets} sets / ${totCards} cards`);
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); }).finally(() => prisma.$disconnect());
