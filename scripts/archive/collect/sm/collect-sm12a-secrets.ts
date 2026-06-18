// TAG TEAM GX ALL STARS (og-sm12a) JP 누락 시크릿 #211~226 수집 — 일러스트(이미지/일러레이터) 제외.
//
// SM12a 정본 카드수는 226(Bulbapedia). 우리 JP DB·JP공식스크랩·KR공식 모두 210 에서 끊김 → #211~226(16장) 미수집.
// 이 16장은 전부 본문 카드의 alt-art 재록(HR 무지개 / UR 골드)이라 게임데이터가 본문과 동일.
//   → 시크릿마다 대응 본문 카드(같은 이름·낮은 번호)의 메타데이터를 복제하고, 번호·레어도만 새로 부여한다.
// 이미지/일러스트레이터는 채우지 않음(사용자 요청: 일러 제외). KR/EN 대응 없음(JP 단독).
//
// 시크릿→본문 매핑·레어도: Bulbapedia "Tag All Stars" 표에서 추출(이름은 본문 카드와 정확히 일치 확인됨).
//   #211~219 = HR(하이퍼레어, 9장) · #220~226 = UR(울트라레어, 7장 — 프리미엄 태그팀 골드).
// og-sm12a 는 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare (tier 9)
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8)

// 시크릿번호 → 본문번호
const MAP: Record<number, number> = {
  211: 39, 212: 176, 213: 53, 214: 180, 215: 181, 216: 183, 217: 184, 218: 94, 219: 187,
  220: 16, 221: 41, 222: 52, 223: 72, 224: 83, 225: 99, 226: 102,
};
const rarityOf = (sec: number) => (sec >= 220 ? UR : HR);

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable(["og-sm12a"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm12a-secrets" });

  const baseNums = [...new Set(Object.values(MAP))];
  const bases = await prisma.regionCard.findMany({
    where: { setId: "jp-tcg-SM12a", numberInt: { in: baseNums } },
    select: { numberInt: true, name: true, card: { select: GAME } },
  });
  const byNum = new Map(bases.map((b) => [b.numberInt!, b]));

  const plan = Object.entries(MAP).map(([secS, base]) => {
    const sec = Number(secS);
    const b = byNum.get(base);
    if (!b) throw new Error(`본문 #${base} (시크릿 #${sec}) DB 없음`);
    return { sec, base, name: b.name, rarityId: rarityOf(sec), game: b.card! };
  });

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 (이미지/일러 제외) ===`);
  for (const p of plan)
    console.log(`  #${p.sec} ${p.name} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp} ${p.rarityId === UR ? "UR" : "HR"}  ← 본문 #${p.base}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-jp-tcg-SM12a-${p.sec}`;
      const g = p.game;
      const lcData = {
        cardPackId: "og-sm12a", primarySetId: "jp-tcg-SM12a", primaryNumber: String(p.sec), primaryNumberInt: p.sec,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: "jp-tcg-SM12a",
        number: String(p.sec), numberInt: p.sec, name: p.name,
        imageSmall: null as string | null, imageLarge: null as string | null, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: `jp-tcg-SM12a-${p.sec}` }, create: { id: `jp-tcg-SM12a-${p.sec}`, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
