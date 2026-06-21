/**
 * sv8pt5 (Prismatic Evolutions, EN) packType 교정 — "promo" → "expansion".
 *   EN 형제 특별확장팩(Paldean Fates sv4pt5·Shrouded Fable sv6pt5·151 sv3pt5)이 전부 expansion 인데
 *   Prismatic Evolutions 만 promo 로 잘못 지정돼 사이드바 뱃지가 어긋남. packType 은 표시 메타라
 *   EN/KR 매칭(동결 보호 대상)과 무관 — 그룹 sv-prismatic-evolutions 가 동결이라 --allow-protected 동반.
 *
 * 실행: npx tsx scripts/fix-sv8pt5-packtype.ts            (dry-run)
 *       npx tsx scripts/fix-sv8pt5-packtype.ts --apply --allow-protected
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

async function main() {
  const apply = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const s = await prisma.set.findUnique({
    where: { id: "sv8pt5" },
    select: { id: true, name: true, region: true, packType: true, cardPackId: true },
  });
  if (!s) { console.error("🛑 sv8pt5 없음"); process.exit(1); }
  console.log(`${apply ? "[APPLY]" : "[DRY-RUN]"} ${s.id} (${s.name}) packType: ${s.packType} → expansion`);
  assertWritable([s.cardPackId], { allow, dryRun: !apply, tool: "fix-sv8pt5-packtype" });

  if (s.packType !== "promo") {
    console.log(`(현재 packType="${s.packType}" — 이미 promo 아님, 변경 없음)`);
    return;
  }
  if (!apply) { console.log("(dry-run — 적용하려면 --apply --allow-protected)"); return; }
  await prisma.set.update({ where: { id: "sv8pt5" }, data: { packType: "expansion" } });
  console.log("✅ 완료 — sv8pt5 packType=expansion");
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
