/**
 * ワールドチャンピオンズパック (jp-tcg-PCG10, og-pcg10) JP 로케일 이름 영어→일본어 교정.
 *
 * 배경: region=JP인데 102장 이름이 전부 영어(EX Power Keepers 오수집). 이미지는 이미 일본어로 재수집 완료.
 *   이름도 일본어로 교정해 다른 JP 세트와 일관성 확보. (정체성·EN ex16 연결은 cardId 기반이라 불변)
 *   ★검증완: 매핑 tmp/pcg10/name-plan.json —
 *     · 포켓몬 81장 = Species.nameJa(dex) + 접미사(ex/☆), 카드 인쇄명과 샘플 12장+몽타주 대조 일치
 *     · 트레이너/에너지 21장 = 카드 이미지 직접 판독(エネルギー循環装置/なぞの化石/ダイゴのアドバイス/
 *       カゲツのスタジアム/悪エネルギー/鋼エネルギー 등, #84=エネルギーリムーブ "2"없음 확정)
 *
 * 동작: RegionCard.name(region=JP) 갱신. 이미지·연결·번호 불변.
 * dry: npx tsx scripts/rename-pcg10-jp.ts
 * 적용: npx tsx scripts/rename-pcg10-jp.ts --apply
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-PCG10", PACK = "og-pcg10";
type P = { number: string; supertype: string; en: string; ja: string };

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "rename-pcg10-jp" });
  const plan: P[] = JSON.parse(readFileSync("tmp/pcg10/name-plan.json", "utf8"));
  const empty = plan.filter((p) => !p.ja);
  if (empty.length) throw new Error(`ja 빈값 ${empty.length}: ${empty.map((p) => p.number).join(",")}`);
  console.log(`${APPLY ? "APPLY" : "DRY"} rename-pcg10-jp | ${plan.length}장`);
  let changed = 0, same = 0, miss = 0;
  for (const p of plan) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: p.number, region: "JP" }, select: { id: true, name: true } });
    if (!rc) { console.error(`  ✗ #${p.number} RegionCard 없음`); miss++; continue; }
    if (rc.name === p.ja) { same++; continue; }
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { name: p.ja } });
    changed++;
    if (changed <= 30) console.log(`  #${p.number} "${rc.name}" → "${p.ja}"`);
  }
  if (miss) throw new Error("대상 누락 — 중단");
  console.log(`\n=== ${APPLY ? "적용" : "DRY"} === 변경 ${changed} / 동일 ${same} / 총 ${plan.length}`);
  if (!APPLY) console.log("적용: --apply");
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
