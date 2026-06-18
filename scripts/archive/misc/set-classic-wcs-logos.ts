/**
 * Classic(CLF/CLL/CLK) + WCS23 로고를 tcgcollector 핫링크 → R2 재호스팅으로 교정.
 * set-pack-logos.ts 와 동일 패턴(소스 다운로드 → set-assets/logo/{id}.ext 업로드 → logoUrl 설정).
 * 실행: npx tsx scripts/set-classic-wcs-logos.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../../../src/lib/prisma";
import { uploadBuffer, r2PublicUrl, contentTypeFor } from "../../../src/lib/r2";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

type Job = { label: string; src: string; ext: string; ids: string[] };
const JOBS: Job[] = [
  { label: "Classic", ext: "png", ids: ["jp-clf", "jp-cll", "jp-clk"],
    src: "https://static.tcgcollector.com/content/images/11/50/3c/11503cb11fce89c50fd7b289b72ed76b09f59038d909671c20479afd377cfa54.png" },
  { label: "WCS23", ext: "png", ids: ["jp-wcs23"],
    src: "https://static.tcgcollector.com/content/images/5e/aa/e4/5eaae46b53953ceebd9b575183808e7a9bed19237ab015a27bd7822c2ecf0a89.png" },
];

async function download(src: string): Promise<Buffer> {
  const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "30", "-A", "Mozilla/5.0", src, "--output", "-"],
    { encoding: "buffer", maxBuffer: 16 * 1024 * 1024 });
  return Buffer.from(stdout as unknown as Buffer);
}

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ 로고 R2 재호스팅 | ${JOBS.length}잡 | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  for (const j of JOBS) console.log(`  ${j.label.padEnd(8)} → ${r2PublicUrl(`set-assets/logo/${j.ids[0]}.${j.ext}`)}  (${j.ids.join(", ")})`);
  if (!APPLY) { console.log("\n적용: --apply"); await prisma.$disconnect(); return; }

  const results = await Promise.all(JOBS.map(async (j) => {
    const key = `set-assets/logo/${j.ids[0]}.${j.ext}`;
    const buf = await download(j.src);
    if (buf.length < 800) throw new Error(`${j.label} 다운로드 실패/너무 작음 (${buf.length}b)`);
    await uploadBuffer(key, buf, contentTypeFor(j.ext));
    return { job: j, url: r2PublicUrl(key), bytes: buf.length };
  }));

  for (const r of results) {
    for (const id of r.job.ids) {
      const u = await prisma.set.updateMany({ where: { id }, data: { logoUrl: r.url } });
      console.log(`  ${r.job.label} ${id}: ${u.count}건 → ${r.url} (${r.bytes}b)`);
    }
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
