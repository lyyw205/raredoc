/**
 * MA(MEGA 프리미엄 트레이너 박스) 세트 로고 설정.
 * 소스(tcgcollector webp)를 R2(set-assets/logo/jp-tcg-MA.webp)로 재호스팅(핫링크 회피) 후
 * jp-tcg-MA · kr-ma(같은 제품) 의 logoUrl 설정.
 * 실행: npx tsx scripts/set-ma-logo.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../src/lib/prisma";
import { uploadBuffer, r2PublicUrl, contentTypeFor } from "../../../src/lib/r2";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const SRC = "https://static.tcgcollector.com/content/images/ea/a2/23/eaa2239263d15296e7f2af8864c627c11683f56ebeff45d1464e5b7ab2baca70.webp";
const KEY = "set-assets/logo/jp-tcg-MA.webp";
const SET_IDS = ["jp-tcg-MA", "kr-ma"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const url = r2PublicUrl(KEY);
  console.log(`■ MA 로고 설정 | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  console.log(`  소스: ${SRC}`);
  console.log(`  R2 키: ${KEY}`);
  console.log(`  공개 URL: ${url}`);
  console.log(`  대상 Set: ${SET_IDS.join(", ")}`);

  if (!APPLY) { console.log("\n(dry-run) 적용: --apply"); await prisma.$disconnect(); return; }

  // 1. 다운로드(curl — 호스트 node fetch 차단 회피)
  const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "30", SRC, "--output", "-"], { encoding: "buffer", maxBuffer: 16 * 1024 * 1024 });
  const buf = Buffer.from(stdout as unknown as Buffer);
  if (buf.length < 1000) throw new Error(`다운로드 실패/너무 작음 (${buf.length} bytes)`);
  console.log(`\n  다운로드: ${buf.length} bytes`);

  // 2. R2 업로드
  await uploadBuffer(KEY, buf, contentTypeFor("webp"));
  console.log(`  R2 업로드 완료: ${url}`);

  // 3. DB logoUrl 설정
  for (const id of SET_IDS) {
    const r = await prisma.set.updateMany({ where: { id }, data: { logoUrl: url } });
    console.log(`  ${id}.logoUrl 설정: ${r.count}건`);
  }
  // 검증
  const rows = await prisma.set.findMany({ where: { id: { in: SET_IDS } }, select: { id: true, logoUrl: true } });
  console.log("\n=== 검증 ===");
  rows.forEach((s) => console.log(`  ${s.id}: ${s.logoUrl}`));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
