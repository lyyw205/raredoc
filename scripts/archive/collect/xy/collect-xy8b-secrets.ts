// 푸른충격 (青い衝撃 / Blue Impact, og-xy8b) JP 누락 시크릿 #065 수집 — 게임데이터는 본문 복제, 이미지는 tcgcollector.
//
// XY8b 본문은 1..064 까지 DB에 있고(JP/KR/EN), currentMax=64 초과 #065 가 미수집 시크릿.
// #065 = ミュウツーEX UR(골드 풀아트) — 본문 #062 ミュウツーEX(Super Rare)의 alt-art 재록.
//   인쇄번호 "065/059", 우하단 'UR' 골드 표기(이미지 직독 확인). 게임데이터 동일 → 본문 #062 에서 복제.
// 번호 포맷: 3자리 zero-pad("065"). 레어도: UR 골드 → Ultra Rare(tier 8).
// EN/KR: 이 UR 골드 alt-art 의 EN/KR 프린트는 실재하지 않음(XY '衝撃/閃光' 은 JP 한정) → JP 단독 유지.
// og-xy8b 는 동결 목록에 없음(비동결). 기본 dry-run, --apply 로 기록. 단일 $transaction. 멱등 upsert.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-XY8b";
const PACK = "og-xy8b";
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8) — UR 골드
const PAD = (n: number) => String(n).padStart(3, "0");
const IMG = "https://static.tcgcollector.com/content/images/01/34/f5/0134f5645dcba8a371429faee6b92eb2c1a3be0a3ab1d7ca2f14b971125e086d.jpg";

// 시크릿번호 → 본문번호 (in-set 동일 이름 매칭)
const MAP: { sec: number; base: number; rarityId: string }[] = [
  { sec: 65, base: 62, rarityId: UR }, // ミュウツーEX UR 골드 ← 본문 #062 ミュウツーEX
];

const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-xy8b-secrets" });

  const baseNums = [...new Set(MAP.map((m) => m.base))];
  const bases = await prisma.regionCard.findMany({
    where: { setId: SET, numberInt: { in: baseNums }, region: "JP" },
    select: { numberInt: true, name: true, card: { select: GAME } },
  });
  const byNum = new Map(bases.map((b) => [b.numberInt!, b]));

  // 안전 가드: 신규 번호가 currentMax(64) 초과 + DB 미존재여야 한다.
  const CURRENT_MAX = 64;
  for (const m of MAP) {
    if (m.sec <= CURRENT_MAX) throw new Error(`#${m.sec} 가 currentMax(${CURRENT_MAX}) 이하 — 덮어쓰기 금지 (FLAG)`);
    const existing = await prisma.regionCard.findFirst({ where: { setId: SET, numberInt: m.sec }, select: { id: true } });
    if (existing) throw new Error(`#${m.sec} 가 이미 DB에 존재(${existing.id}) — 덮어쓰기 금지 (FLAG)`);
  }

  const plan = MAP.map((m) => {
    const b = byNum.get(m.base);
    if (!b) throw new Error(`본문 #${m.base} (시크릿 #${m.sec}) in-set DB 없음 — 추측 금지 (FLAG)`);
    return { ...m, name: b.name, game: b.card! };
  });

  console.log(`\n=== 푸른충격 수집 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan)
    console.log(`  #${PAD(p.sec)} ${p.name} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp} UR  ← 본문 #${PAD(p.base)} (gc=${p.game.gameCardId})`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${SET}-${PAD(p.sec)}`;
      const rcId = `${SET}-${PAD(p.sec)}`;
      const g = p.game;
      const lcData = {
        cardPackId: PACK, primarySetId: SET, primaryNumber: PAD(p.sec), primaryNumberInt: p.sec,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: SET,
        number: PAD(p.sec), numberInt: p.sec, name: p.name,
        imageSmall: IMG as string | null, imageLarge: IMG as string | null, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
