// 각성하는초왕 / めざめる超王 (og-xy10 / jp-tcg-XY10) JP 누락 시크릿 #88 수집 — 이미지 포함.
//
// 본문+SR풀아트 는 #1~87 까지 DB 보유(currentMax=87). #88 (1장)이 미수집 시크릿.
// 이미지를 직접 확인(Read): フーディンEX 인쇄번호 "088/078", 레어도 "UR"(골드), Illus. Mitsuhiro Arita.
//   → 본문 #80 フーディンEX(SR 풀아트, gameCardId=gc_c537c3efd375aa971df0)의 게임필드를 복제,
//     번호(88)·레어도(UR 골드)·이미지만 새로 부여한다.
//
// 레어도: 이미지에 "UR" 인쇄 → 'Ultra Rare' (cmpp4wyzt001wyjuriy5esk1h). 태스크 지정.
//   (XY 세트의 기존 최고레어는 'Super Rare' tier7 = SR풀아트. UR 골드는 그보다 위 = Ultra Rare.)
//
// EN/KR: KR(kr-xy10) max=87 → KR 골드 시크릿 미실재(JP 단독). EN 골드(en-tcg-xy10 #125 Alakazam-EX)는
//   이미 독립 orphan LC(lc-orphan-en-tcg-xy10-125)로 실재하나, 기존 검증된 LC를 병합하면 손상 위험 → JP 단독 유지하고 보고만(FLAG).
//   (레퍼런스 스크립트·핸드오프 정책: 본문/타지역 별개 물리 프린트는 시크릿 LC에 붙이지 않음.)
//
// og-xy10 는 동결 목록에 없음(비동결). 기본 dry-run, --apply 로 기록. 단일 $transaction · 멱등 upsert.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const CARD_PACK = "og-xy10";
const JP_SET = "jp-tcg-XY10";

const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (골드)

// 시크릿번호 → { 본문번호, 레어도, jaName(이미지 인쇄명), tcgcollector url }
type Sec = { sec: number; base: number; rarityId: string; jaName: string; url: string };
const PLAN: Sec[] = [
  {
    sec: 88,
    base: 80,
    rarityId: UR,
    jaName: "フーディンEX",
    url: "https://static.tcgcollector.com/content/images/a9/4c/7d/a94c7d6af3ccd896bdd22b699c94f8df7218c1d5e3f989109e2d22c2d35c3f34.jpg",
  },
];

const pad = (n: number) => String(n).padStart(3, "0"); // jpSet 번호 포맷 = zero-pad 3 (#087 확인)

const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([CARD_PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-xy10-secrets" });

  // STEP 3 가드: 신규 번호가 currentMax(87) 초과 + DB 미존재여야 함
  const curMax = await prisma.regionCard.findFirst({ where: { setId: JP_SET }, orderBy: { numberInt: "desc" }, select: { numberInt: true } });
  for (const p of PLAN) {
    if (p.sec <= 87) throw new Error(`FLAG: 시크릿 #${p.sec} <= currentMax 87 — 기존 카드 겹침 위험. 중단.`);
    const exist = await prisma.regionCard.findUnique({ where: { id: `${JP_SET}-${p.sec}` }, select: { id: true, name: true } });
    if (exist) throw new Error(`FLAG: ${JP_SET}-${p.sec} 이미 존재(${exist.name}). 덮어쓰기 금지. 중단.`);
  }
  console.log(`현재 jpSet max numberInt=${curMax?.numberInt} (예상 87)`);

  // 본문 카드(같은 이름·낮은 번호) 게임필드 로드
  const baseNums = [...new Set(PLAN.map((p) => p.base))];
  const bases = await prisma.regionCard.findMany({
    where: { setId: JP_SET, numberInt: { in: baseNums }, name: { in: PLAN.map((p) => p.jaName) } },
    select: { numberInt: true, name: true, card: { select: GAME } },
  });
  const byNum = new Map(bases.map((b) => [b.numberInt!, b]));

  const built = PLAN.map((p) => {
    const b = byNum.get(p.base);
    if (!b) throw new Error(`본문 #${p.base} (시크릿 #${p.sec} "${p.jaName}") DB 없음`);
    if (b.name !== p.jaName) throw new Error(`본문 #${p.base} 이름 불일치: DB="${b.name}" vs 이미지="${p.jaName}"`);
    return { ...p, game: b.card!, name: b.name };
  });

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${built.length}장 (이미지 포함) ===`);
  for (const p of built) {
    console.log(`  #${p.sec} (${pad(p.sec)}) ${p.name} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp} UR  ← 본문 #${p.base} gameCardId=${p.game.gameCardId} nameKo=${p.game.nameKo}`);
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
