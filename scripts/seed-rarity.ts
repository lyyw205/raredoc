/**
 * Rarity 마스터 시드 (멱등 upsert).
 *
 * 실행: npm run seed:rarity
 *
 * 1) 정규 코드(C/U/R/RR/AR/SAR/SR/UR/HR/PROMO) — 한·일 명, tier, color 포함.
 * 2) pokemontcg.io 영문 rarity 문자열들 — DB 실제 분포에서 발견된 값들을 그대로 code 로 사용.
 *    nameKo / nameJa 는 모르면 null (추측 금지).
 *
 * code 가 unique key — 동일 code 면 갱신.
 */
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";

type RaritySeed = {
  code: string;
  nameEn: string | null;
  nameKo: string | null;
  nameJa: string | null;
  tier: number;
  color: string | null;
};

// ─── 정규 코드 (KR/JP 명 확정) ──────────────────────────────────────────────
const CANONICAL: RaritySeed[] = [
  { code: "C", nameEn: "Common", nameKo: "커먼", nameJa: "コモン", tier: 1, color: "#9CA3AF" },
  { code: "U", nameEn: "Uncommon", nameKo: "언커먼", nameJa: "アンコモン", tier: 2, color: "#10B981" },
  { code: "R", nameEn: "Rare", nameKo: "레어", nameJa: "レア", tier: 3, color: "#3B82F6" },
  { code: "RR", nameEn: "Double Rare", nameKo: "더블 레어", nameJa: "ダブルレア", tier: 4, color: "#8B5CF6" },
  { code: "AR", nameEn: "Art Rare", nameKo: "아트 레어", nameJa: "アートレア", tier: 5, color: "#EC4899" },
  { code: "SAR", nameEn: "Special Art Rare", nameKo: "스페셜 아트 레어", nameJa: "スペシャルアートレア", tier: 6, color: "#F59E0B" },
  { code: "SR", nameEn: "Super Rare", nameKo: "슈퍼 레어", nameJa: "スーパーレア", tier: 7, color: "#EF4444" },
  { code: "UR", nameEn: "Ultra Rare", nameKo: "울트라 레어", nameJa: "ウルトラレア", tier: 8, color: "#DC2626" },
  { code: "HR", nameEn: "Hyper Rare", nameKo: "하이퍼 레어", nameJa: "ハイパーレア", tier: 9, color: "#7C3AED" },
  { code: "PROMO", nameEn: "Promo", nameKo: "프로모", nameJa: "プロモ", tier: 0, color: "#6B7280" },
];

// ─── DB 실제 분포 기반 영문 코드 (pokemontcg.io v2 문자열) ─────────────────
//   nameKo/nameJa: 모르면 null. 추측 금지.
const ENGLISH_RAW: RaritySeed[] = [
  { code: "Common", nameEn: "Common", nameKo: "커먼", nameJa: "コモン", tier: 1, color: "#9CA3AF" },
  { code: "Uncommon", nameEn: "Uncommon", nameKo: "언커먼", nameJa: "アンコモン", tier: 2, color: "#10B981" },
  { code: "Rare", nameEn: "Rare", nameKo: "레어", nameJa: "レア", tier: 3, color: "#3B82F6" },
  { code: "Rare Holo", nameEn: "Rare Holo", nameKo: null, nameJa: null, tier: 3, color: "#3B82F6" },
  { code: "Rare Holo EX", nameEn: "Rare Holo EX", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Rare Holo GX", nameEn: "Rare Holo GX", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Rare Holo V", nameEn: "Rare Holo V", nameKo: null, nameJa: null, tier: 4, color: "#8B5CF6" },
  { code: "Rare Holo VMAX", nameEn: "Rare Holo VMAX", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Rare Holo VSTAR", nameEn: "Rare Holo VSTAR", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Rare Holo LEGEND", nameEn: "Rare Holo LEGEND", nameKo: null, nameJa: null, tier: 6, color: "#F59E0B" },
  { code: "Rare Holo LV.X", nameEn: "Rare Holo LV.X", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Rare Holo Star", nameEn: "Rare Holo Star", nameKo: null, nameJa: null, tier: 6, color: "#F59E0B" },
  { code: "Rare Ultra", nameEn: "Rare Ultra", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Rare Secret", nameEn: "Rare Secret", nameKo: null, nameJa: null, tier: 8, color: "#DC2626" },
  { code: "Rare Rainbow", nameEn: "Rare Rainbow", nameKo: null, nameJa: null, tier: 8, color: "#DC2626" },
  { code: "Rare Shiny", nameEn: "Rare Shiny", nameKo: null, nameJa: null, tier: 6, color: "#F59E0B" },
  { code: "Rare Shiny GX", nameEn: "Rare Shiny GX", nameKo: null, nameJa: null, tier: 7, color: "#EF4444" },
  { code: "Rare Shining", nameEn: "Rare Shining", nameKo: null, nameJa: null, tier: 6, color: "#F59E0B" },
  { code: "Rare Prism Star", nameEn: "Rare Prism Star", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Rare Prime", nameEn: "Rare Prime", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Rare BREAK", nameEn: "Rare BREAK", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Rare ACE", nameEn: "Rare ACE", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "ACE SPEC Rare", nameEn: "ACE SPEC Rare", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Amazing Rare", nameEn: "Amazing Rare", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Art Rare", nameEn: "Art Rare", nameKo: "아트 레어", nameJa: "アートレア", tier: 5, color: "#EC4899" },
  { code: "Black White Rare", nameEn: "Black White Rare", nameKo: null, nameJa: null, tier: 6, color: "#F59E0B" },
  { code: "Character Rare", nameEn: "Character Rare", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Character Super Rare", nameEn: "Character Super Rare", nameKo: null, nameJa: null, tier: 6, color: "#F59E0B" },
  { code: "Classic Collection", nameEn: "Classic Collection", nameKo: null, nameJa: null, tier: 6, color: "#F59E0B" },
  { code: "Double rare", nameEn: "Double rare", nameKo: "더블 레어", nameJa: "ダブルレア", tier: 4, color: "#8B5CF6" },
  { code: "Double Rare", nameEn: "Double Rare", nameKo: "더블 레어", nameJa: "ダブルレア", tier: 4, color: "#8B5CF6" },
  { code: "Holo Rare", nameEn: "Holo Rare", nameKo: null, nameJa: null, tier: 3, color: "#3B82F6" },
  { code: "Hyper Rare", nameEn: "Hyper Rare", nameKo: "하이퍼 레어", nameJa: "ハイパーレア", tier: 9, color: "#7C3AED" },
  { code: "Illustration rare", nameEn: "Illustration rare", nameKo: null, nameJa: "イラストレア", tier: 5, color: "#EC4899" },
  { code: "Illustration Rare", nameEn: "Illustration Rare", nameKo: null, nameJa: "イラストレア", tier: 5, color: "#EC4899" },
  { code: "Kagayaku", nameEn: "Kagayaku", nameKo: null, nameJa: "かがやく", tier: 5, color: "#EC4899" },
  { code: "LEGEND", nameEn: "LEGEND", nameKo: null, nameJa: null, tier: 6, color: "#F59E0B" },
  { code: "Mega Attack Rare", nameEn: "Mega Attack Rare", nameKo: null, nameJa: null, tier: 7, color: "#EF4444" },
  { code: "Mega Hyper Rare", nameEn: "Mega Hyper Rare", nameKo: null, nameJa: null, tier: 9, color: "#7C3AED" },
  { code: "Mega Ultra Rare", nameEn: "Mega Ultra Rare", nameKo: null, nameJa: null, tier: 8, color: "#DC2626" },
  { code: "MEGA_ATTACK_RARE", nameEn: "Mega Attack Rare", nameKo: null, nameJa: null, tier: 7, color: "#EF4444" },
  { code: "None", nameEn: "None", nameKo: null, nameJa: null, tier: 0, color: "#6B7280" },
  { code: "Prism Rare", nameEn: "Prism Rare", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Promo", nameEn: "Promo", nameKo: "프로모", nameJa: "プロモ", tier: 0, color: "#6B7280" },
  { code: "Radiant Rare", nameEn: "Radiant Rare", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Secret Rare", nameEn: "Secret Rare", nameKo: null, nameJa: null, tier: 8, color: "#DC2626" },
  { code: "Shining", nameEn: "Shining", nameKo: null, nameJa: null, tier: 6, color: "#F59E0B" },
  { code: "Shiny Rare", nameEn: "Shiny Rare", nameKo: null, nameJa: null, tier: 6, color: "#F59E0B" },
  { code: "Shiny Secret Rare", nameEn: "Shiny Secret Rare", nameKo: null, nameJa: null, tier: 8, color: "#DC2626" },
  { code: "Shiny Ultra Rare", nameEn: "Shiny Ultra Rare", nameKo: null, nameJa: null, tier: 8, color: "#DC2626" },
  { code: "Special Art Rare", nameEn: "Special Art Rare", nameKo: "스페셜 아트 레어", nameJa: "スペシャルアートレア", tier: 6, color: "#F59E0B" },
  { code: "Special illustration rare", nameEn: "Special illustration rare", nameKo: null, nameJa: "スペシャルイラストレア", tier: 6, color: "#F59E0B" },
  { code: "Special Illustration Rare", nameEn: "Special Illustration Rare", nameKo: null, nameJa: "スペシャルイラストレア", tier: 6, color: "#F59E0B" },
  { code: "Super Rare", nameEn: "Super Rare", nameKo: "슈퍼 레어", nameJa: "スーパーレア", tier: 7, color: "#EF4444" },
  { code: "Super Rare Holo", nameEn: "Super Rare Holo", nameKo: null, nameJa: null, tier: 7, color: "#EF4444" },
  { code: "Trainer Gallery Rare Holo", nameEn: "Trainer Gallery Rare Holo", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Trainer Rare", nameEn: "Trainer Rare", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Triple Rare", nameEn: "Triple Rare", nameKo: null, nameJa: null, tier: 5, color: "#EC4899" },
  { code: "Ultra Rare", nameEn: "Ultra Rare", nameKo: "울트라 레어", nameJa: "ウルトラレア", tier: 8, color: "#DC2626" },
];

async function main() {
  // CANONICAL 먼저, 이어서 ENGLISH_RAW (code 가 unique 라 충돌하면 갱신).
  const all = [...CANONICAL, ...ENGLISH_RAW];

  let upserted = 0;
  for (const r of all) {
    await prisma.rarity.upsert({
      where: { code: r.code },
      update: { nameEn: r.nameEn, nameKo: r.nameKo, nameJa: r.nameJa, tier: r.tier, color: r.color },
      create: { code: r.code, nameEn: r.nameEn, nameKo: r.nameKo, nameJa: r.nameJa, tier: r.tier, color: r.color },
    });
    upserted++;
  }

  const total = await prisma.rarity.count();
  console.log(`SEED-RARITY: upserted=${upserted}, total in DB=${total}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
