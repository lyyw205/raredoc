/**
 * Scarlet & Violet Energies (sve, EN 단독) #017-024 기본에너지 8종 수집(미수집→생성).
 *
 * 배경: SVE 세트는 기본에너지 8종이 3번 프린트(#1-8 / #9-16 / #17-24)되어 총 24장.
 *   DB엔 #1-16만 있고 #17-024(세 번째 프린트) 미수집. pokemontcg.io는 16장만 보유,
 *   TCGdex는 #17-24 메타데이터만(이미지 없음). → 이미지는 Limitless(검증된 갭필 소스) 사용.
 * 출처: 메타=TCGdex(타입순 草炎水雷超闘悪鋼=#017-024), 이미지=Limitless TPCI CDN
 *   (SVE_0NN_R_EN.png = 풀해상도). 이름은 기존 DB 컨벤션 "Basic <Type> Energy".
 *
 * 동작(카드별): Limitless 풀해상도 PNG 다운 → large(원본 png)+small(245px png)
 *   → R2 sve/en/{size}/sve/{n}.png (기존 SVE 키 컨벤션) → Card(lc-orphan-sve-{n}) + RegionCard(sve-{n}) upsert.
 *   SVE 는 cardPackId=null(비잠금) → 매핑가드 불필요. 끝에 Set.cardCount = 실 RegionCard 수.
 *
 * dry: npx tsx scripts/collect-sve-energy-1724.ts
 * 적용: npx tsx scripts/collect-sve-energy-1724.ts --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SET = "sve";
const CDN = "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/SVE";

// 타입순 #017-024 (= #1-8, #9-16 과 동일 순서). 이름은 기존 DB 컨벤션 "Basic … Energy".
const TYPES = ["Grass", "Fire", "Water", "Lightning", "Psychic", "Fighting", "Darkness", "Metal"];
const CARDS = TYPES.map((t, i) => {
  const num = 17 + i; // 17..24
  const nnn = String(num).padStart(3, "0"); // 017..024
  return { number: String(num), numInt: num, name: `Basic ${t} Energy`, file: `SVE_${nnn}_R_EN.png` };
});

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer;
  if (b.length < 5000) throw new Error(`small ${b.length}`);
  return b;
}

async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY"} collect-sve-energy-1724 | ${CARDS.length}장 신규 (SVE #017-024, EN 단독)`);
  let ok = 0;
  for (const c of CARDS) {
    const lcId = `lc-orphan-${SET}-${c.number}`;
    const rcId = `${SET}-${c.number}`;
    const largeKey = r2KeyFor(SET, "en", "large", SET, c.number, "png"); // sve/en/large/sve/{n}.png
    const smallKey = r2KeyFor(SET, "en", "small", SET, c.number, "png"); // sve/en/small/sve/{n}.png
    console.log(`  #${c.number} ${c.name.padEnd(22)} → LC ${lcId} | ${largeKey} | src ${c.file}`);
    if (!APPLY) continue;
    const buf = await dl(`${CDN}/${c.file}`);
    await uploadBuffer(largeKey, await sharp(buf).png().toBuffer(), "image/png");
    await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).png().toBuffer(), "image/png");
    if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error(`#${c.number} R2 verify 실패`);
    await prisma.card.upsert({
      where: { id: lcId },
      create: { id: lcId, primarySetId: SET, primaryNumber: c.number, primaryNumberInt: c.numInt, supertype: "Energy", subtypes: ["Basic"], types: [], pokedexNumbers: [], rarityId: null },
      update: { supertype: "Energy", subtypes: ["Basic"], types: [] },
    });
    await prisma.regionCard.upsert({
      where: { id: rcId },
      create: { id: rcId, cardId: lcId, setId: SET, number: c.number, numberInt: c.numInt, name: c.name, region: "EN", language: "en", imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey), rarityId: null },
      update: { name: c.name, imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) },
    });
    console.log(`    ✓ ${rcId}`);
    ok++;
  }
  if (APPLY) {
    const cnt = await prisma.regionCard.count({ where: { setId: SET } });
    await prisma.set.update({ where: { id: SET }, data: { cardCount: cnt } });
    console.log(`\n생성 ${ok}/${CARDS.length} | sve cardCount → ${cnt}`);
  } else {
    console.log(`\n[dry-run] 변경 없음. --apply 로 실행.`);
  }
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
