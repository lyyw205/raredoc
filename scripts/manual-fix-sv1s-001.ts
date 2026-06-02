import "dotenv/config";
import { prisma } from "@/lib/prisma";

const TARGET_LOGICAL_ID = "lc-cg-sv-base-n5";
const OLD_LOGICAL_IDS = [
  "lc-orphan-jp-sv-base-SV1S-001",
  "lc-orphan-jp-tcg-SV1S-001",
  "lc-orphan-kr-sv1s-1",
];

const verifiedAt = new Date();
const weakness = JSON.stringify([{ type: "Fire", value: "×2" }]);

const enFlavor =
  "It prefers harsh environments, such as deserts. It can survive for 30 days on water stored in its body.";
const jaFlavor =
  "砂漠などの 過酷な 環境を 好む。 体内に 蓄えた 水で ３０日間 生きられる。";
const koFlavor =
  "사막 같은 혹독한 환경을 좋아한다. 몸속에 축적된 물로 30일간 살 수 있다.";

const enAbilities = [
  {
    type: "Ability",
    name: "Counterattack Quills",
    text: "If this Pokémon is in the Active Spot and is damaged by an attack from your opponent's Pokémon (even if this Pokémon is Knocked Out), put 3 damage counters on the Attacking Pokémon.",
  },
];

const jaAbilities = [
  {
    type: "Ability",
    name: "はんげきばり",
    text: "このポケモンが、バトル場で相手のポケモンからワザのダメージを受けたとき、ワザを使ったポケモンにダメカンを3個のせる。",
  },
];

const koAbilities = [
  {
    type: "Ability",
    name: "반격가시",
    text: "이 포켓몬이 배틀필드에서 상대의 포켓몬으로부터 기술의 데미지를 받았을 때 기술을 사용한 포켓몬에게 데미지 카운터를 3개 올린다.",
  },
];

const enAttacks = [
  {
    name: "Light Punch",
    cost: ["Colorless", "Colorless"],
    convertedEnergyCost: 2,
    damage: "30",
  },
];

const jaAttacks = [
  {
    name: "なぐる",
    cost: ["Colorless", "Colorless"],
    convertedEnergyCost: 2,
    damage: "30",
  },
];

const koAttacks = [
  {
    name: "치기",
    cost: ["Colorless", "Colorless"],
    convertedEnergyCost: 2,
    damage: "30",
  },
];

async function main() {
  await prisma.$transaction(async (tx) => {
    const common = await tx.rarity.findUniqueOrThrow({
      where: { code: "Common" },
    });

    await tx.set.update({
      where: { id: "jp-tcg-SV1S" },
      data: { setGroupId: "sv-base" },
    });

    await tx.cardLocale.updateMany({
      where: {
        id: { in: ["jp-sv-base-SV1S-001", "jp-tcg-SV1S-001"] },
      },
      data: {
        logicalCardId: TARGET_LOGICAL_ID,
        flavorText: jaFlavor,
      },
    });

    await tx.cardLocale.update({
      where: { id: "kr-sv1s-1" },
      data: {
        logicalCardId: TARGET_LOGICAL_ID,
        number: "001",
        name: "선인왕",
        flavorText: koFlavor,
      },
    });

    await tx.cardLocale.update({
      where: { id: "sv1-5" },
      data: { flavorText: enFlavor },
    });

    await tx.cardText.deleteMany({
      where: { logicalCardId: { in: OLD_LOGICAL_IDS } },
    });

    await tx.logicalCard.update({
      where: { id: TARGET_LOGICAL_ID },
      data: {
        setGroupId: "sv-base",
        primarySetId: "jp-tcg-SV1S",
        primaryNumber: "001",
        primaryNumberInt: 1,
        pokedexNumbers: [331],
        supertype: "Pokémon",
        subtypes: ["Basic"],
        types: ["Grass"],
        hp: 60,
        retreatCost: 1,
        weakness,
        resistance: null,
        regulationMark: "G",
        illustrator: "Tika Matsuno",
        evolvesFrom: null,
        evolvesTo: ["Cacturne"],
        abilities: enAbilities,
        attacks: enAttacks,
        legalities: { standard: "Legal", expanded: "Legal", unlimited: "Legal" },
        rules: [],
        flavorText: enFlavor,
        rarityId: common.id,
        nameKo: "선인왕",
        attacksKo: koAttacks,
        abilitiesKo: koAbilities,
        rulesKo: [],
        flavorTextKo: koFlavor,
      },
    });

    for (const data of [
      {
        language: "en",
        name: "Cacnea",
        abilities: enAbilities,
        attacks: enAttacks,
        flavorText: enFlavor,
        source: "pokemon_tcg_official",
      },
      {
        language: "ja",
        name: "サボネア",
        abilities: jaAbilities,
        attacks: jaAttacks,
        flavorText: jaFlavor,
        source: "pokemoncard_jp",
      },
      {
        language: "ko",
        name: "선인왕",
        abilities: koAbilities,
        attacks: koAttacks,
        flavorText: koFlavor,
        source: "pokemoncard_kr",
      },
    ]) {
      await tx.cardText.upsert({
        where: {
          logicalCardId_language: {
            logicalCardId: TARGET_LOGICAL_ID,
            language: data.language,
          },
        },
        update: {
          name: data.name,
          abilities: data.abilities,
          attacks: data.attacks,
          flavorText: data.flavorText,
          source: data.source,
          confidence: 1,
          verifiedAt,
          rules: [],
        },
        create: {
          logicalCardId: TARGET_LOGICAL_ID,
          language: data.language,
          name: data.name,
          abilities: data.abilities,
          attacks: data.attacks,
          flavorText: data.flavorText,
          source: data.source,
          confidence: 1,
          verifiedAt,
          rules: [],
        },
      });
    }

    await tx.logicalCard.deleteMany({
      where: { id: { in: OLD_LOGICAL_IDS } },
    });

    const sources = await tx.externalSource.findMany({
      where: {
        code: {
          in: ["pokemoncard_jp", "pokemoncard_kr", "pokemontcg_io", "tcgdex"],
        },
      },
    });
    const sourceByCode = new Map(sources.map((source) => [source.code, source]));

    async function mapSource(
      code: string,
      externalId: string,
      url: string,
      cardLocaleId?: string
    ) {
      const source = sourceByCode.get(code);
      if (!source) return;

      await tx.externalIdMapping.upsert({
        where: {
          sourceId_externalId: {
            sourceId: source.id,
            externalId,
          },
        },
        update: {
          logicalCardId: TARGET_LOGICAL_ID,
          cardLocaleId: cardLocaleId ?? null,
          setId: null,
          setGroupId: null,
          url,
          verifiedAt,
          verifiedBy: "manual:sv1s-001",
          confidence: 1,
          notes: "SV1S 001 manual verification",
        },
        create: {
          sourceId: source.id,
          externalId,
          logicalCardId: TARGET_LOGICAL_ID,
          cardLocaleId: cardLocaleId ?? null,
          url,
          verifiedAt,
          verifiedBy: "manual:sv1s-001",
          confidence: 1,
          notes: "SV1S 001 manual verification",
        },
      });
    }

    await mapSource(
      "pokemoncard_jp",
      "42547",
      "https://www.pokemon-card.com/card-search/details.php/card/42547/regu/all"
    );
    await mapSource(
      "pokemoncard_kr",
      "BS2023006001",
      "https://pokemoncard.co.kr/cards/detail/BS2023006001"
    );
    await mapSource(
      "pokemontcg_io",
      "sv1-5",
      "https://api.pokemontcg.io/v2/cards/sv1-5",
      "sv1-5"
    );
    await mapSource(
      "tcgdex",
      "SV1S-001",
      "https://api.tcgdex.net/v2/ja/cards/SV1S-001"
    );
  });

  console.log(`SV1S 001 corrected: ${TARGET_LOGICAL_ID}`);

  const checked = await prisma.cardLocale.findMany({
    where: {
      id: {
        in: [
          "jp-sv-base-SV1S-001",
          "jp-tcg-SV1S-001",
          "kr-sv1s-1",
          "sv1-5",
          "sv1-1",
        ],
      },
    },
    include: {
      set: { select: { setGroupId: true } },
      logicalCard: {
        include: {
          rarity: { select: { code: true } },
          texts: {
            orderBy: { language: "asc" },
            select: {
              language: true,
              name: true,
              source: true,
              confidence: true,
              abilities: true,
              attacks: true,
              flavorText: true,
            },
          },
          locales: {
            orderBy: { id: "asc" },
            select: {
              id: true,
              language: true,
              region: true,
              number: true,
              name: true,
              setId: true,
            },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  console.dir(
    checked.map((row) => ({
      id: row.id,
      setId: row.setId,
      setGroupId: row.set.setGroupId,
      language: row.language,
      region: row.region,
      number: row.number,
      name: row.name,
      localeFlavorText: row.flavorText,
      logical: {
        id: row.logicalCard.id,
        primarySetId: row.logicalCard.primarySetId,
        primaryNumber: row.logicalCard.primaryNumber,
        pokedexNumbers: row.logicalCard.pokedexNumbers,
        supertype: row.logicalCard.supertype,
        subtypes: row.logicalCard.subtypes,
        types: row.logicalCard.types,
        hp: row.logicalCard.hp,
        retreatCost: row.logicalCard.retreatCost,
        weakness: row.logicalCard.weakness,
        regulationMark: row.logicalCard.regulationMark,
        illustrator: row.logicalCard.illustrator,
        evolvesTo: row.logicalCard.evolvesTo,
        abilityName: Array.isArray(row.logicalCard.abilities)
          ? row.logicalCard.abilities[0]?.name
          : null,
        attackName: Array.isArray(row.logicalCard.attacks)
          ? row.logicalCard.attacks[0]?.name
          : null,
        flavorText: row.logicalCard.flavorText,
        rarity: row.logicalCard.rarity?.code,
        nameKo: row.logicalCard.nameKo,
        flavorTextKo: row.logicalCard.flavorTextKo,
        texts: row.logicalCard.texts.map((text) => ({
          language: text.language,
          name: text.name,
          source: text.source,
          confidence: text.confidence,
          abilityName: Array.isArray(text.abilities)
            ? text.abilities[0]?.name
            : null,
          attackName: Array.isArray(text.attacks)
            ? text.attacks[0]?.name
            : null,
          flavorText: text.flavorText,
        })),
        locales: row.logicalCard.locales,
      },
    })),
    { depth: null }
  );

  const oldLogicalCards = await prisma.logicalCard.findMany({
    where: { id: { in: OLD_LOGICAL_IDS } },
    select: { id: true },
  });
  console.log("oldLogicalRemaining", oldLogicalCards);

  const mappings = await prisma.externalIdMapping.findMany({
    where: { logicalCardId: TARGET_LOGICAL_ID },
    include: { source: true },
    orderBy: { externalId: "asc" },
  });
  console.dir(
    mappings.map((mapping) => ({
      source: mapping.source.code,
      externalId: mapping.externalId,
      cardLocaleId: mapping.cardLocaleId,
      url: mapping.url,
      verifiedBy: mapping.verifiedBy,
      confidence: mapping.confidence,
    })),
    { depth: null }
  );
}

main().finally(() => prisma.$disconnect());
