/**
 * KR 수집 후속 교정 3건 (S8/S7D + 7팩 시크릿 수집 중 발견된 기존 이슈).
 *
 *  #1 og-s7r: KR #50-79 중 rarityId NULL 인 행을 논리카드 rarity 로 백필.
 *  #2 og-s5a: KR #1-70 이름이 일본어(JP 미러) → namu KR명으로 교정. + 서포트 블록 #66-69 는
 *     KR↔JP 번호 역순(가나다 재정렬)이라 링크도 정체성으로 재매핑(#66↔69, #67↔68).
 *  #3 og-s5r: V블록 스크램블 — KR#72(비크티니V)·#76·#78(우라오스/아머까오 V)가 VMAX 논리카드로
 *     오연결, #77 도 어긋남. JP SR V블록(#71-78=lc-71..78)에 번호 1:1 재매핑.
 *
 * 실행: npx tsx scripts/fix-kr-followups.ts [--apply]  (기본 dry-run)
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`\n=== KR 후속 교정 ${APPLY ? "[APPLY]" : "[DRY-RUN]"} ===`);
  assertWritable(["og-s7r", "og-s5a", "og-s5r"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-kr-followups" });

  // ── #1 s7r rarity 백필 ──
  console.log(`\n[#1] og-s7r rarity 백필 (NULL → 논리카드 rarity)`);
  const s7r = await prisma.regionCard.findMany({
    where: { setId: "kr-s7r", rarityId: null },
    select: { id: true, numberInt: true, name: true, card: { select: { rarityId: true } } },
  });
  let r1 = 0;
  for (const rc of s7r) {
    const rar = rc.card?.rarityId;
    if (!rar) { console.log(`   [skip] ${rc.id} (#${rc.numberInt} ${rc.name}) — 논리카드도 rarity 없음`); continue; }
    console.log(`   ${rc.id} (#${rc.numberInt} ${rc.name}) rarityId ← ${rar}`);
    if (APPLY) { await prisma.regionCard.update({ where: { id: rc.id }, data: { rarity: { connect: { id: rar } } } }); r1++; }
  }
  console.log(`   대상 ${s7r.length}장`);

  // ── #2 s5a 이름 한글화 #1-70 + 서포트 #66-69 링크 역순 교정 ──
  console.log(`\n[#2] og-s5a KR명 한글화(#1-70) + 서포트 링크 교정(#66-69)`);
  const names: Record<string, string> = JSON.parse(readFileSync("data/kr-s5a-names.json", "utf8"));
  const SUP_REMAP: Record<number, number> = { 66: 69, 67: 68, 68: 67, 69: 66 }; // KR# → 올바른 JP lc#
  const s5a = await prisma.regionCard.findMany({
    where: { setId: "kr-s5a", numberInt: { lte: 70 } },
    select: { id: true, numberInt: true, name: true },
  });
  let r2name = 0, r2link = 0;
  for (const rc of s5a) {
    const n = rc.numberInt!;
    const ko = names[String(n)];
    const data: Record<string, unknown> = {};
    if (ko && ko !== rc.name) data.name = ko;
    if (SUP_REMAP[n]) data.card = { connect: { id: `lc-orphan-jp-tcg-S5a-${SUP_REMAP[n]}` } };
    if (Object.keys(data).length === 0) continue;
    console.log(`   ${rc.id} (#${n}) "${rc.name}" → "${data.name ?? rc.name}"${data.card ? ` [link→lc-S5a-${SUP_REMAP[n]}]` : ""}`);
    if (APPLY) { await prisma.regionCard.update({ where: { id: rc.id }, data }); if (data.name) r2name++; if (data.card) r2link++; }
  }

  // ── #3 s5r V블록 스크램블 교정 (KR# == 올바른 JP lc#) ──
  console.log(`\n[#3] og-s5r V블록 스크램블 교정`);
  for (const n of [72, 76, 77, 78]) {
    const id = `kr-s5r-${String(n).padStart(3, "0")}`;
    const lc = `lc-orphan-jp-tcg-S5R-${n}`;
    const cur = await prisma.regionCard.findUnique({ where: { id }, select: { name: true, cardId: true } });
    console.log(`   ${id} (${cur?.name}) link ${cur?.cardId} → ${lc}`);
    if (APPLY) await prisma.regionCard.update({ where: { id }, data: { card: { connect: { id: lc } } } });
  }

  console.log(`\n=== ${APPLY ? `완료: #1 rarity ${r1} / #2 name ${r2name}·link ${r2link} / #3 link 4` : "DRY-RUN (변경 없음). --apply 로 실행."} ===`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
