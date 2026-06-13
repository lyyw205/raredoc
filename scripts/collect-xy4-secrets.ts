// 팬텀게이트 (og-xy4 / jp-tcg-XY4) JP 누락 시크릿 #096~097 수집 — UR 골드 2장.
//
// XY4 본문은 1..088, #089~095 는 SR 풀아트 시크릿(이미 DB). currentMax=95.
// 미수집 = #096 메가라이볼트EX(UR 골드), #097 메가겐가EX(UR 골드). 둘 다 본문 메가카드의 골드 재록.
//   #096/088 UR ← 본문 #024 メガライボルトEX (HP210, MEGA/EX, gc_cf5f8267359c995c7e1f)
//   #097/088 UR ← 본문 #034 メガゲンガーEX  (HP220, MEGA/EX, gc_4c8cb213116cc7886de0)
// 이미지에서 직독: 인쇄번호 096/088·097/088, 레어도 UR, HP 210/220 (본문과 일치 확인).
// 게임데이터는 본문 메가카드에서 복제(번호·레어도·이미지만 새로). 이름은 본문 정본 표기 "メガ…EX" 사용
//   (인쇄 약식은 "Mライボルト/MゲンガーEX" 이나 동일 카드의 골드 재록이라 DB 컨벤션 정본명을 따른다).
// 레어도: 골드 = Ultra Rare (cmpp4wyzt001wyjuriy5esk1h, ウルトラレア tier8).
// 이미지: tcgcollector url (imageSmall=imageLarge). illustrator=null. KR/EN 대응 없음(JP 단독).
// og-xy4 비동결. dry-run 기본, --apply 로 기록. 단일 $transaction. 멱등 upsert.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-XY4";
const PACK = "og-xy4";
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (gold)

const pad = (n: number) => String(n).padStart(3, "0");

// 시크릿번호 → 본문번호 + 이미지(manifest 순서: 0=메가라이볼트(096), 1=메가겐가(097))
type Sec = { num: number; baseNum: number; img: string };
const SECRETS: Sec[] = [
  { num: 96, baseNum: 24, img: "https://static.tcgcollector.com/content/images/39/43/52/39435254f9253f4a7ed41527378a86372b4460e716b9e52a75e1cdb6420ca417.jpg" }, // メガライボルトEX UR
  { num: 97, baseNum: 34, img: "https://static.tcgcollector.com/content/images/60/86/55/608655f1c62cfd1d2d504fa57e9ef823d4c55ee13369b3bb7183d6a5d873b7a3.jpg" }, // メガゲンガーEX UR
];

const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-xy4-secrets" });

  const baseNums = [...new Set(SECRETS.map((s) => s.baseNum))];
  const bases = await prisma.regionCard.findMany({
    where: { setId: SET, numberInt: { in: baseNums } },
    select: { numberInt: true, name: true, card: { select: GAME } },
  });
  const byNum = new Map(bases.map((b) => [b.numberInt!, b]));

  // 안전 가드: 타깃 번호가 비어 있어야 한다(겹치면 절대 덮어쓰지 않음)
  for (const s of SECRETS) {
    if (s.num <= 95) throw new Error(`#${s.num} 은 currentMax(95) 이하 — FLAG, 중단`);
    const exists = await prisma.regionCard.findFirst({ where: { setId: SET, numberInt: s.num }, select: { id: true, name: true } });
    if (exists) throw new Error(`타깃 #${s.num} 이미 존재(${exists.id} ${exists.name}) — 덮어쓰지 않음, FLAG, 중단`);
  }

  const plan = SECRETS.map((s) => {
    const b = byNum.get(s.baseNum);
    if (!b) throw new Error(`본문 #${s.baseNum} (시크릿 #${s.num}) DB 없음 — 중단`);
    return { ...s, name: b.name, rarityId: UR, game: b.card! };
  });

  console.log(`\n=== 팬텀게이트(XY4) 시크릿 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — ${plan.length}장 (UR 골드) ===`);
  for (const p of plan)
    console.log(`  #${pad(p.num)} ${p.name} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp} UR  ← 본문 #${pad(p.baseNum)}  ko=${p.game.nameKo}  gameCardId=${p.game.gameCardId}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${SET}-${pad(p.num)}`;
      const rcId = `${SET}-${pad(p.num)}`;
      const g = p.game;
      const lcData = {
        cardPackId: PACK, primarySetId: SET, primaryNumber: pad(p.num), primaryNumberInt: p.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: UR, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: SET,
        number: pad(p.num), numberInt: p.num, name: p.name,
        imageSmall: p.img, imageLarge: p.img, rarityId: UR,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
