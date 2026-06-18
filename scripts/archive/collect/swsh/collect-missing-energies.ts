// 누락 기본 에너지 수집 — VSTAR 유니버스(og-s12a) #251~258 · 포켓몬 GO(og-s10b) #94~101
//
// 배경: tcgdex 수집원 갭으로 두 팩의 8종 기본 에너지(SR/기본)가 JP·KR 미수집.
//   - S12a: EN(Crown Zenith #152~159)은 이미 DB에 EN-단독 LC 로 존재 → 거기에 JP/KR 로케일을 붙여 통합.
//   - S10b: EN 대응 없음(EN PGO 에 기본에너지 미수록) → JP-앵커 신규 LC 생성(JP+KR).
// KR 이미지: pokemonkorea 호스트 직링(검증 200). JP 이미지: 공식/3rd 미수집 → null(UI 가 형제 일러로 폴백 + 미수집 마커).
//
// 동결 팩이므로 assertWritable 가드 + --allow-protected 필요. 기본은 dry-run, --apply 로 기록.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SUPER_RARE = "cmpp4wyyk001ryjurevrx3dq0"; // Rarity.code="Super Rare"

type Row = {
  type: string; ja: string; ko: string; en: string;
  s12aEnLC: string; s12a: number; s10b: number; gc: string;
};
// 타입 순서 = JP #251~258 / EN #152~159 / S10b #94~101 (Bulbapedia·KR공식 교차검증)
const TYPES: Row[] = [
  { type: "Grass",     ja: "基本草エネルギー", ko: "기본 풀 에너지",   en: "Grass Energy",     s12aEnLC: "lc-orphan-en-tcg-swsh12pt5-152", s12a: 251, s10b: 94,  gc: "gc_b7ba3d8bf11e71118a3d" },
  { type: "Fire",      ja: "基本炎エネルギー", ko: "기본 불꽃 에너지", en: "Fire Energy",      s12aEnLC: "lc-orphan-en-tcg-swsh12pt5-153", s12a: 252, s10b: 95,  gc: "gc_f52f0821cb78ec2cd22e" },
  { type: "Water",     ja: "基本水エネルギー", ko: "기본 물 에너지",   en: "Water Energy",     s12aEnLC: "lc-orphan-en-tcg-swsh12pt5-154", s12a: 253, s10b: 96,  gc: "gc_f393c822e06a3b7c5558" },
  { type: "Lightning", ja: "基本雷エネルギー", ko: "기본 번개 에너지", en: "Lightning Energy", s12aEnLC: "lc-orphan-en-tcg-swsh12pt5-155", s12a: 254, s10b: 97,  gc: "gc_8ab2d80cc76e77c94619" },
  { type: "Psychic",   ja: "基本超エネルギー", ko: "기본 초 에너지",   en: "Psychic Energy",   s12aEnLC: "lc-orphan-en-tcg-swsh12pt5-156", s12a: 255, s10b: 98,  gc: "gc_8a2a3e1260344e9d5452" },
  { type: "Fighting",  ja: "基本闘エネルギー", ko: "기본 격투 에너지", en: "Fighting Energy",  s12aEnLC: "lc-orphan-en-tcg-swsh12pt5-157", s12a: 256, s10b: 99,  gc: "gc_4f447d84461af1888b5a" },
  { type: "Darkness",  ja: "基本悪エネルギー", ko: "기본 악 에너지",   en: "Darkness Energy",  s12aEnLC: "lc-orphan-en-tcg-swsh12pt5-158", s12a: 257, s10b: 100, gc: "gc_b4ea4f4b7f247b4336c9" },
  { type: "Metal",     ja: "基本鋼エネルギー", ko: "기본 강철 에너지", en: "Metal Energy",     s12aEnLC: "lc-orphan-en-tcg-swsh12pt5-159", s12a: 258, s10b: 101, gc: "gc_0daf4137b29fbd3931c4" },
];

const krImg = (setcode: "S12a" | "S10b", n: number) =>
  `https://cards.image.pokemonkorea.co.kr/data/wmimages/S/${setcode}/${setcode}_${String(n).padStart(3, "0")}.png`;

type RC = {
  id: string; cardId: string; language: string; region: string; setId: string;
  number: string; numberInt: number; name: string;
  imageSmall: string | null; imageLarge: string | null; rarityId: string | null;
};
type LC = {
  id: string; cardPackId: string; primarySetId: string; primaryNumber: string; primaryNumberInt: number;
  supertype: string; subtypes: string[]; types: string[]; gameCardId: string; nameKo: string; rarityId: string | null;
};

async function main() {
  assertWritable(["og-s12a", "og-s10b"], {
    allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-missing-energies",
  });

  const newLCs: LC[] = [];
  const newRCs: RC[] = [];
  const lcUpdates: { id: string; nameKo: string }[] = [];

  for (const t of TYPES) {
    // ── S12a: 기존 EN 에너지 LC 에 JP/KR 붙이기 ──
    const enLC = await prisma.card.findUnique({ where: { id: t.s12aEnLC }, select: { id: true, nameKo: true, locales: { select: { region: true } } } });
    if (!enLC) throw new Error(`S12a EN LC 없음: ${t.s12aEnLC} (${t.type})`);
    if (enLC.locales.some((l) => l.region === "JP" || l.region === "KR"))
      console.warn(`  ⚠ ${t.s12aEnLC} 에 이미 JP/KR 로케일 있음 — upsert 로 멱등 처리`);
    if (!enLC.nameKo) lcUpdates.push({ id: t.s12aEnLC, nameKo: t.ko });
    newRCs.push({
      id: `jp-tcg-S12a-${t.s12a}`, cardId: t.s12aEnLC, language: "ja", region: "JP", setId: "jp-tcg-S12a",
      number: String(t.s12a), numberInt: t.s12a, name: t.ja, imageSmall: null, imageLarge: null, rarityId: SUPER_RARE,
    });
    newRCs.push({
      id: `kr-s12a-${t.s12a}`, cardId: t.s12aEnLC, language: "ko", region: "KR", setId: "kr-s12a",
      number: String(t.s12a), numberInt: t.s12a, name: t.ko,
      imageSmall: krImg("S12a", t.s12a), imageLarge: krImg("S12a", t.s12a), rarityId: SUPER_RARE,
    });

    // ── S10b: JP-앵커 신규 LC + JP/KR ──
    const lcId = `lc-orphan-jp-tcg-S10b-${t.s10b}`;
    newLCs.push({
      id: lcId, cardPackId: "og-s10b", primarySetId: "jp-tcg-S10b", primaryNumber: String(t.s10b), primaryNumberInt: t.s10b,
      supertype: "Energy", subtypes: ["Basic"], types: [], gameCardId: t.gc, nameKo: t.ko, rarityId: null,
    });
    newRCs.push({
      id: `jp-tcg-S10b-${t.s10b}`, cardId: lcId, language: "ja", region: "JP", setId: "jp-tcg-S10b",
      number: String(t.s10b), numberInt: t.s10b, name: t.ja, imageSmall: null, imageLarge: null, rarityId: null,
    });
    newRCs.push({
      id: `kr-s10b-${String(t.s10b).padStart(3, "0")}`, cardId: lcId, language: "ko", region: "KR", setId: "kr-s10b",
      number: String(t.s10b).padStart(3, "0"), numberInt: t.s10b, name: t.ko,
      imageSmall: krImg("S10b", t.s10b), imageLarge: krImg("S10b", t.s10b), rarityId: null,
    });
  }

  // 계획 출력
  console.log(`\n=== 계획 (${APPLY ? "APPLY" : "DRY-RUN"}) ===`);
  console.log(`신규 LogicalCard (S10b): ${newLCs.length}개`);
  console.log(`기존 EN LC nameKo 보강 (S12a): ${lcUpdates.length}개`);
  console.log(`신규 RegionCard: ${newRCs.length}개 (JP ${newRCs.filter((r) => r.region === "JP").length} / KR ${newRCs.filter((r) => r.region === "KR").length})`);
  for (const r of newRCs)
    console.log(`  [${r.region}] ${r.id}  #${r.number} ${r.name}  img=${r.imageSmall ? "KR직링" : "null(폴백)"}  rar=${r.rarityId ? "SR" : "-"}  → LC ${r.cardId}`);

  if (!APPLY) { console.log("\n(dry-run — 기록 안 함. --apply --allow-protected 로 실제 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const u of lcUpdates) await tx.card.update({ where: { id: u.id }, data: { nameKo: u.nameKo } });
    for (const lc of newLCs) {
      const { id, ...rest } = lc;
      await tx.card.upsert({ where: { id }, create: { id, ...rest }, update: rest });
    }
    for (const r of newRCs) {
      const { id, ...rest } = r;
      await tx.regionCard.upsert({ where: { id }, create: { id, ...rest }, update: rest });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
