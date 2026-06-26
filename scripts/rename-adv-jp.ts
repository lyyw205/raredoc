/**
 * ADV1~5 (jp-tcg-ADV1..5) JP 로케일 이름 영어→일본어 교정 (메타데이터만; 이미지·매핑은 이미 일본판으로 정상).
 *
 * 배경: ADV 시대 5세트(EX Ruby&Sapphire~Hidden Legends 대응)가 region=JP인데 이름만 영어로 수집됨.
 *   이미지는 일본판 정상·EN ex1~5 연결도 정상(사용자 확인) → 이름만 일본어로 교정.
 *   ★검증완: tmp/adv/name-plan.json —
 *     · 포켓몬 283장 = Species.nameJa(dex) + 접미사(ex). 샘플 15장(ex 4 포함) 일본판 카드 인쇄명과 대조 일치.
 *     · 트레이너/에너지 42장 = 일본판 카드 이미지 직접 판독(ポケナビ/おじょうさまのお散歩/マグマ団のパルサー/
 *       超古代のワザマシン[氷/岩/鋼]/小島の横穴/磁気嵐/ダイゴのアドバイス 등). δ·Star 없음(ex1~5 시대).
 *
 * 동작: RegionCard.name(region=JP) 갱신. 이미지·연결·번호 불변.
 * dry: npx tsx scripts/rename-adv-jp.ts
 * 적용: npx tsx scripts/rename-adv-jp.ts --apply
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
type P = { set: string; number: string; supertype: string; en: string; ja: string };

async function main() {
  const plan: P[] = JSON.parse(readFileSync("tmp/adv/name-plan.json", "utf8"));
  const empty = plan.filter((p) => !p.ja);
  if (empty.length) throw new Error(`ja 빈값 ${empty.length}`);

  const sets = [...new Set(plan.map((p) => p.set))];
  // 영향 cardPack 들로 가드
  const packs: string[] = [];
  for (const s of sets) { const set = await prisma.set.findUnique({ where: { id: s }, select: { cardPackId: true } }); if (set?.cardPackId) packs.push(set.cardPackId); }
  assertWritable(packs, { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "rename-adv-jp" });

  console.log(`${APPLY ? "APPLY" : "DRY"} rename-adv-jp | ${plan.length}장 / ${sets.length}세트 (packs ${packs.join(",")})`);
  let changed = 0, same = 0, miss = 0;
  const perSet: Record<string, number> = {};
  for (const p of plan) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: p.set, number: p.number, region: "JP" }, select: { id: true, name: true } });
    if (!rc) { console.error(`  ✗ ${p.set}#${p.number} 없음`); miss++; continue; }
    if (rc.name === p.ja) { same++; continue; }
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { name: p.ja } });
    changed++; perSet[p.set] = (perSet[p.set] || 0) + 1;
  }
  if (miss) throw new Error("대상 누락 — 중단");
  console.log(`세트별 변경:`, JSON.stringify(perSet));
  console.log(`\n=== ${APPLY ? "적용" : "DRY"} === 변경 ${changed} / 동일 ${same} / 총 ${plan.length}`);
  if (!APPLY) console.log("적용: --apply");
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
