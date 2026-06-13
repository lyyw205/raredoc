// ナイトユニゾン (og-sm9a / jp-tcg-SM9a) JP 누락 시크릿 #64~70 수집 — 이미지+레어도 포함.
//
// 우리 JP DB 는 #63(currentMax)에서 끊김 → #64~70(7장) 미수집.
// 이 7장은 전부 본문 카드의 alt-art 재록(HR 무지개 #64~67 / UR 골드 #68~70)이라 게임데이터가 본문과 동일.
//   → 시크릿마다 대응 본문 카드(같은 이름·낮은 번호)의 메타데이터를 복제하고, 번호·레어도·이미지만 새로 부여.
//
// 번호·이름·레어도: /tmp/나이트유니즌/{1..7}.jpg 인쇄본을 직접 눈으로 확인(064/055 HR … 070/055 UR).
// 이미지 URL: /tmp/sm_illust_manifest.json "나이트유니즌".urls (도감순 = 콜렉션번호순 64~70). tcgcollector CDN.
//
// 주의(#70 エーテルパラダイス保護区, UR): 이 스타디움의 본문 프린트는 SM9a(1~63) 안에 없음
//   (원조는 SM2K/SM4+). 게임필드는 동일 oracle(gameCardId gc_123ace…)이라 SM4+ #110 canonical 에서 복제.
//   → 본문 in-set 매칭 실패이므로 issues 에 FLAG. (게임값은 검증됨: Trainer/Stadium, nameKo 동일)
//
// og-sm9a 는 동결 목록(protected-groups)에 없음 → 비동결. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const JP = "jp-tcg-SM9a";
const PACK = "og-sm9a";

const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare (tier 9)
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8)

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

// 시각 확인 완료: 시크릿 = {번호, JP명, 레어도, 본문매칭소스(in-set name), 이미지URL}
// baseName 으로 jpSet 내 같은 이름·최저번호 본문 카드를 찾아 게임필드 복제.
// #70 은 in-set 본문 없음 → baseFromSet 으로 cross-set canonical 지정 + flag.
type Secret = {
  num: number;
  jaName: string;
  rarityId: string;
  baseName?: string;      // in-set 본문 매칭용 (jpSet 안에서 같은 이름·최저번호)
  baseFromCardId?: string; // in-set 매칭 실패 시 cross-set canonical LC id (FLAG)
  url: string;
};

const SECRETS: Secret[] = [
  { num: 64, jaName: "モルフォンGX", rarityId: HR, baseName: "モルフォンGX",
    url: "https://static.tcgcollector.com/content/images/b7/bf/fb/b7bffb2b70596b542c38c41b0fa4dc78fd5028dc189e6bec85bac76da53324de.jpg" },
  { num: 65, jaName: "デデンネGX", rarityId: HR, baseName: "デデンネGX",
    url: "https://static.tcgcollector.com/content/images/1e/d8/7e/1ed87ef46a35a9ebdf1810eba6b5e3adb518e3d7c9dc0887547815775691dea9.jpg" },
  { num: 66, jaName: "ゲッコウガ&ゾロアークGX", rarityId: HR, baseName: "ゲッコウガ&ゾロアークGX",
    url: "https://static.tcgcollector.com/content/images/85/84/a7/8584a754d767b3e1b03d53b1802792745d3ac57c0cc65b0474abfe98ff0b0846.jpg" },
  { num: 67, jaName: "サーナイト&ニンフィアGX", rarityId: HR, baseName: "サーナイト&ニンフィアGX",
    url: "https://static.tcgcollector.com/content/images/56/4d/1f/564d1f3c3b3aba6199e0d4149d18ea9ed83827ec3d113d5ba5fd42f65ddedd0c.jpg" },
  { num: 68, jaName: "電磁レーダー", rarityId: UR, baseName: "電磁レーダー",
    url: "https://static.tcgcollector.com/content/images/dd/db/54/dddb54310b0d3c4aec99150bca96ff91ef03631d7da35f3758bf3d08a1e76ec0.jpg" },
  { num: 69, jaName: "ポケギア3.0", rarityId: UR, baseName: "ポケギア3.0",
    url: "https://static.tcgcollector.com/content/images/34/c9/e5/34c9e53b531dd65a37de535c8dd78c049d4ab5d140c7a4c6a7d9406d36a2090e.jpg" },
  // #70: in-set 본문 없음 → SM4+ #110 canonical 에서 게임필드 복제 (FLAG)
  { num: 70, jaName: "エーテルパラダイス保護区", rarityId: UR, baseFromCardId: "lc-jp-tcg-SM4+-110",
    url: "https://static.tcgcollector.com/content/images/66/61/e2/6661e2be1702f44af99415a2a6d347e5002001a5af3ea8d18f25b7d455edb067.jpg" },
];

type GameSel = {
  supertype: string | null; subtypes: string[]; types: string[]; hp: number | null;
  retreatCost: number | null; weakness: string | null; resistance: string | null;
  regulationMark: string | null; pokedexNumbers: number[]; rules: string[];
  flavorText: string | null; abilities: unknown; attacks: unknown; legalities: unknown;
  evolvesFrom: string | null; evolvesTo: string[]; gameCardId: string | null; nameKo: string | null;
};

async function resolveBase(s: Secret): Promise<{ game: GameSel; baseLabel: string }> {
  if (s.baseFromCardId) {
    const c = await prisma.card.findUnique({ where: { id: s.baseFromCardId }, select: GAME });
    if (!c) throw new Error(`#${s.num} cross-set base ${s.baseFromCardId} 없음`);
    return { game: c as GameSel, baseLabel: `cross-set ${s.baseFromCardId}` };
  }
  const rc = await prisma.regionCard.findFirst({
    where: { setId: JP, name: s.baseName!, numberInt: { lte: 63 } },
    orderBy: { numberInt: "asc" },
    select: { numberInt: true, card: { select: GAME } },
  });
  if (!rc || !rc.card) throw new Error(`#${s.num} in-set 본문 "${s.baseName}" 없음`);
  return { game: rc.card as GameSel, baseLabel: `in-set #${rc.numberInt}` };
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm9a-secrets" });

  const plan = [] as { s: Secret; game: GameSel; baseLabel: string }[];
  for (const s of SECRETS) {
    const { game, baseLabel } = await resolveBase(s);
    plan.push({ s, game, baseLabel });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — ナイトユニゾン 시크릿 ${plan.length}장 ===`);
  for (const { s, game, baseLabel } of plan) {
    const rar = s.rarityId === HR ? "HR" : s.rarityId === UR ? "UR" : s.rarityId;
    console.log(`  #${s.num} ${s.jaName} [${game.supertype} ${JSON.stringify(game.subtypes)}] HP${game.hp ?? "-"} ${rar}  ← ${baseLabel}  img:${s.url.slice(-16)}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const { s, game: g } of plan) {
      const lcId = `lc-orphan-${JP}-${s.num}`;
      const lcData = {
        cardPackId: PACK, primarySetId: JP, primaryNumber: String(s.num), primaryNumberInt: s.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: (g.abilities as any) ?? undefined, attacks: (g.attacks as any) ?? undefined,
        legalities: (g.legalities as any) ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: s.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rcId = `${JP}-${s.num}`;
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JP,
        number: String(s.num), numberInt: s.num, name: s.jaName,
        imageSmall: s.url, imageLarge: s.url, rarityId: s.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
