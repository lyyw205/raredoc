// 裂空のカリスマ / 창공의 카리스마 (og-sm7, jp-tcg-SM7) JP 누락 시크릿 #105~112 수집 + 이미지 채우기.
//
// SM7 본문+SR(1..104)은 이미 DB에 있음. currentMax(104) 초과 #105~112(8장)이 미수집 시크릿.
//   #105~109 = HR(레인보우 GX, 5장) · #110~112 = UR(골드 트레이너 굿즈, 3장).
//   전부 본문 카드의 alt-art 재록이라 게임데이터가 본문과 동일 → 본문(같은 JP명·낮은 번호) 게임필드 복제,
//   번호·레어도·이미지만 새로 부여. KR/EN 대응은 STEP6 별도 확인(이런 하이클래스 시크릿은 보통 JP 단독).
//
// 식별: 카드 이미지에서 인쇄번호("SM7 NNN/096")·JP명·레어도(HR/UR)를 눈으로 확인(105~112).
//   레어도 id: HR=cmpp4wysu0016yjurcnv0ys4l, UR=cmpp4wyzt001wyjuriy5esk1h (prisma.rarity code 조회로 검증됨).
// 이미지: tcgcollector CDN(핫링크 허용). imageSmall=imageLarge=동일 URL.
// og-sm7 은 동결 목록에 없음(비동결). 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const CARD_PACK = "og-sm7";
const JP_SET = "jp-tcg-SM7";
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare

// 시각 확인 완료(인쇄번호·JP명·레어도) — manifest urls 도감순(105~112) = 콜렉션번호순.
const SECRETS: { num: number; jaName: string; rarityId: string; url: string }[] = [
  { num: 105, jaName: "ダーテングGX",    rarityId: HR, url: "https://static.tcgcollector.com/content/images/cc/3b/41/cc3b41dd579a0fe70162a38db1aa9f7e78c49cb4c9bc1b773bd40c9fbdfb588b.jpg" },
  { num: 106, jaName: "バシャーモGX",    rarityId: HR, url: "https://static.tcgcollector.com/content/images/b8/3b/f9/b83bf9bb699aee93372694d405ea8d645fb2850d456ab84bf642299e1a4d773c.jpg" },
  { num: 107, jaName: "ツンデツンデGX",  rarityId: HR, url: "https://static.tcgcollector.com/content/images/36/35/64/36356476984a9c6bf3c4736004b1d23bcb1c824ed9c6619ddb7b29c421620a82.jpg" },
  { num: 108, jaName: "チルタリスGX",    rarityId: HR, url: "https://static.tcgcollector.com/content/images/34/e1/82/34e182d6a6207dca0a70770f22e785b9148a7b886c8c95e80e44d70eaacb2e35.jpg" },
  { num: 109, jaName: "レックウザGX",    rarityId: HR, url: "https://static.tcgcollector.com/content/images/f8/92/5e/f8925ec268ffb73fc118181c9c1930503e52fa48a3917474f301e0882a518540.jpg" },
  { num: 110, jaName: "ダートじてんしゃ", rarityId: UR, url: "https://static.tcgcollector.com/content/images/aa/20/04/aa2004ead6e8024804069c770334f2e354e95ba0f3a59d758c3fedd94e585189.jpg" },
  { num: 111, jaName: "レインボーブラシ", rarityId: UR, url: "https://static.tcgcollector.com/content/images/82/fb/2e/82fb2e33abe09f0687765e03546fd657d9c4c21dcb3ddbea695fc6b1640f2c12.jpg" },
  { num: 112, jaName: "ハッスルベルト",   rarityId: UR, url: "https://static.tcgcollector.com/content/images/dc/5b/a5/dc5ba56742611d9eeafb9c05c8549e70738d116a06cadd45941b83e9699b0b7c.jpg" },
];

const GAME = {
  id: true, supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([CARD_PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm7-secrets" });

  const plan = [];
  for (const s of SECRETS) {
    const rcs = await prisma.regionCard.findMany({
      where: { setId: JP_SET, name: s.jaName, region: "JP" },
      select: { numberInt: true, name: true, card: { select: GAME } },
      orderBy: { numberInt: "asc" },
    });
    const base = rcs.find((r) => (r.numberInt ?? 9999) <= 104) ?? rcs[0];
    if (!base) throw new Error(`본문 매칭 실패: #${s.num} ${s.jaName}`);
    plan.push({ ...s, baseNum: base.numberInt!, game: base.card! });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan)
    console.log(`  #${p.num} ${p.jaName} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] ${p.rarityId === UR ? "UR" : "HR"}  <- 본문 #${p.baseNum}  img=…${p.url.slice(-12)}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JP_SET}-${p.num}`;
      const g = p.game;
      const lcData = {
        cardPackId: CARD_PACK, primarySetId: JP_SET, primaryNumber: String(p.num), primaryNumberInt: p.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });

      const rcId = `${JP_SET}-${p.num}`;
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JP_SET,
        number: String(p.num), numberInt: p.num, name: p.jaName,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
