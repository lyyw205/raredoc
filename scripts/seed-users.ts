/**
 * 테스트 유저 + 컬렉션 시드 (멱등).
 *
 * 실행: npm run seed:users
 *
 * - bcrypt 비번 (공통: "test1234")
 * - username/displayName/tier 다양
 * - 각자 CollectionItem 다수 (실제 pokemontcg.io 카드 id, ensureCard 로 Card upsert)
 * - 일부 인증(Certification)/하이라이트(highlightSlot)
 *
 * 멱등: upsert 기반. 재실행 시 동일 (user 는 email/username unique,
 * collectionItem 은 (userId, cardId, grade) 조합으로 중복 방지).
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { getCardsBySet } from "../src/lib/api/pokemontcg";
import { ensureLocale } from "../src/lib/services/cards";

const PASSWORD = "test1234";
const GRADES = ["NM", "NM", "NM", "LP", "LP", "MP", "VNDS"];

// ensureCard 가 동작하려면 Set 이 DB 에 있어야 함. 시드에 쓰는 세트만 보장.
const SEED_SETS = ["sv3pt5", "sv4pt5", "sv8"];

const USERS = [
  // yujin: 홈/도감 등에서 하드코딩 참조되는 데모 계정 (mock 링크 404 방지)
  { username: "yujin",        displayName: "유진",     tier: "GOLD",    bio: "포켓몬 카드 5년차 수집가. SV 시리즈 위주. 151 완성 도전 중." },
  { username: "raymond_tcg",  displayName: "레이먼드", tier: "LEGEND",  bio: "포켓몬 카드 10년차. SAR 풀셋 컬렉터." },
  { username: "chaeyeon",     displayName: "채연",     tier: "DIAMOND", bio: "PSA 감정 전문 수집가. 직거래 환영." },
  { username: "minjun_",      displayName: "민준",     tier: "DIAMOND", bio: "151 시리즈 집중 수집 중." },
  { username: "nari_collect", displayName: "나리",     tier: "GOLD",    bio: "151 SAR 풀셋 완성! 드래고나 공략 중." },
  { username: "sora_cards",   displayName: "소라",     tier: "GOLD",    bio: "합리적인 가격에 거래합니다." },
  { username: "jihun99",      displayName: "지훈",     tier: "SILVER",  bio: "주말 수집러. 천천히 모으는 중." },
  { username: "yeji_collect", displayName: "예지",     tier: "SILVER",  bio: "이브이 라인 좋아해요." },
  { username: "dohyun_kr",    displayName: "도현",     tier: "BRONZE",  bio: "이제 막 시작한 입문 컬렉터." },
  { username: "seoyeon_",     displayName: "서연",     tier: "BRONZE",  bio: "리자몽 한 장이 목표!" },
  { username: "taeho_kr",     displayName: "태호",     tier: "GOLD",    bio: "물 타입 덱과 카드 수집." },
];

async function ensureSeedSets() {
  // 세트가 없으면 카드 sync 가 불가하므로, 누락된 세트만 pokemontcg 카드 1장을 통해 확인.
  const existing = await prisma.set.findMany({
    where: { id: { in: SEED_SETS } },
    select: { id: true },
  });
  const have = new Set(existing.map((s) => s.id));
  const missing = SEED_SETS.filter((s) => !have.has(s));
  if (missing.length > 0) {
    console.warn(
      `[seed-users] 경고: 세트 미존재 ${missing.join(", ")} — 먼저 \`npm run seed\` 로 세트를 시드하세요. 해당 세트 카드는 건너뜁니다.`
    );
  }
}

/** 각 세트에서 카드 id 풀을 가져온다 (Set 존재하는 세트만). */
async function cardPool(): Promise<string[]> {
  const sets = await prisma.set.findMany({
    where: { id: { in: SEED_SETS } },
    select: { id: true },
  });
  const ids: string[] = [];
  for (const s of sets) {
    try {
      const cards = await getCardsBySet(s.id);
      // 희귀도 있는(=값나가는) 카드 위주로 일부만
      const picks = cards
        .filter((c) => c.rarity && c.rarity !== "Common" && c.rarity !== "Uncommon")
        .slice(0, 30)
        .map((c) => c.id);
      ids.push(...picks);
    } catch {
      // skip
    }
  }
  return ids;
}

// 결정적 의사난수 (username 기반) → 멱등성 유지
function seededPick<T>(arr: T[], seed: number, n: number): T[] {
  const out: T[] = [];
  let h = seed;
  const used = new Set<number>();
  let guard = 0;
  while (out.length < n && used.size < arr.length && guard < arr.length * 4) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const idx = h % arr.length;
    if (!used.has(idx)) {
      used.add(idx);
      out.push(arr[idx]);
    }
    guard++;
  }
  return out;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) & 0x7fffffff;
  return h;
}

async function main() {
  await ensureSeedSets();

  const pool = await cardPool();
  console.log(`[seed-users] 카드 풀: ${pool.length}장`);
  if (pool.length === 0) {
    console.warn("[seed-users] 카드 풀이 비어 있어 컬렉션 시드를 건너뜁니다. `npm run seed` 후 다시 실행하세요.");
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const [i, u] of USERS.entries()) {
    const email = `${u.username}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        username: u.username,
        displayName: u.displayName,
        name: u.displayName,
        passwordHash,
        avatarInitial: u.displayName.charAt(0),
        tier: u.tier,
        bio: u.bio,
      },
      update: {
        displayName: u.displayName,
        tier: u.tier,
        bio: u.bio,
        avatarInitial: u.displayName.charAt(0),
      },
    });

    if (pool.length === 0) continue;

    // 유저별 보유 카드 수 (티어 높을수록 많이)
    const tierCount: Record<string, number> = {
      LEGEND: 14, DIAMOND: 11, GOLD: 8, SILVER: 5, BRONZE: 3,
    };
    const count = tierCount[u.tier] ?? 4;
    const seed = hashStr(u.username);
    const cardIds = seededPick(pool, seed, count);

    let slot = 0;
    for (const [j, cardId] of cardIds.entries()) {
      const locale = await ensureLocale(cardId);
      if (!locale) continue;
      const card = locale;

      const grade = GRADES[(seed + j) % GRADES.length];
      // 멱등: 같은 (user, localeId, grade) 가 있으면 재사용
      const existing = await prisma.collectionItem.findFirst({
        where: { userId: user.id, localeId: cardId, grade },
      });
      const certified = j % 4 === 0; // 일부 인증
      const forSale = j % 3 === 0;   // 일부 판매중
      const highlight = slot < 3 && j % 2 === 0 ? ++slot : null; // 일부 하이라이트(최대 3)

      let itemId: string;
      if (existing) {
        await prisma.collectionItem.update({
          where: { id: existing.id },
          data: { certified, forSale, highlightSlot: highlight },
        });
        itemId = existing.id;
      } else {
        const created = await prisma.collectionItem.create({
          data: {
            userId: user.id,
            localeId: cardId,
            logicalCardId: locale.logicalCardId,
            grade,
            certified,
            forSale,
            highlightSlot: highlight,
          },
        });
        itemId = created.id;
      }

      // 인증된 카드는 Certification(approved) upsert
      if (certified) {
        await prisma.certification.upsert({
          where: { itemId },
          create: {
            itemId,
            photoUrl: card.imageLarge ?? card.imageSmall ?? "",
            status: "approved",
            approvedGrade: grade,
            reviewedAt: new Date(),
          },
          update: { status: "approved", approvedGrade: grade },
        });
      }
    }

    console.log(`  [${i + 1}/${USERS.length}] @${u.username}: ${cardIds.length}장`);
  }

  console.log(`[seed-users] 완료. 공통 비밀번호: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
