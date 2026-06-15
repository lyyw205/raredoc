/**
 * KR V/VMAX 스크램블 교정 + 막혔던 시크릿 VMAX 수집 — S3 무한존 / S3a 전설의고동 / S4 앙천의볼트태클.
 *
 * 발견: 시크릿 VMAX 논리카드(lc-111.. 등)에 본세트 KR V/VMAX 레코드가 오연결돼 있어 시크릿 추가가 막힘.
 *   근본 원인 = 본세트 V/VMAX 블록의 종(種)별 교차 오연결. 검증 결과 **KR번호 = JP번호**라
 *   각 KR 카드를 같은 번호의 논리카드(lc-{CODE}-{번호})로 재연결하면 untangle + 시크릿 LC 해방됨.
 *   (JP/EN 정체성으로 전수 확인: 핫삼/보만다/무한다이노/갈가부기, 마휘핑/석탄산/토게키스, 피카츄.)
 *
 * 단계: ① 오연결 KR 본세트 23장 → lc-{번호} 재연결. ② 해방된 시크릿 VMAX 8장 신규 수집(이미지 null).
 * 실행: npx tsx scripts/fix-kr-vmax-scramble-3packs.ts [--apply]   (기본 dry-run)
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const HR = "cmpp4wysu0016yjurcnv0ys4l"; // Hyper Rare

// ① 재연결: 각 팩의 오연결 본세트 KR 카드 (KR# == 올바른 lc#)
const REPOINT: { code: string; krSet: string; nums: number[] }[] = [
  { code: "S3",  krSet: "kr-s3",  nums: [26, 27, 102, 64, 65, 106, 66, 67, 107, 80, 81, 108] },
  { code: "S3a", krSet: "kr-s3a", nums: [31, 32, 79, 42, 43, 80, 58, 59, 82] },
  { code: "S4",  krSet: "kr-s4",  nums: [30, 31, 104] },
];
// ② 해방된 시크릿 VMAX 신규 (전부 HR)
const SECRETS: { code: string; krSet: string; num: number; name: string }[] = [
  { code: "S3", krSet: "kr-s3", num: 111, name: "갈가부기 VMAX" },
  { code: "S3", krSet: "kr-s3", num: 112, name: "무한다이노 VMAX" },
  { code: "S3", krSet: "kr-s3", num: 113, name: "핫삼 VMAX" },
  { code: "S3", krSet: "kr-s3", num: 114, name: "보만다 VMAX" },
  { code: "S3a", krSet: "kr-s3a", num: 86, name: "마휘핑 VMAX" },
  { code: "S3a", krSet: "kr-s3a", num: 87, name: "석탄산 VMAX" },
  { code: "S3a", krSet: "kr-s3a", num: 88, name: "토게키스 VMAX" },
  { code: "S4", krSet: "kr-s4", num: 114, name: "피카츄 VMAX" },
];
const lcId = (code: string, n: number) => `lc-orphan-jp-tcg-${code}-${n}`;

async function main() {
  console.log(`\n=== KR V/VMAX 스크램블 교정 + 시크릿 수집 ${APPLY ? "[APPLY]" : "[DRY-RUN]"} ===`);
  assertWritable(["og-s3", "og-s3a", "og-s4"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-kr-vmax-scramble-3packs" });

  // ── ① 재연결 ──
  console.log(`\n[①] 본세트 KR V/VMAX 재연결 (KR#→lc-#)`);
  let rep = 0;
  for (const g of REPOINT) {
    for (const n of g.nums) {
      const rc = await prisma.regionCard.findFirst({ where: { setId: g.krSet, numberInt: n, region: "KR" }, select: { id: true, name: true, cardId: true } });
      if (!rc) { console.log(`   [skip] ${g.krSet} #${n} 없음`); continue; }
      const target = lcId(g.code, n);
      if (rc.cardId === target) { console.log(`   [ok] ${rc.id} (${rc.name}) 이미 ${target}`); continue; }
      console.log(`   ${rc.id} (${rc.name}) ${rc.cardId} → ${target}`);
      if (APPLY) { await prisma.regionCard.update({ where: { id: rc.id }, data: { card: { connect: { id: target } } } }); rep++; }
    }
  }

  // ── 해방 확인: 시크릿 LC 에 KR 잔존 없어야 함 ──
  const secLcs = SECRETS.map((s) => lcId(s.code, s.num));
  const stillOcc = await prisma.regionCard.findMany({ where: { cardId: { in: secLcs }, region: "KR" }, select: { id: true, cardId: true } });
  if (stillOcc.length && APPLY) { console.error("🛑 시크릿 LC 에 KR 잔존(해방 실패):", stillOcc); process.exit(1); }
  if (!APPLY) console.log(`   (dry-run: 적용 후 시크릿 LC 해방 예정)`);

  // ── ② 시크릿 VMAX 수집 ──
  console.log(`\n[②] 시크릿 VMAX 신규 수집 (${SECRETS.length}장, HR, 이미지 null)`);
  let add = 0;
  for (const s of SECRETS) {
    const numStr = String(s.num).padStart(3, "0");
    const id = `${s.krSet}-${numStr}`;
    console.log(`   ${id} HR ${s.name} → ${lcId(s.code, s.num)}`);
    if (APPLY) {
      await prisma.regionCard.upsert({
        where: { id },
        create: { id, language: "ko", region: "KR", number: numStr, numberInt: s.num, name: s.name, imageSmall: null, imageLarge: null,
          card: { connect: { id: lcId(s.code, s.num) } }, set: { connect: { id: s.krSet } }, rarity: { connect: { id: HR } } },
        update: { name: s.name, card: { connect: { id: lcId(s.code, s.num) } }, rarity: { connect: { id: HR } } },
      });
      add++;
    }
  }

  console.log(`\n=== ${APPLY ? `완료: 재연결 ${rep} / 시크릿 추가 ${add}` : "DRY-RUN (변경 없음). --apply 로 실행."} ===`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
