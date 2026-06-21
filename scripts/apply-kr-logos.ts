/**
 * KR Set.logoUrl 백필(2차) — 리서치 결과(/tmp/kr-logos.tsv)의 찾아진 로고만 적용.
 *   kr-bs1~3=한국 자체 로고(Bulbapedia), 프로모 6=pokellector 우산 로고. 나머지는 표준 로고 부재로 빈칸 유지.
 *
 * 실행: npx tsx scripts/apply-kr-logos.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";
import { readFileSync } from "node:fs";

async function main() {
  const apply = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const lines = readFileSync("/tmp/kr-logos.tsv", "utf8").trim().split("\n").slice(1);
  const rows = lines.map((l) => l.split("\t")).filter((c) => c[1] && /^https?:\/\//.test(c[1])).map((c) => ({ id: c[0], url: c[1], conf: c[3] }));

  const sets = await prisma.set.findMany({ where: { id: { in: rows.map((r) => r.id) }, region: "KR" }, select: { id: true, name: true, cardPackId: true } });
  const byId = new Map(sets.map((s) => [s.id, s]));
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !apply, tool: "apply-kr-logos" });

  let ok = 0; const missing: string[] = [];
  for (const r of rows) {
    const s = byId.get(r.id);
    if (!s) { missing.push(r.id); continue; }
    console.log(`${apply ? "[APPLY]" : "[DRY]"} ${r.id.padEnd(12)} (${r.conf})  ${r.url.split("/").pop()}`);
    ok++;
    if (apply) await prisma.set.update({ where: { id: r.id }, data: { logoUrl: r.url } });
  }
  if (missing.length) console.warn(`⚠ DB 미발견: ${missing.join(", ")}`);
  console.log(`\n${apply ? "완료" : "dry-run"} — 적용 ${ok} · 미발견 ${missing.length}`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
