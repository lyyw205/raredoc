// CP4 (프리미엄챔피언팩 EX×M×BREAK) — 누락된 미러 기본에너지 9장 #132~140 수집.
//   타입순 草132 炎133 水134 雷135 超136 闘137 悪138 鋼139 페어리140 (SM12a 251~258 선례 순서).
//   각 에너지는 동일 gameCardId 의 기본에너지 게임필드를 복제 → 식별 일관성 보장.
//   이미지는 사용자 제공 tcgcollector webp (타입별 직접 육안 확인 완료). 레어도는 CP4 관례(null).
// og-cp4 비동결. dry-run 기본, --apply 로 기록. 단일 $transaction. 멱등 upsert.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-CP4";
const PACK = "og-cp4";
const pad = (n: number) => String(n).padStart(3, "0");
const IMG = (h: string) => `https://static.tcgcollector.com/content/images/${h.slice(0,2)}/${h.slice(2,4)}/${h.slice(4,6)}/${h}.webp`;

// 번호 ← 타입 ← (gameCardId, JP명, KR명, 이미지해시) — 육안 확인 매핑
const ENERGIES = [
  { num: 132, gc: "gc_b7ba3d8bf11e71118a3d", ja: "基本草エネルギー",         ko: "기본 풀 에너지",     hash: "ed348a675d46497856e5eaebe615ed71c94d0fa38e56f6f84da91192717302f1" }, // 草
  { num: 133, gc: "gc_f52f0821cb78ec2cd22e", ja: "基本炎エネルギー",         ko: "기본 불꽃 에너지",   hash: "bceb86a3778631b6b684804770f8cd53cbc048bacd02725e9a2237b51cca2889" }, // 炎
  { num: 134, gc: "gc_f393c822e06a3b7c5558", ja: "基本水エネルギー",         ko: "기본 물 에너지",     hash: "09d6bb12adfe360aa3aabe5438421353cff94b2f682099d8649ecf538563f3b1" }, // 水
  { num: 135, gc: "gc_8ab2d80cc76e77c94619", ja: "基本雷エネルギー",         ko: "기본 번개 에너지",   hash: "10342409020df2af21341852376604bdcc1a1ded6fe0235dbd0537cd1b2d9b87" }, // 雷
  { num: 136, gc: "gc_8a2a3e1260344e9d5452", ja: "基本超エネルギー",         ko: "기본 초 에너지",     hash: "cc409bafda442a7a75be5ee6414a0b30017c082610f1060f76c3f93f98bad604" }, // 超
  { num: 137, gc: "gc_4f447d84461af1888b5a", ja: "基本闘エネルギー",         ko: "기본 격투 에너지",   hash: "34c84da214d903103b91f0823b600f3978b089a67b15f28fd0890597a60526c9" }, // 闘
  { num: 138, gc: "gc_b4ea4f4b7f247b4336c9", ja: "基本悪エネルギー",         ko: "기본 악 에너지",     hash: "857dd4829a3ab23f1d8e672ed07b056d2aa01b563a395c8a3ce2370d428f0a53" }, // 悪 (URL[7]=08.webp)
  { num: 139, gc: "gc_0daf4137b29fbd3931c4", ja: "基本鋼エネルギー",         ko: "기본 강철 에너지",   hash: "ceaa4e93f343ec3111b78700bd90e28be0b057afda48f92d79cbf612255cf444" }, // 鋼 (URL[6]=07.webp)
  { num: 140, gc: "gc_690568a4bbf0803a1912", ja: "基本フェアリーエネルギー", ko: "기본 페어리 에너지", hash: "d133b0282bc1b3137d186f36158a8ac22745f9b483aa851b28b00fd59f691a06" }, // フェアリー
];

const GAME = { supertype:true, subtypes:true, types:true, hp:true, retreatCost:true, weakness:true, resistance:true,
  regulationMark:true, pokedexNumbers:true, rules:true, flavorText:true, abilities:true, attacks:true, legalities:true,
  evolvesFrom:true, evolvesTo:true, gameCardId:true, nameKo:true } as const;

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-cp4-energies" });

  // CP4 현황: max 번호 + 레어도 분포(관례 확인)
  const existing = await prisma.regionCard.findMany({ where: { setId: SET }, select: { numberInt: true, rarityId: true } });
  const maxNum = Math.max(...existing.map(r => r.numberInt ?? 0));
  const rarDist = new Map<string, number>();
  for (const r of existing) rarDist.set(String(r.rarityId), (rarDist.get(String(r.rarityId)) ?? 0) + 1);

  // 타깃 id 충돌 확인
  const targetRcIds = ENERGIES.map(e => `${SET}-${pad(e.num)}`);
  const targetLcIds = ENERGIES.map(e => `lc-orphan-${SET}-${pad(e.num)}`);
  const rcClash = await prisma.regionCard.findMany({ where: { id: { in: targetRcIds } }, select: { id: true } });
  const lcClash = await prisma.card.findMany({ where: { id: { in: targetLcIds } }, select: { id: true } });

  // 각 타입의 게임필드를 동일 gameCardId 의 기존 기본에너지에서 복제
  const plan: any[] = [];
  for (const e of ENERGIES) {
    const src = await prisma.card.findFirst({ where: { gameCardId: e.gc }, select: GAME });
    if (!src) throw new Error(`gameCardId ${e.gc} (#${e.num} ${e.ja}) 의 기존 카드 없음 — 복제 불가`);
    // subtypes 는 ["Basic"] 로 강제: DB 의 JP 기본에너지는 대부분 ["Special"]로 오태깅(import 버그)돼 있고
    // findFirst 결과가 비결정적(草 44:1 등, 페어리는 13:0 Special). UI 는 subtypes 를 라벨칩으로만 쓰며
    // ["Special"]→"특수 에너지"(오표기). 이번 세션 동일 케이스(VSTAR유니버스 S12a #251~258, 포켓몬GO S10b #94~101
    // = JP세트 말미 미러 기본에너지)도 ["Basic"]로 넣었으므로 일관성·정확성 위해 ["Basic"] 고정.
    plan.push({ ...e, game: { ...src, subtypes: ["Basic"], nameKo: e.ko }, img: IMG(e.hash) });
  }

  console.log(`\n=== CP4 미러 기본에너지 수집 (${APPLY ? "APPLY" : "DRY-RUN"}) ===`);
  console.log(`현재 ${SET} max 번호: ${maxNum} (→ #132~140 추가, 갭=131↔132 연속)`);
  console.log(`레어도 분포: ${[...rarDist.entries()].map(([k,v]) => `${k}×${v}`).join(", ")}`);
  console.log(`id 충돌: RC ${rcClash.length}건, LC ${lcClash.length}건`);
  console.log(`레어도 지정: null (CP4 관례 — 미러 기본에너지)`);
  console.log("\n[추가 계획] 9장:");
  for (const p of plan) {
    console.log(`  #${pad(p.num)} ${p.ja} | type=${JSON.stringify(p.game.types)} subtypes=${JSON.stringify(p.game.subtypes)} super=${p.game.supertype} gc=${p.game.gameCardId} ko='${p.game.nameKo}'`);
    console.log(`        img=${p.img}`);
  }

  if (rcClash.length || lcClash.length) { console.log("\n⚠️ id 충돌 존재 — 멱등 upsert 로 갱신됨(create→update). 검토 요망."); }
  if (!APPLY) { console.log("\n(dry-run — --apply 로 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${SET}-${pad(p.num)}`;
      const rcId = `${SET}-${pad(p.num)}`;
      const g = p.game;
      const lcData = {
        cardPackId: PACK, primarySetId: SET, primaryNumber: pad(p.num), primaryNumberInt: p.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: null, illustrator: null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rcData = {
        cardId: lcId, language: "ja", region: "JP", setId: SET, number: pad(p.num), numberInt: p.num,
        name: p.ja, imageSmall: p.img, imageLarge: p.img, rarityId: null,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rcData }, update: rcData });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
