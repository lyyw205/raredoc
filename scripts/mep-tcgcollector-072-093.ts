/**
 * en-tcg-mep 신규 8장 생성 (#072, #073, #082–#085, #092, #093)
 *
 * dry-run:  npx tsx scripts/mep-tcgcollector-072-093.ts
 * 적용:     npx tsx scripts/mep-tcgcollector-072-093.ts --apply
 * R2 skip:  npx tsx scripts/mep-tcgcollector-072-093.ts --apply --skip-r2
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
const DELAY_MS = 400;
const SET_ID = "en-tcg-mep";
const RARITY_ID = "cmpp4wyvw001hyjurzznnvic7"; // Promo

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── 카드 데이터 ──
// subtypes 컨벤션: 기존 MEP Mega ex = 진화단계 + "ex" (e.g. ["Stage2","ex"])
// Mega Clefable ex: Clefable=Stage2, Mega Gengar ex: Gengar=Stage2
const NEW_CARDS = [
  {
    number: "072",
    name: "Mega Clefable ex",
    supertype: "Pokémon",
    subtypes: ["Stage2", "ex"],
    types: ["Psychic"],
    dex: [36],
    imageUrl:
      "https://static.tcgcollector.com/content/images/09/5c/89/095c89479b56c0ad1fd5436783bbe93ba678a2aa0af6f4fc41e0278342cf3c1e.webp",
  },
  {
    number: "073",
    name: "Mega Gengar ex",
    supertype: "Pokémon",
    subtypes: ["Stage2", "ex"],
    types: ["Darkness"],
    dex: [94],
    imageUrl:
      "https://static.tcgcollector.com/content/images/c3/a8/ca/c3a8ca1b7a2df46d06dfed53b552234cb1667f11b21ab0a896bd82799eec837b.webp",
  },
  {
    number: "082",
    name: "Miraidon",
    supertype: "Pokémon",
    subtypes: ["Basic"],
    types: ["Lightning"],
    dex: [1008],
    imageUrl:
      "https://static.tcgcollector.com/content/images/47/69/4c/47694c13b1174a311647f164ceeaf62b9b27003609ea2cf8f5230b7ce25d681a.webp",
  },
  {
    number: "083",
    name: "Slowbro",
    supertype: "Pokémon",
    subtypes: ["Stage1"],
    types: ["Psychic"],
    dex: [80],
    imageUrl:
      "https://static.tcgcollector.com/content/images/62/ee/47/62ee47f9d3de6dc2f7ad508fd8eaf12c686aa4b4b9a6460422927cb27a203fa4.webp",
  },
  {
    number: "084",
    name: "Dhelmise",
    supertype: "Pokémon",
    subtypes: ["Basic"],
    types: ["Psychic"],
    dex: [781],
    // 공백 제거한 URL
    imageUrl:
      "https://static.tcgcollector.com/content/images/3b/8c/4d/3b8c4d87f8fcd2b7b8d42019d64ac12921ad2f8954ef414c2edd4f7cf5dd0be8.webp",
  },
  {
    number: "085",
    name: "Bastiodon",
    supertype: "Pokémon",
    subtypes: ["Stage2"],
    types: ["Metal"],
    dex: [411],
    imageUrl:
      "https://static.tcgcollector.com/content/images/7e/d1/24/7ed124173851fd4450c98e7a56a3b7c80a75af37af303d14894e11549dabf3aa.webp",
  },
  {
    number: "092",
    name: "Paradise Resort",
    supertype: "Trainer",
    subtypes: ["Stadium"],
    types: [] as string[],
    dex: [] as number[],
    imageUrl:
      "https://static.tcgcollector.com/content/images/a9/71/cb/a971cba625db58900669cd9cce483a9e9c4ed889ab200d40fcdfde03ca0447e9.webp",
  },
  {
    number: "093",
    name: "Pikachu",
    supertype: "Pokémon",
    subtypes: ["Basic"],
    types: ["Lightning"],
    dex: [25],
    imageUrl:
      "https://static.tcgcollector.com/content/images/9d/b7/a5/9db7a51af4c729807c969548f74034fa809f38b3bb58c378b404f119b23bbc08.webp",
  },
] as const;

function toInt(n: string): number {
  return parseInt(n.replace(/\D/g, ""), 10) || 0;
}

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
      console.warn(
        `    WARN 이미지 다운로드 실패 (size=${buf.length}): ${lgUrl}`,
      );
      return null;
    }
    const ct = contentTypeFor(ext);
    await uploadBuffer(key, buf, ct);
    const r2Url = r2PublicUrl(key);
    console.log(`    R2 upload OK: ${key} (${buf.length} bytes)`);
    return r2Url;
  } catch (e: any) {
    console.warn(`    WARN R2 업로드 실패: ${e?.message}`);
    return null;
  }
}

async function main() {
  console.log(
    `\n${APPLY ? "APPLY" : "DRY-RUN"} — en-tcg-mep 신규 8장 생성 (#072/#073/#082-085/#092/#093)`,
  );
  if (SKIP_R2) console.log("  (--skip-r2: imageSmall도 tcgcollector URL 사용)");

  // ── 사전 충돌 체크 ──
  console.log("\n[PRE-CHECK] 중복 번호 확인");
  const nums = NEW_CARDS.map((c) => c.number);
  const existing = await prisma.regionCard.findMany({
    where: { setId: SET_ID, number: { in: nums } },
    select: { id: true, number: true, name: true },
  });
  if (existing.length > 0) {
    console.error(
      "  ERROR: 이미 존재하는 번호 발견 →",
      JSON.stringify(existing),
    );
    if (APPLY) {
      console.error("  APPLY 중단.");
      await prisma.$disconnect();
      process.exit(1);
    }
  } else {
    console.log("  OK: 중복 없음");
  }

  // ── 신규 생성 ──
  console.log(`\n[MAIN] 8장 생성`);
  let ok = 0,
    fail = 0;

  for (const c of NEW_CARDS) {
    const rcId = `${SET_ID}-${c.number}`;
    const lgUrl = c.imageUrl;

    console.log(
      `  ${c.number} ${c.name.padEnd(20)} super=${c.supertype} subtypes=${JSON.stringify(c.subtypes)} types=${JSON.stringify(c.types)} dex=${JSON.stringify(c.dex)}`,
    );
    console.log(`    image: ${lgUrl.slice(0, 70)}...`);

    if (APPLY) {
      // LogicalCard(card) upsert
      await prisma.card.upsert({
        where: { id: rcId },
        create: {
          id: rcId,
          cardPackId: null,
          primarySetId: SET_ID,
          primaryNumber: c.number,
          primaryNumberInt: toInt(c.number),
          supertype: c.supertype,
          subtypes: [...c.subtypes],
          types: [...c.types],
          pokedexNumbers: [...c.dex],
          rarityId: RARITY_ID,
          hp: null,
          retreatCost: null,
          weakness: null,
          resistance: null,
          illustrator: null,
          attacks: null,
          abilities: null,
          evolvesTo: [],
          rules: [],
        },
        update: {
          supertype: c.supertype,
          subtypes: [...c.subtypes],
          types: [...c.types],
          pokedexNumbers: [...c.dex],
          rarityId: RARITY_ID,
        },
      });

      let smUrl: string | null = lgUrl;
      if (!SKIP_R2) {
        smUrl = await uploadSmallToR2(c.number, lgUrl);
        await sleep(DELAY_MS);
      }

      // RegionCard upsert
      await prisma.regionCard.upsert({
        where: { id: rcId },
        create: {
          id: rcId,
          cardId: rcId,
          language: "en",
          region: "EN",
          setId: SET_ID,
          number: c.number,
          numberInt: toInt(c.number),
          name: c.name,
          rarityId: RARITY_ID,
          imageLarge: lgUrl,
          imageSmall: smUrl ?? lgUrl,
        },
        update: {
          name: c.name,
          rarityId: RARITY_ID,
          imageLarge: lgUrl,
          imageSmall: smUrl ?? lgUrl,
        },
      });

      ok++;
      console.log(
        `    upserted ${rcId} (R2 small: ${smUrl && smUrl !== lgUrl ? "OK" : smUrl ? "same-as-large(skip-r2)" : "fallback-hotlink"})`,
      );
    } else {
      ok++;
      console.log(`    [DRY] would create ${rcId}`);
    }
  }

  // ── Set.cardCount 갱신 ──
  if (APPLY) {
    const finalCount = await prisma.regionCard.count({
      where: { setId: SET_ID },
    });
    await prisma.set.update({
      where: { id: SET_ID },
      data: { cardCount: finalCount },
    });
    console.log(`\n  ${SET_ID} cardCount → ${finalCount}`);
  }

  // ── 최종 검증 ──
  const totalCount = await prisma.regionCard.count({ where: { setId: SET_ID } });
  const withSmall = await prisma.regionCard.count({
    where: { setId: SET_ID, imageSmall: { not: null } },
  });
  const withRarity = await prisma.regionCard.count({
    where: { setId: SET_ID, rarityId: { not: null } },
  });
  const dupeCheck = await prisma.regionCard.groupBy({
    by: ["number"],
    where: { setId: SET_ID },
    having: { number: { _count: { gt: 1 } } },
  });

  console.log(`\n=== 최종 검증 ===`);
  console.log(`  ${SET_ID} 총 RegionCard 장수: ${totalCount}`);
  console.log(`  imageSmall 보유: ${withSmall}`);
  console.log(`  rarityId 보유: ${withRarity}`);
  console.log(`  중복 번호: ${dupeCheck.length === 0 ? "없음 (OK)" : JSON.stringify(dupeCheck)}`);
  console.log(`  이번 작업: ok=${ok} fail=${fail}`);

  if (!APPLY) {
    console.log(
      `\n  [DRY-RUN 완료] 실제 적용: npx tsx scripts/mep-tcgcollector-072-093.ts --apply`,
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FAIL:", e?.message ?? e);
  process.exit(1);
});
