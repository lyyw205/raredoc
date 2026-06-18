// フェアリーライズ (og-sm7b / jp-tcg-SM7b) JP 누락 시크릿 #57~63 수집 — 이미지 포함.
//
// 정본 본문+SR 은 1..56 까지 DB 존재(currentMax=56). 공식 시크릿(SM7b 57/050 ~ 63/050)이 미수집.
// 이 7장은 전부 본문 카드의 alt-art 재록(HR 무지개 4장 / UR 골드 3장)이라 게임데이터가 본문과 동일.
//   → 시크릿마다 대응 본문 카드(같은 이름·낮은 번호)의 메타데이터를 복제하고, 번호·레어도·이미지만 새로 부여.
//
// 시크릿→본문 매핑·레어도·번호: 각 tcgcollector 카드 이미지를 눈으로 직접 읽어 인쇄번호("SM7b 0NN/050"),
//   JP 카드명(상단), 레어도(HR 무지개 / UR 골드)를 확정. 본문명은 jp-tcg-SM7b 안에서 정확 일치 확인됨.
//   #57 ジュカインGX(HR) ← 본문 #5
//   #58 シンボラーGX(HR) ← 본문 #18
//   #59 アローラ キュウコンGX(HR) ← 본문 #25
//   #60 ミミッキュGX(HR) ← 본문 #38
//   #61 ネットボール(UR) ← 본문 #42
//   #62 ぼうけんのカバン(UR) ← 본문 #43
//   #63 のろいのおふだ(UR) ← 본문 #44
// KR/EN 대응 없음(JP 단독 시크릿). 이미지=tcgcollector CDN(핫링크 허용), imageSmall=imageLarge=동일 URL.
// og-sm7b 는 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare (tier 9)
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8)

const CARD_PACK_ID = "og-sm7b";
const JP_SET = "jp-tcg-SM7b";

// 시각 확인 완료: 각 시크릿 = 인쇄번호·이름·레어도·본문번호·이미지URL.
const PLAN: { sec: number; base: number; name: string; rarityId: string; url: string }[] = [
  { sec: 57, base: 5,  name: "ジュカインGX",        rarityId: HR, url: "https://static.tcgcollector.com/content/images/be/ee/b9/beeeb9c57aacc0a9c9fa7f4ccee4e098572a97fcd33082cd0065a3606663f459.jpg" },
  { sec: 58, base: 18, name: "シンボラーGX",        rarityId: HR, url: "https://static.tcgcollector.com/content/images/9a/a7/66/9aa76678aae6797f05a2383a8afcd884c3ed7e3207176592285a23c699955f2b.jpg" },
  { sec: 59, base: 25, name: "アローラ キュウコンGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/b4/43/54/b44354d93196dccb1bfea9e50344ed18f1b69d773d087c2e9a927969807d191a.jpg" },
  { sec: 60, base: 38, name: "ミミッキュGX",        rarityId: HR, url: "https://static.tcgcollector.com/content/images/e7/95/25/e795254fb871b47e5f7272588c61026c04eebe6cf11b2565e7b272a4883fb7bb.jpg" },
  { sec: 61, base: 42, name: "ネットボール",         rarityId: UR, url: "https://static.tcgcollector.com/content/images/23/87/09/238709f71c6cdafc29ad4f3e8e5a31adb7078bdf1dd1461247f260f9ee790526.jpg" },
  { sec: 62, base: 43, name: "ぼうけんのカバン",      rarityId: UR, url: "https://static.tcgcollector.com/content/images/21/07/8a/21078a21916716985acd3761868d3f2049a8178d6585ec92072144b5caf1fc7d.jpg" },
  { sec: 63, base: 44, name: "のろいのおふだ",        rarityId: UR, url: "https://static.tcgcollector.com/content/images/fa/1d/cc/fa1dcc106297cab68816ffb0f03c53a8224f5793cd45bb030bcb698f202b27a7.jpg" },
];

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([CARD_PACK_ID], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm7b-secrets" });

  const baseNums = [...new Set(PLAN.map((p) => p.base))];
  const bases = await prisma.regionCard.findMany({
    where: { setId: JP_SET, numberInt: { in: baseNums } },
    select: { numberInt: true, name: true, card: { select: GAME } },
  });
  // 같은 이름·낮은 번호 매칭 검증: base 번호의 RegionCard 이름이 시크릿 이름과 일치해야 한다.
  const byNum = new Map(bases.map((b) => [b.numberInt!, b]));

  const plan = PLAN.map((p) => {
    const b = byNum.get(p.base);
    if (!b) throw new Error(`본문 #${p.base} (시크릿 #${p.sec}) DB 없음`);
    if (b.name !== p.name) throw new Error(`본문 #${p.base} 이름불일치: DB="${b.name}" 시크릿="${p.name}"`);
    return { ...p, game: b.card! };
  });

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 (이미지 포함) ===`);
  for (const p of plan)
    console.log(`  #${p.sec} ${p.name} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp ?? "-"} ${p.rarityId === UR ? "UR" : "HR"}  ← 본문 #${p.base}  img=…${p.url.slice(-16)}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JP_SET}-${p.sec}`;
      const g = p.game;
      const lcData = {
        cardPackId: CARD_PACK_ID, primarySetId: JP_SET, primaryNumber: String(p.sec), primaryNumberInt: p.sec,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rcId = `${JP_SET}-${p.sec}`;
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JP_SET,
        number: String(p.sec), numberInt: p.sec, name: p.name,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
