// ── P4: ArtCard 빌드 (additive) — 같은 그림 한 장(아트 정체성) ──────────────────
// 같은 GameCard 안에서 illustrator(아트)별로 묶음 → cross-pack/region 재수록 통합.
// 작가 없으면 LC 단독(미연결>오연결). id=결정적('ac_'+sha1) 멱등. gameCardId 없는 LC 제외.
// 기본 dry-run. 적용 --apply. 실행: npx tsx scripts/migration/p4-artcard.ts [--apply]
import "dotenv/config";
import crypto from "crypto";
import { prisma } from "../../src/lib/prisma";
import { normSpace as norm } from "../lib/text-norm";

const APPLY = process.argv.includes("--apply");
const esc = (s: string) => s.replace(/'/g, "''");
const acId = (k: string) => "ac_" + crypto.createHash("sha1").update(k).digest("hex").slice(0, 20);

async function main() {
  const lcs = await prisma.logicalCard.findMany({
    where: { gameCardId: { not: null } }, // 게임카드 있는 실물카드만(빈-LC 제외)
    select: { id: true, gameCardId: true, illustrator: true, setGroupId: true },
  });
  const gcNames = new Map((await prisma.gameCard.findMany({ select: { id: true, name: true } })).map((g) => [g.id, g.name]));

  const groups = new Map<string, { id: string; gameCardId: string; illustrator: string | null; name: string; n: number; packs: Set<string | null> }>();
  const lcToAc: [string, string][] = [];
  for (const lc of lcs) {
    const ill = norm(lc.illustrator);
    const key = `${lc.gameCardId}|${ill || "lc:" + lc.id}`; // 작가 없으면 LC 단독
    const id = acId(key);
    let g = groups.get(key);
    if (!g) { g = { id, gameCardId: lc.gameCardId!, illustrator: lc.illustrator, name: gcNames.get(lc.gameCardId!) ?? "", n: 0, packs: new Set() }; groups.set(key, g); }
    g.n++; g.packs.add(lc.setGroupId);
    lcToAc.push([lc.id, id]);
  }
  const arr = [...groups.values()];
  const multi = arr.filter((g) => g.n > 1).length;
  const crossPack = arr.filter((g) => g.packs.size > 1).length;
  console.log(`【P4 ArtCard】${APPLY ? " ★APPLY" : " (dry-run)"}`);
  console.log(`  대상 LC(게임카드보유) ${lcs.length} · ArtCard 그룹 ${arr.length}(복수멤버 ${multi}·cross-pack ${crossPack}) · 연결 ${lcToAc.length}`);
  const top = [...arr].sort((a, b) => b.n - a.n).slice(0, 6);
  console.log("  최다 재수록 아트 표본:", top.map((g) => `"${g.name}"[${(g.illustrator || "?").slice(0, 12)}]×${g.n}`).join(" · "));

  if (!APPLY) { console.log("\n  (dry-run)"); await prisma.$disconnect(); return; }

  let s = 0;
  const rows = arr.map((g) => ({ id: g.id, gameCardId: g.gameCardId, illustrator: g.illustrator, name: g.name }));
  for (let i = 0; i < rows.length; i += 3000) s += (await prisma.artCard.createMany({ data: rows.slice(i, i + 3000), skipDuplicates: true })).count;
  let u = 0;
  for (let i = 0; i < lcToAc.length; i += 1000) {
    const vals = lcToAc.slice(i, i + 1000).map(([lc, ac]) => `('${esc(lc)}','${esc(ac)}')`).join(",");
    u += await prisma.$executeRawUnsafe(`UPDATE "LogicalCard" SET "artCardId"=v.ac FROM (VALUES ${vals}) AS v(lcid,ac) WHERE "LogicalCard".id=v.lcid`);
  }
  const del = await prisma.$executeRawUnsafe(`DELETE FROM "ArtCard" WHERE id NOT IN (SELECT DISTINCT "artCardId" FROM "LogicalCard" WHERE "artCardId" IS NOT NULL)`);
  console.log(`\n  ✅ ArtCard +${s} · LC링크 ${u} · 고아 삭제 ${del}`);

  const acCount = await prisma.artCard.count();
  console.log(`  검증 — ArtCard ${acCount}`);
  // cross-pack 통합 표본(여러 팩에 걸친 한 아트)
  const cp: any[] = await prisma.$queryRawUnsafe(
    `SELECT a.id, a.name, a.illustrator, count(DISTINCT lc.id)::int lcs, count(DISTINCT lc."setGroupId")::int packs
     FROM "ArtCard" a JOIN "LogicalCard" lc ON lc."artCardId"=a.id
     GROUP BY a.id, a.name, a.illustrator HAVING count(DISTINCT lc."setGroupId")>1 ORDER BY packs DESC LIMIT 4`);
  console.log("  cross-pack 같은 아트 표본:", cp.map((g) => `"${g.name}"[${(g.illustrator || "?").slice(0, 10)}] ${g.lcs}장/${g.packs}팩`).join(" · "));
  // 한 GameCard 가 여러 ArtCard(다른 아트) 갖는 표본
  const ma: any[] = await prisma.$queryRawUnsafe(
    `SELECT g.name, count(*)::int arts FROM "ArtCard" a JOIN "GameCard" g ON g.id=a."gameCardId" GROUP BY g.id, g.name HAVING count(*)>2 ORDER BY arts DESC LIMIT 4`);
  console.log("  한 카드의 여러 아트 표본:", ma.map((g) => `"${g.name}" 아트 ${g.arts}종`).join(" · "));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
