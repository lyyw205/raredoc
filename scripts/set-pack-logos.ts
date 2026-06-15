/**
 * 카드팩 세트 로고 일괄 설정 — 소스 이미지를 R2(set-assets/logo/{jpId}.{ext})로 재호스팅 후
 * 해당 JP 세트 + KR 트윈의 logoUrl 설정. 다운로드/업로드 병렬.
 * 실행: npx tsx scripts/set-pack-logos.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { uploadBuffer, r2PublicUrl, contentTypeFor } from "../src/lib/r2";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

type Job = { label: string; src: string; ext: string; ids: string[] };
const JOBS: Job[] = [
  { label: "SMM", src: "https://static.tcgcollector.com/content/images/ac/85/81/ac8581f26913052f84f09c723c0d77f68bc869147929b4544db1acf0dae2bfad.webp", ext: "webp", ids: ["jp-tcg-SMM", "kr-smm"] },
];

async function download(src: string): Promise<Buffer> {
  const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "30", src, "--output", "-"], { encoding: "buffer", maxBuffer: 16 * 1024 * 1024 });
  return Buffer.from(stdout as unknown as Buffer);
}

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ 팩 로고 일괄 설정 | ${JOBS.length}개 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  for (const j of JOBS) {
    const key = `set-assets/logo/${j.ids[0]}.${j.ext}`;
    console.log(`  ${j.label.padEnd(5)} → ${r2PublicUrl(key)}  (${j.ids.join(", ")})`);
  }
  if (!APPLY) { console.log("\n(dry-run) 적용: --apply"); await prisma.$disconnect(); return; }

  // 병렬: 각 잡 다운로드→R2 업로드
  const results = await Promise.all(JOBS.map(async (j) => {
    const key = `set-assets/logo/${j.ids[0]}.${j.ext}`;
    const buf = await download(j.src);
    if (buf.length < 800) throw new Error(`${j.label} 다운로드 실패/너무 작음 (${buf.length}b)`);
    await uploadBuffer(key, buf, contentTypeFor(j.ext));
    const url = r2PublicUrl(key);
    return { job: j, url, bytes: buf.length };
  }));

  // DB logoUrl 설정(병렬)
  for (const r of results) {
    for (const id of r.job.ids) {
      const u = await prisma.set.updateMany({ where: { id }, data: { logoUrl: r.url } });
      console.log(`  ${r.job.label} ${id}: ${u.count}건 (${r.bytes}b)`);
    }
  }

  // 검증
  const allIds = JOBS.flatMap((j) => j.ids);
  const rows = await prisma.set.findMany({ where: { id: { in: allIds } }, select: { id: true, logoUrl: true }, orderBy: { id: "asc" } });
  console.log("\n=== 검증 ===");
  rows.forEach((s) => console.log(`  ${s.id}: ${s.logoUrl ? "OK" : "❌ null"}`));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
