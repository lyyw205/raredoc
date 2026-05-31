/**
 * XY era SetGroup + EN Set + JP Set + KR Set 의 한글명 입력.
 *
 * Run: npx tsx scripts/seed-xy-koreanames.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const XY: { groupId: string; nameKo: string; enSetIds: string[]; jpSetIds: string[]; krSetIds: string[] }[] = [
  // JP-only (no EN counterpart in same group)
  { groupId: "og-xy1a",  nameKo: "콜렉션 X",                         enSetIds: ["en-tcg-xy1"],  jpSetIds: ["jp-tcg-XY1a"], krSetIds: ["kr-xy1"] },
  { groupId: "og-xy1b",  nameKo: "콜렉션 Y",                         enSetIds: [],             jpSetIds: ["jp-tcg-XY1b"], krSetIds: [] },
  { groupId: "og-xy2",   nameKo: "와일드 블레이즈",                    enSetIds: ["en-tcg-xy2"],  jpSetIds: ["jp-tcg-XY2"],  krSetIds: ["kr-xy2"] },
  { groupId: "og-xy3",   nameKo: "라이징 피스트",                      enSetIds: ["en-tcg-xy3"],  jpSetIds: ["jp-tcg-XY3"],  krSetIds: ["kr-xy3"] },
  { groupId: "og-xy4",   nameKo: "팬텀 게이트",                        enSetIds: ["en-tcg-xy4"],  jpSetIds: ["jp-tcg-XY4"],  krSetIds: ["kr-xy4"] },
  { groupId: "og-xy5a",  nameKo: "타이달 스톰",                        enSetIds: ["en-tcg-xy5"],  jpSetIds: ["jp-tcg-XY5a"], krSetIds: ["kr-xy5"] },
  { groupId: "og-cp1",   nameKo: "마그마단 VS 아쿠아단 더블 크라이시스", enSetIds: ["en-tcg-dc1"],  jpSetIds: ["jp-tcg-CP1"],  krSetIds: ["kr-cp1"] },
  { groupId: "og-xy6",   nameKo: "에메랄드 브레이크",                   enSetIds: ["en-tcg-xy6"],  jpSetIds: ["jp-tcg-XY6"],  krSetIds: [] },
  { groupId: "og-xy7",   nameKo: "반딧 링",                            enSetIds: ["en-tcg-xy7"],  jpSetIds: ["jp-tcg-XY7"],  krSetIds: ["kr-xy7"] },
  { groupId: "og-cp2",   nameKo: "전설 키라 컬렉션",                    enSetIds: [],             jpSetIds: ["jp-tcg-CP2"],  krSetIds: ["kr-cp2"] },
  { groupId: "og-xy8a",  nameKo: "붉은 섬광",                          enSetIds: ["en-tcg-xy8"],  jpSetIds: ["jp-tcg-XY8a"], krSetIds: ["kr-xy8"] },
  { groupId: "og-xy8b",  nameKo: "푸른 충격",                          enSetIds: [],             jpSetIds: ["jp-tcg-XY8b"], krSetIds: [] },
  { groupId: "og-xy9",   nameKo: "파천의 분노",                         enSetIds: ["en-tcg-xy9"],  jpSetIds: ["jp-tcg-XY9"],  krSetIds: ["kr-xy9"] },
  { groupId: "og-cp3",   nameKo: "포케쿈 컬렉션",                       enSetIds: [],             jpSetIds: ["jp-tcg-CP3"],  krSetIds: ["kr-cp3"] },
  { groupId: "og-xy10",  nameKo: "각성하는 초왕",                       enSetIds: ["en-tcg-xy10"], jpSetIds: ["jp-tcg-XY10"], krSetIds: ["kr-xy10"] },
  { groupId: "og-cp4",   nameKo: "프리미엄 챔피언팩 EX×M×BREAK",        enSetIds: [],             jpSetIds: ["jp-tcg-CP4"],  krSetIds: ["kr-cp4"] },
  { groupId: "og-xy11a", nameKo: "냉혹한 반역자",                       enSetIds: ["en-tcg-xy11"], jpSetIds: ["jp-tcg-XY11a"],krSetIds: ["kr-xy11"] },
  { groupId: "og-cp5",   nameKo: "냉혹한 반역자",                       enSetIds: [],             jpSetIds: ["jp-tcg-CP5"],  krSetIds: ["kr-cp5"] },
  { groupId: "og-cp6",   nameKo: "확장팩 20주년 기념",                   enSetIds: ["en-tcg-xy12"], jpSetIds: ["jp-tcg-CP6"],  krSetIds: [] },
  // New EN-only groups (created by sync-xy-pokemontcgio)
  { groupId: "og-xyp",   nameKo: "XY 블랙스타 프로모",                  enSetIds: ["en-tcg-xyp"],  jpSetIds: [],              krSetIds: [] },
  { groupId: "og-xy0",   nameKo: "Kalos 스타터 세트",                   enSetIds: ["en-tcg-xy0"],  jpSetIds: [],              krSetIds: [] },
  { groupId: "og-g1",    nameKo: "제너레이션즈",                        enSetIds: ["en-tcg-g1"],   jpSetIds: [],              krSetIds: [] },
];

async function main() {
  let updated = 0, skipped = 0;

  for (const n of XY) {
    // Update SetGroup
    const grp = await prisma.setGroup.findUnique({ where: { id: n.groupId } });
    if (!grp) { console.log(`  ⚠ SetGroup ${n.groupId} 없음 — skip`); skipped++; continue; }
    await prisma.setGroup.update({ where: { id: n.groupId }, data: { nameKo: n.nameKo } });

    // Update EN sets
    for (const enId of n.enSetIds) {
      await prisma.set.update({ where: { id: enId }, data: { nameKo: n.nameKo } }).catch(() => {/* set may not exist yet */});
    }
    // Update JP sets
    for (const jpId of n.jpSetIds) {
      await prisma.set.update({ where: { id: jpId }, data: { nameKo: n.nameKo } }).catch(() => {});
    }
    // Update KR sets
    for (const krId of n.krSetIds) {
      await prisma.set.update({ where: { id: krId }, data: { nameKo: n.nameKo } }).catch(() => {});
    }

    console.log(`  ✓ ${n.groupId}: nameKo="${n.nameKo}"`);
    updated++;
  }

  console.log(`\n결과: ${updated} 업데이트, ${skipped} 스킵`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
