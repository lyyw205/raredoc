// GX ウルトラシャイニ (og-sm8b) JP 누락 시크릿 #244~250 수집 — 골드 UR 7장.
//
// SM8b 본문+SR 은 #1~243 까지 DB 보유(JP/KR 모두 243). #244~250(7장) 미수집.
//   = 하이클래스팩 "샤이니볼트/골드시크릿" 격의 골드 UR 풀아트 재록. 게임데이터는 대응 GX 본문과 동일.
//   → 시크릿마다 대응 GX 카드(같은 이름·같은 HP)의 메타데이터를 복제하고, 번호·레어도·일러스트만 새로 부여.
//
// 매핑: 이미지(인쇄번호 "NNN/150" + JP명 + HP)를 직접 눈으로 확인해 확정(도감순 url 1..7 → 244..250).
//   244 카프브루루 HP180, 245 카프느지느 HP170, 246 카프꼬꼬꼭 HP170, 247 카프나비나 HP170,
//   248 루나아라 HP230, 249 솔가레오 HP250, 250 울트라네크로즈마 HP190 — 전부 UR(골드).
//   본문 출처: 247/250 은 SM8b 자체 본문(#44/#104). 244~246/248/249 는 SM8b 본문에 GX 미수록 →
//   같은 이름·같은 HP 의 원판 프린트(이미지 기술명까지 일치 확인)에서 복제:
//     244←jp-tcg-sm2+#7 (つのでつく/しぜんのさばき, HP180 Grass)
//     245←jp-tcg-sm2+#18 (アクアリング/ハイドロシュート, HP170 Water)
//     246←jp-tcg-SM2K#22 (てんくうのツメ, HP170 Lightning, retreat2)
//     248←jp-tcg-SME#5 (ルナアーラGX HP230 Psychic Stage2)
//     249←jp-tcg-SME#7 (ソルガレオGX HP250 Metal Stage2 — ターボストライク/プロミネンスGX판)
// EN/KR 대응 없음(JP 단독): KR kr-sm8b 도 243 에서 끊김, EN Hidden Fates/Shiny Vault 에 이 골드 재록 없음.
// og-sm8b 는 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const CARD_PACK = "og-sm8b";
const JP_SET = "jp-tcg-SM8b";
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8)

// 시각 확인 완료: 시크릿번호 → (JP명, 레어도, 복제할 본문 프린트 {setId, num})
const SECRETS: { sec: number; jaName: string; rarityId: string; base: { setId: string; num: number } }[] = [
  { sec: 244, jaName: "カプ・ブルルGX",        rarityId: UR, base: { setId: "jp-tcg-sm2+", num: 7 } },
  { sec: 245, jaName: "カプ・レヒレGX",        rarityId: UR, base: { setId: "jp-tcg-sm2+", num: 18 } },
  { sec: 246, jaName: "カプ・コケコGX",        rarityId: UR, base: { setId: "jp-tcg-SM2K", num: 22 } },
  { sec: 247, jaName: "カプ・テテフGX",        rarityId: UR, base: { setId: "jp-tcg-SM8b", num: 44 } },
  { sec: 248, jaName: "ルナアーラGX",          rarityId: UR, base: { setId: "jp-tcg-SME", num: 5 } },
  { sec: 249, jaName: "ソルガレオGX",          rarityId: UR, base: { setId: "jp-tcg-SME", num: 7 } },
  { sec: 250, jaName: "ウルトラネクロズマGX",  rarityId: UR, base: { setId: "jp-tcg-SM8b", num: 104 } },
];

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([CARD_PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm8b-secrets" });

  const plan = [] as { sec: number; jaName: string; rarityId: string; baseNum: number; game: any }[];
  for (const s of SECRETS) {
    const b = await prisma.regionCard.findFirst({
      where: { setId: s.base.setId, numberInt: s.base.num, region: "JP" },
      select: { numberInt: true, name: true, card: { select: GAME } },
    });
    if (!b?.card) throw new Error(`본문 ${s.base.setId}#${s.base.num} (시크릿 #${s.sec}) DB 없음`);
    plan.push({ sec: s.sec, jaName: s.jaName, rarityId: s.rarityId, baseNum: s.base.num, game: b.card });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 (골드 UR, 이미지는 별도 스크립트) ===`);
  for (const p of plan)
    console.log(`  #${p.sec} ${p.jaName} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp} types${JSON.stringify(p.game.types)} UR  ← 본문 #${p.baseNum} game=${p.game.gameCardId}`);

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
      const rcId = `${JP_SET}-${p.sec}`;
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JP_SET,
        number: String(p.sec), numberInt: p.sec, name: p.jaName,
        imageSmall: null as string | null, imageLarge: null as string | null, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
