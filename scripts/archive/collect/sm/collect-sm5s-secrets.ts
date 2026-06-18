// 울트라썬 (og-sm5s / jp-tcg-SM5S) JP 누락 시크릿 #73~78 수집 — 이미지 URL 포함.
//
// SM5S 본문+이미 수집된 SR(#1~72)은 DB에 있고 currentMax=72. #73~78(6장)이 미수집 시크릿.
//   #73~75 = HR(레인보우, GX 3장) · #76~78 = UR(골드, 트레이너2+에너지1).
//   전부 본문 카드의 alt-art 재록 → 게임데이터는 본문과 동일. 번호·레어도·일러스트(이미지)만 다름.
//
// 시크릿→본문 매핑(시각 확인 + DB jaName 매칭):
//   73 リーフィアGX            ← SM5S #12 (HR)
//   74 ネクロズマ たそがれのたてがみGX ← SM5S #44 (HR)
//   75 ディアルガGX            ← SM5S #45 (HR)
//   76 のぞきみレッドカード     ← (SM5S 본문에 없음! → SM4S #47 cross-pack 복제, FLAG) (UR)
//   77 ミッシングクローバー     ← SM5S #58 (UR)
//   78 ユニットエネルギー草炎水 ← SM5S #66 (UR)
//
// EN/KR: SM5S 시크릿 73~78 은 JP 단독(EN Ultra Prism / KR 모두 해당 시크릿 프린트 없음). JP 단독 유지.
// og-sm5s 는 동결 목록에 없음. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const JP = "jp-tcg-SM5S";
const PACK = "og-sm5s";

const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare
// const SR = "cmpp4wyyk001ryjurevrx3dq0"; // Secret Rare (이 팩 시크릿엔 SR 없음)

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

// 시크릿: { sec, jaName, rarityId, baseSet, baseNum, dropNameKo? }
// 시각 확인 완료 — 각 url = 카드에 찍힌 번호(도감순 73~78), 레어도 인쇄 마크.
const SECRETS: {
  sec: number; jaName: string; rarityId: string;
  baseSet: string; baseNum: number; url: string; dropNameKo?: boolean; flag?: string;
}[] = [
  { sec: 73, jaName: "リーフィアGX", rarityId: HR, baseSet: JP, baseNum: 12,
    url: "https://static.tcgcollector.com/content/images/83/f5/a7/83f5a78082189b6908c9957d1d7035e4c59682d74fb9fcc841f69d1502fbdf1a.jpg" },
  { sec: 74, jaName: "ネクロズマ たそがれのたてがみGX", rarityId: HR, baseSet: JP, baseNum: 44,
    url: "https://static.tcgcollector.com/content/images/7b/6c/1d/7b6c1dcc43609c687d3115ab096082fd20ea151c8ded1fad1f20c3dc5d9e7ecd.jpg" },
  { sec: 75, jaName: "ディアルガGX", rarityId: HR, baseSet: JP, baseNum: 45,
    url: "https://static.tcgcollector.com/content/images/c1/23/ed/c123ed9741cc93d0ae85ffbba8325c79ff5e5c902f04950d8316bdcd64eb38fb.jpg" },
  // #76 のぞきみレッドカード — SM5S 본문에 없음. SM4S #47(동일 게임카드) 에서 복제. nameKo 가 base 에서 잘못돼 있어(="카운터 캐처") drop.
  { sec: 76, jaName: "のぞきみレッドカード", rarityId: UR, baseSet: "jp-tcg-SM4S", baseNum: 47, dropNameKo: true,
    flag: "within-jpSet base match 실패 — SM4S #47 cross-pack 복제",
    url: "https://static.tcgcollector.com/content/images/07/be/dc/07bedc0c14151ccf550ed100fa5d7bbc29c6bb843374598b7bd61037cf671fef.jpg" },
  { sec: 77, jaName: "ミッシングクローバー", rarityId: UR, baseSet: JP, baseNum: 58,
    url: "https://static.tcgcollector.com/content/images/1f/01/19/1f0119a3f78387c05b2a88329ed4d7f68de2a19299e349a6e7b9eec3b430a00b.jpg" },
  { sec: 78, jaName: "ユニットエネルギー草炎水", rarityId: UR, baseSet: JP, baseNum: 66,
    url: "https://static.tcgcollector.com/content/images/89/7f/a5/897fa5c3a88830e4a003dd6efc498b9e764ae0b410896e47c27c205d4f8014a3.jpg" },
];

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sm5s-secrets" });

  // 본문 게임필드 로드
  const plan = [] as {
    sec: number; jaName: string; rarityId: string; baseSet: string; baseNum: number;
    url: string; game: any; flag?: string;
  }[];
  for (const s of SECRETS) {
    const b = await prisma.regionCard.findFirst({
      where: { setId: s.baseSet, numberInt: s.baseNum },
      select: { name: true, card: { select: GAME } },
    });
    if (!b?.card) throw new Error(`본문 ${s.baseSet} #${s.baseNum} (시크릿 #${s.sec}) DB 없음`);
    const game = { ...b.card };
    if (s.dropNameKo) game.nameKo = null;
    plan.push({ sec: s.sec, jaName: s.jaName, rarityId: s.rarityId, baseSet: s.baseSet, baseNum: s.baseNum, url: s.url, game, flag: s.flag });
  }

  // 가드: 모두 currentMax 초과 + 미존재
  for (const p of plan) {
    if (p.sec <= 72) throw new Error(`#${p.sec} 가 currentMax(72) 이하 — FLAG`);
    const exists = await prisma.regionCard.findFirst({ where: { setId: JP, numberInt: p.sec }, select: { id: true } });
    if (exists) throw new Error(`#${p.sec} 이미 DB 존재(${exists.id}) — FLAG`);
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 울트라썬 시크릿 ${plan.length}장 ===`);
  for (const p of plan) {
    const r = p.rarityId === HR ? "HR" : p.rarityId === UR ? "UR" : p.rarityId;
    console.log(`  #${p.sec} ${p.jaName} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp ?? "-"} ${r}  ← 본문 ${p.baseSet}#${p.baseNum}${p.flag ? "  ⚠ " + p.flag : ""}  img:${p.url.slice(-16)}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JP}-${p.sec}`;
      const g = p.game;
      const lcData = {
        cardPackId: PACK, primarySetId: JP, primaryNumber: String(p.sec), primaryNumberInt: p.sec,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });

      const rcId = `${JP}-${p.sec}`;
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JP,
        number: String(p.sec), numberInt: p.sec, name: p.jaName,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
