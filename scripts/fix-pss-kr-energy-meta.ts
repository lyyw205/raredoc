/**
 * PBG = プラズマ団バトルギフトセット (code PSS, BW era, 2012-11-16) 교정.
 *  (A) kr-pss 기본에너지 충돌 untangle (XYC/XYA 동일패턴) — 2장이 #5/#8 + 다크라이/모노두 LC를 잘못 공유:
 *        · 기본 초 에너지: #5→#17, lc-005(다크라이)→lc-017(JP #17 基本超エネルギー)
 *        · 기본 악 에너지: #8→#18, lc-008(모노두)→lc-018(JP #18 基本悪エネルギー)
 *      교정후 kr-pss = 18 distinct (모든 정체성 정상), JP 구조와 일치.
 *  (B) jp-tcg-PSS2 메타: nameKo 오염("BW 「볼트로스 덱」" 복붙)→ KR형제명 "BW 「플라스마단 덱」", date 1970→2012-11-16(트래커).
 *  (C) kr-pss date: 리서치 확정 시에만 KR_DATE 채움(미확정이면 null 유지=placeholder 플래그).
 *  ※ 카드연결 변경(에너지 LC 재링크)이라 assertWritable 가드 적용. PSS 그룹은 비보호라 통과.
 *  실행: npx tsx scripts/fix-pss-kr-energy-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

// ── 리서치 확정값 (워크플로 wbcrv5kjx, high conf) ──
//  JP date: seesaawiki pokeca wiki 発売日 2012/11/16 (Serebii "Nov14"=아웃라이어, 출처우선순위로 기각)
//  KR date: pokemoncard.co.kr/card/22 발매일 2013-04-22 (1차 공식, 한국판 002/016 등급카드 교차확인)
//  공식명: "포켓몬 카드 게임 BW 「플라스마단 스페셜 세트」" (기존 "플라스마단 덱"=번들 덱 컴포넌트명)
//  ※공식 넘버드셋=16(/016, 플라스마에너지 016/016). 트래커18 = 16넘버드 + 기본에너지2(초/악). DB도 18=트래커일치 유지.
const JP_DATE = "2012-11-16";
const KR_DATE: string | null = "2013-04-22";
const OFFICIAL_NAME = "BW 「플라스마단 스페셜 세트」"; // jp.nameKo + kr.name/nameKo 통일(공식)
const JP_NAMEKO = OFFICIAL_NAME;

const ENERGY_FIXES = [
  { name: "기본 초 에너지", fromN: 5, fromLc: "lc-jp-tcg-PSS2-005", toN: 17, toLc: "lc-jp-tcg-PSS2-017" },
  { name: "기본 악 에너지", fromN: 8, fromLc: "lc-jp-tcg-PSS2-008", toN: 18, toLc: "lc-jp-tcg-PSS2-018" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  // 영향 set 들의 setGroupId 로 동결 가드
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-PSS2", "kr-pss"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-pss" });

  console.log(`■ PBG(PSS) 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  // (A) kr-pss 에너지 충돌 untangle
  console.log("· (A) kr-pss 기본에너지 untangle");
  for (const f of ENERGY_FIXES) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: "kr-pss", name: f.name, numberInt: f.fromN, cardId: f.fromLc } });
    if (!rc) { console.log(`  🔴 ${f.name} (#${f.fromN}/${f.fromLc}) 못찾음 → skip(안전)`); continue; }
    const clash = await prisma.regionCard.findFirst({ where: { setId: "kr-pss", numberInt: f.toN } });
    if (clash) { console.log(`  🔴 #${f.toN} 이미 존재(${clash.name}) → skip`); continue; }
    console.log(`  ✔ ${f.name}: #${f.fromN}→#${f.toN}, ${f.fromLc}→${f.toLc}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { numberInt: f.toN, cardId: f.toLc } });
  }

  // (B) jp-tcg-PSS2 메타
  console.log("\n· (B) jp-tcg-PSS2 nameKo/date");
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-PSS2" }, select: { nameKo: true, releaseDate: true } });
  console.log(`  nameKo "${jp?.nameKo}" → "${JP_NAMEKO}" | date ${jp?.releaseDate?.toISOString().slice(0,10)} → ${JP_DATE}`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-PSS2" }, data: { nameKo: JP_NAMEKO, releaseDate: new Date(`${JP_DATE}T00:00:00Z`) } });

  // (C) kr-pss date + 공식명 통일
  console.log("\n· (C) kr-pss date/name");
  const kr = await prisma.set.findUnique({ where: { id: "kr-pss" }, select: { name: true, nameKo: true, releaseDate: true } });
  console.log(`  name "${kr?.name}" → "${OFFICIAL_NAME}" | date ${kr?.releaseDate?.toISOString().slice(0,10)} → ${KR_DATE ?? "(유지)"}`);
  if (APPLY) {
    const data: any = { name: OFFICIAL_NAME, nameKo: OFFICIAL_NAME };
    if (KR_DATE) data.releaseDate = new Date(`${KR_DATE}T00:00:00Z`);
    await prisma.set.update({ where: { id: "kr-pss" }, data });
  }

  // cardCount 동기화
  if (APPLY) {
    for (const id of ["jp-tcg-PSS2", "kr-pss"]) {
      const n = await prisma.regionCard.count({ where: { setId: id } });
      await prisma.set.update({ where: { id }, data: { cardCount: n } });
    }
    // 검증
    for (const id of ["jp-tcg-PSS2", "kr-pss"]) {
      const rows = await prisma.regionCard.findMany({ where: { setId: id }, select: { numberInt: true } });
      const distinct = new Set(rows.map((r) => r.numberInt)).size;
      console.log(`\n=== 검증 ${id}: rows=${rows.length}, distinct=${distinct}`);
    }
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
