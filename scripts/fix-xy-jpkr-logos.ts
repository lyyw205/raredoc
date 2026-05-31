/**
 * XY era JP/KR Set 의 logoUrl/symbolUrl 을 EN Set 에서 복사.
 * Phase 2 (sync-xy-pokemontcgio) 실행 후 실행.
 *
 * Run: npx tsx scripts/fix-xy-jpkr-logos.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

// JP/KR set ID → EN pokemontcg.io set ID (로고 공유)
const MAP: Record<string, string> = {
  // JP XY
  "jp-tcg-XY1a":  "xy1",
  "jp-tcg-XY1b":  "xy1",
  "jp-tcg-XY2":   "xy2",
  "jp-tcg-XY3":   "xy3",
  "jp-tcg-XY4":   "xy4",
  "jp-tcg-XY5a":  "xy5",
  "jp-tcg-XY6":   "xy6",
  "jp-tcg-XY7":   "xy7",
  "jp-tcg-XY8a":  "xy8",
  "jp-tcg-XY8b":  "xy8",
  "jp-tcg-XY9":   "xy9",
  "jp-tcg-XY10":  "xy10",
  "jp-tcg-XY11a": "xy11",
  // JP CP → nearest EN equivalent
  "jp-tcg-CP1":   "dc1",   // Double Crisis
  "jp-tcg-CP2":   "xy7",   // 伝説キラコレクション → nearest (Ancient Origins era)
  "jp-tcg-CP3":   "xy9",   // ポケキュンコレクション → nearest (BREAKpoint era)
  "jp-tcg-CP4":   "xy10",  // プレミアムチャンピオンパック → Fates Collide era
  "jp-tcg-CP5":   "xy11",  // 冷酷の反逆者 → Steam Siege era
  "jp-tcg-CP6":   "xy12",  // 20th Anniversary → Evolutions
  // KR XY
  "kr-xy1":  "xy1",
  "kr-xy2":  "xy2",
  "kr-xy3":  "xy3",
  "kr-xy4":  "xy4",
  "kr-xy5":  "xy5",
  "kr-xy7":  "xy7",
  "kr-xy8":  "xy8",
  "kr-xy9":  "xy9",
  "kr-xy10": "xy10",
  "kr-xy11": "xy11",
  "kr-cp1":  "dc1",
  "kr-cp2":  "xy7",
  "kr-cp3":  "xy9",
  "kr-cp4":  "xy10",
  "kr-cp5":  "xy11",
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "12", url], { maxBuffer: 4 * 1024 * 1024 });
    return JSON.parse(stdout) as T;
  } catch { return null; }
}

async function main() {
  const cache = new Map<string, { logo: string | null; symbol: string | null }>();
  let updated = 0, skipped = 0, fetchFail = 0;

  for (const [ourId, enId] of Object.entries(MAP)) {
    const cur = await prisma.set.findUnique({ where: { id: ourId }, select: { id: true, logoUrl: true, symbolUrl: true } });
    if (!cur) { console.log(`  ✗ ${ourId} (DB 없음)`); continue; }
    if (cur.logoUrl && cur.symbolUrl) { skipped++; continue; }

    // Try from already-synced EN set in DB first
    const enSetId = `en-tcg-${enId}`;
    let info = cache.get(enId);
    if (!info) {
      const enSet = await prisma.set.findUnique({ where: { id: enSetId }, select: { logoUrl: true, symbolUrl: true } });
      if (enSet?.logoUrl) {
        info = { logo: enSet.logoUrl, symbol: enSet.symbolUrl ?? null };
      } else {
        // Fallback: fetch from pokemontcg.io API
        const d = await fetchJson<{ data: { images: { logo?: string; symbol?: string } } }>(`https://api.pokemontcg.io/v2/sets/${enId}`);
        const im = d?.data?.images ?? {};
        info = { logo: im.logo ?? null, symbol: im.symbol ?? null };
      }
      cache.set(enId, info);
    }

    if (!info.logo && !info.symbol) { fetchFail++; console.log(`  ✗ ${ourId} ← ${enId} (fetch 실패)`); continue; }

    await prisma.set.update({
      where: { id: ourId },
      data: {
        logoUrl: cur.logoUrl ?? info.logo ?? undefined,
        symbolUrl: cur.symbolUrl ?? info.symbol ?? undefined,
      },
    });
    console.log(`  ✓ ${ourId} ← ${enId}  logo=${info.logo ? "✓" : "-"} symbol=${info.symbol ? "✓" : "-"}`);
    updated++;
  }

  console.log(`\n결과: 업데이트 ${updated}, 이미 있음 ${skipped}, fetch 실패 ${fetchFail}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
