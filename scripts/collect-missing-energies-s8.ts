// 누락 기본 에너지 수집 (2차) — VMAX 클라이맥스(og-s8b) JP #286~293 · 25th Anniversary(og-s8a) JP #31~38
//
// 두 팩 모두 KR 기본에너지는 이미 DB 에 존재(KR-단독 LC), JP 만 누락 → 기존 KR LC 에 JP 로케일을 붙인다.
//   - S8a: JP 번호 = KR 번호 (둘 다 31~38, 동일 슬롯).
//   - S8b: KR 에너지 278~285(Grass~Metal 검증됨) ↔ JP 286~293 = KR+8 (같은 타입 순서, 오프셋만 +8).
//     → JP 번호를 확정 KR 블록에서 파생(임의 가정 없음). 타입은 KR 이름→JP 이름 맵으로 결정.
// EN 대응 없음(VMAX Climax=EN세트 없음 / 25th=Celebrations 에 기본에너지 없음).
// JP 이미지: 공식/limitless/tcgdex 모두 미보유 → null(UI 가 KR 형제 일러로 폴백 + 미수집 마커). KR 이미지는 기존 그대로.
// JP 레어도: 동일 물리카드인 KR 형제의 rarityId 를 그대로 매칭(※ 기존 KR 레어도가 일부 비균질 — 보고서에서 별도 플래그).
//
// og-s8a/og-s8b 는 동결 목록에 없음(가드는 통과). 기본 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");

// KR 기본에너지 이름 → JP 이름
const KO2JA: Record<string, string> = {
  "기본 풀 에너지": "基本草エネルギー",
  "기본 불꽃 에너지": "基本炎エネルギー",
  "기본 물 에너지": "基本水エネルギー",
  "기본 번개 에너지": "基本雷エネルギー",
  "기본 초 에너지": "基本超エネルギー",
  "기본 격투 에너지": "基本闘エネルギー",
  "기본 악 에너지": "基本悪エネルギー",
  "기본 강철 에너지": "基本鋼エネルギー",
};

type Plan = {
  pack: string; lcId: string; ko: string; ja: string;
  jpSetId: string; jpNum: number; jpId: string; rarityId: string | null; lcNameKoNull: boolean;
};

async function buildPlan(): Promise<Plan[]> {
  const out: Plan[] = [];

  // ── S8a: KR #31~38 (동일 번호로 JP 추가) ──
  const s8a = await prisma.regionCard.findMany({
    where: { setId: "kr-s8a", numberInt: { gte: 31, lte: 38 }, card: { supertype: "Energy" } },
    select: { numberInt: true, name: true, cardId: true, rarityId: true, card: { select: { cardPackId: true, nameKo: true, locales: { select: { region: true } } } } },
    orderBy: { numberInt: "asc" },
  });
  for (const r of s8a) {
    const ja = KO2JA[r.name]; if (!ja) throw new Error(`S8a KR 이름 매핑 실패: "${r.name}"`);
    if (r.card?.cardPackId !== "og-s8a") throw new Error(`S8a LC pack 불일치: ${r.cardId} → ${r.card?.cardPackId}`);
    if (r.card?.locales.some((l) => l.region === "JP")) console.warn(`  ⚠ ${r.cardId} 에 이미 JP 있음 — upsert 멱등`);
    out.push({ pack: "og-s8a", lcId: r.cardId, ko: r.name, ja, jpSetId: "jp-tcg-S8a", jpNum: r.numberInt!, jpId: `jp-tcg-S8a-${r.numberInt}`, rarityId: r.rarityId, lcNameKoNull: !r.card?.nameKo });
  }

  // ── S8b: KR 기본에너지 #278~285 → JP = KR+8 (#286~293) ──
  const s8b = await prisma.regionCard.findMany({
    where: { setId: "kr-s8b", numberInt: { gte: 278, lte: 285 }, card: { supertype: "Energy", subtypes: { has: "Basic Energy" } } },
    select: { numberInt: true, name: true, cardId: true, rarityId: true, card: { select: { cardPackId: true, nameKo: true, locales: { select: { region: true } } } } },
    orderBy: { numberInt: "asc" },
  });
  for (const r of s8b) {
    const ja = KO2JA[r.name]; if (!ja) throw new Error(`S8b KR 이름 매핑 실패: "${r.name}"`);
    if (r.card?.cardPackId !== "og-s8b") throw new Error(`S8b LC pack 불일치: ${r.cardId} → ${r.card?.cardPackId}`);
    if (r.card?.locales.some((l) => l.region === "JP")) console.warn(`  ⚠ ${r.cardId} 에 이미 JP 있음 — upsert 멱등`);
    const jpNum = r.numberInt! + 8;
    out.push({ pack: "og-s8b", lcId: r.cardId, ko: r.name, ja, jpSetId: "jp-tcg-S8b", jpNum, jpId: `jp-tcg-S8b-${jpNum}`, rarityId: r.rarityId, lcNameKoNull: !r.card?.nameKo });
  }
  return out;
}

async function main() {
  assertWritable(["og-s8a", "og-s8b"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-missing-energies-s8" });
  const plan = await buildPlan();

  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) — JP 로케일 ${plan.length}개 추가 ===`);
  if (plan.length !== 16) console.warn(`⚠ 기대 16개인데 ${plan.length}개 — KR 에너지 블록 확인 필요`);
  for (const p of plan)
    console.log(`  [${p.pack}] ${p.jpId}  #${p.jpNum} ${p.ja}  (${p.ko})  rar=${p.rarityId ?? "null"}  → LC ${p.lcId}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      if (p.lcNameKoNull) await tx.card.update({ where: { id: p.lcId }, data: { nameKo: p.ko } });
      const rc = {
        cardId: p.lcId, language: "ja", region: "JP", setId: p.jpSetId,
        number: String(p.jpNum), numberInt: p.jpNum, name: p.ja,
        imageSmall: null as string | null, imageLarge: null as string | null, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: p.jpId }, create: { id: p.jpId, ...rc }, update: rc });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
