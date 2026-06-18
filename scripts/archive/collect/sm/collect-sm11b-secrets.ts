// ドリームリーグ (og-sm11b) JP 누락 시크릿 #69~75 수집 — 일러스트 이미지 포함(tcgcollector URL).
//
// SM11b 본문+SR 은 #1~68 이미 DB(JP count 68, max 68). #69~75(7장)이 미수집 시크릿:
//   #69~72 = HR(무지개) — 본문 GX 카드의 alt-art 재록 (게임데이터 동일, 번호·레어도·일러만 다름)
//   #73~75 = UR(골드) — 트레이너 alt-art 재록
// 각 시크릿마다 대응 본문 카드(같은 이름·낮은 번호)의 게임필드를 복제, 번호·레어도만 새로 부여.
// 이미지는 tcgcollector URL(시각 확인: 카드 인쇄번호 "sm11b NNN/049 HR|UR" == 도감순 i+68).
// EN/KR 대응: 이 시크릿들은 JP 단독(EN sm12/KR sm11b 는 본문 번호만 보유 — 시크릿 alt-art 없음) → JP 단독 유지.
//
// ⚠ #75 無人発電所: SM11b 본문에 동명카드 없음(스타디움은 SM11b 미수록). 게임데이터는 동일카드인
//   SM9b #50(무인발전소) LC 에서 복제. 이미지/번호/레어도는 SM11b 시크릿(#75 UR)로 신규 부여. → issues FLAG.
//
// og-sm11b 는 동결 목록(protected-groups.ts)에 없음 → --apply 시 --allow-protected 불필요.
// 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const CARD_PACK_ID = "og-sm11b";
const JP_SET = "jp-tcg-SM11b";

const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

// 시크릿 → {레어도, 본문출처, jaName, 이미지URL}. baseSetId 가 JP_SET 가 아니면 외부복제(FLAG).
type Plan = { sec: number; rarityId: string; baseSetId: string; baseNum: number; jaName: string; url: string };
const PLAN: Plan[] = [
  { sec: 69, rarityId: HR, baseSetId: JP_SET, baseNum: 3,  jaName: "ラフレシアGX",          url: "https://static.tcgcollector.com/content/images/b3/72/c4/b372c43a1007efb2874349f6914509e19e42ca7bc898aabab48ffef445a6e431.jpg" },
  { sec: 70, rarityId: HR, baseSetId: JP_SET, baseNum: 20, jaName: "ソルガレオ&ルナアーラGX", url: "https://static.tcgcollector.com/content/images/c0/08/fd/c008fd5b9af49b0ec96384215c1b105b5e9c2e992be9eb74dadf5c044225adaa.jpg" },
  { sec: 71, rarityId: HR, baseSetId: JP_SET, baseNum: 36, jaName: "レシラム&ゼクロムGX",     url: "https://static.tcgcollector.com/content/images/09/a8/b8/09a8b8b6f11af8d929b299cbe7630f18fc7d54eed7d7caa04575b7f2694f1a2d.jpg" },
  { sec: 72, rarityId: HR, baseSetId: JP_SET, baseNum: 41, jaName: "シルヴァディGX",          url: "https://static.tcgcollector.com/content/images/4d/ab/9e/4dab9ed6c23f71bc93a9037993268157707d75b83ce2a2ade05bf675ba626e55.jpg" },
  { sec: 73, rarityId: UR, baseSetId: JP_SET, baseNum: 42, jaName: "スイレンのつりざお",       url: "https://static.tcgcollector.com/content/images/ea/6d/f0/ea6df0e42edd6b6c030acea599bcc9181fb07ac89c35a043df87b48c58c3647c.jpg" },
  { sec: 74, rarityId: UR, baseSetId: JP_SET, baseNum: 43, jaName: "リーリエのピッピ人形",     url: "https://static.tcgcollector.com/content/images/c0/5b/c5/c05bc5a64208c8357f4edcfb3bd087eac83b2695ae262525b61a47d854ba48e7.jpg" },
  { sec: 75, rarityId: UR, baseSetId: "jp-tcg-SM9b", baseNum: 50, jaName: "無人発電所",        url: "https://static.tcgcollector.com/content/images/e0/19/e3/e019e33a278ba2251f996d676a370da6e5e765fab81a14ec93faf9b3bcff2a42.jpg" },
];

async function main() {
  assertWritable([CARD_PACK_ID], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm11b-secrets" });

  const plan = [] as { p: Plan; name: string; game: any }[];
  for (const p of PLAN) {
    const base = await prisma.regionCard.findFirst({
      where: { setId: p.baseSetId, numberInt: p.baseNum },
      select: { name: true, card: { select: GAME } },
    });
    if (!base) throw new Error(`본문 ${p.baseSetId}#${p.baseNum} (시크릿 #${p.sec}) DB 없음`);
    if (base.name !== p.jaName) throw new Error(`본문명 불일치 #${p.sec}: DB="${base.name}" 기대="${p.jaName}"`);
    plan.push({ p, name: base.name, game: base.card! });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const { p, name, game } of plan) {
    const ext = p.baseSetId !== JP_SET ? `  ⚠외부복제(${p.baseSetId}#${p.baseNum})` : `  ← 본문 #${p.baseNum}`;
    console.log(`  #${p.sec} ${name} [${game.supertype} ${JSON.stringify(game.subtypes)}] HP${game.hp ?? "-"} ${p.rarityId === UR ? "UR" : "HR"}${ext}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const { p, name, game: g } of plan) {
      const lcId = `lc-orphan-${JP_SET}-${p.sec}`;
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
        number: String(p.sec), numberInt: p.sec, name,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
