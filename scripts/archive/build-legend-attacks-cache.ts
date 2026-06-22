/**
 * LEGEND 시대 attacks 캐시 생성 어댑터 — pc-jp pg 검색이 BW 이전을 미커버하므로
 * collect 산출 list(detailUrl 보유)에서 cardID 상세를 직접 스크랩해
 * fill-jp-attacks-types 의 dict 캐시(data/jp-official/<jpSetId>.pcjp.json)를 만든다.
 * 실행: npx tsx scripts/tmp-legend-attacks-cache.ts <jpSetId> <listJson>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const BASE = "https://www.pokemon-card.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const decode = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#039;/g, "'").replace(/&quot;/g, '"');
const stripTags = (s: string) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const TYPE_ICON: Record<string, string> = { grass: "Grass", fire: "Fire", water: "Water", lightning: "Lightning", electric: "Lightning", psychic: "Psychic", fighting: "Fighting", darkness: "Darkness", dark: "Darkness", metal: "Metal", steel: "Metal", fairy: "Fairy", dragon: "Dragon", colorless: "Colorless", none: "Colorless" };

async function curlText(url: string): Promise<string | null> {
  try { const { stdout } = await execFileP("curl", ["-s", "-A", UA, "--max-time", "30", url], { maxBuffer: 16 * 1024 * 1024 }); return stdout || null; } catch { return null; }
}
// fill-jp-attacks-types.ts 의 검증된 attacks 파서와 동일
function parseAttacks(html: string): any[] {
  const sec = html.match(/<h2 class="mt20">ワザ<\/h2>([\s\S]*?)(?:<h2 class="mt20">|<table)/);
  if (!sec) return [];
  const out: any[] = [];
  for (const mm of sec[1].matchAll(/<h4>([\s\S]*?)<\/h4>\s*<p>([\s\S]*?)<\/p>/g)) {
    const h4 = mm[1], text = stripTags(mm[2]);
    const cost: string[] = [];
    for (const im of h4.matchAll(/icon-([a-z]+)\s+icon/g)) { const t = TYPE_ICON[im[1]]; if (t) cost.push(t); }
    const dmg = h4.match(/<span class="f_right[^"]*">([\s\S]*?)<\/span>/);
    const damage = dmg ? stripTags(dmg[1]) || null : null;
    let name = h4.replace(/<span class="f_right[\s\S]*?<\/span>/g, "").replace(/<span[^>]*class="icon[\s\S]*?<\/span>/g, "");
    name = stripTags(name);
    if (name) out.push({ cost, name, text, damage });
  }
  return out;
}
function parseTypes(html: string): string[] {
  const m = html.match(/<span class="hp-type">[\s\S]*?<\/span>([\s\S]*?)<\/div>/);
  if (!m) return [];
  const out: string[] = [];
  for (const im of m[1].matchAll(/icon-([a-z]+)\s+icon/g)) { const t = TYPE_ICON[im[1]]; if (t) out.push(t); }
  return out;
}
const parseIllust = (h: string) => { const m = h.match(/イラストレーター<\/h4>\s*<a[^>]*>([\s\S]*?)<\/a>/); return m ? stripTags(m[1]) || null : null; };

async function main() {
  const jpSetId = process.argv[2], listPath = process.argv[3];
  if (!jpSetId || !listPath) { console.error("usage: <jpSetId> <listJson>"); process.exit(1); }
  const list = JSON.parse(readFileSync(listPath, "utf8"));
  const byNum: Record<string, any> = {};
  let ok = 0, fail = 0;
  for (const c of list) {
    if (!c.detailUrl) { fail++; continue; }
    const html = await curlText(c.detailUrl);
    await sleep(140);
    if (!html || !/<h1 class="Heading1/.test(html)) { fail++; console.log("  ✗", c.number, c.jaName); continue; }
    const n = parseInt(c.number, 10);
    byNum[String(n)] = {
      number: n, jaName: c.jaName,
      types: [...new Set(parseTypes(html))],
      attacks: c.category === "Pokemon" ? parseAttacks(html) : [],
      illustrator: parseIllust(html) ?? c.illustrator ?? null,
    };
    ok++;
  }
  const cachePath = `data/jp-official/${jpSetId}.pcjp.json`;
  writeFileSync(cachePath, JSON.stringify(byNum, null, 1));
  const wAtk = Object.values(byNum).filter((r: any) => r.attacks.length).length;
  console.log(`★ ${jpSetId}: ${ok}장 스크랩(실패 ${fail}) · attacks보유 ${wAtk} → ${cachePath}`);
}
main();
