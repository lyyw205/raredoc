// EX バトルブースト (og-ebb / jp-tcg-EBB) JP 누락 시크릿 #094~099 수집 — 게임필드 복제/최소채움 + 이미지(tcgcollector) 동시 기록.
//
// 우리 JP DB 는 #093 에서 끊김(currentMax=93). JP공식(pokemon-card.com)이 BW 시크릿을 등재 안 해서 끊긴 것.
//   인쇄 분모는 "/093". #094~099(6장)이 미수집 시크릿(UR 골드 2 + SR 풀아트 4). 전부 본문 alt-art 재록.
//   → 본문 카드(같은 이름·낮은 번호)의 게임필드를 복제하고 번호·레어도·이미지만 새로 부여.
//
// 시각 확인(이미지 직독, /tmp/EX배틀부스트/{0..5}.png — URL 순서 = 인쇄번호순):
//   094 レシラム                094/093 UR(골드 풀아트) ← 본문 #020 レシラム (gc_352b06f517df885dddbf, Fire HP130)
//   095 ゼクロム                095/093 UR(골드 풀아트) ← 본문 #043 ゼクロム (gc_d0f88e0939d38f4ec207, Lightning HP130)
//   096 イマクニ?              096/093 SR(풀아트 서포트) ← ⚠ EBB 본문/DB 어디에도 동일 게임카드 없음 → 신규 gc 발행+최소채움. FLAG.
//   097 ポケモンエンタープライズ 097/093 SR(풀아트 서포트) ← ⚠ DB 전무 → 신규 gc 발행+최소채움. FLAG.
//   098 ポケモンエンタープライズ 098/093 SR(풀아트 서포트) ← ⚠ 097 과 동일 게임카드(일러 변형) → 같은 gc 공유. FLAG.
//   099 ポケモンエンタープライズ 099/093 SR(풀아트 서포트) ← ⚠ 097 과 동일 게임카드(일러 변형) → 같은 gc 공유. FLAG.
//
//   ※ 097~099 는 같은 이름의 サポート 3종(실인물 사진 일러 변형)으로, 게임 텍스트 동일·일러만 다름. → 동일 gameCardId 공유.
//   ※ イマクニ? 서포트는 본문에 없는 프로모성 시크릿. EN en-tcg-g1#063 Imakuni? 는 다른 세트(Gym) 카드라 동일 게임카드로 보지 않음.
//
// 레어도(BW 시크릿은 카드에 SR/UR 문자 인쇄 없음 — 골드=UR, 풀아트=SR 의 EBB 관례 적용):
//   094/095 = UR(Ultra Rare, 골드시크릿)  ·  096~099 = SR(Super Rare, 풀아트)
//
// EN/KR: en-tcg-bw11(Legendary Treasures)·kr-ebb 어디에도 이 6장의 동일 alt-art 프린트 없음(JP 단독). → JP only 유지.
// og-ebb 는 동결(freeze) 목록에 없음. 기본 dry-run, --apply 로 기록. 단일 $transaction. 멱등 upsert.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const JPSET = "jp-tcg-EBB";
const PACK = "og-ebb";
const SR = "cmpp4wyyk001ryjurevrx3dq0"; // Super Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare
const pad = (n: number) => String(n).padStart(3, "0");

// 신규 게임카드 id (결정적: 동일 시드 → 동일 id, 멱등). 충돌 없음 사전 확인됨.
//   gcImakuni    = sha1("ebb-secret-imakuni-supporter").slice(20)
//   gcEnterprise = sha1("ebb-secret-pokemon-enterprise-supporter").slice(20)
const GC_IMAKUNI = "gc_253b93f7ad5a61a9eb84";
const GC_ENTERPRISE = "gc_e29e777385aacd12d401";

type Sec = {
  num: number;
  jaName: string;
  rarityId: string;
  url: string;
  // 복제 소스: 본문 번호(있으면) — 없으면 minimal 필드(아래 minimal)로 채움.
  baseNumberInt?: number;
  minimal?: {
    supertype: string;
    subtypes: string[];
    nameKo: string | null;
    gameCardId: string;
  };
  flag?: string;
};

const SECRETS: Sec[] = [
  { num: 94, jaName: "レシラム", rarityId: UR, baseNumberInt: 20,
    url: "https://static.tcgcollector.com/content/images/c4/49/d9/c449d9565aa708caa2f2b86b7d517b715d78bb4bfad8093b33b17dffc16d5adc.webp" },
  { num: 95, jaName: "ゼクロム", rarityId: UR, baseNumberInt: 43,
    url: "https://static.tcgcollector.com/content/images/fb/3b/d7/fb3bd7839994784bdf062ab45e2940d22f8ff890dea4520c9be5a28403845730.webp" },
  { num: 96, jaName: "イマクニ?", rarityId: SR,
    url: "https://static.tcgcollector.com/content/images/c8/1e/a3/c81ea33db5930c5ec1a1d76c44e4416dc0b4523a0c8ee8bed037206baf1e6a59.webp",
    minimal: { supertype: "Trainer", subtypes: ["Supporter"], nameKo: null, gameCardId: GC_IMAKUNI },
    flag: "#096 イマクニ?(SR 서포트): EBB 본문/DB 전무 → 신규 gc 발행, 게임필드 최소채움(supertype=Trainer subtypes=[Supporter]), nameKo=null." },
  { num: 97, jaName: "ポケモンエンタープライズ", rarityId: SR,
    url: "https://static.tcgcollector.com/content/images/a8/02/5d/a8025d7421ba032b55aa65fe1bb023f35df96c8721a613fde39d1a617a42e147.webp",
    minimal: { supertype: "Trainer", subtypes: ["Supporter"], nameKo: null, gameCardId: GC_ENTERPRISE },
    flag: "#097 ポケモンエンタープライズ(SR 서포트): DB 전무 → 신규 gc 발행, 최소채움, nameKo=null." },
  { num: 98, jaName: "ポケモンエンタープライズ", rarityId: SR,
    url: "https://static.tcgcollector.com/content/images/6f/16/84/6f168465b10241f14fe567a40e831f36de85e785c65c62283f8a186ec5f6b123.webp",
    minimal: { supertype: "Trainer", subtypes: ["Supporter"], nameKo: null, gameCardId: GC_ENTERPRISE },
    flag: "#098 ポケモンエンタープライズ(SR 서포트): #097 과 동일 게임카드(일러 변형) → 같은 gc 공유, 최소채움, nameKo=null." },
  { num: 99, jaName: "ポケモンエンタープライズ", rarityId: SR,
    url: "https://static.tcgcollector.com/content/images/7c/ae/e1/7caee1e6eb4e6740eee7fe7d854354dbbb993909cfadd476e773b5649dbfab14.webp",
    minimal: { supertype: "Trainer", subtypes: ["Supporter"], nameKo: null, gameCardId: GC_ENTERPRISE },
    flag: "#099 ポケモンエンタープライズ(SR 서포트): #097 과 동일 게임카드(일러 변형) → 같은 gc 공유, 최소채움, nameKo=null." },
];

const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

// minimal Trainer/Supporter 게임필드 (EBB #093 アララギパパ 관례와 동일: types=[] rules=[] 나머지 null)
function minimalGame(m: NonNullable<Sec["minimal"]>) {
  return {
    supertype: m.supertype, subtypes: m.subtypes, types: [] as string[], hp: null as number | null,
    retreatCost: null, weakness: null, resistance: null, regulationMark: null, pokedexNumbers: [] as number[],
    rules: [] as string[], flavorText: null, abilities: null, attacks: null, legalities: null,
    evolvesFrom: null, evolvesTo: [] as string[], gameCardId: m.gameCardId, nameKo: m.nameKo,
  };
}

async function getGame(s: Sec): Promise<{ game: any; source: string }> {
  if (s.baseNumberInt != null) {
    const base = await prisma.regionCard.findFirst({
      where: { setId: JPSET, numberInt: s.baseNumberInt },
      select: { name: true, card: { select: GAME } },
    });
    if (!base) throw new Error(`본문 #${s.baseNumberInt} (시크릿 #${s.num}) DB 없음`);
    return { game: base.card!, source: `EBB #${s.baseNumberInt} (${base.name})` };
  }
  if (s.minimal) return { game: minimalGame(s.minimal), source: "minimal(FLAG, 본문 없음)" };
  throw new Error(`시크릿 #${s.num}: baseNumberInt/minimal 둘 다 없음`);
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-ebb-secrets" });

  // 사전: 현재 max / id 충돌
  const existing = await prisma.regionCard.findMany({ where: { setId: JPSET }, select: { numberInt: true } });
  const maxNum = Math.max(...existing.map((r) => r.numberInt ?? 0));
  const targetRcIds = SECRETS.map((s) => `${JPSET}-${pad(s.num)}`);
  const targetLcIds = SECRETS.map((s) => `lc-orphan-${JPSET}-${pad(s.num)}`);
  const rcClash = await prisma.regionCard.findMany({ where: { id: { in: targetRcIds } }, select: { id: true } });
  const lcClash = await prisma.card.findMany({ where: { id: { in: targetLcIds } }, select: { id: true } });

  const plan: { s: Sec; game: any; source: string }[] = [];
  for (const s of SECRETS) {
    const { game, source } = await getGame(s);
    plan.push({ s, game, source });
  }

  console.log(`\n=== EBB 시크릿 수집 (${APPLY ? "APPLY" : "DRY-RUN"}) — ${plan.length}장 ===`);
  console.log(`현재 ${JPSET} max 번호: ${maxNum} (currentMax=93 → #094~099 추가, 갭 93↔94 연속)`);
  console.log(`id 충돌: RC ${rcClash.length}건, LC ${lcClash.length}건 (멱등 upsert)`);
  for (const { s, game, source } of plan) {
    const rar = s.rarityId === UR ? "UR" : s.rarityId === SR ? "SR" : s.rarityId;
    console.log(`  #${pad(s.num)} ${s.jaName} [${game.supertype} ${JSON.stringify(game.subtypes)}] gc=${game.gameCardId} ko=${game.nameKo} ${rar}  ← ${source}`);
    console.log(`        img…${s.url.slice(-24)}`);
    if (s.flag) console.log(`        ⚠ FLAG: ${s.flag}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  // 신규 GameCard 먼저 생성(FK LogicalCard_gameCardId_fkey 충족). 멱등 upsert.
  //   gameCardId 는 GameCard.id 참조 — 본문 복제 카드(094/095)는 기존 gc 재사용, 시크릿 서포트(096~099)는 신규 gc.
  const NEW_GAMECARDS = [
    { id: GC_IMAKUNI, supertype: "Trainer", name: "イマクニ?", hp: null as number | null },
    { id: GC_ENTERPRISE, supertype: "Trainer", name: "ポケモンエンタープライズ", hp: null as number | null },
  ];

  await prisma.$transaction(async (tx) => {
    for (const gc of NEW_GAMECARDS) {
      await tx.gameCard.upsert({
        where: { id: gc.id },
        create: { id: gc.id, supertype: gc.supertype, name: gc.name, hp: gc.hp },
        update: { supertype: gc.supertype, name: gc.name, hp: gc.hp },
      });
    }
    for (const { s, game: g } of plan) {
      const lcId = `lc-orphan-${JPSET}-${pad(s.num)}`;
      const rcId = `${JPSET}-${pad(s.num)}`;
      const lcData = {
        cardPackId: PACK, primarySetId: JPSET, primaryNumber: pad(s.num), primaryNumberInt: s.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: s.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JPSET,
        number: pad(s.num), numberInt: s.num, name: s.jaName,
        imageSmall: s.url, imageLarge: s.url, rarityId: s.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
