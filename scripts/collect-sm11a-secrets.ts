// REMIX BOUT (og-sm11a / jp-tcg-SM11a) JP 누락 시크릿 #74~80 수집 — 게임필드 복제 + 이미지(tcgcollector) 동시 기록.
//
// 우리 JP DB 는 #73 에서 끊김(currentMax=73). 인쇄 분모는 "/064"(본세트 64장) — #65~73 은 이미 수집된 시크릿(평행/SR),
//   #74~80(7장)이 미수집 시크릿(HR 무지개 4 + UR 골드 3). 전부 본문 카드의 alt-art 재록이라 게임데이터=본문 동일.
//   → 시크릿마다 대응 본문 카드(같은 이름·낮은 번호)의 게임필드를 복제하고 번호·레어도·이미지만 새로 부여.
//
// 시각 확인(이미지 직독): 카드에 인쇄된 번호/이름/레어도.
//   74 フシギバナ&ツタージャGX  HR(무지개)  074/064  ← 본문 #1
//   75 リザードン&テールナーGX  HR(무지개)  075/064  ← 본문 #8
//   76 カメックス&ポッチャマGX  HR(무지개)  076/064  ← 본문 #16
//   77 アローラ ペルシアンGX    HR(무지개)  077/064  ← 본문 #40
//   78 グレートキャッチャー      UR(골드)    078/064  ← 본문 #52
//   79 格闘道場(Stadium)        UR(골드)    079/064  ← ⚠ SM11a 본문에 없음 → 동일 게임카드(SB-023, gc_9d2d…) 복제. FLAG.
//   80 ドローエネルギー          UR(골드)    080/064  ← 본문 #60
//
// EN/KR: en-tcg-sm11(Unified Minds)·kr-sm11a 어디에도 이 7장의 동일 alt-art 프린트 없음(JP 단독). → JP only 유지.
// og-sm11a 는 동결(freeze) 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const JPSET = "jp-tcg-SM11a";
const PACK = "og-sm11a";
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare

type Sec = {
  num: number;
  jaName: string;
  rarityId: string;
  baseNumberInt: number | null; // SM11a 본문 번호(없으면 null)
  fallbackLcId?: string;        // 본문 없을 때 동일 게임카드 LC(복제 소스)
  url: string;
};

const SECRETS: Sec[] = [
  { num: 74, jaName: "フシギバナ&ツタージャGX", rarityId: HR, baseNumberInt: 1,  url: "https://static.tcgcollector.com/content/images/a9/30/4a/a9304ad54177c9f156de3792e4cdde18d33bf705b60ef9a1852eed16f0ef7183.jpg" },
  { num: 75, jaName: "リザードン&テールナーGX", rarityId: HR, baseNumberInt: 8,  url: "https://static.tcgcollector.com/content/images/f3/c4/56/f3c456a9266185eba7e4c356e63ae7cc7f338093b29dbec6acd2b978675e4ae1.jpg" },
  { num: 76, jaName: "カメックス&ポッチャマGX", rarityId: HR, baseNumberInt: 16, url: "https://static.tcgcollector.com/content/images/e2/03/01/e2030152f9a6673c396d0293080dfa1a105500b9cb4fd3362f2da64fcd83e2b1.jpg" },
  { num: 77, jaName: "アローラ ペルシアンGX",   rarityId: HR, baseNumberInt: 40, url: "https://static.tcgcollector.com/content/images/8a/4d/64/8a4d64fd73d502f3e4f37d7465f35ce457f2fe17828649377816142fcdd33907.jpg" },
  { num: 78, jaName: "グレートキャッチャー",     rarityId: UR, baseNumberInt: 52, url: "https://static.tcgcollector.com/content/images/e9/a5/f0/e9a5f01478cbdf08432ecbfe86e79ae85319bc48940c20a68229e298419a09ff.jpg" },
  { num: 79, jaName: "格闘道場",                 rarityId: UR, baseNumberInt: null, fallbackLcId: "lc-jp-tcg-SB-023", url: "https://static.tcgcollector.com/content/images/b0/d2/9c/b0d29c1ce4b6c3b87ed28eb7044559079dc24cc25962601266ad08378c86a3fd.jpg" },
  // ⚠ 본문 #59/#60 에너지 게임데이터가 DB상 swap 되어 있음(#60 JP명=ドローエネルギー인데 LC게임=위크가드).
  //   실제 ドローエネルギー 게임카드(gc_7460e544…/ko 드로 에너지)는 본문 #59 LC 가 보유 → #80 은 #59 LC 에서 복제. FLAG.
  { num: 80, jaName: "ドローエネルギー",         rarityId: UR, baseNumberInt: 59, url: "https://static.tcgcollector.com/content/images/10/40/ce/1040ce0f34d82ef9fc8632cc92d1b2a7f63d1772ea0c7b34021e7c81fe66cddb.jpg" },
];

const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function getGame(s: Sec) {
  if (s.baseNumberInt != null) {
    const base = await prisma.regionCard.findFirst({
      where: { setId: JPSET, numberInt: s.baseNumberInt },
      select: { name: true, card: { select: GAME } },
    });
    if (!base) throw new Error(`본문 #${s.baseNumberInt} (시크릿 #${s.num}) DB 없음`);
    return { game: base.card!, source: `SM11a #${s.baseNumberInt}` };
  }
  const lc = await prisma.card.findUnique({ where: { id: s.fallbackLcId! }, select: GAME });
  if (!lc) throw new Error(`fallback LC ${s.fallbackLcId} (시크릿 #${s.num}) DB 없음`);
  return { game: lc, source: `fallback ${s.fallbackLcId}` };
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm11a-secrets" });

  const plan = [] as { s: Sec; game: any; source: string }[];
  for (const s of SECRETS) {
    const { game, source } = await getGame(s);
    plan.push({ s, game, source });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — REMIX BOUT 시크릿 ${plan.length}장 ===`);
  for (const { s, game, source } of plan)
    console.log(`  #${s.num} ${s.jaName} [${game.supertype} ${JSON.stringify(game.subtypes)}] ${s.rarityId === UR ? "UR" : "HR"}  ← ${source}  img…${s.url.slice(-16)}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const { s, game: g } of plan) {
      const lcId = `lc-orphan-${JPSET}-${s.num}`;
      const lcData = {
        cardPackId: PACK, primarySetId: JPSET, primaryNumber: String(s.num), primaryNumberInt: s.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: s.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rcId = `${JPSET}-${s.num}`;
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JPSET,
        number: String(s.num), numberInt: s.num, name: s.jaName,
        imageSmall: s.url, imageLarge: s.url, rarityId: s.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
