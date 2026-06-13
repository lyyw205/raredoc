// GG엔드 (og-sn10a / jp-tcg-sn10a) JP 누락 시크릿 #63~68 수집 — 이미지 포함.
//
// 본문+SR 은 #1~62 까지 DB 보유(currentMax=62). #63~68(6장)이 미수집 시크릿.
// 전부 본문 카드의 alt-art 재록(HR 무지개 4장 / UR 골드 2장)이라 게임데이터가 본문과 동일.
//   → 시크릿마다 대응 본문 카드(같은 이름·낮은 번호)의 게임필드를 복제, 번호·레어도·이미지만 새로.
// 매핑·레어도·번호는 tcgcollector 이미지를 직접 눈으로 확인해 확정:
//   #63 ヒードランGX HR(←본문 #4) · #64 ライチュウ&アローラ ライチュウGX HR(←#8)
//   #65 クチートGX HR(←#30) · #66 ガブリアス&ギラティナGX HR(←#32)
//   #67 タッグスイッチ UR(←#45) · #68 リセットスタンプ UR(←#46)
// EN/KR 시크릿 프린트는 우리 DB·KR세트(kr-sm10a, max 62)에 미실재 → JP 단독 유지.
// og-sn10a 는 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const CARD_PACK = "og-sn10a";
const JP_SET = "jp-tcg-sn10a";

const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare
const SR = "cmpp4wyyk001ryjurevrx3dq0"; // Super Rare (unused here, kept for parity)

// 시크릿번호 → { 본문번호, 레어도, jaName(이미지 인쇄명), tcgcollector url }
type Sec = { sec: number; base: number; rarityId: string; jaName: string; url: string };
const PLAN: Sec[] = [
  { sec: 63, base: 4,  rarityId: HR, jaName: "ヒードランGX", url: "https://static.tcgcollector.com/content/images/bb/ce/62/bbce6287242e38d7cc42062e1ec1e800d29421ad4bf23a26851667ef83808ad4.jpg" },
  { sec: 64, base: 8,  rarityId: HR, jaName: "ライチュウ&アローラ ライチュウGX", url: "https://static.tcgcollector.com/content/images/f5/b5/31/f5b531638179eb3522e0682cf7710bd3c8d990f10cbec278ee2ae6a8c66e96bc.jpg" },
  { sec: 65, base: 30, rarityId: HR, jaName: "クチートGX", url: "https://static.tcgcollector.com/content/images/10/08/70/100870edbc603453da177e985b35a32ffdb23dcc2aa709435f0a8ac5ab54aaea.jpg" },
  { sec: 66, base: 32, rarityId: HR, jaName: "ガブリアス&ギラティナGX", url: "https://static.tcgcollector.com/content/images/97/15/1e/97151ee99775b453087e33803577c85e78998d9251a16ce07fa603edaad184d6.jpg" },
  { sec: 67, base: 45, rarityId: UR, jaName: "タッグスイッチ", url: "https://static.tcgcollector.com/content/images/94/4d/b5/944db501710e91fa4ff8c0b9685adc21ec87f295cb8fdcbff145fc515ba0e59a.jpg" },
  { sec: 68, base: 46, rarityId: UR, jaName: "リセットスタンプ", url: "https://static.tcgcollector.com/content/images/fc/4f/da/fc4fda4705ca6a2acd1bac8bd569de2ff48f66e971cdd9e9c4ed879c5b12ed44.jpg" },
];

const pad = (n: number) => String(n).padStart(3, "0"); // jpSet 번호 포맷 = zero-pad 3

const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([CARD_PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-ggend-secrets" });

  // 본문 카드(같은 이름·낮은 번호) 게임필드 로드
  const baseNums = [...new Set(PLAN.map((p) => p.base))];
  const bases = await prisma.regionCard.findMany({
    where: { setId: JP_SET, numberInt: { in: baseNums }, name: { in: PLAN.map((p) => p.jaName) } },
    select: { numberInt: true, name: true, card: { select: GAME } },
  });
  // (numberInt) → base row
  const byNum = new Map(bases.map((b) => [b.numberInt!, b]));

  const built = PLAN.map((p) => {
    const b = byNum.get(p.base);
    if (!b) throw new Error(`본문 #${p.base} (시크릿 #${p.sec} "${p.jaName}") DB 없음`);
    if (b.name !== p.jaName) throw new Error(`본문 #${p.base} 이름 불일치: DB="${b.name}" vs 이미지="${p.jaName}"`);
    return { ...p, game: b.card!, name: b.name };
  });

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${built.length}장 (이미지 포함) ===`);
  for (const p of built) {
    const rar = p.rarityId === HR ? "HR" : p.rarityId === UR ? "UR" : "SR";
    console.log(`  #${p.sec} (${pad(p.sec)}) ${p.name} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp} ${rar}  ← 본문 #${p.base} gameCardId=${p.game.gameCardId}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of built) {
      const lcId = `lc-orphan-${JP_SET}-${p.sec}`;
      const rcId = `${JP_SET}-${p.sec}`;
      const g = p.game;
      const lcData = {
        cardPackId: CARD_PACK, primarySetId: JP_SET, primaryNumber: pad(p.sec), primaryNumberInt: p.sec,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JP_SET,
        number: pad(p.sec), numberInt: p.sec, name: p.jaName,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
