/**
 * MEP / MEE 이미지 백필 + MEP 신규 카드 추가
 *
 * 1. MEP 신규 8장 (Limitless에 있고 DB에 없는: 071, 074-080) 추가 (additive upsert)
 * 2. MEP 기존 52장 + 신규 8장 = 최대 60장 이미지(LG/SM) 백필
 * 3. MEE 8장 이미지 백필
 * 4. imageSmall은 R2 재호스팅, imageLarge는 Limitless URL hotlink
 *
 * 이미지 URL 패턴: https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/{CODE}/{CODE}_{NNN}_R_EN_LG.png
 *
 * dry-run:  npx tsx scripts/backfill-mep-mee-images.ts
 * 적용:     npx tsx scripts/backfill-mep-mee-images.ts --apply
 * R2 skip:  npx tsx scripts/backfill-mep-mee-images.ts --apply --skip-r2
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, headExists, uploadBuffer, r2PublicUrl, extFromUrl } from "../src/lib/r2";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SKIP_R2 = process.argv.includes("--skip-r2");
const DELAY_MS = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Limitless에만 있고 DB에 없는 신규 MEP 카드 (번호 071, 074-080)
// 이름은 title에서 실제 스크랩한 값
const NEW_MEP_CARDS = [
  { number: "071", name: "Mega Zygarde ex",  supertype: "Pokémon", subtypes: ["Basic", "ex"] },
  { number: "074", name: "Delphox",           supertype: "Pokémon", subtypes: ["Stage2"] },
  { number: "075", name: "Ampharos",          supertype: "Pokémon", subtypes: ["Stage2"] },
  { number: "076", name: "Crobat",            supertype: "Pokémon", subtypes: ["Stage2"] },
  { number: "077", name: "Goodra",            supertype: "Pokémon", subtypes: ["Stage2"] },
  { number: "078", name: "Toxel",             supertype: "Pokémon", subtypes: ["Basic"] },
  { number: "079", name: "Charmeleon",        supertype: "Pokémon", subtypes: ["Stage1"] },
  { number: "080", name: "Fennekin",          supertype: "Pokémon", subtypes: ["Basic"] },
];

// Limitless 이미지 URL 생성
function limitlessLgUrl(code: string, n: string): string {
  const padded = n.padStart(3, "0");
  return `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/${code}/${code}_${padded}_R_EN_LG.png`;
}
function limitlessSmUrl(code: string, n: string): string {
  const padded = n.padStart(3, "0");
  return `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/${code}/${code}_${padded}_R_EN_SM.png`;
}

function toInt(n: string): number { return parseInt(n.replace(/\D/g, ""), 10) || 0; }

async function curlBuffer(url: string): Promise<Buffer> {
  const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "30", "-A", "Mozilla/5.0", url], {
    maxBuffer: 10 * 1024 * 1024,
    encoding: "buffer",
  } as any);
  return stdout as unknown as Buffer;
}

async function uploadSmallToR2(
  setId: string,
  number: string,
  smUrl: string
): Promise<string | null> {
  const ext = extFromUrl(smUrl) || "png";
  // cardPackId=null이므로 setId를 fallback
  const key = r2KeyFor(setId, "en", "small", setId, number, ext);

  try {
    const exists = await headExists(key);
    if (exists) {
      const r2Url = r2PublicUrl(key);
      console.log(`    R2 already exists: ${key}`);
      return r2Url;
    }

    const buf = await curlBuffer(smUrl);
    if (buf.length < 1000) {
      console.warn(`    ⚠ 이미지 다운로드 실패 (size=${buf.length}): ${smUrl}`);
      return null;
    }
    await uploadBuffer(key, buf, "image/png");
    const r2Url = r2PublicUrl(key);
    console.log(`    R2 upload OK: ${key} (${buf.length} bytes)`);
    return r2Url;
  } catch (e: any) {
    console.warn(`    ⚠ R2 업로드 실패: ${e?.message}`);
    return null;
  }
}

async function main() {
  console.log(`\n${APPLY ? "APPLY" : "DRY-RUN"} — MEP/MEE 이미지 백필 + MEP 신규 카드 추가`);
  if (SKIP_R2) console.log("  (--skip-r2: small도 소스 URL로 저장)");

  // ── 1. MEP 신규 카드 추가 ──
  console.log("\n[1] MEP 신규 카드 추가 (071, 074-080)");
  for (const c of NEW_MEP_CARDS) {
    const rcId = `en-tcg-mep-${c.number}`;
    const lgUrl = limitlessLgUrl("MEP", c.number);
    const smUrl = limitlessSmUrl("MEP", c.number);
    console.log(`  ${c.number} ${c.name.padEnd(20)} lg=${lgUrl}`);

    if (APPLY) {
      // Card(LogicalCard) upsert
      await prisma.card.upsert({
        where: { id: rcId },
        create: {
          id: rcId,
          cardPackId: null,
          primarySetId: "en-tcg-mep",
          primaryNumber: c.number,
          primaryNumberInt: toInt(c.number),
          supertype: c.supertype,
          subtypes: c.subtypes,
          types: [],
          pokedexNumbers: [],
          evolvesTo: [],
          rules: [],
        },
        update: {
          supertype: c.supertype,
          subtypes: c.subtypes,
        },
      });

      let finalSmUrl: string | null = smUrl;
      if (!SKIP_R2) {
        finalSmUrl = await uploadSmallToR2("en-tcg-mep", c.number, smUrl);
        await sleep(DELAY_MS);
      }

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
          imageSmall: finalSmUrl ?? smUrl,
        },
        update: {
          name: c.name,
          imageLarge: lgUrl,
          imageSmall: finalSmUrl ?? smUrl,
        },
      });
      console.log(`    upserted RegionCard ${rcId}`);
    }
  }

  // ── 2. MEP 기존 52장 이미지 백필 ──
  console.log("\n[2] MEP 기존 52장 이미지 백필");
  const mepExisting = await prisma.regionCard.findMany({
    where: { setId: "en-tcg-mep" },
    orderBy: { numberInt: "asc" },
  });

  // Limitless에 이미지 있는 번호만 처리
  const LIMITLESS_MEP_NUMS = new Set([
    1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,
    21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,
    64,65,66,67,68,69,70,71,74,75,76,77,78,79,80,
  ]);

  let mepImgOk = 0, mepImgSkip = 0, mepImgFail = 0;
  for (const card of mepExisting) {
    const n = toInt(card.number);
    if (!LIMITLESS_MEP_NUMS.has(n)) {
      console.log(`  #${card.number} — Limitless 미수록, 이미지 건너뜀`);
      mepImgSkip++;
      continue;
    }
    const lgUrl = limitlessLgUrl("MEP", card.number);
    const smUrl = limitlessSmUrl("MEP", card.number);
    console.log(`  #${card.number} ${(card.name ?? "").padEnd(22)} lg=${lgUrl}`);

    if (APPLY) {
      let finalSmUrl: string | null = smUrl;
      if (!SKIP_R2) {
        finalSmUrl = await uploadSmallToR2("en-tcg-mep", card.number, smUrl);
        await sleep(DELAY_MS);
      }

      if (finalSmUrl !== null || SKIP_R2) {
        await prisma.regionCard.update({
          where: { id: card.id },
          data: {
            imageLarge: lgUrl,
            imageSmall: finalSmUrl ?? smUrl,
          },
        });
        mepImgOk++;
      } else {
        mepImgFail++;
      }
    } else {
      mepImgOk++; // dry-run count
    }
  }
  console.log(`  MEP 기존 이미지: ok=${mepImgOk} skip=${mepImgSkip} fail=${mepImgFail}`);

  // ── 3. MEE 8장 이미지 백필 ──
  console.log("\n[3] MEE 8장 이미지 백필");
  const meeCards = await prisma.regionCard.findMany({
    where: { setId: "en-tcg-mee" },
    orderBy: { numberInt: "asc" },
  });

  let meeImgOk = 0, meeImgFail = 0;
  for (const card of meeCards) {
    const lgUrl = limitlessLgUrl("MEE", card.number);
    const smUrl = limitlessSmUrl("MEE", card.number);
    console.log(`  #${card.number} ${(card.name ?? "").padEnd(22)} lg=${lgUrl}`);

    if (APPLY) {
      let finalSmUrl: string | null = smUrl;
      if (!SKIP_R2) {
        finalSmUrl = await uploadSmallToR2("en-tcg-mee", card.number, smUrl);
        await sleep(DELAY_MS);
      }

      if (finalSmUrl !== null || SKIP_R2) {
        await prisma.regionCard.update({
          where: { id: card.id },
          data: {
            imageLarge: lgUrl,
            imageSmall: finalSmUrl ?? smUrl,
          },
        });
        meeImgOk++;
      } else {
        meeImgFail++;
      }
    } else {
      meeImgOk++;
    }
  }
  console.log(`  MEE 이미지: ok=${meeImgOk} fail=${meeImgFail}`);

  // ── 4. Set.cardCount 갱신 ──
  if (APPLY) {
    const finalMepCount = await prisma.regionCard.count({ where: { setId: "en-tcg-mep" } });
    await prisma.set.update({ where: { id: "en-tcg-mep" }, data: { cardCount: finalMepCount } });
    console.log(`\n  en-tcg-mep cardCount → ${finalMepCount}`);
  }

  // ── 결과 요약 ──
  const totalMep = await prisma.regionCard.count({ where: { setId: "en-tcg-mep" } });
  const totalMee = await prisma.regionCard.count({ where: { setId: "en-tcg-mee" } });
  console.log(`\n=== 결과 ===`);
  console.log(`  en-tcg-mep: ${totalMep}장 (기존 52 → 현재 ${totalMep})`);
  console.log(`  en-tcg-mee: ${totalMee}장`);
  if (!APPLY) console.log(`\n적용: npx tsx scripts/backfill-mep-mee-images.ts --apply`);

  await prisma.$disconnect();
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); });
