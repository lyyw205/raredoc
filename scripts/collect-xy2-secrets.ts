// ワイルドブレイズ (Wild Blaze / Flashfire JP, og-xy2 / jp-tcg-XY2) 누락 시크릿 #088~090 수집 — UR 골드 3장.
//
// XY2 본문 정본 카드수 = 080 + 풀아트 SR(#081~087) → DB max 087. #088~090 은 미수집 UR(골드).
// 이미지 직독(인쇄번호·이름·레어도) 결과:
//   #088 MリザードンEX  HP220 グレンダイブ  088/080 UR  — 메가리자몽 X폼 (gc_04f5d806dd0e566a8888)
//   #089 MリザードンEX  HP230 ワイルドブレイズ 089/080 UR — 메가리자몽 Y폼 (gc_9a509c9ad9d0e711c8f5) ← 본문 #055
//   #090 MガルーラEX    HP230 ガンガンパンチ 090/080 UR  — 메가캥카 (gc_2320a2ba57c2a9921952)       ← 본문 #065
// 게임데이터는 본문 alt-art 재록이라 동일 → jaName/gameCardId 매칭 본문 카드에서 복제, 번호·레어도·이미지만 새로 부여.
// 일러스트레이터는 null(미수집). KR/EN 대응 없음(JP 단독 — kr-xy2 87장에 시크릿 없음, EN 시크릿은 별도 orphan LC).
//
// ⚠ FLAG: #088(X폼)은 jp-tcg-XY2 본문에 프린트가 없음(0 in-set body). 동일 gameCardId 타세트 프린트
//   jp-tcg-CP6 #013(HP220, グレンダイブ)에서 게임필드 복제. (Bulbapedia 상 Flashfire JP 시크릿 88~90 정합.)
//
// og-xy2 비동결. 기본 dry-run, --apply 로 기록. 단일 $transaction, 멱등 upsert.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-XY2";
const PACK = "og-xy2";
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8) — XY 골드 UR
const I = (h: string) => `https://static.tcgcollector.com/content/images/${h.slice(0,2)}/${h.slice(2,4)}/${h.slice(4,6)}/${h}.jpg`;
const pad = (n: number) => String(n).padStart(3, "0");

const GAME = { supertype:true, subtypes:true, types:true, hp:true, retreatCost:true, weakness:true, resistance:true,
  regulationMark:true, pokedexNumbers:true, rules:true, flavorText:true, abilities:true, attacks:true, legalities:true,
  evolvesFrom:true, evolvesTo:true, gameCardId:true, nameKo:true } as const;

// 시크릿 정의 — baseLc = 게임필드 복제원(LogicalCard id), jaName = 이미지 인쇄명, img = tcgcollector url
type Sec = { num: number; jaName: string; rarity: string; img: string; baseLc: string; baseInSet: boolean };
const SECRETS: Sec[] = [
  { num: 88, jaName: "MリザードンEX", rarity: UR, img: I("82a5b1ec4111fb95d9b92e448b6926584bf3bb65fcb0f1364f16ed9100279e40"), baseLc: "lc-jp-tcg-CP6-013", baseInSet: false }, // X폼 HP220 グレンダイブ
  { num: 89, jaName: "MリザードンEX", rarity: UR, img: I("859179792840344371b4d3da4605397497cae3441c8e4dc44dfeabe868ae49a8"), baseLc: "lc-jp-tcg-XY2-055", baseInSet: true },  // Y폼 HP230 ワイルドブレイズ
  { num: 90, jaName: "MガルーラEX",   rarity: UR, img: I("12b6d39ea208fe2ee0632911ccde92712e84192e9910a75017631903e98cc631"), baseLc: "lc-jp-tcg-XY2-065", baseInSet: true },  // HP230 ガンガンパンチ
];

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-xy2-secrets" });

  // 본문 max & 충돌 검증
  const maxRc = await prisma.regionCard.findFirst({ where:{ setId: SET }, orderBy:{ numberInt:"desc" }, select:{ numberInt:true } });
  const currentMax = maxRc?.numberInt ?? 0;
  console.log(`\njp-tcg-XY2 현재 max numberInt = ${currentMax} (시크릿은 모두 ${currentMax} 초과여야 함)`);

  const plan: any[] = [];
  for (const s of SECRETS) {
    if (s.num <= currentMax) throw new Error(`#${s.num} 가 currentMax(${currentMax}) 이하 — 중단(STEP3 위반)`);
    const rcId = `${SET}-${pad(s.num)}`;
    const exist = await prisma.regionCard.findUnique({ where:{ id: rcId }, select:{ id:true } });
    if (exist) throw new Error(`#${s.num} (${rcId}) 이미 존재 — 덮어쓰기 금지(STEP3 FLAG)`);

    const g = await prisma.card.findUnique({ where:{ id: s.baseLc }, select:{ ...GAME } });
    if (!g) throw new Error(`base LC ${s.baseLc} 없음 (#${s.num})`);
    plan.push({ ...s, game: g });
  }

  console.log(`\n=== 와일드블레이즈(og-xy2) 시크릿 수집 (${APPLY ? "APPLY" : "DRY-RUN"}) — ${plan.length}장 ===`);
  for (const p of plan)
    console.log(`  #${pad(p.num)} ${p.jaName} HP${p.game.hp} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] gc=${p.game.gameCardId} ko=${p.game.nameKo} UR  ← ${p.baseLc}${p.baseInSet?"":"  ⚠FLAG: 타세트(CP6) 복제(in-set 본문 없음)"}`);

  if (!APPLY) { console.log("\n(dry-run — --apply 로 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${SET}-${pad(p.num)}`;
      const g = p.game;
      const lcData = {
        cardPackId: PACK, primarySetId: SET, primaryNumber: pad(p.num), primaryNumberInt: p.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarity, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rcId = `${SET}-${pad(p.num)}`;
      const rc = {
        cardId: lcId, language: "ja", region: "JP", setId: SET,
        number: pad(p.num), numberInt: p.num, name: p.jaName,
        imageSmall: p.img, imageLarge: p.img, rarityId: p.rarity,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
