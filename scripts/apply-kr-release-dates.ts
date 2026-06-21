/**
 * KR Set.releaseDate 백필 — 에포크(1970) 플레이스홀더를 실제 한국 발매일로 교체.
 *   소스: pokemoncard.co.kr 공식 발매일(리서치 결과 /tmp/kr-dates-result.tsv).
 *   검증: YYYY-MM-DD 형식 + JP 앵커(/tmp/kr-epoch-sets.tsv) 이후(KR≥JP). releaseDate 는 표시 메타라 동결 무관.
 *
 * 실행: npx tsx scripts/apply-kr-release-dates.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";
import { readFileSync } from "node:fs";

function readTsv(path: string): Record<string, string>[] {
  const lines = readFileSync(path, "utf8").trim().split("\n");
  const head = lines[0].split("\t");
  return lines.slice(1).map((l) => {
    const cells = l.split("\t");
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""]));
  });
}

async function main() {
  const apply = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const anchor = new Map(readTsv("/tmp/kr-epoch-sets.tsv").map((r) => [r.id, r.jp_anchor]));
  const rows = readTsv("/tmp/kr-dates-result.tsv").filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.kr_date));

  const ids = rows.map((r) => r.id);
  const sets = await prisma.set.findMany({ where: { id: { in: ids }, region: "KR" }, select: { id: true, name: true, cardPackId: true } });
  const byId = new Map(sets.map((s) => [s.id, s]));
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !apply, tool: "apply-kr-release-dates" });

  let ok = 0; const warns: string[] = []; const missing: string[] = [];
  for (const r of rows) {
    const s = byId.get(r.id);
    if (!s) { missing.push(r.id); continue; }
    const jp = anchor.get(r.id);
    if (jp && r.kr_date < jp) { warns.push(`${r.id}: KR ${r.kr_date} < JP ${jp} — skip`); continue; }
    console.log(`${apply ? "[APPLY]" : "[DRY]"} ${r.id.padEnd(12)} → ${r.kr_date}  (${r.confidence})  ${s.name.slice(0, 30)}`);
    ok++;
    if (apply) await prisma.set.update({ where: { id: r.id }, data: { releaseDate: new Date(r.kr_date + "T00:00:00Z") } });
  }
  if (warns.length) { console.warn("\n⚠ JP앵커 위반(skip):"); warns.forEach((w) => console.warn("  " + w)); }
  if (missing.length) console.warn(`\n⚠ DB 미발견: ${missing.join(", ")}`);
  console.log(`\n${apply ? "완료" : "dry-run"} — 적용 ${ok} · 스킵(위반) ${warns.length} · 미발견 ${missing.length}`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
