/**
 * SV + MEGA era CardPack nameEn / nameKo 정비.
 *
 * - og-svk / og-svln / og-svls: Deck Build Box / Starter Set — JP-only, 한국 출시 없음
 * - MEGA 6개: JP-only, EN 발매 없음
 *
 * Run: npx tsx scripts/seed-sv-setgroup-names.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

interface Entry {
  id: string;
  nameEn?: string;
  nameKo?: string;
}

const ENTRIES: Entry[] = [
  // ── SV JP-only sub-sets (og-sv* 접두어) ──
  {
    id: "og-svk",
    nameEn: "Deck Build Box Stellar Miracle",
    nameKo: "덱 빌드 BOX 스텔라미라클",
  },
  {
    id: "og-svln",
    nameEn: "Starter Set Tera Type Stellar Sylveon ex",
    nameKo: "스타터 세트 테라스탈 타입: 스텔라 님피아 ex",
  },
  {
    id: "og-svls",
    nameEn: "Starter Set Tera Type Stellar Ceruledge ex",
    nameKo: "스타터 세트 테라스탈 타입: 스텔라 소우브레이즈 ex",
  },

  // ── MEGA era ──
  {
    id: "mega-brave-symphonia",
    nameEn: "Mega Brave & Mega Symphonia",
    nameKo: "메가브레이브+메가심포니아",
  },
  {
    id: "mega-infernox",
    nameEn: "Infernox",
    nameKo: "인페르노X",
  },
  {
    id: "mega-dream-ex",
    nameEn: "MEGA Dream ex",
    nameKo: "MEGA 드림 ex",
  },
  {
    id: "mega-munikisuzero",
    nameEn: "Munikisu Zero",
    nameKo: "무니키스 제로",
  },
  {
    id: "mega-ninja-spinner",
    nameEn: "Ninja Spinner",
    nameKo: "닌자 스피너",
  },
  {
    id: "mega-abyss-eye",
    nameEn: "Abyss Eye",
    nameKo: "어비스 아이",
  },
];

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const e of ENTRIES) {
    const grp = await prisma.cardPack.findUnique({ where: { id: e.id } });
    if (!grp) {
      console.log(`  ⚠ ${e.id} 없음 — skip`);
      skipped++;
      continue;
    }

    const data: Record<string, string> = {};
    if (e.nameEn && !grp.nameEn) data.nameEn = e.nameEn;
    if (e.nameKo && !grp.nameKo) data.nameKo = e.nameKo;

    if (Object.keys(data).length === 0) {
      console.log(`  ✓ ${e.id}: 이미 채워짐 (skip)`);
      skipped++;
      continue;
    }

    await prisma.cardPack.update({ where: { id: e.id }, data });
    console.log(`  ✓ ${e.id}: ${JSON.stringify(data)}`);
    updated++;
  }

  console.log(`\n결과: ${updated} 업데이트, ${skipped} 스킵`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
