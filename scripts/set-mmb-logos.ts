/**
 * MMB-P / MMB-S (마스터덱빌드BOX MEGA) 세트 로고 설정.
 *   사용자 제공 tcgcollector webp 로고 → R2 set-assets/logo/{setId}.webp(투명도 보존) → Set.logoUrl 갱신.
 *   매칭 시각검증 완료: MMBp=パワースタイル(Power), MMBs=スピードスタイル(Speed) — 뒤바뀜 없음.
 *   키 규칙 = jp-tcg-M-P 로고와 동일(set-assets/logo/{setId}.webp).
 *
 * dry: npx tsx scripts/set-mmb-logos.ts
 * 적용: npx tsx scripts/set-mmb-logos.ts --apply --allow-protected   (mega-decks 동결 — Set 메타만, 매칭 불변)
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const PACK = "mega-decks";

const LOGOS = [
  { setId: "jp-tcg-MMBp", label: "パワースタイル(Power)", url: "https://static.tcgcollector.com/content/images/0f/3c/f3/0f3cf3f61e7d0e6c8d270f052659edf8bedc81b2c987e8413cd669d86e6fb743.webp" },
  { setId: "jp-tcg-MMBs", label: "スピードスタイル(Speed)", url: "https://static.tcgcollector.com/content/images/98/f4/7f/98f47fa278878fa43d79698c4f8071c5abdf4f7f9b738f450e8db8a3dd4e6fb7.webp" },
];

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 1000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "set-mmb-logos" });
  console.log(`${APPLY ? "APPLY" : "DRY"} set-mmb-logos | ${LOGOS.length}개`);
  for (const L of LOGOS) {
    const s = await prisma.set.findUnique({ where: { id: L.setId }, select: { id: true, logoUrl: true } });
    if (!s) throw new Error(`${L.setId} Set 없음`);
    const key = `set-assets/logo/${L.setId}.webp`;
    console.log(`  ${L.setId} (${L.label}) 현재 logo=${s.logoUrl ? "있음" : "NULL"} → ${key}`);
    if (!APPLY) continue;
    const buf = await dl(L.url);
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 80) throw new Error(`${L.setId} 로고 의심 w=${meta.width}`);
    // 투명도 보존 webp 재인코딩(검증·정규화)
    const webp = await sharp(buf).webp({ quality: 92 }).toBuffer();
    await uploadBuffer(key, webp, "image/webp");
    if (!(await headExists(key))) throw new Error(`${L.setId} R2 verify 실패`);
    await prisma.set.update({ where: { id: L.setId }, data: { logoUrl: r2PublicUrl(key) } });
    console.log(`    ✓ ${L.setId}.logoUrl = ${r2PublicUrl(key)} (${meta.width}x${meta.height})`);
  }
  if (!APPLY) console.log("\n적용: --apply --allow-protected");
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
