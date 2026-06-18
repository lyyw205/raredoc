// 반딧링 (jp-tcg-XY7 / og-xy7) JP 누락 시크릿 #096~097 수집.
//
// 본문(1..95)은 이미 DB에 있고 currentMax=95. 인쇄번호 096/081·097/081(UR 골드 트레이너) 2장이 미수집 시크릿.
// 이미지 직독 결과:
//   #096 エネルギー回収 (Energy Retrieval) — TRAINER'S グッズ, UR(골드)
//   #097 トレーナーズポスト (Trainer's Post) — TRAINER'S グッズ, UR(골드)
// 둘 다 본문 카드의 alt-art(UR 골드) 재록 → 게임데이터는 동일. 번호·레어도·이미지만 새로 부여.
//
// STEP4 주의: 두 트레이너 모두 jp-tcg-XY7 본문(1..95)에 in-set 프린트가 없음(XY7 트레이너는 069~081, 이 둘 미포함).
//   → 동일 gameCardId 의 타세트 프린트에서 게임필드 복제(FLAG). 추측 아님: gameCardId 일치 확인.
//   에네르기 회수 clone-src: gc_b4363427b309f157b2b8 (jp-tcg-XYE-015, nameKo '에너지 회수')
//   트레이너스 포스트 clone-src: gc_ca409988e00014717e3b (jp-tcg-XY6-070, nameKo '트레이너스 우편함')
// 레어도: 둘 다 UR 골드 → 'Ultra Rare' (cmpp4wyzt001wyjuriy5esk1h). (XY7 SR 풀아트는 Super Rare tier7 이지만 이 둘은 골드 UR.)
// EN/KR: 동일 alt-art UR 프린트가 EN/KR DB 에 없음 → JP 단독.
// og-xy7 비동결. dry-run 기본, --apply 로 기록. 단일 $transaction. 멱등 upsert.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-XY7";
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8) — 골드 UR

type Add = { num: number; jaName: string; img: string; cloneGameCardId: string };
const ADDS: Add[] = [
  {
    num: 96,
    jaName: "エネルギー回収",
    img: "https://static.tcgcollector.com/content/images/bf/b3/9d/bfb39db067157fbafa635329bbfa0e34729231b554a7875717087019ba20e78a.jpg",
    cloneGameCardId: "gc_b4363427b309f157b2b8",
  },
  {
    num: 97,
    jaName: "トレーナーズポスト",
    img: "https://static.tcgcollector.com/content/images/fc/12/a4/fc12a4d60a1f9ca652fde5f6a5f2b2e1ac417987f18045285b497fbc35234e84.jpg",
    cloneGameCardId: "gc_ca409988e00014717e3b",
  },
];

const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

const pad = (n: number) => String(n).padStart(3, "0");

async function main() {
  assertWritable(["og-xy7"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-xy7-secrets" });

  const baseline = await prisma.regionCard.count({ where: { setId: SET } });

  // STEP3 가드: 번호가 currentMax(95) 초과 + DB 미존재여야 한다.
  for (const a of ADDS) {
    if (a.num <= 95) throw new Error(`#${a.num} 가 currentMax(95) 이하 — FLAG, 중단`);
    const rcId = `${SET}-${pad(a.num)}`;
    const exists = await prisma.regionCard.findUnique({ where: { id: rcId }, select: { id: true, name: true } });
    if (exists) throw new Error(`#${a.num} (${rcId}) 이미 존재(${exists.name}) — 덮어쓰기 금지, FLAG, 중단`);
  }

  // 게임필드 복제 소스: 동일 gameCardId 의 프린트(in-set 본문 매칭 실패 → 타세트, FLAG)
  const plan: Array<Add & { game: any; cloneSrc: string }> = [];
  for (const a of ADDS) {
    // in-set 본문 매칭 시도
    const inSet = await prisma.regionCard.findFirst({
      where: { setId: SET, name: a.jaName, region: "JP" },
      select: { id: true, card: { select: GAME } },
    });
    if (inSet?.card) {
      plan.push({ ...a, game: inSet.card, cloneSrc: `in-set ${inSet.id}` });
      continue;
    }
    // in-set 실패 → 동일 gameCardId 타세트 프린트
    const other = await prisma.regionCard.findFirst({
      where: { region: "JP", card: { gameCardId: a.cloneGameCardId } },
      select: { id: true, card: { select: GAME } },
      orderBy: { setId: "asc" },
    });
    if (!other?.card) throw new Error(`#${a.num} clone src(gameCardId=${a.cloneGameCardId}) 없음 — 중단`);
    if (other.card.gameCardId !== a.cloneGameCardId) throw new Error(`#${a.num} clone src gameCardId 불일치 — 중단`);
    plan.push({ ...a, game: other.card, cloneSrc: `cross-set ${other.id} (gameCardId match)` });
  }

  console.log(`\n=== 반딧링 XY7 시크릿 (${APPLY ? "APPLY" : "DRY-RUN"}) — ${plan.length}장 ===`);
  console.log(`baseline ${SET} count = ${baseline}`);
  for (const p of plan)
    console.log(`  #${pad(p.num)} ${p.jaName} [${p.game.supertype}/${JSON.stringify(p.game.subtypes)}] UR  ko='${p.game.nameKo}'  clone←${p.cloneSrc}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${SET}-${pad(p.num)}`;
      const rcId = `${SET}-${pad(p.num)}`;
      const g = p.game;
      const lcData = {
        cardPackId: "og-xy7", primarySetId: SET, primaryNumber: pad(p.num), primaryNumberInt: p.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: UR, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: SET,
        number: pad(p.num), numberInt: p.num, name: p.jaName,
        imageSmall: p.img, imageLarge: p.img, rarityId: UR,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });

  const after = await prisma.regionCard.count({ where: { setId: SET } });
  console.log(`\n✅ 기록 완료. ${SET} count ${baseline} → ${after} (+${after - baseline})`);
  // 검증: 신규 행 출력
  const verify = await prisma.regionCard.findMany({
    where: { id: { in: ADDS.map(a => `${SET}-${pad(a.num)}`) } },
    select: { id: true, number: true, name: true, rarityId: true, imageLarge: true, cardId: true },
    orderBy: { numberInt: "asc" },
  });
  for (const v of verify) console.log(`  ${v.id} ${v.name} rarity=${v.rarityId} img=${v.imageLarge ? "Y" : "N"} lc=${v.cardId}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
