/**
 * jp-tcg-M-P-045 リザード(Charmeleon) — JP 이미지 404 교정.
 *
 * 원인: pokemon-card.com 이 이 한 파일만 "이중 확장자(.jpg.jpg)"로만 서빙(collect-mp-promos.ts 가 경고한 함정).
 *   DB·원본 JSON 엔 단일 `.jpg`(048480_P_RIZADO.jpg)로 저장돼 HTTP 404 → 사이트에서 이미지 없음.
 *   공식 상세(card/48480, <h1>リザード</h1>) img src = .../048480_P_RIZADO.jpg.jpg (HTTP 200, 동일 그림 확정).
 *
 * 수정: 단일 `.jpg` → 이중 `.jpg.jpg` (DB RegionCard imageLarge/imageSmall + 권위 원본 JSON 2개).
 *   EN/KR 매칭(연결) 미변경 — 이미지 URL 필드만. og-jp-mega-promo 는 보호그룹이라 --allow-protected 필요.
 *
 * dry-run: npx tsx scripts/fix-mp045-rizado-image.ts
 * 적용:    npx tsx scripts/fix-mp045-rizado-image.ts --apply --allow-protected
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const RC_ID = "jp-tcg-M-P-045";
const PACK = "og-jp-mega-promo";
const BAD = "https://www.pokemon-card.com/assets/images/card_images/large/M-P/048480_P_RIZADO.jpg";
const GOOD = "https://www.pokemon-card.com/assets/images/card_images/large/M-P/048480_P_RIZADO.jpg.jpg";
const JSON_FILES = ["data/jp-official/jp-m-p.json", "data/jp-official/jp-m-p-full.json"];

async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY-RUN"} — ${RC_ID} 이미지 404 교정 (.jpg → .jpg.jpg)`);

  // 보호그룹 가드 — 이미지 URL 교정이라 의도적, --allow-protected 로 해제.
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-mp045-rizado-image" });

  // ── 현재 상태 ──
  const before = await prisma.regionCard.findUnique({
    where: { id: RC_ID },
    select: { id: true, name: true, imageSmall: true, imageLarge: true },
  });
  if (!before) { console.error(`  ${RC_ID} DB에 없음 — 중단`); process.exit(1); }
  console.log(`  before: large=${before.imageLarge}`);
  console.log(`          small=${before.imageSmall}`);

  // ── DB ──
  if (APPLY) {
    await prisma.regionCard.update({
      where: { id: RC_ID },
      data: { imageLarge: GOOD, imageSmall: GOOD },
    });
    const after = await prisma.regionCard.findUnique({
      where: { id: RC_ID }, select: { imageLarge: true, imageSmall: true },
    });
    console.log(`  DB updated → large=${after?.imageLarge}`);
  } else {
    console.log(`  [DRY] DB large/small → ${GOOD}`);
  }

  // ── 권위 원본 JSON (재적재 회귀 방지) ──
  for (const f of JSON_FILES) {
    const raw = readFileSync(f, "utf8");
    if (!raw.includes(BAD)) { console.log(`  ${f}: 대상 URL 없음(이미 교정?) — skip`); continue; }
    const n = raw.split(BAD).length - 1;
    if (APPLY) {
      writeFileSync(f, raw.split(BAD).join(GOOD));
      console.log(`  ${f}: ${n}건 교정`);
    } else {
      console.log(`  [DRY] ${f}: ${n}건 교정 예정`);
    }
  }

  console.log(APPLY ? "\n완료." : "\n적용: npx tsx scripts/fix-mp045-rizado-image.ts --apply --allow-protected");
  await prisma.$disconnect();
}

main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); });
