// 光を喰らう闇 (og-sm3n / jp-tcg-SM3N) JP 누락 시크릿 #58~64 수집 — 이미지 포함.
//
// 본문+SR 은 1..57 이미 DB. currentMax(57) 초과 #58~64(7장)이 미수집 시크릿:
//   #58~61 = HR 무지개 GX (각각 본문 GX 의 alt-art 재록 — 게임데이터 동일)
//   #62~64 = UR 골드 (트레이너 굿즈 2 + 기본 페어리 에너지 1)
// 번호·레어도는 카드 인쇄 이미지(/tmp/빛을삼킨어둠/{i}.jpg)를 눈으로 직접 확인해 확정(도감순 1→58 … 7→64).
//
// 게임필드는 본문 카드(같은 jaName·낮은 번호)에서 복제:
//   #58 グソクムシャGX → 본문 #7,  #59 ネクロズマGX → #26,
//   #60 マーシャドーGX → #33, #61 サーナイトGX → #38,
//   #62 スーパーポケモン回収 → 본문 #48 (in-set).
//   #63 レスキュータンカ / #64 基本フェアリーエネルギー 는 in-set 본문 없음(SM3N 1..57 에 미존재) →
//     이미지에서 본 supertype/subtypes 로 최소채움 + 동일 jaName 의 타 JP세트 본문 gameCardId 복제. (FLAG)
// KR(kr-sm3n)·EN(en-tcg-sm3) 은 이 시크릿대(>57) 발매 없음 → JP 단독.
// og-sm3n 은 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const CARD_PACK = "og-sm3n";
const JP_SET = "jp-tcg-SM3N";
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare

// /tmp/sm_illust_manifest.json["빛을삼킨어둠"].urls (도감순 1..7 = 번호 58..64) — 이미지 시각확인 완료.
const URLS = [
  "https://static.tcgcollector.com/content/images/87/33/99/873399be7cdb3735a571b732ef9b4490a4544111f052922a68030587afcdfce3.jpg", // 58 グソクムシャGX HR
  "https://static.tcgcollector.com/content/images/10/22/1e/10221eae50f0b959cea060d0911fef716e1a6c9dd88697016f17deeac7f7a24e.jpg", // 59 ネクロズマGX HR
  "https://static.tcgcollector.com/content/images/84/84/a9/8484a9273c94c33f864fc4239ec7eb26df7b9ca90ff5a8a6bc17f885f4ecfbe9.jpg", // 60 マーシャドーGX HR
  "https://static.tcgcollector.com/content/images/be/dd/cf/beddcf95f947dd0d22af0e538eebb581a0ffe820785f2df0e260cc369a094dce.jpg", // 61 サーナイトGX HR
  "https://static.tcgcollector.com/content/images/68/46/88/6846884ffc7a3a1b5af4f5657e9f23efb6fd07297fe62912a0529544972307a0.jpg", // 62 スーパーポケモン回収 UR
  "https://static.tcgcollector.com/content/images/bd/69/b6/bd69b6663d63a88cf9bc2d93dc0ca222c46f048bd9f544a2b66cde14521d439f.jpg", // 63 レスキュータンカ UR
  "https://static.tcgcollector.com/content/images/2e/07/05/2e0705312265086fa6a107e228d2c5cdf970d0c6a510634a41587c2367b9210e.jpg", // 64 基本フェアリーエネルギー UR
];

type Plan = {
  sec: number;
  jaName: string;
  rarityId: string;
  url: string;
  // 게임필드 소스: in-set 본문 번호(있으면) | 타세트 LC id(없으면)
  baseInSetNum?: number;
  baseLcIdCrossSet?: string;
  // cross-set 일 때 이미지에서 본 최소 필드
  fallbackSupertype?: string;
  fallbackSubtypes?: string[];
  fallbackTypes?: string[];
  nullifyNameKo?: boolean;
  flag?: string;
};

const PLANS: Plan[] = [
  { sec: 58, jaName: "グソクムシャGX", rarityId: HR, url: URLS[0], baseInSetNum: 7 },
  { sec: 59, jaName: "ネクロズマGX", rarityId: HR, url: URLS[1], baseInSetNum: 26 },
  { sec: 60, jaName: "マーシャドーGX", rarityId: HR, url: URLS[2], baseInSetNum: 33 },
  { sec: 61, jaName: "サーナイトGX", rarityId: HR, url: URLS[3], baseInSetNum: 38 },
  { sec: 62, jaName: "スーパーポケモン回収", rarityId: UR, url: URLS[4], baseInSetNum: 48, nullifyNameKo: true,
    flag: "#62 수퍼 포켓몬 회수: in-set 본문 #48 의 nameKo 가 '트집 스프레이'로 손상(본문 KR 로케일은 '수퍼 포켓몬 회수'로 정상). 손상값 전파 회피 위해 nameKo=null 로 기록. (게임필드는 #48 정상복제)" },
  // in-set 본문 없음 → 최소채움 + cross-set gameCardId 복제. FLAG.
  { sec: 63, jaName: "レスキュータンカ", rarityId: UR, url: URLS[5],
    baseLcIdCrossSet: "lc-orphan-jp-tcg-SM2L-48", fallbackSupertype: "Trainer", fallbackSubtypes: ["Item"], fallbackTypes: [],
    flag: "#63 레스큐탱크: SM3N 1..57 in-set 본문 없음(골드 단독 시크릿). 이미지로 Trainer/Item 최소채움 + 동일 jaName SM2L#48 본문 gameCardId 복제." },
  { sec: 64, jaName: "基本フェアリーエネルギー", rarityId: UR, url: URLS[6],
    baseLcIdCrossSet: "lc-jp-tcg-SMA-068", fallbackSupertype: "Energy", fallbackSubtypes: ["Special"], fallbackTypes: [],
    flag: "#64 기본 페어리 에너지: SM3N 1..57 in-set 본문 없음. 이미지로 Energy 최소채움 + 동일 jaName SMA#068 본문 gameCardId 복제(subtypes=Special as base)." },
];

const GAME_SELECT = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function loadGame(p: Plan) {
  if (p.baseInSetNum != null) {
    const base = await prisma.regionCard.findFirst({
      where: { setId: JP_SET, numberInt: p.baseInSetNum, name: p.jaName },
      select: { numberInt: true, card: { select: GAME_SELECT } },
    });
    if (!base?.card) throw new Error(`#${p.sec} ${p.jaName}: in-set 본문 #${p.baseInSetNum} 없음`);
    const game = p.nullifyNameKo ? { ...base.card, nameKo: null } : base.card;
    return { game, baseLabel: `in-set #${p.baseInSetNum}${p.nullifyNameKo ? " (nameKo 손상→null)" : ""}` };
  }
  // cross-set: gameCardId 만 신뢰복제, 나머지는 이미지 최소채움
  const cross = await prisma.card.findUnique({ where: { id: p.baseLcIdCrossSet! }, select: GAME_SELECT });
  if (!cross) throw new Error(`#${p.sec} ${p.jaName}: cross-set 본문 ${p.baseLcIdCrossSet} 없음`);
  const minimal: typeof cross = {
    supertype: p.fallbackSupertype ?? null,
    subtypes: p.fallbackSubtypes ?? cross.subtypes,
    types: p.fallbackTypes ?? [],
    hp: null, retreatCost: null, weakness: null, resistance: null, regulationMark: null,
    pokedexNumbers: [], rules: cross.rules ?? [], flavorText: null,
    abilities: null, attacks: null, legalities: null, evolvesFrom: null, evolvesTo: [],
    gameCardId: cross.gameCardId, nameKo: null,
  };
  return { game: minimal, baseLabel: `cross-set ${p.baseLcIdCrossSet} (gameCardId only)` };
}

async function main() {
  assertWritable([CARD_PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm3n-secrets" });

  const resolved = [];
  for (const p of PLANS) {
    const { game, baseLabel } = await loadGame(p);
    resolved.push({ p, game, baseLabel });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${resolved.length}장 ===`);
  for (const { p, game, baseLabel } of resolved) {
    const rar = p.rarityId === HR ? "HR" : p.rarityId === UR ? "UR" : "?";
    console.log(`  #${p.sec} ${p.jaName} [${rar}] ${game.supertype} ${JSON.stringify(game.subtypes)} HP${game.hp ?? "-"} gameCardId=${game.gameCardId} nameKo=${game.nameKo ?? "(null)"}  ← ${baseLabel}`);
    console.log(`       LC=lc-orphan-${JP_SET}-${p.sec}  RC=${JP_SET}-${p.sec}  img=…${p.url.slice(-16)}`);
    if (p.flag) console.log(`       ⚠ FLAG: ${p.flag}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const { p, game: g } of resolved) {
      const lcId = `lc-orphan-${JP_SET}-${p.sec}`;
      const lcData = {
        cardPackId: CARD_PACK, primarySetId: JP_SET, primaryNumber: String(p.sec), primaryNumberInt: p.sec,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });

      const rcId = `${JP_SET}-${p.sec}`;
      const rcData = {
        cardId: lcId, language: "ja", region: "JP", setId: JP_SET,
        number: String(p.sec), numberInt: p.sec, name: p.jaName,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rcData }, update: rcData });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
