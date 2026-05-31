/**
 * 작업2: jp-mega-abyss-eye 시크릿레어(numberInt 82-118) 카드의
 * 게임 데이터를 base 카드(numberInt 1-81)에서 복사.
 *
 * 복사 항목: CardLocale.name(JP), LogicalCard.attacks/abilities/weakness/resistance/retreatCost
 * 복사 제외: illustrator (시크릿레어는 다른 일러스트레이터 — 추측 금지)
 *
 * 멱등: 이미 데이터가 있으면 덮어쓰지 않음.
 *
 * 매칭 기준: 동일 세트 내 cleanName(영문명 추정) 일치.
 * secret의 name은 이미 JP명으로 바뀌어 있을 수 있으므로,
 * set list wikitext에서 추출한 영문명 매핑을 사용한다.
 *
 * 실행: npx tsx scripts/fill-abyss-secret-from-base.ts [--dry-run]
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const DRY = process.argv.includes("--dry-run");

// Abyss Eye 세트 목록에서 추출한 번호→영문명 매핑 (base + secret)
// secret(82-118)의 영문명은 base 카드와 동일한 포켓몬/트레이너명
const SET_LIST: Record<number, string> = {
  1: "Tropius", 2: "Grubbin", 3: "Fomantis", 4: "Lurantis ex",
  5: "Poltchageist", 6: "Sinistcha", 7: "Heatran", 8: "Sizzlipede",
  9: "Centiskorch", 10: "Charcadet", 11: "Armarouge", 12: "Goldeen",
  13: "Seaking", 14: "Wailmer", 15: "Wailord ex", 16: "Relicanth",
  17: "Popplio", 18: "Brionne", 19: "Primarina", 20: "Finizen",
  21: "Palafin", 22: "Electrike", 23: "Manectric", 24: "Charjabug",
  25: "Vikavolt", 26: "Mega Zeraora ex", 27: "Miraidon", 28: "Slowpoke",
  29: "Slowbro", 30: "Jynx", 31: "Shuppet", 32: "Banette",
  33: "Spiritomb", 34: "Litwick", 35: "Lampent", 36: "Mega Chandelure ex",
  37: "Dhelmise", 38: "Marshadow", 39: "Annihilape", 40: "Mankey",
  41: "Primeape", 42: "Cranidos", 43: "Rampardos ex", 44: "Drilbur",
  45: "Koraidon", 46: "Mega Darkrai ex", 47: "Vullaby", 48: "Mandibuzz",
  49: "Inkay", 50: "Malamar", 51: "Nickit", 52: "Thievul",
  53: "Morpeko ex", 54: "Zarude", 55: "Maschiff", 56: "Mabosstiff",
  57: "Chi-Yu", 58: "Skarmory", 59: "Shieldon", 60: "Bastiodon",
  61: "Bronzor", 62: "Bronzong", 63: "Mega Excadrill ex", 64: "Pikipek",
  65: "Trumbeak", 66: "Toucannon", 67: "Type: Null", 68: "Silvally",
  69: "Bombirdier", 70: "Dark Bell", 71: "Antique Skull Fossil",
  72: "Antique Armor Fossil", 73: "Terrific Bomb", 74: "Retry Badge",
  75: "Misty's Spirit", 76: "Gladion's Showdown", 77: "Rust Syndicate Grunt",
  78: "Gwynn", 79: "Fossil Excavation Site", 80: "Volt L Energy",
  81: "Shadowy D Energy",
  // Secret (82-118): 영문명은 base와 동일
  82: "Fomantis", 83: "Armarouge", 84: "Goldeen", 85: "Primarina",
  86: "Manectric", 87: "Slowbro", 88: "Dhelmise", 89: "Thievul",
  90: "Zarude", 91: "Bastiodon", 92: "Toucannon", 93: "Silvally",
  94: "Lurantis ex", 95: "Wailord ex", 96: "Mega Zeraora ex",
  97: "Mega Chandelure ex", 98: "Rampardos ex", 99: "Mega Darkrai ex",
  100: "Morpeko ex", 101: "Mega Excadrill ex", 102: "Iron Defender",
  103: "Energy Switch", 104: "Crushing Hammer", 105: "Dark Bell",
  106: "Terrific Bomb", 107: "Brave Bangle", 108: "Misty's Spirit",
  109: "Gladion's Showdown", 110: "Rust Syndicate Grunt", 111: "Gwynn",
  112: "Mega Zeraora ex", 113: "Mega Chandelure ex", 114: "Mega Darkrai ex",
  115: "Morpeko ex", 116: "Gladion's Showdown", 117: "Gwynn",
  118: "Mega Darkrai ex",
};

function cleanName(name: string): string {
  return name.replace(/<[^>]*>/g, "").replace(/\s*-\s*\d+\/\d+\s*$/, "").trim();
}

function hasStructuredAttacks(attacks: any): boolean {
  return Array.isArray(attacks) && attacks.length > 0 && (attacks[0] as any)?.cost !== undefined;
}

async function main() {
  // base 카드 조회
  const baseCards = await prisma.cardLocale.findMany({
    where: { setId: "jp-mega-abyss-eye", numberInt: { gte: 1, lte: 81 } },
    select: {
      id: true, name: true, numberInt: true,
      logicalCard: {
        select: {
          id: true, attacks: true, abilities: true,
          weakness: true, resistance: true, retreatCost: true,
        },
      },
    },
    orderBy: { numberInt: "asc" },
  });

  // base 카드를 영문명→카드 맵으로 인덱싱 (구조화 attacks 보유 우선)
  const baseByName = new Map<string, typeof baseCards[0]>();
  for (const c of baseCards) {
    const num = c.numberInt!;
    const enName = SET_LIST[num] ?? cleanName(c.name);
    // 구조화 attacks 있는 카드를 우선 등록
    const existing = baseByName.get(enName);
    if (!existing || hasStructuredAttacks(c.logicalCard.attacks)) {
      baseByName.set(enName, c);
    }
  }

  // secret 카드 조회
  const secretCards = await prisma.cardLocale.findMany({
    where: { setId: "jp-mega-abyss-eye", numberInt: { gte: 82, lte: 118 } },
    select: {
      id: true, name: true, numberInt: true,
      logicalCard: {
        select: {
          id: true, attacks: true, abilities: true,
          weakness: true, resistance: true, retreatCost: true,
        },
      },
    },
    orderBy: { numberInt: "asc" },
  });

  console.log(`[init] secret 카드: ${secretCards.length}장, dry=${DRY}`);

  let copied = 0, jnameF = 0, atkF = 0, abiF = 0;
  const skipped: string[] = [];
  const noBase: string[] = [];

  for (const s of secretCards) {
    const num = s.numberInt!;
    const enName = SET_LIST[num];
    if (!enName) {
      noBase.push(`#${num} ${s.name} (SET_LIST 없음)`);
      continue;
    }

    const base = baseByName.get(enName);
    if (!base) {
      noBase.push(`#${num} ${s.name} → "${enName}" base 없음`);
      continue;
    }

    // base가 구조화 attacks도 없으면 건너뜀
    const baseAtk = base.logicalCard.attacks;
    const baseAbi = base.logicalCard.abilities;
    const baseHasData = hasStructuredAttacks(baseAtk) || Array.isArray(baseAbi) && (baseAbi as any[]).length > 0
      || base.logicalCard.weakness || base.logicalCard.retreatCost != null;

    // 트레이너/에너지(attacks 없음)는 base 데이터가 없어도 jname 복사는 가능
    // base CardLocale.name = JP명 (이미 채워져 있어야 함)
    const baseLocale = baseCards.find(c => c.numberInt === base.numberInt);
    const baseJname = baseLocale?.name ?? null;

    const lcData: any = {};
    const clData: any = {};

    // CardLocale.name ← base JP명 (비어있을 때만)
    if (baseJname && !s.name.match(/[぀-ヿ一-鿿]/)) {
      // secret name이 아직 영문인 경우 JP명 복사
      clData.name = baseJname;
      jnameF++;
    }

    // attacks
    if (hasStructuredAttacks(baseAtk) && !hasStructuredAttacks(s.logicalCard.attacks)) {
      lcData.attacks = baseAtk;
      atkF++;
    }
    // abilities
    if (Array.isArray(baseAbi) && (baseAbi as any[]).length > 0 &&
        (!Array.isArray(s.logicalCard.abilities) || (s.logicalCard.abilities as any[]).length === 0)) {
      lcData.abilities = baseAbi;
      abiF++;
    }
    // weakness/resistance/retreatCost
    if (base.logicalCard.weakness && !s.logicalCard.weakness) lcData.weakness = base.logicalCard.weakness;
    if (base.logicalCard.resistance && !s.logicalCard.resistance) lcData.resistance = base.logicalCard.resistance;
    if (base.logicalCard.retreatCost != null && s.logicalCard.retreatCost == null) lcData.retreatCost = base.logicalCard.retreatCost;

    if (Object.keys(lcData).length === 0 && Object.keys(clData).length === 0) {
      skipped.push(`#${num} ${s.name} (변경없음)`);
      continue;
    }

    copied++;
    const baseNum = base.numberInt;
    console.log(`  ✓ #${num} ${enName} ← base#${baseNum} jname=${baseJname ?? "-"} atk=${hasStructuredAttacks(baseAtk)} abi=${Array.isArray(baseAbi) && (baseAbi as any[]).length > 0}`);
    if (DRY) continue;

    if (Object.keys(lcData).length) await prisma.logicalCard.update({ where: { id: s.logicalCard.id }, data: lcData });
    if (Object.keys(clData).length) await prisma.cardLocale.update({ where: { id: s.id }, data: clData });
  }

  console.log("\n=== ABYSS EYE SECRET COPY SUMMARY ===");
  console.log({ secretTotal: secretCards.length, copied, jnameF, atkF, abiF, skipped: skipped.length, noBase: noBase.length });
  if (noBase.length) console.log("base 없음:", noBase);
  if (skipped.length) console.log("변경없음(이미채움):", skipped);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
