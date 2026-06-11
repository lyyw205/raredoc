/**
 * 팩 단위 Bulbapedia 카드페이지 스크래퍼 — JP명·일러스트레이터·attacks·abilities 보강.
 *
 * Bulbapedia 카드페이지 wikitext(`{{PokémoncardInfobox}}` + `{{Cardtext/Attack}}`)를 파싱.
 *   - RegionCard.name      = jname (일본어 카드명) — region=JP 정합화
 *   - Card.illustrator = caption "Illus. [[X]]"
 *   - Card.attacks  = [{ name, jname, cost:[energy], damage, text }] (구조화)
 *   - Card.abilities = [{ name, jname, text }]
 *   - weakness/resistance/retreatCost (비어있을 때만)
 * 확신 없으면(페이지 404 등) 건너뜀(추측 금지).
 *
 * URL: /w/api.php?action=parse&page=<EnglishName>_(<BulbaSet>_<number>)&prop=wikitext
 *
 * 실행: npx tsx scripts/sync-pack-bulbapedia-jp.ts <setId> --bulbaSet="Abyss Eye" [--limit=N] [--dry-run]
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const SET = process.argv[2];
const argBulba = process.argv.find((a) => a.startsWith("--bulbaSet="));
const BULBA = argBulba ? argBulba.split("=")[1] : null;
const argLimit = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = argLimit ? parseInt(argLimit.split("=")[1], 10) : Infinity;
const DRY = process.argv.includes("--dry-run");
if (!SET || !BULBA) { console.error('usage: <setId> --bulbaSet="Abyss Eye" [--limit=N] [--dry-run]'); process.exit(1); }

const UA = "raredoc-meta-enricher/0.1 (non-commercial card metadata)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWikitextRaw(title: string): Promise<string | null> {
  const url = `https://bulbapedia.bulbagarden.net/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json`;
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "25", "-A", UA, url], { maxBuffer: 16 * 1024 * 1024 });
    const j = JSON.parse(stdout);
    return j?.parse?.wikitext?.["*"] ?? null;
  } catch { return null; }
}
/** #REDIRECT 자동 추적(최대 2회). JP 세트명 페이지가 EN명(예: Ninja Spinner→Chaos Rising)으로 리다이렉트되는 경우 대응. */
async function fetchWikitext(title: string): Promise<string | null> {
  let cur: string | null = title;
  for (let i = 0; i < 3 && cur; i++) {
    const wt = await fetchWikitextRaw(cur);
    if (!wt) return null;
    const m = wt.match(/^\s*#REDIRECT\s*\[\[([^\]]+)\]\]/i);
    if (!m) return wt;
    cur = m[1].trim();
    await sleep(80);
  }
  return null;
}

/** {{Template ...}} 안의 |field= 값 추출(단순 필드). */
function field(block: string, name: string): string | null {
  const m = block.match(new RegExp(`\\|\\s*${name}\\s*=\\s*([^\\n|]*)`));
  return m ? m[1].trim() : null;
}
function infobox(wt: string): string {
  const i = wt.indexOf("{{PokémoncardInfobox");
  if (i < 0) return "";
  // Expansion/Footer 전까지
  const end = wt.indexOf("{{PokémoncardInfobox/Expansion", i);
  return wt.slice(i, end > 0 ? end : i + 1200);
}
/** 트레이너/에너지 인포박스 + supertype 힌트. */
function trainerInfobox(wt: string): { block: string; supertype: string | null } {
  for (const [tag, st] of [["{{TCGTrainerCardInfobox", "Trainer"], ["{{TCGEnergyCardInfobox", "Energy"]] as const) {
    const i = wt.indexOf(tag);
    if (i >= 0) { const end = wt.indexOf(tag + "/Expansion", i); return { block: wt.slice(i, end > 0 ? end : i + 1500), supertype: st }; }
  }
  return { block: "", supertype: null };
}
function illustrator(wt: string): string | null {
  // caption=Illus. [[Akino Fukuji]]  또는  [[Category:Illus. by Akino Fukuji]]
  let m = wt.match(/Illus\.\s*\[\[([^\]|]+)/);
  if (m) return m[1].trim();
  m = wt.match(/\[\[Category:Illus\. by ([^\]]+)\]\]/);
  return m ? m[1].trim() : null;
}
function energyCount(block: string): string[] {
  // cost 줄 전체에서 {{e|X}} 모두 수집 (field()는 |로 잘려 부정확하므로 줄 단위로)
  const m = block.match(/\|\s*cost\s*=\s*([^\n]*)/);
  if (!m) return [];
  return [...m[1].matchAll(/\{\{e\|([^}]+)\}\}/g)].map((x) => x[1]);
}
/** {{Cardtext/<kind> ...}} 블록들. 중첩 {{e|..}} 때문에 다음 {{Cardtext/ 까지로 경계 분리. */
function blocks(wt: string, kind: string): string[] {
  const parts = wt.split(new RegExp(`\\{\\{Cardtext/${kind}`));
  const out: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    let seg = parts[i];
    const next = seg.search(/\{\{Cardtext\//);
    if (next >= 0) seg = seg.slice(0, next);
    out.push(seg);
  }
  return out;
}

type Parsed = {
  jname: string | null; illustrator: string | null;
  attacks: any[]; abilities: any[];
  weakness: string | null; resistance: string | null; retreat: number | null;
  supertypeHint: string | null; // "Trainer" | "Energy" (포켓몬이면 null)
};
function parse(wt: string): Parsed {
  const ib = infobox(wt);
  const tr = trainerInfobox(wt);
  const attacks = blocks(wt, "Attack").map((b) => ({
    name: field(b, "name"), jname: field(b, "jname"),
    cost: energyCount(b), damage: field(b, "damage") || null,
    text: field(b, "effect"),
  })).filter((a) => a.name);
  const abilities = blocks(wt, "Ability").map((b) => ({
    name: field(b, "name"), jname: field(b, "jname"), text: field(b, "effect"),
  })).filter((a) => a.name);
  return {
    jname: field(ib, "jname") ?? field(tr.block, "jname"), // 포켓몬 없으면 트레이너/에너지 jname
    illustrator: illustrator(wt),
    attacks, abilities,
    weakness: field(ib, "weakness"), resistance: field(ib, "resistance"),
    retreat: field(ib, "retreatcost") ? parseInt(field(ib, "retreatcost")!, 10) : null,
    supertypeHint: ib ? null : tr.supertype,
  };
}

function cleanName(name: string): string {
  return name.replace(/<[^>]*>/g, "").replace(/\s*\([^)]*\)/g, "").replace(/\s*-\s*\d+\/\d+\s*$/, "").trim();
}

async function main() {
  const cards = await prisma.regionCard.findMany({
    where: { setId: SET },
    select: { id: true, name: true, number: true, numberInt: true,
              card: { select: { id: true, illustrator: true, weakness: true, resistance: true, retreatCost: true, supertype: true, hp: true } } },
    orderBy: { numberInt: "asc" },
  });
  console.log(`[init] ${SET}: ${cards.length}장, bulbaSet="${BULBA}", limit=${LIMIT === Infinity ? "all" : LIMIT}, dry=${DRY}`);

  let ok = 0, jnameF = 0, illF = 0, atkF = 0, abiF = 0; const miss: string[] = [];
  let done = 0;
  for (const c of cards) {
    if (done >= LIMIT) break;
    done++;
    const en = cleanName(c.name);
    const num = c.numberInt ?? parseInt(c.number, 10);
    const title = `${en.replace(/\s+/g, "_")}_(${BULBA!.replace(/\s+/g, "_")}_${num})`;
    const wt = await fetchWikitext(title);
    await sleep(120);
    if (!wt || wt.includes("Wikitext")) { /* noop */ }
    if (!wt) { miss.push(`${en} #${num} (fetch실패)`); continue; }
    const p = parse(wt);
    if (!p.jname && p.attacks.length === 0 && !p.illustrator) { miss.push(`${en} #${num} (파싱0)`); continue; }
    ok++;
    console.log(`  ✓ #${num} ${en} → jname=${p.jname ?? "-"} illus=${p.illustrator ?? "-"} atk=${p.attacks.length} abi=${p.abilities.length}`);
    if (DRY) continue;
    const lc = c.card;
    const data: any = {};
    if (p.illustrator && !lc.illustrator) { data.illustrator = p.illustrator; illF++; }
    if (p.attacks.length) { data.attacks = p.attacks; atkF++; }
    if (p.abilities.length) { data.abilities = p.abilities; abiF++; }
    if (p.weakness && !lc.weakness) data.weakness = p.weakness;
    if (p.resistance && !lc.resistance) data.resistance = p.resistance;
    if (p.retreat != null && lc.retreatCost == null) data.retreatCost = p.retreat;
    // supertype 교정: Bulbapedia가 트레이너/에너지라 하고 hp 없으면(=실제 포켓몬 아님) 정정
    if (p.supertypeHint && lc.hp == null && lc.supertype !== p.supertypeHint) data.supertype = p.supertypeHint;
    if (Object.keys(data).length) await prisma.card.update({ where: { id: lc.id }, data });
    if (p.jname) { await prisma.regionCard.update({ where: { id: c.id }, data: { name: p.jname } }); jnameF++; }
  }

  console.log("\n=== BULBAPEDIA SYNC SUMMARY ===");
  console.log({ set: SET, processed: done, parsed_ok: ok, jnameF, illF, atkF, abiF, missed: miss.length });
  if (miss.length) console.log("missed:", miss.slice(0, 40));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
