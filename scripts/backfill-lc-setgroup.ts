/**
 * LogicalCard.setGroupId 백필 — 도감은 LogicalCard.setGroupId 로 그룹의 카드를 모은다.
 * EN 정체성 병합(merge-en-identity) 시 EN 로케일을 JP anchor LC(setGroupId 누락)로 옮기면서
 * 해당 그룹 카드가 도감에서 사라짐 → 그 그룹들의 LC 에 로케일 세트의 setGroupId 를 채운다.
 * 안전: 인자로 받은 그룹들로 한정(해당 그룹에 속한 LC 만 교정).
 * 실행: npx tsx scripts/backfill-lc-setgroup.ts <groupId,groupId,...> [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const only = new Set((process.argv[2] ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  if (!only.size) { console.error("usage: <groupId,...> [--apply]"); process.exit(1); }

  const setGroupOf = new Map<string, string | null>();
  for (const s of await prisma.set.findMany({ select: { id: true, setGroupId: true } })) setGroupOf.set(s.id, s.setGroupId);

  const lcs = await prisma.logicalCard.findMany({ select: { id: true, setGroupId: true, locales: { select: { setId: true } } } });
  let fix = 0, ambiguous = 0; const perGroup = new Map<string, number>();
  for (const lc of lcs) {
    if (lc.locales.length === 0) continue; // 빈 껍데기(lc-cg-* ghost)는 건드리지 않음(도감은 로케일0 LC 를 카드로 안 냄)
    const groups = [...new Set(lc.locales.map((l) => setGroupOf.get(l.setId)).filter((g): g is string => !!g))];
    if (groups.length !== 1) { if (groups.length > 1) ambiguous++; continue; }
    const target = groups[0];
    if (!only.has(target)) continue;               // 작업한 그룹만
    if (lc.setGroupId === target) continue;
    fix++; perGroup.set(target, (perGroup.get(target) ?? 0) + 1);
    if (APPLY) await prisma.logicalCard.update({ where: { id: lc.id }, data: { setGroupId: target } });
  }
  console.log(`${APPLY ? "★적용" : "(dry)"} | setGroupId 교정 ${fix} (복수그룹스킵 ${ambiguous})`);
  for (const [g, n] of [...perGroup].sort((a, b) => b[1] - a[1])) console.log(`  ${g.padEnd(26)} ${n}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
