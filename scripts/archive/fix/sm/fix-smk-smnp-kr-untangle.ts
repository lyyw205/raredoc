/**
 * SMK + SMJ(SMNP) KR 오링크 교정.
 *  SMK: kr-smk(KR)가 jp-tcg-SMK(JP)와 SMK코드 공유 — 웅(Brock)/이슬(Misty)·릴리에/하우·체육관 가나다 교차(재연결6),
 *       + JP는 シロナ·KR은 난천 지역차로 난천이 シロナ에 오링크(언링크1).
 *  SMJ: jp-tcg-SMNP의 マーマネ·リーリエ에 다른 팩(kr-smn)의 쿠쿠이박사·하우가 잘못 붙음(교차오링크, 언링크2).
 * KR번호=공식(가나다=정체성) 유지, cardId 논리연결만 교정. 각 이동 전 현재 cardId==예상 안전검사.
 * sm-decks 동결 → --allow-protected (사용자 명시 요청).
 * Run: npx tsx scripts/fix-smk-smnp-kr-untangle.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");

const RELINK = [
  { id: "kr-smk-024", kr: "웅의 트레이닝",   from: "lc-jp-tcg-SMK-021", to: "lc-jp-tcg-SMK-025", jp: "タケシのトレーニング" },
  { id: "kr-smk-025", kr: "이슬의 물 다루기", from: "lc-jp-tcg-SMK-025", to: "lc-jp-tcg-SMK-021", jp: "カスミの水さばき" },
  { id: "kr-smk-022", kr: "릴리에",         from: "lc-jp-tcg-SMK-026", to: "lc-jp-tcg-SMK-028", jp: "リーリエ" },
  { id: "kr-smk-028", kr: "하우",           from: "lc-jp-tcg-SMK-028", to: "lc-jp-tcg-SMK-026", jp: "ハウ" },
  { id: "kr-smk-029", kr: "웅의 회색시티 체육관",   from: "lc-jp-tcg-SMK-029", to: "lc-jp-tcg-SMK-030", jp: "タケシのニビシティジム" },
  { id: "kr-smk-030", kr: "이슬의 블루시티 체육관", from: "lc-jp-tcg-SMK-030", to: "lc-jp-tcg-SMK-029", jp: "カスミのハナダシティジム" },
];
const UNLINK = [
  { id: "kr-smk-021", kr: "난천",       from: "lc-jp-tcg-SMK-023",  to: "lc-kr-smk-021", set: "kr-smk", note: "JP=シロナ(지역차)" },
  { id: "kr-smn-038", kr: "쿠쿠이박사",  from: "lc-jp-tcg-SMNP-031", to: "lc-kr-smn-038", set: "kr-smn", note: "SMNP マーマネ에 교차오링크" },
  { id: "kr-smn-040", kr: "하우",       from: "lc-jp-tcg-SMNP-032", to: "lc-kr-smn-040", set: "kr-smn", note: "SMNP リーリエ에 교차오링크" },
];

async function main() {
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-SMK", "kr-smk", "jp-tcg-SMNP", "kr-smn"] } }, select: { cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-smk-smnp-kr-untangle" });
  console.log(`■ SMK + SMJ(SMNP) KR 오링크 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  console.log("· SMK 재연결 6 (웅/이슬·릴리에/하우·체육관 가나다 교차)");
  for (const r of RELINK) {
    const rc = await prisma.regionCard.findUnique({ where: { id: r.id }, select: { cardId: true, name: true } });
    if (!rc) { console.log(`  🔴 ${r.id} 없음 → skip`); continue; }
    if (rc.cardId !== r.from) { console.log(`  ⚠️ ${r.id}(${rc.name}): ${rc.cardId} ≠ ${r.from} → skip(안전)`); continue; }
    console.log(`  ✔ ${r.kr} [${r.id}]: ${r.from} → ${r.to} (${r.jp})`);
    if (APPLY) await prisma.regionCard.update({ where: { id: r.id }, data: { cardId: r.to } });
  }

  console.log("\n· 언링크 3 (대응 JP 없음/교차오링크 → 단독 KR 카드)");
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
    console.log("\n· 검증: SMK 지목카드 + SMNP マーマネ/リーリエ");
    const chk = [["jp-tcg-SMK","021"],["jp-tcg-SMK","023"],["jp-tcg-SMK","025"],["jp-tcg-SMK","026"],["jp-tcg-SMK","028"],["jp-tcg-SMK","029"],["jp-tcg-SMK","030"],["jp-tcg-SMNP","031"],["jp-tcg-SMNP","032"]];
    for (const [sid, n] of chk) {
      const jp = await prisma.regionCard.findFirst({ where: { setId: sid, number: n }, select: { name: true, cardId: true } });
      const kr = await prisma.regionCard.findFirst({ where: { cardId: jp!.cardId!, region: "KR" }, select: { name: true } });
      console.log(`  ${sid}#${n} ${jp?.name} → KR ${kr ? kr.name : "(없음=정상)"}`);
    }
  } else console.log("\n(dry-run) 적용: --apply --allow-protected");
  await prisma.$disconnect();
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); });
