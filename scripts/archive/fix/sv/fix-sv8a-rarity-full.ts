/**
 * SV8a(테라스탈 페스타 ex) 레어도 전체 정합 — option A (JP 공식 기준).
 *
 * 규칙(3출처 일치 = 공식 pokemon-card.com 아이콘 + Bulbapedia JP + 트래커):
 *   "테라스탈페스 ex 는 Pokémon ex 와 ACE SPEC 카드에만 레어도가 있고, 나머지는 레어도 없음."
 *   - 공식 아이콘 보유 85장 (ic_rare_rr/sar/sr_c/ur_c) → 해당 레어도 유지
 *   - ACE SPEC 8장 (#142·146·148·149·152·159·184·187, 공식 'ACE SPEC' 마커로 검증) → ACE SPEC Rare
 *   - 그 외 전부(144장) → None
 *  DB 는 base 카드에 C/U/R, 가짜 RR/ACE/SIR/HR 등을 잘못 배정 → 위 규칙으로 재정합.
 *
 * 입력: data/jp-official/sv8a-official-rarity.tsv (공식 전수 스캔: number\ticon\tcardID\tname)
 * sv-prismatic-evolutions 동결 팩. --allow-protected 필요.
 * 실행: npx tsx scripts/fix-sv8a-rarity-full.ts --apply --allow-protected
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { readFileSync } from "node:fs";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const SET_ID = "jp-sv-prismatic-evolutions";
const CARD_PACK_ID = "sv-prismatic-evolutions";
const RID = {
  "Double Rare": "cmpp4wysb0014yjuroyoidvmy",
  "Special Art Rare": "cmpp4wyxt001oyjurx0rmzr5r",
  "Super Rare": "cmpp4wyyk001ryjurevrx3dq0",
  "Ultra Rare": "cmpp4wyzt001wyjuriy5esk1h",
  "ACE SPEC Rare": "cmpp4wyq8000wyjurudyeo2gb",
  "None": "cmpp4wyve001fyjura3dj4u72",
} as const;
const ICON: Record<string, keyof typeof RID> = {
  ic_rare_rr: "Double Rare", ic_rare_sar: "Special Art Rare", ic_rare_sr_c: "Super Rare", ic_rare_ur_c: "Ultra Rare",
};
const ACE = new Set([142, 146, 148, 149, 152, 159, 184, 187]);

async function main() {
  const APPLY = process.argv.includes("--apply");
  assertWritable([CARD_PACK_ID], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-sv8a-rarity-full" });

  // 공식 스캔 → number→icon (중복은 아이콘 있는 쪽 우선)
  const off = new Map<number, string>();
  for (const ln of readFileSync("data/jp-official/sv8a-official-rarity.tsv", "utf8").split("\n")) {
    const p = ln.split("\t"); if (p.length < 2 || !p[0]) continue;
    const n = parseInt(p[0], 10); const ic = p[1];
    if (!off.has(n) || (ic && !off.get(n))) off.set(n, ic);
  }
  console.log(`■ SV8a 전체 레어도 정합(option A) | 공식 스캔 ${off.size}장 | ${APPLY ? "★APPLY" : "(dry-run)"}`);

  // 목표 레어도 계산
  const target = (n: number): keyof typeof RID => {
    if (ACE.has(n)) return "ACE SPEC Rare";
    const ic = off.get(n) ?? "";
    return ICON[ic] ?? "None";
  };

  const dbRows = await prisma.regionCard.findMany({ where: { setId: SET_ID }, include: { rarity: true } });
  let changed = 0; const byKind: Record<string, number> = {};
  const samples: string[] = [];
  for (const rc of dbRows) {
    const n = rc.numberInt; if (n == null) continue;
    const tgt = target(n); const tgtId = RID[tgt];
    const curr = rc.rarity?.code ?? "None";
    if (rc.rarityId === tgtId || curr === tgt) continue;
    changed++;
    byKind[`${curr} → ${tgt}`] = (byKind[`${curr} → ${tgt}`] ?? 0) + 1;
    if (samples.length < 25) samples.push(`  #${n} ${rc.name}: ${curr} → ${tgt}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: tgtId } });
  }

  console.log(`\n변경 ${changed}장 (전체 237)`);
  console.log("유형별:"); for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) console.log(`  ${v.toString().padStart(3)} × ${k}`);
  console.log("\n샘플:"); samples.forEach((s) => console.log(s));

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
