// ひかる伝説 / Shining Legends (og-sm3+) JP 누락 시크릿 #78~82 수집 — 이미지 포함.
//
// 본문+SR(1..77)은 이미 DB. currentMax=77 초과 #78~82(5장)가 미수집 시크릿.
//   #78~81 = HR(레인보우 하이퍼레어, 4장) · #82 = UR(골드 울트라레어, 1장).
// 전부 본문 GX 카드의 alt-art 재록이라 게임데이터 동일 → 본문(같은 이름·낮은 번호) 메타 복제, 번호·레어도·이미지만 새로.
//
// 번호·이름·레어도: 카드에 인쇄된 번호("SM3+ A NNN/072")·상단명·HR/UR 아이콘을 이미지에서 직접 눈으로 확인(2026-06-13).
//   78 エンテイGX HR ← 본문 73 / 79 ライチュウGX HR ← 74 / 80 ミュウツーGX HR ← 75 / 81 ゾロアークGX HR ← 76 / 82 ミュウツーGX UR ← 75.
//   주: #80(HR)·#82(UR) 둘 다 본문명 ミュウツーGX(=#75) → 이름만으로는 두 본문 후보 모호 X(본문은 #75 단 하나).
// og-sm3+ 는 동결(freeze) 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const JPSET = "jp-tcg-SM3+";
const CARDPACK = "og-sm3+";
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare
const SR = "cmpp4wyyk001ryjurevrx3dq0"; // Secret Rare (참고용)

// 시각 확인 완료: (시크릿번호, 본문번호, JP명, 레어도, 이미지 URL)
const ROWS: { sec: number; base: number; jaName: string; rarityId: string; url: string }[] = [
  { sec: 78, base: 73, jaName: "エンテイGX",   rarityId: HR, url: "https://static.tcgcollector.com/content/images/02/d2/c4/02d2c410ad63597c569b65efd2963d778b7c8fa84032cc8b9ba7a54a51d8a82a.jpg" },
  { sec: 79, base: 74, jaName: "ライチュウGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/f1/92/c7/f192c735f0eb35a11ce5bef4d78a59cadf22b7337007eb5a8e40126675a96ea4.jpg" },
  { sec: 80, base: 75, jaName: "ミュウツーGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/d1/51/0b/d1510b63fc1671f2a0a87c89f13b1b7d9f04bcbe2b9ca20b322ecdff5f32a7ae.jpg" },
  { sec: 81, base: 76, jaName: "ゾロアークGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/c4/44/6b/c4446b748a63ebe55adc2d5b2c3ea4831a65a8f5f5b918e263be696d9a76eb16.jpg" },
  { sec: 82, base: 75, jaName: "ミュウツーGX", rarityId: UR, url: "https://static.tcgcollector.com/content/images/a5/81/89/a58189b6cae7dbf4ca233b0387af957a0d73621735697f7485f45948bbe9c091.jpg" },
];

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([CARDPACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm3plus-secrets" });

  // 본문 GX 카드(JP RegionCard) — numberInt 로 정확 매칭(이름 모호 회피)
  const baseNums = [...new Set(ROWS.map((r) => r.base))];
  const bases = await prisma.regionCard.findMany({
    where: { setId: JPSET, numberInt: { in: baseNums } },
    select: { numberInt: true, name: true, card: { select: GAME } },
  });
  const byNum = new Map(bases.map((b) => [b.numberInt!, b]));

  const plan = ROWS.map((r) => {
    const b = byNum.get(r.base);
    if (!b) throw new Error(`본문 #${r.base} (시크릿 #${r.sec}) DB 없음`);
    if (b.name !== r.jaName) {
      // 이름 불일치는 치명 — 매핑 오류 가능성. 중단.
      throw new Error(`본문 #${r.base} 이름 불일치: DB="${b.name}" vs 이미지="${r.jaName}" (시크릿 #${r.sec})`);
    }
    return { ...r, game: b.card! };
  });

  const rname = (id: string) => (id === UR ? "UR" : id === HR ? "HR" : id === SR ? "SR" : id);
  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan)
    console.log(`  #${p.sec} ${p.jaName} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp} ${rname(p.rarityId)}  ← 본문 #${p.base}  img:${p.url.slice(-16)}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JPSET}-${p.sec}`;
      const g = p.game;
      const num = String(p.sec).padStart(3, "0"); // zero-pad 일치(본문 "001".."077")
      const lcData = {
        cardPackId: CARDPACK, primarySetId: JPSET, primaryNumber: num, primaryNumberInt: p.sec,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rcId = `${JPSET}-${p.sec}`;
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JPSET,
        number: num, numberInt: p.sec, name: p.jaName,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
