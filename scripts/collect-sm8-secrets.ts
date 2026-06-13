// 超爆インパクト (og-sm8 / jp-tcg-SM8) JP 누락 시크릿 #104~111 수집 — 본문 alt-art 재록.
//
// 우리 JP DB 는 #103 에서 끊김 (currentMax=103). #104~111(8장)이 미수집 시크릿.
//   #104~108 = HR(레인보우/홀로, 5장 — GX 포켓몬), #109~111 = UR(골드, 3장 — TRAINER'S 그즈).
// 전부 본문 카드의 alt-art 재록(게임데이터 동일) → 본문 카드(같은 이름·낮은 번호) 메타데이터 복제, 번호·레어도만 새 부여.
// 이미지 URL 은 tcgcollector(핫링크 허용). EN/KR 대응은 STEP6 에서 별도 확인(보통 JP 단독).
//
// 시크릿→jaName·레어도: tcgcollector 카드 이미지에서 인쇄번호·이름·레어도 직접 시각확인.
//   104 ツボツボGX HR / 105 ズガドーンGX HR / 106 スイクンGX HR / 107 バンギラスGX HR / 108 ルギアGX HR
//   109 あとだしハンマー UR / 110 ロストミキサー UR / 111 こだわりメット UR
// 본문 매칭은 jpSet 안에서 jaName 동일·번호 낮은 카드로 자동 탐색.
// og-sm8 은 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const JP_SET = "jp-tcg-SM8";
const CARD_PACK = "og-sm8";
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare
const SR = "cmpp4wyyk001ryjurevrx3dq0"; // Secret Rare (참고)

// 시각 확인: 시크릿번호 → jaName·레어도·이미지URL
const SECRETS: { num: number; jaName: string; rarityId: string; url: string }[] = [
  { num: 104, jaName: "ツボツボGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/eb/70/fd/eb70fd649af7959e8de516c9a2b1d4b34294a30da281f9b0657003cb89d9dfe5.jpg" },
  { num: 105, jaName: "ズガドーンGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/ed/6b/5f/ed6b5faab596330fbfd858eedb207fb30f5427dbbe469395a04a95f8ad98a2da.jpg" },
  { num: 106, jaName: "スイクンGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/df/b9/fd/dfb9fdf91e6296aa8e1efc4c2bb5c46147d240932b2f47a79dce69d6bde6c0db.jpg" },
  { num: 107, jaName: "バンギラスGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/9b/d5/5a/9bd55afd59e822e6bbf70e49abb4c5becbcce71c26cc076920649d5bba3c384c.jpg" },
  { num: 108, jaName: "ルギアGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/34/f7/ad/34f7ad09b47d3cf6aea394699ab91452ce62e908be03430d0540fcdc3d6139c0.jpg" },
  { num: 109, jaName: "あとだしハンマー", rarityId: UR, url: "https://static.tcgcollector.com/content/images/99/07/d6/9907d62925276d4e410cad739ce7c86532ab40106f823eadb33438aa4a4b8935.jpg" },
  { num: 110, jaName: "ロストミキサー", rarityId: UR, url: "https://static.tcgcollector.com/content/images/b9/30/89/b93089bbcbdcc0ec3f324e79c79617074e69b81089418280e0d3fa11de78e1c0.jpg" },
  { num: 111, jaName: "こだわりメット", rarityId: UR, url: "https://static.tcgcollector.com/content/images/6d/6e/aa/6d6eaa9b1de2b48ffb1e72ecea2b4a6a6d889f5e962e21958f6d92e41a264fd4.jpg" },
];

const CURRENT_MAX = 103;

// 본문에서 복제할 게임 필드
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([CARD_PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm8-secrets" });

  // STEP3 가드: 번호 모두 currentMax 초과 + DB 미존재
  const flags: string[] = [];
  for (const s of SECRETS) {
    if (s.num <= CURRENT_MAX) flags.push(`FLAG #${s.num} <= currentMax(${CURRENT_MAX})`);
    const existRc = await prisma.regionCard.findUnique({ where: { id: `${JP_SET}-${s.num}` }, select: { id: true } });
    if (existRc) flags.push(`FLAG #${s.num} RegionCard 이미 존재`);
  }

  // STEP4: jpSet 안에서 jaName 으로 본문(낮은 번호) 탐색
  const plan: { num: number; jaName: string; rarityId: string; url: string; base?: { numberInt: number | null; game: any } }[] = [];
  for (const s of SECRETS) {
    const candidates = await prisma.regionCard.findMany({
      where: { setId: JP_SET, name: s.jaName, numberInt: { lte: CURRENT_MAX } },
      select: { numberInt: true, name: true, card: { select: GAME } },
      orderBy: { numberInt: "asc" },
    });
    if (candidates.length === 0) {
      flags.push(`FLAG #${s.num} "${s.jaName}" 본문 매칭 실패`);
      plan.push({ ...s });
    } else {
      const base = candidates[0];
      plan.push({ ...s, base: { numberInt: base.numberInt, game: base.card } });
    }
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan) {
    const rar = p.rarityId === HR ? "HR" : p.rarityId === UR ? "UR" : p.rarityId === SR ? "SR" : p.rarityId;
    if (p.base) {
      const g = p.base.game;
      console.log(`  #${p.num} ${p.jaName} [${rar}]  ← 본문 #${p.base.numberInt} (${g.supertype} ${JSON.stringify(g.subtypes)} HP${g.hp} gameCardId=${g.gameCardId})`);
    } else {
      console.log(`  #${p.num} ${p.jaName} [${rar}]  ← 본문 매칭 실패 (FLAG)`);
    }
  }
  if (flags.length) { console.log("\n⚠ FLAGS:"); for (const f of flags) console.log("  - " + f); }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  // 본문 매칭 실패가 있으면 중단(추측 금지)
  if (plan.some((p) => !p.base)) {
    console.error("\n🛑 본문 매칭 실패 카드 존재 — 기록 중단. 위 FLAG 확인.");
    await prisma.$disconnect();
    process.exit(1);
  }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const g = p.base!.game;
      const lcId = `lc-orphan-${JP_SET}-${p.num}`;
      const lcData = {
        cardPackId: CARD_PACK, primarySetId: JP_SET, primaryNumber: String(p.num), primaryNumberInt: p.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JP_SET,
        number: String(p.num), numberInt: p.num, name: p.jaName,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: `${JP_SET}-${p.num}` }, create: { id: `${JP_SET}-${p.num}`, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
