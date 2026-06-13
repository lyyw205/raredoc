// 블랙컬렉션 (og-bw1 / jp-tcg-BW1B「ブラックコレクション」) JP 누락 시크릿 #054~056 수집.
//
// BW 시대 JP공식(pokemon-card.com)은 시크릿을 등재하지 않아 우리 JP DB가 #053(アララギ博士)에서 끊김.
// 사용자가 tcgcollector 일러 URL 3장 제공 → 이미지에서 인쇄번호/이름/레어도를 직접 육안 확인:
//   #054/053 トルネロス  SR  (본문 #047 트레이스 — HP110 Colorless, エナジーウィール/ぼうふう)
//   #055/053 レシラム    SR  (본문 #013 트레이스 — HP130 Fire, げきりん/あおいほのお)  Illus.Sban Graphics
//   #056/053 ピカチュウ  UR  (본문 매칭 없음 — 골드 시크릿 한정카드. たいでん 특성 + 10まんボルト)  Illus.Kouki Saitou
//
// #054/#055 는 jpSet 본문 카드의 alt-art 재록이라 게임데이터=본문 동일 → 본문(같은 이름·낮은 번호)에서 게임필드 복제.
// #056 ピカチュウ 는 본문(BW1B)에도, DB 전체 동일 gameCardId(HP60 + たいでん + 10まんボルト) 어디에도 없는 한정 시크릿
//   → 본문 복제 불가. 이미지에서 읽은 게임필드로 최소 채움(gameCardId 신규 발급). issues 에 FLAG.
//
// 이미지/일러: imageSmall=imageLarge=사용자 제공 tcgcollector URL. 일러레이터는 reference(sm12a) 관례 따라 null.
// og-bw1 은 동결 목록에 없음(BW 비동결). 기본 dry-run, --apply 로 기록. 단일 $transaction. 멱등 upsert.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-BW1B";
const PACK = "og-bw1";
const pad = (n: number) => String(n).padStart(3, "0");

const SR = "cmpp4wyyk001ryjurevrx3dq0"; // Super Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

// 시크릿 → (jaName, 본문번호 baseNum | null, rarityId, image url)
type Sec = { num: number; ja: string; base: number | null; rarityId: string; url: string };
const SECRETS: Sec[] = [
  { num: 54, ja: "トルネロス", base: 47, rarityId: SR, url: "https://static.tcgcollector.com/content/images/f7/85/48/f78548a9d4ca69ac6d2aad23c62df2bf825e69d351f5e281974b2ab89603fa57.webp" },
  { num: 55, ja: "レシラム",   base: 13, rarityId: SR, url: "https://static.tcgcollector.com/content/images/a0/9a/ef/a09aef1a540d7239835201d4b01bfbb1050306ef14acd22c9dada341e899e705.webp" },
  { num: 56, ja: "ピカチュウ", base: null, rarityId: UR, url: "https://static.tcgcollector.com/content/images/e1/a9/20/e1a9204cd6461ea62b8119b91c9b2b606cb6fe9f75f817d1eb52e5769d8757ee.webp" },
];

// #056 ピカチュウ — 본문 매칭 실패 케이스. 이미지에서 읽은 게임필드로 최소 채움.
//   たね/HP60/雷, 특성 たいでん(트래시에서 에너지 1개 부착), 10まんボルト 80(자신 에너지 전부 트래시).
const PIKACHU_GAME = {
  supertype: "Pokémon",
  subtypes: ["Basic"],
  types: ["Lightning"],
  hp: 60,
  // 본문 BW1B 카드들은 DB 상 weakness/resistance/retreatCost 가 모두 null(이 세트 import 관례).
  // 동일 세트 일관성 위해 이미지의 약점/후퇴(Fighting×2 / 후퇴1)는 넣지 않고 null 유지 — issues 에 FLAG.
  retreatCost: null as unknown,
  weakness: null as unknown,
  resistance: null as unknown,
  regulationMark: null as string | null,
  pokedexNumbers: [25],
  rules: [] as unknown[],
  flavorText: "とても珍しいピカチュウのカード。手に入れることができた君はものすごくラッキーだ。",
  abilities: [
    { name: "たいでん", text: "自分のトラッシュからエネルギーを1枚選び、このポケモンにつける。", type: "Ability" },
  ],
  attacks: [
    { cost: ["Lightning"], name: "10まんボルト", text: "このポケモンについているエネルギーをすべてトラッシュする。", damage: "80" },
  ],
  // DB 전체에 동일 게임프로필(HP60 + たいでん + 10まんボルト) 카드 없음 → 신규 GameCard 발급.
  //   id 포맷 gc_<20hex> 준수(deterministic). GameCard 행은 트랜잭션에서 먼저 생성(FK 충족).
  gameCardId: "gc_bb093cf599be33807a18", // 신규 (sha1('bw1b-056-pikachu-secret')[:20])
  legalities: null as unknown,
  evolvesFrom: null as string | null,
  evolvesTo: [] as string[],
  nameKo: "피카츄",
};

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-bw1b-secrets" });

  // 현황: jpSet max + 번호포맷 + 타깃 id 충돌
  const existing = await prisma.regionCard.findMany({ where: { setId: SET }, select: { numberInt: true } });
  const maxNum = Math.max(0, ...existing.map((r) => r.numberInt ?? 0));
  const targetRcIds = SECRETS.map((s) => `${SET}-${pad(s.num)}`);
  const targetLcIds = SECRETS.map((s) => `lc-orphan-${SET}-${pad(s.num)}`);
  const rcClash = await prisma.regionCard.findMany({ where: { id: { in: targetRcIds } }, select: { id: true } });
  const lcClash = await prisma.card.findMany({ where: { id: { in: targetLcIds } }, select: { id: true } });

  // 본문 매칭 게임필드 확보 (#054,#055)
  const baseNums = SECRETS.filter((s) => s.base != null).map((s) => s.base!);
  const bases = await prisma.regionCard.findMany({
    where: { setId: SET, numberInt: { in: baseNums } },
    select: { numberInt: true, name: true, card: { select: GAME } },
  });
  const byNum = new Map(bases.map((b) => [b.numberInt!, b]));

  const plan = SECRETS.map((s) => {
    let game: any;
    let name: string;
    if (s.base != null) {
      const b = byNum.get(s.base);
      if (!b) throw new Error(`본문 #${s.base} (시크릿 #${s.num}) DB 없음`);
      if (b.name !== s.ja) throw new Error(`본문 #${s.base} 이름불일치: DB="${b.name}" 기대="${s.ja}"`);
      game = b.card!;
      name = b.name;
    } else {
      game = PIKACHU_GAME; // 본문 없음 — 이미지 기반 최소 채움
      name = s.ja;
    }
    return { num: s.num, name, base: s.base, rarityId: s.rarityId, url: s.url, game };
  });

  console.log(`\n=== 블랙컬렉션 시크릿 수집 (${APPLY ? "APPLY" : "DRY-RUN"}) ===`);
  console.log(`현재 ${SET} max 번호: ${maxNum} (→ #054~056 추가, 갭=053↔054 연속)`);
  console.log(`id 충돌: RC ${rcClash.length}건, LC ${lcClash.length}건`);
  console.log("\n[추가 계획] 3장:");
  for (const p of plan) {
    const rar = p.rarityId === UR ? "UR" : p.rarityId === SR ? "SR" : p.rarityId;
    console.log(`  #${pad(p.num)} ${p.name} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)} ${JSON.stringify(p.game.types)}] HP${p.game.hp} ${rar}  ${p.base != null ? `← 본문 #${p.base}` : "← 본문 매칭 없음(이미지 최소 채움)"} gc=${p.game.gameCardId}`);
    console.log(`        img=${p.url}`);
  }
  if (rcClash.length || lcClash.length) console.log("\n⚠️ id 충돌 존재 — 멱등 upsert 로 갱신됨(create→update). 검토 요망.");
  if (!APPLY) { console.log("\n(dry-run — --apply 로 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${SET}-${pad(p.num)}`;
      const rcId = `${SET}-${pad(p.num)}`;
      const g = p.game;
      // gameCardId FK 충족: 본문 복제분(#054/#055)은 기존 GameCard 재사용(이미 존재 — 멱등 upsert 무해),
      //   #056 ピ카チュウ 는 신규 GameCard 발급(없으면 생성). hp 대표값은 Int.
      if (g.gameCardId) {
        await tx.gameCard.upsert({
          where: { id: g.gameCardId },
          create: { id: g.gameCardId, supertype: g.supertype, name: p.name, hp: typeof g.hp === "number" ? g.hp : null },
          update: {},
        });
      }
      const lcData = {
        cardPackId: PACK, primarySetId: SET, primaryNumber: pad(p.num), primaryNumberInt: p.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness ?? undefined, resistance: g.resistance ?? undefined,
        regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rcData = {
        cardId: lcId, language: "ja", region: "JP", setId: SET,
        number: pad(p.num), numberInt: p.num, name: p.name,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rcData }, update: rcData });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
