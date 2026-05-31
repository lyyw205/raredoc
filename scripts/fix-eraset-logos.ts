import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

// JP set ID → EN equivalent pokemontcg.io set ID (로고 공유)
const MAP: Record<string, string> = {
  "jp-tcg-E1": "ecard1",   // 基本拡張パック → Expedition Base Set
  "jp-tcg-E2": "ecard2",   // 地図にない町 → Aquapolis
  "jp-tcg-E3": "ecard2",   // 海からの風 → Aquapolis (같은 EN 세트)
  "jp-tcg-E4": "ecard3",   // 裂けた大地 → Skyridge
  "jp-tcg-E5": "ecard3",   // 神秘なる山 → Skyridge
  "jp-tcg-ADV1": "ex1",    // 拡張パック ADV → Ruby & Sapphire
  "jp-tcg-ADV2": "ex2",    // 砂漠のきせき → Sandstorm
  "jp-tcg-ADV3": "ex3",    // 天空の覇者 → Dragon
  "jp-tcg-ADV4": "ex4",    // マグマVSアクア → Team Magma vs Team Aqua
  "jp-tcg-ADV5": "ex5",    // とかれた封印 → Hidden Legends
  "jp-tcg-PCG1": "ex6",    // 伝説の飛翔 → FireRed & LeafGreen
  "jp-tcg-PCG2": "ex7",    // 蒼空の激突 → Team Rocket Returns
  "jp-tcg-PCG3": "ex8",    // ロケット団の逆襲 → Deoxys
  "jp-tcg-PCG4": "ex9",    // 金の空、銀の海 → Emerald
  "jp-tcg-PCG5": "ex10",   // まぼろしの森 → Unseen Forces
  "jp-tcg-PCG6": "ex11",   // ホロンの研究塔 → Delta Species
  "jp-tcg-PCG7": "ex12",   // ホロンの幻影 → Legend Maker
  "jp-tcg-PCG8": "ex13",   // きせきの結晶 → Holon Phantoms
  "jp-tcg-PCG9": "ex14",   // さいはての攻防 → Crystal Guardians
  // DP/Pt/HGSS 의 JP set 들도 EN logo 공유 (이미 그룹 내 EN set 있지만 JP set 자체에도 채워두면 일관)
  "jp-tcg-dp1": "dp1", "jp-tcg-dp2": "dp2", "jp-tcg-dp3": "dp3",
  "jp-tcg-dp4": "dp4", "jp-tcg-dp5": "dp5", "jp-tcg-dp6": "dp6", "jp-tcg-dp7": "dp7",
  "jp-tcg-pl1": "pl1", "jp-tcg-pl2": "pl2", "jp-tcg-pl3": "pl3", "jp-tcg-pl4": "pl4",
  "jp-tcg-hgss1": "hgss1", "jp-tcg-hgss2": "hgss2", "jp-tcg-hgss3": "hgss3",
  "jp-tcg-hgss4": "hgss4", "jp-tcg-col1": "col1",
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try { const { stdout } = await execFileP("curl", ["-sSL","--max-time","12",url], { maxBuffer: 4*1024*1024 }); return JSON.parse(stdout) as T; } catch { return null; }
}

async function main() {
  const cache = new Map<string, { logo: string|null; symbol: string|null }>();
  let updated = 0, skipped = 0, fetchFail = 0;
  for (const [ourId, enId] of Object.entries(MAP)) {
    const cur = await prisma.set.findUnique({ where: { id: ourId }, select: { id: true, logoUrl: true, symbolUrl: true } });
    if (!cur) { console.log(`  ✗ ${ourId} (DB 없음)`); continue; }
    if (cur.logoUrl && cur.symbolUrl) { skipped++; continue; }
    let info = cache.get(enId);
    if (!info) {
      const d = await fetchJson<{ data: { images: { logo?: string; symbol?: string } } }>(`https://api.pokemontcg.io/v2/sets/${enId}`);
      const im = d?.data?.images ?? {};
      info = { logo: im.logo ?? null, symbol: im.symbol ?? null };
      cache.set(enId, info);
    }
    if (!info.logo && !info.symbol) { fetchFail++; continue; }
    await prisma.set.update({ where: { id: ourId }, data: {
      logoUrl: cur.logoUrl ?? info.logo ?? undefined,
      symbolUrl: cur.symbolUrl ?? info.symbol ?? undefined,
    } });
    console.log(`  ✓ ${ourId} ← ${enId}  logo=${info.logo ? "✓" : "-"} symbol=${info.symbol ? "✓" : "-"}`);
    updated++;
  }
  console.log(`\n결과: 업데이트 ${updated}, 이미 있음 ${skipped}, fetch 실패 ${fetchFail}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
