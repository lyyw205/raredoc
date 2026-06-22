// ── P0.1 supertype 정규화 (hard blocker) ──────────────────────────────────────
// 'Pokemon'(무악센트)→'Pokémon', supertype=null인데 dex 보유→'Pokémon'.
// 기본 dry-run(변경 0). 적용은 --apply. 적용 전 (id,supertype) 스냅샷 저장.
// 실행: npx tsx scripts/migration/p0-1-supertype.ts [--apply]
import "dotenv/config";
import fs from "fs";
import { prisma } from "../../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const SNAP_DIR = ".migration-snapshots";
const SNAP = `${SNAP_DIR}/p0-1-supertype.json`;

async function main() {
  // 대상 집계
  const pokemonNoAccent = await prisma.card.count({ where: { supertype: "Pokemon" } });
  const nullTotal = await prisma.card.count({ where: { supertype: null } });
  const nullWithDex = await prisma.card.count({ where: { supertype: null, NOT: { pokedexNumbers: { isEmpty: true } } } });
  const nullNoDex = nullTotal - nullWithDex;

  console.log("【P0.1 supertype 정규화】" + (APPLY ? " ★APPLY" : " (dry-run)"));
  console.log(`  'Pokemon'(무악센트) → 'Pokémon'         : ${pokemonNoAccent}건`);
  console.log(`  supertype=null & dex보유 → 'Pokémon'    : ${nullWithDex}건`);
  console.log(`  supertype=null & dex없음 (보류, 후속)   : ${nullNoDex}건`);
  console.log(`  ─ 총 변경 예정: ${pokemonNoAccent + nullWithDex}건 / 보류 ${nullNoDex}건`);

  // 스냅샷 (변경 대상 전체의 현재 (id, supertype))
  const affected = await prisma.card.findMany({
    where: { OR: [{ supertype: "Pokemon" }, { supertype: null, NOT: { pokedexNumbers: { isEmpty: true } } }] },
    select: { id: true, supertype: true },
  });
  if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR, { recursive: true });
  fs.writeFileSync(SNAP, JSON.stringify(affected));
  console.log(`  스냅샷 저장: ${SNAP} (${affected.length}행, 롤백용)`);

  if (!APPLY) { console.log("\n  (dry-run — 변경 0. 적용하려면 --apply)"); await prisma.$disconnect(); return; }

  const r1 = await prisma.card.updateMany({ where: { supertype: "Pokemon" }, data: { supertype: "Pokémon" } });
  const r2 = await prisma.card.updateMany({ where: { supertype: null, NOT: { pokedexNumbers: { isEmpty: true } } }, data: { supertype: "Pokémon" } });
  console.log(`\n  ✅ 적용: 무악센트 ${r1.count} · null+dex ${r2.count}`);

  // 검증
  const grp = await prisma.card.groupBy({ by: ["supertype"], _count: true });
  console.log("  검증 — supertype 분포:");
  for (const g of grp) console.log(`    ${g.supertype ?? "(null)"} : ${g._count}`);
  const stillNoAccent = await prisma.card.count({ where: { supertype: "Pokemon" } });
  console.log(`  무악센트 잔존: ${stillNoAccent} (0이어야 정상)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
