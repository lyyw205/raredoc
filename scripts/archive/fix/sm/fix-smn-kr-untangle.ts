/**
 * SMN KR 가나다 트레이너 스크램블 untangle — kr-smn(리자몽GX 덱)이 jp-tcg-SMN(테테푸GX 덱)과 SMN코드 공유로
 * 공통 스테이플 트레이너가 KR 가나다순 번호 때문에 교차연결됨. KR번호=공식(정체성)이라 유지, cardId 논리연결만 교정.
 *  · 재연결 6: KR을 올바른 JP 스테이플 LC로(크래시해머/레스큐탱크/부싯돌/친구수첩/아세로라/구즈마)
 *  · 언링크 4: JP-SMN에 없는 KR카드(타이마볼/포켓몬캐처/난천/마마네)를 단독 lc-kr-smn-* 로 분리
 * 각 이동 전 현재 cardId==예상 안전검사. sm-decks 동결 → --allow-protected (사용자 명시 요청).
 * Run: npx tsx scripts/fix-smn-kr-untangle.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");

// 재연결: KR RegionCard id → {from(현재 cardId, 안전검사), to(올바른 JP LC)}
const RELINK = [
  { id: "kr-smn-021", kr: "크래시 해머", from: "lc-jp-tcg-SMN-013", to: "lc-jp-tcg-SMN-004", jp: "クラッシュハンマー" },
  { id: "kr-smn-016", kr: "레스큐탱크",  from: "lc-jp-tcg-SMN-004", to: "lc-jp-tcg-SMN-013", jp: "レスキュータンカ" },
  { id: "kr-smn-017", kr: "부싯돌",      from: "lc-jp-tcg-SMN-003", to: "lc-jp-tcg-SMN-009", jp: "火打石" },
  { id: "kr-smn-020", kr: "친구수첩",    from: "lc-jp-tcg-SMN-030", to: "lc-jp-tcg-SMN-006", jp: "ともだちてちょう" },
  { id: "kr-smn-036", kr: "아세로라",    from: "lc-jp-tcg-SMN-024", to: "lc-jp-tcg-SMN-018", jp: "アセロラ" },
  { id: "kr-smn-032", kr: "구즈마",      from: "lc-jp-tcg-SMN-018", to: "lc-jp-tcg-SMN-022", jp: "グズマ" },
];
// 언링크: JP-SMN에 대응 없음 → 단독 Card 생성 후 분리
const UNLINK = [
  { id: "kr-smn-022", kr: "타이마볼",     from: "lc-jp-tcg-SMN-006", to: "lc-kr-smn-022" },
  { id: "kr-smn-024", kr: "포켓몬 캐처",  from: "lc-jp-tcg-SMN-015", to: "lc-kr-smn-024" },
  { id: "kr-smn-033", kr: "난천",         from: "lc-jp-tcg-SMN-022", to: "lc-kr-smn-033" },
  { id: "kr-smn-035", kr: "마마네",       from: "lc-jp-tcg-SMN-025", to: "lc-kr-smn-035" },
];

async function main() {
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-SMN", "kr-smn"] } }, select: { cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-smn-kr-untangle" });
  console.log(`■ SMN KR 트레이너 스크램블 untangle | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  console.log("· 재연결 6 (KR → 올바른 JP 스테이플)");
  for (const r of RELINK) {
    const rc = await prisma.regionCard.findUnique({ where: { id: r.id }, select: { cardId: true, name: true } });
    if (!rc) { console.log(`  🔴 ${r.id} 없음 → skip`); continue; }
    if (rc.cardId !== r.from) { console.log(`  ⚠️ ${r.id}(${rc.name}): 현재 ${rc.cardId} ≠ 예상 ${r.from} → skip(안전)`); continue; }
    console.log(`  ✔ ${r.kr} [${r.id}]: ${r.from} → ${r.to} (${r.jp})`);
    if (APPLY) await prisma.regionCard.update({ where: { id: r.id }, data: { cardId: r.to } });
  }

  console.log("\n· 언링크 4 (JP-SMN 대응없음 → 단독 KR 카드)");
  for (const u of UNLINK) {
    const rc = await prisma.regionCard.findUnique({ where: { id: u.id }, select: { cardId: true, name: true, number: true, numberInt: true } });
    if (!rc) { console.log(`  🔴 ${u.id} 없음 → skip`); continue; }
    if (rc.cardId !== u.from) { console.log(`  ⚠️ ${u.id}(${rc.name}): 현재 ${rc.cardId} ≠ 예상 ${u.from} → skip(안전)`); continue; }
    console.log(`  ✔ ${u.kr} [${u.id}]: ${u.from} → ${u.to} (단독)`);
    if (APPLY) {
      await prisma.card.upsert({ where: { id: u.to },
        create: { id: u.to, cardPackId: "sm-decks", primarySetId: "kr-smn", primaryNumber: rc.number, primaryNumberInt: rc.numberInt, supertype: "Trainer", pokedexNumbers: [], subtypes: [], types: [], evolvesTo: [], rules: [] },
        update: {} });
      await prisma.regionCard.update({ where: { id: u.id }, data: { cardId: u.to } });
    }
  }

  if (APPLY) {
    console.log("\n· 검증: 사용자 지목 11장 JP→KR 재확인");
    const checks = ["003","004","006","009","013","015","018","022","024","025","030"];
    for (const n of checks) {
      const jp = await prisma.regionCard.findFirst({ where: { setId: "jp-tcg-SMN", number: n }, select: { name: true, cardId: true } });
      const kr = await prisma.regionCard.findFirst({ where: { cardId: jp!.cardId!, region: "KR" }, select: { name: true } });
      console.log(`  JP#${n} ${jp?.name} → KR ${kr ? kr.name : "(없음=정상)"}`);
    }
  } else console.log("\n(dry-run) 적용: --apply --allow-protected");
  await prisma.$disconnect();
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); });
