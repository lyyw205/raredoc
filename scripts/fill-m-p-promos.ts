/**
 * M-P (jp-tcg-M-P / og-jp-mega-promo) 채우기 — additive.
 *
 * 안전 원칙(매우 중요):
 *  - 기존 RegionCard 70장은 logicalCardId 가 kr-m-p 트윈과 정체성 공유(번호 불일치 매칭).
 *    → 기존 행은 rarityId(=Promo) 만 갱신. name/image/logicalCardId 절대 미변경.
 *  - 신규(jp-m-p-missing.json)만 새 LC(lc-jp-tcg-M-P-NNN)+RC(jp-tcg-M-P-NNN) 생성.
 *    KR 연결은 시도하지 않음(EN/KR 매칭 불변 — 동결 규칙). 신규 JP 카드는 자체 LC 만.
 *  - Set: releaseDate=2025-08-01, cardCount=123 로 메타 교정.
 *
 * 실행: npx tsx scripts/fill-m-p-promos.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync, existsSync } from "node:fs";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const SET_ID = "jp-tcg-M-P";
const CARD_PACK_ID = "og-jp-mega-promo";
const PROMO_RARITY_ID = "cmpp4wyvw001hyjurzznnvic7"; // Rarity code=Promo (프로모/プロモ)
const RELEASE = new Date("2025-08-01");
const TARGET_COUNT = 123;

type Rec = {
  jaName: string; number: string; numberFull: string | null; category: string | null;
  stage: string | null; suffix: string | null; trainerType: string | null;
  types: string[]; dexId: number | null; image: string | null;
};

function mapStage(s?: string | null) {
  if (!s) return null;
  const m: Record<string, string> = { Basic: "Basic", Stage1: "Stage 1", Stage2: "Stage 2", MEGA: "MEGA" };
  return m[s] ?? s;
}
function mapTrainer(t?: string | null) {
  if (!t) return null;
  const m: Record<string, string> = { Supporter: "Supporter", Item: "Item", Stadium: "Stadium", "Pokémon Tool": "Pokémon Tool" };
  return m[t] ?? t;
}
function subtypesOf(c: Rec): string[] {
  const out: string[] = [];
  if (c.category === "Pokemon") {
    const st = mapStage(c.stage); if (st) out.push(st);
    const suf = (c.suffix ?? "").trim();
    if (suf === "ex") out.push("ex"); else if (suf === "EX") out.push("EX");
    else if (suf && /^(V|VMAX|VSTAR|GX)$/i.test(suf)) out.push(suf.toUpperCase());
  } else if (c.category === "Trainer") {
    const tt = mapTrainer(c.trainerType); if (tt) out.push(tt);
  } else if (c.category === "Energy") out.push("Special");
  return out;
}

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();

  // og-jp-mega-promo 가드(현재 비보호지만 표준 가드 적용)
  assertWritable([CARD_PACK_ID], { allow, dryRun: !APPLY, tool: "fill-m-p-promos" });

  // 입력: 공식 전수 인벤토리(jp-m-p-full.json). 기존+신규 모두 포함 — DB에 없는 번호만 생성.
  const srcPath = process.argv.find((a) => a.endsWith(".json")) ?? "data/jp-official/jp-m-p-full.json";
  if (!existsSync(srcPath)) throw new Error(`${srcPath} 없음 — 먼저 collect-mp-promos.ts 실행`);
  const missing: Rec[] = JSON.parse(readFileSync(srcPath, "utf8"));
  console.log(`■ M-P 채우기 | 입력 ${srcPath} (${missing.length}장) | ${APPLY ? "★APPLY" : "(dry-run)"}`);

  // 현재 DB 상태
  const before = await prisma.regionCard.findMany({
    where: { setId: SET_ID }, select: { number: true, rarityId: true },
  });
  const haveNums = new Set(before.map((c) => c.number));
  console.log(`  기존 RegionCard ${before.length}장 (rarityId=null ${before.filter((c) => !c.rarityId).length})`);

  // 신규 = DB 에 없는 번호만
  const toCreate = missing.filter((c) => c.number && !haveNums.has(c.number));
  const skip = missing.filter((c) => c.number && haveNums.has(c.number));
  console.log(`  신규 생성 대상 ${toCreate.length}장${skip.length ? ` (이미존재 스킵 ${skip.length}: ${skip.map((s) => s.number).join(",")})` : ""}`);

  // 커버리지(생성 후 예상)
  const after = new Set<string>([...haveNums, ...toCreate.map((c) => c.number)]);
  const gaps: string[] = [];
  for (let n = 1; n <= TARGET_COUNT; n++) { const s = String(n).padStart(3, "0"); if (!after.has(s)) gaps.push(s); }

  if (!APPLY) {
    console.log("\n(dry-run) 생성 예정 카드:");
    for (const c of toCreate) console.log(`  + ${c.number}/M-P ${c.jaName} | ${c.category}${c.suffix ? "/" + c.suffix : ""} | dex=${c.dexId ?? "-"} | img=${c.image ? "O" : "null"}`);
    console.log(`\n예상 총량: ${after.size} / ${TARGET_COUNT}  (잔여 누락: ${gaps.join(",") || "없음"})`);
    console.log(`rarity: 전체 ${after.size}장 → Promo(${PROMO_RARITY_ID}) 일괄 설정 예정`);
    console.log(`Set: releaseDate→2025-08-01, cardCount→${TARGET_COUNT}`);
    console.log("\n적용하려면 --apply");
    await prisma.$disconnect();
    return;
  }

  // 1) 신규 LC+RC 생성
  let made = 0;
  for (const c of toCreate) {
    const rcId = `${SET_ID}-${c.number}`;
    const lcId = `lc-${SET_ID}-${c.number}`;
    const numInt = parseInt(c.number, 10) || null;
    await prisma.card.upsert({
      where: { id: lcId },
      create: {
        id: lcId, primarySetId: SET_ID, primaryNumber: c.number, primaryNumberInt: numInt,
        pokedexNumbers: c.dexId ? [c.dexId] : [], subtypes: subtypesOf(c), types: c.types ?? [],
      },
      update: {},
    });
    await prisma.regionCard.upsert({
      where: { id: rcId },
      create: {
        id: rcId, cardId: lcId, language: "ja", region: "JP", setId: SET_ID,
        number: c.number, numberInt: numInt, name: c.jaName,
        imageSmall: c.image, imageLarge: c.image, rarityId: PROMO_RARITY_ID,
      },
      update: { name: c.jaName, imageSmall: c.image, imageLarge: c.image, rarityId: PROMO_RARITY_ID },
    });
    made++;
  }
  console.log(`  신규 생성: ${made}장`);

  // 2) 전체 M-P RegionCard rarityId=Promo (기존 70 + 신규)
  const rar = await prisma.regionCard.updateMany({ where: { setId: SET_ID }, data: { rarityId: PROMO_RARITY_ID } });
  console.log(`  rarity Promo 일괄 설정: ${rar.count}장`);

  // 3) Set 메타 교정
  await prisma.set.update({ where: { id: SET_ID }, data: { releaseDate: RELEASE, cardCount: TARGET_COUNT } });
  console.log(`  Set 갱신: releaseDate=2025-08-01, cardCount=${TARGET_COUNT}`);

  // 4) 검증
  const verify = await prisma.regionCard.findMany({ where: { setId: SET_ID }, select: { number: true, rarityId: true } });
  const setRow = await prisma.set.findUnique({ where: { id: SET_ID } });
  const vgaps: string[] = [];
  const vnums = new Set(verify.map((c) => c.number));
  for (let n = 1; n <= TARGET_COUNT; n++) { const s = String(n).padStart(3, "0"); if (!vnums.has(s)) vgaps.push(s); }
  console.log("\n=== 검증 ===");
  console.log(`RegionCard 총 ${verify.length} (목표 ${TARGET_COUNT})`);
  console.log(`rarityId=Promo: ${verify.filter((c) => c.rarityId === PROMO_RARITY_ID).length} / null: ${verify.filter((c) => !c.rarityId).length}`);
  console.log(`Set: releaseDate=${setRow?.releaseDate?.toISOString().slice(0, 10)} cardCount=${setRow?.cardCount}`);
  console.log(`잔여 번호 누락: ${vgaps.join(",") || "없음"}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
