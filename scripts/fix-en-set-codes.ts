/**
 * EN Set 코드 교정 — 공식 ptcgoCode(pokemontcg.io) 기준. Set 메타 변경(매핑잠금 자유).
 *   현재: en-tcg-swshp(SWSH Black Star Promos)가 SSP 로 오배정 → 공식 PR-SW.
 *         SSP 는 Surging Sparks(sv8) 전용. 코드 충돌 해소.
 * 멱등. 실행: npm run fix:en:setcodes  (--dry 미리보기)
 */
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";

// setId → 공식 code
const FIXES: Record<string, string> = {
  "en-tcg-swshp": "PR-SW", // SWSH Black Star Promos: SSP(오배정) → PR-SW
};

async function main() {
  const dry = process.argv.includes("--dry");
  for (const [id, code] of Object.entries(FIXES)) {
    const s = await prisma.set.findUnique({ where: { id }, select: { id: true, code: true, name: true, region: true } });
    if (!s) { console.warn(`⚠ Set ${id} 없음 — skip`); continue; }
    if (s.code === code) { console.log(`= ${id} 이미 ${code}`); continue; }
    // 타깃 코드가 같은 region 에 이미 있나 확인(새 충돌 방지)
    const clash = await prisma.set.findFirst({ where: { region: s.region, code, NOT: { id } }, select: { id: true, name: true } });
    console.log(`${dry ? "[DRY] " : ""}${id} (${s.name}): ${s.code} → ${code}${clash ? `  ⚠ 주의: ${code}를 이미 ${clash.id}(${clash.name})가 사용` : ""}`);
    if (!dry) await prisma.set.update({ where: { id }, data: { code } });
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
