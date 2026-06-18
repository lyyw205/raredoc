// コレクションムーン / 문 컬렉션 (og-sm1m) JP 누락 시크릿 #67~73 수집 — 이미지 포함.
//
// SM1M 본문+SR(1..66)은 이미 DB(jp-tcg-SM1M). #67~73(7장)이 미수집 시크릿:
//   #67~70 HR(무지개) GX 4장 · #71~72 UR(골드) 트레이너 2장 · #73 UR(골드) 기본 초에너지.
// 전부 본문 카드의 alt-art 재록 → 대응 본문(같은 이름·낮은 번호)의 게임필드를 복제, 번호·레어도·이미지만 새로.
// 번호/레어도는 이미지에서 직접 확인(067/060 HR ... 073/060 UR).
// EN/KR: 이 JP HR/UR 무지개/골드 시크릿의 동일 프린트는 우리 DB에 없음(KR kr-sm1m 은 #66에서 끝, EN 시크릿은
//   별도 LC 로 이미 모델링된 다른 프린트) → 전부 JP 단독 유지.
// og-sm1m 은 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare

const JPSET = "jp-tcg-SM1M";
const CARD_PACK = "og-sm1m";

// 이미지에서 시각 확인 완료: 번호 · JP명 · 레어도 · tcgcollector URL(imageSmall=imageLarge).
//   baseInSet = jpSet 내 본문(낮은번호) 매칭. #73 기본에너지는 본문이 jpSet 에 없어 fallbackBaseRC 로 게임필드 복제(FLAG).
type Sec = { num: number; jaName: string; rarityId: string; baseNum: number | null; url: string; fallbackBaseRC?: string };
const SECRETS: Sec[] = [
  { num: 67, jaName: "ラランテスGX", rarityId: HR, baseNum: 6, url: "https://static.tcgcollector.com/content/images/01/75/9a/01759aa61062dd514a8077465c6666bf96344ba64a6c1d8a57b77c0429aa6f4e.jpg" },
  { num: 68, jaName: "ルナアーラGX", rarityId: HR, baseNum: 28, url: "https://static.tcgcollector.com/content/images/f1/84/ff/f184ff319f867920674e3e3cadae7b528efb6effd0eeafafb7eb53b1d6c3bbe1.jpg" },
  { num: 69, jaName: "ブラッキーGX", rarityId: HR, baseNum: 37, url: "https://static.tcgcollector.com/content/images/1b/36/3b/1b363bf623d51708afb7c9b155f5dd9a3fd1717a57aff64989de0efc931e4c00.jpg" },
  { num: 70, jaName: "ケンタロスGX", rarityId: HR, baseNum: 47, url: "https://static.tcgcollector.com/content/images/6d/d6/fe/6dd6feb0b85377a6cabb3b037b9aa4ba928c78dc61c26016003a00ba7ebffdbc.jpg" },
  { num: 71, jaName: "ネストボール", rarityId: UR, baseNum: 55, url: "https://static.tcgcollector.com/content/images/c5/85/33/c58533f255943dcf1fcc0020f7b5fa007d4c14767a33e9d5e6d40383e33a68d2.jpg" },
  { num: 72, jaName: "ポケモンいれかえ", rarityId: UR, baseNum: 56, url: "https://static.tcgcollector.com/content/images/02/ae/e1/02aee1d96df136a112d675545e80667265ff6972112ea1b5a9093da23818bad0.jpg" },
  // #73 기본 초에너지: 본문이 jpSet 에 없음 → 정본 기본에너지(jp-sv-151#210) 게임필드 복제. FLAG.
  { num: 73, jaName: "基本超エネルギー", rarityId: UR, baseNum: null, url: "https://static.tcgcollector.com/content/images/fc/ad/cf/fcadcf622d036e422fd432834bc9cb1119a6424f34a770f2ba087674d42a6eed.jpg", fallbackBaseRC: "jp-sv-151-210" },
];

const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([CARD_PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm1m-secrets" });

  // 본문 게임필드 로드
  const plan = [] as { sec: Sec; game: any; baseLabel: string }[];
  for (const sec of SECRETS) {
    let base;
    let baseLabel: string;
    if (sec.baseNum != null) {
      base = await prisma.regionCard.findFirst({
        where: { setId: JPSET, numberInt: sec.baseNum, name: sec.jaName },
        select: { numberInt: true, name: true, card: { select: GAME } },
      });
      baseLabel = `본문 #${sec.baseNum}`;
    } else {
      base = await prisma.regionCard.findUnique({
        where: { id: sec.fallbackBaseRC! },
        select: { numberInt: true, name: true, card: { select: GAME } },
      });
      baseLabel = `폴백 ${sec.fallbackBaseRC} (FLAG: jpSet 내 본문 없음)`;
    }
    if (!base?.card) throw new Error(`#${sec.num} ${sec.jaName}: 본문(${baseLabel}) DB 없음`);
    plan.push({ sec, game: base.card, baseLabel });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan) {
    const rcode = p.sec.rarityId === HR ? "HR" : p.sec.rarityId === UR ? "UR" : "?";
    console.log(`  #${p.sec.num} ${p.sec.jaName} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp ?? "-"} ${rcode}  ← ${p.baseLabel}  img=…${p.sec.url.slice(-16)}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const { sec, game: g } of plan) {
      const lcId = `lc-orphan-${JPSET}-${sec.num}`;
      const rcId = `${JPSET}-${sec.num}`;
      const lcData = {
        cardPackId: CARD_PACK, primarySetId: JPSET, primaryNumber: String(sec.num), primaryNumberInt: sec.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: sec.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JPSET,
        number: String(sec.num), numberInt: sec.num, name: sec.jaName,
        imageSmall: sec.url, imageLarge: sec.url, rarityId: sec.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
