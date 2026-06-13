// ライジングフィスト (Rising Fist / og-xy3) JP 누락 시크릿 #104~105 수집 — UR 골드 메가진화 EX 2장.
//
// XY3 정본 카드수: 본문 96 + 시크릿 9(SR 풀아트 7장=#097~103 이미 DB · UR 골드 M-EX 2장=#104~105 미수집).
// 이 2장은 본문 메가 EX 의 alt-art 재록(UR 골드)이라 게임데이터가 본문과 동일.
//   #104 = メガヘラクロスEX ← 본문 #005 (lc-jp-tcg-XY3-005)
//   #105 = メガルカリオEX  ← 본문 #053 (lc-jp-tcg-XY3-053)
// 순서/번호 근거: EN 평행세트(en-tcg-xy3, Furious Fists)가 #112 M Heracross-EX · #113 M Lucario-EX 로
//   golds 를 마지막 두 시크릿(헤라크로스→루카리오 순)으로 배치 → JP 는 본문96+SR7(097~103) 다음이라 104/105.
// 레어도: XY-era UR 골드 M-EX 시크릿은 'Ultra Rare'(t8) — XY2 #088/089(MリザードンEX), XY4 #096/097
//   (メガライボルト/メガゲンガーEX) 등 동시대 골드 M-EX 가 실제로 'Ultra Rare' 사용함을 DB 로 확인.
// 이미지: tcgcollector url(imageSmall=imageLarge). illustrator=null.
// EN/KR: KR(kr-xy3)=103행, 골드 시크릿 없음 → KR 연결 없음. EN 골드는 별도 orphan LC(112/113)로 이미 존재(다른 세트, 같은 LC 아님) → 손대지 않음. JP 단독.
// og-xy3 비동결. dry-run 기본, --apply 로 기록. 단일 $transaction. 멱등 upsert.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-XY3";
const PACK = "og-xy3";
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8) — XY-era 골드 M-EX 컨벤션
const pad = (n: number) => String(n).padStart(3, "0");

// 시크릿번호 → 본문번호(in-set) + 이미지 url
const PLAN = [
  { sec: 104, base: 5,  img: "https://static.tcgcollector.com/content/images/c7/74/ac/c774ac5f105f3fdb3c0adefb6451bf2844820fa124c13648264f91fc3b781fe0.jpg" }, // メガヘラクロスEX
  { sec: 105, base: 53, img: "https://static.tcgcollector.com/content/images/1b/1d/69/1b1d69dd14fcfc542150f7b81627265d054243e01f6eaaaa2e059114d10c73b2.jpg" }, // メガルカリオEX
];

const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-xy3-secrets" });

  // 본문 매칭(in-set, region JP)
  const baseNums = PLAN.map((p) => p.base);
  const bases = await prisma.regionCard.findMany({
    where: { setId: SET, numberInt: { in: baseNums }, region: "JP" },
    select: { numberInt: true, name: true, card: { select: GAME } },
  });
  const byNum = new Map(bases.map((b) => [b.numberInt!, b]));

  // 안전가드: 타깃 번호가 currentMax(103) 초과 + 미존재
  const existing = await prisma.regionCard.findMany({
    where: { id: { in: PLAN.map((p) => `${SET}-${pad(p.sec)}`) } }, select: { id: true },
  });
  if (existing.length) throw new Error(`타깃 RC 이미 존재(덮어쓰기 금지): ${existing.map((e) => e.id).join(", ")}`);
  for (const p of PLAN) if (p.sec <= 103) throw new Error(`#${p.sec} 가 currentMax(103) 이하 — FLAG`);

  const plan = PLAN.map((p) => {
    const b = byNum.get(p.base);
    if (!b) throw new Error(`본문 #${p.base} (시크릿 #${p.sec}) in-set DB 없음`);
    return { ...p, name: b.name, game: b.card! };
  });

  console.log(`\n=== XY3 시크릿 수집 (${APPLY ? "APPLY" : "DRY-RUN"}) — ${plan.length}장 (UR 골드 M-EX) ===`);
  for (const p of plan)
    console.log(`  #${pad(p.sec)} ${p.name} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp} gameCardId=${p.game.gameCardId} nameKo=${p.game.nameKo} UR  ← 본문 #${pad(p.base)}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${SET}-${pad(p.sec)}`;
      const rcId = `${SET}-${pad(p.sec)}`;
      const g = p.game;
      const lcData = {
        cardPackId: PACK, primarySetId: SET, primaryNumber: pad(p.sec), primaryNumberInt: p.sec,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: UR, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: SET,
        number: pad(p.sec), numberInt: p.sec, name: p.name,
        imageSmall: p.img, imageLarge: p.img, rarityId: UR,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
