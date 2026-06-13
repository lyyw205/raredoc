// BW9 メガロキャノン (Megalo Cannon, og-bw9) JP 누락 시크릿 #077~086 수집 — 사용자 제공 tcgcollector 일러 URL.
//
// 정본 본문은 1..076(currentMax=76)까지 DB 보유. JP공식(pokemon-card.com)은 BW시대 시크릿 미등재라 DB 가 76 에서 끊김.
// 이 10장은 전부 본문 카드의 alt-art 재록(SR 풀아트 EX / SR 풀아트 트레이너 / UR 골드)이라 게임데이터 동일 → 번호·레어도·일러만 다름.
//   인쇄번호·레어도·JP명은 카드 이미지를 직접 육안 확인해 확정(분모초과 077~086):
//     #077 ビリジオンEX SR · #078 ゲノセクトEX SR · #079 ジラーチEX SR · #080 ディアルガEX SR · #081 パルキアEX SR · #082 アイリス SR
//     #083 タマタマ UR · #084 ビリジオン UR · #085 ヨノワール UR · #086 ふしぎなアメ UR
//   SR 6장(077~082)은 BW9 본문에 동명 본문(낮은 번호) 존재 → in-set 복제.
//   UR 4장(083~086)은 BW9 본문에 없음(골드 재록) → 동일 gameCardId·HP·타입·기술이 일치하는 BW세대 타세트 본문에서 복제. (#083·#085 는 골드프린트에 능력 인쇄가 있으나 DB 본문엔 능력 미저장 → issues FLAG)
// 이미지=imageSmall=imageLarge=tcgcollector webp. KR/EN 대응 없음(JP 단독 alt-art). og-bw9 비동결.
// 기본 dry-run, --apply 로 기록. 단일 $transaction. 멱등 upsert.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-BW9";
const PACK = "og-bw9";
const SR = "cmpp4wyyk001ryjurevrx3dq0"; // Super Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare
const pad = (n: number) => String(n).padStart(3, "0");

// 시크릿번호 → { jaName, rarityId, 복제원본 setId/numberInt } — 인쇄번호·레어도 육안 확정
type Plan = { sec: number; ja: string; rarityId: string; srcSet: string; srcNum: number; url: string; koOverride?: string };
const PLAN: Plan[] = [
  { sec: 77, ja: "ビリジオンEX", rarityId: SR, srcSet: "jp-tcg-BW9",  srcNum: 9,  url: "https://static.tcgcollector.com/content/images/2f/23/5d/2f235d65bba57719965d654e9f438abaf56f893216f75677140136b8ae557c36.webp" },
  { sec: 78, ja: "ゲノセクトEX", rarityId: SR, srcSet: "jp-tcg-BW9",  srcNum: 10, url: "https://static.tcgcollector.com/content/images/b4/7c/93/b47c93b4c5033beacad30905e22d852fb8a7971274814a852b2cf0bde473c7b8.webp" },
  { sec: 79, ja: "ジラーチEX",   rarityId: SR, srcSet: "jp-tcg-BW9",  srcNum: 51, url: "https://static.tcgcollector.com/content/images/5c/b9/8e/5cb98e5d0565ca895b3b0535dcf0d3c760be0a105131462bde97caf3f101b924.webp" },
  { sec: 80, ja: "ディアルガEX", rarityId: SR, srcSet: "jp-tcg-BW9",  srcNum: 53, url: "https://static.tcgcollector.com/content/images/65/07/cd/6507cdc7cb7c9cbd2e998602c7d848717b6d574d7220471ed85b4a33c92312b2.webp" },
  { sec: 81, ja: "パルキアEX",   rarityId: SR, srcSet: "jp-tcg-BW9",  srcNum: 54, url: "https://static.tcgcollector.com/content/images/e2/12/f6/e212f64eef22db0b3ab6f6141a373302ffc0e511930908b0b9aa75091b12635f.webp" },
  { sec: 82, ja: "アイリス",     rarityId: SR, srcSet: "jp-tcg-BW9",  srcNum: 71, url: "https://static.tcgcollector.com/content/images/3d/23/a4/3d23a4b3eaaddbf047f011c8141c350ddef8ab00f3c335a9dea3ce08857413f7.webp" },
  { sec: 83, ja: "タマタマ",     rarityId: UR, srcSet: "jp-tcg-BW8S", srcNum: 1,  url: "https://static.tcgcollector.com/content/images/81/e9/ca/81e9ca4a2b5e1969e1d48c9b1a420f8db6800e54227e8ce0a71a4e12acad9b7a.webp", koOverride: "아라리" }, // BW8S 원본 nameKo=null → 타프린트 일관 표기 아라리 보정
  { sec: 84, ja: "ビリジオン",   rarityId: UR, srcSet: "jp-tcg-bw2",  srcNum: 8,  url: "https://static.tcgcollector.com/content/images/8c/d3/7c/8cd37c863e671708d71c416b466abcef93f33991385d725d25f9f4a122ed4ae3.webp" },
  { sec: 85, ja: "ヨノワール",   rarityId: UR, srcSet: "jp-tcg-BW6C", srcNum: 26, url: "https://static.tcgcollector.com/content/images/81/fb/87/81fb87fb6b9ff0d4dcf5c2c3e9b186208a21c864893bf54717014e2922949358.webp" },
  { sec: 86, ja: "ふしぎなアメ", rarityId: UR, srcSet: "jp-tcg-bw4",  srcNum: 65, url: "https://static.tcgcollector.com/content/images/55/c1/68/55c1682f406ee605c9b60b8b9749a625bf8ffbfdb3afcc579e52b2877ac76159.webp" },
];

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-bw9-secrets" });

  // 가드: currentMax 와 타깃 id 충돌
  const existing = await prisma.regionCard.findMany({ where: { setId: SET }, select: { numberInt: true } });
  const maxNum = Math.max(...existing.map((r) => r.numberInt ?? 0));
  const targetRcIds = PLAN.map((p) => `${SET}-${pad(p.sec)}`);
  const targetLcIds = PLAN.map((p) => `lc-orphan-${SET}-${pad(p.sec)}`);
  const rcClash = await prisma.regionCard.findMany({ where: { id: { in: targetRcIds } }, select: { id: true } });
  const lcClash = await prisma.card.findMany({ where: { id: { in: targetLcIds } }, select: { id: true } });

  // 각 시크릿의 복제원본 본문 카드 로드
  const plan = [] as (Plan & { game: any })[];
  for (const p of PLAN) {
    const src = await prisma.regionCard.findFirst({
      where: { setId: p.srcSet, numberInt: p.srcNum, region: "JP" },
      select: { name: true, card: { select: GAME } },
    });
    if (!src?.card) throw new Error(`복제원본 없음: #${p.sec} ${p.ja} ← ${p.srcSet} #${p.srcNum}`);
    if (src.name !== p.ja) console.warn(`  ⚠ #${p.sec}: 원본명 불일치 src='${src.name}' vs 인쇄='${p.ja}' (이름은 인쇄값 사용)`);
    const game = { ...src.card, nameKo: p.koOverride ?? src.card.nameKo };
    plan.push({ ...p, game });
  }

  console.log(`\n=== BW9 메갈로캐논 시크릿 #077~086 (${APPLY ? "APPLY" : "DRY-RUN"}) — ${plan.length}장 ===`);
  console.log(`현재 ${SET} max 번호: ${maxNum} (→ #077~086 추가, 갭=076↔077 연속)  [모두 max 초과 = ${plan.every(p => p.sec > maxNum)}]`);
  console.log(`id 충돌: RC ${rcClash.length}건, LC ${lcClash.length}건`);
  for (const p of plan) {
    const g = p.game;
    console.log(`  #${pad(p.sec)} ${p.ja} [${p.rarityId === UR ? "UR" : "SR"}] super=${g.supertype} subtypes=${JSON.stringify(g.subtypes)} hp=${g.hp} gc=${g.gameCardId} ko='${g.nameKo}'  ← ${p.srcSet} #${p.srcNum}`);
    console.log(`        img=${p.url}`);
  }

  if (rcClash.length || lcClash.length) console.log("\n⚠️ id 충돌 존재 — 멱등 upsert 로 갱신됨(create→update). 검토 요망.");
  if (!APPLY) { console.log("\n(dry-run — --apply 로 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${SET}-${pad(p.sec)}`;
      const rcId = `${SET}-${pad(p.sec)}`;
      const g = p.game;
      const lcData = {
        cardPackId: PACK, primarySetId: SET, primaryNumber: pad(p.sec), primaryNumberInt: p.sec,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rcData = {
        cardId: lcId, language: "ja", region: "JP", setId: SET,
        number: pad(p.sec), numberInt: p.sec, name: p.ja,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rcData }, update: rcData });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
