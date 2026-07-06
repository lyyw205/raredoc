/**
 * JP 세트 발매일 교정 — DB vs tcgcollector 1차비교 → 불일치 건을 일본 권위 출처(공식 pokemon-card.com·
 *   ja.wikipedia·ポケモンWiki·pokeboon 등)로 3자 검증, 2/3 다수결(또는 JP공식 고신뢰·DB가 명백한 배치 플레이스홀더)로 확정.
 *   (Set.releaseDate = FREE 필드, 매핑가드 불필요)
 *
 * 근거 요약(출처는 조사 리포트):
 *   - JP==tcgc 2/3 일치: DPt4-Slp/Sgf·Br·L2-Sb·SP5·wcs23·clk/cll/clf·M3·M5·svp
 *   - DPs-S: JP 2008-07-09 ≈ tcgc 2008-07-10 (DB 2008-11-20=플레이스홀더) → JP채택
 *   - 엔트리팩DPt(×3)=2008-12-26 / ギフトボックスDPt(×4)=2009-04-18: DB 균일플레이스홀더 명백오류 + JP공식 고신뢰(요일·가격 검증) → JP채택(tcgc는 모팩일자 의심)
 *   ※ 보류(미적용): 프로모 시리즈 DPP/DPtP/L-P/XYP/S-P(개시일 컨벤션)·S8a-G(명목/추첨)·SN(정체성)·XYB/DPST1(정체성/버그)·bwp(DB=JP 유지)
 *
 * dry: npx tsx scripts/fix-jp-release-dates.ts
 * 적용: npx tsx scripts/fix-jp-release-dates.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

const FIX: { id: string; date: string; reason: string }[] = [
  { id: "jp-tcg-DPt4-Slp", date: "2009-07-08", reason: "JP==tcgc (공식상품·복수샵)" },
  { id: "jp-tcg-DPt4-Sgf", date: "2009-07-08", reason: "JP==tcgc" },
  { id: "jp-tcg-Br", date: "2009-11-20", reason: "JP==tcgc (ja.wiki LEGEND 바트르스타트덱)" },
  { id: "jp-tcg-L2-Sb", date: "2010-02-11", reason: "JP==tcgc (ja.wiki 구축스탠다드덱)" },
  { id: "jp-tcg-SP5", date: "2021-08-20", reason: "JP==tcgc (공식 sp5.html)" },
  { id: "jp-wcs23", date: "2023-07-28", reason: "JP==tcgc 일반판매일(공식 wcs23.html); DB는 대회개최일이었음" },
  { id: "jp-clk", date: "2023-10-31", reason: "JP≈tcgc (공식 classic, 10월하순 대표일)" },
  { id: "jp-cll", date: "2023-10-31", reason: "JP≈tcgc" },
  { id: "jp-clf", date: "2023-10-31", reason: "JP≈tcgc" },
  { id: "jp-mega-munikisuzero", date: "2026-01-23", reason: "JP==tcgc (공식 m3, ムニキスゼロ)" },
  { id: "jp-mega-abyss-eye", date: "2026-05-22", reason: "JP==tcgc (공식 m5)" },
  { id: "jp-svp", date: "2022-11-18", reason: "JP==tcgc (SV-P 시리즈개시=SV소프트발매)" },
  { id: "jp-tcg-DPs-S", date: "2008-07-09", reason: "JP 2008-07-09 ≈ tcgc 07-10 (DB 11-20=플레이스홀더, 영화タイイン 2소스 클러스터)" },

  // ── 2차(사용자 결정 반영) ──────────────────────────────────────────
  // ① 프로모 = 시리즈 개시일(일본출처)로 정렬
  { id: "jp-tcg-DPP", date: "2006-10-27", reason: "사용자결정: 프로모 개시일(pokeboon DP-P 시작 2006-10-27)" },
  { id: "jp-tcg-DPtP", date: "2008-10-10", reason: "사용자결정: 프로모 개시일(DPt-P, ギンガの覇道 동시 2008-10-10)" },
  { id: "jp-tcg-L-P", date: "2009-10-09", reason: "사용자결정: 프로모 개시일(L-P 2009-10-09)" },
  { id: "jp-tcg-XYP", date: "2013-11-08", reason: "사용자결정: 프로모 개시일(XY-P 2013-11-08)" },
  { id: "jp-s-p", date: "2019-11-19", reason: "사용자결정: 프로모 개시일(S-P 2019-11-19)" },
  // ② 엔트리팩DPt·ギフトボックスDPt = tcgc 기준
  { id: "jp-tcg-DPt-EPd", date: "2008-10-10", reason: "사용자결정: tcgc 기준" },
  { id: "jp-tcg-DPt-EPg", date: "2008-10-10", reason: "사용자결정: tcgc 기준" },
  { id: "jp-tcg-DPt-EPp", date: "2008-10-10", reason: "사용자결정: tcgc 기준" },
  { id: "jp-tcg-DPt-GBpi", date: "2008-11-20", reason: "사용자결정: tcgc 기준" },
  { id: "jp-tcg-DPt-GBpo", date: "2008-11-20", reason: "사용자결정: tcgc 기준" },
  { id: "jp-tcg-DPt-GBhi", date: "2008-11-20", reason: "사용자결정: tcgc 기준" },
  { id: "jp-tcg-DPt-GBna", date: "2008-11-20", reason: "사용자결정: tcgc 기준" },
  // ③ S8a-G = 명목 발매예정일
  { id: "jp-tcg-S8a-G", date: "2021-10-22", reason: "사용자결정: 명목 발매일(추첨/수주 전 예정일)" },
  // ⑤ XYB = Dialga-EX+Aegislash-EX 하이퍼메탈체인덱 확정(1970버그 교정), tcgc 2014-09-13
  { id: "jp-tcg-XYB", date: "2014-09-13", reason: "사용자확정: 정체성=Dialga-EX+Aegislash덱, 1970→tcgc 2014-09-13" },
  // ④ SN=유지(스타트덱100 정체성) · bwp=유지(DB=JP 2010-09-18) · DPST1=보류(1970, 정체성 불명)
];

async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY"} fix-jp-release-dates | ${FIX.length}`);
  const ids = FIX.map((f) => f.id);
  const cur = await prisma.set.findMany({ where: { id: { in: ids } }, select: { id: true, releaseDate: true } });
  const m = new Map(cur.map((s) => [s.id, s.releaseDate?.toISOString().slice(0, 10) ?? null]));
  const missing = ids.filter((id) => !m.has(id));
  if (missing.length) { console.error(`✗ 없는 세트: ${missing.join(", ")}`); process.exit(1); }
  for (const f of FIX) console.log(`  ${f.id.padEnd(20)} ${m.get(f.id)} → ${f.date}   (${f.reason})`);
  if (!APPLY) { console.log("\n[dry] --apply 로 실행"); return; }
  let ok = 0;
  for (const f of FIX) {
    await prisma.set.update({ where: { id: f.id }, data: { releaseDate: new Date(f.date + "T00:00:00.000Z") } });
    ok++;
  }
  console.log(`\n완료 ${ok}/${FIX.length}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
