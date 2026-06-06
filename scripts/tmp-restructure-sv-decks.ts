/**
 * [임시·SV] A안 구조 개편: 대형 랜덤 2종 단독 그룹 분리 + JP Set 19개 신설 + KR 분리/날짜 보정.
 *   1) SetGroup 신설: sv-ex-start-deck(SVD 147) · sv-start-deck-generations(SVM 183)
 *   2) kr-svd/kr-svm Set+LC → 새 그룹 이동
 *   3) JP Set 생성 (pg 발굴분 19개; SVLN/SVLS/SVK 는 기존)
 *   4) KR Set 신설: kr-sval(뜨아거&전룡 — SVA 폴더 공유 분리)
 *   5) 날짜 보정 (Bulbapedia 검증분만; KR 미상은 유지 → 후속 namu 백필)
 * 실행: npx tsx scripts/tmp-restructure-sv-decks.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const JP_SERIES = "ポケモンカードゲーム スカーレット&バイオレット";

const NEW_GROUPS = [
  { id: "sv-ex-start-deck", era: "SV-SP", nameKo: "ex 스타트 덱", nameJa: "exスタートデッキ", releaseDate: new Date("2023-07-07") },
  { id: "sv-start-deck-generations", era: "SV-SP", nameKo: "랜덤 스타트 덱 Generations", nameJa: "スタートデッキ Generations", releaseDate: new Date("2024-11-22") },
];

// pg 발굴(2026-06-06) + Bulbapedia 발매일 검증분
const NEW_JP_SETS: { id: string; code: string; name: string; rel: string; group: string }[] = [
  { id: "jp-tcg-SVAM", code: "SVAM", name: "スターターセットex ニャオハ＆ルカリオex", rel: "2023-01-20", group: "sv-decks" },
  { id: "jp-tcg-SVAL", code: "SVAL", name: "スターターセットex ホゲータ＆デンリュウex", rel: "2023-01-20", group: "sv-decks" },
  { id: "jp-tcg-SVAW", code: "SVAW", name: "スターターセットex クワッス＆ミミッキュex", rel: "2023-01-20", group: "sv-decks" },
  { id: "jp-tcg-SVC", code: "SVC", name: "スターターセットex ピカチュウex&パーモット", rel: "2023-03-24", group: "sv-decks" },
  { id: "jp-tcg-SVD", code: "SVD", name: "exスタートデッキ", rel: "2023-07-07", group: "sv-ex-start-deck" },
  { id: "jp-tcg-SVEM", code: "SVEM", name: "スターターセット テラスタル ミュウツーex", rel: "2023-09-22", group: "sv-decks" },
  { id: "jp-tcg-SVEL", code: "SVEL", name: "スターターセット テラスタル ラウドボーンex", rel: "2023-09-22", group: "sv-decks" },
  { id: "jp-tcg-SVG", code: "SVG", name: "スペシャルデッキセットex フシギバナ・リザードン・カメックス", rel: "2023-11-10", group: "sv-decks" },
  { id: "jp-tcg-SVHK", code: "SVHK", name: "スターターデッキ＆ビルドセット「古代のコライドンex」", rel: "2024-01-26", group: "sv-decks" },
  { id: "jp-tcg-SVHM", code: "SVHM", name: "スターターデッキ＆ビルドセット「未来のミライドンex」", rel: "2024-01-26", group: "sv-decks" },
  { id: "jp-tcg-SVJL", code: "SVJL", name: "バトルマスターデッキ テラスタル リザードンex", rel: "2024-05-17", group: "sv-decks" },
  { id: "jp-tcg-SVJP", code: "SVJP", name: "バトルマスターデッキ パオジアンex", rel: "2024-05-17", group: "sv-decks" },
  { id: "jp-tcg-SVM", code: "SVM", name: "スタートデッキ Generations", rel: "2024-11-22", group: "sv-start-deck-generations" },
  { id: "jp-tcg-SVOM", code: "SVOM", name: "スターターセットex マリィのモルペコ＆オーロンゲex", rel: "2025-02-21", group: "sv-decks" },
  { id: "jp-tcg-SVOD", code: "SVOD", name: "スターターセットex ダイゴのダンバル＆メタグロスex", rel: "2025-02-21", group: "sv-decks" },
  { id: "jp-tcg-SVB", code: "SVB", name: "プレミアムトレーナーボックスex", rel: "2023-01-20", group: "sv-goods" },
  { id: "jp-tcg-SVP1", code: "SVP1", name: "exスペシャルセット", rel: "2023-05-19", group: "sv-goods" },
  { id: "jp-tcg-SVF", code: "SVF", name: "デッキビルドBOX 黒炎の支配者", rel: "2023-07-28", group: "sv-goods" },
  { id: "jp-tcg-SVN", code: "SVN", name: "デッキビルドBOX「バトルパートナーズ」", rel: "2025-01-24", group: "sv-goods" },
];

// KR 신설: SVA 폴더 공유 분리분 (수집 kr-official-sval.json, 21/021+에너지2)
const NEW_KR_SETS = [
  { id: "kr-sval", code: "SVA", name: "스칼렛&바이올렛 스타터 세트 ex 「뜨아거&전룡 ex」", rel: "2023-02-28", group: "sv-decks", series: "KR" },
];

// 검증된 KR 발매일만 보정 (미상은 유지)
const KR_DATES: Record<string, string> = {
  "kr-sva": "2023-02-28",
  "kr-svc": "2023-04-22",
  "kr-svd": "2023-09-08",
  "kr-svg": "2023-12-13",
  "kr-svhk": "2024-02-24",
  "kr-svhm": "2024-02-24",
  "kr-svb": "2023-04-21",
  "kr-svp1": "2023-07-07",
};

const GROUP_DATES: Record<string, string> = {
  "sv-decks": "2023-01-20", // 스타터ex 3종 JP 발매일
  "sv-goods": "2023-01-20", // PTBex JP 발매일
};

async function main() {
  console.log(`=== SV 구축덱 A안 구조 개편 (${APPLY ? "APPLY" : "dry-run"}) ===`);

  for (const g of NEW_GROUPS) {
    const ex = await prisma.setGroup.findUnique({ where: { id: g.id } });
    console.log(`[1] SetGroup ${g.id}: ${ex ? "이미 존재(스킵)" : "생성"} — ${g.nameKo}`);
    if (APPLY && !ex) await prisma.setGroup.create({ data: g });
  }

  for (const [krSet, group] of [["kr-svd", "sv-ex-start-deck"], ["kr-svm", "sv-start-deck-generations"]] as const) {
    const lcs = await prisma.logicalCard.findMany({ where: { locales: { some: { setId: krSet } } }, select: { id: true } });
    console.log(`[2] ${krSet} Set → ${group} 이동, 소속 LC ${lcs.length}개 이동`);
    if (APPLY) {
      await prisma.set.update({ where: { id: krSet }, data: { setGroupId: group } });
      await prisma.logicalCard.updateMany({ where: { id: { in: lcs.map((l) => l.id) } }, data: { setGroupId: group } });
    }
  }

  for (const s of NEW_JP_SETS) {
    const ex = await prisma.set.findUnique({ where: { id: s.id } });
    console.log(`[3] Set ${s.id} (code=${s.code} → ${s.group}): ${ex ? "이미 존재(스킵)" : "생성"} — ${s.name}`);
    if (APPLY && !ex) await prisma.set.create({ data: { id: s.id, code: s.code, name: s.name, series: JP_SERIES, region: "JP", releaseDate: new Date(s.rel), cardCount: 0, setGroupId: s.group } });
  }

  for (const s of NEW_KR_SETS) {
    const ex = await prisma.set.findUnique({ where: { id: s.id } });
    console.log(`[4] Set ${s.id} (code=${s.code} → ${s.group}): ${ex ? "이미 존재(스킵)" : "생성"} — ${s.name}`);
    if (APPLY && !ex) await prisma.set.create({ data: { id: s.id, code: s.code, name: s.name, series: s.series, region: "KR", releaseDate: new Date(s.rel), cardCount: 0, setGroupId: s.group } });
  }

  for (const [id, d] of Object.entries(KR_DATES)) {
    const cur = await prisma.set.findUnique({ where: { id }, select: { releaseDate: true } });
    if (!cur) { console.log(`[5] Set ${id}: 없음 — 스킵`); continue; }
    console.log(`[5] Set ${id}: releaseDate ${cur.releaseDate?.toISOString().slice(0, 10)} → ${d}`);
    if (APPLY) await prisma.set.update({ where: { id }, data: { releaseDate: new Date(d) } });
  }
  for (const [id, d] of Object.entries(GROUP_DATES)) {
    const cur = await prisma.setGroup.findUnique({ where: { id }, select: { releaseDate: true } });
    console.log(`[5] Group ${id}: releaseDate ${cur?.releaseDate?.toISOString().slice(0, 10) ?? "null"} → ${d}`);
    if (APPLY) await prisma.setGroup.update({ where: { id }, data: { releaseDate: new Date(d) } });
  }

  if (!APPLY) console.log("\n(dry-run — --apply 로 실행)");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
