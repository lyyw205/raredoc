/**
 * jp-s-p(SWSH JP 프로모) 이미지 null 38장 보강 — 다중사이트 추적(workflow wd45r29s5)에서 확보한
 * pokeboon/cardrush 스캔 37장을 R2 재호스팅(핫링크 금지)하고 imageLarge/Small 설정.
 * 동시에 이름 오타 교정(#349 ダウンジングマシン→ダウジングマシン).
 * 소스: data/collect/sp-hunt-shops.json (number→imageLarge, 전부 HTTP200 검증됨).
 * #134(ガラル ジグザグマ)은 소스간 실재 불일치로 이미지 미확보 — 이름만 유지.
 * 쟁점번호(194-207/222/233/351-360)는 3소스 만장일치 欠番/비존재 → 추가 안 함.
 * JP 지역·일본어 전용. og-kr-swsh-promo(비동결) 가드 통과 확인.
 * Run: npx tsx scripts/fill-jp-s-p-images.ts [--apply]
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "../../../src/lib/prisma";
import { r2KeyFor, r2PublicUrl, uploadBuffer, headExists, contentTypeFor, extFromUrl } from "../../../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "../../lib/protected-groups";
const execFileP = promisify(execFile);

const APPLY = process.argv.includes("--apply");
const SET = "jp-s-p";
const GROUP = "og-kr-swsh-promo";
const NAME_FIX: Record<string, string> = { "349": "ダウジングマシン" };

type Hit = { number: string; numberInt: number | null; name: string; imageLarge: string | null };

async function download(src: string): Promise<Buffer> {
  const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "40", "-A", "Mozilla/5.0", src, "--output", "-"],
    { encoding: "buffer", maxBuffer: 32 * 1024 * 1024 });
  return Buffer.from(stdout as unknown as Buffer);
}

async function main() {
  assertWritable([GROUP], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fill-jp-s-p-images" });

  const raw = JSON.parse(readFileSync("data/collect/sp-hunt-shops.json", "utf8"));
  const arr = (Array.isArray(raw) ? raw : raw.cards ?? raw.disputed ?? []) as Hit[];
  const hits = arr.filter((h) => h.imageLarge && /^https?:\/\//.test(h.imageLarge));
  console.log(`${APPLY ? "✅ APPLY" : "🔍 DRY-RUN"} jp-s-p 이미지보강 | 이미지확보 ${hits.length}장 + 이름교정 ${Object.keys(NAME_FIX).length}건`);

  let filled = 0, skipped = 0, missing = 0;
  for (const h of hits) {
    const num = String(h.number).replace(/^0+(?=\d)/, ""); // "060"→"60" (DB 번호는 정수표기)
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: num }, select: { id: true, imageLarge: true, name: true } });
    if (!rc) { console.warn(`  ⚠ ${num}: regionCard 없음 — 스킵`); missing++; continue; }
    if (rc.imageLarge && rc.imageLarge.includes("r2.dev")) { skipped++; continue; }

    const ext = extFromUrl(h.imageLarge!) || "jpg";
    const key = r2KeyFor(GROUP, "ja", "large", SET, num, ext);
    const url = r2PublicUrl(key);
    if (!APPLY) { console.log(`  ${num} ${rc.name}  →  ${url}  (src ${h.imageLarge!.replace(/^https?:\/\//, "").slice(0, 40)}…)`); filled++; continue; }

    if (!(await headExists(key))) {
      const buf = await download(h.imageLarge!);
      if (buf.length < 1200) { console.warn(`  ⚠ ${num}: 다운로드 실패/너무작음(${buf.length}b) — 스킵`); missing++; continue; }
      await uploadBuffer(key, buf, contentTypeFor(ext));
    }
    await prisma.regionCard.update({ where: { id: rc.id }, data: { imageLarge: url, imageSmall: url } });
    console.log(`  ✓ ${num} ${rc.name} → R2`);
    filled++;
  }

  for (const [num, name] of Object.entries(NAME_FIX)) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: num }, select: { id: true, name: true } });
    if (!rc) { console.warn(`  ⚠ 이름교정 ${num}: 없음`); continue; }
    if (rc.name === name) continue;
    console.log(`  ${APPLY ? "✓" : "•"} 이름 ${num}: "${rc.name}" → "${name}"`);
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { name } });
  }

  const withImg = await prisma.regionCard.count({ where: { setId: SET, imageLarge: { not: null } } });
  const total = await prisma.regionCard.count({ where: { setId: SET } });
  console.log(`\n${APPLY ? "적용완료" : "DRY-RUN(--apply 로 적용)"}: 보강 ${filled} / 스킵(이미R2) ${skipped} / 미해결 ${missing}`);
  console.log(`jp-s-p 이미지 ${withImg}/${total} (이미지없음 ${total - withImg})`);
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); }).finally(() => prisma.$disconnect());
