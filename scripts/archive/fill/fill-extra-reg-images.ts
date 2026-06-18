/**
 * Extra Reg(jp-extra-reg) 카드 이미지 보강/교체 — 사용자 제공 tcgcollector 이미지를 R2 재호스팅.
 *   #4·17·18·31: 복제 미해결로 비어있던 4장 채움.  #36(N): 기존(원본복제) 이미지를 사용자 지정본으로 교체.
 * 핫링크 금지 → r2KeyFor 컨벤션으로 업로드. sm-decks 동결이라 --allow-protected 필요(사용자 명시 요청).
 * Run: npx tsx scripts/fill-extra-reg-images.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "../../../src/lib/prisma";
import { r2KeyFor, r2PublicUrl, uploadBuffer, contentTypeFor } from "../../../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "../../lib/protected-groups";
const execFileP = promisify(execFile);

const APPLY = process.argv.includes("--apply");
const SET = "jp-extra-reg", GROUP = "sm-decks", EXT = "webp";

const PAIRS: Record<string, string> = {
  "004": "https://static.tcgcollector.com/content/images/77/93/c1/7793c101601cbed6ee2cf29596ec693e01461bc3e91ebf3bc84aa6ddbd5db045.webp",
  "017": "https://static.tcgcollector.com/content/images/27/4e/03/274e03942d4be91e32fca4573322c683eef44d62af44bd92c69f32623d06d2f5.webp",
  "018": "https://static.tcgcollector.com/content/images/fd/a4/5d/fda45d0a942d79c681a61fe464e18d39f7d19173666aa703af6d37924ea21c8c.webp",
  "031": "https://static.tcgcollector.com/content/images/8a/19/89/8a1989ab7fa9353ca7708b074ffcec44fba9e78272e20bc3396f970d91d8ea4f.webp",
  "036": "https://static.tcgcollector.com/content/images/39/c2/b6/39c2b6dee5f5976ba4cf2a58ea598ee6b934f848ffc7a7b68bf8b199b48785a0.webp",
};

async function download(src: string): Promise<Buffer> {
  const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "40", "-A", "Mozilla/5.0", src, "--output", "-"], { encoding: "buffer", maxBuffer: 32 * 1024 * 1024 });
  return Buffer.from(stdout as unknown as Buffer);
}

async function main() {
  assertWritable([GROUP], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-extra-reg-images" });
  console.log(`${APPLY ? "✅ APPLY" : "🔍 DRY-RUN"} Extra Reg 이미지 ${Object.keys(PAIRS).length}건`);
  for (const [num, src] of Object.entries(PAIRS)) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: num }, select: { id: true, name: true, imageLarge: true } });
    if (!rc) { console.warn(`  ⚠ #${num}: regionCard 없음`); continue; }
    const key = r2KeyFor(GROUP, "ja", "large", SET, num, EXT);
    const url = r2PublicUrl(key);
    const action = rc.imageLarge ? "교체" : "채움";
    if (!APPLY) { console.log(`  #${num} ${rc.name} (${action}) → ${url}`); continue; }
    const buf = await download(src);
    if (buf.length < 800) { console.warn(`  ⚠ #${num}: 다운로드 실패(${buf.length}b)`); continue; }
    await uploadBuffer(key, buf, contentTypeFor(EXT));
    await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: url, imageSmall: url } });
    console.log(`  ✓ #${num} ${rc.name} (${action}, ${buf.length}b) → R2`);
  }
  const withImg = await prisma.regionCard.count({ where: { setId: SET, imageLarge: { not: null } } });
  const total = await prisma.regionCard.count({ where: { setId: SET } });
  console.log(`\njp-extra-reg 이미지 ${withImg}/${total}`);
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); }).finally(() => prisma.$disconnect());
