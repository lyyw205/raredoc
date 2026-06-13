// ドラゴンストーム (og-sm6a) JP 누락 시크릿 #60~66 수집 — 본문 alt-art 재록.
//
// SM6a 본문+SR = 1..59 가 이미 DB. 정본 시크릿(054~) 중 우리가 미수집한 위쪽 번호 60~66(7장).
//   60~63 = HR(무지개 하이퍼레어, GX 4장) · 64~66 = UR(골드 울트라레어, 트레이너 굿즈 3장).
//   전부 본문 카드의 alt-art 재록 → 게임데이터 동일. 본문(같은 이름·낮은 번호) 메타 복제, 번호·레어도·이미지만 새로.
//
// 시크릿→본문·레어도: 카드 이미지 직접 판독(인쇄번호 "SM6a NNN/053", JP명, HR/UR 글자).
//   #66 본문은 DB #46 "竜の鉤爪"(鉤=U+9264); 이미지 표기 "竜の鈎爪"(鈎=U+920E)는 동일 도구의 변이 한자 전사 — 동일 카드.
//   GX 본문은 본문(저번호)/SR(고번호) 둘 다 존재하나 게임필드 동일(gameCardId 일치 확인) → 저번호 본문 복제.
// EN/KR: 본문 카드엔 EN(Dragon Majesty)·KR 프린트가 있으나 이 위쪽 시크릿(HR무지개/UR골드)은 JP 단독 재록 → JP 단독 유지.
// og-sm6a 는 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare (tier 9)
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8)
const JPSET = "jp-tcg-SM6a";
const PACK = "og-sm6a";

// 시크릿번호 → { 본문번호, jaName(본문 DB canonical), rarity, tcgcollector 이미지 URL }
const PLAN: { sec: number; base: number; jaName: string; rarityId: string; url: string }[] = [
  { sec: 60, base: 8,  jaName: "レシラムGX",        rarityId: HR, url: "https://static.tcgcollector.com/content/images/05/18/9d/05189d4c2a8ceaeba642500fcd691492736d7bf704a93e52eb15ceb3af43a17c.jpg" },
  { sec: 61, base: 14, jaName: "キングドラGX",      rarityId: HR, url: "https://static.tcgcollector.com/content/images/66/7a/8d/667a8d8a8e60e9c18aff8b7a136a1dd884644c762d0ef882fbf855e3e4a93c14.jpg" },
  { sec: 62, base: 28, jaName: "カイリューGX",      rarityId: HR, url: "https://static.tcgcollector.com/content/images/d6/29/b7/d629b7a68319775baf6d4f49424e03e909544da884daa7fc8850e30936e3e95d.jpg" },
  { sec: 63, base: 35, jaName: "ホワイトキュレムGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/9e/3e/c4/9e3ec44d6044622d2e04d430109a1cc224fd82023ad40ce9f11d60d5a7eefab9.jpg" },
  { sec: 64, base: 44, jaName: "いれかえフロート",   rarityId: UR, url: "https://static.tcgcollector.com/content/images/71/3f/ea/713fea589b3503b7e4c1a7b9636efc0d4525bfd30c441c75d77b6df47da7c162.jpg" },
  { sec: 65, base: 45, jaName: "火打石",            rarityId: UR, url: "https://static.tcgcollector.com/content/images/8c/58/64/8c58647e7d368276c81f3f413922a9660090d7a490f8615d037e04c8b41055fd.jpg" },
  { sec: 66, base: 46, jaName: "竜の鉤爪",          rarityId: UR, url: "https://static.tcgcollector.com/content/images/f9/00/10/f9001095dbf86408e572ff34ceebc072d278ff84d3079d440768197b1472baa0.jpg" },
];

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm6a-secrets" });

  // STEP 3 guard: 모든 시크릿번호 > currentMax(59) + DB 미존재
  const maxRow = await prisma.regionCard.aggregate({ where: { setId: JPSET }, _max: { numberInt: true } });
  const currentMax = maxRow._max.numberInt ?? 0;
  for (const p of PLAN) {
    if (p.sec <= currentMax) throw new Error(`#${p.sec} ≤ currentMax(${currentMax}) — FLAG, 중단`);
    const exists = await prisma.regionCard.findFirst({ where: { setId: JPSET, numberInt: p.sec }, select: { id: true } });
    if (exists) throw new Error(`#${p.sec} 이미 DB 존재(${exists.id}) — FLAG, 중단`);
  }

  // 본문 매칭 + 게임필드 로드
  const plan = [] as { sec: number; base: number; jaName: string; rarityId: string; url: string; game: any }[];
  for (const p of PLAN) {
    const b = await prisma.regionCard.findFirst({ where: { setId: JPSET, numberInt: p.base }, select: { name: true, card: { select: GAME } } });
    if (!b || !b.card) throw new Error(`본문 #${p.base} (시크릿 #${p.sec}) DB 없음 — FLAG`);
    plan.push({ ...p, game: b.card });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===  currentMax=${currentMax}`);
  for (const p of plan)
    console.log(`  #${p.sec} ${p.jaName} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp ?? "-"} ${p.rarityId === UR ? "UR" : "HR"}  ← 본문 #${p.base}  img…${p.url.slice(-12)}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JPSET}-${p.sec}`;
      const g = p.game;
      const lcData = {
        cardPackId: PACK, primarySetId: JPSET, primaryNumber: String(p.sec), primaryNumberInt: p.sec,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JPSET,
        number: String(p.sec), numberInt: p.sec, name: p.jaName,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: `${JPSET}-${p.sec}` }, create: { id: `${JPSET}-${p.sec}`, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
