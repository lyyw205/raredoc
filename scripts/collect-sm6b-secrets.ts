// チャンピオンロード (og-sm6b) JP 누락 시크릿 #78~86 수집 — 이미지 포함, 일러레이터 제외.
//
// SM6b 본문+SR(1..77)은 이미 DB에 있음. currentMax=77 초과 #78~86(9장)이 미수집 시크릿.
//   #78~83 = HR(무지개, 6장) GX 카드 · #84~86 = UR(골드, 3장) 트레이너2 + 특수에너지1.
//   전부 본문 카드의 alt-art 재록 → 게임데이터가 본문과 동일. 번호·레어도·일러스트만 다름.
//   → 시크릿마다 대응 본문 카드(같은 jaName·낮은 번호)의 메타데이터를 복제, 번호·레어도·이미지만 새로 부여.
//   이미지 = tcgcollector URL(imageSmall=imageLarge). KR/EN 대응 없음(JP 단독 — STEP6 참조).
//
// 번호·이름·레어도: /tmp/챔피언로드/{1..9}.jpg 를 Read 로 직접 보고 인쇄번호("SM6b NNN/066")·jaName·레어도 확인.
//   1→78 フリーザーGX HR … 9→86 レインボーエネルギー UR (도감순=콜렉션번호순).
// 본문 매핑은 jaName 으로 jpSet 내 최저번호 본문 카드 자동 조회(gameCardId 동일 확인됨).
// og-sm6b 는 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const CARDPACK = "og-sm6b";
const JPSET = "jp-tcg-SM6b";
const CURRENT_MAX = 77;

const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare
const SR = "cmpp4wyyk001ryjurevrx3dq0"; // Super Rare (used if any reads as SR)

// 시각 확인 완료(도감순): {num, jaName, rarity, url}
const READ: { num: number; jaName: string; rarity: "HR" | "UR" | "SR"; url: string }[] = [
  { num: 78, jaName: "フリーザーGX", rarity: "HR", url: "https://static.tcgcollector.com/content/images/ae/85/75/ae85755f6ffbeb571448fc79c75203026048c4d7e7d24ed36f84e7a38e00be48.jpg" },
  { num: 79, jaName: "マルマインGX", rarity: "HR", url: "https://static.tcgcollector.com/content/images/c0/7d/65/c07d6551f4929a012f47adc50308cfd594c26a083db44b26ccb84d9551c43b28.jpg" },
  { num: 80, jaName: "バリヤードGX", rarity: "HR", url: "https://static.tcgcollector.com/content/images/49/a1/95/49a1950cb57dfe9e91b826d383849344dfb5336c1580112d16572e3fb940cd7b.jpg" },
  { num: 81, jaName: "ジュペッタGX", rarity: "HR", url: "https://static.tcgcollector.com/content/images/3f/ed/8f/3fed8f37e3ff81bfd6f2fbc2e233d1448bebcb576d6311ac8b3985d58d272078.jpg" },
  { num: 82, jaName: "ハッサムGX", rarity: "HR", url: "https://static.tcgcollector.com/content/images/d9/27/3d/d9273d19a782b356b95b69b7044f748fe76652d85e3e539fd70c583eff5538d2.jpg" },
  { num: 83, jaName: "ボーマンダGX", rarity: "HR", url: "https://static.tcgcollector.com/content/images/6c/c9/13/6cc913a35eb501f78ade5f6faccb251bfcfb35e69de71aaa71233b421842499a.jpg" },
  { num: 84, jaName: "ふっかつそう", rarity: "UR", url: "https://static.tcgcollector.com/content/images/ce/40/a4/ce40a4cfafb64f86bb9615a6cc77c8e39e07185ec93eb117a0bf1d7495f7395d.jpg" },
  { num: 85, jaName: "ポケナビ", rarity: "UR", url: "https://static.tcgcollector.com/content/images/42/25/75/4225759b5874d92c6b076a04354fff3c0e4250a520d199e33f53ce7bc920beca.jpg" },
  { num: 86, jaName: "レインボーエネルギー", rarity: "UR", url: "https://static.tcgcollector.com/content/images/cf/a6/d7/cfa6d76edee06b5d03ae493fa5a7cdf8449e302ba516354269b99dd30dcfbebd.jpg" },
];
const rarityIdOf = (r: "HR" | "UR" | "SR") => (r === "HR" ? HR : r === "UR" ? UR : SR);

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  assertWritable([CARDPACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm6b-secrets" });

  const plan = [] as { num: number; jaName: string; rarityId: string; url: string; baseNum: number; game: any }[];
  for (const r of READ) {
    if (r.num <= CURRENT_MAX) throw new Error(`#${r.num} <= currentMax(${CURRENT_MAX}) — 추측 금지`);
    const existing = await prisma.regionCard.findFirst({ where: { setId: JPSET, numberInt: r.num }, select: { id: true } });
    if (existing) throw new Error(`#${r.num} 이미 DB 존재(${existing.id}) — 중복 삽입 금지`);
    const bases = await prisma.regionCard.findMany({
      where: { setId: JPSET, name: r.jaName, numberInt: { lte: CURRENT_MAX } },
      select: { numberInt: true, card: { select: GAME } },
      orderBy: { numberInt: "asc" },
    });
    if (bases.length === 0) throw new Error(`#${r.num} ${r.jaName}: 본문 매칭 실패`);
    const b = bases[0];
    plan.push({ num: r.num, jaName: r.jaName, rarityId: rarityIdOf(r.rarity), url: r.url, baseNum: b.numberInt!, game: b.card! });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan) {
    const rcode = p.rarityId === HR ? "HR" : p.rarityId === UR ? "UR" : "SR";
    console.log(`  #${p.num} ${p.jaName} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp ?? "-"} ${rcode}  ← 본문 #${p.baseNum}  img…${p.url.slice(-12)}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JPSET}-${p.num}`;
      const g = p.game;
      const lcData = {
        cardPackId: CARDPACK, primarySetId: JPSET, primaryNumber: String(p.num), primaryNumberInt: p.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rcId = `${JPSET}-${p.num}`;
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JPSET,
        number: String(p.num), numberInt: p.num, name: p.jaName,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
