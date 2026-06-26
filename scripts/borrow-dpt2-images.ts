/**
 * DPt2-Se/Sg 누락 12칸 이미지 차용(같은-그림 본탄 재록) — 덱-전용 스캔 부재 확정(사용자 승인).
 * imageLarge/imageSmall 를 소스 RegionCard URL 로 공유(DB-only, R2 신규업로드 없음).
 * 안전장치: 소스·타깃 카드 이름이 nameHint 를 모두 포함할 때만 적용.
 * 실행: npx tsx scripts/borrow-dpt2-images.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const APPLY = process.argv.includes("--apply");

// 6종 소스 (전부 검증완): SP전용 2종=PT1 진본 · SPエネルギー=PT2(DPt2 동일발매일) · commons=동era DPt 덱프린트
const SRC: Record<string, { srcSet: string; srcNum: string; hint: string }> = {
  "011": { srcSet: "jp-tcg-DPt-GBna", srcNum: "011", hint: "エネルギー転送" },
  "012": { srcSet: "jp-tcg-PT1", srcNum: "083", hint: "ポケターン" },
  "013": { srcSet: "jp-tcg-DPt-GBpo", srcNum: "013", hint: "ポケモンいれかえ" },
  "014": { srcSet: "jp-tcg-DPt-GBpi", srcNum: "014", hint: "モンスターボール" },
  "015": { srcSet: "jp-tcg-PT1", srcNum: "088", hint: "エナジーゲイン" },
  "018": { srcSet: "jp-tcg-PT2", srcNum: "085", hint: "SPエネルギー" },
};
const TARGETS = ["jp-tcg-DPt2-Se", "jp-tcg-DPt2-Sg"];

async function main() {
  console.log(`=== DPt2 이미지 차용 ${APPLY ? "★APPLY" : "(dry-run)"} ===`);
  let ok = 0, skip = 0;
  for (const tgtSet of TARGETS) {
    for (const [num, s] of Object.entries(SRC)) {
      const tgt = await prisma.regionCard.findFirst({ where: { setId: tgtSet, number: num }, select: { id: true, name: true, imageLarge: true } });
      const src = await prisma.regionCard.findFirst({ where: { setId: s.srcSet, number: s.srcNum }, select: { name: true, imageLarge: true, imageSmall: true } });
      if (!tgt || !src) { console.log(`  ✗ ${tgtSet}#${num}: ${!tgt ? "타깃" : "소스"} 없음`); skip++; continue; }
      // 안전장치: 양쪽 이름이 hint 포함
      if (!tgt.name.includes(s.hint) || !src.name.includes(s.hint)) {
        console.log(`  ✗ ${tgtSet}#${num}: 이름불일치 tgt="${tgt.name}" src="${src.name}" hint="${s.hint}"`); skip++; continue;
      }
      if (!src.imageLarge) { console.log(`  ✗ ${tgtSet}#${num}: 소스 이미지 없음`); skip++; continue; }
      console.log(`  #${num} ${tgt.name.padEnd(28)} ← ${s.srcSet}#${s.srcNum} (${src.name})`);
      if (APPLY) {
        await prisma.regionCard.update({ where: { id: tgt.id }, data: { imageLarge: src.imageLarge, imageSmall: src.imageSmall } });
        ok++;
      }
    }
  }
  console.log(APPLY ? `\n✅ 차용 ${ok}건, skip ${skip}` : `\n(dry-run, skip ${skip})`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
