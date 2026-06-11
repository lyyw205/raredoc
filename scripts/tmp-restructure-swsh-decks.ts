/**
 * [임시·SWSH] A안 구조 개편: 스타트덱100 단독 그룹 분리 + JP Set 22종 신설 + KR 신설/정정.
 * 실행: npx tsx scripts/tmp-restructure-swsh-decks.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const JP_SERIES = "ポケモンカードゲーム ソード&シールド";

const NEW_GROUPS = [
  { id: "swsh-start-deck-100", era: "S-SP", nameKo: "스타트 덱 100", nameJa: "スタートデッキ100", releaseDate: new Date("2021-12-17") },
];

const NEW_JP_SETS: { id: string; code: string; name: string; rel: string | null; group: string }[] = [
  { id: "jp-tcg-SA", code: "SA", name: "スターターセットV 雷", rel: "2019-11-29", group: "swsh-decks" },
  { id: "jp-tcg-SEF", code: "SEF", name: "スターターセットVMAX フシギバナ", rel: "2020-12-04", group: "swsh-decks" },
  { id: "jp-tcg-SEK", code: "SEK", name: "スターターセットVMAX カメックス", rel: "2020-12-04", group: "swsh-decks" },
  { id: "jp-tcg-SGI", code: "SGI", name: "ハイクラスデッキ「インテレオンVMAX」", rel: "2021-05-28", group: "swsh-decks" },
  { id: "jp-tcg-SGG", code: "SGG", name: "ハイクラスデッキ「ゲンガーVMAX」", rel: "2021-05-28", group: "swsh-decks" },
  { id: "jp-tcg-SD", code: "SD", name: "Vスタートデッキ無色 イーブイ", rel: "2020-07-10", group: "swsh-decks" },
  { id: "jp-tcg-SH", code: "SH", name: "ファミリーポケモンカードゲーム", rel: "2021-07-09", group: "swsh-decks" },
  { id: "jp-tcg-SJ", code: "SJ", name: "スペシャルデッキセット ザシアン・ザマゼンタ vs ムゲンダイナ", rel: "2021-11-05", group: "swsh-decks" },
  { id: "jp-tcg-SLL", code: "SLL", name: "スターターセットVSTAR ルカリオ", rel: "2022-02-25", group: "swsh-decks" },
  { id: "jp-tcg-SLD", code: "SLD", name: "スターターセットVSTAR ダークライ", rel: "2022-02-25", group: "swsh-decks" },
  { id: "jp-tcg-SPZ", code: "SPZ", name: "VSTAR&VMAXハイクラスデッキ ゼラオラ", rel: "2022-07-15", group: "swsh-decks" },
  { id: "jp-tcg-SPD", code: "SPD", name: "VSTAR&VMAXハイクラスデッキ デオキシス", rel: "2022-07-15", group: "swsh-decks" },
  { id: "jp-tcg-SO", code: "SO", name: "スペシャルデッキセット リザードンVSTAR vs レックウザVMAX", rel: "2022-11-04", group: "swsh-decks" },
  { id: "jp-tcg-SI", code: "SI", name: "スタートデッキ100", rel: "2021-12-17", group: "swsh-start-deck-100" },
  { id: "jp-tcg-SN", code: "SN", name: "スタートデッキ100 コロコロコミックver.", rel: "2022-03-15", group: "swsh-start-deck-100" },
  { id: "jp-tcg-SB", code: "SB", name: "プレミアムトレーナーボックス ソード＆シールド", rel: "2019-12-06", group: "swsh-goods" },
  { id: "jp-tcg-SP1", code: "SP1", name: "「ザシアン＋ザマゼンタBOX」", rel: null, group: "swsh-goods" },
  { id: "jp-tcg-SP2", code: "SP2", name: "VMAXスペシャルセット", rel: null, group: "swsh-goods" },
  { id: "jp-tcg-SP3", code: "SP3", name: "ジャンボパックセット 白銀のランス＆漆黒のガイスト", rel: null, group: "swsh-goods" },
  { id: "jp-tcg-SP4", code: "SP4", name: "VMAXスペシャルセット イーブイヒーローズ", rel: null, group: "swsh-goods" },
  { id: "jp-tcg-SP5", code: "SP5", name: "スペシャルカードセット V-UNION", rel: "2021-08-27", group: "swsh-goods" },
  { id: "jp-tcg-SP6", code: "SP6", name: "VSTARスペシャルセット", rel: null, group: "swsh-goods" },
];

// KR 신설 (수집 완료분; SVA 폴더공유 전례 분리)
const NEW_KR_SETS: { id: string; code: string; name: string; rel: string | null; group: string }[] = [
  { id: "kr-seb", code: "SE", name: "소드&실드 스타터 세트 VMAX 「거북왕」", rel: null, group: "swsh-decks" },
  { id: "kr-sgg", code: "SG", name: "소드 & 실드 하이클래스 덱 「팬텀 VMAX」", rel: "2021-07-07", group: "swsh-decks" },
  { id: "kr-sld", code: "SL", name: "소드 & 실드 스타터 세트 VSTAR 「다크라이」", rel: "2022-05-04", group: "swsh-decks" },
  { id: "kr-spz", code: "SP", name: "소드&실드 VSTAR & VMAX 하이클래스 덱 「제라오라」", rel: null, group: "swsh-decks" },
  { id: "kr-spd", code: "SP", name: "소드&실드 VSTAR & VMAX 하이클래스 덱 「테오키스」", rel: null, group: "swsh-decks" },
  { id: "kr-sh", code: "SH", name: "소드&실드 패밀리 포켓몬 카드 게임", rel: null, group: "swsh-decks" },
];

const KR_DATES: Record<string, string> = {
  "kr-sg": "2021-07-07",
  "kr-si": "2022-04-23",
  "kr-sl": "2022-05-04",
};

async function main() {
  console.log(`=== SWSH A안 구조 개편 (${APPLY ? "APPLY" : "dry-run"}) ===`);
  for (const g of NEW_GROUPS) {
    const ex = await prisma.cardPack.findUnique({ where: { id: g.id } });
    console.log(`[1] CardPack ${g.id}: ${ex ? "존재(스킵)" : "생성"} — ${g.nameKo}`);
    if (APPLY && !ex) await prisma.cardPack.create({ data: g });
  }
  for (const [krSet, group] of [["kr-si", "swsh-start-deck-100"], ["kr-sn", "swsh-start-deck-100"]] as const) {
    const lcs = await prisma.logicalCard.findMany({ where: { locales: { some: { setId: krSet } } }, select: { id: true } });
    console.log(`[2] ${krSet} → ${group} (LC ${lcs.length})`);
    if (APPLY) {
      await prisma.set.update({ where: { id: krSet }, data: { cardPackId: group } });
      await prisma.logicalCard.updateMany({ where: { id: { in: lcs.map((l) => l.id) } }, data: { cardPackId: group } });
    }
  }
  for (const s of NEW_JP_SETS) {
    const ex = await prisma.set.findUnique({ where: { id: s.id } });
    console.log(`[3] ${s.id} (${s.code} → ${s.group}): ${ex ? "존재(스킵)" : "생성"}`);
    if (APPLY && !ex) await prisma.set.create({ data: { id: s.id, code: s.code, name: s.name, series: JP_SERIES, region: "JP", releaseDate: new Date(s.rel ?? "1970-01-01"), cardCount: 0, cardPackId: s.group } });
  }
  for (const s of NEW_KR_SETS) {
    const ex = await prisma.set.findUnique({ where: { id: s.id } });
    console.log(`[4] ${s.id} (${s.code} → ${s.group}): ${ex ? "존재(스킵)" : "생성"} — ${s.name}`);
    if (APPLY && !ex) await prisma.set.create({ data: { id: s.id, code: s.code, name: s.name, series: "KR", region: "KR", releaseDate: new Date(s.rel ?? "1970-01-01"), cardCount: 0, cardPackId: s.group } });
  }
  for (const [id, d] of Object.entries(KR_DATES)) {
    console.log(`[5] ${id}: releaseDate → ${d}`);
    if (APPLY) await prisma.set.update({ where: { id }, data: { releaseDate: new Date(d) } });
  }
  // 그룹 날짜: decks=스타터V JP 최초
  if (APPLY) await prisma.cardPack.update({ where: { id: "swsh-decks" }, data: { releaseDate: new Date("2019-11-29") } });
  console.log(`[5] Group swsh-decks: releaseDate → 2019-11-29`);
  if (!APPLY) console.log("\n(dry-run — --apply)");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
