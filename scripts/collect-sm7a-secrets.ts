// 迅雷スパーク (og-sm7a) JP 누락 시크릿 #67~73 수집 — 이미지(tcgcollector) 포함.
//
// SM7a 본문+SR 은 #1..66 까지 DB 보유(currentMax=66). #67~73(7장)이 미수집 시크릿.
//   #67~70 = HR(레인보우 GX, 본문 GX 의 alt-art 재록) · #71~73 = UR(골드 트레이너, 본문 트레이너 재록).
//   전부 본문 카드의 alt-art 재록이라 게임데이터 동일 → 대응 본문 카드(같은 이름·낮은 번호)에서 복제, 번호·레어도·이미지만 새로.
//   이미지: 사용자 제공 tcgcollector URL(도감순). imageSmall=imageLarge=동일 URL.
//   KR/EN: kr-sm7a 는 본문 60장뿐(시크릿 없음), EN 세트 없음 → JP 단독 유지.
//
// 시각 확인(이미지 직독)으로 (번호·JP명·레어도) 확정. og-sm7a 는 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const JP = "jp-tcg-SM7a";
const CP = "og-sm7a";
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare (레인보우)
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (골드)

// 시크릿번호 → {본문번호, jaName, rarityId, 이미지url, nameKo오버라이드?}
// 본문번호는 "같은 이름·낮은 번호"(true body) 선택. (full-art SR #61~64 가 아니라 본문 #6/12/33/41)
const PLAN: { sec: number; base: number; name: string; rarityId: string; url: string; nameKoOverride?: string }[] = [
  { sec: 67, base: 6,  name: "ビリジオンGX",       rarityId: HR, url: "https://static.tcgcollector.com/content/images/4b/0f/d1/4b0fd169627bc159a660bf8019337597cde160cba8239818db7211e8263a9d60.jpg" },
  { sec: 68, base: 12, name: "マグカルゴGX",       rarityId: HR, url: "https://static.tcgcollector.com/content/images/27/97/f5/2797f5ead740bc9ac22f0b759447f3e4bbc6a44c14d7e42154cab334a19dc9fb.jpg" },
  { sec: 69, base: 33, name: "ゼラオラGX",         rarityId: HR, url: "https://static.tcgcollector.com/content/images/11/54/20/1154201d21977fd37b7e9083c71d4285182652909591c3d333128dc8a8cce115.jpg" },
  { sec: 70, base: 41, name: "ゲノセクトGX",       rarityId: HR, url: "https://static.tcgcollector.com/content/images/eb/84/51/eb845181b5e09f67a381963094404eb6d53970f861d11626c9640f60bcd4522f.jpg" },
  { sec: 71, base: 46, name: "エレキパワー",       rarityId: UR, url: "https://static.tcgcollector.com/content/images/cb/c9/99/cbc99911d31d1d5c2ae1c1cb5506b76266c349e5bb8e72d44aa7c5e5a55b8d5c.jpg" },
  // #72: 본문 #47 의 LC.nameKo 가 "믹스허브"(오류, 사전 데이터 버그)지만 KR 인쇄명은 "커스텀 캐처".
  //   잘못된 값을 전파하지 않기 위해 KR 인쇄명으로 오버라이드. (issues 에 FLAG)
  { sec: 72, base: 47, name: "カスタムキャッチャー", rarityId: UR, url: "https://static.tcgcollector.com/content/images/1e/37/ed/1e37edaea0c0db34aeea1b6deef4b9e032fde946f1ddee72361983b65b69cccc.jpg", nameKoOverride: "커스텀 캐처" },
  { sec: 73, base: 53, name: "カウンターゲイン",     rarityId: UR, url: "https://static.tcgcollector.com/content/images/6e/03/38/6e0338b86b4f520c290e86b9ff0823a6bc059c160903fa9994aa7d07e0639487.jpg" },
];

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([CP], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm7a-secrets" });

  const baseNums = [...new Set(PLAN.map((p) => p.base))];
  const bases = await prisma.regionCard.findMany({
    where: { setId: JP, numberInt: { in: baseNums } },
    select: { numberInt: true, name: true, card: { select: GAME } },
  });
  const byNum = new Map(bases.map((b) => [b.numberInt!, b]));

  const plan = PLAN.map((p) => {
    const b = byNum.get(p.base);
    if (!b) throw new Error(`본문 #${p.base} (시크릿 #${p.sec}) DB 없음`);
    if (b.name !== p.name) throw new Error(`이름 불일치: 본문 #${p.base} "${b.name}" ≠ 시크릿명 "${p.name}"`);
    return { ...p, game: b.card! };
  });

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan) {
    const r = p.rarityId === HR ? "HR" : "UR";
    const nk = p.nameKoOverride ?? p.game.nameKo;
    console.log(`  #${p.sec} ${p.name} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp ?? "-"} ${r}  ← 본문 #${p.base}  nameKo=${nk}${p.nameKoOverride ? " (오버라이드)" : ""}  img=…${p.url.slice(-16)}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JP}-${p.sec}`;
      const g = p.game;
      const lcData = {
        cardPackId: CP, primarySetId: JP, primaryNumber: String(p.sec), primaryNumberInt: p.sec,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: p.nameKoOverride ?? g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JP,
        number: String(p.sec), numberInt: p.sec, name: p.name,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: `${JP}-${p.sec}` }, create: { id: `${JP}-${p.sec}`, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
