/**
 * 遺跡をこえて (jp-tcg-neo2 / Neo Discovery) Unown 구간 #023-031 정체성 스크램블 교정.
 *
 * 배경(조사 확정): DB가 tcg 정본 JP 세트와 어긋남 —
 *   · #023 ネイティオ(Xatu)·#028 エーフィ(Espeon)·#030 ソーナンス(Wobbuffet) = 옆카드(#024/029/031, EN정상연결) 중복.
 *     실제 JP 정본은 이 자리가 Unown[I]/[U]/[A]. ★해당 LC는 이미 Unown 게임데이터(hp40·隠された力·Psychic) 보유,
 *     틀린 건 종링크(dex 178/196/202)와 RegionCard 이름뿐 → 종·이름만 교정(스탯 보존).
 *   · #026 アンノーン[M]·#027 アンノーン[U] = JP 정본 글자 [D]/[M]와 어긋남(EN 글자로 수집됨) → 이름만 교정.
 *   · EN(en-tcg-neo2) Unown 은 글자별로 잘못된 JP LC에 묶임 → 글자매칭 재바인딩.
 *     EN[I]#68→LC023, EN[D]#47→LC026, EN[M]#49→LC027, EN[U]#51→LC028, EN[A]#14→LC030. (EN[F]#48 유지)
 *     비워진 EN 고아LC(en-...-68/47/14) 삭제.
 *   이미지는 scripts/fill-neo2-batch.ts 가 이미 tcg 정본으로 교체(번호별 정확).
 *   #057(壁を台無しにする[Aerodactyl])은 이 스크립트 범위 밖(별도 조사).
 *
 * dry: npx tsx scripts/untangle-neo2-unown.ts
 * 적용: npx tsx scripts/untangle-neo2-unown.ts --apply
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { assertMappingWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-neo2";
const UNOWN = 201;

// JP 정본 글자(tcg) by number
const JP_LETTER: Record<string, string> = { "023": "I", "026": "D", "027": "M", "028": "U", "030": "A" };
// 종 교정 필요(현재 비-Unown) → Unown
const SPECIES_FIX: Record<string, number> = { "023": 178, "028": 196, "030": 202 };
// EN 글자매칭 재바인딩: EN number → 목표 JP LC suffix
const EN_REBIND: { enNum: string; letter: string; jpLc: string }[] = [
  { enNum: "68", letter: "I", jpLc: "lc-orphan-jp-tcg-neo2-023" },
  { enNum: "47", letter: "D", jpLc: "lc-orphan-jp-tcg-neo2-026" },
  { enNum: "49", letter: "M", jpLc: "lc-orphan-jp-tcg-neo2-027" },
  { enNum: "51", letter: "U", jpLc: "lc-orphan-jp-tcg-neo2-028" },
  { enNum: "14", letter: "A", jpLc: "lc-orphan-jp-tcg-neo2-030" },
];
// 이동 후 비워질 EN 고아 LC(삭제 대상)
const DELETE_EN_LC = ["lc-orphan-en-tcg-neo2-68", "lc-orphan-en-tcg-neo2-47", "lc-orphan-en-tcg-neo2-14"];

async function main() {
  // 영향 팩
  const enSet = await prisma.set.findUnique({ where: { id: "en-tcg-neo2" }, select: { cardPackId: true } });
  const jpSet = await prisma.set.findUnique({ where: { id: SET }, select: { cardPackId: true } });
  const packs = [...new Set([jpSet?.cardPackId, enSet?.cardPackId].filter(Boolean) as string[])];
  console.log(`${APPLY ? "APPLY" : "DRY"} untangle-neo2-unown | 영향 팩: ${packs.join(", ")}`);
  assertMappingWritable(packs, { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "untangle-neo2-unown", what: `Unown 구간 종/이름/연결 교정 (${packs.join(", ")})` });

  // 이름 포맷: 기존 #025 "アンノーン[F]" 에서 prefix/suffix 도출
  const ref = await prisma.regionCard.findFirst({ where: { setId: SET, number: "025", region: "JP" }, select: { name: true } });
  const m = ref?.name?.match(/^(.*\[)F(\].*)$/);
  if (!m) throw new Error(`#025 이름 포맷 파싱 실패: "${ref?.name}"`);
  const [pre, suf] = [m[1], m[2]];
  const unownName = (L: string) => `${pre}${L}${suf}`;
  console.log(`  이름 포맷: "${unownName("X")}" (ref #025="${ref!.name}")`);

  // tcg 정본 글자 검증
  const tcg: any[] = JSON.parse(readFileSync("tmp/neo2/tcg.json", "utf8"));
  const tByNum = new Map(tcg.map((x) => [x.number, x.enName]));
  for (const [n, L] of Object.entries(JP_LETTER)) {
    const en = String(tByNum.get(n) || "");
    if (!en.includes(`[${L}]`)) throw new Error(`tcg #${n}="${en}" 가 [${L}] 와 불일치 — 중단`);
  }
  console.log("  tcg 정본 글자 검증 통과:", JSON.stringify(JP_LETTER));

  // === PART A: JP 이름 + 종 교정 ===
  console.log("\n=== PART A: JP 이름/종 교정 ===");
  for (const [n, L] of Object.entries(JP_LETTER)) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET, number: n, region: "JP" }, select: { id: true, name: true, cardId: true } });
    if (!rc) throw new Error(`#${n} JP RegionCard 없음`);
    const newName = unownName(L);
    const spFix = SPECIES_FIX[n];
    console.log(`  #${n} name "${rc.name}"→"${newName}"${spFix ? ` | species ${spFix}→${UNOWN}, pokedex→[${UNOWN}]` : " (종 이미 Unown)"}`);
    if (APPLY) {
      await prisma.regionCard.update({ where: { id: rc.id }, data: { name: newName } });
      if (spFix) {
        await prisma.cardSpecies.deleteMany({ where: { cardId: rc.cardId, speciesId: spFix } });
        await prisma.cardSpecies.upsert({ where: { cardId_speciesId: { cardId: rc.cardId, speciesId: UNOWN } }, create: { cardId: rc.cardId, speciesId: UNOWN }, update: {} });
        await prisma.card.update({ where: { id: rc.cardId }, data: { pokedexNumbers: [UNOWN] } });
      }
    }
  }

  // === PART B: EN 글자매칭 재바인딩 ===
  console.log("\n=== PART B: EN 재바인딩 ===");
  for (const r of EN_REBIND) {
    const en = await prisma.regionCard.findFirst({ where: { setId: "en-tcg-neo2", number: r.enNum, region: "EN" }, select: { id: true, name: true, cardId: true } });
    if (!en) throw new Error(`EN #${r.enNum} 없음`);
    if (!en.name.includes(`[${r.letter}]`)) throw new Error(`EN #${r.enNum} "${en.name}" 가 [${r.letter}] 아님 — 중단`);
    const jp = await prisma.card.findUnique({ where: { id: r.jpLc }, select: { id: true } });
    if (!jp) throw new Error(`목표 JP LC ${r.jpLc} 없음`);
    console.log(`  EN#${r.enNum} "${en.name}" cardId ${en.cardId} → ${r.jpLc}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: en.id }, data: { cardId: r.jpLc } });
  }

  // === PART C: 비워진 EN 고아 LC 삭제 ===
  console.log("\n=== PART C: 빈 EN 고아 LC 삭제 ===");
  for (const lc of DELETE_EN_LC) {
    const rcCount = await prisma.regionCard.count({ where: { cardId: lc } });
    console.log(`  ${lc}: 남은 RegionCard=${rcCount}${rcCount === 0 ? " → 삭제" : " ‼ 비어있지 않음(보존)"}`);
    if (APPLY && rcCount === 0) {
      try {
        await prisma.cardSpecies.deleteMany({ where: { cardId: lc } });
        await prisma.card.delete({ where: { id: lc } });
        console.log(`    삭제 완료`);
      } catch (e: any) {
        console.log(`    ‼ 삭제 실패(보존, 빈 고아라 무해): ${String(e?.message ?? e).split("\n")[0]}`);
      }
    }
  }

  if (!APPLY) { console.log("\n적용: --apply"); return; }
  console.log("\n완료. 검증은 후속 스크립트로.");
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
