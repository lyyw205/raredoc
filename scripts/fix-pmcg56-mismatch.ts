/**
 * PMCG5/6 이미지 mismatch 수정 (최종 확정 버전)
 *
 * 진단 결과 (Python 분석으로 확인):
 *   PMCG5: 53개 포켓몬 카드 + 30개 트레이너/스타디움 카드 mismatch
 *   PMCG6: 62개 포켓몬 카드 + 22개 트레이너/스타디움 카드 mismatch
 *
 *   mismatch 테이블은 hardcode (tcgdex dexId + Bulbapedia JP 섹션 순서 분석).
 *
 * 수정:
 *   1. wrongCard 이미지 → correctCard Supabase Storage 복사
 *   2. DB CardLocale imageSmall/imageLarge 업데이트
 *   3. ExternalIdMapping cardLocaleId 업데이트
 *   4. wrongCard LogicalCard illustrator null
 *   5. wrongCard 원본 이미지 삭제
 *
 * 사용: npx tsx scripts/fix-pmcg56-mismatch.ts [--set=PMCG5|PMCG6] [--dry-run]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";

const execFileP = promisify(execFile);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "card-images";
const DRY_RUN = process.argv.includes("--dry-run");
const SET_FILTER = process.argv.find((a) => a.startsWith("--set="))?.slice(6).toUpperCase();

// ── Hardcoded mismatch tables ─────────────────────────────────────────────────
// Format: [wrongCardId, correctCardId, enSlug]
// wrongCardId = what the scraper put the image into
// correctCardId = where the image actually belongs (based on tcgdex JP ordering)

const PMCG6_MISMATCHES: [string, string, string][] = [
  ["jp-tcg-PMCG6-008", "jp-tcg-PMCG6-009", "Koga's Tangela"],
  ["jp-tcg-PMCG6-009", "jp-tcg-PMCG6-010", "Erika's Ivysaur"],
  ["jp-tcg-PMCG6-010", "jp-tcg-PMCG6-011", "Koga's Kakuna"],
  ["jp-tcg-PMCG6-011", "jp-tcg-PMCG6-012", "Giovanni's Nidorina"],
  ["jp-tcg-PMCG6-012", "jp-tcg-PMCG6-013", "Giovanni's Nidorino"],
  ["jp-tcg-PMCG6-013", "jp-tcg-PMCG6-014", "Koga's Golbat"],
  ["jp-tcg-PMCG6-014", "jp-tcg-PMCG6-016", "Koga's Weezing"],
  ["jp-tcg-PMCG6-015", "jp-tcg-PMCG6-017", "Erika's Venusaur"],
  ["jp-tcg-PMCG6-016", "jp-tcg-PMCG6-018", "Koga's Beedrill"],
  ["jp-tcg-PMCG6-017", "jp-tcg-PMCG6-019", "Koga's Arbok"],
  ["jp-tcg-PMCG6-018", "jp-tcg-PMCG6-020", "Giovanni's Nidoqueen"],
  ["jp-tcg-PMCG6-019", "jp-tcg-PMCG6-021", "Giovanni's Nidoking"],
  ["jp-tcg-PMCG6-020", "jp-tcg-PMCG6-022", "Sabrina's Venomoth"],
  ["jp-tcg-PMCG6-021", "jp-tcg-PMCG6-023", "Koga's Muk"],
  ["jp-tcg-PMCG6-022", "jp-tcg-PMCG6-024", "Giovanni's Pinsir"],
  ["jp-tcg-PMCG6-023", "jp-tcg-PMCG6-025", "Blaine's Charmander"],
  ["jp-tcg-PMCG6-024", "jp-tcg-PMCG6-026", "Blaine's Vulpix"],
  ["jp-tcg-PMCG6-025", "jp-tcg-PMCG6-027", "Blaine's Growlithe"],
  ["jp-tcg-PMCG6-026", "jp-tcg-PMCG6-028", "Blaine's Ponyta"],
  ["jp-tcg-PMCG6-027", "jp-tcg-PMCG6-029", "Blaine's Charmeleon"],
  ["jp-tcg-PMCG6-028", "jp-tcg-PMCG6-030", "Blaine's Rapidash"],
  ["jp-tcg-PMCG6-029", "jp-tcg-PMCG6-031", "Blaine's Magmar"],
  ["jp-tcg-PMCG6-030", "jp-tcg-PMCG6-032", "Blaine's Charizard"],
  ["jp-tcg-PMCG6-031", "jp-tcg-PMCG6-033", "Blaine's Ninetales"],
  ["jp-tcg-PMCG6-032", "jp-tcg-PMCG6-034", "Blaine's Arcanine"],
  ["jp-tcg-PMCG6-033", "jp-tcg-PMCG6-035", "Blaine's Moltres"],
  ["jp-tcg-PMCG6-034", "jp-tcg-PMCG6-036", "Sabrina's Psyduck"],
  ["jp-tcg-PMCG6-035", "jp-tcg-PMCG6-037", "Giovanni's Magikarp"],
  ["jp-tcg-PMCG6-036", "jp-tcg-PMCG6-038", "Sabrina's Golduck"],
  ["jp-tcg-PMCG6-037", "jp-tcg-PMCG6-039", "Misty's Poliwrath"],
  ["jp-tcg-PMCG6-038", "jp-tcg-PMCG6-040", "Giovanni's Gyarados"],
  ["jp-tcg-PMCG6-039", "jp-tcg-PMCG6-041", "Lt. Surge's Raichu"],
  ["jp-tcg-PMCG6-040", "jp-tcg-PMCG6-042", "Rocket's Zapdos"],
  ["jp-tcg-PMCG6-041", "jp-tcg-PMCG6-043", "Sabrina's Abra"],
  ["jp-tcg-PMCG6-042", "jp-tcg-PMCG6-044", "Sabrina's Slowpoke"],
  ["jp-tcg-PMCG6-043", "jp-tcg-PMCG6-045", "Sabrina's Drowzee"],
  ["jp-tcg-PMCG6-044", "jp-tcg-PMCG6-046", "Sabrina's Mr. Mime"],
  ["jp-tcg-PMCG6-045", "jp-tcg-PMCG6-047", "Sabrina's Kadabra"],
  ["jp-tcg-PMCG6-046", "jp-tcg-PMCG6-048", "Sabrina's Slowbro"],
  ["jp-tcg-PMCG6-047", "jp-tcg-PMCG6-049", "Sabrina's Gastly"],
  ["jp-tcg-PMCG6-048", "jp-tcg-PMCG6-050", "Sabrina's Haunter"],
  ["jp-tcg-PMCG6-049", "jp-tcg-PMCG6-051", "Sabrina's Hypno"],
  ["jp-tcg-PMCG6-050", "jp-tcg-PMCG6-052", "Sabrina's Jynx"],
  ["jp-tcg-PMCG6-051", "jp-tcg-PMCG6-053", "Sabrina's Alakazam"],
  ["jp-tcg-PMCG6-052", "jp-tcg-PMCG6-054", "Sabrina's Gengar"],
  ["jp-tcg-PMCG6-053", "jp-tcg-PMCG6-055", "Rocket's Mewtwo"],
  ["jp-tcg-PMCG6-054", "jp-tcg-PMCG6-056", "Blaine's Mankey"],
  ["jp-tcg-PMCG6-055", "jp-tcg-PMCG6-057", "Giovanni's Machop"],
  ["jp-tcg-PMCG6-056", "jp-tcg-PMCG6-058", "Blaine's Rhyhorn"],
  ["jp-tcg-PMCG6-057", "jp-tcg-PMCG6-059", "Giovanni's Machoke"],
  ["jp-tcg-PMCG6-058", "jp-tcg-PMCG6-060", "Brock's Dugtrio"],
  ["jp-tcg-PMCG6-059", "jp-tcg-PMCG6-061", "Giovanni's Machamp"],
  ["jp-tcg-PMCG6-060", "jp-tcg-PMCG6-064", "Blaine's Doduo"],
  ["jp-tcg-PMCG6-061", "jp-tcg-PMCG6-065", "Blaine's Tauros"],
  ["jp-tcg-PMCG6-062", "jp-tcg-PMCG6-066", "Sabrina's Porygon"],
  ["jp-tcg-PMCG6-063", "jp-tcg-PMCG6-069", "Blaine's Kangaskhan"],
  ["jp-tcg-PMCG6-064", "jp-tcg-PMCG6-070", "Koga's Pidgeotto"],
  ["jp-tcg-PMCG6-065", "jp-tcg-PMCG6-071", "Giovanni's Persian"],
  ["jp-tcg-PMCG6-066", "jp-tcg-PMCG6-072", "Koga's Ditto"],
  ["jp-tcg-PMCG6-067", "jp-tcg-PMCG6-073", "Rocket's Snorlax"],
  ["jp-tcg-PMCG6-068", "jp-tcg-PMCG6-074", "Imakuni?'s Doduo"],
  ["jp-tcg-PMCG6-069", "jp-tcg-PMCG6-075", "'s Chansey"],
  // Trainer/stadium cards: rows 70-92 → slots 076-098 (verified sequentially)
  ["jp-tcg-PMCG6-070", "jp-tcg-PMCG6-076", "Blaine's Gamble"],
  ["jp-tcg-PMCG6-071", "jp-tcg-PMCG6-077", "Trash Exchange"],
  ["jp-tcg-PMCG6-072", "jp-tcg-PMCG6-078", "Sabrina's Gaze"],
  ["jp-tcg-PMCG6-073", "jp-tcg-PMCG6-079", "Transparent Walls"],
  ["jp-tcg-PMCG6-074", "jp-tcg-PMCG6-080", "Warp Point"],
  ["jp-tcg-PMCG6-075", "jp-tcg-PMCG6-081", "Blaine's Last Resort"],
  ["jp-tcg-PMCG6-076", "jp-tcg-PMCG6-082", "Blaine's Quiz 3"],
  ["jp-tcg-PMCG6-077", "jp-tcg-PMCG6-083", "Koga's Ninja Trick"],
  ["jp-tcg-PMCG6-078", "jp-tcg-PMCG6-084", "Tickling Machine"],
  ["jp-tcg-PMCG6-079", "jp-tcg-PMCG6-085", "Cinnabar City Gym"],
  ["jp-tcg-PMCG6-080", "jp-tcg-PMCG6-086", "Fuchsia City Gym"],
  ["jp-tcg-PMCG6-081", "jp-tcg-PMCG6-087", "Sabrina's ESP"],
  ["jp-tcg-PMCG6-082", "jp-tcg-PMCG6-088", "Sabrina's Psychic Control"],
  ["jp-tcg-PMCG6-083", "jp-tcg-PMCG6-089", "Minion of Team Rocket"],
  ["jp-tcg-PMCG6-084", "jp-tcg-PMCG6-090", "Saffron City Gym"],
  ["jp-tcg-PMCG6-085", "jp-tcg-PMCG6-091", "Rocket's Secret Experiment"],
  ["jp-tcg-PMCG6-086", "jp-tcg-PMCG6-092", "Rocket's Minefield Gym"],
  ["jp-tcg-PMCG6-087", "jp-tcg-PMCG6-093", "Blaine"],
  ["jp-tcg-PMCG6-088", "jp-tcg-PMCG6-094", "Koga"],
  ["jp-tcg-PMCG6-089", "jp-tcg-PMCG6-095", "Giovanni"],
  ["jp-tcg-PMCG6-090", "jp-tcg-PMCG6-096", "Giovanni's Last Resort"],
  ["jp-tcg-PMCG6-091", "jp-tcg-PMCG6-097", "Viridian City Gym"],
  ["jp-tcg-PMCG6-092", "jp-tcg-PMCG6-098", "Sabrina"],
];

const PMCG5_MISMATCHES: [string, string, string][] = [
  ["jp-tcg-PMCG5-002", "jp-tcg-PMCG5-004", "Erika's Paras"],
  ["jp-tcg-PMCG5-003", "jp-tcg-PMCG5-006", "Erika's Tangela"],
  ["jp-tcg-PMCG5-004", "jp-tcg-PMCG5-007", "Erika's Bulbasaur"],
  ["jp-tcg-PMCG5-005", "jp-tcg-PMCG5-008", "Brock's Golbat"],
  ["jp-tcg-PMCG5-006", "jp-tcg-PMCG5-009", "Erika's Gloom"],
  ["jp-tcg-PMCG5-007", "jp-tcg-PMCG5-011", "Erika's Weepinbell"],
  ["jp-tcg-PMCG5-008", "jp-tcg-PMCG5-012", "Erika's Exeggcute"],
  ["jp-tcg-PMCG5-009", "jp-tcg-PMCG5-013", "Erika's Exeggutor"],
  ["jp-tcg-PMCG5-010", "jp-tcg-PMCG5-014", "Erika's Vileplume"],
  ["jp-tcg-PMCG5-011", "jp-tcg-PMCG5-015", "Erika's Victreebel"],
  ["jp-tcg-PMCG5-012", "jp-tcg-PMCG5-016", "Rocket's Scyther"],
  ["jp-tcg-PMCG5-013", "jp-tcg-PMCG5-019", "Brock's Ninetales"],
  ["jp-tcg-PMCG5-014", "jp-tcg-PMCG5-020", "Rocket's Moltres"],
  ["jp-tcg-PMCG5-015", "jp-tcg-PMCG5-021", "Misty's Psyduck"],
  ["jp-tcg-PMCG5-016", "jp-tcg-PMCG5-022", "Misty's Poliwag"],
  ["jp-tcg-PMCG5-017", "jp-tcg-PMCG5-023", "Misty's Seel"],
  ["jp-tcg-PMCG5-018", "jp-tcg-PMCG5-026", "Misty's Goldeen"],
  ["jp-tcg-PMCG5-019", "jp-tcg-PMCG5-027", "Misty's Staryu"],
  ["jp-tcg-PMCG5-020", "jp-tcg-PMCG5-028", "Misty's Magikarp"],
  ["jp-tcg-PMCG5-021", "jp-tcg-PMCG5-029", "Misty's Poliwhirl"],
  ["jp-tcg-PMCG5-022", "jp-tcg-PMCG5-030", "Misty's Tentacool"],
  ["jp-tcg-PMCG5-023", "jp-tcg-PMCG5-031", "Misty's Dewgong"],
  ["jp-tcg-PMCG5-024", "jp-tcg-PMCG5-032", "Misty's Golduck"],
  ["jp-tcg-PMCG5-025", "jp-tcg-PMCG5-033", "Misty's Tentacruel"],
  ["jp-tcg-PMCG5-026", "jp-tcg-PMCG5-034", "Misty's Seadra"],
  ["jp-tcg-PMCG5-027", "jp-tcg-PMCG5-035", "Misty's Gyarados"],
  ["jp-tcg-PMCG5-028", "jp-tcg-PMCG5-036", "Lt. Surge's Pikachu"],
  ["jp-tcg-PMCG5-029", "jp-tcg-PMCG5-038", "Lt. Surge's Voltorb"],
  ["jp-tcg-PMCG5-030", "jp-tcg-PMCG5-040", "Lt. Surge's Magneton"],
  ["jp-tcg-PMCG5-031", "jp-tcg-PMCG5-041", "Lt. Surge's Electabuzz"],
  ["jp-tcg-PMCG5-032", "jp-tcg-PMCG5-042", "Lt. Surge's Jolteon"],
  ["jp-tcg-PMCG5-033", "jp-tcg-PMCG5-043", "Brock's Sandshrew"],
  ["jp-tcg-PMCG5-034", "jp-tcg-PMCG5-044", "Brock's Diglett"],
  ["jp-tcg-PMCG5-035", "jp-tcg-PMCG5-045", "Brock's Mankey"],
  ["jp-tcg-PMCG5-036", "jp-tcg-PMCG5-048", "Brock's Onix"],
  ["jp-tcg-PMCG5-037", "jp-tcg-PMCG5-049", "Brock's Rhyhorn"],
  ["jp-tcg-PMCG5-038", "jp-tcg-PMCG5-050", "Brock's Sandslash"],
  ["jp-tcg-PMCG5-039", "jp-tcg-PMCG5-051", "Brock's Primeape"],
  ["jp-tcg-PMCG5-040", "jp-tcg-PMCG5-052", "Brock's Graveler"],
  ["jp-tcg-PMCG5-041", "jp-tcg-PMCG5-053", "Brock's Golem"],
  ["jp-tcg-PMCG5-042", "jp-tcg-PMCG5-054", "Rocket's Hitmonchan"],
  ["jp-tcg-PMCG5-043", "jp-tcg-PMCG5-055", "Brock's Rhydon"],
  ["jp-tcg-PMCG5-044", "jp-tcg-PMCG5-056", "Lt. Surge's Rattata"],
  ["jp-tcg-PMCG5-045", "jp-tcg-PMCG5-057", "Lt. Surge's Spearow"],
  ["jp-tcg-PMCG5-046", "jp-tcg-PMCG5-058", "Erika's Jigglypuff"],
  ["jp-tcg-PMCG5-047", "jp-tcg-PMCG5-059", "Lt. Surge's Raticate"],
  ["jp-tcg-PMCG5-048", "jp-tcg-PMCG5-060", "Erika's Clefairy"],
  ["jp-tcg-PMCG5-049", "jp-tcg-PMCG5-061", "Brock's Lickitung"],
  ["jp-tcg-PMCG5-050", "jp-tcg-PMCG5-062", "Lt. Surge's Eevee"],
  ["jp-tcg-PMCG5-051", "jp-tcg-PMCG5-063", "Erika's Dratini"],
  ["jp-tcg-PMCG5-052", "jp-tcg-PMCG5-064", "Lt. Surge's Fearow"],
  ["jp-tcg-PMCG5-053", "jp-tcg-PMCG5-065", "Erika's Clefable"],
  ["jp-tcg-PMCG5-054", "jp-tcg-PMCG5-066", "Erika's Dragonair"],
  // Trainer/stadium cards: rows 55-84 → slots 067-096 (offset +12, verified sequentially)
  ["jp-tcg-PMCG5-055", "jp-tcg-PMCG5-067", "Energy Flow"],
  ["jp-tcg-PMCG5-056", "jp-tcg-PMCG5-068", "Misty's Duel"],
  ["jp-tcg-PMCG5-057", "jp-tcg-PMCG5-069", "Misty's Tears"],
  ["jp-tcg-PMCG5-058", "jp-tcg-PMCG5-070", "Narrow Gym"],
  ["jp-tcg-PMCG5-059", "jp-tcg-PMCG5-071", "Recall"],
  ["jp-tcg-PMCG5-060", "jp-tcg-PMCG5-072", "Erika's Maids"],
  ["jp-tcg-PMCG5-061", "jp-tcg-PMCG5-073", "Erika's Perfume"],
  ["jp-tcg-PMCG5-062", "jp-tcg-PMCG5-074", "Charity"],
  ["jp-tcg-PMCG5-063", "jp-tcg-PMCG5-075", "Misty's Wrath"],
  ["jp-tcg-PMCG5-064", "jp-tcg-PMCG5-076", "Vermilion City Gym"],
  ["jp-tcg-PMCG5-065", "jp-tcg-PMCG5-077", "Brock's Training Method"],
  ["jp-tcg-PMCG5-066", "jp-tcg-PMCG5-078", "Celadon City Gym"],
  ["jp-tcg-PMCG5-067", "jp-tcg-PMCG5-079", "Pewter City Gym"],
  ["jp-tcg-PMCG5-068", "jp-tcg-PMCG5-080", "Cerulean City Gym"],
  ["jp-tcg-PMCG5-069", "jp-tcg-PMCG5-081", "Lt. Surge's Treaty"],
  ["jp-tcg-PMCG5-070", "jp-tcg-PMCG5-082", "Good Manners"],
  ["jp-tcg-PMCG5-071", "jp-tcg-PMCG5-083", "Erika"],
  ["jp-tcg-PMCG5-072", "jp-tcg-PMCG5-084", "Erika's Kindness"],
  ["jp-tcg-PMCG5-073", "jp-tcg-PMCG5-085", "Misty"],
  ["jp-tcg-PMCG5-074", "jp-tcg-PMCG5-086", "Misty's Wish"],
  ["jp-tcg-PMCG5-075", "jp-tcg-PMCG5-087", "Chaos Gym"],
  ["jp-tcg-PMCG5-076", "jp-tcg-PMCG5-088", "Secret Mission"],
  ["jp-tcg-PMCG5-077", "jp-tcg-PMCG5-089", "Brock"],
  ["jp-tcg-PMCG5-078", "jp-tcg-PMCG5-090", "Brock's Protection"],
  ["jp-tcg-PMCG5-079", "jp-tcg-PMCG5-091", "Resistance Gym"],
  ["jp-tcg-PMCG5-080", "jp-tcg-PMCG5-092", "Lt. Surge"],
  ["jp-tcg-PMCG5-081", "jp-tcg-PMCG5-093", "Lt. Surge's Secret Plan"],
  ["jp-tcg-PMCG5-082", "jp-tcg-PMCG5-094", "No Removal Gym"],
  ["jp-tcg-PMCG5-083", "jp-tcg-PMCG5-095", "The Rocket's Training Gym"],
  ["jp-tcg-PMCG5-084", "jp-tcg-PMCG5-096", "The Rocket's Trap"],
];

const ALL_MISMATCHES: Record<string, [string, string, string][]> = {
  PMCG5: PMCG5_MISMATCHES,
  PMCG6: PMCG6_MISMATCHES,
};

// ── Supabase helpers ──────────────────────────────────────────────────────────
function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

/** Download a card image to a local temp file. Returns path or null. */
async function storageDownload(cardId: string, tmpPath: string): Promise<boolean> {
  try {
    const { stderr } = await execFileP("curl", [
      "-sSL", "--max-time", "60", "--fail",
      "-H", `Authorization: Bearer ${SUPABASE_KEY}`,
      "-o", tmpPath,
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${cardId}.jpg`,
    ]);
    // Check file actually has content
    const { stdout } = await execFileP("wc", ["-c", tmpPath]);
    const size = parseInt(stdout.trim().split(" ")[0]);
    return size > 100; // must be more than 100 bytes
  } catch { return false; }
}

/** Upload a local file to Supabase Storage at cardId.jpg */
async function storageUpload(tmpPath: string, cardId: string): Promise<boolean> {
  try {
    await execFileP("curl", [
      "-sSL", "--max-time", "60", "--fail",
      "-X", "POST",
      "-H", `Authorization: Bearer ${SUPABASE_KEY}`,
      "-H", "Content-Type: image/jpeg",
      "-H", "x-upsert: true",
      "--data-binary", `@${tmpPath}`,
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${cardId}.jpg`,
    ]);
    return true;
  } catch (e) {
    console.error(`  upload error ${cardId}: ${(e as Error).message}`);
    return false;
  }
}

async function storageDelete(cardId: string): Promise<boolean> {
  try {
    await execFileP("curl", ["-sSL", "--max-time", "30", "-X", "DELETE",
      "-H", `Authorization: Bearer ${SUPABASE_KEY}`,
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${cardId}.jpg`]);
    return true;
  } catch { return false; }
}

function pubUrl(id: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${id}.jpg`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (DRY_RUN) console.log("*** DRY-RUN 모드 — DB/Storage 변경 없음 ***\n");

  const src = await prisma.externalSource.findUniqueOrThrow({ where: { code: "bulbapedia" } });
  const setsToProcess = SET_FILTER
    ? Object.entries(ALL_MISMATCHES).filter(([k]) => k === SET_FILTER)
    : Object.entries(ALL_MISMATCHES);

  if (!setsToProcess.length) {
    console.error(`Unknown set: ${SET_FILTER}`);
    process.exit(1);
  }

  const reportLines: string[] = [
    "# PMCG5/6 이미지 mismatch 수정 결과",
    "",
    `실행: ${new Date().toISOString()}${DRY_RUN ? " (DRY-RUN)" : ""}`,
    "",
  ];

  let totFixed = 0, totMoved = 0, totFailed = 0, totStillMissing = 0;

  for (const [setId, mismatches] of setsToProcess) {
    console.log(`\n${"═".repeat(55)}`);
    console.log(`${setId}: ${mismatches.length}개 mismatch 처리 중`);

    // Load DB state ONCE (snapshot before any changes)
    const dbCards = await prisma.cardLocale.findMany({
      where: { id: { startsWith: `jp-tcg-${setId}-` } },
      select: { id: true, name: true, imageSmall: true, logicalCardId: true },
    });
    const dbById = new Map(dbCards.map((c) => [c.id, c]));

    const maps = await prisma.externalIdMapping.findMany({
      where: { sourceId: src.id, cardLocaleId: { startsWith: `jp-tcg-${setId}-` } },
      select: { id: true, cardLocaleId: true, externalId: true, logicalCardId: true },
    });
    const mapByCardId = new Map(maps.map((m) => [m.cardLocaleId!, m]));

    let fixed = 0, moved = 0, failed = 0;

    // Cards whose wrongId.jpg was already deleted in a prior run but correctId.jpg exists.
    // We know this if wrongId.jpg download fails AND the mismatch has no tmpPath.
    // Populate after Phase A by checking which wrongIds had no file but correctId may exist.
    // Simple heuristic: correctIds that appear in the mismatch table where wrongId has no Supabase file.
    // We'll build this after Phase A download.
    const priorMovedCorrectIds = new Set<string>();

    if (DRY_RUN) {
      for (const [wrongId, correctId, enSlug] of mismatches) {
        const hasSrc = !!dbById.get(wrongId)?.imageSmall;
        console.log(`  [DRY] ${wrongId}→${correctId} "${enSlug}" srcImg=${hasSrc}`);
        fixed++;
      }
    } else {
      // ── Phase A: Download all wrongCard images to temp files ──────────────
      // NOTE: Check Supabase directly (DB imageSmall may already be null from prior run)
      console.log(`\n  Phase A: ${setId} 이미지 다운로드 중...`);
      const tmpMap = new Map<string, string>(); // wrongId → tmpPath
      for (const [wrongId, , enSlug] of mismatches) {
        const tmpPath = `/tmp/pmcg-fix-${wrongId.replace(/[^a-z0-9]/gi, "_")}.jpg`;
        const ok = await storageDownload(wrongId, tmpPath);
        if (ok) {
          tmpMap.set(wrongId, tmpPath);
          process.stdout.write(".");
        } else {
          // wrongId.jpg may have already been deleted in a prior run — that's OK
        }
      }
      console.log(`\n  다운로드 완료: ${tmpMap.size}/${mismatches.length}`);

      // For mismatches where wrongId had no file, assume correctId.jpg was already
      // created in a prior run and just needs its DB URL set.
      for (const [wrongId, correctId] of mismatches) {
        if (!tmpMap.has(wrongId)) {
          priorMovedCorrectIds.add(correctId);
        }
      }

      // ── Phase B: Upload to correct locations + DB updates ─────────────────
      console.log(`\n  Phase B: ${setId} 업로드 + DB 수정 중...`);
      // Build set of all correctIds — wrongIds that are also correctIds must NOT be nulled
      // (they will get their image set by their own mismatch entry)
      const allCorrectIds = new Set(mismatches.map(([, correctId]) => correctId));

      for (const [wrongId, correctId, enSlug] of mismatches) {
        const wrongCard = dbById.get(wrongId);
        const correctCard = dbById.get(correctId);

        if (!correctCard) {
          console.log(`  SKIP [${wrongId}→${correctId}] correctCard 없음`);
          failed++; continue;
        }

        const tmpPath = tmpMap.get(wrongId);
        // correctIdHasFile: true if wrongId.jpg was already moved to correctId.jpg
        // in a prior run (wrongId was deleted, correctId was created)
        const correctIdHasFile = priorMovedCorrectIds.has(correctId);

        // 1. Upload to correctId location (if we have a temp file from Phase A)
        if (tmpPath) {
          const ok = await storageUpload(tmpPath, correctId);
          if (ok) {
            moved++;
          } else {
            console.log(`  ✗ 업로드 실패: ${correctId}.jpg (${enSlug})`);
          }
        }

        // 2. Set correctCard image URL if we have or just created the file
        if (tmpPath || correctIdHasFile) {
          await prisma.cardLocale.update({
            where: { id: correctId },
            data: { imageSmall: pubUrl(correctId), imageLarge: pubUrl(correctId) },
          });
        } else {
          console.log(`  ⚠ ${correctId}.jpg 없음 — 이미지 URL 미설정 (${enSlug})`);
        }

        // 3. Null wrongCard image — only if wrongId is NOT also a correctId in another mismatch
        // (if it is, its image will be set by that other mismatch entry)
        if (!allCorrectIds.has(wrongId)) {
          await prisma.cardLocale.update({
            where: { id: wrongId },
            data: { imageSmall: null, imageLarge: null },
          });
        }

        // 3. Update ExternalIdMapping: wrongId → correctId
        const mapping = mapByCardId.get(wrongId);
        if (mapping) {
          await prisma.externalIdMapping.update({
            where: { id: mapping.id },
            data: { cardLocaleId: correctId, logicalCardId: correctCard.logicalCardId },
          });
        }

        // 4. Clear wrongCard LogicalCard illustrator
        if (wrongCard?.logicalCardId) {
          await prisma.logicalCard
            .update({ where: { id: wrongCard.logicalCardId }, data: { illustrator: null } })
            .catch(() => {});
        }

        // 5. Delete wrong-location file in Supabase
        if (tmpPath) {
          await storageDelete(wrongId);
        }

        fixed++;
      }

      // ── Phase C: Cleanup temp files ────────────────────────────────────────
      for (const tmp of tmpMap.values()) {
        await execFileP("rm", ["-f", tmp]).catch(() => {});
      }
    }

    const finalTotal = await prisma.cardLocale.count({
      where: { id: { startsWith: `jp-tcg-${setId}-` } },
    });
    const finalWithImg = await prisma.cardLocale.count({
      where: { id: { startsWith: `jp-tcg-${setId}-` }, imageSmall: { not: null } },
    });
    const stillMissing = finalTotal - finalWithImg;
    totStillMissing += stillMissing;
    totFixed += fixed; totMoved += moved; totFailed += failed;

    console.log(`\n${setId} 결과: 수정=${fixed}, 이미지이동=${moved}, 실패=${failed}`);
    console.log(`${setId} 이미지: ${finalWithImg}/${finalTotal} (없음: ${stillMissing})`);

    reportLines.push(`## ${setId}`, ``,
      `| 항목 | 수 |`, `| --- | --- |`,
      `| 총 mismatch | ${mismatches.length} |`,
      `| 수정 완료 | ${fixed} |`,
      `| 이미지 이동 | ${moved} |`,
      `| 실패 | ${failed} |`,
      `| 이미지 없음 (수정 후) | ${stillMissing}/${finalTotal} |`,
      ``);
  }

  const reportPath = "/home/lyyw205/repos/raredoc/docs/pmcg56-mismatch-v2.md";
  await mkdir("/home/lyyw205/repos/raredoc/docs", { recursive: true });
  await writeFile(reportPath, reportLines.join("\n") + "\n");

  console.log(`\n${"═".repeat(55)}`);
  console.log("최종 요약");
  console.log(`  수정: ${totFixed}, 이미지 이동: ${totMoved}, 실패: ${totFailed}`);
  console.log(`  이미지 없음 (수정 후): ${totStillMissing}장`);
  console.log(`  보고서: ${reportPath}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
