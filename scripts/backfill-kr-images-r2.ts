/**
 * backfill-kr-images-r2 — 깨진(404) KR 카드 이미지를 R2 에 재업로드
 *
 * 배경: KR 이미지는 pokemonkorea 원본을 R2 로 미러(imageSmall/imageLarge = R2 URL,
 *   small=large 동일 원본 — apply-kr-official 참조). 과거 R2 백필이 일부 카드를
 *   누락(객체 부재 → 페이지 이미지 깨짐)한 경우가 있다. 이 스크립트는 지정 KR 세트의
 *   전 카드 imageSmall/imageLarge 를 HEAD 체크해 404/NULL 인 것만 원본에서 받아 R2 에 올린다.
 *   DB 는 건드리지 않는다(URL 은 이미 정확, 객체만 없음). ERR(전송 일시오류)은 깨짐으로 보지 않음.
 *
 * 원본 URL: https://cards.image.pokemonkorea.co.kr/data/wmimages/{DIR}/{CODE}/{CODE}_{NNN}.png
 *   (NNN = 3자리 zero-pad). R2 키는 기존 imageSmall/imageLarge URL 의 base 이후 경로 그대로 사용.
 *
 * 신규 세트는 SETMAP 에 { krSetId: { dir, code } } 추가.
 *
 * Run:  npx tsx scripts/backfill-kr-images-r2.ts kr-sv1s kr-sv1v [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { uploadBuffer, contentTypeFor } from "../src/lib/r2";

// krSetId → pokemonkorea 원본 디렉터리/접두 코드
const SETMAP: Record<string, { dir: string; code: string }> = {
  "kr-sv1s": { dir: "SV", code: "SV1S" },
  "kr-sv1v": { dir: "SV", code: "SV1V" },
};

const APPLY = process.argv.includes("--apply");
const SET_ARGS = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const R2_BASE = (process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");

const srcUrl = (setId: string, num: string) => {
  const m = SETMAP[setId];
  if (!m) return null;
  const padded = String(parseInt(num, 10)).padStart(3, "0");
  return `https://cards.image.pokemonkorea.co.kr/data/wmimages/${m.dir}/${m.code}/${m.code}_${padded}.png`;
};
const keyOf = (url: string | null) => (url && url.startsWith(R2_BASE + "/") ? url.slice(R2_BASE.length + 1) : null);
const headCode = async (url: string | null) => {
  if (!url) return "NULL";
  try { return String((await fetch(url, { method: "HEAD" })).status); } catch { return "ERR"; }
};

async function main() {
  const setIds = SET_ARGS.length ? SET_ARGS : Object.keys(SETMAP);
  const unknown = setIds.filter((s) => !SETMAP[s]);
  if (unknown.length) { console.error("SETMAP 미등록:", unknown.join(", ")); process.exit(1); }

  const rows = await prisma.regionCard.findMany({
    where: { setId: { in: setIds } },
    select: { id: true, setId: true, number: true, name: true, imageSmall: true, imageLarge: true },
    orderBy: [{ setId: "asc" }, { numberInt: "asc" }],
  });
  console.log(`scan ${rows.length} KR rows  sets=[${setIds.join(",")}]  APPLY=${APPLY}\n`);

  const results = await Promise.all(rows.map(async (r) => ({ r, s: await headCode(r.imageSmall), l: await headCode(r.imageLarge) })));
  const isBad = (v: string) => v === "404" || v === "NULL"; // ERR(전송 일시오류) 제외
  const broken = results.filter((x) => isBad(x.s) || isBad(x.l));
  console.log(`BROKEN(404/NULL): ${broken.length}`);
  for (const { r, s, l } of broken) console.log(`  ${r.setId}#${r.number} ${r.name}  S=${s} L=${l}`);
  if (!broken.length) return console.log("\n전부 정상");
  if (!APPLY) return console.log("\n(dry-run; --apply 로 백필)");

  console.log("\n=== 백필 ===");
  for (const { r } of broken) {
    const src = srcUrl(r.setId, r.number);
    if (!src) { console.log(`  SKIP ${r.setId}#${r.number} (소스 미정)`); continue; }
    const resp = await fetch(src);
    if (!resp.ok) { console.log(`  ✗ ${r.setId}#${r.number} 소스 ${resp.status} ${src}`); continue; }
    const buf = Buffer.from(await resp.arrayBuffer());
    const ks = keyOf(r.imageSmall), kl = keyOf(r.imageLarge);
    if (ks) await uploadBuffer(ks, buf, contentTypeFor("png"));
    if (kl && kl !== ks) await uploadBuffer(kl, buf, contentTypeFor("png"));
    console.log(`  ✓ ${r.setId}#${r.number} ${r.name} (${buf.length}B)`);
  }

  console.log("\n=== 재검증 ===");
  for (const { r } of broken) console.log(`  ${r.setId}#${r.number}  S=${await headCode(r.imageSmall)} L=${await headCode(r.imageLarge)}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
