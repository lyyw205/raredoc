// ミラクルツイン / 미라클트윈 (og-sn11) JP 누락 시크릿 #107~115 수집 — 게임필드 본문복제 + 이미지.
//
// 본문+SR(1..106)은 이미 DB. currentMax(106) 초과 #107~115(9장)이 미수집 시크릿:
//   #107~112 = HR(무지개, 6장)  ·  #113~115 = UR(골드, 3장)
//   전부 본문 카드의 alt-art 재록(게임데이터 동일, 번호·레어도·일러만 다름).
// 번호 포맷: 이 JP set 은 zero-pad 3자리("107") — DB 기존 행과 일치시킴.
// 본문 매칭: jaName 으로 jpSet 안 같은 이름·낮은 번호 카드의 게임필드 복제. 이미지/일러는 RC 에만(tcgcollector URL).
// EN 없음(JP+KR 팩). KR 동일카드 프린트는 보통 미존재(하이클래스 시크릿) — STEP6 에서 확인.
// og-sn11 비동결. 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const PACK = "og-sn11";
const JP = "jp-tcg-sn11";
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare
const SR = "cmpp4wyyk001ryjurevrx3dq0"; // Super Rare (미사용, 참조)

// 이미지에서 직접 읽은 (시크릿번호, JP카드명, 레어도, 이미지URL). 도감순 1..9 = 107..115.
const CARDS: { num: number; jaName: string; rarityId: string; url: string }[] = [
  { num: 107, jaName: "ヤドン&コダックGX",          rarityId: HR, url: "https://static.tcgcollector.com/content/images/03/1c/0c/031c0ce77ded9a97cb5dcebdd6fb26c1a0cdc4fbcff46b21bf78e6a782c7330d.jpg" },
  { num: 108, jaName: "ミュウツー&ミュウGX",         rarityId: HR, url: "https://static.tcgcollector.com/content/images/28/3e/dc/283edc9140463064c6c15add0175db8dda17a97d6bf82e8e74ce691742cc3e42.jpg" },
  { num: 109, jaName: "ラティオスGX",                rarityId: HR, url: "https://static.tcgcollector.com/content/images/7f/25/bd/7f25bdbd14ae50372d5642495ef7a36748a9e9b3bbe5f55fdc1608ba708977c3.jpg" },
  { num: 110, jaName: "プテラGX",                    rarityId: HR, url: "https://static.tcgcollector.com/content/images/2c/ba/71/2cba71e9beb03db7ae6bf176cab7648d22558c4468f39662a8c65e5fa12d7eab.jpg" },
  { num: 111, jaName: "メガヤミラミ&バンギラスGX",   rarityId: HR, url: "https://static.tcgcollector.com/content/images/db/c7/aa/dbc7aa71b934fb6d46e37ea31c7a8a99343ba96a47a6d1ea897bb4e0150b1f53.jpg" },
  { num: 112, jaName: "カイリューGX",                rarityId: HR, url: "https://static.tcgcollector.com/content/images/93/77/b8/9377b8575bcbef9c025039d0af258b8bbd85d169bbdb1669cb70c6fdfce7f5ae.jpg" },
  { num: 113, jaName: "プレシャスボール",            rarityId: UR, url: "https://static.tcgcollector.com/content/images/94/16/39/94163905d04635ffbc99c1ba2a4d38c68a2acd99cb69fe18403bfa4f2a331dda.jpg" },
  { num: 114, jaName: "ジャイアントボム",            rarityId: UR, url: "https://static.tcgcollector.com/content/images/30/fd/44/30fd446ac784c985710c383bc43ebb72b2ad9ab15ce585de922d2920c56a8756.jpg" },
  { num: 115, jaName: "ウィークガードエネルギー",    rarityId: UR, url: "https://static.tcgcollector.com/content/images/55/11/20/551120c2f38070800289f5a159a17f746cce4165159a73f7fd085b396ad54e4c.jpg" },
];

const pad3 = (n: number) => String(n).padStart(3, "0");

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

const rLabel = (id: string) => (id === HR ? "HR" : id === UR ? "UR" : id === SR ? "SR" : id);

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-miracletwin-secrets" });

  // STEP3 가드: 타깃 번호가 모두 currentMax(106) 초과 + DB 미존재
  const targetNums = CARDS.map((c) => c.num);
  const max = Math.max(...(await prisma.regionCard.findMany({ where: { setId: JP }, select: { numberInt: true } })).map((r) => r.numberInt ?? 0));
  const dupes = await prisma.regionCard.findMany({ where: { setId: JP, numberInt: { in: targetNums } }, select: { numberInt: true } });
  if (dupes.length) throw new Error(`타깃 번호가 이미 DB 존재: ${dupes.map((d) => d.numberInt).join(",")} — FLAG`);
  for (const n of targetNums) if (n <= max) throw new Error(`타깃 #${n} <= currentMax ${max} — FLAG`);
  console.log(`STEP3 OK: currentMax=${max}, 타깃 ${targetNums.join(",")} 모두 초과 & 미존재.`);

  // 본문 매칭: jaName 으로 jpSet 안 같은 이름·시크릿보다 낮은 번호
  const plan = [] as {
    num: number; jaName: string; rarityId: string; url: string;
    baseNumber: number; game: any;
  }[];
  const flags: string[] = [];

  // 크로스셋 폴백(이 set 본문에 없는 진성 신규 시크릿) — 같은 게임카드(gameCardId)가 다른 set 에 실재.
  //   #113 プレシャスボール: 이 set 본문 부재(공식 SM11도 #113이 첫 등장). 이미지·게임카드 동일성으로 최소복제 + FLAG.
  const CROSS: Record<number, { setId: string; numberInt: number }> = {
    113: { setId: "jp-tcg-SM12", numberInt: 92 }, // gc_1d2b6b4e828cf0d5e665 (프레셔스볼)
  };

  for (const c of CARDS) {
    const bases = await prisma.regionCard.findMany({
      where: { setId: JP, name: c.jaName, numberInt: { lt: c.num } },
      select: { numberInt: true, name: true, card: { select: GAME } },
      orderBy: { numberInt: "asc" },
    });
    if (bases.length) {
      const b = bases[bases.length - 1]; // 가장 가까운(높은) 본문 번호
      plan.push({ ...c, baseNumber: b.numberInt!, game: b.card! });
      continue;
    }
    // 인셋 본문 없음 → 크로스셋 동일 게임카드 폴백
    const cx = CROSS[c.num];
    if (cx) {
      const xb = await prisma.regionCard.findFirst({
        where: { setId: cx.setId, name: c.jaName, numberInt: cx.numberInt },
        select: { numberInt: true, card: { select: GAME } },
      });
      if (xb) {
        flags.push(`본문 인셋 부재 → 크로스셋 복제: #${c.num} ${c.jaName} ← ${cx.setId} #${cx.numberInt} (게임카드 동일, 이미지로 확인). FLAG.`);
        plan.push({ ...c, baseNumber: cx.numberInt, game: xb.card! });
        continue;
      }
    }
    flags.push(`본문 매칭 실패: #${c.num} ${c.jaName} — jpSet 내 같은 이름·낮은 번호 없음 & 크로스셋 폴백 실패`);
    plan.push({ ...c, baseNumber: -1, game: null });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 ===`);
  for (const p of plan) {
    if (!p.game) { console.log(`  #${p.num} ${p.jaName} [${rLabel(p.rarityId)}]  ← 본문 매칭 실패 (FLAG)`); continue; }
    console.log(`  #${p.num} ${p.jaName} [${rLabel(p.rarityId)}]  ← 본문 #${p.baseNumber} (${p.game.supertype} ${JSON.stringify(p.game.subtypes)} HP${p.game.hp} gameCardId=${p.game.gameCardId})`);
  }
  if (flags.length) { console.log(`\n⚠ FLAGS:`); for (const f of flags) console.log(`  - ${f}`); }

  if (!APPLY) { console.log("\n(dry-run — --apply 로 기록)"); await prisma.$disconnect(); return; }
  if (plan.some((p) => !p.game)) { console.error("\n🛑 본문 매칭 실패 카드 존재 — 중단(추측 삽입 금지)."); process.exit(1); }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${JP}-${p.num}`;
      const g = p.game;
      const lcData = {
        cardPackId: PACK, primarySetId: JP, primaryNumber: pad3(p.num), primaryNumberInt: p.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rcId = `${JP}-${p.num}`;
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: JP,
        number: pad3(p.num), numberInt: p.num, name: p.jaName,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log(`\n✅ ${plan.length}장 기록 완료.`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
