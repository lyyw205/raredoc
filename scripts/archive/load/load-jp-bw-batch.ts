/**
 * BW시대 7팩 적재(recon wf w5o2eu5wk + collect-jp-limitless 산출).
 *   jp-cs1(컬렉션시트 旅立ちの仲間)·jp-btv(비크티니 배틀테마덱)·jp-hsz(はじめてセット 全国図鑑版)
 *   ·jp-hsp(はじめてセットDX ピカチュウ)·jp-mdb(마스터덱빌드BOX EX)·jp-wak(みんなのWAKUWAKUバトル) → bw-decks
 *   jp-bwp(BW-P 프로모 229장) → og-bwp (EN 트윈 en-tcg-bwp)
 * 무넘버 기본에너지는 제외(고유번호 카드만). BWP 결번 025-031=도호쿠대지진 취소(미발매).
 * JP 지역·일본어 전용. 멱등 upsert. ★EN/KR 연결 안 만듦. og-bwp·bw-decks 비동결(가드 통과).
 * Run: npx tsx scripts/load-jp-bw-batch.ts [--apply] [--only=jp-bwp]
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
  { id: "jp-cs1", code: "CS1", nameJa: "コレクションシート「旅立ちの仲間」", nameKo: "컬렉션 시트 「여행을 떠나는 친구들」",
    titleJa: "コレクションシート「旅立ちの仲間」", titleKo: "컬렉션 시트 「여행을 떠나는 친구들」", releaseDate: "2010-09-18", group: "bw-decks", packType: "promo", file: "jp-cs1.json" },
  { id: "jp-btv", code: "BTV", nameJa: "バトルテーマデッキ ビクティニ", nameKo: "배틀 체인지덱 「비크티니 덱」",
    titleJa: "バトルテーマデッキ ビクティニ", titleKo: "배틀 체인지덱 비크티니", releaseDate: "2011-06-17", group: "bw-decks", packType: "deck", file: "jp-btv.json" },
  { id: "jp-hsz", code: "HSZ", nameJa: "はじめてセット 全国図鑑版", nameKo: "처음 세트 전국도감판",
    titleJa: "はじめてセット 全国図鑑版", titleKo: "처음 세트 전국도감판", releaseDate: "2012-04-20", group: "bw-decks", packType: "starter", file: "jp-hsz.json" },
  { id: "jp-hsp", code: "HSP", nameJa: "はじめてセットDX ピカチュウver.", nameKo: "처음 세트 DX 피카츄 ver.",
    titleJa: "はじめてセットDX ピカチュウver.", titleKo: "처음 세트 DX 피카츄", releaseDate: "2011-11-18", group: "bw-decks", packType: "starter", file: "jp-hsp.json" },
  { id: "jp-mdb", code: "MDB", nameJa: "マスターデッキビルドBOX EX", nameKo: "마스터 덱 빌드 BOX EX",
    titleJa: "マスターデッキビルドBOX EX", titleKo: "마스터 덱 빌드 BOX EX", releaseDate: "2012-09-14", group: "bw-decks", packType: "box_set", file: "jp-mdb.json" },
  { id: "jp-wak", code: "WAK", nameJa: "みんなのWAKUWAKUバトル", nameKo: "모두의 두근두근 배틀",
    titleJa: "みんなのWAKUWAKUバトル", titleKo: "모두의 두근두근 배틀", releaseDate: "2012-11-16", group: "bw-decks", packType: "box_set", file: "jp-wak.json" },
  { id: "jp-bwp", code: "BWP", nameJa: "BW-P プロモカード", nameKo: "BW-P 프로모카드",
    titleJa: "プロモカード (BW-P)", titleKo: "프로모카드 (BW-P)", releaseDate: "2010-09-18", group: "og-bwp", packType: "promo", file: "jp-bwp.json" },
  { id: "jp-hs-plus", code: "HS+", nameJa: "はじめてセット＋", nameKo: "처음 세트 +",
    titleJa: "はじめてセット＋", titleKo: "처음 세트 +", releaseDate: "2011-08-05", group: "bw-decks", packType: "starter", file: "jp-hs-plus.json" },
];

const isJa = (s: string) => /[ぁ-ゟァ-ヿ一-鿿]/.test(s);
const isAllowedNonJa = (s: string) => /^N$/.test(s.trim()); // 서포터 「N」은 정식 카드명
const idSafe = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, "-");

async function main() {
  const targets = SETS.filter((s) => !ONLY || s.id === ONLY);
  assertWritable([...new Set(targets.map((s) => s.group))], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "load-jp-bw-batch" });

  let totSets = 0, totCards = 0;
  for (const def of targets) {
    const path = `${DIR}/${def.file}`;
    if (!existsSync(path)) { console.warn(`⚠ ${def.id}: ${def.file} 없음 — 스킵`); continue; }
    const raw = JSON.parse(readFileSync(path, "utf8"));
    const cards = (Array.isArray(raw) ? raw : raw.cards ?? []) as Card[];
    if (!cards.length) { console.warn(`⚠ ${def.id}: 0장 — 스킵`); continue; }
    const bad = cards.filter((c) => !isJa(c.name) && !isAllowedNonJa(c.name));
    if (bad.length) console.warn(`  ⚠ ${def.id}: 비일본어 ${bad.length}건 (${bad.slice(0, 3).map((b) => b.number + ":" + b.name).join(",")})`);
    console.log(`\n${APPLY ? "✅" : "🔍"} ${def.id} (${def.code}) — ${cards.length}장 → ${def.group} (${def.packType}) | img ${cards.filter((c) => c.imageLarge).length}`);
    console.log(`   샘플: ${cards.slice(0, 3).map((c) => `${c.number} ${c.name}`).join(" / ")}`);
    totSets++; totCards += cards.length;
    if (!APPLY) continue;

    await prisma.set.upsert({
      where: { id: def.id },
      create: { id: def.id, name: def.nameJa, nameJa: def.nameJa, nameKo: def.nameKo, series: "Black & White",
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
