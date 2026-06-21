/**
 * en-tcg-mep 게임메타 보강 Phase 2
 *
 * 대상: #046–063(스타터18), #072,073,082,083,084,085,092,093 + #500 신규생성
 * 채울 필드: hp, attacks, abilities, weakness, resistance, retreatCost, illustrator, regulationMark
 * 출처: Bulbapedia MediaWiki API (2026-06-21)
 * 신규: #500 Pikachu at the Museum (LogicalCard + RegionCard)
 *
 * dry-run: npx tsx scripts/fill-mep-meta-phase2.ts
 * 적용:    npx tsx scripts/fill-mep-meta-phase2.ts --apply
 * R2 skip: npx tsx scripts/fill-mep-meta-phase2.ts --apply --skip-r2
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  r2KeyFor,
  headExists,
  uploadBuffer,
  r2PublicUrl,
  extFromUrl,
  contentTypeFor,
} from "../src/lib/r2";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SKIP_R2 = process.argv.includes("--skip-r2");
const SET_ID = "en-tcg-mep";
const RARITY_ID = "cmpp4wyvw001hyjurzznnvic7"; // Promo
const REG_MARK = "J"; // 모든 MEP 카드 공통 Regulation Mark J

// ── 헬퍼 ──────────────────────────────────────────────────────────────────
function toInt(n: string): number {
  return parseInt(n.replace(/\D/g, ""), 10) || 0;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function curlBuffer(url: string): Promise<Buffer> {
  const { stdout } = await execFileP(
    "curl",
    ["-sSL", "--max-time", "30", "-A", "Mozilla/5.0", url],
    { maxBuffer: 10 * 1024 * 1024, encoding: "buffer" } as any,
  );
  return stdout as unknown as Buffer;
}

async function uploadSmallToR2(
  number: string,
  lgUrl: string,
): Promise<string | null> {
  const ext = extFromUrl(lgUrl) || "webp";
  const key = r2KeyFor(SET_ID, "en", "small", SET_ID, number, ext);
  try {
    const exists = await headExists(key);
    if (exists) {
      console.log(`    R2 already exists: ${key}`);
      return r2PublicUrl(key);
    }
    const buf = await curlBuffer(lgUrl);
    if (buf.length < 1000) {
      console.warn(`    WARN 이미지 다운로드 실패 (size=${buf.length})`);
      return null;
    }
    const ct = contentTypeFor(ext);
    await uploadBuffer(key, buf, ct);
    console.log(`    R2 upload OK: ${key} (${buf.length} bytes)`);
    return r2PublicUrl(key);
  } catch (e: any) {
    console.warn(`    WARN R2 업로드 실패: ${e?.message}`);
    return null;
  }
}

// ── 카드 데이터 (Bulbapedia API 2026-06-21) ───────────────────────────────

// weakness/resistance 표현: "${type}×2" / "${type}-30"
// attacks: [{cost, name, text, damage}]  damage="" 이면 null로 저장

type AttackDef = {
  cost: string[];
  name: string;
  text: string;
  damage: string | null;
};
type AbilityDef = {
  name: string;
  text: string;
  type: "Ability";
};
type CardMeta = {
  number: string;
  hp: number;
  illustrator: string;
  weakness: string | null;
  resistance: string | null;
  retreatCost: number;
  attacks: AttackDef[];
  abilities: AbilityDef[];
  regulationMark: string;
  source: string; // 출처 기록용
  confidence: "high" | "med" | "low";
};

const META: CardMeta[] = [
  // ── #046–063 스타터 18장 (출처: Bulbapedia MEP Promo 개별 페이지) ─────
  {
    number: "046", hp: 70, illustrator: "Saboteri",
    weakness: "Fire×2", resistance: null, retreatCost: 1,
    attacks: [{ cost: ["Grass","Colorless"], name: "Razor Leaf", text: "", damage: "30" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Chikorita_(MEP_Promo_46)", confidence: "high",
  },
  {
    number: "047", hp: 70, illustrator: "Saboteri",
    weakness: "Water×2", resistance: null, retreatCost: 1,
    attacks: [{ cost: ["Fire","Colorless","Colorless"], name: "Tackle", text: "", damage: "40" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Cyndaquil_(MEP_Promo_47)", confidence: "high",
  },
  {
    number: "048", hp: 80, illustrator: "Saboteri",
    weakness: "Lightning×2", resistance: null, retreatCost: 2,
    attacks: [{ cost: ["Water","Water","Colorless"], name: "Bite", text: "", damage: "50" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Totodile_(MEP_Promo_48)", confidence: "high",
  },
  {
    number: "049", hp: 60, illustrator: "Saboteri",
    weakness: "Fire×2", resistance: null, retreatCost: 1,
    attacks: [{ cost: ["Colorless"], name: "Vine Whip", text: "", damage: "20" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Snivy_(MEP_Promo_49)", confidence: "high",
  },
  {
    number: "050", hp: 80, illustrator: "Saboteri",
    weakness: "Water×2", resistance: null, retreatCost: 2,
    attacks: [{ cost: ["Fire","Fire"], name: "Ember", text: "Discard an Energy from this Pokémon.", damage: "40" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Tepig_(MEP_Promo_50)", confidence: "high",
  },
  {
    number: "051", hp: 70, illustrator: "Saboteri",
    weakness: "Lightning×2", resistance: null, retreatCost: 1,
    attacks: [{ cost: ["Water","Colorless"], name: "Razor Shell", text: "Flip a coin. If heads, this attack does 30 more damage.", damage: "10+" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Oshawott_(MEP_Promo_51)", confidence: "high",
  },
  {
    number: "052", hp: 70, illustrator: "Saboteri",
    weakness: "Fire×2", resistance: null, retreatCost: 1,
    attacks: [{ cost: ["Grass","Grass"], name: "Branch Poke", text: "", damage: "40" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Grookey_(MEP_Promo_52)", confidence: "high",
  },
  {
    number: "053", hp: 70, illustrator: "Saboteri",
    weakness: "Water×2", resistance: null, retreatCost: 1,
    attacks: [{ cost: ["Fire","Colorless"], name: "Double Kick", text: "Flip 2 coins. This attack does 20 damage for each heads.", damage: "20×" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Scorbunny_(MEP_Promo_53)", confidence: "high",
  },
  {
    number: "054", hp: 70, illustrator: "Saboteri",
    weakness: "Lightning×2", resistance: null, retreatCost: 1,
    attacks: [{ cost: ["Water","Colorless","Colorless"], name: "Water Gun", text: "", damage: "40" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Sobble_(MEP_Promo_54)", confidence: "high",
  },
  {
    number: "055", hp: 70, illustrator: "Saboteri",
    weakness: "Fire×2", resistance: null, retreatCost: 1,
    attacks: [{ cost: ["Grass"], name: "Pound", text: "", damage: "20" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Treecko_(MEP_Promo_55)", confidence: "high",
  },
  {
    number: "056", hp: 60, illustrator: "Saboteri",
    weakness: "Water×2", resistance: null, retreatCost: 1,
    attacks: [{ cost: ["Colorless"], name: "Peck", text: "", damage: "20" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Torchic_(MEP_Promo_56)", confidence: "high",
  },
  {
    number: "057", hp: 70, illustrator: "Saboteri",
    weakness: "Lightning×2", resistance: null, retreatCost: 1,
    attacks: [{ cost: ["Water","Water"], name: "Mud-Slap", text: "", damage: "40" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Mudkip_(MEP_Promo_57)", confidence: "high",
  },
  {
    number: "058", hp: 70, illustrator: "Saboteri",
    weakness: "Fire×2", resistance: null, retreatCost: 2,
    attacks: [{ cost: ["Grass","Colorless"], name: "Pin Missile", text: "Flip 4 coins. This attack does 10 damage for each heads.", damage: "10×" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Chespin_(MEP_Promo_58)", confidence: "high",
  },
  {
    number: "059", hp: 70, illustrator: "Saboteri",
    weakness: "Water×2", resistance: null, retreatCost: 1,
    attacks: [{ cost: ["Fire","Colorless"], name: "Scratch", text: "", damage: "30" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Fennekin_(MEP_Promo_59)", confidence: "high",
  },
  {
    number: "060", hp: 70, illustrator: "Saboteri",
    weakness: "Lightning×2", resistance: null, retreatCost: 1,
    attacks: [{ cost: ["Colorless","Colorless"], name: "Pound", text: "", damage: "20" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Froakie_(MEP_Promo_60)", confidence: "high",
  },
  {
    number: "061", hp: 70, illustrator: "Saboteri",
    weakness: "Fire×2", resistance: null, retreatCost: 1,
    attacks: [{ cost: ["Grass","Colorless","Colorless"], name: "Leafage", text: "", damage: "40" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Sprigatito_(MEP_Promo_61)", confidence: "high",
  },
  {
    number: "062", hp: 90, illustrator: "Saboteri",
    weakness: "Water×2", resistance: null, retreatCost: 3,
    attacks: [{ cost: ["Fire","Fire","Colorless"], name: "Flamethrower", text: "Discard an Energy from this Pokémon.", damage: "70" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Fuecoco_(MEP_Promo_62)", confidence: "high",
  },
  {
    number: "063", hp: 70, illustrator: "Saboteri",
    weakness: "Lightning×2", resistance: null, retreatCost: 1,
    attacks: [{ cost: ["Water","Colorless"], name: "Wing Attack", text: "", damage: "30" }],
    abilities: [],
    regulationMark: REG_MARK, source: "Bulbapedia:Quaxly_(MEP_Promo_63)", confidence: "high",
  },
  // ── #072 Mega Clefable ex ────────────────────────────────────────────────
  // 출처: Bulbapedia:Mega_Clefable_ex_(Perfect_Order_31) — MEP프린트=같은카드
  // MEP 프린트 일러: aky CG Works (infobox reprint3에 명시)
  {
    number: "072", hp: 320, illustrator: "aky CG Works",
    weakness: "Metal×2", resistance: null, retreatCost: 1,
    abilities: [{ name: "Luminous Wing", text: "Prevent all effects of your opponent's Pokémon's Abilities done to this Pokémon.", type: "Ability" }],
    attacks: [{ cost: ["Psychic","Psychic"], name: "Shooting Moons", text: "You may discard up to 4 Energy cards from your hand, and this attack does 40 more damage for each card you discarded in this way.", damage: "120+" }],
    regulationMark: REG_MARK, source: "Bulbapedia:Mega_Clefable_ex_(Perfect_Order_31)+MEP_reprint_illus", confidence: "high",
  },
  // ── #073 Mega Gengar ex ──────────────────────────────────────────────────
  // 출처: Bulbapedia:Mega_Gengar_ex_(Phantasmal_Flames_56)
  // MEP 프린트 일러: Ultimateinudog (reprint4에 명시)
  {
    number: "073", hp: 350, illustrator: "Ultimateinudog",
    weakness: "Fighting×2", resistance: null, retreatCost: 2,
    abilities: [{ name: "Shadowy Concealment", text: "If 1 of your Darkness Pokémon is Knocked Out by damage from an attack from your opponent's Pokémon ex, that player takes 1 fewer Prize card. The effect of Shadowy Concealment doesn't stack.", type: "Ability" }],
    attacks: [{ cost: ["Darkness","Darkness"], name: "Void Gale", text: "Move an Energy from this Pokémon to 1 of your Benched Pokémon.", damage: "230" }],
    regulationMark: REG_MARK, source: "Bulbapedia:Mega_Gengar_ex_(Phantasmal_Flames_56)+MEP_reprint_illus", confidence: "high",
  },
  // ── #082 Miraidon ────────────────────────────────────────────────────────
  // 출처: Bulbapedia:Miraidon_(Abyss_Eye_27)
  // MEP 프린트 일러: Taira Akitsu (reprint1에 명시)
  {
    number: "082", hp: 120, illustrator: "Taira Akitsu",
    weakness: "Fighting×2", resistance: null, retreatCost: 1,
    abilities: [{ name: "Photon Cord", text: "If this Pokémon is in the Active Spot and is Knocked Out by damage from an attack from your opponent's Pokémon, move up to 2 Basic Lightning Energy cards from this Pokémon to 1 of your Benched Pokémon.", type: "Ability" }],
    attacks: [{ cost: ["Lightning","Lightning"], name: "Thunder", text: "This Pokémon also does 30 damage to itself.", damage: "90" }],
    regulationMark: REG_MARK, source: "Bulbapedia:Miraidon_(Abyss_Eye_27)+MEP_reprint_illus", confidence: "high",
  },
  // ── #083 Slowbro ─────────────────────────────────────────────────────────
  // 출처: Bulbapedia:Slowbro_(Pitch_Black_30)  resistance=Fighting -30
  // MEP 프린트 일러: Yuriko Akase (reprint2에 명시)
  {
    number: "083", hp: 130, illustrator: "Yuriko Akase",
    weakness: "Darkness×2", resistance: "Fighting-30", retreatCost: 3,
    abilities: [],
    attacks: [
      { cost: ["Psychic"], name: "All Out", text: "If you have no cards in your hand, this attack does 160 more damage.", damage: "50+" },
      { cost: ["Colorless","Colorless","Colorless"], name: "Zen Headbutt", text: "", damage: "110" },
    ],
    regulationMark: REG_MARK, source: "Bulbapedia:Slowbro_(Pitch_Black_30)+MEP_reprint_illus", confidence: "high",
  },
  // ── #084 Dhelmise ────────────────────────────────────────────────────────
  // 출처: Bulbapedia:Dhelmise_(Pitch_Black_39)  resistance=Fighting -30
  // MEP 프린트 일러: Dsuke (reprint2에 명시)
  {
    number: "084", hp: 140, illustrator: "Dsuke",
    weakness: "Darkness×2", resistance: "Fighting-30", retreatCost: 3,
    abilities: [],
    attacks: [{ cost: ["Psychic"], name: "Vengeful Anchor", text: "If you have 4 or more Pokémon that have the Hide 'n' Sneak Ability in your discard pile, this attack does 140 more damage.", damage: "30+" }],
    regulationMark: REG_MARK, source: "Bulbapedia:Dhelmise_(Pitch_Black_39)+MEP_reprint_illus", confidence: "high",
  },
  // ── #085 Bastiodon ───────────────────────────────────────────────────────
  // 출처: Bulbapedia:Bastiodon_(Abyss_Eye_60)  resistance=Grass -30
  // MEP 프린트 일러: Minahamu (reprint2에 명시)
  {
    number: "085", hp: 160, illustrator: "Minahamu",
    weakness: "Fire×2", resistance: "Grass-30", retreatCost: 4,
    abilities: [{ name: "Ancient Bulwark", text: "As long as this Pokémon is on your Bench, prevent all damage done to each of your Pokémon by attacks from your opponent's Pokémon that have 2 or less Energy attached.", type: "Ability" }],
    attacks: [{ cost: ["Metal","Metal","Colorless"], name: "Hammer In", text: "", damage: "160" }],
    regulationMark: REG_MARK, source: "Bulbapedia:Bastiodon_(Abyss_Eye_60)+MEP_reprint_illus", confidence: "high",
  },
  // ── #092 Paradise Resort (Stadium) ───────────────────────────────────────
  // 출처: Bulbapedia:Paradise_Resort_(SVP_Promo_45) — MEP print illus: Naoki Saito
  {
    number: "092", hp: 0 /* Trainer, hp없음 → 특수처리 */, illustrator: "Naoki Saito",
    weakness: null, resistance: null, retreatCost: 0,
    abilities: [],
    attacks: [], // Trainer는 attacks 없음 — 효과는 card text로만
    regulationMark: REG_MARK, source: "Bulbapedia:Paradise_Resort_(SVP_Promo_45)+MEP_reprint_illus", confidence: "high",
  },
  // ── #093 Pikachu ─────────────────────────────────────────────────────────
  // 출처: Bulbapedia:Pikachu_(SVP_Promo_101)  MEP print illus: DOM (reprint3)
  {
    number: "093", hp: 70, illustrator: "DOM",
    weakness: "Fighting×2", resistance: null, retreatCost: 1,
    abilities: [],
    attacks: [{ cost: ["Lightning","Lightning","Colorless"], name: "Scrappy Spark", text: "Flip a coin until you get tails. This attack does 30 more damage for each heads.", damage: "30+" }],
    regulationMark: REG_MARK, source: "Bulbapedia:Pikachu_(SVP_Promo_101)+MEP_reprint_illus", confidence: "high",
  },
];

// ── No.500 신규 생성 데이터 ──────────────────────────────────────────────
// 출처: 메인 이미지 확인 + Bulbapedia:Pikachu_at_the_Museum_(MEP_Promo)
// 주의: Bulbapedia에서 이 카드는 unnumbered Jumbo 카드 (번호 없음)
//        레포 내부 번호 "500"은 메인이 부여한 내부 식별자
const CARD_500 = {
  rcId: `${SET_ID}-500`,
  number: "500",
  name: "Pikachu at the Museum",
  supertype: "Pokémon",
  subtypes: ["Basic"],
  types: ["Lightning"],
  dex: [25],
  hp: 70,
  illustrator: "Naoyo Kimura",
  weakness: "Fighting×2",
  resistance: null,
  retreatCost: 1,
  abilities: [] as AbilityDef[],
  attacks: [
    { cost: ["Colorless"], name: "The Best Collection!", text: "Search your Pokémon TCG collection for a Pokémon, reveal it, and put it into your hand.", damage: null },
    { cost: ["Lightning","Lightning","Lightning"], name: "Thunderbolt", text: "Discard all Energy from this Pokémon.", damage: "100" },
  ] as AttackDef[],
  regulationMark: null as string | null, // Bulbapedia에 명시 없음 (Jumbo, tournament-unplayable)
  imageUrl: "https://static.tcgcollector.com/content/images/d6/38/18/d638180e7519fd1683cd05ee9c0fb5bbb4efce12a1dd83ccef61a4474c9d1213.webp",
};

// ── helpers ──────────────────────────────────────────────────────────────
function normalizeAttacks(attacks: AttackDef[]) {
  return attacks.map(a => ({
    cost: a.cost,
    name: a.name,
    text: a.text || null,
    damage: a.damage && a.damage !== "" ? a.damage : null,
  }));
}
function normalizeAbilities(abilities: AbilityDef[]) {
  return abilities.map(a => ({ name: a.name, text: a.text, type: a.type }));
}

// ── main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${APPLY ? "APPLY" : "DRY-RUN"} — en-tcg-mep 메타보강 Phase2`);

  // ── 사전 충돌 체크 (500번) ──
  console.log("\n[PRE-CHECK] No.500 중복 확인");
  const existing500 = await prisma.regionCard.findFirst({
    where: { setId: SET_ID, number: "500" },
  });
  console.log("  No.500:", existing500 ? "이미 존재" : "없음 (생성 예정)");
  if (existing500 && APPLY) {
    console.error("  ERROR: No.500 이미 존재. 중단.");
    await prisma.$disconnect();
    process.exit(1);
  }

  // ── 작업 A: 26장 메타 업데이트 ──
  console.log("\n[A] 26장 메타 필드 업데이트");
  let aOk = 0, aFail = 0;

  for (const m of META) {
    const rcId = `${SET_ID}-${m.number}`;
    const isTrainer = m.number === "092";
    const hpVal = isTrainer ? null : m.hp;
    const wkVal = m.weakness;
    const rsVal = m.resistance;
    const retVal = isTrainer ? null : m.retreatCost;
    const atkVal = isTrainer ? null : (m.attacks.length > 0 ? normalizeAttacks(m.attacks) : null);
    const abiVal = m.abilities.length > 0 ? normalizeAbilities(m.abilities) : null;

    console.log(`  ${m.number.padEnd(4)} hp=${hpVal ?? "-"} wk=${wkVal ?? "-"} ret=${retVal ?? "-"} ill=${m.illustrator} atk=${m.attacks.length} abi=${m.abilities.length} [${m.confidence}]`);

    if (APPLY) {
      try {
        await prisma.card.update({
          where: { id: rcId },
          data: {
            hp: hpVal,
            weakness: wkVal,
            resistance: rsVal,
            retreatCost: retVal,
            illustrator: m.illustrator,
            attacks: atkVal ?? undefined,
            abilities: abiVal ?? undefined,
            regulationMark: m.regulationMark,
          },
        });
        aOk++;
      } catch (e: any) {
        console.warn(`    WARN ${rcId}: ${e?.message}`);
        aFail++;
      }
    } else {
      aOk++;
    }
  }
  console.log(`  A 완료: ok=${aOk} fail=${aFail}`);

  // ── 작업 B: No.500 신규 생성 ──
  console.log("\n[B] No.500 Pikachu at the Museum 신규 생성");
  const c = CARD_500;
  console.log(`  id=${c.rcId} name="${c.name}" hp=${c.hp} ill=${c.illustrator}`);
  console.log(`  weakness=${c.weakness ?? "null"} retreat=${c.retreatCost} attacks=${c.attacks.length}`);
  console.log(`  image: ${c.imageUrl.slice(0, 70)}...`);

  if (APPLY) {
    // LogicalCard upsert
    await prisma.card.upsert({
      where: { id: c.rcId },
      create: {
        id: c.rcId,
        cardPackId: null,
        primarySetId: SET_ID,
        primaryNumber: c.number,
        primaryNumberInt: toInt(c.number),
        supertype: c.supertype,
        subtypes: c.subtypes,
        types: c.types,
        pokedexNumbers: c.dex,
        rarityId: RARITY_ID,
        hp: c.hp,
        retreatCost: c.retreatCost,
        weakness: c.weakness,
        resistance: c.resistance,
        illustrator: c.illustrator,
        attacks: normalizeAttacks(c.attacks) as any,
        abilities: null,
        regulationMark: c.regulationMark,
        evolvesTo: [],
        rules: [],
      },
      update: {
        hp: c.hp,
        retreatCost: c.retreatCost,
        weakness: c.weakness,
        resistance: c.resistance,
        illustrator: c.illustrator,
        attacks: normalizeAttacks(c.attacks) as any,
        regulationMark: c.regulationMark,
        rarityId: RARITY_ID,
      },
    });

    let smUrl: string | null = c.imageUrl;
    if (!SKIP_R2) {
      smUrl = await uploadSmallToR2(c.number, c.imageUrl);
      await sleep(400);
    }

    // RegionCard upsert
    await prisma.regionCard.upsert({
      where: { id: c.rcId },
      create: {
        id: c.rcId,
        cardId: c.rcId,
        language: "en",
        region: "EN",
        setId: SET_ID,
        number: c.number,
        numberInt: toInt(c.number),
        name: c.name,
        rarityId: RARITY_ID,
        imageLarge: c.imageUrl,
        imageSmall: smUrl ?? c.imageUrl,
      },
      update: {
        name: c.name,
        rarityId: RARITY_ID,
        imageLarge: c.imageUrl,
        imageSmall: smUrl ?? c.imageUrl,
      },
    });
    console.log(`  upserted ${c.rcId} (R2 small: ${smUrl && smUrl !== c.imageUrl ? "OK" : "fallback-hotlink"})`);

    // cardCount 갱신
    const finalCount = await prisma.regionCard.count({ where: { setId: SET_ID } });
    await prisma.set.update({
      where: { id: SET_ID },
      data: { cardCount: finalCount },
    });
    console.log(`  en-tcg-mep cardCount → ${finalCount}`);
  } else {
    console.log(`  [DRY] would create ${c.rcId} + update cardCount`);
  }

  // ── 최종 검증 ──
  const totalCount = await prisma.regionCard.count({ where: { setId: SET_ID } });
  const withRarity = await prisma.regionCard.count({ where: { setId: SET_ID, rarityId: { not: null } } });
  const withSmall = await prisma.regionCard.count({ where: { setId: SET_ID, imageSmall: { not: null } } });
  const dupeCheck = await prisma.regionCard.groupBy({
    by: ["number"],
    where: { setId: SET_ID },
    having: { number: { _count: { gt: 1 } } },
  });
  const withMeta = await prisma.card.count({ where: { primarySetId: SET_ID, hp: { not: null } } });

  console.log(`\n=== 최종 검증 ===`);
  console.log(`  en-tcg-mep 총 RegionCard: ${totalCount}`);
  console.log(`  rarityId 보유: ${withRarity}`);
  console.log(`  imageSmall 보유: ${withSmall}`);
  console.log(`  hp(메타) 보유: ${withMeta} (card 테이블)`);
  console.log(`  중복 번호: ${dupeCheck.length === 0 ? "없음 (OK)" : JSON.stringify(dupeCheck)}`);
  if (!APPLY) {
    console.log(`\n  [DRY-RUN 완료] 적용: npx tsx scripts/fill-mep-meta-phase2.ts --apply`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FAIL:", e?.message ?? e);
  process.exit(1);
});
