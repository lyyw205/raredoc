/**
 * MEGA era 미수록 3세트 supertype 보강 (name-based heuristic).
 *
 * tcgdex 미수록: mega-dream-ex, mega-ninja-spinner, mega-abyss-eye
 * 이 세트들은 EN 이름 카드 (TCGPlayer sourced)
 *
 * 규칙:
 *   - name contains "Energy" → Energy
 *   - name ends with " ex", " EX", "VMAX", "V", "GX" → Pokémon
 *   - name matches known Pokemon name patterns → Pokémon
 *   - otherwise → Trainer
 *
 * Run: npx tsx scripts/enrich-mega-supertype-heuristic.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const TARGET_GROUPS = ["mega-dream-ex", "mega-ninja-spinner", "mega-abyss-eye"];

// Trainer card keywords that appear in names
const TRAINER_KEYWORDS = [
  "Ball", "Rod", "Lure", "Town", "City", "Gym", "Map", "Machine",
  "Potion", "Revive", "Ether", "Energy Search", "Switch", "Escape",
  "Pokedex", "Scanner", "Radar", "Scope", "Claw", "Hook", "Band",
  "Coin", "Ribbon", "Card", "Ticket", "Kit", "Badge", "Deck",
  "Professor", "Researcher", "Teacher", "Grunt", "Admin", "Rival",
  "Tower", "Lab", "Garden", "Market", "Center", "Station", "Island",
  "Forest", "Cave", "Path", "Gate", "Bridge", "Ruins", "Temple",
  "Shrine", "Museum", "Game", "Aroma", "Incense", "Herb", "Berry",
  "Leaf", "Moon", "Sun", "Star", "Wind", "Fire", "Water", "Thunder",
  "Rock", "Ground", "Ice", "Dark", "Steel", "Dragon", "Fairy", "Normal",
  // Common trainer names
  "Cynthia", "N", "Lillie", "Guzma", "Lusamine", "Kukui", "Gladion",
  "Hau", "Mallow", "Lana", "Kiawe", "Sophocles", "Acerola", "Ilima",
  "Hapu", "Wicke", "Colress", "Looker", "Faba", "Plumeria",
  "Marnie", "Hop", "Sonia", "Bea", "Allister", "Nessa", "Kabu",
  "Raihan", "Melony", "Gordie", "Piers", "Rose", "Oleana", "Leon",
  "Bede", "Opal", "Mustard", "Klara", "Avery", "Peony",
  "Serena", "Calem", "Shauna", "Tierno", "Trevor", "Lysandre",
  "Diantha", "Sina", "Dexio", "Malva", "Olympia", "Wulfric",
  "Korrina", "Ramos", "Clemont", "Valerie", "Viola", "Grant",
  "Ash", "Misty", "Brock", "Tracey", "May", "Max", "Dawn", "Kenny",
  "Paul", "Iris", "Cilan", "Bonnie", "Clemont",
  "Koraidon ex", // No - these are Pokemon
];

// Energy card keywords
const ENERGY_KEYWORDS = ["Energy"];

// Pokemon suffixes
const POKEMON_SUFFIXES = [" ex", " EX", " V", "VMAX", "VSTAR", " GX", "-GX"];

function inferSupertype(name: string): string {
  // Energy check: only pure Energy cards
  // Pattern: name IS "Fire Energy", "Basic Fire Energy", "Volt L Energy", etc.
  // NOT: "Pokémon (Energy Symbol Pattern)", "Energy Retrieval", "Energy Search"
  if (/^(Basic\s+)?\w+\s+Energy$/.test(name) ||
      /^(Fire|Water|Grass|Lightning|Psychic|Fighting|Darkness|Metal|Dragon|Fairy|Colorless)\s+Energy$/.test(name) ||
      /\b(L|R|W|M|D|F|G|P|N|C)\s+Energy$/.test(name)) {
    return "Energy";
  }

  // Pokemon suffix check
  for (const suffix of POKEMON_SUFFIXES) {
    if (name.endsWith(suffix) || name.includes(suffix + " ")) return "Pokémon";
  }

  // "ex" at end (case insensitive) — Pokemon
  if (/ ex$/i.test(name)) return "Pokémon";

  // Check if any trainer keyword is a substantial part of name
  const nameLower = name.toLowerCase();
  for (const kw of TRAINER_KEYWORDS) {
    if (nameLower.includes(kw.toLowerCase()) && kw.length >= 4) {
      // Make sure it's not a Pokemon name that contains a trainer keyword by coincidence
      // e.g. "Malamar" contains "Mar" but shouldn't match "Marnie"
      if (nameLower.includes(kw.toLowerCase())) return "Trainer";
    }
  }

  // Default: Pokémon (most cards in a set are Pokemon)
  return "Pokémon";
}

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const groupId of TARGET_GROUPS) {
    const sets = await prisma.set.findMany({
      where: { setGroupId: groupId },
      select: { id: true },
    });
    const setIds = sets.map(s => s.id);

    const locales = await prisma.cardLocale.findMany({
      where: {
        setId: { in: setIds },
        logicalCard: { supertype: null },
      },
      select: {
        name: true,
        numberInt: true,
        logicalCardId: true,
      },
    });

    if (locales.length === 0) {
      console.log(`  ✓ ${groupId}: 보강 대상 없음`);
      skipped++;
      continue;
    }

    console.log(`\n─── ${groupId} (${locales.length}장) ───`);

    const byType: Record<string, string[]> = { Pokémon: [], Trainer: [], Energy: [] };
    const updates: { id: string; supertype: string }[] = [];

    for (const cl of locales) {
      if (!cl.logicalCardId) continue;
      const st = inferSupertype(cl.name);
      byType[st]?.push(cl.name);
      updates.push({ id: cl.logicalCardId, supertype: st });
    }

    console.log(`  분류: Pokémon=${byType.Pokémon.length}, Trainer=${byType.Trainer.length}, Energy=${byType.Energy.length}`);
    if (byType.Trainer.length > 0) {
      console.log(`  Trainer 샘플: ${byType.Trainer.slice(0, 10).join(", ")}`);
    }
    if (byType.Energy.length > 0) {
      console.log(`  Energy 샘플: ${byType.Energy.slice(0, 5).join(", ")}`);
    }

    for (const u of updates) {
      await prisma.logicalCard.update({
        where: { id: u.id },
        data: { supertype: u.supertype },
      });
      updated++;
    }
    console.log(`  ${updates.length}장 업데이트 완료`);
  }

  console.log(`\n결과: ${updated} 업데이트, ${skipped} 스킵`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
