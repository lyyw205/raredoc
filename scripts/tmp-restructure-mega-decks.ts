/**
 * [임시·MEGA] A안 구조 개편: 스타트덱100 단독 그룹 분리 + JP Set 4개 신설 + 날짜 보정.
 *   1) CardPack mega-start-deck-100 신설 (era=MEGA-SP)
 *   2) kr-mc Set + 소속 LC → 새 그룹 이동 (mega-decks 잔류 = 스타터 2종)
 *   3) JP Set 생성: jp-tcg-MC(951)·jp-tcg-MBD(948)·jp-tcg-MBG(947)·jp-tcg-MA(946)
 *   4) 날짜 보정: KR 1970 플레이스홀더 → 실제 발매일, 그룹 releaseDate = JP 최초 발매일
 * 실행: npx tsx scripts/tmp-restructure-mega-decks.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const JP_SERIES = "ポケモンカードゲーム MEGA";

const NEW_GROUP = {
  id: "mega-start-deck-100",
  era: "MEGA-SP",
  nameKo: "스타트 덱 100 배틀컬렉션",
  nameJa: "スタートデッキ100 バトルコレクション",
  releaseDate: new Date("2025-12-19"),
};

const NEW_JP_SETS = [
  { id: "jp-tcg-MC", code: "MC", name: "スタートデッキ100 バトルコレクション", releaseDate: new Date("2025-12-19"), cardPackId: "mega-start-deck-100", cardCount: 0 },
  { id: "jp-tcg-MBD", code: "MBD", name: "スターターセットMEGA メガディアンシーex", releaseDate: new Date("2025-09-05"), cardPackId: "mega-decks", cardCount: 0 },
  { id: "jp-tcg-MBG", code: "MBG", name: "スターターセットMEGA メガゲンガーex", releaseDate: new Date("2025-09-05"), cardPackId: "mega-decks", cardCount: 0 },
  { id: "jp-tcg-MA", code: "MA", name: "プレミアムトレーナーボックスMEGA", releaseDate: new Date("2025-08-01"), cardPackId: "mega-goods", cardCount: 0 },
];

const KR_DATES: Record<string, string> = {
  "kr-mc": "2026-02-13",
  "kr-mbd": "2025-10-24",
  "kr-mbg": "2025-10-24",
  "kr-ma": "2025-10-24",
};

const GROUP_DATES: Record<string, string> = {
  "mega-decks": "2025-09-05",  // 스타터 2종 JP 발매일
  "mega-goods": "2025-08-01",  // PTB MEGA JP 발매일
};

async function main() {
  console.log(`=== MEGA 구축덱 A안 구조 개편 (${APPLY ? "APPLY" : "dry-run"}) ===`);

  // 1) 새 그룹
  const exists = await prisma.cardPack.findUnique({ where: { id: NEW_GROUP.id } });
  console.log(`[1] CardPack ${NEW_GROUP.id}: ${exists ? "이미 존재(스킵)" : "생성"} — ${NEW_GROUP.nameKo}`);
  if (APPLY && !exists) await prisma.cardPack.create({ data: NEW_GROUP });

  // 2) kr-mc 이동 + LC 이동
  const mcLcs = await prisma.logicalCard.findMany({
    where: { locales: { some: { setId: "kr-mc" } } },
    select: { id: true, cardPackId: true },
  });
  console.log(`[2] kr-mc Set → ${NEW_GROUP.id} 이동, 소속 LC ${mcLcs.length}개 cardPackId 이동`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "kr-mc" }, data: { cardPackId: NEW_GROUP.id } });
    await prisma.logicalCard.updateMany({
      where: { id: { in: mcLcs.map((l) => l.id) } },
      data: { cardPackId: NEW_GROUP.id },
    });
  }

  // 3) JP Set 생성
  for (const s of NEW_JP_SETS) {
    const ex = await prisma.set.findUnique({ where: { id: s.id } });
    console.log(`[3] Set ${s.id} (code=${s.code} → group=${s.cardPackId}): ${ex ? "이미 존재(스킵)" : "생성"} — ${s.name}`);
    if (APPLY && !ex) {
      await prisma.set.create({ data: { ...s, series: JP_SERIES, region: "JP" } });
    }
  }

  // 4) 날짜 보정
  for (const [id, d] of Object.entries(KR_DATES)) {
    const cur = await prisma.set.findUnique({ where: { id }, select: { releaseDate: true } });
    console.log(`[4] Set ${id}: releaseDate ${cur?.releaseDate?.toISOString().slice(0, 10)} → ${d}`);
    if (APPLY) await prisma.set.update({ where: { id }, data: { releaseDate: new Date(d) } });
  }
  for (const [id, d] of Object.entries(GROUP_DATES)) {
    const cur = await prisma.cardPack.findUnique({ where: { id }, select: { releaseDate: true } });
    console.log(`[4] Group ${id}: releaseDate ${cur?.releaseDate?.toISOString().slice(0, 10) ?? "null"} → ${d}`);
    if (APPLY) await prisma.cardPack.update({ where: { id }, data: { releaseDate: new Date(d) } });
  }

  if (!APPLY) console.log("\n(dry-run — --apply 로 실행)");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
