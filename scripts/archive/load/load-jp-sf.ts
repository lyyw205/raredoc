/**
 * SF(プレミアムトレーナーボックス 一撃マスター&連撃マスター, SWSH) 적재 — 자체번호 33장(NAN 없음).
 * 그룹 swsh-goods(비동결), JP/ja 단독, 멱등. ★EN/KR 연결 안 만듦.
 * Run: npx tsx scripts/load-jp-sf.ts [--apply]
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-sf", GROUP = "swsh-goods";
const NAME_JA = "プレミアムトレーナーボックス 一撃マスター&連撃マスター";
const NAME_KO = "프리미엄 트레이너 박스 일격마스터&연격마스터";

type Card = { number: string; numberInt: number | null; name: string; supertype: string | null; imageLarge: string | null };

async function main() {
  assertWritable([GROUP], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "load-jp-sf" });
  const cards = JSON.parse(readFileSync("data/collect/jp-sf.json", "utf8")) as Card[];
  console.log(`${APPLY ? "✅ APPLY" : "🔍 DRY-RUN"} jp-sf — ${cards.length}장 → ${GROUP}/box_set | img ${cards.filter((c) => c.imageLarge).length}`);
  console.log(`   샘플: ${cards.slice(0, 3).map((c) => `${c.number} ${c.name}`).join(" / ")}`);
  if (!APPLY) { console.log("\n적용: --apply"); return; }

  await prisma.set.upsert({
    where: { id: SET },
    create: { id: SET, name: NAME_JA, nameJa: NAME_JA, nameKo: NAME_KO, series: "Sword & Shield",
      releaseDate: new Date("2021-01-22T00:00:00Z"), cardCount: cards.length, region: "JP", code: "SF",
      cardPackId: GROUP, packType: "box_set", titleCleanJa: NAME_JA, titleCleanKo: NAME_KO },
    update: { cardCount: cards.length, code: "SF", cardPackId: GROUP, packType: "box_set", nameJa: NAME_JA, nameKo: NAME_KO, titleCleanJa: NAME_JA, titleCleanKo: NAME_KO },
  });
  for (const c of cards) {
    const cid = `${SET}-${c.number}`;
    await prisma.card.upsert({ where: { id: cid },
      create: { id: cid, cardPackId: GROUP, primarySetId: SET, primaryNumber: String(c.number), primaryNumberInt: c.numberInt, supertype: c.supertype ?? null, pokedexNumbers: [], subtypes: [], types: [], evolvesTo: [], rules: [] },
      update: { supertype: c.supertype ?? null } });
    await prisma.regionCard.upsert({ where: { id: cid },
      create: { id: cid, cardId: cid, language: "ja", region: "JP", setId: SET, number: String(c.number), numberInt: c.numberInt, name: c.name, imageLarge: c.imageLarge, imageSmall: c.imageLarge },
      update: { name: c.name, imageLarge: c.imageLarge, imageSmall: c.imageLarge, numberInt: c.numberInt } });
  }
  const total = await prisma.regionCard.count({ where: { setId: SET } });
  console.log(`   적용완료 → jp-sf 총 ${total}장`);
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); }).finally(() => prisma.$disconnect());
