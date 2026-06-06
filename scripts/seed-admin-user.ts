/**
 * 관리자/데모 테스트 계정 + 풍부한 컬렉션 시드 (멱등).
 *
 * 계정: test@admin.com / test1234
 *
 * - bcrypt 해시 비번
 * - DB에 이미 적재된 CardLocale 에서 직접 카드 선별 (pokemontcg.io API 미사용 — WSL 안전)
 * - 다양한 카테고리(홀로~하이퍼)·지역(EN/JP/KR)·등급(NM~MP)·인증·하이라이트 포함
 *
 * 멱등: user 는 email upsert, collectionItem 은 (userId, localeId, grade) 기준 중복 방지.
 *
 * 실행: npx tsx scripts/seed-admin-user.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const EMAIL = "test@admin.com";
const PASSWORD = "test1234";
const USERNAME = "admin";
const DISPLAY = "관리자";

const GRADES = ["NM", "NM", "NM", "LP", "LP", "MP", "VNDS"];
const TARGET = 60; // 보유 카드 수

// 결정적 의사난수 (멱등성 유지)
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let h = seed;
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function main() {
  // 1) 계정 생성/갱신
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    create: {
      email: EMAIL,
      username: USERNAME,
      displayName: DISPLAY,
      name: DISPLAY,
      passwordHash,
      avatarInitial: "A",
      tier: "LEGEND",
      bio: "테스트 관리자 계정. 전 지역·전 등급 샘플 컬렉션 보유.",
    },
    update: {
      passwordHash,
      displayName: DISPLAY,
      tier: "LEGEND",
      bio: "테스트 관리자 계정. 전 지역·전 등급 샘플 컬렉션 보유.",
    },
  });
  console.log(`✓ 계정: ${EMAIL} (id=${user.id})`);

  // 2) 카드 풀: 이미지 있고 희귀도(category tier>=3) 있는 카드 — 지역/카테고리 다양하게
  const pool = await prisma.$queryRaw<
    { id: string; logicalCardId: string; region: string; name: string; cat: string | null; imageLarge: string | null; imageSmall: string | null }[]
  >`
    SELECT cl.id, cl."logicalCardId", cl.region, cl.name,
           rc."nameKo" AS cat, cl."imageLarge", cl."imageSmall"
    FROM "CardLocale" cl
    JOIN "LogicalCard" lc ON cl."logicalCardId" = lc.id
    LEFT JOIN "Rarity" r ON lc."rarityId" = r.id
    LEFT JOIN "RarityCategory" rc ON r."categoryId" = rc.id
    WHERE cl."imageSmall" IS NOT NULL
      AND rc.tier >= 3
    ORDER BY cl.id
  `;
  console.log(`카드 풀: ${pool.length}장 (이미지+희귀도 보유)`);

  // 지역 균형 잡기: EN/JP/KR 골고루
  const byRegion: Record<string, typeof pool> = { EN: [], JP: [], KR: [] };
  for (const c of pool) (byRegion[c.region] ??= []).push(c);
  const perRegion = Math.ceil(TARGET / 3);
  const picked: typeof pool = [];
  for (const region of ["KR", "JP", "EN"]) {
    const shuffled = seededShuffle(byRegion[region] ?? [], 0x9e37 + region.charCodeAt(0));
    picked.push(...shuffled.slice(0, perRegion));
  }
  const cards = seededShuffle(picked, 0x1234).slice(0, TARGET);
  console.log(`선택: ${cards.length}장 (KR/JP/EN 균형)`);

  // 3) CollectionItem 생성
  let slot = 0;
  let created = 0, reused = 0, certCount = 0;
  for (const [j, c] of cards.entries()) {
    const grade = GRADES[j % GRADES.length];
    const certified = j % 4 === 0;
    const forSale = j % 5 === 0;
    const highlight = slot < 5 && j % 3 === 0 ? ++slot : null;

    const existing = await prisma.collectionItem.findFirst({
      where: { userId: user.id, localeId: c.id, grade },
    });

    let itemId: string;
    if (existing) {
      await prisma.collectionItem.update({
        where: { id: existing.id },
        data: { certified, forSale, highlightSlot: highlight },
      });
      itemId = existing.id;
      reused++;
    } else {
      const item = await prisma.collectionItem.create({
        data: {
          userId: user.id,
          localeId: c.id,
          logicalCardId: c.logicalCardId,
          grade,
          certified,
          forSale,
          highlightSlot: highlight,
          estimatedKrw: 10000 + ((j * 37) % 50) * 5000,
        },
      });
      itemId = item.id;
      created++;
    }

    if (certified) {
      await prisma.certification.upsert({
        where: { itemId },
        create: {
          itemId,
          photoUrl: c.imageLarge ?? c.imageSmall ?? "",
          status: "approved",
          approvedGrade: grade,
          reviewedAt: new Date(),
        },
        update: { status: "approved", approvedGrade: grade },
      });
      certCount++;
    }
  }

  const total = await prisma.collectionItem.count({ where: { userId: user.id } });
  console.log(`\n✓ 완료: 신규 ${created} / 갱신 ${reused} / 인증 ${certCount}`);
  console.log(`  총 보유: ${total}장`);
  console.log(`\n로그인: ${EMAIL} / ${PASSWORD}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
