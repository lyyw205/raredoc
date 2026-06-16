/**
 * JP 세트코드 채움/교정 — 신규 jp-sv-* 수집분이 code 미채움(16팩) + GG엔드 코드 오타(1팩).
 * 값은 JP 공식코드(docs/set-code-comparison.md). code 컬럼만 SET — 연결 FK 무변경(동결 위반 아님).
 * Run: npx tsx scripts/fix-jp-set-codes.ts                       # dry-run
 *      npx tsx scripts/fix-jp-set-codes.ts --apply --allow-protected
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const ALLOW = hasAllowProtectedFlag();

// setId → JP 공식 세트코드
const CODES: Record<string, string> = {
  // SV — 코드 미수집(NULL) 14팩
  "jp-sv-151": "SV2a",
  "jp-sv-obsidian-flames": "SV3",
  "jp-sv-raging-surf": "SV3a",
  "jp-sv-paldean-fates": "SV4a",
  "jp-sv-crimson-haze": "SV5a",
  "jp-sv-twilight-masquerade": "SV6",
  "jp-sv-shrouded-fable": "SV6a",
  "jp-sv-stellar-crown": "SV7",
  "jp-sv-paradise-dragona": "SV7a",
  "jp-sv-surging-sparks": "SV8",
  "jp-sv-prismatic-evolutions": "SV8a",
  "jp-sv-journey-together": "SV9",
  "jp-sv-heatwave-arena": "SV9a",
  "jp-sv-destined-rivals": "SV10",
  // SV — 블랙볼트/화이트플레어(미수집)
  "jp-tcg-SV11B": "SV11B",
  "jp-tcg-SV11W": "SV11W",
  // 오타 교정: sn10a → SM10a (GG엔드)
  "jp-tcg-sn10a": "SM10a",
};

async function main() {
  const ids = Object.keys(CODES);
  const sets = await prisma.set.findMany({
    where: { id: { in: ids } },
    select: { id: true, code: true, cardPackId: true, region: true, nameKo: true },
  });
  const found = new Set(sets.map((s) => s.id));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length) console.warn(`⚠ DB에 없는 id: ${missing.join(", ")}`);

  // 동결 가드(영향 cardPackId). code 컬럼만 변경 → 연결 무변경이나 규약상 호출.
  assertWritable(sets.map((s) => s.cardPackId), { allow: ALLOW, dryRun: !APPLY, tool: "fix-jp-set-codes" });

  console.log(`\n${APPLY ? "✅ APPLY" : "🔍 DRY-RUN"} — JP code ${sets.length}건`);
  for (const s of sets) {
    if (s.region !== "JP") { console.warn(`  ⚠ ${s.id} region=${s.region} (JP 아님, 스킵)`); continue; }
    const next = CODES[s.id];
    console.log(`  ${s.id.padEnd(28)} ${String(s.code ?? "∅").padEnd(8)} → ${next.padEnd(8)} (${s.nameKo})`);
    if (APPLY) await prisma.set.update({ where: { id: s.id }, data: { code: next } });
  }
  if (!APPLY) console.log(`\n적용: npx tsx scripts/fix-jp-set-codes.ts --apply --allow-protected`);
}

main()
  .catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
