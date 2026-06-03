/**
 * JP 분할세트 레어도 백필 — tcgdex JP 가 시크릿레어(#68+/#73+ AR/SR/SAR/UR 등)에 rarity 미제공한 분을
 *   pokemoncard.co.kr 공식 상세페이지(p_num 안 no_wrap_by_admin 코드)로 보강.
 *   KR 레어도 척도 = JP 와 동일(C/U/R/RR/AR/SR/SAR/UR/HR/MUR…) → 공유 LogicalCard.rarityId 채움.
 * rarityId 가 이미 있는 LC 는 건드리지 않음(tcgdex 값 보존). KR locale(=JP 앵커 LC) 기준으로 순회.
 *
 * 실행: npx tsx scripts/backfill-jp-rarity-kr.ts [--set=kr-sv2p] [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const CFG: Record<string, string> = { "kr-sv2p": "sv2p", "kr-sv2d": "sv2d", "kr-sv4k": "sv4k", "kr-sv4m": "sv4m", "kr-sv-151": "sv2a", "kr-sv3": "sv3", "kr-sv3a": "sv3a", "kr-sv4a": "sv4a", "kr-sv5k": "sv5k", "kr-sv5m": "sv5m", "kr-sv5a": "sv5a", "kr-sv6": "sv6", "kr-sv6a": "sv6a", "kr-sv7": "sv7", "kr-sv7a": "sv7a", "kr-sv8": "sv8", "kr-sv8a": "sv8a", "kr-sv9": "sv9", "kr-sv9a": "sv9a", "kr-sv10": "sv10", "kr-sv11b": "sv11b", "kr-sv11w": "sv11w", "kr-m1l": "m1l", "kr-m1s": "m1s", "kr-m2": "m2", "kr-m2a": "m2a", "kr-m3": "m3", "kr-m4": "m4", "kr-s12a": "s12a", "kr-s12": "s12", "kr-s11a": "s11a", "kr-s11": "s11", "kr-s10b": "s10b", "kr-s10a": "s10a", "kr-s10": "s10d", "kr-s10p": "s10p", "kr-s9a": "s9a", "kr-s9": "s9", "kr-s8b": "s8b", "kr-s8": "s8", "kr-s7": "s7d", "kr-s7r": "s7r", "kr-s6": "s6h", "kr-s6k": "s6k", "kr-s5": "s5i", "kr-s5r": "s5r", "kr-s4": "s4", "kr-s3a": "s3a", "kr-s3": "s3" };
// KR/JP 레어도 코드 → Rarity.code (sync-pack-namu-ko.ts 와 동일)
const RMAP: Record<string, string> = {
  C: "Common", U: "Uncommon", R: "Rare", RR: "Double Rare", RRR: "Triple Rare", AR: "Art Rare",
  SR: "Super Rare", SAR: "Special Art Rare", UR: "Ultra Rare", HR: "Hyper Rare", MUR: "Mega Ultra Rare",
  CHR: "Character Rare", CSR: "Character Super Rare", ACE: "ACE SPEC Rare", K: "Radiant Rare",
  S: "Shiny Rare", SSR: "Shiny Secret Rare", // SV4a 샤이니트레저: S=샤이니, SSR=샤이니 시크릿
  BWR: "Black White Rare", // SV11 BBWF
  MA: "Mega Attack Rare", MHR: "Mega Hyper Rare", // MEGA 시리즈 (MUR은 위에 있음)
};
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function rarityCode(detailId: string): Promise<string | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", "-A", UA, `https://pokemoncard.co.kr/cards/detail/${detailId}`], { maxBuffer: 8 * 1024 * 1024 });
    const m = stdout.match(/<span class="p_num">[^<]*<span id="no_wrap_by_admin">\s*([A-Za-z]+)\s*<\/span>/);
    return m ? m[1].toUpperCase() : null;
  } catch { return null; }
}

async function main() {
  const APPLY = process.argv.includes("--apply");
  const setArg = process.argv.find((a) => a.startsWith("--set="))?.slice("--set=".length);
  const targets = setArg ? [setArg] : Object.keys(CFG);
  const rarities = await prisma.rarity.findMany({ select: { id: true, code: true } });
  const rarById = new Map(rarities.map((r) => [r.code, r.id]));

  for (const krSet of targets) {
    const code = CFG[krSet]; if (!code) { console.error(`unknown ${krSet}`); continue; }
    const off = JSON.parse(readFileSync(`data/kr-official/kr-official-${code}.json`, "utf8"));
    const detailByNum = new Map<number, string>(off.map((c: any) => [parseInt(c.number, 10), c.detailId]));
    // KR locale = JP 앵커 LC. rarityId null 인 것만.
    const kr = await prisma.cardLocale.findMany({ where: { setId: krSet }, orderBy: { numberInt: "asc" },
      select: { number: true, numberInt: true, name: true, logicalCardId: true, logicalCard: { select: { rarityId: true } } } });
    const todo = kr.filter((r) => !r.logicalCard.rarityId);
    console.log(`\n■ ${krSet}: 레어도 null ${todo.length}/${kr.length} ${APPLY ? "★적용" : "(dry)"}`);
    let filled = 0, noDetail = 0, noCode = 0, unmapped = 0; const unm = new Set<string>(); const sample: string[] = [];

    for (const r of todo) {
      const detailId = detailByNum.get(r.numberInt!);
      if (!detailId) { noDetail++; continue; }
      const rc = await rarityCode(detailId); await sleep(120);
      if (!rc) { noCode++; continue; }
      const rarCode = RMAP[rc];
      const rarId = rarCode ? rarById.get(rarCode) : undefined;
      if (!rarId) { unmapped++; unm.add(rc); continue; }
      if (sample.length < 6) sample.push(`#${r.number} ${r.name}=${rc}`);
      if (APPLY) await prisma.logicalCard.update({ where: { id: r.logicalCardId }, data: { rarityId: rarId } });
      filled++;
    }
    console.log(`  채움 ${filled} · detailId없음 ${noDetail} · 코드추출실패 ${noCode} · 미매핑 ${unmapped}`);
    if (sample.length) console.log(`  예: ${sample.join(", ")}`);
    if (unm.size) console.log(`  ⚠️ 미매핑 코드: ${[...unm].join(", ")}`);
  }
  await prisma.$disconnect();
  if (!APPLY) console.log(`\n(dry) 적용: --apply`);
}
main().catch((e) => { console.error(e); process.exit(1); });
