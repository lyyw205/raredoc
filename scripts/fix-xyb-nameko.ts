/**
 * jp-tcg-XYB nameKo 교정 — 정체성 오류 수정(사용자 확정).
 *   XYB = "ハイパーメタルチェーンデッキ60「ディアルガEX+ギルガルドEX」"(2014-09-13, Dialga-EX+Aegislash-EX 하이퍼메탈체인덱)인데
 *   nameKo 가 "XY 퍼스트세트 「도치마론의 진화」"(=XY0 의 이름)로 잘못 복사돼 있었음. (name[JP]·발매일·로고는 이미 Dialga덱으로 정확)
 *   형제 XY-SP 덱 컨벤션("XY [덱타입] 60장 덱 「[포켓몬]」")에 맞춰 교정. (Set.nameKo = FREE 필드, 매핑가드 불필요)
 *
 * dry: npx tsx scripts/fix-xyb-nameko.ts
 * 적용: npx tsx scripts/fix-xyb-nameko.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const ID = "jp-tcg-XYB";
const NEW_KO = "XY 하이퍼 메탈 체인 60장 덱 「디아루가 EX + 기르가르드 EX」";

async function main() {
  const s = await prisma.set.findUnique({ where: { id: ID }, select: { name: true, nameKo: true } });
  if (!s) throw new Error(`${ID} 없음`);
  console.log(`${APPLY ? "APPLY" : "DRY"} fix-xyb-nameko`);
  console.log(`  name(JP): ${s.name}`);
  console.log(`  nameKo  : "${s.nameKo}" → "${NEW_KO}"`);
  if (!APPLY) { console.log("\n[dry] --apply 로 실행"); return; }
  await prisma.set.update({ where: { id: ID }, data: { nameKo: NEW_KO } });
  console.log("  ✓ 교정 완료");
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
