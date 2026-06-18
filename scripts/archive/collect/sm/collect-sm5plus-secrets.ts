// ウルトラフォース (og-sm5+) JP 누락 시크릿 #057~063 수집 — 이미지(tcgcollector) 포함.
//
// SM5+ 정본 카드수는 56(우리 JP DB·cardCount=56)에서 끊김 → #057~063(7장) 미수집.
// 이 7장은 전부 본문 카드의 alt-art 재록(HR 무지개 / UR 골드)이라 게임데이터가 본문과 동일.
//   → 시크릿마다 대응 본문 카드의 메타데이터를 복제하고, 번호·레어도·이미지만 새로 부여.
//
// 번호 포맷: 이 세트는 zero-pad(3자리) — number="057", id="jp-tcg-SM5+-057" (기존 행과 동일 규칙).
// 시각 확인(카드 인쇄 번호·이름·레어도, /tmp/울트라포스/{1..7}.jpg 직독):
//   01 057/050 HR パルキアGX · 02 058/050 HR アーゴヨンGX · 03 059/050 HR ルカリオGX · 04 060/050 HR ディアルガGX
//   05 061/050 UR エネルギーリサイクル · 06 062/050 UR ビーストリング · 07 063/050 UR 鋼鉄のフライパン
//
// 본문 매핑(같은 세트 내 동명 본문카드, 게임데이터 동일):
//   57→10(パルキアGX) 58→23(アーゴヨンGX) 59→30(ルカリオGX) 60→35(ディアルガGX) 62→41(ビーストリング) 63→42(鋼鉄のフライパン)
//   61 エネルギーリサイクル: 이 세트에 본문 없음(이 팩엔 시크릿으로만 수록) →
//     동일 논리카드(gameCardId gc_01bf16befe62c022303a)인 jp-tcg-SMC-011 에서 게임필드 복제. ⚠FLAG(in-set 본문 매칭 실패).
//
// EN/KR: EN 세트 없음. KR(kr-sm5+)은 합본·다른 넘버링이라 이 HR/UR 시크릿에 대응 프린트 없음 → JP 단독 유지.
// og-sm5+ 는 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const JP_SET = "jp-tcg-SM5+";
const CARD_PACK_ID = "og-sm5+";

const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare

const pad = (n: number) => String(n).padStart(3, "0");
const rcId = (n: number) => `${JP_SET}-${pad(n)}`;
const lcId = (n: number) => `lc-orphan-${JP_SET}-${pad(n)}`;

// 게임필드 복제 셀렉트
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

type Secret = {
  num: number;
  jaName: string;
  rarityId: string;
  baseRcId: string | null;   // 같은 세트 본문 RegionCard id (게임필드 출처)
  externalLcId: string | null; // in-set 본문 없을 때 외부 동일 논리카드 LC id
  url: string;
  flag?: string;
};

const SECRETS: Secret[] = [
  { num: 57, jaName: "パルキアGX",       rarityId: HR, baseRcId: "jp-tcg-SM5+-010", externalLcId: null, url: "https://static.tcgcollector.com/content/images/92/2c/b5/922cb57cdffee7a5496ccbfd6e9662dcbfa7bc0a55060c69f327a7b6b12de97f.jpg" },
  { num: 58, jaName: "アーゴヨンGX",     rarityId: HR, baseRcId: "jp-tcg-SM5+-023", externalLcId: null, url: "https://static.tcgcollector.com/content/images/fb/c2/86/fbc286c97c29e2f484ede5a7749d6f7a85847d7abb1e709fd59d0112b42eeb43.jpg" },
  { num: 59, jaName: "ルカリオGX",       rarityId: HR, baseRcId: "jp-tcg-SM5+-030", externalLcId: null, url: "https://static.tcgcollector.com/content/images/21/81/40/2181408d4047fb2890b659a63a5d00f63f401d09164a42c6a2c40b09553af0c8.jpg" },
  { num: 60, jaName: "ディアルガGX",     rarityId: HR, baseRcId: "jp-tcg-SM5+-035", externalLcId: null, url: "https://static.tcgcollector.com/content/images/0d/de/d6/0dded65a1303a718f67d27bd6678c7523d6bab6aceec62e6b0c2de92a74c1e07.jpg" },
  { num: 61, jaName: "エネルギーリサイクル", rarityId: UR, baseRcId: null, externalLcId: "lc-jp-tcg-SMC-011", url: "https://static.tcgcollector.com/content/images/53/8b/db/538bdbc0066fce2343dfb147531b15ecd5358f04c255cdc56634ea00d3d418fb.jpg", flag: "in-set 본문 없음 → 동일 논리카드(jp-tcg-SMC-011, gameCardId gc_01bf16befe62c022303a)에서 복제" },
  { num: 62, jaName: "ビーストリング",   rarityId: UR, baseRcId: "jp-tcg-SM5+-041", externalLcId: null, url: "https://static.tcgcollector.com/content/images/1a/42/a0/1a42a011d26efd3d3800a50a0879ca07aa2d1340672968e9322bec3f1dccd96f.jpg" },
  { num: 63, jaName: "鋼鉄のフライパン", rarityId: UR, baseRcId: "jp-tcg-SM5+-042", externalLcId: null, url: "https://static.tcgcollector.com/content/images/b7/3d/15/b73d155b61eedd57444bb523ca22fac8176ffe7bab2d37485dfca59faaf86e73.jpg" },
];

async function main() {
  assertWritable([CARD_PACK_ID], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm5plus-secrets" });

  // 가드: 번호가 모두 currentMax(56) 초과 + DB 미존재여야
  const baseline = await prisma.regionCard.count({ where: { setId: JP_SET } });
  const totalPackBefore = await prisma.regionCard.count({ where: { set: { cardPackId: CARD_PACK_ID } } });
  const maxBefore = (await prisma.regionCard.aggregate({ where: { setId: JP_SET }, _max: { numberInt: true } }))._max.numberInt ?? 0;
  console.log(`baseline JP=${baseline} totalPack=${totalPackBefore} maxBefore=${maxBefore}`);

  for (const s of SECRETS) {
    if (s.num <= maxBefore) throw new Error(`#${s.num} ${s.jaName} 가 currentMax(${maxBefore}) 이하 — FLAG`);
    const exists = await prisma.regionCard.findUnique({ where: { id: rcId(s.num) }, select: { id: true } });
    if (exists) throw new Error(`#${s.num} 이미 존재 (${rcId(s.num)}) — FLAG`);
  }

  // 게임필드 로드
  const plan = [];
  for (const s of SECRETS) {
    let game: any;
    let src: string;
    if (s.baseRcId) {
      const b = await prisma.regionCard.findUnique({ where: { id: s.baseRcId }, select: { name: true, card: { select: GAME } } });
      if (!b?.card) throw new Error(`본문 RegionCard ${s.baseRcId} (시크릿 #${s.num}) DB 없음 — FLAG`);
      game = b.card; src = s.baseRcId;
    } else if (s.externalLcId) {
      const lc = await prisma.card.findUnique({ where: { id: s.externalLcId }, select: GAME });
      if (!lc) throw new Error(`외부 LC ${s.externalLcId} (시크릿 #${s.num}) DB 없음 — FLAG`);
      game = lc; src = s.externalLcId;
    } else {
      throw new Error(`#${s.num} 복제 출처 없음 — FLAG`);
    }
    plan.push({ ...s, game, src });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan)
    console.log(`  #${pad(p.num)} ${p.jaName} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp ?? "-"} ${p.rarityId === UR ? "UR" : "HR"}  ← ${p.src}${p.flag ? `  ⚠${p.flag}` : ""}  img=${p.url.slice(-16)}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const g = p.game;
      const lcData = {
        cardPackId: CARD_PACK_ID, primarySetId: JP_SET, primaryNumber: pad(p.num), primaryNumberInt: p.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId(p.num) }, create: { id: lcId(p.num), ...lcData }, update: lcData });

      const rc = {
        cardId: lcId(p.num), language: "ja", region: "JP", setId: JP_SET,
        number: pad(p.num), numberInt: p.num, name: p.jaName,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId(p.num) }, create: { id: rcId(p.num), ...rc }, update: rc });
    }
  });

  const after = await prisma.regionCard.count({ where: { setId: JP_SET } });
  const totalPackAfter = await prisma.regionCard.count({ where: { set: { cardPackId: CARD_PACK_ID } } });
  console.log(`\n✅ 기록 완료. JP ${baseline}→${after} (+${after - baseline}) · totalPack ${totalPackBefore}→${totalPackAfter} (+${totalPackAfter - totalPackBefore})`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
