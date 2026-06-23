/**
 * 병합 검증용 inspect — 후보 LC 들의 정체성 필드 + 이미지를 한자리에 모아 "같은 그림인지" 눈으로
 *   확정하게 한다. ★읽기 전용(DB 변경 없음). 이미지를 /tmp/merge-inspect 에 내려받아 Read 로 본다.
 *
 * 입력: LC id 또는 /test 에 보이는 로케이터 "<setId>#<number>" (둘 다·여러 개 혼용 가능).
 * 실행: npx tsx .claude/skills/card-merge/scripts/inspect-merge.ts <lcId|setId#num> <...>
 *   예: ... inspect-merge.ts jp-tcg-SMP2#2 en-tcg-smp#SM198
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { PROTECTED_GROUPS } from "../../../../scripts/lib/protected-groups";
import { execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const OUT = "/tmp/merge-inspect";

async function resolveLc(arg: string): Promise<string[]> {
  if (arg.includes("#")) {
    const [sid, num] = arg.split("#");
    const n = parseInt(num.replace(/\D/g, ""), 10);
    const rcs = await prisma.regionCard.findMany({
      where: { setId: sid, OR: [{ number: num }, ...(Number.isNaN(n) ? [] : [{ numberInt: n }])] },
      select: { cardId: true },
    });
    return [...new Set(rcs.map((r) => r.cardId))];
  }
  return [arg];
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (args.length < 2) { console.error("usage: <lcId|setId#num> <lcId|setId#num> [...]  (2개 이상)"); process.exit(1); }
  const lcIds = [...new Set((await Promise.all(args.map(resolveLc))).flat())];

  const lcs = await prisma.card.findMany({
    where: { id: { in: lcIds } },
    select: {
      id: true, gameCardId: true, illustrator: true, supertype: true, hp: true,
      locales: { select: { region: true, setId: true, number: true, name: true, imageLarge: true, imageSmall: true, set: { select: { cardPackId: true } } } },
    },
  });
  if (lcs.length < 2) { console.error(`LC 2개 미만 해석됨(${lcs.length}) — 입력 확인.`); process.exit(1); }

  mkdirSync(OUT, { recursive: true });
  console.log(`\n══ 병합 후보 ${lcs.length} LC inspect ══`);
  const gcs = new Set<string>(), illus = new Set<string>(); const frozenPacks = new Set<string>();
  const imgFiles: string[] = [];

  for (const lc of lcs) {
    if (lc.gameCardId) gcs.add(lc.gameCardId);
    if (lc.illustrator) illus.add(lc.illustrator);
    const packs = [...new Set(lc.locales.map((l) => l.set.cardPackId).filter(Boolean) as string[])];
    packs.forEach((p) => { if (PROTECTED_GROUPS.has(p)) frozenPacks.add(p); });
    const regions = lc.locales.map((l) => l.region).join("/");
    const nm = lc.locales[0]?.name ?? "?";
    console.log(`\n● ${lc.id}`);
    console.log(`   이름 ${nm} · ${lc.supertype ?? "?"} · HP ${lc.hp ?? "-"} · 작가 ${lc.illustrator ?? "?"} · gameCard ${lc.gameCardId ?? "∅"}`);
    console.log(`   지역 [${regions}] · 팩 [${packs.map((p) => (PROTECTED_GROUPS.has(p) ? `${p}🔒` : p)).join(", ")}]`);
    for (const l of lc.locales) console.log(`     ${l.region} ${l.setId}#${l.number} "${l.name}"`);
    // 대표 이미지 1장 내려받기(같은 LC 안은 같은 그림이라 1장이면 비교 충분)
    const img = lc.locales.find((l) => l.imageLarge)?.imageLarge ?? lc.locales.find((l) => l.imageSmall)?.imageSmall;
    if (img) {
      const ext = img.split("?")[0].endsWith(".jpg") ? "jpg" : "png";
      const path = `${OUT}/${lc.id}.${ext}`;
      try { await execFileP("curl", ["-sSL", "--max-time", "30", img, "-o", path]); imgFiles.push(path); console.log(`   🖼  ${path}`); }
      catch { console.log(`   🖼  (다운로드 실패) ${img}`); }
    } else console.log(`   🖼  (이미지 없음)`);
  }

  console.log(`\n── 교차 점검 ──`);
  console.log(`  gameCard: ${gcs.size === 1 ? "전부 동일 ✓ (같은 카드 강한 신호)" : `⚠ ${gcs.size}종 다름 — 정말 같은 카드인지 의심`}`);
  console.log(`  작가: ${illus.size === 1 ? `전부 동일 (${[...illus][0]}) — 필터 통과(확정 아님)` : `⚠ ${illus.size}종 다름 — 다른 그림 가능성`}`);
  console.log(`  동결팩: ${frozenPacks.size ? `🔒 ${[...frozenPacks]} → 병합 시 --allow-protected + 사용자 확인 필수` : "없음"}`);
  console.log(`\n★ 확정 근거는 위 🖼 이미지를 직접 보고 "같은 그림인가" 판단. 같으면 merge-logical-cards.ts 로 병합.`);
  console.log(`  내려받은 이미지: ${imgFiles.join("  ")}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
