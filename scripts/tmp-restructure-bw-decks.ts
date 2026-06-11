/**
 * [임시·BW] 덱/프로모 정본화 구조: JP Set 17종 + KR 신설 3종(BGR 폴더 공유 분리) + BW KR 프로모 그룹.
 * 실행: npx tsx scripts/tmp-restructure-bw-decks.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const JP_SERIES = "ポケモンカードゲームBW";

const NEW_JP_SETS: { id: string; code: string; name: string; rel: string | null }[] = [
  { id: "jp-tcg-BWFS", code: "FS", name: "BW はじめてセット", rel: "2010-10-29" },
  { id: "jp-tcg-BGV", code: "BG", name: "バトル強化デッキ ビリジオン", rel: null },
  { id: "jp-tcg-BGT", code: "BG", name: "バトル強化デッキ テラキオン", rel: null },
  { id: "jp-tcg-BGC", code: "BG", name: "バトル強化デッキ コバルオン", rel: null },
  { id: "jp-tcg-BGREX", code: "BGR", name: "バトル強化デッキ60「レシラムEX」", rel: null },
  { id: "jp-tcg-BGZ2", code: "BGZ", name: "バトル強化デッキ60「ゼクロムEX」", rel: null },
  { id: "jp-tcg-TD2", code: "TD", name: "バトルギフトセット「ボルトロスVSトルネロス」（トルネロスデッキ）", rel: null },
  { id: "jp-tcg-BD2", code: "BD", name: "バトルギフトセット「ボルトロスVSトルネロス」（ボルトロスデッキ）", rel: null },
  { id: "jp-tcg-SBD", code: "SBD", name: "サザンドラデッキ30", rel: null },
  { id: "jp-tcg-GBD", code: "GBD", name: "ガブリアスデッキ30", rel: null },
  { id: "jp-tcg-KD2", code: "KD", name: "バトル強化デッキ30「ケルディオ」", rel: null },
  { id: "jp-tcg-PD2", code: "PD", name: "プラズマ団パワードデッキ30", rel: null },
  { id: "jp-tcg-BGB2", code: "BGB", name: "バトル強化デッキ60「ブラックキュレムEX」", rel: null },
  { id: "jp-tcg-BGW2", code: "BGW", name: "バトル強化デッキ60「ホワイトキュレムEX」", rel: null },
  { id: "jp-tcg-PSS2", code: "PSS", name: "プラズマ団バトルギフトセット", rel: null },
  { id: "jp-tcg-GK", code: "G+K", name: "最強爆流コンボデッキ60「カメックス＋キュレムEX」", rel: null },
  { id: "jp-tcg-MG", code: "MG", name: "30枚デッキ対戦set「ミュウツーVSゲノセクト」", rel: null },
];

const NEW_KR_SETS = [
  { id: "kr-gbd", code: "BGR", name: "BW 「한카리아스 덱 30」", group: "bw-decks" },
  { id: "kr-sbd", code: "BGR", name: "BW 「삼삼드래 덱 30」", group: "bw-decks" },
  { id: "kr-bgrex", code: "BGR", name: "BW 「배틀 강화 60장 덱 - 레시라무 EX」", group: "bw-decks" },
];

async function main() {
  console.log(`=== BW 덱/프로모 구조 개편 (${APPLY ? "APPLY" : "dry-run"}) ===`);
  for (const s of NEW_JP_SETS) {
    const ex = await prisma.set.findUnique({ where: { id: s.id } });
    console.log(`[1] ${s.id}: ${ex ? "존재(스킵)" : "생성"}`);
    if (APPLY && !ex) await prisma.set.create({ data: { id: s.id, code: s.code, name: s.name, series: JP_SERIES, region: "JP", releaseDate: new Date(s.rel ?? "1970-01-01"), cardCount: 0, cardPackId: "bw-decks" } });
  }
  for (const s of NEW_KR_SETS) {
    const ex = await prisma.set.findUnique({ where: { id: s.id } });
    console.log(`[2] ${s.id}: ${ex ? "존재(스킵)" : "생성"} — ${s.name}`);
    if (APPLY && !ex) await prisma.set.create({ data: { id: s.id, code: s.code, name: s.name, series: "KR", region: "KR", releaseDate: new Date("1970-01-01"), cardCount: 0, cardPackId: s.group } });
  }
  const exG = await prisma.cardPack.findUnique({ where: { id: "og-kr-bw-promo" } });
  console.log(`[3] CardPack og-kr-bw-promo: ${exG ? "존재(스킵)" : "생성"}`);
  if (APPLY && !exG) await prisma.cardPack.create({ data: { id: "og-kr-bw-promo", era: "BW", nameKo: "KR BW 프로모", releaseDate: new Date("2011-01-01") } });
  const exP = await prisma.set.findUnique({ where: { id: "kr-bw-p" } });
  console.log(`[4] kr-bw-p: ${exP ? "존재(스킵)" : "생성"}`);
  if (APPLY && !exP) await prisma.set.create({ data: { id: "kr-bw-p", code: "PROMO", name: "BW 프로모", series: "KR", region: "KR", releaseDate: new Date("1970-01-01"), cardCount: 0, cardPackId: "og-kr-bw-promo" } });
  console.log(`[5] Group bw-decks: releaseDate → 2010-10-29`);
  if (APPLY) await prisma.cardPack.update({ where: { id: "bw-decks" }, data: { releaseDate: new Date("2010-10-29") } });
  if (!APPLY) console.log("\n(dry-run — --apply)");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
