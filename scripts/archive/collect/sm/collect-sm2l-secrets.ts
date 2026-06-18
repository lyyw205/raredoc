// アローラの月光 (og-sm2l / jp-tcg-SM2L) JP 누락 시크릿 #56~62 수집 — 이미지 포함.
//
// 이 세트 본문+SR(1..55)은 이미 DB에 있음. currentMax=55 초과(#56~62, 7장)가 미수집 시크릿.
//   #56~59 = HR(레인보우, GX 4종) · #60~62 = UR(골드, 트레이너/에너지 3종).
// 전부 본문 카드의 alt-art 재록이라 게임데이터가 본문과 동일 → 대응 본문(같은 이름·낮은 번호)에서 게임필드 복제.
//   #56 ヨワシGX←#14 · #57 カプ・テテフGX←#22 · #58 ルガルガンGX←#27 · #59 メタグロスGX←#35 · #60 アクアパッチ←#47.
//   #61 改造ハンマー · #62 基本闘エネルギー 는 이 세트 본문에 없음(SM2L 골드 단독) → 이미지 정보로 최소 채움 + FLAG.
// 번호 포맷: JP 본문이 plain(1..55) → 시크릿도 plain String(num). 이미지=imageLarge=tcgcollector URL(핫링크 허용).
// og-sm2l 는 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const CARD_PACK = "og-sm2l";
const JPSET = "jp-tcg-SM2L";
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare

// 시각 확인 완료(이미지 인쇄번호/이름/레어도). url = tcgcollector CDN.
type Plan = {
  num: number;
  name: string;
  rarityId: string;
  baseNum: number | null; // 본문 매칭 번호(없으면 null)
  url: string;
  // 본문 없는 경우 이미지로 본 최소 게임필드
  fallback?: { supertype: string; subtypes: string[]; types: string[] };
};
const SECRETS: Plan[] = [
  { num: 56, name: "ヨワシGX",          rarityId: HR, baseNum: 14, url: "https://static.tcgcollector.com/content/images/32/2b/5c/322b5c32fc4d253ac96abd82926f092818719ad465cad4eba480bcb3b216d60c.jpg" },
  { num: 57, name: "カプ・テテフGX",     rarityId: HR, baseNum: 22, url: "https://static.tcgcollector.com/content/images/1f/57/16/1f571611312acb9e331f6998e6e8762210e7731c20ad1c53eb5460bbafa5b5ba.jpg" },
  { num: 58, name: "ルガルガンGX",       rarityId: HR, baseNum: 27, url: "https://static.tcgcollector.com/content/images/a1/92/29/a19229db74f7b14211f1341092d89b13880b9d79f230f5bae4af34f0c52c1c77.jpg" },
  { num: 59, name: "メタグロスGX",       rarityId: HR, baseNum: 35, url: "https://static.tcgcollector.com/content/images/3c/f8/df/3cf8df96a6929e0d2ea4f24e53dc7081129cd4fab26fd2f901b693840e45aa50.jpg" },
  { num: 60, name: "アクアパッチ",        rarityId: UR, baseNum: 47, url: "https://static.tcgcollector.com/content/images/cc/77/36/cc7736a2b5a90d1f94d1c3f4140eeeeaa39e7b8e0c58376e27ca921e75f4b484.jpg" },
  { num: 61, name: "改造ハンマー",        rarityId: UR, baseNum: null, url: "https://static.tcgcollector.com/content/images/6a/8a/3b/6a8a3bf48dca4a2e12245947368754d483af3bd10c5361d381911f6527a7d483.jpg", fallback: { supertype: "Trainer", subtypes: ["Item"], types: [] } },
  { num: 62, name: "基本闘エネルギー",    rarityId: UR, baseNum: null, url: "https://static.tcgcollector.com/content/images/98/87/d4/9887d4676b3a3c7e20c18debdf618d05773361173c564386e40aa6367efe1fb5.jpg", fallback: { supertype: "Energy", subtypes: ["Basic"], types: ["Fighting"] } },
];

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([CARD_PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm2l-secrets" });

  // 본문 카드 로드(매칭 있는 것만)
  const baseNums = SECRETS.map((s) => s.baseNum).filter((n): n is number => n != null);
  const bases = await prisma.regionCard.findMany({
    where: { setId: JPSET, numberInt: { in: baseNums } },
    select: { numberInt: true, name: true, card: { select: GAME } },
  });
  const byNum = new Map(bases.map((b) => [b.numberInt!, b]));

  const plan = SECRETS.map((s) => {
    if (s.baseNum != null) {
      const b = byNum.get(s.baseNum);
      if (!b) throw new Error(`본문 #${s.baseNum} (시크릿 #${s.num}) DB 없음`);
      // 이름 일치 확인(다른 카드 잘못 복제 방지)
      if (b.name !== s.name) throw new Error(`본문 #${s.baseNum} 이름 "${b.name}" ≠ 시크릿 "${s.name}"`);
      return { ...s, game: b.card!, flagged: false as boolean };
    }
    // 본문 없음 → 이미지 최소필드 + FLAG
    const f = s.fallback!;
    return {
      ...s,
      game: {
        supertype: f.supertype, subtypes: f.subtypes, types: f.types, hp: null, retreatCost: null,
        weakness: null, resistance: null, regulationMark: null, pokedexNumbers: [] as number[],
        rules: [] as string[], flavorText: null, abilities: null, attacks: null, gameCardId: null,
        legalities: null, evolvesFrom: null, evolvesTo: [] as string[], nameKo: null,
      },
      flagged: true as boolean,
    };
  });

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan)
    console.log(`  #${p.num} ${p.name} [${p.game.supertype}/${JSON.stringify(p.game.subtypes)}] HP${p.game.hp ?? "-"} ${p.rarityId === UR ? "UR" : "HR"}  ← 본문 ${p.baseNum ?? "없음(FLAG·최소채움)"}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JPSET}-${p.num}`;
      const g = p.game;
      const lcData = {
        cardPackId: CARD_PACK, primarySetId: JPSET, primaryNumber: String(p.num), primaryNumberInt: p.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rcId = `${JPSET}-${p.num}`;
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JPSET,
        number: String(p.num), numberInt: p.num, name: p.name,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
