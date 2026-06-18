/**
 * SV7(스텔라미라클/ステラミラクル) 레어도 전체 정합 — 공식(pokemon-card.com) 아이콘 기준.
 * 공식 전수 스캔(data/jp-official/sv7-official-rarity.tsv) 분포가 트래커와 정확히 일치.
 *   icon → 레어도. 무아이콘 3장(#94·96·101) = ACE SPEC (공식 ACE는 다이아 아이콘 없음, DB와 일치).
 * DB 의 어긋난 카드만 공식값으로 교정. sv-stellar-crown 동결 팩 → --allow-protected.
 * 실행: npx tsx scripts/fix-sv7-rarity-full.ts --apply --allow-protected
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { readFileSync } from "node:fs";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const SET_ID = "jp-sv-stellar-crown";
const CARD_PACK_ID = "sv-stellar-crown";
const RID: Record<string, string> = {
  Common: "cmpp4wyk9000ayjur8h3rbxyd", Uncommon: "cmpp4wykj000byjurc7tz6q7i", Rare: "cmpp4wykt000cyjurmsot429m",
  "Double Rare": "cmpp4wysb0014yjuroyoidvmy", "Art Rare": "cmpp4wyqr000yyjurz30wylr4",
  "Special Art Rare": "cmpp4wyxt001oyjurx0rmzr5r", "Super Rare": "cmpp4wyyk001ryjurevrx3dq0",
  "Ultra Rare": "cmpp4wyzt001wyjuriy5esk1h", "ACE SPEC Rare": "cmpp4wyq8000wyjurudyeo2gb", None: "cmpp4wyve001fyjura3dj4u72",
};
const ICON: Record<string, string> = {
  ic_rare_c_c: "Common", ic_rare_u_c: "Uncommon", ic_rare_r_c: "Rare", ic_rare_rr: "Double Rare",
  ic_rare_ar: "Art Rare", ic_rare_sar: "Special Art Rare", ic_rare_sr_c: "Super Rare", ic_rare_ur_c: "Ultra Rare",
};
const ACE = new Set([94, 96, 101]); // 공식 무아이콘 = ACE SPEC (검증됨)

async function main() {
  const APPLY = process.argv.includes("--apply");
  assertWritable([CARD_PACK_ID], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-sv7-rarity-full" });

  const off = new Map<number, string>();
  for (const ln of readFileSync("data/jp-official/sv7-official-rarity.tsv", "utf8").split("\n")) {
    const p = ln.split("\t"); if (p.length < 2 || !p[0]) continue;
    off.set(parseInt(p[0], 10), p[1]);
  }
  const target = (n: number): string => ACE.has(n) ? "ACE SPEC Rare" : (ICON[off.get(n) ?? ""] ?? "None");

  console.log(`■ SV7 전체 레어도 정합 | 공식 ${off.size}장 | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  const rows = await prisma.regionCard.findMany({ where: { setId: SET_ID }, include: { rarity: true } });
  let changed = 0; const lines: string[] = [];
  for (const rc of rows) {
    const n = rc.numberInt; if (n == null) continue;
    const tgt = target(n); const curr = rc.rarity?.code ?? "None";
    if (curr === tgt) continue;
    changed++; lines.push(`  #${n} ${rc.name}: ${curr} → ${tgt}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: RID[tgt] } });
  }
  console.log(`\n변경 ${changed}장:`); lines.forEach((l) => console.log(l));
  if (APPLY) {
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: SET_ID }, _count: true });
    const rar = await prisma.rarity.findMany({ where: { id: { in: dist.map((d) => d.rarityId).filter(Boolean) as string[] } } });
    const nm = (id: string | null) => rar.find((r) => r.id === id)?.code ?? "(null)";
    console.log(`\n=== 교정 후 분포 ===`);
    for (const d of dist.sort((a, b) => (b._count as number) - (a._count as number))) console.log(`  ${nm(d.rarityId)}: ${d._count}`);
  } else console.log(`\n(dry-run) 적용: --apply --allow-protected`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
