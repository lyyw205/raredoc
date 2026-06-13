// タッグボルト (og-sm9 / jp-tcg-SM9) JP 누락 시크릿 #110~118 수집 — 게임필드 복제 + 이미지(tcgcollector URL) 포함.
//
// SM9 본문 95장(095) + SR alt 등은 #109 까지 이미 DB 보유. #110~118(9장)이 미수집 시크릿.
//   #110~115 = HR(무지개) TAG TEAM GX 6장 · #116~118 = UR(골드) 트레이너 3장.
//   전부 본문 카드의 alt-art 재록 → 게임데이터 동일. 시크릿마다 대응 본문(같은 이름·낮은 번호) 메타 복제 + 번호·레어도·일러스트(URL)만 새로 부여.
//
// (number, jaName, rarity, baseLcId, url) — 번호/이름/레어도는 카드 이미지에서 직접 눈으로 확인(도감순 110~118).
//   baseLcId 는 jp-tcg-SM9 본문 매칭(같은 이름·최저번호)으로 확정.
//   #118 せせらぎの丘 는 jp-tcg-SM9 본문에 없음(SM9 신규 스타디움 아님 — 과거 재록) → FLAG.
//     게임데이터는 동일 gameCardId(gc_b31e42487ec6eec9cbd8) 재록본(lc-orphan-jp-tcg-SM2L-50)에서 복제(추측 아님).
//
// og-sm9 는 동결 목록에 없음(비동결). 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare (tier 9)
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8)
const JP_SET = "jp-tcg-SM9";
const CARD_PACK = "og-sm9";

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

type Secret = { num: number; name: string; rarityId: string; baseLcId: string; url: string; flag?: string };

const SECRETS: Secret[] = [
  { num: 110, name: "セレビィ&フシギバナGX",   rarityId: HR, baseLcId: "lc-orphan-jp-tcg-SM9-1",  url: "https://static.tcgcollector.com/content/images/b4/cd/6e/b4cd6e988803b8ec20506b0751ceb27cfaf5277cc308090626ac17e696ec4f4f.jpg" },
  { num: 111, name: "コイキング&ホエルオーGX", rarityId: HR, baseLcId: "lc-orphan-jp-tcg-SM9-19", url: "https://static.tcgcollector.com/content/images/3e/1d/a5/3e1da5b30106e8ebbcc1ecdbd000a6073a89bf7963ea302086d76da6add4f33a.jpg" },
  { num: 112, name: "ピカチュウ&ゼクロムGX",   rarityId: HR, baseLcId: "lc-orphan-jp-tcg-SM9-31", url: "https://static.tcgcollector.com/content/images/ee/7f/5d/ee7f5ddaa57b155c22de3eba00c7e072f7761b5689c44cc8274fd60088e95061.jpg" },
  { num: 113, name: "ゲンガー&ミミッキュGX",   rarityId: HR, baseLcId: "lc-orphan-jp-tcg-SM9-38", url: "https://static.tcgcollector.com/content/images/c2/13/b0/c213b0564a64aa9a187a0f6f732c13889148c908b659bf24d182297491b3352c.jpg" },
  { num: 114, name: "ラティアス&ラティオスGX", rarityId: HR, baseLcId: "lc-orphan-jp-tcg-SM9-60", url: "https://static.tcgcollector.com/content/images/ec/ec/b4/ececb4b86f71193b8900a96ccde1d4a17a512ef4f2f2442f1fe2dceffa052caf.jpg" },
  { num: 115, name: "イーブイ&カビゴンGX",     rarityId: HR, baseLcId: "lc-orphan-jp-tcg-SM9-66", url: "https://static.tcgcollector.com/content/images/fd/55/3e/fd553e0f58d20d2570dcb07d9074143e6edadc788619742b112e5336a4ed2326.jpg" },
  { num: 116, name: "ポケモン通信",            rarityId: UR, baseLcId: "lc-orphan-jp-tcg-SM9-82", url: "https://static.tcgcollector.com/content/images/4f/23/3d/4f233d712b90be6dfd3a51dfd88759f865356625469e676d0f16cc0b2e2a1219.jpg" },
  { num: 117, name: "ジャッジマンホイッスル",  rarityId: UR, baseLcId: "lc-orphan-jp-tcg-SM9-78", url: "https://static.tcgcollector.com/content/images/a9/b7/3e/a9b73e2aec13e0bb498ae13390290170c28a9a6ebd2cf5b45829d21d93925f27.jpg" },
  { num: 118, name: "せせらぎの丘",            rarityId: UR, baseLcId: "lc-orphan-jp-tcg-SM2L-50", url: "https://static.tcgcollector.com/content/images/db/93/98/db93982ba6ce20fde4f87b968bae3a38e7e8e29e8ffc8e25d8aea8738ff33d41.jpg", flag: "본문(jp-tcg-SM9) 매칭 실패 — 동일 gameCardId 재록본(SM2L#50)에서 게임필드 복제" },
];

async function main() {
  assertWritable([CARD_PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm9-secrets" });

  const plan = [] as Array<{ s: Secret; game: any }>;
  for (const s of SECRETS) {
    const base = await prisma.card.findUnique({ where: { id: s.baseLcId }, select: GAME });
    if (!base) throw new Error(`base LC ${s.baseLcId} (시크릿 #${s.num}) DB 없음`);
    plan.push({ s, game: base });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const { s, game } of plan) {
    const r = s.rarityId === HR ? "HR" : s.rarityId === UR ? "UR" : "?";
    console.log(`  #${s.num} ${s.name} [${game.supertype} ${JSON.stringify(game.subtypes)}] HP${game.hp} ${r}  ← ${s.baseLcId}${s.flag ? "  ⚠ " + s.flag : ""}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const { s, game: g } of plan) {
      const lcId = `lc-orphan-${JP_SET}-${s.num}`;
      const lcData = {
        cardPackId: CARD_PACK, primarySetId: JP_SET, primaryNumber: String(s.num), primaryNumberInt: s.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: s.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });

      const rcId = `${JP_SET}-${s.num}`;
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JP_SET,
        number: String(s.num), numberInt: s.num, name: s.name,
        imageSmall: s.url, imageLarge: s.url, rarityId: s.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
