/**
 * JP 이미지 백필 — tcgdex 가 이미지를 제공하지 않는 JP 세트(SV11B 등)의 RegionCard 에
 *   pokemon-card.com(일본공식) 이미지 URL 을 번호 매칭으로 채움.
 *   Card/매핑/KR 은 일절 건드리지 않음. imageSmall/imageLarge 가 비어있는 행만 채움.
 *   이미지맵 파일 포맷: [{ number: "001", image: "https://...", jaName, ... }]
 *
 * 실행: npx tsx scripts/backfill-jp-image-official.ts --set=jp-tcg-SV11B --file=data/jp-official/jp-sv11b-images.json [--apply] [--force]
 *   --force: 기존 이미지가 있어도 덮어씀(기본은 비어있는 행만)
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync } from "node:fs";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const FORCE = process.argv.includes("--force");
  const setId = process.argv.find((a) => a.startsWith("--set="))?.slice("--set=".length);
  const file = process.argv.find((a) => a.startsWith("--file="))?.slice("--file=".length);
  if (!setId || !file) { console.error("필수: --set=jp-tcg-SV11B --file=data/jp-official/jp-sv11b-images.json"); process.exit(1); }

  const map = JSON.parse(readFileSync(file, "utf8")) as { number: string; image: string; jaName?: string }[];
  const imgByNum = new Map<number, string>(map.map((c) => [parseInt(c.number, 10), c.image]));

  const rows = await prisma.regionCard.findMany({ where: { setId },
    orderBy: { numberInt: "asc" }, select: { id: true, number: true, numberInt: true, name: true, imageSmall: true, imageLarge: true } });
  console.log(`■ ${setId}: locale ${rows.length} | 이미지맵 ${imgByNum.size} | ${APPLY ? "★적용" : "(dry)"}${FORCE ? " [force]" : ""}`);

  let filled = 0, skipHas = 0, noImg = 0; const sample: string[] = [];
  for (const r of rows) {
    if (!FORCE && r.imageSmall) { skipHas++; continue; }
    const img = imgByNum.get(r.numberInt!);
    if (!img) { noImg++; console.log(`  ⚠️ 이미지없음 #${r.number} ${r.name}`); continue; }
    if (sample.length < 4) sample.push(`#${r.number} ${r.name} → …/${img.split("/").pop()}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: r.id }, data: { imageSmall: img, imageLarge: img } });
    filled++;
  }
  console.log(`  채움 ${filled} · 이미지이미있음(skip) ${skipHas} · 맵에없음 ${noImg}`);
  if (sample.length) console.log(`  예: ${sample.join(" | ")}`);
  await prisma.$disconnect();
  if (!APPLY) console.log(`\n(dry) 적용: --apply`);
}
main().catch((e) => { console.error(e); process.exit(1); });
