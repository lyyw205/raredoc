// ウルトラムーン (og-sm5m / jp-tcg-SM5M) JP 누락 시크릿 #73~78 수집 — 이미지 포함.
//
// 우리 JP DB 는 #1~72 에서 끊김 (currentMax=72). #73~78(6장) 미수집.
// 이 6장은 전부 본문 카드의 alt-art 재록(HR 무지개 / UR 골드)이라 게임데이터가 본문과 동일.
//   → 시크릿마다 대응 본문 카드(같은 이름·낮은 번호)의 메타데이터를 복제하고, 번호·레어도·이미지만 새로 부여.
//
// 시크릿→본문 매핑·레어도·이미지: tcgcollector 카드 이미지를 직접 보고 인쇄번호("SM5M NNN/066")·JP명·레어도 확정.
//   #73~75 = HR(무지개, GX 3장) · #76~78 = UR(골드: 트레이너 グッズ 2 + 특수에너지 1).
//   EN Set 없음 (이 팩엔 KR/JP 만 존재). KR 대응 시크릿 없음 → JP 단독.
// og-sm5m 은 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare
const JPSET = "jp-tcg-SM5M";
const PACK = "og-sm5m";

// 시각 확인 완료: 각 카드 인쇄번호·JP명·레어도·이미지 URL. baseName 으로 본문 게임데이터 복제.
const CARDS: { num: number; name: string; rarityId: string; baseName: string; url: string }[] = [
  { num: 73, name: "グレイシアGX", rarityId: HR, baseName: "グレイシアGX",
    url: "https://static.tcgcollector.com/content/images/da/4a/be/da4abed0b2314e6c6668868fa840db5cc2ebc086039754960f2782fb25a77cf9.jpg" },
  { num: 74, name: "ネクロズマ あかつきのつばさGX", rarityId: HR, baseName: "ネクロズマ あかつきのつばさGX",
    url: "https://static.tcgcollector.com/content/images/d6/67/26/d667268bf4fa76ce607a2740d33071150fa51150ec76bdfd081c491cb60a8a43.jpg" },
  { num: 75, name: "パルキアGX", rarityId: HR, baseName: "パルキアGX",
    url: "https://static.tcgcollector.com/content/images/c3/5d/1d/c35d1d248ed7c46a6402f5ad1c89f5d4972f8aa22a4fe9082a2dddfc05be7db7.jpg" },
  { num: 76, name: "クラッシュハンマー", rarityId: UR, baseName: "クラッシュハンマー",
    url: "https://static.tcgcollector.com/content/images/c7/bb/2e/c7bb2e2ca6f60986f59b2f1f3797678de597b9718c10a5bf1541fe6c7c03d759.jpg" },
  { num: 77, name: "エスケープボード", rarityId: UR, baseName: "エスケープボード",
    url: "https://static.tcgcollector.com/content/images/21/fd/ab/21fdabe303e33d29c3555c438d00350e0482b8331b42aea7f212dc7a7523c3b8.jpg" },
  { num: 78, name: "ユニットエネルギー雷超鋼", rarityId: UR, baseName: "ユニットエネルギー雷超鋼",
    url: "https://static.tcgcollector.com/content/images/23/09/4b/23094b5e8925f17695118fbf8b639c46ff7e8c17a206a87aa4a064ed90851528.jpg" },
];

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm5m-secrets" });

  const plan = [];
  for (const c of CARDS) {
    // 본문 카드(같은 이름·낮은 번호) — 가장 낮은 번호 우선.
    const base = await prisma.regionCard.findFirst({
      where: { setId: JPSET, name: c.baseName, numberInt: { lte: 72 } },
      orderBy: { numberInt: "asc" },
      select: { numberInt: true, name: true, card: { select: GAME } },
    });
    if (!base || !base.card) throw new Error(`본문 "${c.baseName}" (시크릿 #${c.num}) DB 없음`);
    plan.push({ ...c, baseNum: base.numberInt!, game: base.card });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 (이미지 포함) ===`);
  for (const p of plan)
    console.log(`  #${p.num} ${p.name} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp} ${p.rarityId === UR ? "UR" : "HR"}  ← 본문 #${p.baseNum} (gameCardId=${p.game.gameCardId})  img=${p.url.slice(-16)}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JPSET}-${p.num}`;
      const g = p.game;
      const lcData = {
        cardPackId: PACK, primarySetId: JPSET, primaryNumber: String(p.num), primaryNumberInt: p.num,
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
