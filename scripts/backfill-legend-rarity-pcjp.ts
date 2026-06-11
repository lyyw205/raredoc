/**
 * LEGEND 시대 rarity 백필 — pc-jp 상세의 ic_rare_*.gif 아이콘으로 LC.rarityId 채움.
 * (KR 미발매 시대라 backfill-jp-rarity-kr 불가 → pc-jp 직접. RMAP 은 기존 체계 재사용)
 * 실행: npx tsx scripts/tmp-l1-rarity-pcjp.ts <jpSetId> <listJson> [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ic_rare_<code>.gif → Rarity.code (RMAP: backfill-jp-rarity-kr 와 동일 체계)
const ICON2CODE: Record<string, string> = { c: "C", u: "U", r: "R", rr: "RR", sr: "SR", ur: "UR", h: "R", s: "SR", ss: "LEGEND" }; // s=LEGEND시대 SR(Prime급), ss=LEGEND(2장 합체)
const RMAP: Record<string, string> = { C: "Common", U: "Uncommon", R: "Rare", RR: "Double Rare", SR: "Super Rare", UR: "Ultra Rare", LEGEND: "LEGEND" };

async function main() {
  const jpSetId = process.argv[2], listPath = process.argv[3], APPLY = process.argv.includes("--apply");
  if (!jpSetId || !listPath) { console.error("usage: <jpSetId> <listJson> [--apply]"); process.exit(1); }
  const list = JSON.parse(readFileSync(listPath, "utf8"));
  const locs = await prisma.regionCard.findMany({ where: { setId: jpSetId }, select: { numberInt: true, cardId: true, card: { select: { rarityId: true } } } });
  const byNum = new Map(locs.map((l) => [l.numberInt, l]));
  const rarities = await prisma.rarity.findMany({ select: { id: true, code: true } });
  const ridByCode = new Map(rarities.map((r) => [r.code, r.id]));
  let fill = 0, skip = 0, miss = 0; const dist: Record<string, number> = {};
  for (const c of list) {
    const loc = byNum.get(parseInt(c.number, 10));
    if (!loc || loc.card.rarityId) { skip++; continue; }
    let html: string | null = null;
    try { const { stdout } = await execFileP("curl", ["-s", "-A", UA, "--max-time", "20", c.detailUrl], { maxBuffer: 8 * 1024 * 1024 }); html = stdout; } catch {}
    await sleep(130);
    const icon = html?.match(/ic_rare_([a-z]+)\.gif/)?.[1];
    const code = icon ? ICON2CODE[icon] : null;
    const rid = code ? ridByCode.get(RMAP[code] ?? "") : null;
    if (!rid) { miss++; console.log("  ✗", c.number, c.jaName, "icon=" + (icon ?? "없음")); continue; }
    dist[code!] = (dist[code!] ?? 0) + 1;
    if (APPLY) await prisma.card.update({ where: { id: loc.cardId }, data: { rarityId: rid } });
    fill++;
  }
  console.log(`★ ${jpSetId}: 채움 ${fill} · 기존스킵 ${skip} · 미해결 ${miss} | 분포:`, JSON.stringify(dist), APPLY ? "(APPLY)" : "(dry)");
  await prisma.$disconnect();
}
main();
