// アローラの햇빛 (og-sm2k / jp-tcg-SM2K) JP 누락 시크릿 #56~62 수집 — 이미지 포함.
//
// SM2K 본문(1..50)+SR(51..55)은 이미 DB에 있음(currentMax=55). #56~62(7장)이 미수집 시크릿.
//   #56~59 = HR(레인보우, GX 4장) · #60~62 = UR(골드, 트레이너 2 + 기본에너지 1).
// 전부 본문 카드의 alt-art 재록 → 게임데이터 동일. 시크릿마다 본문(같은 이름·낮은 번호) 메타 복제, 번호·레어도·이미지만 새로 부여.
// 번호 포맷: zero-pad 없음(plain int 문자열). 이미지: 사용자 제공 tcgcollector URL(이미지에서 인쇄번호 직접 확인).
//   매핑은 카드에 인쇄된 번호("SM2K 0NN/050 HR|UR")를 이미지에서 눈으로 확정.
//
// 본문 매칭(in-set, 같은 이름·낮은 번호):
//   #56 バクガメスGX        ← #9   (HR)
//   #57 アローラ キュウコンGX ← #13  (HR)
//   #58 カプ・コケコGX       ← #22  (HR)
//   #59 ジャラランガGX       ← #41  (HR)
//   #60 フィールドブロアー   ← #48  (UR)
//   #61 まんたんのくすり     ← (in-set 본문 없음) cross-set JP 동일카드 jp-tcg-SM9a#54 에서 복제  [FLAG: cross-set]
//   #62 基本雷エネルギー     ← (in-set 본문 없음) cross-set JP 동일카드 jp-tcg-SV1V#108 에서 복제  [FLAG: cross-set]
// EN/KR: KR(kr-sm2k)은 시크릿 없음. EN(en-tcg-sm2 Guardians Rising)의 레인보우/골드 analog은
//   이미 각자의 EN LC(lc-orphan-en-tcg-sm2-*)에 존재 → 건드리지 않음. 신규 JP 시크릿은 JP 단독.
// og-sm2k 는 동결 목록에 없음(비동결). 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare
const JP_SET = "jp-tcg-SM2K";
const PACK = "og-sm2k";

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

type Plan = {
  num: number;
  jaName: string;
  rarityId: string;
  baseSetId: string;   // 본문 카드 소속 세트(in-set 또는 cross-set)
  baseNumber: number;  // 본문 번호
  url: string;
};

// 시각 확인 완료(이미지 직독): 인쇄번호·이름·레어도·URL.
const PLAN: Plan[] = [
  { num: 56, jaName: "バクガメスGX",        rarityId: HR, baseSetId: JP_SET,        baseNumber: 9,   url: "https://static.tcgcollector.com/content/images/ea/37/a6/ea37a694db02aa8c6b4c0db4256cd431cef3cc1bdabfecd767281f48d2bfda77.jpg" },
  { num: 57, jaName: "アローラ キュウコンGX", rarityId: HR, baseSetId: JP_SET,        baseNumber: 13,  url: "https://static.tcgcollector.com/content/images/f1/d7/f7/f1d7f7c056c0007b456013268cb7f652638108d8da393d272e77374dd7405b0b.jpg" },
  { num: 58, jaName: "カプ・コケコGX",       rarityId: HR, baseSetId: JP_SET,        baseNumber: 22,  url: "https://static.tcgcollector.com/content/images/3f/fd/5d/3ffd5dcb4d98c0fc7791f2e054e83602d82b620069c648519a94bde8d6e03958.jpg" },
  { num: 59, jaName: "ジャラランガGX",       rarityId: HR, baseSetId: JP_SET,        baseNumber: 41,  url: "https://static.tcgcollector.com/content/images/ac/3e/86/ac3e86683ec33c443119959ad9adcff88a16289c768aee5b0c9a878151a83d58.jpg" },
  { num: 60, jaName: "フィールドブロアー",   rarityId: UR, baseSetId: JP_SET,        baseNumber: 48,  url: "https://static.tcgcollector.com/content/images/84/e7/0e/84e70ec3e8089930367b56b46fc96b88e463c7d1c599a0c80c67cc4a085822d4.jpg" },
  { num: 61, jaName: "まんたんのくすり",     rarityId: UR, baseSetId: "jp-tcg-SM9a", baseNumber: 54,  url: "https://static.tcgcollector.com/content/images/1d/8f/01/1d8f014f39e80edebde38dbd48167a652d7b22201700efb9e9b8f45854b0ce81.jpg" },
  { num: 62, jaName: "基本雷エネルギー",     rarityId: UR, baseSetId: "jp-tcg-SV1V", baseNumber: 108, url: "https://static.tcgcollector.com/content/images/b2/ca/b9/b2cab96ea9119aa556e36c8e95fa8ad38762af22d31132b2522ae679223d2930.jpg" },
];

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm2k-secrets" });

  // 본문 카드 게임필드 로드(세트별 번호로 정확히)
  const plan = [];
  for (const p of PLAN) {
    const base = await prisma.regionCard.findFirst({
      where: { setId: p.baseSetId, numberInt: p.baseNumber },
      select: { numberInt: true, name: true, card: { select: GAME } },
    });
    if (!base || !base.card) throw new Error(`본문 ${p.baseSetId}#${p.baseNumber} (시크릿 #${p.num}) DB 없음`);
    plan.push({ ...p, game: base.card, baseName: base.name });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 (이미지 포함) ===`);
  for (const p of plan) {
    const rar = p.rarityId === HR ? "HR" : p.rarityId === UR ? "UR" : p.rarityId;
    const xset = p.baseSetId === JP_SET ? "" : ` [cross-set ${p.baseSetId}]`;
    console.log(`  #${p.num} ${p.jaName} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp ?? "-"} ${rar}  ← 본문 #${p.baseNumber} "${p.baseName}"${xset}  img…${p.url.slice(-16)}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JP_SET}-${p.num}`;
      const g = p.game;
      const lcData = {
        cardPackId: PACK, primarySetId: JP_SET, primaryNumber: String(p.num), primaryNumberInt: p.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });

      const rcId = `${JP_SET}-${p.num}`;
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JP_SET,
        number: String(p.num), numberInt: p.num, name: p.jaName,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
