/**
 * KR V/VMAX 스크램블 교정 + 시크릿 수집 — S1W 소드 / S1H 실드 / S1a VMAX라이징 / S2 반역크래시 / S2a 폭염워커.
 *
 * S3/S3a/S4 와 동형: 본세트 V/VMAX 블록이 시크릿 VMAX 논리카드를 종(種)별로 교차 점유.
 *   검증 결과 KR번호=JP번호라, 오연결 KR 본세트 카드를 lc-{자기번호}로 재연결하면 untangle.
 *   (s2a 는 스크램블 없음 — 재연결 0, 시크릿만 추가.)
 *
 * ① 재연결 37장 (s1a/s1h/s1w/s2 본세트 V/VMAX). ② 시크릿 39장 신규(이미지 null, EN→JP 표시폴백).
 *   permutation 반영: s1h #71↔72(마리/옐단)·#74↔75(메탈소서/퀵볼), s2 #111↔112·#114↔115 (데이터에 정체성 매핑됨).
 * 매핑 데이터: data/kr-secret-collect-5packs.json.
 * 실행: npx tsx scripts/fix-kr-secrets-5packs.ts [--apply]   (기본 dry-run)
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
type Row = { code: string; krSet: string; cc: number; num: number; name: string; rarityId: string; rarityLabel: string; lc: string };
const SECRETS: Row[] = JSON.parse(readFileSync("data/kr-secret-collect-5packs.json", "utf8"));

// ① 재연결: KR# == 올바른 lc# (본세트 V/VMAX 종별 교차 오연결 교정)
const REPOINT: { code: string; krSet: string; nums: number[] }[] = [
  { code: "S1W", krSet: "kr-s1w", nums: [14, 15, 62, 34, 35, 64, 46, 65] },        // 라프라스/돌헨진/자시안
  { code: "S1H", krSet: "kr-s1h", nums: [45, 46, 66, 19, 20, 62, 44, 65] },        // 잠만보/모르페코/자마젠타
  { code: "S1a", krSet: "kr-s1a", nums: [8, 9, 71, 16, 17, 72, 22, 23, 73] },      // 고릴타/에이스번/인텔리레온
  { code: "S2",  krSet: "kr-s2",  nums: [70, 71, 103, 36, 37, 100, 75, 76, 104, 49, 50, 101] }, // 칼라마네로/스트린더/대왕끼리동/드래펄트
];
const CODE2GROUP: Record<string, string> = { S1W: "og-s1w", S1H: "og-s1h", S1a: "og-s1a", S2: "og-s2", S2a: "og-s2a" };
const lcId = (code: string, n: number) => `lc-orphan-jp-tcg-${code}-${n}`;

async function main() {
  console.log(`\n=== KR 스크램블 교정+시크릿 수집 5팩 ${APPLY ? "[APPLY]" : "[DRY-RUN]"} ===`);
  const groups = [...new Set([...SECRETS.map((s) => CODE2GROUP[s.code]), ...REPOINT.map((r) => CODE2GROUP[r.code])])];
  assertWritable(groups, { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-kr-secrets-5packs" });

  // ① 재연결
  console.log(`\n[①] 본세트 V/VMAX 재연결 (KR#→lc-#)`);
  let rep = 0;
  for (const g of REPOINT) {
    for (const n of g.nums) {
      const rc = await prisma.regionCard.findFirst({ where: { setId: g.krSet, numberInt: n, region: "KR" }, select: { id: true, name: true, cardId: true } });
      if (!rc) { console.log(`   [skip] ${g.krSet} #${n} 없음`); continue; }
      const target = lcId(g.code, n);
      if (rc.cardId === target) { console.log(`   [ok] ${rc.id} 이미 ${target}`); continue; }
      console.log(`   ${rc.id} (${rc.name}) ${rc.cardId} → ${target}`);
      if (APPLY) { await prisma.regionCard.update({ where: { id: rc.id }, data: { card: { connect: { id: target } } } }); rep++; }
    }
  }

  // 해방 확인
  const secLcs = SECRETS.map((s) => s.lc);
  const stillOcc = await prisma.regionCard.findMany({ where: { cardId: { in: secLcs }, region: "KR" }, select: { id: true, cardId: true } });
  if (stillOcc.length && APPLY) { console.error("🛑 시크릿 LC 에 KR 잔존(해방 실패):", stillOcc); process.exit(1); }

  // ② 시크릿 수집
  console.log(`\n[②] 시크릿 신규 수집 (${SECRETS.length}장, 이미지 null)`);
  let add = 0, upd = 0;
  const byCode: Record<string, number> = {};
  for (const s of SECRETS) {
    const numStr = String(s.num).padStart(3, "0");
    const id = `${s.krSet}-${numStr}`;
    byCode[s.code] = (byCode[s.code] ?? 0) + 1;
    const exists = await prisma.regionCard.findUnique({ where: { id }, select: { id: true } });
    if (!APPLY) { console.log(`   ${id} ${s.rarityLabel.padEnd(3)} ${s.name.padEnd(16)} → ${s.lc} ${exists ? "(update)" : "(create)"}`); continue; }
    await prisma.regionCard.upsert({
      where: { id },
      create: { id, language: "ko", region: "KR", number: numStr, numberInt: s.num, name: s.name, imageSmall: null, imageLarge: null,
        card: { connect: { id: s.lc } }, set: { connect: { id: s.krSet } }, rarity: { connect: { id: s.rarityId } } },
      update: { name: s.name, card: { connect: { id: s.lc } }, rarity: { connect: { id: s.rarityId } } },
    });
    exists ? upd++ : add++;
  }

  // Set.cardCount
  const ccBySet = new Map<string, number>();
  for (const s of SECRETS) ccBySet.set(s.krSet, s.cc);
  console.log(`\n--- Set.cardCount ---`);
  for (const [krSet, cc] of ccBySet) { console.log(`   ${krSet} → ${cc}`); if (APPLY) await prisma.set.update({ where: { id: krSet }, data: { cardCount: cc } }); }

  console.log(`\n팩별 시크릿: ${JSON.stringify(byCode)}`);
  console.log(`=== ${APPLY ? `완료: 재연결 ${rep} / 시크릿 create ${add} update ${upd}` : "DRY-RUN. --apply 로 실행."} ===`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
