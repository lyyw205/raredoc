/**
 * jp-s-p(SWSH JP 프로모) 보강 — Limitless 미보유 발매분 38장(번호 60~350 중 결번, 이름확보·이미지null).
 * 미발매(194-207/222/233)·비존재(351-360)는 제외(완전 발매수=334). 멱등 upsert + cardCount 재계산.
 * Run: npx tsx scripts/load-jp-s-p-supplement.ts [--apply]
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../../../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const SET = "jp-s-p";

type Card = { number: string; numberInt: number | null; name: string; supertype: string | null; imageLarge: string | null };

async function main() {
  const raw = JSON.parse(readFileSync("data/collect/jp-s-p-supplement.json", "utf8"));
  const cards = (Array.isArray(raw) ? raw : raw.cards ?? []) as Card[];
  const bad = cards.filter((c) => !/[ぁ-ゟァ-ヿ一-鿿]/.test(c.name));
  console.log(`${APPLY ? "✅ APPLY" : "🔍 DRY-RUN"} jp-s-p 보강 ${cards.length}장 (비일본어 ${bad.length}, 이미지 ${cards.filter((c) => c.imageLarge).length})`);
  console.log(`  샘플: ${cards.slice(0, 3).map((c) => `${c.number} ${c.name}`).join(" / ")} … ${cards.slice(-1).map((c) => `${c.number} ${c.name}`)}`);

  if (APPLY) {
    for (const c of cards) {
      const cid = `${SET}-${String(c.number).replace(/[^A-Za-z0-9._-]/g, "-")}`;
      await prisma.card.upsert({ where: { id: cid },
        create: { id: cid, cardPackId: "og-kr-swsh-promo", primarySetId: SET, primaryNumber: c.number, primaryNumberInt: c.numberInt, supertype: c.supertype ?? null, pokedexNumbers: [], subtypes: [], types: [], evolvesTo: [], rules: [] },
        update: { supertype: c.supertype ?? null } });
      await prisma.regionCard.upsert({ where: { id: cid },
        create: { id: cid, cardId: cid, language: "ja", region: "JP", setId: SET, number: c.number, numberInt: c.numberInt, name: c.name, imageLarge: c.imageLarge, imageSmall: c.imageLarge },
        update: { name: c.name, numberInt: c.numberInt, ...(c.imageLarge ? { imageLarge: c.imageLarge, imageSmall: c.imageLarge } : {}) } });
    }
    const total = await prisma.regionCard.count({ where: { setId: SET } });
    await prisma.set.update({ where: { id: SET }, data: { cardCount: total } });
    console.log(`  적용완료 → jp-s-p 총 ${total}장`);
  }
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); }).finally(() => prisma.$disconnect());
