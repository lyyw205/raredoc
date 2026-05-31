/**
 * 작업1: jp-mega-abyss-eye base 카드(numberInt 1-81) 중 구조화 attacks 없는 카드 재시도.
 *
 * 기존 sync-pack-bulbapedia-jp.ts와 동일한 파싱 로직을 사용하되,
 * 트레이너/에너지 카드 infobox(TCGTrainerCardInfobox, TCGEnergyCardInfobox)도 처리.
 *
 * 실행: npx tsx scripts/fix-abyss-eye-misses.ts [--dry-run]
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const DRY = process.argv.includes("--dry-run");
const UA = "raredoc-meta-enricher/0.1 (non-commercial card metadata)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWikitextRaw(title: string): Promise<string | null> {
  const url = `https://bulbapedia.bulbagarden.net/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json`;
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "25", "-A", UA, url], { maxBuffer: 16 * 1024 * 1024 });
    const j = JSON.parse(stdout);
    if (j?.error) return null;
    return j?.parse?.wikitext?.["*"] ?? null;
  } catch { return null; }
}

/** #REDIRECT를 자동 추적 (1회). */
async function fetchWikitext(title: string): Promise<string | null> {
  const wt = await fetchWikitextRaw(title);
  if (!wt) return null;
  const redirM = wt.match(/^#REDIRECT\s*\[\[([^\]]+)\]\]/i);
  if (redirM) {
    await sleep(120);
    return fetchWikitextRaw(redirM[1]);
  }
  return wt;
}

function field(block: string, name: string): string | null {
  const m = block.match(new RegExp(`\\|\\s*${name}\\s*=\\s*([^\\n|]*)`));
  return m ? m[1].trim() : null;
}

/** PokémoncardInfobox 블록 추출 */
function infobox(wt: string): string {
  const i = wt.indexOf("{{PokémoncardInfobox");
  if (i < 0) return "";
  const end = wt.indexOf("{{PokémoncardInfobox/Expansion", i);
  return wt.slice(i, end > 0 ? end : i + 1200);
}

/** TCGTrainerCardInfobox 또는 TCGEnergyCardInfobox 블록 추출 */
function trainerInfobox(wt: string): string {
  for (const tag of ["{{TCGTrainerCardInfobox", "{{TCGEnergyCardInfobox"]) {
    const i = wt.indexOf(tag);
    if (i >= 0) {
      const end = wt.indexOf(tag + "/Expansion", i);
      return wt.slice(i, end > 0 ? end : i + 1500);
    }
  }
  return "";
}

/** 일러스트레이터 추출 (여러 형식 대응) */
function illustrator(wt: string): string | null {
  // caption= 줄에서 Illus. [[X]] 또는 {{OBP|X|illustrator}}
  const captionM = wt.match(/\|\s*caption\s*=([^\n]*)/);
  if (captionM) {
    const cap = captionM[1];
    // Regular print만 추출 (첫 번째 Illus.)
    const m1 = cap.match(/Illus\.\s*\[\[([^\]|]+)/);
    if (m1) return m1[1].trim();
    const m2 = cap.match(/\{\{OBP\|([^|]+)\|illustrator\}\}/);
    if (m2) return m2[1].trim();
  }
  // 본문에서 Illus. [[X]]
  let m = wt.match(/Illus\.\s*\[\[([^\]|]+)/);
  if (m) return m[1].trim();
  // Category
  m = wt.match(/\[\[Category:Illus\. by ([^\]]+)\]\]/);
  return m ? m[1].trim() : null;
}

function energyCount(block: string): string[] {
  const m = block.match(/\|\s*cost\s*=\s*([^\n]*)/);
  if (!m) return [];
  return [...m[1].matchAll(/\{\{e\|([^}]+)\}\}/g)].map((x) => x[1]);
}

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
  jname: string | null;
  illustrator: string | null;
  attacks: any[];
  abilities: any[];
  weakness: string | null;
  resistance: string | null;
  retreat: number | null;
  isTrainerOrEnergy: boolean;
};

function parse(wt: string): Parsed {
  const ib = infobox(wt);
  const tb = trainerInfobox(wt);
  const activeIb = ib || tb;

  const attacks = blocks(wt, "Attack").map((b) => ({
    name: field(b, "name"), jname: field(b, "jname"),
    cost: energyCount(b), damage: field(b, "damage") || null,
    text: field(b, "effect"),
  })).filter((a) => a.name);

  const abilities = blocks(wt, "Ability").map((b) => ({
    name: field(b, "name"), jname: field(b, "jname"), text: field(b, "effect"),
  })).filter((a) => a.name);

  const jname = field(activeIb, "jname");

  return {
    jname,
    illustrator: illustrator(wt),
    attacks,
    abilities,
    weakness: field(ib, "weakness"),
    resistance: field(ib, "resistance"),
    retreat: field(ib, "retreatcost") ? parseInt(field(ib, "retreatcost")!, 10) : null,
    isTrainerOrEnergy: !ib && !!tb,
  };
}

function cleanName(name: string): string {
  return name.replace(/<[^>]*>/g, "").replace(/\s*-\s*\d+\/\d+\s*$/, "").trim();
}

function titleize(name: string): string {
  return name.replace(/\s+/g, "_");
}

async function main() {
  // 구조화 attacks 없는 base 카드 조회
  const cards = await prisma.cardLocale.findMany({
    where: { setId: "jp-mega-abyss-eye", numberInt: { gte: 1, lte: 81 } },
    select: {
      id: true, name: true, number: true, numberInt: true,
      logicalCard: { select: { id: true, illustrator: true, attacks: true, abilities: true, weakness: true, resistance: true, retreatCost: true } },
    },
    orderBy: { numberInt: "asc" },
  });

  const misses = cards.filter((c) => {
    const atk = c.logicalCard.attacks;
    if (!Array.isArray(atk) || atk.length === 0) return true;
    return (atk[0] as any)?.cost === undefined;
  });

  console.log(`[init] 미스 base 카드: ${misses.length}장, dry=${DRY}`);

  let ok = 0, jnameF = 0, illF = 0, atkF = 0, abiF = 0;
  const stillMiss: string[] = [];

  for (const c of misses) {
    const en = cleanName(c.name);
    const num = c.numberInt ?? parseInt(c.number, 10);

    // 후보 타이틀 목록
    const candidates: string[] = [
      `${titleize(en)}_(Abyss_Eye_${num})`,
    ];
    // 아포스트로피 변형 (typographic → standard)
    if (en.includes("'")) {
      candidates.push(`${titleize(en.replace(/'/g, "'"))}_(Abyss_Eye_${num})`);
    }
    // 표준 → typographic
    if (en.includes("'")) {
      candidates.push(`${titleize(en.replace(/'/g, "’"))}_(Abyss_Eye_${num})`);
    }

    let wt: string | null = null;
    let usedTitle = "";
    for (const candidate of candidates) {
      wt = await fetchWikitext(candidate);
      await sleep(120);
      if (wt) { usedTitle = candidate; break; }
    }

    if (!wt) {
      stillMiss.push(`#${num} ${en} (fetch실패, 시도타이틀: ${candidates[0]})`);
      continue;
    }

    const p = parse(wt);

    // 트레이너/에너지: jname이나 illustrator라도 있으면 처리
    const hasUseful = p.jname || p.illustrator || p.attacks.length > 0 || p.abilities.length > 0;
    if (!hasUseful) {
      stillMiss.push(`#${num} ${en} (파싱0, title=${usedTitle})`);
      continue;
    }

    ok++;
    console.log(`  ✓ #${num} ${en} → jname=${p.jname ?? "-"} illus=${p.illustrator ?? "-"} atk=${p.attacks.length} abi=${p.abilities.length} trainer=${p.isTrainerOrEnergy}`);
    if (DRY) continue;

    const lc = c.logicalCard;
    const data: any = {};
    if (p.illustrator && !lc.illustrator) { data.illustrator = p.illustrator; illF++; }
    if (p.attacks.length) { data.attacks = p.attacks; atkF++; }
    if (p.abilities.length) { data.abilities = p.abilities; abiF++; }
    if (p.weakness && !lc.weakness) data.weakness = p.weakness;
    if (p.resistance && !lc.resistance) data.resistance = p.resistance;
    if (p.retreat != null && lc.retreatCost == null) data.retreatCost = p.retreat;
    if (Object.keys(data).length) await prisma.logicalCard.update({ where: { id: lc.id }, data });
    if (p.jname) { await prisma.cardLocale.update({ where: { id: c.id }, data: { name: p.jname } }); jnameF++; }
  }

  console.log("\n=== ABYSS EYE MISS FIX SUMMARY ===");
  console.log({ processed: misses.length, parsed_ok: ok, jnameF, illF, atkF, abiF, stillMiss: stillMiss.length });
  if (stillMiss.length) console.log("여전히 미스:", stillMiss);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
