/**
 * pack-list-check 비교 엔진 — 팩 리스트 ↔ DB 6필드 대조 (JP 기준).
 *
 *   npx tsx .claude/skills/pack-list-check/scripts/compare-list.ts --list /tmp/<코드>.txt --pack <cardPackId>
 *   npx tsx .claude/skills/pack-list-check/scripts/compare-list.ts --list /tmp/<코드>.txt --set <jpSetId>
 *
 * 매번 새로 짜지 말고 이 스크립트를 그대로 쓴다. 비교 자료·매핑은 references/comparison-sources.md.
 * 레포 루트에서 실행(dotenv가 .env 로드). 읽기 전용 — DB를 바꾸지 않는다.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../../../../src/lib/prisma";

// ── args ──
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const LIST = arg("--list");
const PACK = arg("--pack");
const SET = arg("--set");
const CSV_PATH = arg("--csv") ?? "data/pokeapi/pokemon_species_names.csv";
if (!LIST || (!PACK && !SET)) {
  console.error("usage: --list <path> (--pack <cardPackId> | --set <jpSetId>) [--csv <path>]");
  process.exit(1);
}

// ── list parse (7-line chunks) ──
type Row = { num: number; total: number; name: string; stage: string; type: string; rar: string };
function parseList(path: string): Row[] {
  const L = readFileSync(path, "utf8").split("\n").map((s) => s.trim());
  const rows: Row[] = [];
  for (let i = 0; i + 5 < L.length; i += 7) {
    const name = L[i + 1], numL = L[i + 2];
    const m = numL?.match(/^(\d+)\/(\d+)$/);
    if (!name || !m) continue;
    const rm = (L[i + 5] || "").match(/\(([^)]+)\)\s*$/);
    rows.push({ num: +m[1], total: +m[2], name, stage: L[i + 3], type: L[i + 4], rar: rm ? rm[1] : L[i + 5] });
  }
  return rows;
}

// ── normalizers ──
const fw = (s: string) => (s || "").replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/　/g, " ");
const en = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

// ── rarity: DB Rarity.code/category.code → list 약어 (references §4) ──
function dbRar(code: string | null, cat: string | null): string {
  const c = code || "";
  if (c === "ACE SPEC Rare" || c === "Rare ACE") return "ACE";
  if (c === "Art Rare" || c === "Illustration Rare") return "AR";
  if (c === "Special Art Rare" || c === "Special Illustration Rare") return "SAR";
  if (c === "Super Rare") return "SR";
  if (c === "Ultra Rare") return "UR";
  if (c === "Double Rare") return "RR";
  if (c === "Hyper Rare") return "UR";
  if (c === "Mega Attack Rare") return "MA";
  if (c === "Mega Ultra Rare") return "MUR";
  const byCat: Record<string, string> = {
    common: "C", uncommon: "U", rare: "R", double_rare: "RR",
    illustration_rare: "AR", special_illustration_rare: "SAR",
    super_rare: "SR", ultra_rare: "UR", hyper_rare: "UR",
  };
  return byCat[cat || ""] ?? c;
}
const POKE_TYPES = new Set(["Grass", "Fire", "Water", "Lightning", "Psychic", "Fighting", "Darkness", "Metal", "Dragon", "Colorless", "Fairy"]);

async function main() {
  const rows = parseList(LIST!);
  console.log(`list: ${rows.length} rows (총장수=${rows[0]?.total})`);

  // ── target JP set ──
  let jpSetId = SET;
  if (!jpSetId && PACK) {
    const sets = await prisma.set.findMany({ where: { cardPackId: PACK }, select: { id: true, region: true, code: true, name: true } });
    console.log(`\ncardPack ${PACK} sets: ${sets.map((s) => `${s.id}(${s.region})`).join(", ")}`);
    jpSetId = sets.find((s) => s.region === "JP")?.id;
  }
  if (!jpSetId) { console.error("JP set 못 찾음"); return; }
  console.log(`>> target JP set = ${jpSetId}`);

  // ── load JP region cards ──
  const rcs = await prisma.regionCard.findMany({
    where: { setId: jpSetId },
    select: {
      number: true, numberInt: true, name: true,
      rarity: { select: { code: true, category: { select: { code: true } } } },
      card: {
        select: {
          subtypes: true, types: true, supertype: true, pokedexNumbers: true,
          gameCard: { select: { supertype: true } },
          rarity: { select: { code: true, category: { select: { code: true } } } },
        },
      },
    },
    orderBy: [{ numberInt: "asc" }, { number: "asc" }],
  });
  console.log(`JP rcs=${rcs.length}`);
  console.log("앞 8장: " + rcs.slice(0, 8).map((r) => `#${r.number} ${r.name}`).join(" | "));
  console.log("뒤 6장: " + rcs.slice(-6).map((r) => `#${r.number} ${r.name}`).join(" | "));

  const byNum = new Map<number, typeof rcs[number]>();
  for (const r of rcs) if (r.numberInt != null) byNum.set(r.numberInt, r);

  // ── CSV species (references §5) ──
  const csv = readFileSync(CSV_PATH, "utf8").split("\n");
  const h = csv[0].split(","), iId = h.indexOf("pokemon_species_id"), iLang = h.indexOf("local_language_id"), iName = h.indexOf("name");
  const enSp = new Map<number, string>(), jaSp = new Map<number, string>();
  for (let i = 1; i < csv.length; i++) {
    const p = csv[i].split(",");
    if (p.length <= iName) continue;
    const id = +p[iId], lang = +p[iLang];
    if (lang === 9) enSp.set(id, p[iName]);
    else if (lang === 1) jaSp.set(id, p[iName]);
  }

  // ── diff ──
  const issues: string[] = [];
  for (const row of rows) {
    if (row.num > row.total && !byNum.has(row.num)) continue; // 시크릿 초과번호 미적재는 EN링크/수집 영역(로그 별도)
    const r = byNum.get(row.num);
    if (!r) { issues.push(`#${row.num} ${row.name}: DB에 없음`); continue; }
    const st = r.card.gameCard?.supertype ?? r.card.supertype ?? "";
    const subs = r.card.subtypes ?? [], types = r.card.types ?? [];
    const rk = dbRar(r.rarity?.code ?? r.card.rarity?.code ?? null, r.rarity?.category?.code ?? r.card.rarity?.category?.code ?? null);
    const lk = (row.rar || "").trim();
    const isPoke = POKE_TYPES.has(row.type), isTrainer = row.type === "Trainer", isEnergy = row.type === "Energy";

    if (isPoke && st !== "Pokémon") issues.push(`#${row.num} ${row.name}: 분류 "${st}"≠Pokémon`);
    if (isTrainer && st !== "Trainer") issues.push(`#${row.num} ${row.name}: 분류 "${st}"≠Trainer`);
    if (isEnergy && st !== "Energy") issues.push(`#${row.num} ${row.name}: 분류 "${st}"≠Energy`);

    if (isPoke && row.stage && !subs.includes(row.stage)) issues.push(`#${row.num} ${row.name}: 단계 "${row.stage}" ∉ [${subs.join(",")}]`);
    if (isPoke && !types.includes(row.type)) issues.push(`#${row.num} ${row.name}: 타입 "${row.type}" ∉ [${types.join(",")}]`);

    // 무레어도 정규화: 리스트 "—"/빈값 = 레어도 없음, DB 양 계층 null = 레어도 없음.
    // 덱/박스·하이클래스 본탄은 정상적으로 무레어도라 양쪽 다 없으면 일치(스킵).
    const dbRarCode = r.rarity?.code ?? r.card.rarity?.code ?? null;
    const listHasRar = lk !== "" && lk !== "—" && lk !== "-";
    if (dbRarCode != null !== listHasRar) {
      issues.push(`#${row.num} ${row.name}: 레어도 DB=${dbRarCode ? `"${dbRarCode}"(${rk})` : "none"} ≠ list ${listHasRar ? lk : "none(—)"}`);
    } else if (dbRarCode != null && rk !== lk) {
      issues.push(`#${row.num} ${row.name}: 레어도 DB="${dbRarCode}"(${rk}) ≠ list ${lk}`);
    }

    // EX→ex
    if (/ ex$/.test(row.name) && subs.includes("EX") && !subs.includes("ex"))
      issues.push(`#${row.num} ${row.name}: subtypes "EX"(대문자) → "ex"  [EX→ex 자동수정]`);

    // name (포켓몬만, CSV 양방향)
    if (isPoke) {
      const pdex = r.card.pokedexNumbers ?? [];
      if (pdex.length === 0) issues.push(`#${row.num} ${row.name}: pokedexNumbers 비어있음`);
      else {
        const p0 = pdex[0], eS = enSp.get(p0), jS = jaSp.get(p0);
        if (eS && !en(row.name).includes(en(eS))) issues.push(`#${row.num} ${row.name}: EN리스트명이 CSV종명("${eS}",dex${p0}) 불일치`);
        if (jS && !fw(r.name).includes(fw(jS))) issues.push(`#${row.num} JP"${r.name}": CSV일본종명("${jS}",dex${p0}) 미포함(자기검증)`);
      }
    }
  }

  console.log(`\n===== ISSUES (${issues.length}) =====`);
  for (const s of issues) console.log("  " + s);
  if (!issues.length) console.log("  (없음 — 6필드 전부 일치)");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
