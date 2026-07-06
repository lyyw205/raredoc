/**
 * 세트 로고 일괄 설정 — 사용자 제공 tcgcollector 로고 → R2 set-assets/logo/{setId}.webp(투명도 보존) → Set.logoUrl.
 *   set-mmb-logos.ts 패턴 일반화. logoUrl 은 Set 메타(FREE) — 가드 불필요.
 *
 * dry: npx tsx scripts/set-logos-batch.ts
 * 적용: npx tsx scripts/set-logos-batch.ts --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const T = "https://static.tcgcollector.com/content/images/";

const LOGOS: { setId: string; label: string; url: string }[] = [
  { setId: "jp-sk",         label: "SK VSTAR 프리미엄 트레이너 박스", url: T + "c8/02/64/c80264ea347aa201b551d143c54e0277192063936271d8da5ae44f9d85cf2f43.png" },
  { setId: "jp-smg",        label: "SMG 덱 빌드 박스",              url: T + "c1/4f/36/c14f36201a4cd8d95102e136d7befb3c4256fdd4dabc4043ac8041b0a09dd86a.webp" },
  { setId: "jp-smf",        label: "SMF 프리미엄 트레이너 박스",     url: T + "0e/b7/0b/0eb70b8ee6d2aaf8eb5a457f642f418ea1175ba48a8d585e0aa4c83dcadce924.webp" },
  { setId: "jp-tcg-XY11b",  label: "타오르는 투사 (XY11)",          url: T + "be/8e/82/be8e8273b6895a8b940874992168bddd474813aa73cec7fc177d1b5e73340d70.webp" },
  { setId: "jp-tcg-XYG",    label: "지가르데 EX (XYG)",             url: T + "00/da/63/00da637ffeae093d6d9f12588a1e057df94f46458ccd9b3d369f7f3493682f72.webp" },
  { setId: "jp-tcg-XYH",    label: "M다부니 EX (XYH)",              url: T + "de/62/99/de629939e052092b6fa5180b55b9d3a9469ca6e6a869bd5f4f70ef31b5d454bc.webp" },
  { setId: "jp-tcg-XYF",    label: "골덕+펄기아 (XYF)",             url: T + "d1/3c/24/d13c247cef82716e212eae2072c800331d2560d5566a2c59e62c25f03b82d4d9.webp" },
  { setId: "jp-tcg-RBD",    label: "라이츄 BREAK (RBD)",            url: T + "5e/3c/e6/5e3ce61f56c8d947fe91ddaa58954c4cb7abd018e4a860067412c16af4558764.webp" },
  { setId: "jp-tcg-UBD",    label: "음번 BREAK (UBD)",              url: T + "29/67/73/296773323dd030411fada0f009ab9cd036219cf260da46869be8be981b8f4d65.webp" },
  { setId: "jp-tcg-XYE",    label: "염무왕+토게키스 EX (XYE)",       url: T + "65/a3/21/65a321000b2b199fa8debb824abb46db627b21c66de0fc197f29f028aba09af5.webp" },
  { setId: "jp-tcg-XYD",    label: "M레쿠쟈 EX (XYD)",              url: T + "80/0f/00/800f009d9ba89c2d749a4d554e67635ffb866d07f7a2b4a5d571d926b91c21ff.webp" },
  { setId: "jp-tcg-XYC",    label: "제르네아스+이벨타르 EX (XYC)",    url: T + "ed/ff/bd/edffbda0fecc3f9e21cf56de4633b46e6f9cc41deb45042ec0110dc2108879ce.webp" },
  { setId: "jp-tcg-XYA",    label: "M리자몽 EX (XYA)",              url: T + "76/d1/8a/76d18a3d45e1a40da10fab84ca1332d351d6439c155fa43a78ac72b6431e4072.webp" },
  { setId: "jp-tcg-XY30",   label: "제르네아스 덱 (XY30)",          url: T + "6c/48/49/6c484983e89cba803d6933abf6ea28e38e76e9cf51fc5b6820a9d22775aca113.webp" },
  { setId: "jp-tcg-XY30B",  label: "이벨타르 덱 (XY30B)",           url: T + "99/6f/4c/996f4c1ba3d5e6a4fb33fcdcdf85292600b862d3f66315d31ad188ae9329b52e.webp" },
  { setId: "jp-tcg-XY0",    label: "도치마론 첫걸음 (XY0)",          url: T + "e4/61/f1/e461f1fe39e4a48cf8267acf990814ba6f6740c16f695bb067c05e00cfb79ea6.webp" },
  { setId: "jp-tcg-MG",     label: "뮤츠VS게노세크트 (MG)",          url: T + "70/47/f9/7047f9ec0da326acff246e01592fa6c72d2be621c2a29f3dcc640b707c76ff1d.webp" },
  { setId: "jp-tcg-GK",     label: "거북왕+큐레무 EX (GK)",          url: T + "89/46/0e/89460e527ddd44c0f04a04858ecb2b532d24382c14ae0a738434a838da00bca1.webp" },
  { setId: "jp-tcg-PSS2",   label: "플라스마단 스페셜 (PSS)",        url: T + "58/92/dd/5892ddaa00d85819856300292b354778c5c037076b746592241ea572d743af39.webp" },
  { setId: "jp-wak",        label: "모두의 두근두근 배틀 (WAK)",      url: T + "9d/47/39/9d473952ff796f821965d0008671dbdb95606b1d6e0f877356490c967dcdf86f.webp" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 800) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY"} set-logos-batch | ${LOGOS.length}개`);
  // 사전 점검: 모든 setId 존재
  const ids = LOGOS.map((l) => l.setId);
  const found = await prisma.set.findMany({ where: { id: { in: ids } }, select: { id: true, logoUrl: true } });
  const fmap = new Map(found.map((s) => [s.id, s.logoUrl]));
  const missing = ids.filter((id) => !fmap.has(id));
  if (missing.length) { console.error(`✗ 없는 세트: ${missing.join(", ")} — 중단`); process.exit(1); }
  for (const L of LOGOS) console.log(`  ${L.setId.padEnd(16)} (${L.label}) 현재=${fmap.get(L.setId) ? "있음" : "NULL"}`);

  if (!APPLY) { console.log("\n[dry-run] 변경 없음. --apply 로 실행."); return; }
  let ok = 0;
  for (const L of LOGOS) {
    const key = `set-assets/logo/${L.setId}.webp`;
    const buf = await dl(L.url);
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 60) throw new Error(`${L.setId} 로고 의심 w=${meta.width}`);
    const webp = await sharp(buf).webp({ quality: 92 }).toBuffer();
    await uploadBuffer(key, webp, "image/webp");
    if (!(await headExists(key))) throw new Error(`${L.setId} R2 verify 실패`);
    await prisma.set.update({ where: { id: L.setId }, data: { logoUrl: r2PublicUrl(key) } });
    console.log(`  ✓ ${L.setId} logoUrl 설정 (${meta.width}x${meta.height})`);
    ok++;
  }
  console.log(`\n완료 ${ok}/${LOGOS.length}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
