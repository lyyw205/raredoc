/**
 * MP1 세트 적재 스크립트
 * スタートデッキ100 バトルコレクション コロちゃおVer.
 * 
 * 출처:
 * - 카드 목록(번호·EN명·regulation): Bulbapedia "Start Deck 100 Battle Collection CoroCiao Version (TCG)"
 * - 일본어 이름: DB의 jp-tcg-MC 세트 + Bulbapedia JP 이름 대조
 * - 이미지: pokemon-card.com MC 세트의 동일 카드 이미지(폴백)
 *   MP1은 pokemon-card.com에 미등록(pg코드 없음, /ex/mp1/ 404)
 * - インフルエンサーの紹介(019/023): MC에 없는 MP1 전용 카드 — 이미지 null
 */
import "dotenv/config";
import { prisma } from "../../../src/lib/prisma";

const SET_ID = "jp-tcg-MP1";
const CARD_PACK_ID = "mega-start-deck-100";

// 23장 데이터 (실제 출처에서 수집한 데이터만)
// jaName: MC DB 조회 결과 / Bulbapedia JP이름 교차검증
// image: MC 세트 동일 카드 이미지 URL (pokemon-card.com)
// MP1 전용 카드(019)는 image=null
const CARDS = [
  { number: "001", jaName: "アイアント",        image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/048767_P_AIANTO.jpg" },
  { number: "002", jaName: "ビリジオン",         image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/048769_P_BIRIJION.jpg" },
  { number: "003", jaName: "ニャオハ",           image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/048781_P_NIXYAOHA.jpg" },
  { number: "004", jaName: "ニャローテ",         image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/048782_P_NIXYAROTE.jpg" },
  { number: "005", jaName: "マスカーニャ",       image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/048783_P_MASUKANIXYA.jpg" },
  { number: "006", jaName: "ピカチュウex",       image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/048943_P_PIKACHIXYUUEX.jpg" },
  { number: "007", jaName: "エモンガ",           image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/048969_P_EMONGA.jpg" },
  { number: "008", jaName: "ワンパチ",           image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/048984_P_WANPACHI.jpg" },
  { number: "009", jaName: "パルスワン",         image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/048985_P_PARUSUWAN.jpg" },
  { number: "010", jaName: "ズピカ",             image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/048987_P_ZUPIKA.jpg" },
  { number: "011", jaName: "ハラバリー",         image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/048988_P_HARABARI.jpg" },
  { number: "012", jaName: "カビゴン",           image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/049283_P_KABIGON.jpg" },
  { number: "013", jaName: "きずぐすり",         image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/049359_T_KIZUGUSURI.jpg" },
  { number: "014", jaName: "ハイパーボール",     image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/049367_T_HAIPABORU.jpg" },
  { number: "015", jaName: "ポケパッド",         image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/049378_T_POKEPADDO.jpg" },
  { number: "016", jaName: "ポケモンいれかえ",   image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/049379_T_POKEMONIREKAE.jpg" },
  { number: "017", jaName: "ポケモンキャッチャー", image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/049381_T_POKEMONKIXYATCHIXYA.jpg" },
  { number: "018", jaName: "アイリスの闘志",     image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/049410_T_AIRISUNOTOUSHI.jpg" },
  { number: "019", jaName: "インフルエンサーの紹介", image: null }, // MP1 전용, 공식 사이트 미등록
  { number: "020", jaName: "ウエートレス",       image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/049416_T_UETORESU.jpg" },
  { number: "021", jaName: "ガイ",               image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/049418_T_GAI.jpg" },
  { number: "022", jaName: "ジャッジマン",       image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/049427_T_JIXYAJJIMAN.jpg" },
  { number: "023", jaName: "リーリエの決心",     image: "https://www.pokemon-card.com/assets/images/card_images/large/MC/049445_T_RIRIENOKESSHIN.jpg" },
] as const;

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ MP1 적재 | ${CARDS.length}장 | ${APPLY ? "★APPLY" : "(dry-run)"}`);

  // 1. CardPack 확인
  const pack = await prisma.cardPack.findUnique({ where: { id: CARD_PACK_ID } });
  if (!pack) throw new Error(`CardPack '${CARD_PACK_ID}' not found`);
  console.log(`  CardPack: ${pack.id} (${pack.nameJa})`);

  // 2. Set 존재 확인
  const existing = await prisma.set.findUnique({ where: { id: SET_ID } });
  console.log(`  Set ${SET_ID}: ${existing ? "이미 존재" : "새로 생성"}`);

  // 3. 기존 RegionCard 확인 (멱등 체크)
  const existingCards = await prisma.regionCard.count({ where: { setId: SET_ID } });
  console.log(`  기존 RegionCard: ${existingCards}장`);

  if (!APPLY) {
    console.log("\n(dry-run) 적용하려면 --apply 플래그 추가");
    console.log("생성 예정:");
    console.log(`  Set: id=${SET_ID}, code=MP1, region=JP, cardCount=23`);
    for (const c of CARDS) {
      console.log(`  ${c.number} ${c.jaName} | image=${c.image ? "있음(MC폴백)" : "NULL(MP1전용)"}`);
    }
    await prisma.$disconnect();
    return;
  }

  // 4. Set upsert
  await prisma.set.upsert({
    where: { id: SET_ID },
    create: {
      id: SET_ID,
      name: "スタートデッキ100 バトルコレクション コロちゃおVer.",
      nameKo: "MEGA 「스타트 덱 100 배틀컬렉션 코로차오판」",
      series: "ポケモンカードゲーム MEGA",
      region: "JP",
      code: "MP1",
      releaseDate: new Date("2025-12-19"),
      cardCount: 23,
      cardPackId: CARD_PACK_ID,
      logoUrl: null,
      symbolUrl: null,
    },
    update: {
      name: "スタートデッキ100 バトルコレクション コロちゃおVer.",
      nameKo: "MEGA 「스타트 덱 100 배틀컬렉션 코로차오판」",
      cardCount: 23,
    },
  });
  console.log(`  Set upsert 완료: ${SET_ID}`);

  // 5. 각 카드 upsert (Card + RegionCard)
  let made = 0, updated = 0;
  for (const c of CARDS) {
    const rcId = `${SET_ID}-${c.number}`;
    const lcId = `lc-${SET_ID}-${c.number}`;
    const numInt = parseInt(c.number, 10) || null;

    // LogicalCard upsert
    await prisma.card.upsert({
      where: { id: lcId },
      create: {
        id: lcId,
        primarySetId: SET_ID,
        primaryNumber: c.number,
        primaryNumberInt: numInt,
        pokedexNumbers: [],
        subtypes: [],
        types: [],
      },
      update: {
        primarySetId: SET_ID,
        primaryNumber: c.number,
      },
    });

    // RegionCard upsert
    const existing = await prisma.regionCard.findUnique({ where: { id: rcId } });
    if (existing) {
      await prisma.regionCard.update({
        where: { id: rcId },
        data: {
          name: c.jaName,
          imageSmall: c.image,
          imageLarge: c.image,
          rarityId: null,
        },
      });
      updated++;
    } else {
      await prisma.regionCard.create({
        data: {
          id: rcId,
          cardId: lcId,
          language: "ja",
          region: "JP",
          setId: SET_ID,
          number: c.number,
          numberInt: numInt,
          name: c.jaName,
          imageSmall: c.image,
          imageLarge: c.image,
          rarityId: null,
        },
      });
      made++;
    }
  }
  console.log(`  RegionCard: ${made}건 신규, ${updated}건 갱신`);

  // 6. 검증
  const verify = await prisma.regionCard.findMany({
    where: { setId: SET_ID },
    orderBy: { number: "asc" },
    select: { number: true, name: true, rarityId: true, imageSmall: true },
  });
  const setRow = await prisma.set.findUnique({ where: { id: SET_ID } });

  console.log("\n=== 검증 결과 ===");
  console.log(`Set: id=${setRow?.id} code=${setRow?.code} region=${setRow?.region} releaseDate=${setRow?.releaseDate?.toISOString().slice(0,10)} cardCount=${setRow?.cardCount} cardPackId=${setRow?.cardPackId}`);
  console.log(`RegionCard 수: ${verify.length} (기대 23)`);
  console.log(`rarityId=null 수: ${verify.filter(c => c.rarityId === null).length} (기대 23)`);
  console.log(`image 있음: ${verify.filter(c => c.imageSmall !== null).length}/23 (019 제외 22 기대)`);
  console.log("\n번호+이름 23행:");
  for (const c of verify) {
    console.log(`  ${c.number} | ${c.name} | rarity=${c.rarityId ?? "null"} | image=${c.imageSmall ? "O" : "null"}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
