/**
 * 팩 단위 PokeAPI 보강 — pokedexNumbers + 한글명(CardText ko, nameKo).
 *
 * 포켓몬 카드(영문명 보유)의 영문명을 PokeAPI species 로 매핑해:
 *   - LogicalCard.pokedexNumbers (비어있을 때만)
 *   - LogicalCard.nameKo (비어있을 때만; 전환기 호환)
 *   - CardText(ko) upsert (source="pokeapi")
 * 확신 없으면 건너뜀(추측 금지) → unmatched 로 리포트.
 *
 * 실행: npx tsx scripts/fill-pack-pokeapi.ts <setId> [--dry-run]
 *   예: npx tsx scripts/fill-pack-pokeapi.ts jp-mega-abyss-eye --dry-run
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const SET = process.argv[2];
const DRY = process.argv.includes("--dry-run");
if (!SET || SET.startsWith("--")) { console.error("usage: fill-pack-pokeapi.ts <setId> [--dry-run]"); process.exit(1); }

const UA = "raredoc-meta-enricher/0.1 (non-commercial card metadata)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 카드 영문명 → PokeAPI species slug 후보들 (우선순위). */
function speciesCandidates(name: string): string[] {
  let n = name.trim();
  // 접두/접미 메커니즘 토큰 제거
  n = n.replace(/<[^>]*>/g, "");                       // HTML 잔재
  n = n.replace(/\s*\([^)]*\)/g, "");                   // "(Energy Symbol Pattern)" 등 괄호 접미
  n = n.replace(/\s*-\s*\d+\/\d+\s*$/, "");             // " - 100/081" 번호 접미사
  n = n.replace(/^[^']*'s\s+/i, "");                    // Ethan's / Team Rocket's / Cynthia's / N's 소유격 접두
  n = n.replace(/^(Mega|M)\s+/i, "");                   // Mega 진화 → 기본종
  n = n.replace(/\b(ex|EX|GX|V|VMAX|VSTAR|V-UNION|BREAK|Prime|LV\.?X|δ)\b/g, "");
  n = n.replace(/\s+[XY]\b/g, "");                      // 메가 X/Y 변형 (Charizard X, Mewtwo Y)
  n = n.replace(/\s+/g, " ").trim();
  const base = n.toLowerCase();
  const slug = (s: string) => s.replace(/[.'’:]/g, "").replace(/\s+/g, "-");
  const out = new Set<string>();
  out.add(slug(base));
  // 지역폼: "Hisuian Growlithe" → growlithe-hisui 등
  const forms: Record<string, string> = { hisuian: "hisui", alolan: "alola", galarian: "galar", paldean: "paldea" };
  const parts = base.split(" ");
  if (parts.length >= 2 && forms[parts[0]]) out.add(slug(`${parts.slice(1).join(" ")}-${forms[parts[0]]}`));
  // 마지막 단어만(수식어 제거 폴백)
  if (parts.length >= 2) out.add(slug(parts[parts.length - 1]));
  return [...out].filter(Boolean);
}

type Species = { id: number; names: { name: string; language: { name: string } }[] };
async function fetchSpecies(slug: string): Promise<Species | null> {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${slug}/`, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    return (await res.json()) as Species;
  } catch { return null; }
}

async function main() {
  const cards = await prisma.cardLocale.findMany({
    where: { setId: SET },
    select: { name: true, logicalCard: { select: { id: true, hp: true, supertype: true, pokedexNumbers: true, nameKo: true } } },
  });
  // 포켓몬 후보 = hp 보유 (트레이너/에너지 제외)
  const pokes = cards.filter((c) => c.logicalCard.hp != null);
  console.log(`[init] ${SET}: 카드 ${cards.length}, 포켓몬 후보 ${pokes.length}`);

  let matched = 0, dexFilled = 0, koFilled = 0;
  const unmatched: string[] = [];

  for (const c of pokes) {
    const lc = c.logicalCard;
    let sp: Species | null = null;
    for (const cand of speciesCandidates(c.name)) {
      sp = await fetchSpecies(cand);
      await sleep(60);
      if (sp) break;
    }
    if (!sp) { unmatched.push(c.name); continue; }
    matched++;
    const ko = sp.names.find((x) => x.language.name === "ko")?.name ?? null;
    const dex = sp.id;

    if (DRY) continue;
    // pokedexNumbers (비어있을 때만)
    if (!lc.pokedexNumbers || lc.pokedexNumbers.length === 0) {
      await prisma.logicalCard.update({ where: { id: lc.id }, data: { pokedexNumbers: [dex] } });
      dexFilled++;
    }
    if (ko) {
      // nameKo (전환기 호환, 비어있을 때만)
      if (!lc.nameKo) await prisma.logicalCard.update({ where: { id: lc.id }, data: { nameKo: ko } });
      // CardText(ko) upsert
      await prisma.cardText.upsert({
        where: { logicalCardId_language: { logicalCardId: lc.id, language: "ko" } },
        update: { name: ko, source: "pokeapi" },
        create: { logicalCardId: lc.id, language: "ko", name: ko, source: "pokeapi", confidence: 0.95 },
      });
      koFilled++;
    }
  }

  console.log("\n=== POKEAPI FILL SUMMARY ===");
  console.log({ set: SET, dryRun: DRY, pokemon: pokes.length, matched, dexFilled, koFilled, unmatched: unmatched.length });
  if (unmatched.length) console.log("unmatched:", unmatched.slice(0, 40));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
