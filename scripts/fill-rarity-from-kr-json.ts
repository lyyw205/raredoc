/**
 * KR official 목록 JSON 의 rarity 필드로 Card.rarityId 채움(null 인 것만).
 * KR 사이트는 RR+ 특수레어도만 코드 노출(C/U/R 공백) → 이 스크립트는 특수레어도만 채움. 나머지는 별도.
 * 실행: npx tsx scripts/fill-rarity-from-kr-json.ts <krSetId> <jsonPath> [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync } from "node:fs";

const RMAP: Record<string, string> = {
  C: "Common", U: "Uncommon", R: "Rare", RR: "Double Rare", RRR: "Triple Rare", AR: "Art Rare",
  SR: "Super Rare", SAR: "Special Art Rare", UR: "Ultra Rare", HR: "Hyper Rare", MUR: "Mega Ultra Rare",
  CHR: "Character Rare", CSR: "Character Super Rare", ACE: "ACE SPEC Rare", K: "Radiant Rare",
  S: "Shiny Rare", SSR: "Shiny Secret Rare", BWR: "Black White Rare", MA: "Mega Attack Rare", MHR: "Mega Hyper Rare",
};

async function main() {
  const krSet = process.argv[2], jsonPath = process.argv[3], APPLY = process.argv.includes("--apply");
  if (!krSet || !jsonPath) { console.error("usage: <krSetId> <jsonPath> [--apply]"); process.exit(1); }
  const off: any[] = JSON.parse(readFileSync(jsonPath, "utf8"));
  const rarByNum = new Map<number, string>();
  for (const c of off) if (c.rarity) rarByNum.set(parseInt(c.number, 10), c.rarity);
  console.log(`JSON rarity 보유 ${rarByNum.size}/${off.length}`);

  const rarities = await prisma.rarity.findMany({ select: { id: true, code: true } });
  const rarId = new Map(rarities.map((r) => [r.code, r.id]));

  const kr = await prisma.regionCard.findMany({ where: { setId: krSet }, select: { numberInt: true, name: true, cardId: true, card: { select: { rarityId: true } } } });
  const todo = kr.filter((r) => !r.card.rarityId);
  let fill = 0, noJson = 0, unmapped = 0; const unm = new Set<string>(); const samples: string[] = []; const updates: { id: string; rid: string }[] = [];
  for (const r of todo) {
    const code = rarByNum.get(r.numberInt!);
    if (!code) { noJson++; continue; }
    const rname = RMAP[code], rid = rname ? rarId.get(rname) : undefined;
    if (!rid) { unmapped++; unm.add(code); continue; }
    updates.push({ id: r.cardId, rid }); fill++;
    if (samples.length < 10) samples.push(`#${r.numberInt} ${r.name}=${code}`);
  }
  console.log(`rarity null ${todo.length}/${kr.length} · 채울수있음 ${fill} · JSON공백(C/U/R추정) ${noJson} · 미매핑 ${unmapped}${unm.size ? "(" + [...unm] + ")" : ""} ${APPLY ? "★APPLY" : "(dry)"}`);
  console.log("  " + samples.join(" | "));
  if (APPLY) { for (const u of updates) await prisma.card.update({ where: { id: u.id }, data: { rarityId: u.rid } }); console.log(`★적용 ${updates.length}`); }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
