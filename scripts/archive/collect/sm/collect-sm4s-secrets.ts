// 覚醒の勇者 / 각성의 용사 (og-sm4s, jp-tcg-SM4S) JP 누락 시크릿 #56~62 수집 (이미지 포함).
//
// SM4S 본문+SR = 1..55 (currentMax 55). 그 위 #56~62(7장)가 미수집 시크릿:
//   #56~59 = HR(무지개) GX, #60~62 = UR(골드, 그러나 #60은 아이템/61·62는 에너지).
//   전부 본문 카드의 alt-art 재록 → 게임데이터는 본문과 동일, 번호·레어도·일러만 다름.
//   → 시크릿마다 대응 본문(같은 이름·낮은 번호)의 메타데이터를 복제하고 번호·레어도만 새로 부여.
//   KR/EN 대응 없음(JP 단독 하이클래스 시크릿).
//
// 번호·이름·레어도는 tcgcollector 이미지에서 인쇄번호("SM4S NNN/050")·상단명·레어도아이콘을 직접 눈으로 확인:
//   #56 アローラ ゴローニャGX HR (본문 #18; 이미지상 띄어쓰기 없이 보였으나 DB본문명은 "アローラ ゴローニャGX")
//   #57 マッシブーンGX HR (본문 #30) · #58 カミツルギGX HR (본문 #37) · #59 シルヴァディGX HR (본문 #45)
//   #60 カウンターキャッチャー UR (본문 #46, 아이템)
//   #61 ワープエネルギー UR — 본문(1..55) 없음 → 동명 특수에너지(jp-tcg-SM3+ #72)에서 게임필드 복제. FLAG.
//   #62 基本はがねエネルギー UR — DB 어디에도 본문 없음 → 이미지로 최소 채움(Energy/Basic/Metal). FLAG.
// tcgcollector CDN 핫링크 허용. imageSmall=imageLarge=동일 URL. og-sm4s 비동결.
// 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const JP_SET = "jp-tcg-SM4S";
const PACK = "og-sm4s";
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare

// 복제할 게임필드 select
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

type GameFields = {
  supertype: string | null; subtypes: string[]; types: string[]; hp: number | null;
  retreatCost: number | null; weakness: string | null; resistance: string | null;
  regulationMark: string | null; pokedexNumbers: number[]; rules: string[];
  flavorText: string | null; abilities: unknown; attacks: unknown; gameCardId: string | null;
  legalities: unknown; evolvesFrom: string | null; evolvesTo: string[]; nameKo: string | null;
};

// 시크릿 정의 (이미지에서 확인). baseNum = 본문 번호(같은 jpSet) 또는 null(본문 없음→fallbackSet/override).
const SECRETS: {
  num: number; jaName: string; rarityId: string; url: string;
  baseSet: string; baseNum?: number; baseName?: string; // baseNum 우선, 없으면 baseName 으로 fallbackSet 검색
  override?: Partial<GameFields>; // 본문이 없을 때 최소 필드
  flag?: string;
}[] = [
  { num: 56, jaName: "アローラ ゴローニャGX", rarityId: HR, baseSet: JP_SET, baseNum: 18,
    url: "https://static.tcgcollector.com/content/images/5c/0c/4f/5c0c4fb4c6b217a4d51a29e046ae18918b1cd33dbc1fee89fe632451df68f3db.jpg" },
  { num: 57, jaName: "マッシブーンGX", rarityId: HR, baseSet: JP_SET, baseNum: 30,
    url: "https://static.tcgcollector.com/content/images/44/2c/41/442c4141238546c7b7059e93bda905eadf06d9657cf78cf0e75aeee9048e9c05.jpg" },
  { num: 58, jaName: "カミツルギGX", rarityId: HR, baseSet: JP_SET, baseNum: 37,
    url: "https://static.tcgcollector.com/content/images/6a/54/51/6a5451a876450c493f50391744e66f4364b4982df2ca200bb78366fa1073c6d4.jpg" },
  { num: 59, jaName: "シルヴァディGX", rarityId: HR, baseSet: JP_SET, baseNum: 45,
    url: "https://static.tcgcollector.com/content/images/aa/36/87/aa368702ae8558cd61fdfc316e7967a709d905dfd16198f79e7b84b060c7f5c8.jpg" },
  { num: 60, jaName: "カウンターキャッチャー", rarityId: UR, baseSet: JP_SET, baseNum: 46,
    url: "https://static.tcgcollector.com/content/images/06/d1/ba/06d1ba17cff2f1ad06a5815f98310d6207b230879dbeb04e116740dbe46878be.jpg" },
  // 본문(1..55)에 없음 → 동명 특수에너지(SM3+ #72)에서 복제. FLAG.
  { num: 61, jaName: "ワープエネルギー", rarityId: UR, baseSet: "jp-tcg-SM3+", baseName: "ワープエネルギー",
    flag: "#61 ワープエネルギー: jpSet(1..55) 본문 없음 — 동명 특수에너지(jp-tcg-SM3+ #72)에서 게임필드 복제",
    url: "https://static.tcgcollector.com/content/images/11/2c/e8/112ce8380db0fea793e14c98086ea69f625fcd74027df7db8e878db83b76ffdb.jpg" },
  // DB 어디에도 본문 없음 → 이미지로 최소 채움. FLAG.
  { num: 62, jaName: "基本はがねエネルギー", rarityId: UR, baseSet: "",
    override: { supertype: "Energy", subtypes: ["Basic"], types: ["Metal"], hp: null, retreatCost: null,
      weakness: null, resistance: null, regulationMark: null, pokedexNumbers: [], rules: [],
      flavorText: null, abilities: null, attacks: null, gameCardId: null, legalities: null,
      evolvesFrom: null, evolvesTo: [], nameKo: "기본 강철 에너지" },
    flag: "#62 基本はがねエネルギー: DB 어디에도 본문 없음 — 이미지 기반 최소 채움(Energy/Basic/Metal), gameCardId=null",
    url: "https://static.tcgcollector.com/content/images/47/fc/52/47fc52ff0c0af8e149781012a9acb6463af5bd47d4325b7993f4fb406820327e.jpg" },
];

const EMPTY: GameFields = {
  supertype: null, subtypes: [], types: [], hp: null, retreatCost: null, weakness: null,
  resistance: null, regulationMark: null, pokedexNumbers: [], rules: [], flavorText: null,
  abilities: null, attacks: null, gameCardId: null, legalities: null, evolvesFrom: null,
  evolvesTo: [], nameKo: null,
};

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm4s-secrets" });

  // STEP3 가드: 모든 시크릿번호 > currentMax(55) + DB 미존재
  const currentMax = await prisma.regionCard.aggregate({ where: { setId: JP_SET }, _max: { numberInt: true } });
  const cm = currentMax._max.numberInt ?? 0;
  const issues: string[] = [];
  for (const s of SECRETS) {
    if (s.num <= cm) issues.push(`FLAG: #${s.num} <= currentMax(${cm}) — 추측 금지, 중단 권장`);
    const existRc = await prisma.regionCard.findUnique({ where: { id: `${JP_SET}-${s.num}` }, select: { id: true } });
    const existLc = await prisma.card.findUnique({ where: { id: `lc-orphan-${JP_SET}-${s.num}` }, select: { id: true } });
    if (existRc) issues.push(`FLAG: RegionCard ${JP_SET}-${s.num} 이미 존재`);
    if (existLc) issues.push(`FLAG: LogicalCard lc-orphan-${JP_SET}-${s.num} 이미 존재`);
  }
  if (issues.length) { console.error("🛑 STEP3 검증 실패:\n" + issues.join("\n")); process.exit(1); }
  console.log(`STEP3 OK: 시크릿 ${SECRETS.length}장 모두 > currentMax(${cm}) + DB 미존재.`);

  // 게임필드 해소
  const plan = [] as {
    num: number; jaName: string; rarityId: string; url: string; game: GameFields; baseDesc: string; flag?: string;
  }[];
  for (const s of SECRETS) {
    let game: GameFields = { ...EMPTY };
    let baseDesc = "(override)";
    if (s.override) { game = { ...EMPTY, ...s.override }; baseDesc = `override(${s.baseSet || "none"})`; }
    else {
      const where = s.baseNum != null
        ? { setId: s.baseSet, numberInt: s.baseNum }
        : { setId: s.baseSet, name: s.baseName! };
      const base = await prisma.regionCard.findFirst({ where, select: { numberInt: true, name: true, card: { select: GAME } }, orderBy: { numberInt: "asc" } });
      if (!base || !base.card) {
        if (s.flag) { /* flagged fallback expected, but here base lookup unexpectedly empty */ }
        throw new Error(`본문 매칭 실패: 시크릿 #${s.num} (${JSON.stringify(where)})`);
      }
      game = base.card as unknown as GameFields;
      baseDesc = `${s.baseSet}#${base.numberInt} (${base.name})`;
    }
    plan.push({ num: s.num, jaName: s.jaName, rarityId: s.rarityId, url: s.url, game, baseDesc, flag: s.flag });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan)
    console.log(`  #${p.num} ${p.jaName} [${p.rarityId === HR ? "HR" : "UR"}] sup=${p.game.supertype} sub=${JSON.stringify(p.game.subtypes)} hp=${p.game.hp} gameCardId=${p.game.gameCardId} ← ${p.baseDesc}${p.flag ? "  ⚠FLAG" : ""}`);
  for (const p of plan) if (p.flag) console.log(`  ⚠ ${p.flag}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JP_SET}-${p.num}`;
      const g = p.game;
      const lcData = {
        cardPackId: PACK, primarySetId: JP_SET, primaryNumber: String(p.num), primaryNumberInt: p.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: (g.abilities ?? undefined) as any, attacks: (g.attacks ?? undefined) as any,
        legalities: (g.legalities ?? undefined) as any, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
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
