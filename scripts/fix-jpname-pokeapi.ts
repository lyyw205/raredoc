/**
 * PMCG1~6 Pokemon 카드의 CardLocale.name (일본어) 을 PokeAPI 정식 일본명으로 교체.
 *
 * 배경: tcgcsv/tcgdex 의 1996년 카드 JP 이름 데이터에 오류 다수
 *   - "ブルバサウルス" (영문 음역) → 정식 "フシギダネ"
 *   - "雑草" (오번역) → 정식 "ビードル"
 *   - "mewtwo", "Vulpix" (영문 그대로) → 정식 "ミュウツー", "ロコン"
 * → 1996년 일본 정식 게임이 이미 정한 일본명을 dex# 기반으로 일괄 적용.
 *
 * - 대상: pokedexNumbers 가 있는 LogicalCard 의 연결된 CardLocale (ja language).
 * - 출처: 표준 이름 매핑표 data/pokeapi/*.csv (로더의 ja = ja-hrkt 카타카나 = TCG 표준 일본명).
 * - 정책: 기존 JP 이름이 표준 일본명과 다르면 교체. 이전 값은 diff 로 로그.
 * - Trainer/Energy 는 미대상 (dex# 없음, 각 카드 고유 이름).
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getName } from "./lib/pokeapi-names";

async function main() {
  // PMCG1~6 의 Pokemon LogicalCard + 그 ja locale
  const cards = await prisma.logicalCard.findMany({
    where: {
      setGroupId: { in: ["og-pmcg1","og-pmcg2","og-pmcg3","og-pmcg4","og-pmcg5","og-pmcg6","og-neo1","og-neo2","og-neo3","og-neo4","og-e1","og-e2","og-e3","og-e4","og-e5","og-vs1","og-web1","og-adv1","og-adv2","og-adv3","og-adv4","og-adv5","og-pcg1","og-pcg2","og-pcg3","og-pcg4","og-pcg5","og-pcg6","og-pcg7","og-pcg8","og-pcg9","og-dp1","og-dp2","og-dp3","og-dp4","og-dp5","og-dp6","og-dp7","og-pl1","og-pl2","og-pl3","og-pl4","og-l1a","og-l1b","og-l2","og-ll","og-l3","og-hgss1","og-hgss2","og-hgss3","og-hgss4","og-hsp","og-col1","og-bwp","og-bw1","og-bw2","og-bw3","og-bw4","og-bw5","og-bw6","og-dv1","og-bw7","og-bw8","og-bw9","og-bw10","og-bw11","og-xy1a","og-xy1b","og-xy2","og-xy3","og-xy4","og-xy5a","og-cp1","og-xy6","og-xy7","og-cp2","og-xy8a","og-xy8b","og-xy9","og-cp3","og-xy10","og-cp4","og-xy11a","og-cp5","og-cp6","og-xyp","og-xy0","og-g1","og-sm0","og-sm1s","og-sm1m","og-sm1+","og-sm2k","og-sm2l","og-sm2+","og-sm3h","og-sm3n","og-sm3+","og-sm4s","og-sm4a","og-sm4+","og-sm5s","og-sm5m","og-sm5+","og-sm6","og-sm6a","og-sm6b","og-sm7","og-sm7a","og-sm7b","og-sm8","og-sm8a","og-sm8b","og-sm9","og-sm9a","og-sm9b","og-sm10","og-sm10b","og-sm11a","og-sm11b","og-sm12","og-sm12a","og-smp2","og-sn10a","og-sn11","og-smp","og-sma",
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
    select: {
      id: true,
      pokedexNumbers: true,
      locales: { where: { language: "ja" }, select: { id: true, name: true } },
    },
  });
  console.log(`대상 ${cards.length} Pokemon LogicalCard\n`);

  let changed = 0;
  let alreadyCorrect = 0;
  let noJaLocale = 0;
  let noMapping = 0;
  const changes: { id: string; before: string; after: string; dex: number }[] = [];

  for (const c of cards) {
    if (c.locales.length === 0) { noJaLocale++; continue; }
    const ja = c.locales[0];
    const dex = c.pokedexNumbers[0];
    const correct = getName(dex, "ja") ?? null;
    if (!correct) { noMapping++; continue; }
    if (ja.name === correct) { alreadyCorrect++; continue; }
    changes.push({ id: ja.id, before: ja.name, after: correct, dex });
    await prisma.cardLocale.update({
      where: { id: ja.id },
      data: { name: correct },
    });
    changed++;
  }

  console.log(`── 결과 ──`);
  console.log(`  변경: ${changed}`);
  console.log(`  이미 정확: ${alreadyCorrect}`);
  console.log(`  ja locale 없음: ${noJaLocale}`);
  console.log(`  매핑표에 없음: ${noMapping}`);

  console.log(`\n── 샘플 변경 (앞 20건) ──`);
  for (const ch of changes.slice(0, 20)) {
    console.log(`  ${ch.id}  dex#${String(ch.dex).padStart(3,"0")}  "${ch.before}" → "${ch.after}"`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
