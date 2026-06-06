/**
 * [임시·SM] 구축덱/프로모 정본화 구조: JP Set 11종 신설 + 날짜 보정. (대형 분리 없음 — SM30A는 중형)
 * 실행: npx tsx scripts/tmp-restructure-sm-decks.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const JP_SERIES = "ポケモンカードゲーム サン&ムーン";

const NEW_JP_SETS: { id: string; code: string; name: string; rel: string | null }[] = [
  { id: "jp-tcg-SMA", code: "SMA", name: "スターターセット ジュナイパーGX・ガオガエンGX・アシレーヌGX", rel: "2016-12-09" },
  { id: "jp-tcg-SMC", code: "SMC", name: "スターターセット改造「カプ・ブルルGX」", rel: null },
  { id: "jp-tcg-SMD", code: "SMD", name: "30枚デッキ対戦セット「サトシVSロケット団」", rel: "2017-04-21" },
  { id: "jp-tcg-SME", code: "SME", name: "スターターセット伝説「ソルガレオGX ルナアーラGX」", rel: null },
  { id: "jp-tcg-SMI", code: "SMI", name: "スターターセット 炎のブースターGX・水のシャワーズGX・雷のサンダースGX", rel: "2018-11-23" },
  { id: "jp-tcg-SMK", code: "SMK", name: "トレーナーバトルデッキ タケシのイワーク・カスミのスターミー", rel: null },
  { id: "jp-tcg-SML", code: "SML", name: "ファミリーポケモンカードゲーム", rel: null },
  { id: "jp-tcg-SMM", code: "SMM", name: "スターターセット TAG TEAM GX エーフィ&デオキシスGX・ブラッキー&ダークライGX", rel: "2019-05-31" },
  { id: "jp-tcg-SMN", code: "SMN", name: "デッキビルドBOX「TAG TEAM GX」", rel: null },
  { id: "jp-tcg-SMNP", code: "SMNP", name: "プレミアムトレーナーボックス TAG TEAM GX", rel: null },
  { id: "jp-tcg-SM30A", code: "SM30A", name: "GXスタートデッキ", rel: "2018-07-13" },
];

const KR_DATES: Record<string, string> = {};

async function main() {
  console.log(`=== SM 구조 개편 (${APPLY ? "APPLY" : "dry-run"}) ===`);
  for (const s of NEW_JP_SETS) {
    const ex = await prisma.set.findUnique({ where: { id: s.id } });
    console.log(`[1] ${s.id}: ${ex ? "존재(스킵)" : "생성"} — ${s.name}`);
    if (APPLY && !ex) await prisma.set.create({ data: { id: s.id, code: s.code, name: s.name, series: JP_SERIES, region: "JP", releaseDate: new Date(s.rel ?? "1970-01-01"), cardCount: 0, setGroupId: "sm-decks" } });
  }
  console.log(`[2] Group sm-decks: releaseDate → 2016-12-09`);
  if (APPLY) await prisma.setGroup.update({ where: { id: "sm-decks" }, data: { releaseDate: new Date("2016-12-09") } });
  if (!APPLY) console.log("\n(dry-run — --apply)");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
