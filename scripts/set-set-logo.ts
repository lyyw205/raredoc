/**
 * 세트 로고를 외부 URL → R2 재호스팅(핫링크 금지)하고 Set.logoUrl 설정. 재사용 범용 스크립트.
 * Run: npx tsx scripts/set-set-logo.ts --id=jp-s8a-p --src=<URL> [--ext=png] [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { uploadBuffer, r2PublicUrl, contentTypeFor } from "../src/lib/r2";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const arg = (k: string, d = "") => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const APPLY = process.argv.includes("--apply");
const ID = arg("id"); const SRC = arg("src"); const EXT = arg("ext", "png");
if (!ID || !SRC) { console.error("--id= 와 --src= 필요"); process.exit(1); }

async function main() {
  const key = `set-assets/logo/${ID}.${EXT}`;
  const url = r2PublicUrl(key);
  console.log(`■ ${ID} 로고 R2 재호스팅 | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  console.log(`  src: ${SRC}`);
  console.log(`  → ${url}`);
  if (!APPLY) { console.log("\n적용: --apply"); await prisma.$disconnect(); return; }

  const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "40", "-A", "Mozilla/5.0", SRC, "--output", "-"],
    { encoding: "buffer", maxBuffer: 32 * 1024 * 1024 });
  const buf = Buffer.from(stdout as unknown as Buffer);
  if (buf.length < 800) throw new Error(`다운로드 실패/너무 작음 (${buf.length}b)`);
  await uploadBuffer(key, buf, contentTypeFor(EXT));
  const u = await prisma.set.updateMany({ where: { id: ID }, data: { logoUrl: url } });
  console.log(`  ✓ 업로드 ${buf.length}b · Set.logoUrl ${u.count}건 설정 → ${url}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); });
