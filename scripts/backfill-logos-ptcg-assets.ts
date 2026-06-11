/**
 * 세트 로고 백필 — 1niceroli/ptcg-assets 의 logo.png 를 R2 에 미러링 후 Set.logoUrl 갱신.
 *
 * 대상(전수조사 결정, docs 참고):
 *   - EN 전량: id(en-tcg- 제거, 소문자) = ptcg-assets 폴더명 → 직접 대체(투명·고품질)
 *   - KR/JP 형제공유: logoUrl 없고 같은 cardPack 에 ptcg 매칭되는 EN 형제가 있으면 그 로고로 채움
 * (KR 구형/JP 잔여 등 ptcg-assets 로 못 푸는 건 이 스크립트가 건드리지 않음 → 기존 유지)
 *
 * 저장: GitHub raw 핫링크 대신 R2 미러링(개인 레포 의존 제거). key = set-assets/logo/{setId}.png
 *
 * 실행:
 *   npx tsx scripts/backfill-logos-ptcg-assets.ts --dry-run     # 계획만(다운로드/업로드/DB 무변경)
 *   npx tsx scripts/backfill-logos-ptcg-assets.ts               # 실제 미러링 + DB 갱신
 *   옵션: --limit=N (대상 N개로 제한) · --force (R2 에 이미 있어도 재업로드)
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { uploadBuffer, r2PublicUrl, headExists, contentTypeFor } from "../src/lib/r2";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const DRY = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const LIMIT = parseInt(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "0", 10);

const REPO = "1niceroli/ptcg-assets";
const enKey = (id: string) => id.replace(/^en-tcg-/, "").toLowerCase();
const srcUrl = (folder: string) => `https://raw.githubusercontent.com/${REPO}/main/${folder}/logo.png`;
const r2Key = (setId: string) => `set-assets/logo/${setId.replace(/[^a-zA-Z0-9_\-]/g, "_")}.png`;

async function httpCode(url: string): Promise<string> {
  try {
    const { stdout } = await execFileP("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "-I", url]);
    return stdout.toString().trim();
  } catch { return "000"; }
}
async function download(url: string): Promise<Buffer> {
  const { stdout } = await execFileP("curl", ["-sL", "--max-time", "30", url], { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
  return stdout as unknown as Buffer;
}
async function pool<T>(items: T[], n: number, fn: (t: T, i: number) => Promise<void>) {
  let idx = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (idx < items.length) { const i = idx++; await fn(items[i], i); }
  }));
}

type Target = { setId: string; region: string; sourceFolder: string; reason: "en-replace" | "sibling-fill" };

async function main() {
  const sets = await prisma.set.findMany({ select: { id: true, region: true, cardPackId: true, logoUrl: true } });

  // cardPack → EN 형제(있으면) 의 ptcg 폴더키
  const enByGroup = new Map<string, string>();
  for (const s of sets) {
    if (s.region === "EN" && s.cardPackId && !enByGroup.has(s.cardPackId)) enByGroup.set(s.cardPackId, enKey(s.id));
  }

  const targets: Target[] = [];
  for (const s of sets) {
    if (s.region === "EN") {
      targets.push({ setId: s.id, region: "EN", sourceFolder: enKey(s.id), reason: "en-replace" });
    } else if (!s.logoUrl && s.cardPackId && enByGroup.has(s.cardPackId)) {
      targets.push({ setId: s.id, region: s.region, sourceFolder: enByGroup.get(s.cardPackId)!, reason: "sibling-fill" });
    }
  }
  const limited = LIMIT > 0 ? targets.slice(0, LIMIT) : targets;
  console.log(`대상 ${targets.length} (EN대체 ${targets.filter(t=>t.reason==="en-replace").length} · 형제채움 ${targets.filter(t=>t.reason==="sibling-fill").length})${LIMIT?` → limit ${limited.length}`:""}  ${DRY?"[DRY-RUN]":""}\n`);

  let ok = 0, noSrc = 0, skipExist = 0, err = 0;
  const noSrcList: string[] = [];

  await pool(limited, 6, async (t) => {
    const url = srcUrl(t.sourceFolder);
    // 1) 소스 존재 확인
    if ((await httpCode(url)) !== "200") { noSrc++; noSrcList.push(`${t.setId} (folder=${t.sourceFolder})`); return; }
    const key = r2Key(t.setId);
    const publicUrl = r2PublicUrl(key);
    if (DRY) { ok++; return; }
    try {
      // 2) R2 멱등: 이미 있으면 업로드 생략(--force 면 재업로드)
      if (!FORCE && (await headExists(key))) { skipExist++; }
      else { const buf = await download(url); await uploadBuffer(key, buf, contentTypeFor("png")); }
      // 3) DB 갱신
      await prisma.set.update({ where: { id: t.setId }, data: { logoUrl: publicUrl } });
      ok++;
      if (ok % 50 === 0) console.log(`  ... ${ok} 처리`);
    } catch (e) { err++; console.error(`  ✗ ${t.setId}: ${String(e).slice(0, 100)}`); }
  });

  console.log(`\n── 결과 ──`);
  console.log(`  성공(로고 적용): ${ok}${DRY ? " (소스 200 확인된 수)" : ""}`);
  if (!DRY) console.log(`  R2 기존 재사용(업로드 생략): ${skipExist}`);
  console.log(`  소스 logo.png 없음(건너뜀): ${noSrc}`);
  if (!DRY) console.log(`  에러: ${err}`);
  if (noSrcList.length) console.log(`  없음 목록(앞 30):\n    ${noSrcList.slice(0, 30).join("\n    ")}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
