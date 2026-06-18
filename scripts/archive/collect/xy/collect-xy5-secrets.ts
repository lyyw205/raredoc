// ガイアボルケーノ / 가이아볼케이노 (og-xy5, jp-tcg-XY5) JP 누락 시크릿 #079~080 수집.
//
// XY5 base = #001~070. 이미 수집된 시크릿 #071~078(SR 풀아트 EX/메가/서포트).
// 미수집 시크릿 2장(둘 다 UR 골드 Trainer Goods, 이미지 직독):
//   #079 ポケモンいれかえ (079/070, UR 골드)  — Illus. 5ban Graphics
//   #080 じゃくてんほけん (080/070, UR 골드)  — Illus. Ayaka Yoshida
// 둘 다 currentMax(78) 초과 + DB 미존재 확인 완료. 타깃 id 충돌 없음.
//
// 매칭(STEP 4):
//   #080 じゃくてんほけん → 본문 #063 じゃくてんほけん 인셋 매칭(Trainer/Pokémon Tool, ko=약점보험).
//   #079 ポケモンいれかえ → XY5 본문에 부재(0건). 동일 gameCardId(gc_022d1371dd96010c4828)의
//        XY세대 타세트 프린트 jp-tcg-CP6-077(Trainer/Item, ko=포켓몬 교체, regMark=null)에서 게임필드 복제. → FLAG.
//
// 레어도: 이미지 UR → 'Ultra Rare'(cmpp4wyzt001wyjuriy5esk1h). EN/KR 대응 없음(JP 단독 UR 골드).
// og-xy5 비동결. dry-run 기본, --apply 로 기록. 단일 $transaction. 멱등 upsert.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (gold)
const SET = "jp-tcg-XY5";
const PACK = "og-xy5";
const I = (h: string) =>
  `https://static.tcgcollector.com/content/images/${h.slice(0, 2)}/${h.slice(2, 4)}/${h.slice(4, 6)}/${h}.jpg`;

const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true, weakness: true, resistance: true,
  regulationMark: true, pokedexNumbers: true, rules: true, flavorText: true, abilities: true, attacks: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, gameCardId: true, nameKo: true,
} as const;

type Add = {
  num: number;
  jaName: string;
  rarity: string;
  img: string;
  // 게임필드 복제 소스: 인셋이면 inSetNum, 부재면 cloneRcId(타세트 RC).
  inSetName?: string;
  cloneRcId?: string;
};

const ADDS: Add[] = [
  {
    num: 79,
    jaName: "ポケモンいれかえ",
    rarity: UR,
    img: I("57685ff9f372bac81cd646a7e797c37125ee15d666ab545cdd34eba666d4ead1"),
    cloneRcId: "jp-tcg-CP6-077", // gc_022d1371dd96010c4828, XY세대 Item, regMark=null
  },
  {
    num: 80,
    jaName: "じゃくてんほけん",
    rarity: UR,
    img: I("ba444cd7aca5fd0610f59accb4580e59cfbb15db2b61a85b045ed6ed79cd32b8"),
    inSetName: "じゃくてんほけん", // 본문 #063
  },
];

const pad = (n: number) => String(n).padStart(3, "0");

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-xy5-secrets" });

  // 가드: currentMax 초과 + DB 미존재
  const existing = await prisma.regionCard.findMany({
    where: { setId: SET, numberInt: { in: ADDS.map((a) => a.num) } },
    select: { id: true, numberInt: true },
  });
  if (existing.length) {
    console.error("🛑 타깃 번호가 이미 존재함 — 덮어쓰기 금지:", existing.map((e) => e.id).join(", "));
    process.exit(1);
  }

  const plan: Array<Add & { game: any; matchType: string }> = [];
  for (const a of ADDS) {
    let game: any;
    let matchType: string;
    if (a.inSetName) {
      const rc = await prisma.regionCard.findFirst({
        where: { setId: SET, name: a.inSetName, region: "JP" },
        select: { card: { select: GAME } },
      });
      if (!rc?.card) throw new Error(`인셋 본문 "${a.inSetName}" (#${a.num}) DB 없음`);
      game = rc.card;
      matchType = "in-set";
    } else if (a.cloneRcId) {
      const rc = await prisma.regionCard.findUnique({ where: { id: a.cloneRcId }, select: { name: true, card: { select: GAME } } });
      if (!rc?.card) throw new Error(`클론 소스 ${a.cloneRcId} (#${a.num}) DB 없음`);
      if (rc.name !== a.jaName) throw new Error(`클론 소스 이름 불일치: ${rc.name} != ${a.jaName}`);
      game = rc.card;
      matchType = `cross-set(${a.cloneRcId})`;
    } else {
      throw new Error(`#${a.num} 매칭 소스 미지정`);
    }
    plan.push({ ...a, game, matchType });
  }

  console.log(`\n=== ガイアボルケーノ XY5 시크릿 (${APPLY ? "APPLY" : "DRY-RUN"}) — ${plan.length}장 ===`);
  for (const p of plan)
    console.log(
      `  #${pad(p.num)} ${p.jaName} [${p.game.supertype}/${JSON.stringify(p.game.subtypes)}] ko=${p.game.nameKo} gc=${p.game.gameCardId} UR  ← ${p.matchType}`,
    );

  if (!APPLY) {
    console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)");
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${SET}-${p.num}`;
      const rcId = `${SET}-${pad(p.num)}`;
      const g = p.game;
      const lcData = {
        cardPackId: PACK,
        primarySetId: SET,
        primaryNumber: pad(p.num),
        primaryNumberInt: p.num,
        supertype: g.supertype,
        subtypes: g.subtypes,
        types: g.types,
        hp: g.hp,
        retreatCost: g.retreatCost,
        weakness: g.weakness,
        resistance: g.resistance,
        regulationMark: g.regulationMark,
        pokedexNumbers: g.pokedexNumbers,
        rules: g.rules,
        flavorText: g.flavorText,
        abilities: g.abilities ?? undefined,
        attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined,
        evolvesFrom: g.evolvesFrom,
        evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId,
        nameKo: g.nameKo,
        rarityId: p.rarity,
        illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rc = {
        cardId: lcId,
        language: "ja",
        region: "JP",
        setId: SET,
        number: pad(p.num),
        numberInt: p.num,
        name: p.jaName,
        imageSmall: p.img,
        imageLarge: p.img,
        rarityId: p.rarity,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
