// オルタージェネシス (og-sm12) JP 누락 시크릿 #109~117 수집 — 이미지 포함.
//
// 우리 JP DB(jp-tcg-SM12)는 #108(本文+SR)에서 끊김. currentMax=108 초과 #109~117(9장)이 미수집 시크릿.
//   #109~114 = HR(무지개, 6장) · #115~117 = UR(골드, 3장).  전부 본문 alt-art 재록 → 게임데이터 본문과 동일.
//   번호·레어도·일러스트(이미지URL)만 새로 부여, 게임필드는 본문(같은 이름·낮은 번호)에서 복제.
//
// 번호·이름·레어도는 카드 인쇄면을 이미지로 직접 확인(STEP2):
//   109 ウルガモスGX HR / 110 オドリドリGX HR / 111 フライゴンGX HR /
//   112 アルセウス&ディアルガ&パルキアGX HR / 113 アーゴヨン&アクジキングGX HR / 114 メガミミロップ&プリンGX HR /
//   115 タッグコール UR / 116 しまめぐりのあかし UR / 117 巨大なカマド UR
//
// #117 巨大なカマド 는 jp-tcg-SM12 본문에 없음(우리 JP DB에 base 미보유) → 동일 JP 카드인
//   jp-tcg-SM12a-162(타그올스타즈 수록, 게임데이터 동일)에서 복제. (FLAG 기록)
//
// EN/KR: KR(kr-sm12)은 108에서 끊겨 시크릿 프린트 없음 → 연결 안 함. EN 시크릿은 별 LC로 이미 보유 → JP 단독 유지.
// og-sm12 는 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const JP = "jp-tcg-SM12";
const PACK = "og-sm12";
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare (tier 9)
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8)

const URLS: Record<number, string> = {
  109: "https://static.tcgcollector.com/content/images/99/2c/b1/992cb14f49c87bdbc3156d978c65153a85eb95fb6aeed57b2bacb0f624998a8f.jpg",
  110: "https://static.tcgcollector.com/content/images/b2/54/36/b25436da2aa28c21d539f4e20ed1ebe5cb3ea6eced7973a45c9622c8a5aad9a0.jpg",
  111: "https://static.tcgcollector.com/content/images/3b/0f/73/3b0f73a9636315c248cf799034208156a83133fcb0f7868667cae384cc38053a.jpg",
  112: "https://static.tcgcollector.com/content/images/b5/6a/18/b56a18a2afae28f86f5f9be1b3148ad238f26b522871aa4b27d7cf7398157f4a.jpg",
  113: "https://static.tcgcollector.com/content/images/42/4b/c3/424bc3f9a5ad09e14814fb8fe77fffed1b1a7d0995a2770394d60d7bd5cc1c94.jpg",
  114: "https://static.tcgcollector.com/content/images/f3/ce/ed/f3ceeda81a451be407860b4b30dbb1b00d17a2e55f7932aed23365c6418990a2.jpg",
  115: "https://static.tcgcollector.com/content/images/38/5a/50/385a50d38978826b76ed6707ef258536366d43aee2327383c0e7579ac706e281.jpg",
  116: "https://static.tcgcollector.com/content/images/25/a5/2b/25a52b2104bbd480c982c6ee7a8c39150e91593c69a4bff852f19cf089529eb4.jpg",
  117: "https://static.tcgcollector.com/content/images/68/10/fb/6810fb8ff64646a2a8e04a84db3fd397318bf5a87bed74efcf7d2c4e20762c48.jpg",
};

// 시크릿 → 이름/레어도/본문 base(setId,numberInt). 117은 jpSet 외부(SM12a) 클론.
const SECRETS: { sec: number; name: string; rarityId: string; baseSetId: string; baseNum: number; flag?: string }[] = [
  { sec: 109, name: "ウルガモスGX", rarityId: HR, baseSetId: JP, baseNum: 13 },
  { sec: 110, name: "オドリドリGX", rarityId: HR, baseSetId: JP, baseNum: 35 },
  { sec: 111, name: "フライゴンGX", rarityId: HR, baseSetId: JP, baseNum: 44 },
  { sec: 112, name: "アルセウス&ディアルガ&パルキアGX", rarityId: HR, baseSetId: JP, baseNum: 65 },
  { sec: 113, name: "アーゴヨン&アクジキングGX", rarityId: HR, baseSetId: JP, baseNum: 66 },
  { sec: 114, name: "メガミミロップ&プリンGX", rarityId: HR, baseSetId: JP, baseNum: 73 },
  { sec: 115, name: "タッグコール", rarityId: UR, baseSetId: JP, baseNum: 83 },
  { sec: 116, name: "しまめぐりのあかし", rarityId: UR, baseSetId: JP, baseNum: 85 },
  { sec: 117, name: "巨大なカマド", rarityId: UR, baseSetId: "jp-tcg-SM12a", baseNum: 162,
    flag: "본문 base가 jp-tcg-SM12에 없어 동일 JP카드 jp-tcg-SM12a-162(게임데이터 동일)에서 복제" },
];

// 본문에서 복제할 게임 필드
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm12-secrets" });

  const plan = [];
  for (const s of SECRETS) {
    const base = await prisma.regionCard.findUnique({
      where: { id: `${s.baseSetId}-${s.baseNum}` },
      select: { name: true, numberInt: true, card: { select: GAME } },
    });
    if (!base?.card) throw new Error(`본문 ${s.baseSetId}#${s.baseNum} (시크릿 #${s.sec}) DB 없음`);
    if (base.name !== s.name) {
      console.warn(`  ⚠ #${s.sec} 이름 불일치: 이미지="${s.name}" vs base="${base.name}"`);
    }
    plan.push({ ...s, baseName: base.name, game: base.card });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan) {
    const r = p.rarityId === HR ? "HR" : "UR";
    console.log(`  #${p.sec} ${p.name} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp ?? "-"} ${r}  ← ${p.baseSetId}#${p.baseNum}${p.flag ? "  *FLAG*" : ""}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JP}-${p.sec}`;
      const g = p.game;
      const url = URLS[p.sec];
      const lcData = {
        cardPackId: PACK, primarySetId: JP, primaryNumber: String(p.sec), primaryNumberInt: p.sec,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JP,
        number: String(p.sec), numberInt: p.sec, name: p.name,
        imageSmall: url, imageLarge: url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: `${JP}-${p.sec}` }, create: { id: `${JP}-${p.sec}`, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
