// 어둠을밝힌무지개 / 闘う虹を見たか (og-sm3h) JP 누락 시크릿 #58~64 수집.
//
// 이 SM3H(하이클래스팩) 의 우리 JP DB·KR·EN 본문은 57 에서 끊김 → #58~64(7장) 미수집.
// 이 7장은 전부 본문 카드의 alt-art 재록(HR 무지개 / UR 골드)이라 게임데이터가 본문과 동일.
//   → 시크릿마다 대응 본문 카드(같은 이름·낮은 번호)의 메타데이터를 복제하고, 번호·레어도·이미지만 새로 부여.
//
// 시크릿→본문 매핑·레어도: 각 카드 이미지(/tmp/어둠을밝힌무지개/{i}.jpg)를 직접 눈으로 확인해 확정.
//   #58~61 = HR(무지개, GX 4장) · #62~64 = UR(골드, 트레이너/에너지 3장).
//   #58 リザードンGX←#11 · #59 ホウオウGX←#12 · #60 アローラ ベトベトンGX←#33 · #61 オンバーンGX←#40
//   #63 ムキムキダンベル←#48
//   #62 あなぬけのヒモ(Escape Rope) / #64 基本炎エネルギー(Basic Fire Energy) 는 이 팩 본문 1~57 에 없음
//     → 이미지에서 본 정보로 최소 채움(FLAG). gameCardId 는 추측 안 함(null).
// EN/KR: 이 JP 하이클래스 시크릿은 JP 단독(우리 DB 에 동일 프린트 EN/KR 행 없음). JP 단독 유지.
// og-sm3h 는 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const CARD_PACK = "og-sm3h";
const JP_SET = "jp-tcg-SM3H";
const CURRENT_MAX = 57;

const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare (tier 9)
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8)

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

// tcgcollector URL = 카드에 찍힌 번호(이미지 직접 확인). imageSmall=imageLarge=동일 URL.
const URL: Record<number, string> = {
  58: "https://static.tcgcollector.com/content/images/e2/ad/60/e2ad60b146032f44be53e1db8c8cb630d395c79009528f8df9effe7db87a1133.jpg",
  59: "https://static.tcgcollector.com/content/images/b5/55/f8/b555f836f9e4a73d3e17eab62336e73119d4240b4373fa296adec51ac9e74bf5.jpg",
  60: "https://static.tcgcollector.com/content/images/b2/76/2f/b2762f9e7fbb6d091da01f55182808f0730f8e53485700b57e74615b378d8149.jpg",
  61: "https://static.tcgcollector.com/content/images/e0/40/be/e040be8548d2a83edcf7ef31d208390a641fc74195897f8ada7ffb89b91dd4b8.jpg",
  62: "https://static.tcgcollector.com/content/images/b8/40/a7/b840a73be0539f386edf51f71ed43353733f13b30b6d2eb6c59b9a343043074b.jpg",
  63: "https://static.tcgcollector.com/content/images/2b/59/96/2b5996cb64144d33c8adfce3b7be55b00f5200d05ce0ce8f6698694d61614014.jpg",
  64: "https://static.tcgcollector.com/content/images/b2/01/28/b201283335d4fcfdb55781cb5c6909e353d5baf1fe6b4d328257912b42808d86.jpg",
};

type Plan = {
  sec: number;
  name: string;        // RegionCard.name (= jaName, 본문 매칭시 본문 정본명)
  rarityId: string;
  base: number | null; // 본문 번호(없으면 null = FLAG)
  game: any;           // 복제할 게임 필드 (base 없으면 minimal)
};

async function buildPlan(): Promise<Plan[]> {
  const getBase = async (n: number) => {
    const rc = await prisma.regionCard.findFirst({
      where: { setId: JP_SET, numberInt: n },
      select: { name: true, card: { select: GAME } },
    });
    if (!rc) throw new Error(`본문 #${n} DB 없음`);
    return rc;
  };

  const plans: Plan[] = [];

  // HR Pokémon (본문 매칭)
  const hrMap: { sec: number; base: number }[] = [
    { sec: 58, base: 11 }, // リザードンGX
    { sec: 59, base: 12 }, // ホウオウGX
    { sec: 60, base: 33 }, // アローラ ベトベトンGX
    { sec: 61, base: 40 }, // オンバーンGX
  ];
  for (const { sec, base } of hrMap) {
    const b = await getBase(base);
    plans.push({ sec, name: b.name, rarityId: HR, base, game: b.card });
  }

  // UR #63 ムキムキダンベル ← #48 (본문 매칭)
  {
    const b = await getBase(48);
    plans.push({ sec: 63, name: b.name, rarityId: UR, base: 48, game: b.card });
  }

  // UR #62 あなぬけのヒモ (Escape Rope) — 본문 없음 → 이미지 기반 최소 채움 (FLAG)
  plans.push({
    sec: 62, name: "あなぬけのヒモ", rarityId: UR, base: null,
    game: {
      supertype: "Trainer", subtypes: ["Item"], types: [], hp: null, retreatCost: null,
      weakness: null, resistance: null, regulationMark: null, pokedexNumbers: [],
      rules: [], flavorText: null, abilities: null, attacks: null,
      legalities: null, evolvesFrom: null, evolvesTo: [], gameCardId: null, nameKo: "동굴탈출로프",
    },
  });

  // UR #64 基本炎エネルギー (Basic Fire Energy) — 본문 없음 → 이미지 기반 최소 채움 (FLAG)
  plans.push({
    sec: 64, name: "基本炎エネルギー", rarityId: UR, base: null,
    game: {
      supertype: "Energy", subtypes: ["Basic"], types: ["Fire"], hp: null, retreatCost: null,
      weakness: null, resistance: null, regulationMark: null, pokedexNumbers: [],
      rules: [], flavorText: null, abilities: null, attacks: null,
      legalities: null, evolvesFrom: null, evolvesTo: [], gameCardId: null, nameKo: "기본 불꽃 에너지",
    },
  });

  plans.sort((a, b) => a.sec - b.sec);
  return plans;
}

async function main() {
  assertWritable([CARD_PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm3h-secrets" });

  // 가드: 모든 시크릿 번호가 currentMax 초과 + DB 미존재
  const plan = await buildPlan();
  for (const p of plan) {
    if (p.sec <= CURRENT_MAX) throw new Error(`#${p.sec} 가 currentMax(${CURRENT_MAX}) 이하`);
    const existsRc = await prisma.regionCard.findUnique({ where: { id: `${JP_SET}-${p.sec}` } });
    const existsLc = await prisma.card.findUnique({ where: { id: `lc-orphan-${JP_SET}-${p.sec}` } });
    if (existsRc || existsLc) throw new Error(`#${p.sec} 이미 DB 존재 (멱등 upsert 로 진행은 가능하나 신규 가드 차원에서 보고)`);
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan) {
    const r = p.rarityId === HR ? "HR" : p.rarityId === UR ? "UR" : p.rarityId;
    console.log(`  #${p.sec} ${p.name} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp ?? "-"} ${r}  ← ${p.base ? `본문 #${p.base}` : "본문없음(FLAG·최소채움)"}  img=…${URL[p.sec].slice(-16)}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JP_SET}-${p.sec}`;
      const g = p.game;
      const lcData = {
        cardPackId: CARD_PACK, primarySetId: JP_SET, primaryNumber: String(p.sec), primaryNumberInt: p.sec,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });

      const url = URL[p.sec];
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JP_SET,
        number: String(p.sec), numberInt: p.sec, name: p.name,
        imageSmall: url, imageLarge: url, rarityId: p.rarityId,
      };
      const rcId = `${JP_SET}-${p.sec}`;
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
