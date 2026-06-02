/**
 * 분할 JP 세트(빈 스텁) 메타 재수집 — tcgdex ja 에서 카드별로 정확히 채움.
 *
 * 배경: enrich-sv-meta-tcgdex.ts 가 분할 2팩(SV2P+SV2D)을 같은 합본 DB세트에 매핑해
 *   같은 번호 2장이 한쪽 데이터로 덮여 dex/일러가 오염됐음. 이 스크립트는 분할 세트
 *   (jp-tcg-SV2P 등, 한 번호 1장)에 직접 적재하므로 충돌이 원천 불가능.
 *
 * 채우는 LogicalCard 필드: supertype·subtypes·pokedexNumbers·illustrator·hp·types·
 *   retreatCost·evolvesFrom·rarityId. (CardLocale 의 name/number 는 정확하므로 미변경,
 *   imageLarge/Small 은 비어있을 때만 채움)
 * dex: tcgdex dexId 우선, 없으면 PokeAPI ja(카타카나) 이름→dex 폴백(표준 매핑표).
 * rarity: tcgdex rarity 텍스트(영문) → Rarity.nameEn/nameJa 매칭.
 *
 * 실행:
 *   npx tsx scripts/recollect-split-jp-tcgdex.ts                      # 전체 dry
 *   npx tsx scripts/recollect-split-jp-tcgdex.ts --set=jp-tcg-SV2P    # 한 세트 dry
 *   npx tsx scripts/recollect-split-jp-tcgdex.ts --set=jp-tcg-SV2P --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildNameIndex } from "./lib/pokeapi-names";
const execFileP = promisify(execFile);

// DB 분할 setId → tcgdex(ja) set id
const SPLIT: Record<string, string> = {
  "jp-tcg-SV2P": "SV2P", // 스노해저드
  "jp-tcg-SV2D": "SV2D", // 클레이버스트
  "jp-tcg-SV4K": "SV4K", // 고대의 포효
  "jp-tcg-SV4M": "SV4M", // 미래의 일섬
};

type CardDetail = {
  id: string; localId: string; name: string; category?: string;
  illustrator?: string | null; rarity?: string | null; hp?: number | null;
  types?: string[]; stage?: string | null; suffix?: string | null; trainerType?: string | null; energyType?: string | null;
  retreat?: number | null; dexId?: number[]; evolveFrom?: string | null; image?: string | null;
};

const fetchJson = async <T>(url: string): Promise<T | null> => {
  try { const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", url], { maxBuffer: 16 * 1024 * 1024 }); return JSON.parse(stdout) as T; }
  catch { return null; }
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pad = (n: string) => { const i = parseInt(n, 10); return isNaN(i) ? n : String(i).padStart(3, "0"); };

const mapStage = (s?: string | null): string | null => {
  if (!s) return null;
  const m: Record<string, string> = { Basic: "Basic", Stage1: "Stage 1", Stage2: "Stage 2", "Stage 1": "Stage 1", "Stage 2": "Stage 2", VMAX: "VMAX", VSTAR: "VSTAR" };
  return m[s] ?? s;
};
const mapTrainer = (t?: string | null): string | null => {
  if (!t) return null;
  const m: Record<string, string> = { Supporter: "Supporter", Item: "Item", Stadium: "Stadium", Tool: "Pokémon Tool", "Pokémon Tool": "Pokémon Tool" };
  return m[t] ?? t;
};
function subtypesOf(d: CardDetail): string[] {
  const out: string[] = [];
  if (d.category === "Pokemon") {
    const st = mapStage(d.stage); if (st) out.push(st);
    const suf = (d.suffix ?? "").trim();
    if (/^ex$/i.test(suf)) out.push("ex");
    else if (suf && /^(V|VMAX|VSTAR|GX|EX)$/i.test(suf)) out.push(suf.toUpperCase() === "EX" ? "ex" : suf.toUpperCase());
  } else if (d.category === "Trainer") {
    const tt = mapTrainer(d.trainerType); if (tt) out.push(tt);
  } else if (d.category === "Energy") {
    out.push(d.energyType === "Special" ? "Special" : "Basic");
  }
  return out;
}
const supertypeOf = (cat?: string): string | null =>
  cat === "Pokemon" ? "Pokémon" : cat === "Trainer" ? "Trainer" : cat === "Energy" ? "Energy" : null;

// JP 카타카나 이름 → dex (suffix 제거 후 표준 ja 색인)
function dexFromJaName(name: string, jaIdx: Map<string, number>): number | null {
  const clean = name.replace(/(ex|EX|V|VMAX|VSTAR|GX|δ)\s*$/g, "").replace(/[\s　]/g, "").trim();
  const norm = clean.toLowerCase();
  return jaIdx.get(norm) ?? jaIdx.get(clean) ?? null;
}

async function main() {
  const setArg = process.argv.find((a) => a.startsWith("--set="))?.slice("--set=".length);
  const APPLY = process.argv.includes("--apply");
  const targets = setArg ? [setArg] : Object.keys(SPLIT);
  if (setArg && !SPLIT[setArg]) { console.error(`알 수 없는 분할세트. 가능: ${Object.keys(SPLIT).join(", ")}`); process.exit(1); }

  // Rarity 색인 (nameEn/nameJa 소문자 → {id,tier})
  const rarities = await prisma.rarity.findMany({ select: { id: true, nameEn: true, nameJa: true, tier: true } });
  const rarIdx = new Map<string, { id: string; tier: number }>();
  for (const r of rarities) { for (const n of [r.nameEn, r.nameJa]) if (n) rarIdx.set(n.trim().toLowerCase(), { id: r.id, tier: r.tier }); }
  const jaIdx = buildNameIndex("ja");

  for (const dbSetId of targets) {
    const tcgId = SPLIT[dbSetId];
    const cards = await prisma.cardLocale.findMany({ where: { setId: dbSetId }, orderBy: { numberInt: "asc" },
      select: { id: true, number: true, name: true, logicalCardId: true, imageLarge: true, imageSmall: true } });
    console.log(`\n─── ${dbSetId} ← tcgdex:${tcgId}(ja) · ${cards.length}장 · ${APPLY ? "★APPLY" : "dry"} ───`);
    let ok = 0, failFetch = 0, dexTcg = 0, dexJa = 0, dexNone = 0, rarNone = 0, sample = 0;
    const noDex: string[] = [], noRar = new Set<string>();

    for (const cl of cards) {
      let d = await fetchJson<CardDetail>(`https://api.tcgdex.net/v2/ja/cards/${tcgId}-${pad(cl.number)}`);
      await sleep(90);
      if (!d) { const ni = parseInt(cl.number, 10); if (!isNaN(ni)) { d = await fetchJson<CardDetail>(`https://api.tcgdex.net/v2/ja/cards/${tcgId}-${ni}`); await sleep(70); } }
      if (!d) { failFetch++; console.log(`  ✗fetch #${cl.number} "${cl.name}"`); continue; }

      const supertype = supertypeOf(d.category);
      const subtypes = subtypesOf(d);
      let dex: number[] = [];
      if (d.dexId?.length) { dex = d.dexId; dexTcg++; }
      else if (supertype === "Pokémon") { const x = dexFromJaName(cl.name, jaIdx); if (x) { dex = [x]; dexJa++; } else { dexNone++; noDex.push(`#${cl.number} ${cl.name}`); } }

      let rarityId: string | undefined; let rtier: number | undefined;
      if (d.rarity) { const hit = rarIdx.get(d.rarity.trim().toLowerCase()); if (hit) { rarityId = hit.id; rtier = hit.tier; } else { rarNone++; noRar.add(d.rarity); } }

      const update: Record<string, unknown> = {};
      if (supertype) update.supertype = supertype;
      if (subtypes.length) update.subtypes = subtypes;
      if (dex.length) update.pokedexNumbers = dex;
      if (d.illustrator) update.illustrator = d.illustrator;
      if (d.hp != null) update.hp = d.hp;
      if (d.types?.length) update.types = d.types;
      if (d.retreat != null) update.retreatCost = d.retreat;
      if (d.evolveFrom) update.evolvesFrom = d.evolveFrom;
      if (rarityId) update.rarityId = rarityId;

      if (sample < 5) { console.log(`  #${cl.number} "${cl.name}" st=${supertype} sub=[${subtypes}] dex=[${dex}]${d.dexId?.length ? "" : dex.length ? "(ja폴백)" : "(없음)"} illus=${d.illustrator ?? "∅"} rar=${d.rarity ?? "∅"}${rarityId ? `(t${rtier})` : "(미매칭)"}`); sample++; }

      if (APPLY && cl.logicalCardId && Object.keys(update).length) {
        await prisma.logicalCard.update({ where: { id: cl.logicalCardId }, data: update });
        if ((!cl.imageLarge || !cl.imageSmall) && d.image) {
          await prisma.cardLocale.update({ where: { id: cl.id }, data: {
            imageLarge: cl.imageLarge ?? `${d.image}/high.webp`, imageSmall: cl.imageSmall ?? `${d.image}/low.webp` } });
        }
      }
      ok++;
    }
    console.log(`  결과: 처리 ${ok} · fetch실패 ${failFetch} | dex[tcgdex ${dexTcg} · ja폴백 ${dexJa} · 없음 ${dexNone}] · rarity미매칭행 ${rarNone}`);
    if (noDex.length) console.log(`    dex못찾음: ${noDex.slice(0, 10).join(", ")}${noDex.length > 10 ? ` …+${noDex.length - 10}` : ""}`);
    if (noRar.size) console.log(`    rarity 미매칭 텍스트: ${[...noRar].join(" | ")}`);
  }
  await prisma.$disconnect();
  if (!APPLY) console.log(`\n(dry) 실제 적용: --apply`);
}
main().catch((e) => { console.error(e); process.exit(1); });
