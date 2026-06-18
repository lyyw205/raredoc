// GXバトルブースト (og-sm4+) JP 누락 시크릿 #121~125 수집 — 이미지(tcgcollector URL) 포함.
//
// 본문+SR(1..120)은 이미 DB에 있음. currentMax(120) 초과 #121~125(5장)가 미수집 시크릿.
// 전부 본문 카드의 alt-art 재록(HR 무지개 / UR 골드)이라 게임데이터가 본문과 동일.
//   → 시크릿마다 대응 본문 카드(같은 이름·최저 번호)의 메타데이터를 복제하고, 번호·레어도·이미지만 새로 부여.
// 매핑·레어도·번호는 카드 이미지를 직접 눈으로 확인해 확정(도감순 = 콜렉션번호순 121~125):
//   #121 フェローチェGX  HR ← 본문 #012
//   #122 デンジュモクGX  HR ← 본문 #033
//   #123 テッカグヤGX    HR ← 본문 #071
//   #124 ルナアーラGX    UR ← 본문 #049
//   #125 ソルガレオGX    UR ← 본문 #070
// 이 하이클래스 시크릿은 JP 단독(EN 셋 없음; KR 보유 여부는 별도 확인). KR/EN 대응은 STEP6 에서 판단.
// og-sm4+ 는 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const JPSET = "jp-tcg-SM4+";
const PACK = "og-sm4+";
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare

// 시각 확인 완료: (시크릿번호, JP카드명, 레어도, 본문번호, tcgcollector url)
const PLAN: { sec: number; name: string; rarityId: string; base: number; url: string }[] = [
  { sec: 121, name: "フェローチェGX", rarityId: HR, base: 12, url: "https://static.tcgcollector.com/content/images/ee/5d/06/ee5d06692c749306deabe4d837b790084fe780d7e7bb8e712afd0b13d0fb385d.jpg" },
  { sec: 122, name: "デンジュモクGX", rarityId: HR, base: 33, url: "https://static.tcgcollector.com/content/images/f9/a8/87/f9a88765c3adcde92c3a2153a04abbf0ba7692e902c0c6669d74ed214bf0928c.jpg" },
  { sec: 123, name: "テッカグヤGX", rarityId: HR, base: 71, url: "https://static.tcgcollector.com/content/images/23/2c/8e/232c8e9523915de135698d05bdb93a2835f41241f6f08ef8b19bccd2eeb692f6.jpg" },
  { sec: 124, name: "ルナアーラGX", rarityId: UR, base: 49, url: "https://static.tcgcollector.com/content/images/4f/c2/f4/4fc2f436e88a9215b5d4b3570719d8620883e3cc819fffaa1f881bee38e23c13.jpg" },
  { sec: 125, name: "ソルガレオGX", rarityId: UR, base: 70, url: "https://static.tcgcollector.com/content/images/75/cf/aa/75cfaa79d3b6239ba1b70449b2e06af5d74da80394ff291dcd57b7d55ad497b3.jpg" },
];

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

// 번호 포맷: 이 셋은 3자리 zero-pad("001".."120"). 121~125 는 이미 3자리라 String(sec) 로 충분.
const fmt = (n: number) => String(n).padStart(3, "0");

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm4plus-secrets" });

  const baseNums = [...new Set(PLAN.map((p) => p.base))];
  const bases = await prisma.regionCard.findMany({
    where: { setId: JPSET, numberInt: { in: baseNums } },
    select: { numberInt: true, name: true, card: { select: GAME } },
  });
  // 같은 번호로 여러 행이 없도록 본문(최저번호) 기준; numberInt 로 유니크 매핑
  const byNum = new Map(bases.map((b) => [b.numberInt!, b]));

  const plan = PLAN.map((p) => {
    const b = byNum.get(p.base);
    if (!b) throw new Error(`본문 #${p.base} (시크릿 #${p.sec}) DB 없음`);
    if (b.name !== p.name) throw new Error(`본문 #${p.base} 이름 불일치: DB="${b.name}" vs 기대="${p.name}"`);
    return { ...p, game: b.card! };
  });

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan)
    console.log(`  #${p.sec} ${p.name} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp} ${p.rarityId === UR ? "UR" : "HR"}  ← 본문 #${p.base}  img=...${p.url.slice(-16)}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JPSET}-${p.sec}`;
      const g = p.game;
      const lcData = {
        cardPackId: PACK, primarySetId: JPSET, primaryNumber: fmt(p.sec), primaryNumberInt: p.sec,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rcId = `${JPSET}-${p.sec}`;
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JPSET,
        number: fmt(p.sec), numberInt: p.sec, name: p.name,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
