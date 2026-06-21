/**
 * en-tcg-mep 이미지 보강 + 신규 카드 생성
 *
 * 작업 A: #037–045 이미지 보강 (imageSmall=R2, imageLarge=tcgcollector hotlink)
 * 작업 B: #046–063 신규 18장 생성 (LogicalCard + RegionCard) + 이미지 동일 처리
 * 출처: tcgcollector webp URL (사용자 제공)
 *
 * dry-run:  npx tsx scripts/mep-tcgcollector-046-063.ts
 * 적용:     npx tsx scripts/mep-tcgcollector-046-063.ts --apply
 * R2 skip:  npx tsx scripts/mep-tcgcollector-046-063.ts --apply --skip-r2
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, headExists, uploadBuffer, r2PublicUrl, extFromUrl, contentTypeFor } from "../src/lib/r2";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SKIP_R2 = process.argv.includes("--skip-r2");
const DELAY_MS = 400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── 이미지 URL 맵 (#037–063) ──
const TCG_IMAGES: Record<string, string> = {
  "037": "https://static.tcgcollector.com/content/images/69/68/33/6968331158e7b00dde66ddb72de0bdd40d8ec69f6fdee660adca1b1369ce2e40.webp",
  "038": "https://static.tcgcollector.com/content/images/4b/93/a2/4b93a28a2fe9c561c96d0fafdd645e8cdbc6aee8efb77d2e8ed8fd5dcd10b5ae.webp",
  "039": "https://static.tcgcollector.com/content/images/f2/22/f1/f222f10ed558f546d70289368e2b5c0bebf68a225a90fc2c71c089073534b679.webp",
  "040": "https://static.tcgcollector.com/content/images/e6/ec/d6/e6ecd6640df7e903b2dd66819a66d5df2cebdcb1c05384793509474ccdae63eb.webp",
  "041": "https://static.tcgcollector.com/content/images/68/5b/1d/685b1d58029b2fcb5a1efa99a87d271f92f91d723c8ca1ea59bcc0e869b5440e.webp",
  "042": "https://static.tcgcollector.com/content/images/d2/51/90/d251903a2e5618aa110cbdd84754b3933c3c30ca3e79d1b78dacb19ee3393f1e.webp",
  "043": "https://static.tcgcollector.com/content/images/3e/0c/ee/3e0cee492b6ce598ce30c5e07b4d1632121a51650c50866f1bad425089552165.webp",
  "044": "https://static.tcgcollector.com/content/images/1a/02/85/1a0285ad65e65ddfd4d9ac21a8f496320f465fe4fee0225a6f3679fd6c6214ae.webp",
  "045": "https://static.tcgcollector.com/content/images/53/6f/4d/536f4d3d4109b0564f2711a5b6c3fba80f1228da24e8b83700db766de9a83217.webp",
  "046": "https://static.tcgcollector.com/content/images/2c/cb/60/2ccb6011a39576de82f4bf30c7442d37a141680950cf06d247755b7fa5d4d949.webp",
  "047": "https://static.tcgcollector.com/content/images/38/8c/96/388c968c500943d80bfd0238b3b193f1b918aaff1cd9c87f2c5e21c1a475b042.webp",
  "048": "https://static.tcgcollector.com/content/images/cd/1d/48/cd1d48623aff6a01d0aa5aa4d29787d6f54da8a9771ae061361bb605f6e0b62b.webp",
  "049": "https://static.tcgcollector.com/content/images/07/6f/c0/076fc0ec7cf675bd4730876ebe44ab244877f28376b09c1c897d966a10659a60.webp",
  "050": "https://static.tcgcollector.com/content/images/32/bd/e4/32bde4f9954e50853bf48b7230d93a9c00040ac8f90e4e46eb0aa9a4bc190bb7.webp",
  "051": "https://static.tcgcollector.com/content/images/76/25/a1/7625a183a0a7120cc3dda21356dd3a0f278bfaeee0ad091c43a1a99da378237e.webp",
  "052": "https://static.tcgcollector.com/content/images/09/dc/68/09dc682558ec03080ad0975f4e450e33b0212c1759f0b02d355e2993d83333bc.webp",
  "053": "https://static.tcgcollector.com/content/images/0a/7b/72/0a7b72ee91c01e166731a4daa7cd13c6e973fd1e2bfdb1574508a5d2be4f6882.webp",
  // #054: 공백 제거
  "054": "https://static.tcgcollector.com/content/images/9e/dd/91/9edd913be1ed2032d01a652db22f26c8fd5c609a132acd9fb546f2799ec0a6e1.webp",
  "055": "https://static.tcgcollector.com/content/images/41/3f/aa/413faa60dd1079901a094874a37d5987b54384788ca8bd7e0f3a675ba4c80211.webp",
  "056": "https://static.tcgcollector.com/content/images/b3/7d/94/b37d941db9cd1b81f16f5093b4d60e6b2af13b8f3ded3b9fd384ce42a91acda1.webp",
  "057": "https://static.tcgcollector.com/content/images/20/eb/70/20eb70a81fda26eaac3d3e3a8467f8d48cbe0898d8c023ffbd18767accc0a07c.webp",
  "058": "https://static.tcgcollector.com/content/images/78/0f/1b/780f1b1c27872aec47e1901b9e6e4047eb476cb408067985ad4640079d18df5f.webp",
  "059": "https://static.tcgcollector.com/content/images/e4/67/51/e467512598b5cee7292960177c6ebc12e77f3d6ab9115c0952ec8c1ad0b6edbf.webp",
  "060": "https://static.tcgcollector.com/content/images/c8/ff/1c/c8ff1c16ac373a3fa139bb8f5e4c4c22e458727f2d4c1f770025f7a11e62f607.webp",
  "061": "https://static.tcgcollector.com/content/images/28/d4/c6/28d4c6dbadee916c1185122e4ce96b1a5584452e0e85495c133dfc9f015ba6e7.webp",
  "062": "https://static.tcgcollector.com/content/images/cc/6a/33/cc6a33efa2a8cf3394f2ee7df6b6122306a53163d54e03ba6712f17856bb658c.webp",
  "063": "https://static.tcgcollector.com/content/images/08/74/d6/0874d67be78a4bd9825e4edc88000836a3b9c28417efbc04d0a2dadf5e48f668.webp",
};

// ── 신규 18장 데이터 (B 작업) — dex는 pokeapi-names.ts resolveCardDexes('en') 결과 ──
const NEW_CARDS = [
  { number: "046", name: "Chikorita",  types: ["Grass"],  dex: [152] },
  { number: "047", name: "Cyndaquil",  types: ["Fire"],   dex: [155] },
  { number: "048", name: "Totodile",   types: ["Water"],  dex: [158] },
  { number: "049", name: "Snivy",      types: ["Grass"],  dex: [495] },
  { number: "050", name: "Tepig",      types: ["Fire"],   dex: [498] },
  { number: "051", name: "Oshawott",   types: ["Water"],  dex: [501] },
  { number: "052", name: "Grookey",    types: ["Grass"],  dex: [810] },
  { number: "053", name: "Scorbunny",  types: ["Fire"],   dex: [813] },
  { number: "054", name: "Sobble",     types: ["Water"],  dex: [816] },
  { number: "055", name: "Treecko",    types: ["Grass"],  dex: [252] },
  { number: "056", name: "Torchic",    types: ["Fire"],   dex: [255] },
  { number: "057", name: "Mudkip",     types: ["Water"],  dex: [258] },
  { number: "058", name: "Chespin",    types: ["Grass"],  dex: [650] },
  { number: "059", name: "Fennekin",   types: ["Fire"],   dex: [653] },
  { number: "060", name: "Froakie",    types: ["Water"],  dex: [656] },
  { number: "061", name: "Sprigatito", types: ["Grass"],  dex: [906] },
  { number: "062", name: "Fuecoco",    types: ["Fire"],   dex: [909] },  // Fire (주의: 표 오타 수정)
  { number: "063", name: "Quaxly",     types: ["Water"],  dex: [912] },
];

// A 작업 대상 번호
const IMG_ONLY_NUMS = ["037","038","039","040","041","042","043","044","045"];

function toInt(n: string): number { return parseInt(n.replace(/\D/g, ""), 10) || 0; }

async function curlBuffer(url: string): Promise<Buffer> {
  const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "30", "-A", "Mozilla/5.0", url], {
    maxBuffer: 10 * 1024 * 1024,
    encoding: "buffer",
  } as any);
  return stdout as unknown as Buffer;
}

async function uploadSmallToR2(
  number: string,
  lgUrl: string,
): Promise<string | null> {
  const ext = extFromUrl(lgUrl) || "webp";
  // cardPackId=null → setId "en-tcg-mep" 를 fallback으로 사용 (기존 MEP 관례와 동일)
  const key = r2KeyFor("en-tcg-mep", "en", "small", "en-tcg-mep", number, ext);

  try {
    const exists = await headExists(key);
    if (exists) {
      console.log(`    R2 already exists: ${key}`);
      return r2PublicUrl(key);
    }

    const buf = await curlBuffer(lgUrl);
    if (buf.length < 1000) {
      console.warn(`    WARN 이미지 다운로드 실패 (size=${buf.length}): ${lgUrl}`);
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
  console.log(`\n${APPLY ? "APPLY" : "DRY-RUN"} — en-tcg-mep 이미지보강(A) + 신규생성(B)`);
  if (SKIP_R2) console.log("  (--skip-r2: imageSmall도 tcgcollector URL 사용)");

  // ── 작업 A: #037–045 이미지 보강 ──
  console.log("\n[A] #037–045 이미지 보강 (9장)");
  let aOk = 0, aFail = 0;
  for (const num of IMG_ONLY_NUMS) {
    const rcId = `en-tcg-mep-${num}`;
    const lgUrl = TCG_IMAGES[num];
    if (!lgUrl) { console.warn(`  ${num} — URL 없음, 건너뜀`); continue; }

    // 현재 이미지 상태 확인
    const existing = await prisma.regionCard.findUnique({
      where: { id: rcId },
      select: { id: true, name: true, imageSmall: true, imageLarge: true },
    });
    if (!existing) { console.warn(`  ${num} — DB에 없음(예상외), 건너뜀`); continue; }

    const hasImg = existing.imageSmall || existing.imageLarge;
    console.log(`  ${num} ${(existing.name ?? "").padEnd(14)} lg=${lgUrl.slice(0, 60)}...`);

    if (APPLY) {
      let smUrl: string | null = lgUrl;
      if (!SKIP_R2) {
        smUrl = await uploadSmallToR2(num, lgUrl);
        await sleep(DELAY_MS);
      }
      if (smUrl !== null || SKIP_R2) {
        await prisma.regionCard.update({
          where: { id: rcId },
          data: {
            imageLarge: lgUrl,
            imageSmall: smUrl ?? lgUrl,
          },
        });
        aOk++;
        console.log(`    updated ${rcId}`);
      } else {
        aFail++;
      }
    } else {
      aOk++;
    }
  }
  console.log(`  A 완료: ok=${aOk} fail=${aFail}`);

  // ── 작업 B: #046–063 신규 18장 생성 ──
  console.log("\n[B] #046–063 신규 18장 생성");
  const rarityId = "cmpp4wyvw001hyjurzznnvic7"; // Promo rarityId (사용자 제공)
  let bOk = 0, bFail = 0;

  for (const c of NEW_CARDS) {
    const rcId = `en-tcg-mep-${c.number}`;
    const lgUrl = TCG_IMAGES[c.number];
    if (!lgUrl) { console.warn(`  ${c.number} — URL 없음, 건너뜀`); continue; }

    console.log(`  ${c.number} ${c.name.padEnd(12)} types=${JSON.stringify(c.types)} dex=${JSON.stringify(c.dex)} lg=${lgUrl.slice(0, 60)}...`);

    if (APPLY) {
      // LogicalCard(card) upsert
      await prisma.card.upsert({
        where: { id: rcId },
        create: {
          id: rcId,
          cardPackId: null,
          primarySetId: "en-tcg-mep",
          primaryNumber: c.number,
          primaryNumberInt: toInt(c.number),
          supertype: "Pokémon",
          subtypes: ["Basic"],
          types: c.types,
          pokedexNumbers: c.dex,
          rarityId: rarityId,
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
          supertype: "Pokémon",
          subtypes: ["Basic"],
          types: c.types,
          pokedexNumbers: c.dex,
          rarityId: rarityId,
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
          setId: "en-tcg-mep",
          number: c.number,
          numberInt: toInt(c.number),
          name: c.name,
          imageLarge: lgUrl,
          imageSmall: smUrl ?? lgUrl,
        },
        update: {
          name: c.name,
          imageLarge: lgUrl,
          imageSmall: smUrl ?? lgUrl,
        },
      });

      bOk++;
      console.log(`    upserted ${rcId} (R2 small: ${smUrl ? "OK" : "fallback-hotlink"})`);
    } else {
      bOk++;
    }
  }
  console.log(`  B 완료: ok=${bOk} fail=${bFail}`);

  // ── Set.cardCount 갱신 ──
  if (APPLY) {
    const finalCount = await prisma.regionCard.count({ where: { setId: "en-tcg-mep" } });
    await prisma.set.update({
      where: { id: "en-tcg-mep" },
      data: { cardCount: finalCount },
    });
    console.log(`\n  en-tcg-mep cardCount → ${finalCount}`);
  }

  // ── 검증 요약 ──
  const totalCount = await prisma.regionCard.count({ where: { setId: "en-tcg-mep" } });
  const withImg = await prisma.regionCard.count({
    where: { setId: "en-tcg-mep", imageLarge: { not: null } },
  });
  console.log(`\n=== 최종 검증 ===`);
  console.log(`  en-tcg-mep 총 장수: ${totalCount}`);
  console.log(`  imageLarge 보유: ${withImg}`);
  if (!APPLY) {
    console.log(`\n  [DRY-RUN] 적용: npx tsx scripts/mep-tcgcollector-046-063.ts --apply`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); });
