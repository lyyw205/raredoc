/**
 * P1: Limitless 세트코드 통합 사전 생성 — docs/cardgame/meta-pipeline-multisource.md §3 선행 백필 1
 *
 * 실행: npx tsx scripts/build-limitless-setmap.ts [--dry-run]
 *
 * - EN: data/en-ptcg/*.json 캐시의 card.set.ptcgoCode → set.id + 수동 보충(캐시 미보유분)
 * - JP: DB의 jp-tcg-* Set 에서 코드 추출 (limitless standard-jp 덱리스트의 JP 세트코드용 — P3)
 * - 겸행: EN Set.code 가 null 이면 ptcgoCode 백필 (기존 non-null 과 충돌 시 로그만)
 * - 출력: data/limitless-setmap.json (resolve-card.ts 가 소비)
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

const dryRun = process.argv.includes("--dry-run");
const OUT = path.join(process.cwd(), "data", "limitless-setmap.json");

/** 캐시에 없는 Limitless 코드 수동 보충 (실측 근거는 각 주석) */
const MANUAL_EN: Record<string, string> = {
  SVI: "sv1", // Scarlet & Violet 기본판 — 캐시 미보유 (2026-06-06 확인)
  PAL: "sv2",
  OBF: "sv3",
  MEW: "sv3pt5",
  PAR: "sv4",
  PAF: "sv4pt5",
  SVP: "svp", // Limitless 는 SV 프로모를 SVP 로 표기 (pokemontcg.io ptcgoCode 는 PR-SV)
  SVE: "sve", // SV 기본 에너지
  CRI: "me4", // Chaos Rising 2026-05-22 — pokemontcg.io 실측 (DB 미수집 상태면 미해석으로 떨어짐)
};

/** 매핑 자체가 불가능한 코드 — 미해석 리포트에서 사유 구분용 */
const EN_UNMAPPED: Record<string, string> = {
  MEE: "메가 시대 기본 에너지 — pokemontcg.io/DB 모두 세트 부재 (2026-06-06 실측)",
};

async function main() {
  // 1. EN: 캐시 스캔
  const en: Record<string, string> = {};
  const cacheDir = path.join(process.cwd(), "data", "en-ptcg");
  for (const f of fs.readdirSync(cacheDir).filter((f) => f.endsWith(".json"))) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(cacheDir, f), "utf8"));
      const cards = Array.isArray(data) ? data : data?.data ?? data?.cards ?? [];
      const set = cards[0]?.set;
      if (set?.ptcgoCode && set?.id) en[set.ptcgoCode] = set.id;
    } catch {
      console.warn(`[setmap] 캐시 파싱 실패 skip: ${f}`);
    }
  }
  const cacheCount = Object.keys(en).length;
  for (const [code, setId] of Object.entries(MANUAL_EN)) {
    if (en[code] && en[code] !== setId) {
      console.warn(`[setmap] 수동/캐시 충돌 ${code}: cache=${en[code]} manual=${setId} — 캐시 우선`);
      continue;
    }
    en[code] = setId;
  }

  // 2. JP: DB jp-tcg-* 세트에서 코드 추출 (jp-tcg-SV1S → SV1S)
  const jpSets = await prisma.set.findMany({
    where: { id: { startsWith: "jp-tcg-" } },
    select: { id: true },
  });
  const jp: Record<string, string> = {};
  for (const s of jpSets) jp[s.id.slice("jp-tcg-".length)] = s.id;

  // 3. EN Set.code 백필 (null 만, 겸행)
  let codeBackfilled = 0;
  const conflicts: string[] = [];
  for (const [code, setId] of Object.entries(en)) {
    const set = await prisma.set.findUnique({ where: { id: setId }, select: { id: true, code: true } });
    if (!set) continue; // DB 미수집 세트 (me4 등) — setmap 에는 남김
    if (set.code === code) continue;
    if (set.code !== null) {
      conflicts.push(`${setId}: 기존 code=${set.code} vs ptcgo=${code}`);
      continue;
    }
    if (!dryRun) await prisma.set.update({ where: { id: setId }, data: { code } });
    codeBackfilled++;
  }
  if (conflicts.length) console.warn(`[setmap] Set.code 충돌(미변경) ${conflicts.length}건:\n  ${conflicts.join("\n  ")}`);

  // 4. 출력
  const out = {
    generatedAt: new Date().toISOString(),
    note: "Limitless 세트코드 → raredoc setId. EN=ptcgoCode(캐시+수동), JP=jp-tcg-* 기계 추출. resolve-card.ts 소비.",
    en,
    enUnmapped: EN_UNMAPPED,
    jp,
  };
  if (!dryRun) fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(
    `[setmap] EN ${Object.keys(en).length}건(캐시 ${cacheCount}+수동 ${Object.keys(en).length - cacheCount}) · JP ${Object.keys(jp).length}건 · Set.code 백필 ${codeBackfilled}건${dryRun ? " (dry)" : ` → ${OUT}`}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
