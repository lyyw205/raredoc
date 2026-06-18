// 파천의분노 (og-xy9 / jp-tcg-XY9) JP 누락 시크릿 수집.
//
// 우리 JP DB 는 #088 에서 끊김(본문 #001~080 + SR 풀아트 EX/M #081~088).
// tcgcollector 매니페스트의 시크릿 1장 = #089 ギャラドスEX UR(골드) — 본문 EX 의 alt-art 골드 재록.
//   카드 인쇄번호 089/080, 이미지 우하단 "UR" 표기 확인(이미지 직독).
//   게임데이터는 본문 ギャラドスEX(gameCardId gc_85e370a4e04fb23b88da)와 동일 → 복제.
//   번호·레어도·이미지만 새로 부여.
//
// 레어도: UR(골드) → 'Ultra Rare' (cmpp4wyzt001wyjuriy5esk1h, tier 8). XY9 의 SR 풀아트(#081~088)는
//   'Super Rare'(cmpp4wyyk001ryjurevrx3dq0) 를 쓰지만 이 카드는 그 위 골드라 UR 이 맞음(이미지 표기 일치).
//
// EN/KR: JP 단독 유지. EN 세트(en-tcg-xy9, BREAKpoint)에 동일 gameCardId 카드가 있으나
//   번호·레어도·인쇄가 달라 "동일 골드 UR alt-art" 라 단정 불가 → JP 단독(STEP6 보수 원칙).
//
// og-xy9 비동결. dry-run 기본, --apply 로 기록. 멱등 upsert, 단일 $transaction.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-XY9";
const PACK = "og-xy9";
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8) — 골드
const IMG = "https://static.tcgcollector.com/content/images/10/26/a5/1026a52b028c95e83eb8fa5999b55270397995d910b7e19658a3634639c1df2c.jpg";

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

// 시크릿 정의: 번호(zero-pad 3자리) → 본문 매칭(jaName) + 레어도 + 이미지
const SECRETS = [
  { num: 89, jaName: "ギャラドスEX", rarityId: UR, img: IMG, baseGameCardId: "gc_85e370a4e04fb23b88da" },
];

const pad = (n: number) => String(n).padStart(3, "0");

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-xy9-secrets" });

  // 현재 max·충돌 가드
  const existing = await prisma.regionCard.findMany({ where: { setId: SET, region: "JP" }, select: { numberInt: true } });
  const currentMax = Math.max(...existing.map((e) => e.numberInt ?? 0));
  console.log(`현재 ${SET} JP max=${currentMax}, count=${existing.length}`);

  const plan: any[] = [];
  for (const s of SECRETS) {
    if (s.num <= currentMax) throw new Error(`FLAG: #${s.num} <= currentMax ${currentMax} — 덮어쓰기 금지`);
    const rcId = `${SET}-${pad(s.num)}`;
    const lcId = `lc-orphan-${SET}-${pad(s.num)}`;
    const rcExists = await prisma.regionCard.findUnique({ where: { id: rcId }, select: { id: true } });
    // (멱등 upsert 라 존재해도 안전하지만, 신규 수집이므로 신규여야 함을 확인)
    // 본문 매칭: 같은 jaName & 같은 gameCardId 의 본문(가장 낮은 번호)을 선택
    const base = await prisma.regionCard.findFirst({
      where: { setId: SET, region: "JP", name: s.jaName, card: { gameCardId: s.baseGameCardId } },
      orderBy: { numberInt: "asc" },
      select: { number: true, name: true, card: { select: GAME } },
    });
    if (!base) throw new Error(`FLAG: 본문 매칭 실패 — ${SET} jaName=${s.jaName} gameCardId=${s.baseGameCardId}`);
    plan.push({ ...s, rcId, lcId, rcExists: !!rcExists, baseNum: Number(base.number), jaName: base.name, game: base.card });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan) {
    const g = p.game;
    console.log(`  #${pad(p.num)} ${p.jaName} [${g.supertype} ${JSON.stringify(g.subtypes)}] HP${g.hp} UR  ← 본문 #${pad(p.baseNum)}  (rcExists=${p.rcExists})  gameCardId=${g.gameCardId}  nameKo=${g.nameKo}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const g = p.game;
      const lcData = {
        cardPackId: PACK, primarySetId: SET, primaryNumber: pad(p.num), primaryNumberInt: p.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: p.lcId }, create: { id: p.lcId, ...lcData }, update: lcData });
      const rc = {
        cardId: p.lcId, language: "ja", region: "JP", setId: SET,
        number: pad(p.num), numberInt: p.num, name: p.jaName,
        imageSmall: p.img, imageLarge: p.img, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: p.rcId }, create: { id: p.rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
