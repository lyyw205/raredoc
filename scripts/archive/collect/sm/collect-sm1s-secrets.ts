// コレクションサン (og-sm1s / jp-tcg-SM1S) JP 누락 시크릿 #67~73 수집 — 게임필드 복제 + 일러(이미지) 채움.
//
// SM1S 본문+SR 은 #1~66 까지 DB 보유(maxNum=66). #67~73(7장)이 미수집 시크릿.
//   #067~070 = HR(무지개, GX 4장) · #071~073 = UR(골드, 트레이너2+에너지1).
//   전부 본문 카드의 alt-art 재록 → 게임데이터는 본문과 동일. 번호·레어도·일러만 다름.
//
// 번호·이름·레어도는 사용자제공 tcgcollector 일러를 Read 로 직독해 확정(이미지에 "SM1S A NNN/060 HR/UR" 인쇄):
//   67 ラプラスGX HR(067/060) / 68 エーフィGX HR(068/060) / 69 ソルガレオGX HR(069/060) /
//   70 デカグースGX HR(070/060) / 71 ハイパーボール UR(071/060) / 72 ロトム図鑑 UR(072/060) /
//   73 基本鋼エネルギー UR(073/060).
//
// 본문 매칭(jpSet 내 같은 이름·낮은번호 우선):
//   67←#16 ラプラスGX / 68←#24 エーフィGX / 69←#40 ソルガレオGX / 70←#50 デカグースGX / 72←#56 ロトム図鑑.
//   71 ハイパーボール·73 基本鋼エネルギー 은 SM1S 본문에 없음 → 동일 gameCardId 의 타세트 본문에서 게임필드 복제(FLAG).
//
// EN/KR: en-tcg-sm1(Sun & Moon) 에 동명 시크릿(#151 Lapras-GX 등)이 있으나 그것은 *별개 물리 프린트(EN 본세트)*로
//   이미 독립 LC 로 카탈로그됨 → JP コレクションサン 시크릿 LC 에 붙이지 않음. KR(kr-sm1s)엔 시크릿 없음(max66).
//   → 신규 시크릿은 모두 JP 단독.
// og-sm1s 는 동결 목록 비대상. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const JP_SET = "jp-tcg-SM1S";
const CARD_PACK = "og-sm1s";
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare (tier 9)
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8)

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

// 시크릿 정의. base = jpSet 내 본문번호(있으면). fallbackGcId = 본문 없을 때 동일 게임카드(타세트)로 복제.
type Sec = { sec: number; name: string; rarityId: string; url: string; base?: number; fallbackGcId?: string };
const SECRETS: Sec[] = [
  { sec: 67, name: "ラプラスGX",       rarityId: HR, base: 16, url: "https://static.tcgcollector.com/content/images/3a/52/80/3a52801be3904a296dd10a10b6d6cd8604dc6fe73c2ed2bce0dc3296d18e5643.jpg" },
  { sec: 68, name: "エーフィGX",       rarityId: HR, base: 24, url: "https://static.tcgcollector.com/content/images/0d/3b/69/0d3b697ca929dfdf21c6cfd27c782d31aef3d5a480b7f4be79816cea73cd710a.jpg" },
  { sec: 69, name: "ソルガレオGX",     rarityId: HR, base: 40, url: "https://static.tcgcollector.com/content/images/ce/d3/97/ced3973d562b2af2305be6924c12ffbc9db6d492f9f550077e40bf98b36a8346.jpg" },
  { sec: 70, name: "デカグースGX",     rarityId: HR, base: 50, url: "https://static.tcgcollector.com/content/images/f1/26/d5/f126d587b5526eba635d91f5cbff4034cade364307a3b818e0a08a753f0d30ae.jpg" },
  { sec: 71, name: "ハイパーボール",   rarityId: UR, fallbackGcId: "gc_2a8c80823b62486a6119", url: "https://static.tcgcollector.com/content/images/13/3b/8f/133b8f3a4e9dc49d15c61bbaee76231f5d941ff44aa48e0b03622c0e15e1aa2c.jpg" },
  { sec: 72, name: "ロトム図鑑",       rarityId: UR, base: 56, url: "https://static.tcgcollector.com/content/images/7d/06/7e/7d067eca118c6472d9320790b28261036a6991c2f30205fdb03bcec90d4cfe31.jpg" },
  { sec: 73, name: "基本鋼エネルギー", rarityId: UR, fallbackGcId: "gc_0daf4137b29fbd3931c4", url: "https://static.tcgcollector.com/content/images/79/08/a8/7908a81850021c2fc9e4a9ea0fffc36cb4a318bfa4ca4b34f4dca43183ff1948.jpg" },
];

async function loadGame(s: Sec) {
  if (s.base != null) {
    const b = await prisma.regionCard.findFirst({
      where: { setId: JP_SET, numberInt: s.base, name: s.name },
      select: { numberInt: true, name: true, card: { select: GAME } },
    });
    if (!b?.card) throw new Error(`본문 #${s.base} "${s.name}" (시크릿 #${s.sec}) DB 없음/이름불일치`);
    return { src: `${JP_SET}#${s.base}`, game: b.card };
  }
  // fallback: 동일 게임카드(타세트). nameKo 보유 행을 우선.
  const cands = await prisma.regionCard.findMany({
    where: { region: "JP", name: s.name, card: { gameCardId: s.fallbackGcId } },
    select: { setId: true, number: true, card: { select: GAME } },
    orderBy: { setId: "asc" },
  });
  if (!cands.length) throw new Error(`fallback 게임카드 ${s.fallbackGcId} "${s.name}" (시크릿 #${s.sec}) DB 없음`);
  const pick = cands.find((c) => c.card?.nameKo) ?? cands[0];
  return { src: `${pick.setId}#${pick.number} (gcid ${s.fallbackGcId})`, game: pick.card! };
}

async function main() {
  assertWritable([CARD_PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm1s-secrets" });

  const plan = [];
  for (const s of SECRETS) {
    const { src, game } = await loadGame(s);
    plan.push({ ...s, src, game });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan)
    console.log(`  #${p.sec} ${p.name} [${p.rarityId === HR ? "HR" : "UR"}] st=${p.game.supertype} sub=${JSON.stringify(p.game.subtypes)} hp=${p.game.hp} gcid=${p.game.gameCardId} nameKo=${p.game.nameKo}  ← ${p.src}`);

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
