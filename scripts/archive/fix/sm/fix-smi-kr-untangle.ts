/**
 * SMI KR 가나다 스크램블 교정 — kr-smi(KR)가 jp-tcg-SMI(JP)와 SMI코드 공유.
 *  · 스왑2쌍(재연결4): エレキパワー↔火打石(일렉트릭파워↔부싯돌), ハウ↔リーリエ(하우↔릴리에)
 *  · 언링크1: JP=シロナ·KR=난천 지역차로 난천이 シロナ에 오링크 → 단독 분리
 *  ※ ネストボール(JP#024↔kr#022 네스트볼)은 KR번호만 가나다로 다를뿐 연결 정상 → 변경 안 함.
 * KR번호=공식(가나다=정체성) 유지, cardId 논리연결만 교정. 이동 전 안전검사. sm-decks 동결 → --allow-protected.
 * Run: npx tsx scripts/fix-smi-kr-untangle.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");

const RELINK = [
  { id: "kr-smi-025", kr: "일렉트릭파워", from: "lc-jp-tcg-SMI-026", to: "lc-jp-tcg-SMI-023", jp: "エレキパワー" },
  { id: "kr-smi-023", kr: "부싯돌",       from: "lc-jp-tcg-SMI-023", to: "lc-jp-tcg-SMI-026", jp: "火打石" },
  { id: "kr-smi-038", kr: "하우",         from: "lc-jp-tcg-SMI-038", to: "lc-jp-tcg-SMI-035", jp: "ハウ" },
  { id: "kr-smi-032", kr: "릴리에",       from: "lc-jp-tcg-SMI-035", to: "lc-jp-tcg-SMI-038", jp: "リーリエ" },
];
const UNLINK = [
  { id: "kr-smi-031", kr: "난천", from: "lc-jp-tcg-SMI-033", to: "lc-kr-smi-031", set: "kr-smi", note: "JP=シロナ(지역차)" },
];

async function main() {
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-SMI", "kr-smi"] } }, select: { cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-smi-kr-untangle" });
  console.log(`■ SMI KR 스크램블 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  console.log("· 재연결 4 (스왑 2쌍)");
  for (const r of RELINK) {
    const rc = await prisma.regionCard.findUnique({ where: { id: r.id }, select: { cardId: true, name: true } });
    if (!rc) { console.log(`  🔴 ${r.id} 없음 → skip`); continue; }
    if (rc.cardId !== r.from) { console.log(`  ⚠️ ${r.id}(${rc.name}): ${rc.cardId} ≠ ${r.from} → skip(안전)`); continue; }
    console.log(`  ✔ ${r.kr} [${r.id}]: ${r.from} → ${r.to} (${r.jp})`);
    if (APPLY) await prisma.regionCard.update({ where: { id: r.id }, data: { cardId: r.to } });
  }

  console.log("\n· 언링크 1 (난천 → 단독)");
  for (const u of UNLINK) {
    const rc = await prisma.regionCard.findUnique({ where: { id: u.id }, select: { cardId: true, name: true, number: true, numberInt: true } });
    if (!rc) { console.log(`  🔴 ${u.id} 없음 → skip`); continue; }
    if (rc.cardId !== u.from) { console.log(`  ⚠️ ${u.id}(${rc.name}): ${rc.cardId} ≠ ${u.from} → skip(안전)`); continue; }
    console.log(`  ✔ ${u.kr} [${u.id}]: ${u.from} → ${u.to} (단독, ${u.note})`);
    if (APPLY) {
      await prisma.card.upsert({ where: { id: u.to },
        create: { id: u.to, cardPackId: "sm-decks", primarySetId: u.set, primaryNumber: rc.number, primaryNumberInt: rc.numberInt, supertype: "Trainer", pokedexNumbers: [], subtypes: [], types: [], evolvesTo: [], rules: [] },
        update: {} });
      await prisma.regionCard.update({ where: { id: u.id }, data: { cardId: u.to } });
    }
  }

  if (APPLY) {
    console.log("\n· 검증");
    for (const n of ["023","024","026","033","035","038"]) {
      const jp = await prisma.regionCard.findFirst({ where: { setId: "jp-tcg-SMI", number: n }, select: { name: true, cardId: true } });
      const kr = await prisma.regionCard.findFirst({ where: { cardId: jp!.cardId!, region: "KR" }, select: { name: true } });
      console.log(`  SMI#${n} ${jp?.name} → KR ${kr ? kr.name : "(없음=정상)"}`);
    }
  } else console.log("\n(dry-run) 적용: --apply --allow-protected");
  await prisma.$disconnect();
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); });
