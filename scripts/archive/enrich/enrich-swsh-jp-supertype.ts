/**
 * SwSh JP-only CardPack Card supertype 보강.
 *
 * tcgdex JP SwSh 엔드포인트는 cards 배열이 빈 배열을 반환하므로
 * RegionCard.name 기반 규칙으로 supertype 추정.
 *
 * 규칙:
 *   - name에 "エネルギー" 또는 "Energy" 포함 → Energy
 *   - pokedexNumbers 가 비어 있지 않음 → Pokémon
 *   - name이 JP 포켓몬 이름 패턴 (히라가나/카타카나/한자) → Pokémon
 *   - 위에서 결정 안 된 경우 numberInt 기준: 세트 총 카드 수의 80% 이하 → Pokémon, 초과 → Trainer
 *
 * 대상 JP-only SetGroups:
 *   og-s1h, og-s1a, og-s3, og-s4, og-s5r, og-s5a,
 *   og-s6k, og-s6a, og-s7d, og-s8b, og-s9a, og-s10p, og-s12
 *
 * Run: npx tsx scripts/enrich-swsh-jp-supertype.ts
 */
import "dotenv/config";
import { prisma } from "../../../src/lib/prisma";

const JP_ONLY_SWSH_GROUPS = [
  "og-s1h",  // シールド (60)
  "og-s1a",  // VMAXライジング (70)
  "og-s3",   // ムゲンゾーン (100)
  "og-s4",   // 仰天のボルテッカー (100)
  "og-s5r",  // 連撃マスター (70)
  "og-s5a",  // 双璧のファイター (70)
  "og-s6k",  // 漆黒のガイスト (70)
  "og-s6a",  // イーブイヒーローズ (69)
  "og-s7d",  // 摩天パーフェクト (67)
  "og-s8b",  // VMAXクライマックス (184)
  "og-s9a",  // バトルリージョン (93/67)
  "og-s10p", // スペースジャグラー (67)
  "og-s12",  // パラダイムトリガー (98/125)
];

// Known Energy name patterns (JP + EN in alt-art cards)
const ENERGY_PATTERN = /エネルギー|Energy/i;

// Known Trainer card indicator patterns (JP trainer card names rarely contain these)
// Trainer cards in SwSh era: グッズ (Goods/Item), サポート (Supporter), スタジアム (Stadium)
// These appear at higher numbers in a set
const TRAINER_JP_PATTERN = /ポケモン|キャッチャー|ボール|タウン|シティ|ジム|ロック|マント|スコープ|フック|スプレー|キズ薬|シールド|バッジ|ハーブ|たきび|きのみ|でんきだま|ぬいぐるみ|にんじん|きのこ|おまもり|ジャッジマン|アロハ|チェック|ライム|マリィ|ウツギ|バサオ|サイトウ|ジムトレーナー|博士|先生|ネズ|ローズ|マジコスプレ|ビート|カリン|アンジー|クラハンマー|ネジキ|シロナ|カトレア|リョウ|カキ|アデク|ソニア|ホップ|マリン|ダン|ビート|フウロ|メロン|アオキ|ナナカマド|カルネ|シルバー|サクラギ/;

// Determine supertype from card name and pokedexNumbers
function inferSupertype(
  name: string,
  pokedexNumbers: number[],
  numberInt: number | null,
  setOfficialCount: number
): string {
  // Energy check
  if (ENERGY_PATTERN.test(name)) return "Energy";

  // Has pokedex number → Pokémon
  if (pokedexNumbers.length > 0) return "Pokémon";

  // Name ends with V, VMAX, VSTAR, GX, ex, EX → Pokémon
  // Note: JP names may not have space before V (e.g. コータスV), EN names do (e.g. "Charizard V")
  if (/[VG]X$|VMAX$|VSTAR$|\bex$|\bEX$/i.test(name)) return "Pokémon";
  if (/ V$|V$/.test(name)) return "Pokémon";

  // Name is purely katakana/hiragana/kanji (possibly with spaces) — likely Pokémon
  // Trainer cards tend to have more complex names with JP grammar particles
  const isJpPokemonName = /^[぀-ゟ゠-ヿ一-鿿＀-￯\s・ー]+$/.test(name);
  // But also check: if it's a common JP name pattern without trainer keywords
  if (isJpPokemonName && !TRAINER_JP_PATTERN.test(name)) {
    // Short Japanese names (≤8 chars including spaces) are very likely Pokémon names
    const bare = name.replace(/\s/g, "");
    if (bare.length <= 10) return "Pokémon";
  }

  // Number-based fallback: cards in first ~70% of set are usually Pokémon
  if (numberInt !== null && setOfficialCount > 0) {
    if (numberInt <= Math.floor(setOfficialCount * 0.68)) return "Pokémon";
    return "Trainer";
  }

  return "Trainer";
}

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const groupId of JP_ONLY_SWSH_GROUPS) {
    // Get all RegionCard + Card for this group where supertype is null
    const sets = await prisma.set.findMany({
      where: { cardPackId: groupId },
      select: { id: true, cardCount: true, region: true },
    });

    // Get official card count from JP set
    const jpSet = sets.find(s => s.region === "JP");
    const officialCount = jpSet?.cardCount ?? 100;

    // Get Cards needing supertype via JP RegionCards
    const jpSetIds = sets.filter(s => s.region === "JP").map(s => s.id);
    if (jpSetIds.length === 0) {
      console.log(`  ⚠ ${groupId}: JP set 없음 — skip`);
      continue;
    }

    const locales = await prisma.regionCard.findMany({
      where: {
        setId: { in: jpSetIds },
        card: { supertype: null },
      },
      select: {
        id: true,
        name: true,
        numberInt: true,
        cardId: true,
        card: {
          select: { pokedexNumbers: true },
        },
      },
    });

    if (locales.length === 0) {
      console.log(`  ✓ ${groupId}: 보강 대상 없음 (이미 완료)`);
      skipped++;
      continue;
    }

    console.log(`\n─── ${groupId} (official=${officialCount}, 대상=${locales.length}) ───`);

    const updates: Map<string, string> = new Map();

    for (const cl of locales) {
      if (!cl.cardId) continue;
      const st = inferSupertype(
        cl.name,
        cl.card?.pokedexNumbers ?? [],
        cl.numberInt,
        officialCount
      );
      updates.set(cl.cardId, st);
    }

    // Batch update
    const pokemon = [...updates.entries()].filter(([, st]) => st === "Pokémon");
    const trainer = [...updates.entries()].filter(([, st]) => st === "Trainer");
    const energy = [...updates.entries()].filter(([, st]) => st === "Energy");

    console.log(`  분류: Pokémon=${pokemon.length}, Trainer=${trainer.length}, Energy=${energy.length}`);

    for (const [lcId, st] of updates) {
      await prisma.card.update({
        where: { id: lcId },
        data: { supertype: st },
      });
      updated++;
    }
  }

  console.log(`\n결과: ${updated} 업데이트, ${skipped} 스킵`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
