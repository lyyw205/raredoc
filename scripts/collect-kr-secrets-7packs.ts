/**
 * KR 시크릿 수집 — SWSH 7팩 (S5a 쌍벽의파이터 · S5I 일격마스터 · S5R 연격마스터 ·
 *   S6a 이브이히어로즈 · S6H 백은의랜스(kr-s6) · S6K 칠흑의가이스트 · S7R 창공스트림).
 *
 * 배경: S8/S7D와 동일 — 한국 부스터박스로 발매됐으나 공식 pokemoncard.co.kr DB/CDN이 최상위 시크릿 티어를
 *   체계적으로 누락. 7팩 모두 공식엔 시크릿 없음(이미지 없음). 메타는 namu.wiki 에서 검증·추출, JP 논리카드에
 *   "정체성"으로 매핑(번호 순열·스크램블 교차검증 완료). 이미지는 미수집(null) → 도감의 EN→JP 폴백+미수집마커로 표시.
 *
 * 매핑 데이터: data/kr-secret-collect.json (병렬 워크플로 산출 + 수동 검증·교정).
 *   교정 반영: S6K #93↔#94(메아리호른/안개의수정) 스왑, 트레이너 순열 다수, S6H 민지=Flannery(지역차 오탐 기각).
 *
 * 실행: npx tsx scripts/collect-kr-secrets-7packs.ts [--apply]   (기본 dry-run)
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
type Row = { code: string; krSet: string; pad: number; cc: number; num: number; name: string; rarityId: string; rarityLabel: string; lc: string };
const ROWS: Row[] = JSON.parse(readFileSync("data/kr-secret-collect.json", "utf8"));

const CODE2GROUP: Record<string, string> = {
  S7R: "og-s7r", S6a: "og-s6a", S6H: "og-s6h", S6K: "og-s6k", S5a: "og-s5a", S5I: "og-s5i", S5R: "og-s5r",
};
const fmt = (num: number, pad: number) => (pad === 3 ? String(num).padStart(3, "0") : String(num));

async function main() {
  console.log(`\n=== KR 시크릿 수집 7팩 (${ROWS.length}장) ${APPLY ? "[APPLY]" : "[DRY-RUN]"} ===`);
  const groups = [...new Set(ROWS.map((r) => CODE2GROUP[r.code]))];
  assertWritable(groups, { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-kr-secrets-7packs" });

  // 모든 타깃 논리카드 실재 확인
  const allLc = [...new Set(ROWS.map((r) => r.lc))];
  const found = await prisma.card.findMany({ where: { id: { in: allLc } }, select: { id: true } });
  const missing = allLc.filter((id) => !found.find((f) => f.id === id));
  if (missing.length) { console.error("🛑 논리카드 누락:", missing); process.exit(1); }
  console.log(`논리카드 확인: ${found.length}/${allLc.length} OK\n`);

  let created = 0, updated = 0;
  const byCode: Record<string, number> = {};
  for (const r of ROWS) {
    const numStr = fmt(r.num, r.pad);
    const id = `${r.krSet}-${numStr}`;
    const data = {
      language: "ko", region: "KR", number: numStr, numberInt: r.num, name: r.name,
      imageSmall: null, imageLarge: null,
      card: { connect: { id: r.lc } },
      set: { connect: { id: r.krSet } },
      rarity: { connect: { id: r.rarityId } },
    };
    const exists = await prisma.regionCard.findUnique({ where: { id }, select: { id: true } });
    byCode[r.code] = (byCode[r.code] ?? 0) + 1;
    if (!APPLY) {
      console.log(`  ${id}  ${r.rarityLabel.padEnd(3)} ${r.name.padEnd(16)} → ${r.lc}  ${exists ? "(update)" : "(create)"}`);
    } else {
      await prisma.regionCard.upsert({ where: { id }, create: { id, ...data }, update: data });
      exists ? updated++ : created++;
    }
  }

  // Set.cardCount = JP 전체 기준
  const ccBySet = new Map<string, number>();
  for (const r of ROWS) ccBySet.set(r.krSet, r.cc);
  console.log(`\n--- Set.cardCount 갱신 ---`);
  for (const [krSet, cc] of ccBySet) {
    console.log(`  ${krSet} → ${cc}`);
    if (APPLY) await prisma.set.update({ where: { id: krSet }, data: { cardCount: cc } });
  }

  console.log(`\n팩별 카드수: ${JSON.stringify(byCode)}`);
  console.log(`=== ${APPLY ? `완료: create ${created}, update ${updated}` : "DRY-RUN (변경 없음). --apply 로 실행."} ===`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
