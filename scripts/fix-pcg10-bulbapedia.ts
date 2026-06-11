/**
 * og-pcg10 (ワールドチャンピオンズパック, PCG10) 단일 보강 스크립트.
 *
 * 배경: PCG era 일괄 작업에서 PCG10이 누락. 카드 이미지는 tcgplayer-cdn 전부 403,
 * 일본어/일러스트레이터/로고도 없음. WCP 99장은 EX 시대 EN 카드의 일본어 재판이라
 * Bulbapedia 카드 페이지 첫 이미지를 그대로 사용한다.
 *
 * - 카드 99장: Bulbapedia /wiki/{CardName}_(World_Champions_Pack_N) 페이지에서
 *   첫 카드 이미지 URL (small 180px / large 360px) + wgCategories의 "Illus. by ..." 추출
 * - 다운로드 → R2 업로드 → CardLocale.imageSmall/imageLarge + LogicalCard.illustrator 갱신
 * - CardPack: 로고(World_Champions_Pack.jpg) → R2 + Set.logoUrl, nameKo="월드 챔피언스 팩"
 *
 * Run: npx tsx scripts/fix-pcg10-bulbapedia.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const SET_GROUP_ID = "og-pcg10";
const SET_ID = "jp-tcg-PCG10";
const UA = "Mozilla/5.0 (raredoc card data collector / contact: lyyw205@gmail.com)";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});
const BUCKET = process.env.R2_BUCKET!;
const PUB = process.env.R2_PUBLIC_BASE_URL!;

async function curlText(url: string): Promise<string | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", "-A", UA, url], { maxBuffer: 16 * 1024 * 1024 });
    return stdout || null;
  } catch {
    return null;
  }
}
async function curlBin(url: string): Promise<Buffer | null> {
  try {
    const { stdout } = await execFileP(
      "curl",
      ["-sSL", "--max-time", "30", "-A", UA, "-o", "-", url],
      { maxBuffer: 32 * 1024 * 1024, encoding: "buffer" as any },
    );
    return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout as any);
  } catch {
    return null;
  }
}
async function uploadR2(key: string, body: Buffer, contentType: string, force = false): Promise<string> {
  if (!force) {
    try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })); return `${PUB}/${key}`; } catch {}
  }
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
  return `${PUB}/${key}`;
}
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function extractFirstCardImage(html: string): { small: string; large: string; origExt: string } | null {
  // 첫 번째 archives.bulbagarden.net 이미지 (project_logo / wiki UI 제외)
  // WCP 카드 페이지의 첫 카드 이미지는 보통 `/media/upload/X/XX/{CardName}{SetName}{N}.jpg`
  const m = html.match(/archives\.bulbagarden\.net\/media\/upload\/([a-f0-9]\/[a-f0-9]+)\/([A-Z][A-Za-z0-9_-]+\.(jpg|png))/);
  if (!m) return null;
  const path = m[1];
  const filename = m[2];
  const ext = m[3]; // 원본 확장자 유지 (jpg/png) — Bulbapedia thumb 도 동일 확장자
  // 작은 카드 이미지는 ~245px이 카드 리스트 표준, 큰 건 원본 그대로
  return {
    small: `https://archives.bulbagarden.net/media/upload/thumb/${path}/${filename}/245px-${filename}`,
    large: `https://archives.bulbagarden.net/media/upload/${path}/${filename}`,
    origExt: ext,
  };
}
function extractIllustrator(html: string): string | null {
  const m = html.match(/wgCategories"\s*:\s*\[([^\]]+)\]/);
  if (!m) return null;
  const cats = m[1];
  const illus = cats.match(/"Illus\. by ([^"]+)"/);
  return illus ? illus[1] : null;
}
function extractCardListFromSetPage(html: string): { number: number; pageName: string }[] {
  // /wiki/{CardName}_(World_Champions_Pack_{N})
  const re = /\/wiki\/([A-Za-z0-9_%()-]+_\(World_Champions_Pack_(\d+)\))/g;
  const seen = new Map<number, string>();
  let mm;
  while ((mm = re.exec(html)) !== null) {
    const n = parseInt(mm[2], 10);
    if (!seen.has(n)) seen.set(n, mm[1]);
  }
  return [...seen.entries()].sort((a, b) => a[0] - b[0]).map(([number, pageName]) => ({ number, pageName }));
}

async function main() {
  console.log("== PCG10 보강 시작 ==");

  // 1. Set 페이지 fetch → 카드 99장 + 로고 URL
  const setHtml = await curlText("https://bulbapedia.bulbagarden.net/wiki/World_Champions_Pack_(TCG)");
  if (!setHtml) throw new Error("Bulbapedia set page fetch failed");
  const cards = extractCardListFromSetPage(setHtml);
  console.log(`카드 페이지 ${cards.length}개 발견`);

  // 2. 로고 처리
  const logoFile = "World_Champions_Pack.jpg";
  const logoUrl = `https://archives.bulbagarden.net/media/upload/c/c0/${logoFile}`;
  const logoBuf = await curlBin(logoUrl);
  if (logoBuf) {
    const r2LogoUrl = await uploadR2(`${SET_GROUP_ID}/_meta/logo.jpg`, logoBuf, "image/jpeg");
    await prisma.set.update({ where: { id: SET_ID }, data: { logoUrl: r2LogoUrl, symbolUrl: r2LogoUrl } });
    console.log(`로고 OK → ${r2LogoUrl}`);
  } else {
    console.log("로고 다운로드 실패");
  }

  // 3. CardPack nameKo
  await prisma.cardPack.update({ where: { id: SET_GROUP_ID }, data: { nameKo: "월드 챔피언스 팩" } });
  console.log(`CardPack.nameKo = "월드 챔피언스 팩"`);

  // 4. 기존 CardLocale 모두 로딩 (id로 매칭)
  const locales = await prisma.cardLocale.findMany({
    where: { setId: SET_ID, language: "ja" },
    select: { id: true, number: true, numberInt: true, name: true, logicalCardId: true },
  });
  const localeByNumber = new Map<number, typeof locales[number]>();
  for (const l of locales) {
    const n = l.numberInt ?? parseInt(l.number, 10);
    if (!isNaN(n)) localeByNumber.set(n, l);
  }
  console.log(`DB CardLocale ${locales.length}장 (jp)`);

  // 5. 각 카드 페이지 순회
  let ok = 0, fail = 0, skipped = 0;
  const illustratorByLC = new Map<string, string>();

  for (const c of cards) {
    const loc = localeByNumber.get(c.number);
    if (!loc) { skipped++; continue; }

    const cardHtml = await curlText(`https://bulbapedia.bulbagarden.net/wiki/${c.pageName}`);
    await sleep(300); // rate limit
    if (!cardHtml) { fail++; console.log(`  ✗ ${c.number} fetch fail`); continue; }

    const imgs = extractFirstCardImage(cardHtml);
    const illus = extractIllustrator(cardHtml);
    if (!imgs) { fail++; console.log(`  ✗ ${c.number} no image`); continue; }

    // small 다운로드 (245px → 180px → 원본 폴백, 1KB 미만 = placeholder)
    const smallCandidates = [
      imgs.small,
      imgs.small.replace("245px-", "180px-"),
      imgs.large, // 원본 폴백
    ];
    let smallBuf: Buffer | null = null;
    for (const u of smallCandidates) {
      const b = await curlBin(u);
      if (b && b.length >= 1024) { smallBuf = b; break; }
    }
    if (!smallBuf) { fail++; console.log(`  ✗ ${c.number} small fail (모든 후보 실패)`); continue; }

    // large 다운로드 (실패 가능 — small만 있어도 OK)
    const largeBuf = await curlBin(imgs.large);
    const largeOk = largeBuf && largeBuf.length >= 1024;

    // R2 업로드 (force overwrite — 이전 162B placeholder 덮어씀)
    const ct = imgs.origExt === "png" ? "image/png" : "image/jpeg";
    const smallKey = `${SET_GROUP_ID}/jp/small/${SET_ID}/${c.number}.${imgs.origExt}`;
    const largeKey = `${SET_GROUP_ID}/jp/large/${SET_ID}/${c.number}.${imgs.origExt}`;
    const r2Small = await uploadR2(smallKey, smallBuf, ct, true);
    const r2Large = largeOk ? await uploadR2(largeKey, largeBuf!, ct, true) : null;

    // DB 업데이트
    await prisma.cardLocale.update({
      where: { id: loc.id },
      data: {
        imageSmall: r2Small,
        ...(r2Large ? { imageLarge: r2Large } : {}),
      },
    });
    if (illus) illustratorByLC.set(loc.logicalCardId, illus);

    ok++;
    if (ok % 10 === 0) console.log(`  진행: ${ok}/${cards.length} ok=${ok} fail=${fail} skip=${skipped}`);
  }

  // 6. illustrator 일괄 업데이트
  for (const [lcId, name] of illustratorByLC) {
    await prisma.logicalCard.update({ where: { id: lcId }, data: { illustrator: name } });
  }
  console.log(`illustrator 업데이트: ${illustratorByLC.size}장`);

  console.log(`\n── 결과 ──`);
  console.log(`  카드 OK: ${ok}`);
  console.log(`  실패: ${fail}`);
  console.log(`  DB 미존재 (skip): ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
