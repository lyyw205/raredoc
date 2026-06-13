// 禁断の光 (og-sm6 / jp-tcg-SM6) JP 누락 시크릿 #103~110 수집 — 이미지 포함.
//
// SM6 본문+SR 은 #1~102 까지 이미 DB(currentMax=102). #103~110(8장)이 미수집 시크릿.
//   #103~107 = HR(레인보우/하이퍼레어, GX 5장) · #108~110 = UR(골드, 트레이너2 + 특수에너지1).
// 전부 본문 카드의 alt-art 재록 → 게임데이터는 본문과 동일. 시크릿마다 대응 본문(같은 jaName·낮은번호)
//   의 메타데이터를 복제하고 번호·레어도·이미지만 새로 부여. (collect-sm12a-secrets 패턴 그대로 + 이미지 포함)
// 번호·jaName·레어도는 /tmp/금단의빛/{i}.jpg 인쇄본을 직접 눈으로 읽어 확정(103/094 HR … 110/094 UR).
//   #110 인쇄명은 아이콘으로 'ユニットエネルギー闘悪フェアリー'(본문 #94 동일) — 본문 정본명 사용.
// 이미지: 사용자 제공 tcgcollector URL(도감순 = 콜렉션번호순 103~110). imageSmall=imageLarge=동일 URL.
// EN/KR: kr-sm6 는 시크릿 영역 없음(max 102). EN 골드시크릿(en #142 Eneporter, #145 Mysterious Treasure)은
//   별도 EN-단독 orphan LC 로 이미 존재 → 정체성 머지는 본 작업 범위 밖 → JP 단독 유지(FLAG 보고).
// og-sm6 는 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare
const SR = "cmpp4wyyk001ryjurevrx3dq0"; // Secret Rare (참고)

const JP_SET = "jp-tcg-SM6";
const PACK = "og-sm6";

// 이미지에서 직접 확인: 시크릿번호 → {본문번호, jaName, rarity, url}
const PLAN: { sec: number; base: number; jaName: string; rarityId: string; url: string }[] = [
  { sec: 103, base: 20, jaName: "ゲッコウガGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/fe/e1/3f/fee13f9941a20eef2a96cdb13834941760c5dd05ad00b22049e1022b6189aff8.jpg" },
  { sec: 104, base: 50, jaName: "ジガルデGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/89/d5/48/89d5487825009917cc794a05ed6f8e7b501de88f76339bd116808ead83b55c3b.jpg" },
  { sec: 105, base: 55, jaName: "イベルタルGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/78/5a/89/785a894b63bb6fdbab03c0c9cc47539b33c20cd78434f0239920ec42bb30f080.jpg" },
  { sec: 106, base: 64, jaName: "ゼルネアスGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/47/b3/5b/47b35b18765f2a4e1cbc597076eae521e59b68532da4ac22e5629f23c3d083b7.jpg" },
  { sec: 107, base: 69, jaName: "ウルトラネクロズマGX", rarityId: HR, url: "https://static.tcgcollector.com/content/images/2a/25/70/2a25701182538ec9a5f6fec3128e5f6788aa460b1ded73ea2dea382b1a163b53.jpg" },
  { sec: 108, base: 76, jaName: "エネポーター", rarityId: UR, url: "https://static.tcgcollector.com/content/images/3f/dd/f9/3fddf9e1226b50d7d809232b80661bd4e5c6b540e980b3937cfa26efa674258b.jpg" },
  { sec: 109, base: 83, jaName: "ミステリートレジャー", rarityId: UR, url: "https://static.tcgcollector.com/content/images/20/e6/85/20e685db374626796aa2aa738fc891207e6561a622c08ed3c85af84613fc5554.jpg" },
  { sec: 110, base: 94, jaName: "ユニットエネルギー闘悪フェアリー", rarityId: UR, url: "https://static.tcgcollector.com/content/images/39/ec/2e/39ec2eb7ce022420cbb9ee89951470325d2e4915d90b908359cd117d826db15a.jpg" },
];

// 본문에서 복제할 게임필드(인쇄본 무관 = 동일) — collect-sm12a-secrets GAME 동일
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm6-secrets" });

  const baseNums = [...new Set(PLAN.map((p) => p.base))];
  const bases = await prisma.regionCard.findMany({
    where: { setId: JP_SET, numberInt: { in: baseNums } },
    select: { numberInt: true, name: true, card: { select: GAME } },
  });
  const byNum = new Map(bases.map((b) => [b.numberInt!, b]));

  const plan = PLAN.map((p) => {
    const b = byNum.get(p.base);
    if (!b) throw new Error(`본문 #${p.base} (시크릿 #${p.sec}) DB 없음`);
    // jaName 검증: 본문 RegionCard name 과 일치해야 함(이미지에서 읽은 이름 == 본문)
    if (b.name !== p.jaName) {
      console.warn(`  ⚠ #${p.sec}: 이미지명 "${p.jaName}" ≠ 본문 #${p.base} name "${b.name}" — 본문 정본명 사용`);
    }
    return { ...p, name: b.name, game: b.card! };
  });

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 (이미지 포함) ===`);
  for (const p of plan)
    console.log(`  #${p.sec} ${p.name} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp ?? "-"} ${p.rarityId === UR ? "UR" : p.rarityId === HR ? "HR" : "?"}  ← 본문 #${p.base}  img:${p.url.slice(-16)}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JP_SET}-${p.sec}`;
      const g = p.game;
      const lcData = {
        cardPackId: PACK, primarySetId: JP_SET, primaryNumber: String(p.sec), primaryNumberInt: p.sec,
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
        imageSmall: p.url as string | null, imageLarge: p.url as string | null, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
