// SKY LEGEND / スカイレジェンド (og-sm10b) JP 누락 시크릿 #63~69 수집 — 이미지 포함.
//
// 본문+SR 은 #62 까지 DB 보유(currentMax=62). #63~69(7장)이 미수집 시크릿.
//   #63~66 = HR(무지개) Pokémon-GX · #67~69 = UR(골드) Trainer/Energy.
// 전부 본문 카드의 alt-art 재록이라 게임데이터=본문 동일 → 대응 본문(같은 이름·낮은 번호)의 메타 복제.
//   번호·레어도·이미지만 새로 부여.
//
// 시각 확인(이미지 직독)으로 인쇄번호·JP명·레어도 확정:
//   #63 モクロー&アローラ ナッシーGX HR (063/054)  ← 본문 #1
//   #64 ケルディオGX           HR (064/054)  ← 본문 #19
//   #65 アーゴヨンGX           HR (065/054)  ← 본문 #34
//   #66 ファイヤー&サンダー&フリーザーGX HR (066/054) ← 본문 #35
//   #67 Uターンボード         UR (067/054)  ← 본문 #46 (Trainer/Pokémon Tool)
//   #68 トキワの森           UR (068/054)  ← 본문 매칭 실패(SM10b 본문에 없음) → FLAG, 이미지 최소 채움(Trainer/Stadium)
//   #69 リサイクルエネルギー   UR (069/054)  ← 본문 #50 (Energy/Special)
//
// EN/KR: 본문 LC 는 KR(kr-sm10b)·일부 EN(en-tcg-sm11) 프린트 보유하나, 모두 본문 레어도(GX/Item).
//   이 HR/UR 시크릿은 JP 단독(KR Sky Legend 은 62 에서 끊김, EN 은 별개 합본셋 Unified Minds 의 일반판) → JP 단독 유지.
//
// og-sm10b 는 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const CARD_PACK = "og-sm10b";
const JP_SET = "jp-tcg-SM10b";
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare

type Plan = {
  sec: number;
  base: number | null; // null = 본문 매칭 실패(FLAG)
  jaName: string;
  rarityId: string;
  url: string;
};

// 시각 확인 완료(이미지 직독). url = tcgcollector(핫링크 허용). 도감순 = 콜렉션번호순 63~69.
const PLAN: Plan[] = [
  { sec: 63, base: 1,  jaName: "モクロー&アローラ ナッシーGX",       rarityId: HR, url: "https://static.tcgcollector.com/content/images/65/ae/0f/65ae0f4e6c82d10679c2bc25a7ba395c8d87966c0647a2201c77d49ccb33dde0.jpg" },
  { sec: 64, base: 19, jaName: "ケルディオGX",                     rarityId: HR, url: "https://static.tcgcollector.com/content/images/fd/68/4b/fd684bfa571a5b7b9413d511760fb024828a1b21c66ead2a3036325f2013bfb3.jpg" },
  { sec: 65, base: 34, jaName: "アーゴヨンGX",                     rarityId: HR, url: "https://static.tcgcollector.com/content/images/8b/d7/86/8bd7869bbfcc6bf27e2064741d0d7f61779577c6b5e71ad8753c6714b44efe29.jpg" },
  { sec: 66, base: 35, jaName: "ファイヤー&サンダー&フリーザーGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/f8/6b/99/f86b9967bbb9779394e703b6b9c954960468efe08546d254720646831a2adef8.jpg" },
  { sec: 67, base: 46, jaName: "Uターンボード",                   rarityId: UR, url: "https://static.tcgcollector.com/content/images/e1/ee/c4/e1eec45c3261d9ba9d70fb0a048a05b2246dec3fc67f0b3acb439f0289574217.jpg" },
  { sec: 68, base: null, jaName: "トキワの森",                     rarityId: UR, url: "https://static.tcgcollector.com/content/images/89/7b/d8/897bd8ec866463db74754d124bd06d8a6c032068b35ec1174031b924ec3ce52e.jpg" },
  { sec: 69, base: 50, jaName: "リサイクルエネルギー",             rarityId: UR, url: "https://static.tcgcollector.com/content/images/ed/16/f7/ed16f7df8a35977e6f62b4345fb79b692383f407abd106ceeb002f2cb7dae468.jpg" },
];

const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([CARD_PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm10b-secrets" });

  // 가드: 모든 sec > currentMax(62) + DB 미존재
  const currentMax = await prisma.regionCard.aggregate({ where: { setId: JP_SET }, _max: { numberInt: true } });
  console.log(`\njpSet ${JP_SET} currentMax = ${currentMax._max.numberInt}`);
  for (const p of PLAN) {
    if (p.sec <= (currentMax._max.numberInt ?? 0)) throw new Error(`#${p.sec} <= currentMax — FLAG`);
    const existing = await prisma.regionCard.findUnique({ where: { id: `${JP_SET}-${p.sec}` }, select: { id: true } });
    if (existing) throw new Error(`#${p.sec} 이미 DB 존재 — FLAG`);
  }

  // 본문 매칭(같은 이름·낮은 번호) — null base 는 건너뜀(FLAG)
  const baseNums = PLAN.filter((p) => p.base != null).map((p) => p.base!) as number[];
  const bases = await prisma.regionCard.findMany({
    where: { setId: JP_SET, numberInt: { in: baseNums } },
    select: { numberInt: true, name: true, card: { select: GAME } },
  });
  const byNum = new Map(bases.map((b) => [b.numberInt!, b]));

  type Resolved = { p: Plan; game: typeof bases[number]["card"] | null; flag: boolean };
  const resolved: Resolved[] = PLAN.map((p) => {
    if (p.base == null) return { p, game: null, flag: true };
    const b = byNum.get(p.base);
    if (!b) throw new Error(`본문 #${p.base} (시크릿 #${p.sec}) DB 없음 — FLAG`);
    return { p, game: b.card!, flag: false };
  });

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${resolved.length}장 ===`);
  for (const r of resolved) {
    const rar = r.p.rarityId === HR ? "HR" : r.p.rarityId === UR ? "UR" : r.p.rarityId;
    if (r.flag) {
      console.log(`  #${r.p.sec} ${r.p.jaName} [${rar}]  ⚠ FLAG: 본문 매칭 실패 → 최소 채움(Trainer/Stadium)`);
    } else {
      const g = r.game!;
      console.log(`  #${r.p.sec} ${r.p.jaName} [${g.supertype} ${JSON.stringify(g.subtypes)}] HP${g.hp} ${rar}  ← 본문 #${r.p.base}`);
    }
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const r of resolved) {
      const p = r.p;
      const lcId = `lc-orphan-${JP_SET}-${p.sec}`;
      let lcData: Record<string, unknown>;
      if (r.flag) {
        // 본문 매칭 실패 — 이미지 직독 최소 채움(트키와의 숲 = Trainer/Stadium). 게임필드는 비움.
        lcData = {
          cardPackId: CARD_PACK, primarySetId: JP_SET, primaryNumber: String(p.sec), primaryNumberInt: p.sec,
          supertype: "Trainer", subtypes: ["Stadium"], types: [], hp: null, retreatCost: null,
          weakness: null, resistance: null, regulationMark: null, pokedexNumbers: [],
          rules: [], flavorText: null, abilities: undefined, attacks: undefined,
          legalities: undefined, evolvesFrom: null, evolvesTo: [],
          gameCardId: null, nameKo: null, rarityId: p.rarityId, illustrator: null,
        };
      } else {
        const g = r.game!;
        lcData = {
          cardPackId: CARD_PACK, primarySetId: JP_SET, primaryNumber: String(p.sec), primaryNumberInt: p.sec,
          supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
          weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
          rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
          legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
          gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null,
        };
      }
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });

      const rcId = `${JP_SET}-${p.sec}`;
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JP_SET,
        number: String(p.sec), numberInt: p.sec, name: p.jaName,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
