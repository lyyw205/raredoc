// 더블블레이즈 (og-sm10) JP 누락 시크릿 #108~116 수집 — 이미지/일러는 별도 스크립트.
//
// 우리 JP DB(jp-tcg-SM10)는 #107 에서 끊김. 정본 시크릿 #108~116(9장) 미수집.
//   #108~113 = HR(레인보우, 6장) · #114~116 = UR(골드, 3장).
// 전부 본문 alt-art 재록 → 대응 본문(같은 이름·낮은 번호)의 게임필드 복제, 번호·레어도만 새로.
// 이미지 확인(인쇄 번호 "SM10 NNN/095" + 레어도 테두리)으로 number·rarity 확정.
// og-sm10 은 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const CARD_PACK = "og-sm10";
const JP = "jp-tcg-SM10";

const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare

// 이미지에서 시각 확인한 (시크릿번호 -> 본문번호/이름/레어도).
// baseNumber: jpSet 안 본문번호. baseSetId: 본문이 jpSet 에 있으면 JP, 없으면 동일 gameCardId 의 타팩(크로스셋).
type Plan = { sec: number; baseNumber: number | null; baseSetId: string; jaName: string; rarityId: string; note?: string };
const PLAN: Plan[] = [
  { sec: 108, baseNumber: 7,  baseSetId: JP, jaName: "レシラム&リザードンGX", rarityId: HR },
  { sec: 109, baseNumber: 29, baseSetId: JP, jaName: "ベトベトン&アローラ ベトベトンGX", rarityId: HR, note: "이미지 표기는 공백 없음 — DB 정본(공백 포함) 사용" },
  { sec: 110, baseNumber: 42, baseSetId: JP, jaName: "マーシャドー&カイリキーGX", rarityId: HR },
  { sec: 111, baseNumber: 56, baseSetId: JP, jaName: "ドンカラスGX", rarityId: HR },
  { sec: 112, baseNumber: 66, baseSetId: JP, jaName: "エルフーンGX", rarityId: HR },
  { sec: 113, baseNumber: 69, baseSetId: JP, jaName: "ペルシアンGX", rarityId: HR },
  { sec: 114, baseNumber: 83, baseSetId: JP, jaName: "炎の結晶", rarityId: UR },
  // #115: jp-tcg-SM10 본문에 戒めの祠 없음 → 동일 gameCardId 의 크로스셋(jp-tcg-SM7 #94)에서 복제. FLAG.
  { sec: 115, baseNumber: 94, baseSetId: "jp-tcg-SM7", jaName: "戒めの祠", rarityId: UR, note: "in-pack 본문 없음 — 동일 gameCardId 크로스셋(SM7 #94)에서 복제. FLAG." },
  { sec: 116, baseNumber: 91, baseSetId: JP, jaName: "トリプル加速エネルギー", rarityId: UR },
];

const GAME_SELECT = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([CARD_PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm10-secrets" });

  const resolved = [] as {
    sec: number; baseNumber: number; baseSetId: string; name: string; rarityId: string;
    game: any; note?: string;
  }[];

  for (const p of PLAN) {
    const base = await prisma.regionCard.findFirst({
      where: { setId: p.baseSetId, name: p.jaName, numberInt: p.baseNumber ?? undefined },
      orderBy: { numberInt: "asc" },
      select: { numberInt: true, name: true, card: { select: GAME_SELECT } },
    });
    if (!base || !base.card) throw new Error(`본문 매칭 실패: #${p.sec} ${p.jaName} (${p.baseSetId} #${p.baseNumber})`);
    resolved.push({ sec: p.sec, baseNumber: base.numberInt!, baseSetId: p.baseSetId, name: p.jaName, rarityId: p.rarityId, game: base.card, note: p.note });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${resolved.length}장 (이미지/일러 제외) ===`);
  for (const r of resolved) {
    const rar = r.rarityId === HR ? "HR" : r.rarityId === UR ? "UR" : r.rarityId;
    console.log(`  #${r.sec} ${r.name} [${r.game.supertype} ${JSON.stringify(r.game.subtypes)}] HP${r.game.hp ?? "-"} ${rar}  ← 본문 ${r.baseSetId} #${r.baseNumber}${r.note ? "  ※ " + r.note : ""}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const r of resolved) {
      const lcId = `lc-orphan-${JP}-${r.sec}`;
      const g = r.game;
      const lcData = {
        cardPackId: CARD_PACK, primarySetId: JP, primaryNumber: String(r.sec), primaryNumberInt: r.sec,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: r.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JP,
        number: String(r.sec), numberInt: r.sec, name: r.name,
        imageSmall: null as string | null, imageLarge: null as string | null, rarityId: r.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: `${JP}-${r.sec}` }, create: { id: `${JP}-${r.sec}`, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
