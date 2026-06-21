/**
 * en-tcg-mep 신규 8장 게임 메타 보강
 * 출처: limitlesstcg.com/cards/MEP/{n} (2026-06-21 수집)
 * additive — null 필드만 채움. 이미지·rarity·이름·번호·subtypes 건드리지 않음.
 * 실행: npx tsx scripts/fill-mep-8-meta.ts [--apply]
 */
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { resolveCardDexes } from './lib/pokeapi-names';

// ptcg-symbol 단일문자 → 타입명
const SYM: Record<string, string> = {
  R: 'Fire', W: 'Water', L: 'Lightning', G: 'Grass', F: 'Fighting',
  P: 'Psychic', D: 'Darkness', M: 'Metal', C: 'Colorless', N: 'Dragon', Y: 'Fairy',
};

function expandCost(raw: string): string[] {
  // raw = "FFF" | "RR" | "LC" | "DC" | "FFFFF" | "WP" etc.
  // Each character is a ptcg symbol
  return raw.split('').map(ch => SYM[ch] ?? ch);
}

// Limitless에서 수집한 데이터 (2026-06-21)
const MEP8 = [
  {
    rcId: 'en-tcg-mep-071',
    name: 'Mega Zygarde ex',
    hp: 310,
    types: ['Fighting'],
    abilities: null,
    attacks: [
      { cost: expandCost('FFF'), name: 'Gaia Wave', damage: '200', text: "During your opponent's next turn, this Pokémon takes 30 less damage from attacks (after applying Weakness and Resistance)." },
      { cost: expandCost('FFFFF'), name: 'Nullifying Zero', damage: null, text: "For each of your opponent's Pokémon, flip a coin. If heads, this attack does 150 damage to that Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)" },
    ],
    weakness: 'Grass×2',
    resistance: null,
    retreatCost: 2,
    illustrator: 'takuyoa',
  },
  {
    rcId: 'en-tcg-mep-074',
    name: 'Delphox',
    hp: 160,
    types: ['Fire'],
    abilities: [
      { name: 'Flaring Magic', type: 'Ability', text: 'Once during your turn, you may discard a Basic {R} Energy card from your hand in order to use this Ability. Draw cards until you have 7 cards in your hand.' },
    ],
    attacks: [
      { cost: expandCost('RR'), name: 'Energized Storm', damage: '30×', text: 'This attack does 30 damage for each Energy attached to all Pokémon.' },
    ],
    weakness: 'Water×2',
    resistance: null,
    retreatCost: 2,
    illustrator: 'souichirou_gunjima',
  },
  {
    rcId: 'en-tcg-mep-075',
    name: 'Ampharos',
    hp: 160,
    types: ['Lightning'],
    abilities: [
      { name: 'Synchro Pulse', type: 'Ability', text: 'If you have the same number of cards in your hand as your opponent, attacks used by this Pokémon do 80 more damage to your opponent\'s Active Pokémon (before applying Weakness and Resistance).' },
    ],
    attacks: [
      { cost: expandCost('LC'), name: 'Flashing Bolt', damage: '140', text: "During your next turn, this Pokémon can't use Flashing Bolt." },
    ],
    weakness: 'Fighting×2',
    resistance: null,
    retreatCost: 2,
    illustrator: 'taiga_kasai',
  },
  {
    rcId: 'en-tcg-mep-076',
    name: 'Crobat',
    hp: 130,
    types: ['Darkness'],
    abilities: [
      { name: 'Nighttime Maneuvers', type: 'Ability', text: 'Once during your turn, if this Pokémon is in the Active Spot, you may use this Ability. Search your deck for a card. Shuffle your deck, then put that card on top of it.' },
    ],
    attacks: [
      { cost: expandCost('D'), name: 'Poison Sound Wave', damage: '80', text: "Your opponent's Active Pokémon is now Confused and Poisoned." },
    ],
    weakness: 'Lightning×2',
    resistance: 'Fighting-30',
    retreatCost: 1,
    illustrator: 'apios',
  },
  {
    rcId: 'en-tcg-mep-077',
    name: 'Goodra',
    hp: 160,
    types: ['Dragon'],
    abilities: [
      { name: 'Slimy Sliding', type: 'Ability', text: "When your opponent's Active Pokémon retreats, your opponent flips a coin. If tails, Energy for its Retreat Cost is not discarded, and they don't switch Pokémon. The effect of Slimy Sliding doesn't stack." },
    ],
    attacks: [
      { cost: expandCost('WP'), name: 'Dragon Pulse', damage: '160', text: 'Discard the top card of your deck.' },
    ],
    weakness: null,
    resistance: null,
    retreatCost: 3,
    illustrator: 'okayamatakatoshi',
  },
  {
    rcId: 'en-tcg-mep-078',
    name: 'Toxel',
    hp: 70,
    types: ['Darkness'],
    abilities: null,
    attacks: [
      { cost: expandCost('D'), name: 'Call for Family', damage: null, text: 'Search your deck for up to 2 Basic Pokémon and put them onto your Bench. Then, shuffle your deck.' },
      { cost: expandCost('DC'), name: 'Playful Kick', damage: '20', text: '' },
    ],
    weakness: 'Fighting×2',
    resistance: null,
    retreatCost: 1,
    illustrator: 'mina_nakai',
  },
  {
    rcId: 'en-tcg-mep-079',
    name: 'Charmeleon',
    hp: 110,
    types: ['Fire'],
    abilities: null,
    attacks: [
      { cost: expandCost('R'), name: 'Steady Firebreathing', damage: '40', text: '' },
    ],
    weakness: 'Water×2',
    resistance: null,
    retreatCost: 2,
    illustrator: 'teeziro',
  },
  {
    rcId: 'en-tcg-mep-080',
    name: 'Fennekin',
    hp: 70,
    types: ['Fire'],
    abilities: null,
    attacks: [
      { cost: expandCost('C'), name: 'Call for Family', damage: null, text: 'Search your deck for up to 2 Basic Pokémon and put them onto your Bench. Then, shuffle your deck.' },
      { cost: expandCost('R'), name: 'Steady Firebreathing', damage: '10', text: '' },
    ],
    weakness: 'Water×2',
    resistance: null,
    retreatCost: 1,
    illustrator: 'satoma',
  },
];

// 베이스 이름(Mega/ex 제거)으로 dex 해석
function baseName(name: string): string {
  return name.replace(/\s+ex$/i, '').replace(/^Mega\s+/i, '').trim();
}

async function main() {
  const APPLY = process.argv.includes('--apply');

  const updates: Array<{ id: string; data: Record<string, unknown>; name: string }> = [];

  for (const card of MEP8) {
    // 현재 LC 조회
    const lc = await prisma.card.findUnique({
      where: { id: card.rcId },
      select: { hp: true, types: true, attacks: true, abilities: true, weakness: true,
        resistance: true, retreatCost: true, illustrator: true, pokedexNumbers: true },
    });
    if (!lc) {
      console.log(`[MISS] ${card.rcId} — LC 없음`);
      continue;
    }

    const d: Record<string, unknown> = {};
    // null 필드만 채움
    if (lc.hp == null) d.hp = card.hp;
    if (!lc.types || lc.types.length === 0) d.types = card.types;
    if (!lc.attacks || (lc.attacks as unknown[]).length === 0) d.attacks = card.attacks;
    if ((!lc.abilities || (lc.abilities as unknown[]).length === 0) && card.abilities) {
      d.abilities = card.abilities;
    }
    if (lc.weakness == null && card.weakness != null) d.weakness = card.weakness;
    if (lc.resistance == null && card.resistance != null) d.resistance = card.resistance;
    if (lc.retreatCost == null) d.retreatCost = card.retreatCost;
    if (!lc.illustrator) d.illustrator = card.illustrator;
    if (!lc.pokedexNumbers || lc.pokedexNumbers.length === 0) {
      const dexes = resolveCardDexes(baseName(card.name), 'en');
      if (dexes.length > 0) d.pokedexNumbers = dexes;
    }

    const filled = Object.keys(d);
    console.log(`[${APPLY ? 'APPLY' : 'DRY'}] ${card.rcId} (${card.name}) filled=${filled.join(',') || '(없음)'}`);
    if (filled.length > 0) updates.push({ id: card.rcId, data: d, name: card.name });
  }

  if (APPLY) {
    for (const u of updates) {
      await prisma.card.update({ where: { id: u.id }, data: u.data });
      console.log(`  ★ ${u.id} 업데이트 완료`);
    }
    console.log(`\n★ 총 ${updates.length}건 적용 완료`);
  } else {
    console.log(`\n(dry-run) 적용 대상 ${updates.length}건. --apply 로 재실행하면 적용됩니다.`);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
