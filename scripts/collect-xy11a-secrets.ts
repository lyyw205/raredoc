// 냉혹한반역자 (og-xy11a / jp-tcg-XY11a) JP 누락 시크릿 #059 수집 — UR 골드 サーナイトEX.
//
// XY11a 본문은 #001~058(58장) DB에 존재. currentMax=58 초과 #059 가 미수집 시크릿.
// 이미지(tcgcollector "XY11 059/054 UR")를 직독 확인:
//   - JP명 サーナイトEX / HP170 / 어택 リンクブラスト 30+, ひかりのやいば 120
//   - 인쇄번호 059/054, 레어도 UR(골드 풀아트) → DB 'Ultra Rare'(tier8) id cmpp4wyzt001wyjuriy5esk1h
// 이 시크릿은 본문 サーナイトEX(#038 base / #056 SR, 둘 다 gameCardId=gc_ff14612a275ed29ac317)의
//   골드 alt-art 재록 → 게임데이터 동일. in-set 본문(같은 이름)에서 게임필드 복제, 번호·레어도·이미지만 새로.
// EN/KR: 이 골드의 동일 alt-art 가 EN/KR DB에 연결된 프린트로 실재하지 않음(EN xy11-116 은 별도 orphan,
//   다른 gameCardId; KR kr-xy11r 은 058 에서 끝) → JP 단독 유지.
// og-xy11a 는 비동결. dry-run 기본, --apply 로 기록. 단일 $transaction. 멱등 upsert.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const CARD_PACK = "og-xy11a";
const SET = "jp-tcg-XY11a";
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8) — UR 골드
const IMG = "https://static.tcgcollector.com/content/images/6f/a5/ae/6fa5aee007aa0b1d2fb57b38d6c46890a9ac1f4553115f02968e9114cb0d680c.jpg";

// 시크릿번호 → 본문 매칭(같은 jaName), 레어도
const ADDS = [
  { num: 59, jaName: "サーナイトEX", rarity: UR, baseNumberInt: 56 }, // 본문 #056(SR) 와 동일 게임데이터(gameCardId 동일)
];

const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

const pad = (n: number) => String(n).padStart(3, "0");

async function main() {
  assertWritable([CARD_PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-xy11a-secrets" });

  const currentMax = (await prisma.regionCard.aggregate({ where: { setId: SET }, _max: { numberInt: true } }))._max.numberInt ?? 0;

  const plan: { num: number; jaName: string; rarity: string; base: any }[] = [];
  for (const a of ADDS) {
    // STEP3 검증: currentMax 초과 + DB 미존재
    if (a.num <= currentMax) throw new Error(`FLAG: #${a.num} <= currentMax ${currentMax} — 본문과 겹침. 중단.`);
    const rcId = `${SET}-${pad(a.num)}`;
    const existing = await prisma.regionCard.findFirst({ where: { OR: [{ id: rcId }, { setId: SET, numberInt: a.num }] }, select: { id: true } });
    if (existing) throw new Error(`FLAG: ${SET} #${a.num} 이미 존재(${existing.id}) — 덮어쓰지 않음. 중단.`);

    // in-set 본문 매칭(같은 jaName)
    const base = await prisma.regionCard.findFirst({
      where: { setId: SET, name: a.jaName, numberInt: a.baseNumberInt, region: "JP" },
      select: { name: true, card: { select: GAME } },
    });
    if (!base?.card) throw new Error(`FLAG: 본문 ${a.jaName} (#${a.baseNumberInt}) in ${SET} 게임데이터 없음. 중단.`);
    plan.push({ num: a.num, jaName: a.jaName, rarity: a.rarity, base });
  }

  console.log(`\n=== XY11a 시크릿 수집 (${APPLY ? "APPLY" : "DRY-RUN"}) — currentMax=${currentMax} ===`);
  for (const p of plan) {
    const g = p.base.card;
    console.log(`  #${pad(p.num)} ${p.jaName} [${g.supertype} ${JSON.stringify(g.subtypes)}] HP${g.hp} types=${JSON.stringify(g.types)} ko='${g.nameKo}' gameCardId=${g.gameCardId} rarity=UR(${p.rarity})`);
    console.log(`        attacks=${JSON.stringify((g.attacks ?? []).map((x: any) => x.name))} img=${IMG.slice(0, 60)}...`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${SET}-${pad(p.num)}`;
      const g = p.base.card;
      const lcData = {
        cardPackId: CARD_PACK, primarySetId: SET, primaryNumber: pad(p.num), primaryNumberInt: p.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarity, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });

      const rcId = `${SET}-${pad(p.num)}`;
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: SET,
        number: pad(p.num), numberInt: p.num, name: p.jaName,
        imageSmall: IMG, imageLarge: IMG, rarityId: p.rarity,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
