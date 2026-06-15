/**
 * 151(jp-sv-151·kr-sv-151) 로고 원복 — 직전에 SVP1 로고를 151에 잘못 적용한 것 되돌림.
 * 이전 값(pokellector 151 로고)로 복구.
 * 실행: npx tsx scripts/revert-151-logo.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const url = "https://den-media.pokellector.com/logos/Pokemon-151.logo.371.png";
  for (const id of ["jp-sv-151", "kr-sv-151"]) {
    const r = await prisma.set.updateMany({ where: { id }, data: { logoUrl: url } });
    console.log(`  ${id} → ${url} (${r.count}건)`);
  }
  const rows = await prisma.set.findMany({ where: { id: { in: ["jp-sv-151", "kr-sv-151"] } }, select: { id: true, logoUrl: true } });
  console.log("검증:"); rows.forEach((s) => console.log(`  ${s.id}: ${s.logoUrl}`));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
