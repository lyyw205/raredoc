/**
 * GGエンド (jp-tcg-sn10a, og-sn10a) #69 くろおび(골드 UR 시크릿) 수집(미수집→생성).
 *
 * 배경: GG End 현재 #68 까지. #69 くろおび(블랙벨트, Trainer/Item, 골드 UR 시크릿)가 RegionCard 미수집.
 *   ※ 일반판 くろおび 는 이미 #047 에 있음. #69 는 그 시크릿(골드 UR) 버전.
 *   공식(pokemon-card.com pg=659)은 일반판(36587)만 있고 골드 UR 시크릿은 검색DB 미수록, Limitless 도 없음
 *   → 사용자 제공 tcgcollector 이미지 사용(이미지로 #69 골드 UR 확인 완료, 320×451).
 *
 * 레어도: #67 タッグスイッチ·#68 リセットスタンプ 과 동일 Ultra Rare(cmpp4wyzt001wyjuriy5esk1h).
 *
 * 동작: 제공 이미지 다운 → webp large(q90)+245 small(q80) → R2 og-sn10a/ja/{size}/jp-tcg-sn10a/069.webp
 *   → Card(LC) + RegionCard 생성. cardCount 62→63.
 *
 * dry: npx tsx scripts/collect-ggend-69.ts
 * 적용: npx tsx scripts/collect-ggend-69.ts --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-sn10a", PACK = "og-sn10a";
const NUMBER = "069", NUMINT = 69, NAME = "くろおび";
const LC_ID = `lc-orphan-${SET}-69`, RC_ID = `${SET}-69`;
const UR_RARITY = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (#67/#68 동일)
const IMG = "https://static.tcgcollector.com/content/images/0e/03/92/0e0392bc7cd9317cd5fea257edf4746ba28554ed39aa01e7d4ab785c1d65ec02.jpg";

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 3000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-ggend-69" });
  const largeKey = r2KeyFor(PACK, "ja", "large", SET, NUMBER, "webp");
  const smallKey = r2KeyFor(PACK, "ja", "small", SET, NUMBER, "webp");
  console.log(`${APPLY ? "APPLY" : "DRY"} collect-ggend-69 | #${NUMBER} ${NAME} (Trainer/Item, UR) → ${largeKey}`);
  if (!APPLY) { console.log("적용: --apply"); return; }
  const buf = await dl(IMG);
  const meta = await sharp(buf).metadata();
  console.log(`  원본 ${meta.width}x${meta.height} ${buf.length}B`);
  await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
  await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
  if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error("R2 verify 실패");
  await prisma.card.upsert({
    where: { id: LC_ID },
    create: { id: LC_ID, primarySetId: SET, primaryNumber: NUMBER, primaryNumberInt: NUMINT, supertype: "Trainer", subtypes: ["Item"], types: [], pokedexNumbers: [], rarityId: UR_RARITY },
    update: { supertype: "Trainer", subtypes: ["Item"], rarityId: UR_RARITY },
  });
  await prisma.regionCard.upsert({
    where: { id: RC_ID },
    create: { id: RC_ID, cardId: LC_ID, setId: SET, number: NUMBER, numberInt: NUMINT, name: NAME, region: "JP", language: "ja", imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey), rarityId: UR_RARITY },
    update: { name: NAME, imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey), rarityId: UR_RARITY },
  });
  const cnt = await prisma.regionCard.count({ where: { setId: SET } });
  await prisma.set.update({ where: { id: SET }, data: { cardCount: cnt } });
  console.log(`  ✓ ${RC_ID} 생성 | jp-tcg-sn10a cardCount → ${cnt}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
