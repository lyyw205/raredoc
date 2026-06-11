/**
 * JP 팩 rarity 백필 — pc-jp 상세페이지 rarity 아이콘(ic_rare_XXX.gif)에서 수집.
 * 아이콘→Rarity 매핑을 **이미 rarity 있는 카드에서 학습**(self-verify, 추측 없음) 후 null 카드에 적용.
 * 스크랩 캐시 <officialJson>.rarity.json. LogicalCard.rarityId 만 채움(null 인 것만).
 * 실행: npx tsx scripts/fill-jp-rarity.ts <cardPackId> <officialJson> [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchRarityIcon(cardID: string): Promise<string | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "25", "-A", UA, `https://www.pokemon-card.com/card-search/details.php/card/${cardID}/regu/all`], { maxBuffer: 8 * 1024 * 1024 });
    const m = stdout.match(/\/card\/rarity\/ic_rare_([a-z0-9_]+)\.gif/i);
    return m ? m[1] : null;
  } catch { return null; }
}

async function main() {
  const gid = process.argv[2], officialJson = process.argv[3], APPLY = process.argv.includes("--apply");
  if (!gid || !officialJson) { console.error("usage: <cardPackId> <officialJson> [--apply]"); process.exit(1); }
  const cache = officialJson.replace(/\.json$/, ".rarity.json");
  const off: any[] = JSON.parse(readFileSync(officialJson, "utf8"));
  let iconByNum: Record<string, string>;
  if (existsSync(cache)) { iconByNum = JSON.parse(readFileSync(cache, "utf8")); console.log(`■ 캐시 ${cache}`); }
  else {
    iconByNum = {}; let ok = 0, fail = 0;
    for (const c of off) { if (!c.cardID) continue; const ic = await fetchRarityIcon(c.cardID); await sleep(150); if (ic) { iconByNum[String(parseInt(c.number, 10))] = ic; ok++; } else fail++; }
    writeFileSync(cache, JSON.stringify(iconByNum));
    console.log(`■ 스크랩 ${off.length}: 아이콘 ${ok} · 실패 ${fail} → ${cache}`);
  }

  const lcs = await prisma.logicalCard.findMany({ where: { cardPackId: gid }, select: { id: true, locales: { select: { region: true, numberInt: true } }, rarity: { select: { code: true } } } });
  // 학습: icon → 기존 DB rarity.code 집합
  const learn = new Map<string, Map<string, number>>();
  for (const lc of lcs) {
    if (!lc.rarity?.code) continue;
    const jp = lc.locales.find((l) => l.region === "JP"); if (!jp || jp.numberInt == null) continue;
    const ic = iconByNum[String(jp.numberInt)]; if (!ic) continue;
    if (!learn.has(ic)) learn.set(ic, new Map());
    const m = learn.get(ic)!; m.set(lc.rarity.code, (m.get(lc.rarity.code) ?? 0) + 1);
  }
  const iconMap = new Map<string, string>(); const ambiguous: string[] = [];
  for (const [ic, m] of learn) {
    const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length === 1) iconMap.set(ic, sorted[0][0]);
    else { iconMap.set(ic, sorted[0][0]); ambiguous.push(`${ic}→${sorted.map(([c, n]) => `${c}(${n})`).join("/")}`); }
  }
  console.log(`학습된 아이콘맵 ${iconMap.size}종: ${[...iconMap].map(([i, r]) => `${i}=${r}`).join(", ")}`);
  if (ambiguous.length) console.log(`⚠ 모호(최다값 채택): ${ambiguous.join(" | ")}`);

  const rarities = await prisma.rarity.findMany({ select: { id: true, code: true } });
  const rarId = new Map(rarities.map((r) => [r.code, r.id]));
  let fill = 0, noIcon = 0, unlearned = 0; const unl = new Set<string>(); const samples: string[] = []; const updates: { id: string; rid: string }[] = [];
  for (const lc of lcs) {
    if (lc.rarity?.code) continue; // null 만
    const jp = lc.locales.find((l) => l.region === "JP"); if (!jp || jp.numberInt == null) continue;
    const ic = iconByNum[String(jp.numberInt)]; if (!ic) { noIcon++; continue; }
    const rcode = iconMap.get(ic); if (!rcode) { unlearned++; unl.add(ic); continue; }
    const rid = rarId.get(rcode); if (!rid) { unlearned++; unl.add(`${ic}→${rcode}?`); continue; }
    updates.push({ id: lc.id, rid }); fill++;
    if (samples.length < 12) samples.push(`#${jp.numberInt} ${ic}=${rcode}`);
  }
  console.log(`null rarity 채움 ${fill} · 아이콘없음 ${noIcon} · 미학습아이콘 ${unlearned}${unl.size ? "(" + [...unl] + ")" : ""} ${APPLY ? "★APPLY" : "(dry)"}`);
  console.log("  " + samples.join(" | "));
  if (APPLY) { for (const u of updates) await prisma.logicalCard.update({ where: { id: u.id }, data: { rarityId: u.rid } }); console.log(`★적용 ${updates.length}`); }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
