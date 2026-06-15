/**
 * KR 시크릿 수집 — 퓨전아츠(S8) #110-129 + 마천퍼펙트(S7D) #80-90.
 *
 * 배경: 이 31장은 한국에 정식 발매됐으나(부스터박스, 한글판 실물 확인) 공식 온라인 DB(pokemoncard.co.kr)·
 *   CDN·TCGdex 가 최상위 시크릿 티어를 통째로 누락. 따라서 표준 apply-kr-official 경로로는 수집 불가.
 *   메타데이터(KR명·번호·레어도)는 namu.wiki 두 문서에서 31/31 추출, JP 논리카드에 "정체성"으로 매핑.
 *   ⚠️ 이미지는 이번 단계에서 수집 안 함(사용자 결정: "먼저 메타데이터만"). imageSmall/Large=null.
 *
 * 매핑 주의:
 *   - Pokémon/아이템/에너지: KR# = JP# → lc-orphan-jp-tcg-S8-{동일번호}.
 *   - S8 서포트 4종: KR 번호가 JP와 순열됨(KR 댄서=112지만 JP ダンサー=114 등) → 반드시 정체성으로 교차연결.
 *     (Limitless JP + TCGBOX 실물 + 우리 EN로케일 + trainer-names-swsh.ts 로 3중 확정.)
 *   - 부수 교정: 기존 LC.nameKo 스크램블 6건 교정. lc-S8-123(jp名 "ダンデ"=오류)을 "ダンサー"로 교정하고
 *     고아 EN Dancer HR(#274)을 lc-S8-123 에 연결(정체성 복원).
 *
 * 실행: npx tsx scripts/collect-kr-s8-s7d-secrets.ts [--apply]  (기본 dry-run)
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");

// 레어도 코드 → DB Rarity id
const RAR = {
  SR: "cmpp4wyyk001ryjurevrx3dq0", // Super Rare
  HR: "cmpp4wysu0016yjurcnv0ys4l", // Hyper Rare
  UR: "cmpp4wyzt001wyjuriy5esk1h", // Ultra Rare
} as const;

type Row = { krNum: number; krName: string; rar: keyof typeof RAR; lc: string };

// ── 검증된 31장 매핑 (namu 메타 + 정체성 교차연결) ──
const S8: Row[] = [
  { krNum: 110, krName: "요씽리스 V", rar: "SR", lc: "lc-orphan-jp-tcg-S8-110" },
  { krNum: 111, krName: "요씽리스 V", rar: "SR", lc: "lc-orphan-jp-tcg-S8-111" },
  { krNum: 112, krName: "댄서", rar: "SR", lc: "lc-orphan-jp-tcg-S8-114" }, // Dancer=ダンサー(JP#114)
  { krNum: 113, krName: "카밀레의 반짝임", rar: "SR", lc: "lc-orphan-jp-tcg-S8-113" },
  { krNum: 114, krName: "팟과 덴트와 콘", rar: "SR", lc: "lc-orphan-jp-tcg-S8-115" }, // 삼형제=trio(JP#115)
  { krNum: 115, krName: "혁진", rar: "SR", lc: "lc-orphan-jp-tcg-S8-112" }, // Sidney=カゲツ(JP#112)
  { krNum: 116, krName: "샹델라 VMAX", rar: "SR", lc: "lc-orphan-jp-tcg-S8-116" },
  { krNum: 117, krName: "펄스멍 VMAX", rar: "HR", lc: "lc-orphan-jp-tcg-S8-117" },
  { krNum: 118, krName: "뮤 VMAX", rar: "HR", lc: "lc-orphan-jp-tcg-S8-118" },
  { krNum: 119, krName: "뮤 VMAX", rar: "HR", lc: "lc-orphan-jp-tcg-S8-119" },
  { krNum: 120, krName: "요씽리스 VMAX", rar: "HR", lc: "lc-orphan-jp-tcg-S8-120" },
  { krNum: 121, krName: "댄서", rar: "HR", lc: "lc-orphan-jp-tcg-S8-123" }, // Dancer HR=ダンサー(JP#123, DB가 ダンデ로 오기)
  { krNum: 122, krName: "카밀레의 반짝임", rar: "HR", lc: "lc-orphan-jp-tcg-S8-122" },
  { krNum: 123, krName: "팟과 덴트와 콘", rar: "HR", lc: "lc-orphan-jp-tcg-S8-124" }, // 삼형제 HR(JP#124)
  { krNum: 124, krName: "혁진", rar: "HR", lc: "lc-orphan-jp-tcg-S8-121" }, // Sidney HR(JP#121)
  { krNum: 125, krName: "보송송", rar: "HR", lc: "lc-orphan-jp-tcg-S8-125" },
  { krNum: 126, krName: "파워태블릿", rar: "UR", lc: "lc-orphan-jp-tcg-S8-126" },
  { krNum: 127, krName: "트레이닝 코트", rar: "UR", lc: "lc-orphan-jp-tcg-S8-127" },
  { krNum: 128, krName: "기본 풀 에너지", rar: "UR", lc: "lc-orphan-jp-tcg-S8-128" },
  { krNum: 129, krName: "기본 불꽃 에너지", rar: "UR", lc: "lc-orphan-jp-tcg-S8-129" },
];
const S7D: Row[] = [
  { krNum: 80, krName: "루가루암 VMAX", rar: "SR", lc: "lc-orphan-jp-tcg-S7D-80" },
  { krNum: 81, krName: "더스트나 VMAX", rar: "HR", lc: "lc-orphan-jp-tcg-S7D-81" },
  { krNum: 82, krName: "두랄루돈 VMAX", rar: "HR", lc: "lc-orphan-jp-tcg-S7D-82" },
  { krNum: 83, krName: "두랄루돈 VMAX", rar: "HR", lc: "lc-orphan-jp-tcg-S7D-83" },
  { krNum: 84, krName: "금랑", rar: "HR", lc: "lc-orphan-jp-tcg-S7D-84" },
  { krNum: 85, krName: "스쿨걸", rar: "HR", lc: "lc-orphan-jp-tcg-S7D-85" },
  { krNum: 86, krName: "흉내내기 아가씨", rar: "HR", lc: "lc-orphan-jp-tcg-S7D-86" },
  { krNum: 87, krName: "크레세리아", rar: "HR", lc: "lc-orphan-jp-tcg-S7D-87" },
  { krNum: 88, krName: "풀 페이스 가드", rar: "UR", lc: "lc-orphan-jp-tcg-S7D-88" },
  { krNum: 89, krName: "결정동굴", rar: "UR", lc: "lc-orphan-jp-tcg-S7D-89" },
  { krNum: 90, krName: "기본 강철 에너지", rar: "UR", lc: "lc-orphan-jp-tcg-S7D-90" },
];

// nameKo 스크램블 교정 (정답 = EN/JP 정체성 기준)
const NAMEKO_FIX: Record<string, string> = {
  "lc-orphan-jp-tcg-S8-112": "혁진",          // Sidney
  "lc-orphan-jp-tcg-S8-114": "댄서",          // Dancer
  "lc-orphan-jp-tcg-S8-115": "팟과 덴트와 콘", // trio
  "lc-orphan-jp-tcg-S8-121": "혁진",
  "lc-orphan-jp-tcg-S8-123": "댄서",
  "lc-orphan-jp-tcg-S8-124": "팟과 덴트와 콘",
  // V/VMAX nameKo 슬립 교정 (카드는 VMAX인데 nameKo가 "V")
  "lc-orphan-jp-tcg-S8-117": "펄스멍 VMAX",
  "lc-orphan-jp-tcg-S8-119": "뮤 VMAX",
  "lc-orphan-jp-tcg-S7D-82": "두랄루돈 VMAX",
  "lc-orphan-jp-tcg-S7D-83": "두랄루돈 VMAX",
};

async function main() {
  console.log(`\n=== KR 시크릿 수집 (S8 #110-129, S7D #80-90) ${APPLY ? "[APPLY]" : "[DRY-RUN]"} ===`);
  assertWritable(["og-s8", "og-s7d"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-kr-s8-s7d-secrets" });

  // 사전 검증: 모든 타깃 논리카드가 실재하는지
  const allLc = [...new Set([...S8, ...S7D].map((r) => r.lc))];
  const foundLc = await prisma.card.findMany({ where: { id: { in: allLc } }, select: { id: true } });
  const missing = allLc.filter((id) => !foundLc.find((f) => f.id === id));
  if (missing.length) { console.error("🛑 논리카드 누락:", missing); process.exit(1); }
  console.log(`논리카드 확인: ${foundLc.length}/${allLc.length} OK`);

  let created = 0, updated = 0;
  for (const [setId, denom, code, rows] of [
    ["kr-s8", 100, "S8", S8] as const,
    ["kr-s7", 67, "S7D", S7D] as const,
  ]) {
    for (const r of rows) {
      const num3 = String(r.krNum).padStart(3, "0");
      const id = `${setId}-${num3}`;
      const data = {
        language: "ko", region: "KR",
        number: num3, numberInt: r.krNum, name: r.krName,
        imageSmall: null, imageLarge: null,
        card: { connect: { id: r.lc } },
        set: { connect: { id: setId } },
        rarity: { connect: { id: RAR[r.rar] } },
      };
      const exists = await prisma.regionCard.findUnique({ where: { id }, select: { id: true } });
      console.log(`  ${id}  ${num3}/${denom} ${r.rar}  ${r.krName.padEnd(16)} → ${r.lc}  ${exists ? "(update)" : "(create)"}`);
      if (APPLY) {
        await prisma.regionCard.upsert({ where: { id }, create: { id, ...data }, update: data });
        exists ? updated++ : created++;
      }
    }
  }

  // nameKo 스크램블 교정
  console.log(`\n--- nameKo 교정 (${Object.keys(NAMEKO_FIX).length}건) ---`);
  for (const [lc, ko] of Object.entries(NAMEKO_FIX)) {
    console.log(`  ${lc} → nameKo="${ko}"`);
    if (APPLY) await prisma.card.update({ where: { id: lc }, data: { nameKo: ko } });
  }

  // lc-S8-123 JP 스크램블 교정: JP RegionCard name ダンデ→ダンサー + 고아 EN Dancer HR(#274) 연결
  console.log(`\n--- lc-S8-123 정체성 복원 (ダンデ→ダンサー, EN #274 연결) ---`);
  console.log(`  jp-tcg-S8-123.name: ダンデ → ダンサー`);
  console.log(`  en-tcg-swsh8-274.logicalCardId → lc-orphan-jp-tcg-S8-123`);
  if (APPLY) {
    await prisma.regionCard.update({ where: { id: "jp-tcg-S8-123" }, data: { name: "ダンサー" } });
    await prisma.regionCard.update({ where: { id: "en-tcg-swsh8-274" }, data: { card: { connect: { id: "lc-orphan-jp-tcg-S8-123" } } } });
  }

  // Set.cardCount 갱신 (전체 세트 = JP 기준)
  console.log(`\n--- Set.cardCount: kr-s8→129, kr-s7→90 ---`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "kr-s8" }, data: { cardCount: 129 } });
    await prisma.set.update({ where: { id: "kr-s7" }, data: { cardCount: 90 } });
  }

  console.log(`\n=== ${APPLY ? `완료: RegionCard create ${created}, update ${updated}` : "DRY-RUN (변경 없음). --apply 로 실행."} ===`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
