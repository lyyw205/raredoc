/**
 * EN Set.code 백필 2차 — McDonald's·POP·트레이너킷·Southern Islands·Rumble (tcgcollector 코드).
 *   1차(backfill-en-set-codes.ts) 누락분. 비동결(대부분 ungrouped/구era). swsh9tg 는 코드 없어 제외.
 *
 * 실행: npx tsx scripts/backfill-en-set-codes-2.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const CODE: Record<string, string> = {
  mcd11: "M11", mcd12: "M12", mcd14: "M14", mcd15: "M15", mcd16: "M16",
  mcd17: "M17", mcd18: "M18", mcd19: "M19", mcd21: "M21", mcd22: "M22",
  pop1: "POP1", pop2: "POP2", pop3: "POP3", pop4: "POP4", pop5: "POP5",
  pop6: "POP6", pop7: "POP7", pop8: "POP8", pop9: "POP9",
  "en-tcg-si1": "SI", ru1: "RM",
  tk1a: "TK1A", tk1b: "TK1O", tk2a: "TK2P", tk2b: "TK2M",
};

async function main() {
  const apply = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const ids = Object.keys(CODE);
  const sets = await prisma.set.findMany({ where: { id: { in: ids }, region: "EN" }, select: { id: true, name: true, code: true, cardPackId: true } });
  const byId = new Map(sets.map((s) => [s.id, s]));
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !apply, tool: "backfill-en-set-codes-2" });

  let changed = 0; const missing: string[] = [];
  for (const id of ids) {
    const s = byId.get(id);
    if (!s) { missing.push(id); continue; }
    if (s.code === CODE[id]) continue;
    console.log(`${apply ? "[APPLY]" : "[DRY]"} ${id.padEnd(14)} "${s.name}"  ${s.code ?? "null"} → ${CODE[id]}`);
    changed++;
    if (apply) await prisma.set.update({ where: { id }, data: { code: CODE[id] } });
  }
  if (missing.length) console.warn(`⚠ 누락 id: ${missing.join(", ")}`);
  console.log(`\n${apply ? "완료" : "dry-run"} — 변경 ${changed} · 누락 ${missing.length}`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
