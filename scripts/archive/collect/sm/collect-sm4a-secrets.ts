// 超次元の暴獣 / 초차원의 침략자 (og-sm4a, jp-tcg-SM4A) JP 누락 시크릿 #56~62 수집.
//
// 정본 본문+SR 은 #1~55 까지 이미 DB(jpSet). currentMax=55 초과 #56~62(7장)가 미수집 시크릿.
//   #56~59 = HR(레인보우 하이퍼레어, GX alt-art 재록) · #60~62 = UR(골드, 트레이너/에너지 재록).
//   전부 본문 카드의 alt-art 재록 → 대응 본문(같은 이름·낮은 번호)의 게임데이터를 복제, 번호·레어도만 새로 부여.
// 매핑·번호·레어도는 tcgcollector 이미지에서 인쇄 번호("SM4A NNN/050")·카드명·레어도(HR/UR)를 눈으로 확인해 확정.
//   01→56 … 07→62 (도감순 = 콜렉션번호순).
// 본문 매칭 결과:
//   #56 ギャラドスGX → 본문 #8 (HR)
//   #57 ウツロイドGX → 본문 #22 (HR)
//   #58 アクジキングGX → 본문 #33 (HR)
//   #59 アローラ ナッシーGX → 본문 #37 (HR)
//   #60 ねがいのバトン (UR) → jpSet 본문 없음(이 세트엔 텍스트판 미수록) → 이미지정보로 최소채움 + FLAG
//   #61 カウンターエネルギー → 본문 #50 (UR)
//   #62 基本水エネルギー (UR) → jpSet 본문 없음 → 이미지정보로 최소채움 + FLAG
// EN/KR: kr-sm4a 는 #55 에서 끊김(시크릿 KR판 없음), 이 팩엔 EN 세트 자체가 없음(EN은 별개 en-tcg-sm4). → JP 단독 유지.
// 이미지는 imageSmall=imageLarge=tcgcollector URL. og-sm4a 는 비동결. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const CARD_PACK = "og-sm4a";
const JP_SET = "jp-tcg-SM4A";

const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare
const SR = "cmpp4wyyk001ryjurevrx3dq0"; // Secret Rare (이번엔 미사용)

type Sec = {
  num: number;
  jaName: string;
  rarityId: string;
  baseNum: number | null; // jpSet 본문 번호 (없으면 null → 최소채움 + FLAG)
  url: string;
  // baseNum 이 null 일 때만 사용하는 최소 게임필드(이미지에서 확인)
  fallback?: {
    supertype: string;
    subtypes: string[];
    types: string[];
    nameKo: string | null;
  };
};

const SECRETS: Sec[] = [
  { num: 56, jaName: "ギャラドスGX", rarityId: HR, baseNum: 8,
    url: "https://static.tcgcollector.com/content/images/57/61/b5/5761b596076bfd115a6754a5877bd19d86a0aa1596d7a175b949123c409017a8.jpg" },
  { num: 57, jaName: "ウツロイドGX", rarityId: HR, baseNum: 22,
    url: "https://static.tcgcollector.com/content/images/2b/c7/67/2bc76709bfeee0a3d4eb29ef33ace3d6883539d9e139f1146ea87803f16a3451.jpg" },
  { num: 58, jaName: "アクジキングGX", rarityId: HR, baseNum: 33,
    url: "https://static.tcgcollector.com/content/images/d0/f8/60/d0f86007b0bfdac200c1f89fa64a70dfea875f0c16f700a06e1fe38944686b8f.jpg" },
  { num: 59, jaName: "アローラ ナッシーGX", rarityId: HR, baseNum: 37,
    url: "https://static.tcgcollector.com/content/images/b8/d3/8d/b8d38dd6a36d39296fc5e4b6855b4f9a88ce3c46b4ea74185276e32564d35471.jpg" },
  { num: 60, jaName: "ねがいのバトン", rarityId: UR, baseNum: null,
    url: "https://static.tcgcollector.com/content/images/b1/52/63/b15263b0d212ced0cdf4fb16cd9d889771ba629ac38753643d57e6112dbc5656.jpg",
    fallback: { supertype: "Trainer", subtypes: ["Pokémon Tool"], types: [], nameKo: "소원의 바통" } },
  { num: 61, jaName: "カウンターエネルギー", rarityId: UR, baseNum: 50,
    url: "https://static.tcgcollector.com/content/images/96/77/41/967741b3601514b7049efb3cf06ede9719c92e1f594c759b008fc375ca0f23b0.jpg" },
  { num: 62, jaName: "基本水エネルギー", rarityId: UR, baseNum: null,
    url: "https://static.tcgcollector.com/content/images/0a/b8/4d/0ab84d5e554a1cb12aa3976946a9da09f41d8bd577c09fc16d2ccd679f3db16c.jpg",
    fallback: { supertype: "Energy", subtypes: ["Basic"], types: ["Water"], nameKo: "기본 물 에너지" } },
];

const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([CARD_PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm4a-secrets" });

  // 사전 가드: 모든 타깃 번호가 currentMax(55) 초과 + DB 미존재여야 함
  const curMax = await prisma.regionCard.aggregate({ where: { setId: JP_SET }, _max: { numberInt: true } });
  const maxN = curMax._max.numberInt ?? 0;
  for (const s of SECRETS) {
    if (s.num <= maxN) throw new Error(`#${s.num} 가 currentMax(${maxN}) 이하 — 중단`);
  }

  // 본문(baseNum) 게임필드 로드
  const baseNums = [...new Set(SECRETS.map((s) => s.baseNum).filter((n): n is number => n != null))];
  const bases = await prisma.regionCard.findMany({
    where: { setId: JP_SET, numberInt: { in: baseNums } },
    select: { numberInt: true, name: true, card: { select: GAME } },
  });
  const byNum = new Map(bases.map((b) => [b.numberInt!, b]));

  const plan = SECRETS.map((s) => {
    if (s.baseNum != null) {
      const b = byNum.get(s.baseNum);
      if (!b) throw new Error(`본문 #${s.baseNum} (시크릿 #${s.num}) DB 없음`);
      // 이름 정합 확인
      if (b.name !== s.jaName) throw new Error(`#${s.num} 본문이름불일치: base#${s.baseNum}="${b.name}" vs "${s.jaName}"`);
      return { ...s, game: b.card!, flagged: false as const };
    }
    // 본문 없음 → 최소채움 + FLAG
    const f = s.fallback!;
    return {
      ...s,
      game: {
        supertype: f.supertype, subtypes: f.subtypes, types: f.types,
        hp: null, retreatCost: null, weakness: null, resistance: null, regulationMark: null,
        pokedexNumbers: [] as number[], rules: [] as string[], flavorText: null,
        abilities: null, attacks: null, legalities: null, evolvesFrom: null, evolvesTo: [] as string[],
        gameCardId: null, nameKo: f.nameKo,
      },
      flagged: true as const,
    };
  });

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan) {
    const rar = p.rarityId === HR ? "HR" : p.rarityId === UR ? "UR" : p.rarityId === SR ? "SR" : p.rarityId;
    const base = p.baseNum != null ? `본문 #${p.baseNum}` : "본문없음(최소채움)";
    console.log(`  #${p.num} ${p.jaName} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp ?? "-"} ${rar}  ← ${base}${p.flagged ? "  ⚑FLAG" : ""}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JP_SET}-${p.num}`;
      const g = p.game;
      const lcData = {
        cardPackId: CARD_PACK, primarySetId: JP_SET, primaryNumber: String(p.num), primaryNumberInt: p.num,
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
