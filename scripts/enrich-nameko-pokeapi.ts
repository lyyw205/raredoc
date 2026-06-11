/**
 * Pokemon 카드의 LogicalCard.nameKo 를 표준 이름 매핑표(PokeAPI CSV)에서 한국어 이름으로 채움.
 *
 * - 대상: pokedexNumbers 가 있는 LogicalCard (즉 Pokemon 카드)
 * - 출처: data/pokeapi/*.csv (로더 scripts/lib/pokeapi-names.ts). 라이브 API 호출 없음.
 * - 정책: nameKo 가 이미 있으면 덮어쓰지 않음
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getName } from "./lib/pokeapi-names";

async function main() {
  // PMCG1~6 의 Pokemon 카드만
  const cards = await prisma.logicalCard.findMany({
    where: {
      cardPackId: { in: ["og-pmcg1","og-pmcg2","og-pmcg3","og-pmcg4","og-pmcg5","og-pmcg6","og-neo1","og-neo2","og-neo3","og-neo4","og-e1","og-e2","og-e3","og-e4","og-e5","og-vs1","og-web1","og-adv1","og-adv2","og-adv3","og-adv4","og-adv5","og-pcg1","og-pcg2","og-pcg3","og-pcg4","og-pcg5","og-pcg6","og-pcg7","og-pcg8","og-pcg9","og-dp1","og-dp2","og-dp3","og-dp4","og-dp5","og-dp6","og-dp7","og-pl1","og-pl2","og-pl3","og-pl4","og-l1a","og-l1b","og-l2","og-ll","og-l3","og-hgss1","og-hgss2","og-hgss3","og-hgss4","og-hsp","og-col1","og-bwp","og-bw1","og-bw2","og-bw3","og-bw4","og-bw5","og-bw6","og-dv1","og-bw7","og-bw8","og-bw9","og-bw10","og-bw11","og-xy1a","og-xy1b","og-xy2","og-xy3","og-xy4","og-xy5a","og-cp1","og-xy6","og-xy7","og-cp2","og-xy8a","og-xy8b","og-xy9","og-cp3","og-xy10","og-cp4","og-xy11a","og-cp5","og-cp6","og-xyp","og-xy0","og-g1","og-sm0","og-sm1s","og-sm1m","og-sm1+","og-sm2k","og-sm2l","og-sm2+","og-sm3h","og-sm3n","og-sm3+","og-sm4s","og-sm4a","og-sm4+","og-sm5s","og-sm5m","og-sm5+","og-sm6","og-sm6a","og-sm6b","og-sm7","og-sm7a","og-sm7b","og-sm8","og-sm8a","og-sm8b","og-sm9","og-sm9a","og-sm9b","og-sm10","og-sm10b","og-sm11a","og-sm11b","og-sm12","og-sm12a","og-smp2","og-sn10a","og-sn11","og-smp","og-sma",
        "og-s1w","og-s1h","og-s1a","og-s2","og-s2a","og-s3","og-s3a","og-s4","og-s4a","og-s5i","og-s5r","og-s5a","og-s6h","og-s6k","og-s6a","og-s7r","og-s7d","og-s8","og-s8a","og-s8b","og-s9","og-s9a","og-s10b","og-s10d","og-s10p","og-s10a","og-s11a","og-s12","og-s12a","og-swshp","og-swsh35","og-swsh45sv","og-cel25c","og-swsh9tg","og-swsh10tg","og-swsh11tg","og-swsh12tg","og-swsh12pt5gg",
        // SV era
        "sv-base","sv-triplet-beat","sv-paldea-evolved","sv-151","sv-obsidian-flames","sv-raging-surf",
        "sv-paradox-rift","sv-paldean-fates","sv-temporal-forces","sv-crimson-haze","sv-twilight-masquerade",
        "sv-shrouded-fable","og-svk","og-svln","og-svls","sv-stellar-crown","sv-paradise-dragona",
        "sv-surging-sparks","sv-prismatic-evolutions","sv-journey-together","sv-heatwave-arena",
        "sv-destined-rivals","sv-black-bolt-white-flare",
        // MEGA era
        "mega-brave-symphonia","mega-infernox","mega-dream-ex","mega-munikisuzero","mega-ninja-spinner","mega-abyss-eye"] },
      pokedexNumbers: { isEmpty: false },
    },
    select: { id: true, pokedexNumbers: true, nameKo: true, cardPackId: true },
  });
  console.log(`대상 ${cards.length} Pokemon 카드 (이미 채워진 nameKo: ${cards.filter(c => c.nameKo).length})\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const c of cards) {
    if (c.nameKo) { skipped++; continue; }
    const dex = c.pokedexNumbers[0];
    const ko = getName(dex, "ko") ?? null;
    if (!ko) {
      console.log(`  ✗ ${c.id}  dex#${dex}  Korean name 없음`);
      failed++;
      continue;
    }
    await prisma.logicalCard.update({
      where: { id: c.id },
      data: { nameKo: ko },
    });
    updated++;
    if (updated % 50 === 0) console.log(`  ... ${updated} 채움`);
  }

  console.log(`\n── 결과 ──`);
  console.log(`  업데이트: ${updated}`);
  console.log(`  이미 있음 (skip): ${skipped}`);
  console.log(`  실패 (매핑표에 없음): ${failed}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
