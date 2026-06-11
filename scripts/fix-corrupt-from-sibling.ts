/**
 * 오염 attacks 잔존분(시크릿 알트아트 등 pc-jp 메인목록 밖) 정리 —
 * 같은 그룹 내 **동일 JP이름 + 동일 subtypes** 의 깨끗한 형제 LC 에서 attacks 복사.
 * 알트아트 시크릿은 base 와 어택이 동일하므로 안전(정확히 1개 클린 형제일 때만).
 *
 * 실행: npx tsx scripts/fix-corrupt-from-sibling.ts <gid> [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { POKE } from "./lib/supertype";
function isCorrupt(a: any): boolean {
  if (!Array.isArray(a) || !a[0]) return false;
  const n = String(a[0].name ?? "");
  return n.includes("<br>") || /^\[/.test(n) || n.length > 45;
}
function isClean(a: any): boolean {
  return Array.isArray(a) && a.length > 0 && !isCorrupt(a);
}
async function main() {
  const gid = process.argv[2], APPLY = process.argv.includes("--apply");
  if (!gid) { console.error("usage: <gid> [--apply]"); process.exit(1); }
  const lcs = await prisma.logicalCard.findMany({
    where: { cardPackId: gid },
    select: { id: true, attacks: true, types: true, subtypes: true, locales: { select: { region: true, name: true, numberInt: true } } },
  });
  const jpName = (lc: typeof lcs[0]) => lc.locales.find((l) => l.region === "JP")?.name ?? "";
  // 클린 형제 인덱스: name|subtypes → attacks / types (알트아트 시크릿은 base 와 동일)
  const clean = new Map<string, any>(), cleanTy = new Map<string, string[]>();
  for (const lc of lcs) {
    const k = `${jpName(lc)}|${[...lc.subtypes].sort().join(",")}`;
    if (isClean(lc.attacks) && !clean.has(k)) clean.set(k, lc.attacks);
    if (lc.types.length && !cleanTy.has(k)) cleanTy.set(k, lc.types);
  }
  let fix = 0, noSib = 0, skipUnion = 0, tyFix = 0; const upd: { id: string; a: any }[] = [], tUpd: { id: string; t: string[] }[] = []; const samp: string[] = [];
  for (const lc of lcs) {
    const k = `${jpName(lc)}|${[...lc.subtypes].sort().join(",")}`;
    const isUnion = /V-?UNION|Vユニオン|V-ユニオン/i.test(jpName(lc));
    // attacks: 오염분만(V-UNION 제외=조각별 상이)
    if (isCorrupt(lc.attacks)) {
      if (isUnion) skipUnion++;
      else { const c = clean.get(k); if (c) { upd.push({ id: lc.id, a: c }); fix++; if (samp.length < 12) samp.push(`#${lc.locales.find((l) => l.region === "JP")?.numberInt} ${jpName(lc)}`); } else noSib++; }
    }
    // types: 빈값분(types 는 알트아트도 동일하므로 V-UNION 포함 안전)
    if (lc.types.length === 0) { const t = cleanTy.get(k); if (t) { tUpd.push({ id: lc.id, t }); tyFix++; } }
  }
  console.log(`${gid}: 오염잔존 ${fix + noSib + skipUnion} · attacks형제복사 ${fix} · 형제없음 ${noSib} · V-UNION제외 ${skipUnion} · types형제복사 ${tyFix} ${APPLY ? "★APPLY" : "(dry)"}`);
  console.log("  " + samp.join(" | "));
  if (APPLY) {
    for (const u of upd) await prisma.logicalCard.update({ where: { id: u.id }, data: { attacks: u.a } });
    for (const u of tUpd) await prisma.logicalCard.update({ where: { id: u.id }, data: { types: u.t } });
    console.log(`★복사: attacks ${upd.length} · types ${tUpd.length}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
