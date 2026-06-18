// エメラルドブレイク (og-xy6 / jp-tcg-XY6) JP 누락 시크릿 #090~091 수집 — UR 골드 트레이너 2장.
//
// 배경: 우리 JP DB 는 본문 1..089 까지만 있고, JP 카드 090/091(UR 골드 풀아트 트레이너)이 미수집.
//   이미지(직독): #090 エネルギーつけかえ (Energy Switch) / #091 バトルサーチャー (VS Seeker). 둘 다 UR 골드(인쇄번호 090/078·091/078).
//   본문(jpSet) EX/M alt-art 가 아니라, 세트의 시크릿 트레이너(골드)다. → jpSet 본문에 동명 카드 없음(in-set 매칭 실패).
//
// STEP4 폴백: in-set 본문 매칭 실패 → 동일 gameCardId 의 EN xy6 시크릿(en-tcg-xy6 #109/#110)이 이미 DB에 실재(같은 골드, illustrator=5ban Graphics).
//   동일 alt-art 프린트가 EN DB에 실재하므로(STEP6), 새 JP orphan LC 를 만들지 않고 그 EN 시크릿 LC 에 JP 로케일을 붙인다.
//   (선례: jp-tcg-S12a #251~258 → lc-orphan-en-tcg-swsh12pt5-* 머지). 게임필드는 트레이너/아이템(전부 비어있음)이라 그대로 + nameKo/rarity 보강.
//   KR 대응 없음(kr-xy6 089 에서 끊김). → JP+EN 연결, KR 미연결.
//
// og-xy6 비동결. dry-run 기본, --apply 로 기록. 단일 $transaction. 멱등 upsert.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-XY6";
const PACK = "og-xy6";
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8) — UR 골드

const I = (h: string, ext: string) =>
  `https://static.tcgcollector.com/content/images/${h.slice(0, 2)}/${h.slice(2, 4)}/${h.slice(4, 6)}/${h}.${ext}`;

// 직독한 시크릿 — 기존 EN 시크릿 LC 에 머지, nameKo 는 gameCardId 정본 클론값
type Sec = { num: number; jaName: string; nameKo: string; rarityId: string; lcId: string; gameCardId: string; img: string };
const SECRETS: Sec[] = [
  {
    num: 90,
    jaName: "エネルギーつけかえ",
    nameKo: "에너지 갈아 달기",
    rarityId: UR,
    lcId: "lc-orphan-en-tcg-xy6-109", // 동일 alt-art EN 시크릿 LC
    gameCardId: "gc_9a7e95380209d233cd59",
    img: I("2877346b0fae0403f32ac0bfd6a37f49ee2c9713e613b7b23c0965456dc286fb", "jpg"),
  },
  {
    num: 91,
    jaName: "バトルサーチャー",
    nameKo: "배틀서처",
    rarityId: UR,
    lcId: "lc-orphan-en-tcg-xy6-110",
    gameCardId: "gc_4d38837d740d4ed6f4e7",
    img: I("a946b1c05445b43eed6f82e6a9004886d40154b9eeb6e4b27921878f5be0e415", "jpg"),
  },
];

const pad = (n: number) => String(n).padStart(3, "0");

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-xy6-secrets" });

  // 가드 1: 타깃 번호가 currentMax(89) 초과여야 하고 DB 미존재여야 함
  const max = await prisma.regionCard.aggregate({ where: { setId: SET }, _max: { numberInt: true } });
  console.log(`\n현재 ${SET} max numberInt = ${max._max.numberInt}`);
  if ((max._max.numberInt ?? 0) >= 90) {
    console.error("🛑 jpSet 가 이미 90 이상 — 점검 필요. 중단."); process.exit(1);
  }

  const plan: any[] = [];
  for (const s of SECRETS) {
    // 타깃 RC id 충돌 검사 (padded + unpadded)
    for (const cand of [`${SET}-${pad(s.num)}`, `${SET}-${s.num}`]) {
      const existing = await prisma.regionCard.findUnique({ where: { id: cand }, select: { id: true, name: true } });
      if (existing) { console.error(`🛑 타깃 RC ${cand} 이미 존재(${existing.name}) — 덮어쓰기 금지. 중단.`); process.exit(1); }
    }
    // 머지 대상 EN 시크릿 LC 존재 확인 + 동일 gameCardId 검증(추측 금지)
    const lc = await prisma.card.findUnique({
      where: { id: s.lcId },
      select: { id: true, gameCardId: true, supertype: true, subtypes: true, nameKo: true, rarityId: true, illustrator: true,
        locales: { select: { region: true, setId: true, number: true } } },
    });
    if (!lc) { console.error(`🛑 머지 대상 LC ${s.lcId} 없음 — 중단.`); process.exit(1); }
    if (lc.gameCardId !== s.gameCardId) {
      console.error(`🛑 LC ${s.lcId} gameCardId(${lc.gameCardId}) != 기대(${s.gameCardId}) — 중단.`); process.exit(1);
    }
    const hasJp = lc.locales.some((l) => l.region === "JP");
    plan.push({ s, lc, hasJp });
  }

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — 시크릿 ${plan.length}장 (UR 골드, JP+EN 머지) ===`);
  for (const p of plan) {
    console.log(`  JP #${pad(p.s.num)} ${p.s.jaName} → LC ${p.lc.id} (${p.lc.supertype}/${JSON.stringify(p.lc.subtypes)}) UR`);
    console.log(`     LC.nameKo: ${p.lc.nameKo ?? "null"} → "${p.s.nameKo}"   LC.rarityId: ${p.lc.rarityId ?? "null"} → UR`);
    console.log(`     기존 LC 로케일: [${p.lc.locales.map((l: any) => `${l.region}:${l.setId}#${l.number}`).join(", ")}]  (JP 이미 있음? ${p.hasJp})`);
    console.log(`     img: ${p.s.img}`);
  }

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const s = p.s as Sec;
      // 1) 기존 EN 시크릿 LC 보강: nameKo, rarityId (illustrator/게임필드는 보존)
      await tx.card.update({
        where: { id: s.lcId },
        data: { nameKo: s.nameKo, rarityId: s.rarityId, cardPackId: PACK },
      });
      // 2) JP RegionCard 멱등 upsert — 그 LC 에 JP 로케일 부착
      const rcId = `${SET}-${pad(s.num)}`;
      const rc = {
        cardId: s.lcId, language: "ja", region: "JP", setId: SET,
        number: pad(s.num), numberInt: s.num, name: s.jaName,
        imageSmall: s.img, imageLarge: s.img, rarityId: s.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
