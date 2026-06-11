/**
 * VSTAR 카드 subtype 오저장 교정 — 이름이 'VSTAR' 인데 subtypes 에 'VMAX' 만 있는 LC(VSTAR 누락).
 * VMAX/VSTAR 는 상호배타 카드 메커니즘 → 'VMAX'→'VSTAR' 치환(권위: 카드명 + pokemontcg.io EN=[VSTAR]).
 * merge-en-identity 의 dex|subtype 버킷이 EN[VSTAR]↔JP[VMAX] 로 어긋나 VSTAR 미매칭되던 근본원인.
 *
 * 실행: npx tsx scripts/fix-vstar-subtype.ts [gid] [--apply]
 *   gid 생략 시 전역. gid 지정 시 그 그룹만.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
async function main() {
  const args = process.argv.slice(2);
  const APPLY = args.includes("--apply");
  const gid = args.find((a) => !a.startsWith("--"));
  const where: any = { subtypes: { has: "VMAX" }, locales: { some: { name: { contains: "VSTAR" } } } };
  if (gid) where.cardPackId = gid;
  const lcs = await prisma.card.findMany({
    where, select: { id: true, subtypes: true, cardPackId: true, locales: { select: { region: true, name: true }, take: 1 } },
  });
  const byG = new Map<string, number>(); const samp: string[] = [];
  const upd: { id: string; ns: string[] }[] = [];
  for (const lc of lcs) {
    byG.set(lc.cardPackId ?? "null", (byG.get(lc.cardPackId ?? "null") ?? 0) + 1);
    const ns = [...new Set(lc.subtypes.map((s) => (s === "VMAX" ? "VSTAR" : s)))];
    upd.push({ id: lc.id, ns });
    if (samp.length < 8) samp.push(`${lc.locales[0]?.name} [${lc.subtypes.join(",")}]→[${ns.join(",")}]`);
  }
  console.log(`VSTAR오저장 ${lcs.length}장 ${gid ? `(${gid})` : "(전역)"} ${APPLY ? "★APPLY" : "(dry)"}`);
  for (const [g, c] of [...byG].sort((a, b) => b[1] - a[1])) console.log(`  ${g}: ${c}`);
  console.log("  " + samp.join(" | "));
  if (APPLY) { for (const u of upd) await prisma.card.update({ where: { id: u.id }, data: { subtypes: u.ns } }); console.log(`★적용 ${upd.length}`); }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
