/**
 * MEGA/구 JP 팩 포켓몬 타입 백필 — pc-jp(pokemon-card.com) 상세페이지 icon-class 에서 타입 수집해
 * Card.types 만 외과적으로 채움(다른 필드 무변경). 비어있을 때 채우고, 기존값과 다르면 교정.
 * 스크랩 결과는 <officialJson>.types.json 캐시 → dry 후 apply 시 재스크랩 안 함.
 *
 * 실행: npx tsx scripts/fill-jp-types.ts <cardPackId> <officialJson> [--apply]
 *   예: npx tsx scripts/fill-jp-types.ts mega-ninja-spinner data/jp-official/jp-m4.json
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

// collect-jp-pokemoncard.ts 와 동일(verbatim)
const TYPE_ICON: Record<string, string> = {
  grass: "Grass", fire: "Fire", water: "Water", lightning: "Lightning", electric: "Lightning", psychic: "Psychic",
  fighting: "Fighting", darkness: "Darkness", dark: "Darkness", metal: "Metal", steel: "Metal", fairy: "Fairy",
  dragon: "Dragon", colorless: "Colorless", none: "Colorless",
};
function parseTypes(html: string): string[] {
  const m = html.match(/<span class="hp-type">[\s\S]*?<\/span>([\s\S]*?)<\/div>/);
  if (!m) return [];
  const out: string[] = [];
  for (const im of m[1].matchAll(/icon-([a-z]+)\s+icon/g)) { const t = TYPE_ICON[im[1]]; if (t) out.push(t); }
  return out;
}
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function fetchTypes(cardID: string): Promise<string[] | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "25", "-A", UA, `https://www.pokemon-card.com/card-search/details.php/card/${cardID}/regu/all`], { maxBuffer: 8 * 1024 * 1024 });
    return [...new Set(parseTypes(stdout))];
  } catch { return null; }
}

async function main() {
  const gid = process.argv[2], officialJson = process.argv[3], APPLY = process.argv.includes("--apply");
  if (!gid || !officialJson) { console.error("usage: <cardPackId> <officialJson> [--apply]"); process.exit(1); }
  const cache = officialJson.replace(/\.json$/, ".types.json");
  const off: any[] = JSON.parse(readFileSync(officialJson, "utf8"));

  let typesByNum: Record<string, string[]>;
  if (existsSync(cache)) { typesByNum = JSON.parse(readFileSync(cache, "utf8")); console.log(`■ 캐시 사용 ${cache}`); }
  else {
    typesByNum = {}; let ok = 0, fail = 0, empty = 0;
    for (const c of off) {
      if (!c.cardID) continue;
      const t = await fetchTypes(c.cardID); await sleep(150);
      if (t === null) { fail++; continue; }
      typesByNum[String(parseInt(c.number, 10))] = t;
      if (t.length) ok++; else empty++;
    }
    writeFileSync(cache, JSON.stringify(typesByNum));
    console.log(`■ 스크랩 ${off.length}장: 타입보유 ${ok} · 빈값(트레이너/에너지) ${empty} · curl실패 ${fail} → ${cache}`);
  }

  const lcs = await prisma.card.findMany({ where: { cardPackId: gid }, select: { id: true, supertype: true, types: true, locales: { select: { region: true, numberInt: true } } } });
  let fill = 0, diff = 0, already = 0, noScrape = 0; const samples: string[] = []; const updates: { id: string; t: string[] }[] = [];
  for (const lc of lcs) {
    const jp = lc.locales.find((l) => l.region === "JP"); if (!jp || jp.numberInt == null) continue;
    const t = typesByNum[String(jp.numberInt)];
    if (t == null) { if (["Pokémon", "Pokemon"].includes(lc.supertype ?? "")) noScrape++; continue; }
    if (!t.length) continue; // 트레이너/에너지
    const cur = lc.types;
    if (cur.length && cur.join() === t.join()) { already++; continue; }
    if (cur.length) diff++;
    updates.push({ id: lc.id, t }); fill++;
    if (samples.length < 12) samples.push(`#${jp.numberInt} [${cur.join(",") || "∅"}]→[${t.join(",")}]`);
  }
  console.log(`fill ${fill} (기존값 교정 ${diff}) · 이미일치 ${already} · 스크랩없는 포켓몬 ${noScrape} ${APPLY ? "★APPLY" : "(dry)"}`);
  console.log("  " + samples.join(" | "));
  if (APPLY) { for (const u of updates) await prisma.card.update({ where: { id: u.id }, data: { types: u.t } }); console.log(`★적용 types ${updates.length}`); }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
