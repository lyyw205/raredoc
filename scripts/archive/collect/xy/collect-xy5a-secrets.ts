// 타이달스톰 (Tidal Storm, og-xy5a / jp-tcg-XY5a) JP 누락 시크릿 #079~080 수집 — 골드 UR 아이템 2장.
//
// 본문(1..78)은 이미 DB. 시크릿 2장(이미지 직독 확인):
//   #079 改造ハンマー (Enhanced Hammer) — 골드 UR Item.  인쇄번호 "XY11 079/070" 직독.
//   #080 ダイブボール   (Dive Ball)       — 골드 UR Item.  인쇄번호 "XY11 080/070" 직독.
// 둘 다 본문 트레이너(아이템)의 alt-art(골드 UR) 재록이라 게임데이터 동일.
//
// 특이사항(중요):
//   * 改造ハンマー 는 XY5a 본문에 in-set 프린트가 없음 → STEP4 폴백: 동일 gameCardId(gc_29881494e0f8a54f1dc3,
//     bw4 #063 원본·twilight #132 와 동일)의 타세트 프린트에서 게임필드 복제. (FLAG)
//   * 이 골드 시크릿들의 **동일 alt-art EN 프린트가 이미 DB에 존재**:
//       lc-orphan-en-tcg-xy5-161 = EN #161 Dive Ball (골드), gc_a7168c22c51a6652595b
//       lc-orphan-en-tcg-xy5-162 = EN #162 Enhanced Hammer (골드), gc_29881494e0f8a54f1dc3
//     → STEP6 에 따라 JP RC 를 새 orphan LC 로 만들지 않고 **기존 EN 골드 orphan LC 에 JP 로케일을 붙여 EN↔JP 연결**.
//     KR XY5 는 시크릿 슬롯 없음(max 78) → KR 없음.
//   * EN orphan LC 의 nameKo 가 비어있어 본문 한글명(다이브볼/개조해머)으로 백필.
//
// 레어도: 골드 UR → 'Ultra Rare' (cmpp4wyzt001wyjuriy5esk1h, tier8). 이미지 직독으로 두 장 모두 UR 확정.
// 번호포맷: jp-tcg-XY5a 는 3자리 zero-pad("079","080"). RC id = jp-tcg-XY5a-079 / -080.
// og-xy5a 비동결. dry-run 기본, --apply 로 기록. 단일 $transaction. 멱등 upsert.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-XY5a";
const PACK = "og-xy5a";
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8) — 골드

const I = (h: string, ext: string) =>
  `https://static.tcgcollector.com/content/images/${h.slice(0, 2)}/${h.slice(2, 4)}/${h.slice(4, 6)}/${h}.${ext}`;

// 시크릿 정의. enLcId = 동일 alt-art 의 기존 EN 골드 orphan LC (여기에 JP 로케일 부착).
type Sec = {
  num: number;
  jaName: string;
  koName: string;
  enLcId: string;
  imgHash: string;
  imgExt: string;
  expectGc: string;
};
const SECRETS: Sec[] = [
  {
    num: 79,
    jaName: "改造ハンマー",
    koName: "개조해머",
    enLcId: "lc-orphan-en-tcg-xy5-162", // EN #162 Enhanced Hammer (gold)
    imgHash: "a27a9f9e150612607d345fb62dc5c93213dad4aa357aa9937ad3dff67041732a",
    imgExt: "webp",
    expectGc: "gc_29881494e0f8a54f1dc3",
  },
  {
    num: 80,
    jaName: "ダイブボール",
    koName: "다이브볼",
    enLcId: "lc-orphan-en-tcg-xy5-161", // EN #161 Dive Ball (gold)
    imgHash: "5e30b9cffcf181cbb38f6041c8c499f2fc70f63c8e4f5e7faccd0a23027fe6c8",
    imgExt: "webp",
    expectGc: "gc_a7168c22c51a6652595b",
  },
];

const pad = (n: number) => String(n).padStart(3, "0");

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-xy5a-secrets" });

  // 가드: jpSet 현재 max·번호포맷
  const max = await prisma.regionCard.findFirst({
    where: { setId: SET }, orderBy: { numberInt: "desc" }, select: { numberInt: true },
  });
  if ((max?.numberInt ?? 0) !== 78) {
    console.warn(`⚠ 예상 currentMax=78 이지만 실제 max=${max?.numberInt} — 검토 필요(계속 진행하되 충돌검사로 보호).`);
  }

  const plan: Array<{
    num: number; jaName: string; koName: string; enLcId: string; img: string; rarityId: string;
  }> = [];

  for (const s of SECRETS) {
    // STEP3: currentMax 초과 + 충돌 0 검증
    if (s.num <= 78) throw new Error(`#${s.num} 는 currentMax(78) 이하 — FLAG, 중단`);
    const rcId = `${SET}-${pad(s.num)}`;
    const numClash = await prisma.regionCard.findFirst({ where: { setId: SET, numberInt: s.num }, select: { id: true, name: true } });
    if (numClash) throw new Error(`#${s.num} 번호 충돌: 기존 RC ${numClash.id} (${numClash.name}) — 덮어쓰기 금지, FLAG, 중단`);
    const idClash = await prisma.regionCard.findUnique({ where: { id: rcId }, select: { id: true } });
    if (idClash) throw new Error(`RC id ${rcId} 이미 존재 — FLAG, 중단`);

    // STEP4/6: 기존 EN 골드 orphan LC 확인 + gameCardId 일치 검증
    const enLc = await prisma.card.findUnique({
      where: { id: s.enLcId },
      select: { id: true, gameCardId: true, supertype: true, subtypes: true, cardPackId: true, nameKo: true },
    });
    if (!enLc) throw new Error(`EN orphan LC ${s.enLcId} 없음 (#${s.num}) — FLAG, 중단`);
    if (enLc.gameCardId !== s.expectGc) throw new Error(`#${s.num} gameCardId 불일치: LC=${enLc.gameCardId} expect=${s.expectGc} — FLAG, 중단`);
    if (enLc.cardPackId !== PACK) throw new Error(`#${s.num} EN LC pack=${enLc.cardPackId} != ${PACK} — FLAG, 중단`);

    plan.push({
      num: s.num, jaName: s.jaName, koName: s.koName, enLcId: s.enLcId,
      img: I(s.imgHash, s.imgExt), rarityId: UR,
    });
  }

  console.log(`\n=== 타이달스톰(og-xy5a) 시크릿 수집 (${APPLY ? "APPLY" : "DRY-RUN"}) — ${plan.length}장 ===`);
  for (const p of plan)
    console.log(`  #${pad(p.num)} ${p.jaName} (${p.koName})  UR(gold)  → 기존 EN LC ${p.enLcId} 에 JP 로케일 부착`);

  if (!APPLY) {
    console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)");
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      // nameKo 백필 (EN orphan LC 에 한글명 추가)
      await tx.card.update({ where: { id: p.enLcId }, data: { nameKo: p.koName } });

      // JP RegionCard upsert (멱등) — 기존 EN 골드 LC 에 JP 로케일 부착
      const rcId = `${SET}-${pad(p.num)}`;
      const rc = {
        cardId: p.enLcId,
        language: "ja",
        region: "JP",
        setId: SET,
        number: pad(p.num),
        numberInt: p.num,
        name: p.jaName,
        imageSmall: p.img,
        imageLarge: p.img,
        rarityId: p.rarityId,
        // RegionCard 에 illustrator 필드 없음(LC 에만 존재) — 생략.
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
