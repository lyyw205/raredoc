/**
 * [임시·XY] 덱/프로모 정본화 구조: JP Set 13종 + kr-xy30b(이벨타르 덱) + XY KR 프로모 그룹 신설.
 * 실행: npx tsx scripts/tmp-restructure-xy-decks.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const JP_SERIES = "ポケモンカードゲームXY";

const NEW_JP_SETS: { id: string; code: string; name: string; rel: string | null }[] = [
  { id: "jp-tcg-XY0", code: "XY0", name: "XY はじめてセット", rel: "2013-11-08" },
  { id: "jp-tcg-XY30", code: "XY30", name: "ゼルネアスデッキ30", rel: null },
  { id: "jp-tcg-XY30B", code: "XY30B", name: "イベルタルデッキ30", rel: null },
  { id: "jp-tcg-XYA", code: "XYA", name: "メガバトルデッキ60「メガリザードンEX」", rel: null },
  { id: "jp-tcg-XYB", code: "XYB", name: "ハイパーメタルチェーンデッキ60「ディアルガEX+ギルガルドEX」", rel: null },
  { id: "jp-tcg-XYC", code: "XYC", name: "スーパーレジェンドセット60「ゼルネアスEX・イベルタルEX」", rel: null },
  { id: "jp-tcg-XYD", code: "XYD", name: "メガバトルデッキ60「メガレックウザEX」", rel: null },
  { id: "jp-tcg-XYE", code: "XYE", name: "対戦スタートセット30「エンブオーEX VS トゲキッスEX」", rel: null },
  { id: "jp-tcg-RBD", code: "RBD", name: "BREAK進化パック「ライチュウBREAK」", rel: null },
  { id: "jp-tcg-UBD", code: "UBD", name: "BREAK進化パック「オンバーンBREAK」", rel: null },
  { id: "jp-tcg-XYF", code: "XYF", name: "BREAKコンボデッキ60「ゴルダックBREAK+パルキアEX」", rel: null },
  { id: "jp-tcg-XYG", code: "XYG", name: "BREAKパーフェクトバトルデッキ60「ジガルデEX」", rel: null },
  { id: "jp-tcg-XYH", code: "XYH", name: "BREAKメガバトルデッキ60「メガタブンネEX」", rel: null },
];

async function main() {
  console.log(`=== XY 덱/프로모 구조 개편 (${APPLY ? "APPLY" : "dry-run"}) ===`);
  for (const s of NEW_JP_SETS) {
    const ex = await prisma.set.findUnique({ where: { id: s.id } });
    console.log(`[1] ${s.id}: ${ex ? "존재(스킵)" : "생성"}`);
    if (APPLY && !ex) await prisma.set.create({ data: { id: s.id, code: s.code, name: s.name, series: JP_SERIES, region: "JP", releaseDate: new Date(s.rel ?? "1970-01-01"), cardCount: 0, setGroupId: "xy-decks" } });
  }
  // KR 이벨타르 덱
  const exB = await prisma.set.findUnique({ where: { id: "kr-xy30b" } });
  console.log(`[2] kr-xy30b: ${exB ? "존재(스킵)" : "생성"} — XY 「이벨타르 덱」`);
  if (APPLY && !exB) await prisma.set.create({ data: { id: "kr-xy30b", code: "XY30", name: "XY 「이벨타르 덱」", series: "KR", region: "KR", releaseDate: new Date("1970-01-01"), cardCount: 14, setGroupId: "xy-decks" } });
  // XY KR 프로모 그룹+세트
  const exG = await prisma.setGroup.findUnique({ where: { id: "og-kr-xy-promo" } });
  console.log(`[3] SetGroup og-kr-xy-promo: ${exG ? "존재(스킵)" : "생성"}`);
  if (APPLY && !exG) await prisma.setGroup.create({ data: { id: "og-kr-xy-promo", era: "XY", nameKo: "KR XY 프로모", releaseDate: new Date("2013-11-01") } });
  const exP = await prisma.set.findUnique({ where: { id: "kr-xy-p" } });
  console.log(`[4] kr-xy-p: ${exP ? "존재(스킵)" : "생성"} — XY 프로모 (169)`);
  if (APPLY && !exP) await prisma.set.create({ data: { id: "kr-xy-p", code: "XY-P", name: "XY 프로모", series: "KR", region: "KR", releaseDate: new Date("1970-01-01"), cardCount: 169, setGroupId: "og-kr-xy-promo" } });
  console.log(`[5] Group xy-decks: releaseDate → 2013-11-08`);
  if (APPLY) await prisma.setGroup.update({ where: { id: "xy-decks" }, data: { releaseDate: new Date("2013-11-08") } });
  if (!APPLY) console.log("\n(dry-run — --apply)");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
