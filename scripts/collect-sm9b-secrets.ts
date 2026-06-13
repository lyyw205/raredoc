// フルメタルウォール (og-sm9b) JP 누락 시크릿 #63~69 수집 — 이미지 URL 포함.
//
// 본문+SR 은 #1~62 까지 DB에 있음(currentMax=62). #63~69(7장)이 미수집 시크릿.
//   #63~66 = HR(무지개, TAG TEAM/GX alt-art) · #67~69 = UR(골드, 트레이너 alt-art).
// 전부 본문 카드의 alt-art 재록 → 대응 본문(같은 이름·낮은 번호)의 게임필드 복제, 번호·레어도·이미지만 신규.
//   매핑·레어도·번호는 사용자 제공 tcgcollector 이미지를 직접 눈으로 확인해 확정:
//     63 フェローチェ&マッシブーンGX HR ←본문#1
//     64 カメックスGX               HR ←본문#10
//     65 ルカリオ&メルメタルGX       HR ←본문#29
//     66 テッカグヤGX               HR ←본문#43
//     67 ビーストブリンガー         UR ←본문#45 (Trainer/Pokémon Tool)
//     68 メタルコアバリア           UR ←본문#46 (Trainer/Pokémon Tool)
//     69 テンガン山                 UR ← 본문(in-set) 없음 → FLAG. 게임필드는 동일 oracle 카드
//        (gameCardId=gc_35e2593dc565daba5a1f, 다른 SM 세트의 テンガン山/천관산 = Mt. Coronet, Trainer/Stadium)에서 복제.
//   RegionCard.name 은 본문 표기(ASCII '&')와 동일하게 저장 — GX/TAG TEAM 카드.
//   tcgcollector CDN 은 핫링크 허용. imageSmall=imageLarge=동일 URL.
// og-sm9b 는 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const JP_SET = "jp-tcg-SM9b";
const CARD_PACK = "og-sm9b";
const CURRENT_MAX = 62;

const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare (tier 9)
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8)

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

type Plan = {
  sec: number;
  name: string; // RegionCard 에 저장할 JP 이름(본문 표기 기준)
  rarityId: string;
  url: string;
  baseNumber: number | null; // in-set 본문 번호(없으면 null → FLAG)
  game: any;
  flag?: string;
};

// 이미지에서 확정한 시크릿 — 본문 in-set 번호(GX/TAG TEAM 은 ASCII '&' 본문명으로 매칭) + URL
const SECRETS: { sec: number; baseNumber: number | null; baseName: string; rarityId: string; url: string }[] = [
  { sec: 63, baseNumber: 1,  baseName: "フェローチェ&マッシブーンGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/e8/93/58/e89358231b1aae59cae52623a445261ae0117d121b4510e2a7f3c46bfbe6ad82.jpg" },
  { sec: 64, baseNumber: 10, baseName: "カメックスGX",               rarityId: HR, url: "https://static.tcgcollector.com/content/images/2c/b2/48/2cb24808d082a93a15902132c85ba0c81654c6149e305fe072937ce9c4662f11.jpg" },
  { sec: 65, baseNumber: 29, baseName: "ルカリオ&メルメタルGX",       rarityId: HR, url: "https://static.tcgcollector.com/content/images/4e/ae/80/4eae80af12276ce4d6c7ebf9d2e8aaf37a867ba28d00bd77ae2fc5411094dc55.jpg" },
  { sec: 66, baseNumber: 43, baseName: "テッカグヤGX",               rarityId: HR, url: "https://static.tcgcollector.com/content/images/bc/45/ab/bc45ab17dbaedd1111ed623e5049141f2eb59ed9f40236f70ed9758f23ff469c.jpg" },
  { sec: 67, baseNumber: 45, baseName: "ビーストブリンガー",         rarityId: UR, url: "https://static.tcgcollector.com/content/images/e6/b9/9c/e6b99c92da9fb39ff8ba44db9d5123b90be29aff7d960606809008785e878fa2.jpg" },
  { sec: 68, baseNumber: 46, baseName: "メタルコアバリア",           rarityId: UR, url: "https://static.tcgcollector.com/content/images/07/a8/5b/07a85b7b099fbe6355e930eb54bd65f9d6d0a32743884be4f590eb9bcaa6d1d9.jpg" },
  // #69 テンガン山: in-set 본문 없음(이 세트엔 무인발전소만 Stadium). 게임필드는 동일 oracle(타 세트 テンガン山)에서 복제.
  { sec: 69, baseNumber: null, baseName: "テンガン山",               rarityId: UR, url: "https://static.tcgcollector.com/content/images/f4/7d/dd/f47ddd86d2fdc2045c47c65ecbb5fdc46280d58e8234db97005fee988f1d1758.jpg" },
];

async function main() {
  assertWritable([CARD_PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm9b-secrets" });

  // STEP3 가드: 모두 currentMax 초과 + DB 미존재
  for (const s of SECRETS) {
    if (s.sec <= CURRENT_MAX) throw new Error(`#${s.sec} 가 currentMax(${CURRENT_MAX}) 이하 — 중단`);
    const ex = await prisma.regionCard.findUnique({ where: { id: `${JP_SET}-${s.sec}` }, select: { id: true } });
    if (ex) throw new Error(`#${s.sec} 이미 DB 존재(${ex.id}) — 중단`);
  }

  const plan: Plan[] = [];
  for (const s of SECRETS) {
    if (s.baseNumber != null) {
      // in-set 본문 매칭
      const b = await prisma.regionCard.findFirst({
        where: { setId: JP_SET, numberInt: s.baseNumber, name: s.baseName },
        select: { numberInt: true, name: true, card: { select: GAME } },
      });
      if (!b || !b.card) throw new Error(`본문 #${s.baseNumber} "${s.baseName}" (시크릿 #${s.sec}) DB 없음`);
      plan.push({ sec: s.sec, name: s.baseName, rarityId: s.rarityId, url: s.url, baseNumber: s.baseNumber, game: b.card });
    } else {
      // in-set 본문 없음 → 동일 oracle 카드(타 세트)에서 게임필드 복제 + FLAG
      const oracle = await prisma.regionCard.findFirst({
        where: { name: s.baseName, card: { gameCardId: "gc_35e2593dc565daba5a1f" } },
        select: { setId: true, number: true, name: true, card: { select: GAME } },
      });
      if (!oracle || !oracle.card) throw new Error(`#${s.sec} "${s.baseName}" oracle 복제원 없음`);
      plan.push({
        sec: s.sec, name: s.baseName, rarityId: s.rarityId, url: s.url, baseNumber: null, game: oracle.card,
        flag: `#${s.sec} ${s.baseName}: in-set 본문 없음 — 동일 oracle 카드(${oracle.setId}#${oracle.number}, gameCardId=${oracle.card.gameCardId})에서 게임필드 복제. FLAG.`,
      });
    }
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan) {
    const rar = p.rarityId === HR ? "HR" : p.rarityId === UR ? "UR" : p.rarityId;
    console.log(`  #${p.sec} ${p.name} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp ?? "-"} ${rar}  ← 본문 ${p.baseNumber ?? "(in-set 없음/oracle 복제)"}  gameCardId=${p.game.gameCardId ?? "null"}`);
  }
  const flags = plan.filter(p => p.flag).map(p => p.flag!);
  if (flags.length) { console.log("\n--- FLAGS ---"); for (const f of flags) console.log("  ⚠ " + f); }

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
        number: String(p.sec), numberInt: p.sec, name: p.name,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
