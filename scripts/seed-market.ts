/**
 * 마켓플레이스 + 메시지(DM) 시드 (멱등).
 *
 * 실행: npm run seed:market
 *
 * - 시드 유저의 forSale CollectionItem → Listing(active) + askingKrw 보정
 * - 유저 간 대화 몇 건 + 메시지(일부 cardRef/약속/후기) + offer 일부
 * - 멱등: Listing 은 itemId unique, 대화는 (user1,user2) unique, 메시지는
 *   동일 (conv, sender, content) 중복 시 건너뜀. Date.now() 미사용.
 *
 * 선행: `npm run seed:users` (시드 유저 + 컬렉션). 유저가 없으면 건너뜀.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { USD_KRW } from "../src/lib/trades/shared";

const CONDITION_COEFFICIENT: Record<string, number> = {
  미개봉: 1.15, "1착": 1.1, NM: 1.0, VNDS: 0.95, LP: 0.85, MP: 0.65, HP: 0.45, DS: 0.3, D: 0.3,
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) & 0x7fffffff;
  return h;
}

function estimateKrw(
  grade: string,
  estimatedKrw: number | null,
  prices: { normal: number | null; holofoil: number | null; reverseHolo: number | null; firstEdition: number | null }[]
): number | null {
  if (estimatedKrw != null) return estimatedKrw;
  const p = prices[0];
  if (!p) return null;
  const usd = p.holofoil ?? p.normal ?? p.reverseHolo ?? p.firstEdition ?? null;
  if (usd == null || !Number.isFinite(usd)) return null;
  return Math.round(usd * USD_KRW * (CONDITION_COEFFICIENT[grade] ?? 1.0));
}

function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function main() {
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    console.warn("[seed-market] 유저가 없습니다. 먼저 `npm run seed:users` 를 실행하세요.");
    return;
  }

  // ── 1. forSale 아이템 → Listing 동기화 ────────────────────────────────────
  const forSaleItems = await prisma.collectionItem.findMany({
    where: { forSale: true },
    select: {
      id: true,
      userId: true,
      grade: true,
      estimatedKrw: true,
      localeId: true,
      listing: { select: { id: true } },
      locale: {
        select: {
          prices: {
            orderBy: { recordedAt: "desc" },
            take: 1,
            select: { normal: true, holofoil: true, reverseHolo: true, firstEdition: true },
          },
        },
      },
    },
  });

  let listingCount = 0;
  const dealMethods = ["both", "direct", "delivery"];
  for (const it of forSaleItems) {
    const seed = hashStr(it.id);
    const asking = estimateKrw(it.grade, it.estimatedKrw, it.locale.prices);
    const dealMethod = dealMethods[seed % dealMethods.length];
    if (it.listing) {
      await prisma.listing.update({
        where: { itemId: it.id },
        data: { status: "active", askingKrw: asking, dealMethod },
      });
    } else {
      await prisma.listing.create({
        data: {
          itemId: it.id,
          sellerId: it.userId,
          askingKrw: asking,
          dealMethod,
          status: "active",
        },
      });
    }
    listingCount++;
  }
  console.log(`[seed-market] Listing 동기화: ${listingCount}건`);

  // ── 2. 시드 대화 + 메시지 + offer ─────────────────────────────────────────
  async function userByName(username: string) {
    return prisma.user.findFirst({ where: { username }, select: { id: true } });
  }

  /** 멱등 대화 생성 (unique [user1Id,user2Id]). */
  async function ensureConv(
    a: string,
    b: string,
    opts: { sourceType: string; cardId?: string | null; postId?: string | null }
  ) {
    const [user1Id, user2Id] = orderPair(a, b);
    const existing = await prisma.conversation.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      select: { id: true },
    });
    if (existing) return existing.id;
    const conv = await prisma.conversation.create({
      data: {
        user1Id,
        user2Id,
        sourceType: opts.sourceType,
        sourceCardId: opts.cardId ?? null,
        sourcePostId: opts.postId ?? null,
      },
      select: { id: true },
    });
    return conv.id;
  }

  /** 멱등 메시지 (동일 conv+sender+content 중복 방지). */
  async function ensureMessage(
    conversationId: string,
    senderId: string,
    content: string,
    extra?: { attachedCardId?: string; appointmentId?: string; reviewId?: string },
    minutesAgo = 0
  ) {
    const dup = await prisma.message.findFirst({
      where: { conversationId, senderId, content, appointmentId: extra?.appointmentId ?? null, reviewId: extra?.reviewId ?? null },
      select: { id: true },
    });
    if (dup) return dup.id;
    const createdAt = new Date(Date.now() - minutesAgo * 60_000);
    const msg = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        attachedCardId: extra?.attachedCardId ?? null,
        appointmentId: extra?.appointmentId ?? null,
        reviewId: extra?.reviewId ?? null,
        createdAt,
      },
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: createdAt },
    });
    return msg.id;
  }

  const [raymond, chaeyeon, nari, sora, minjun, jihun] = await Promise.all([
    userByName("raymond_tcg"),
    userByName("chaeyeon"),
    userByName("nari_collect"),
    userByName("sora_cards"),
    userByName("minjun_"),
    userByName("jihun99"),
  ]);

  let convCount = 0;
  let offerCount = 0;

  // 대화 A: chaeyeon → raymond, 카드 문의 + offer + 메시지
  if (chaeyeon && raymond) {
    // raymond 의 active listing 하나 골라 카드 문의로
    const listing = await prisma.listing.findFirst({
      where: { sellerId: raymond.id, status: "active" },
      select: { id: true, item: { select: { localeId: true } } },
    });
    const cardId = listing?.item.localeId ?? null;
    const convId = await ensureConv(chaeyeon.id, raymond.id, {
      sourceType: "card_inquiry",
      cardId,
    });
    convCount++;

    if (listing) {
      const existingOffer = await prisma.offer.findFirst({
        where: { listingId: listing.id, buyerId: chaeyeon.id },
        select: { id: true },
      });
      if (!existingOffer) {
        await prisma.offer.create({
          data: {
            listingId: listing.id,
            buyerId: chaeyeon.id,
            proposedKrw: 220000,
            status: "pending",
            conversationId: convId,
          },
        });
        offerCount++;
      }
    }

    await ensureMessage(convId, chaeyeon.id, "안녕하세요! 카드 구매 제안 드립니다. 아직 판매하시나요?", cardId ? { attachedCardId: cardId } : undefined, 180);
    await ensureMessage(convId, raymond.id, "네 아직 판매 중입니다! 상태는 NM이에요.", undefined, 150);
    await ensureMessage(convId, chaeyeon.id, "22만원에 가능할까요?", undefined, 120);
    await ensureMessage(convId, raymond.id, "22.5만원에 하시죠 ㅎㅎ 직거래 가능하세요?", undefined, 60);
  }

  // 대화 B: nari → minjun, 일반(direct) 대화
  if (nari && minjun) {
    const convId = await ensureConv(nari.id, minjun.id, { sourceType: "direct" });
    convCount++;
    await ensureMessage(convId, nari.id, "151 SAR 풀셋 정말 부럽네요! 어떻게 모으셨어요?", undefined, 1440);
    await ensureMessage(convId, minjun.id, "감사합니다 ㅎㅎ 1년 넘게 모았어요.", undefined, 1380);
  }

  // 대화 C: sora → raymond, 약속 + 후기까지 완료된 거래
  if (sora && raymond) {
    const listing = await prisma.listing.findFirst({
      where: { sellerId: raymond.id, status: { in: ["active", "reserved", "completed"] } },
      select: { id: true, item: { select: { localeId: true } } },
      orderBy: { createdAt: "asc" },
      skip: 1,
    });
    const cardId = listing?.item.localeId ?? null;
    const convId = await ensureConv(sora.id, raymond.id, { sourceType: "card_inquiry", cardId });
    convCount++;

    let offerId: string | null = null;
    if (listing) {
      const existing = await prisma.offer.findFirst({
        where: { listingId: listing.id, buyerId: sora.id },
        select: { id: true },
      });
      offerId = existing?.id ?? null;
      if (!offerId) {
        const o = await prisma.offer.create({
          data: {
            listingId: listing.id,
            buyerId: sora.id,
            proposedKrw: 180000,
            status: "completed",
            conversationId: convId,
            respondedAt: new Date(),
          },
        });
        offerId = o.id;
        offerCount++;
      }
    }

    await ensureMessage(convId, sora.id, "안녕하세요! 구매 희망합니다.", cardId ? { attachedCardId: cardId } : undefined, 4320);
    await ensureMessage(convId, raymond.id, "좋아요, 주말 직거래 어떠세요?", undefined, 4260);

    // 약속 메시지 (멱등: appointmentId 없는 동일 content 로 검사하므로 별도 가드)
    const aptMsgExists = await prisma.message.findFirst({
      where: { conversationId: convId, senderId: raymond.id, appointmentId: { not: null } },
      select: { id: true },
    });
    if (!aptMsgExists) {
      const apt = await prisma.appointment.create({
        data: {
          offerId: offerId ?? "",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          place: "강남역 11번 출구",
          status: "confirmed",
        },
      });
      await ensureMessage(convId, raymond.id, "", { appointmentId: apt.id }, 4200);
    }

    // 후기 메시지
    const reviewMsgExists = await prisma.message.findFirst({
      where: { conversationId: convId, senderId: sora.id, reviewId: { not: null } },
      select: { id: true },
    });
    if (!reviewMsgExists) {
      const review = await prisma.review.create({
        data: {
          offerId: offerId ?? "",
          raterId: sora.id,
          rateeId: raymond.id,
          rating: 5,
          manner: "good",
          comment: "친절하고 빠른 거래였어요. 감사합니다!",
        },
      });
      await ensureMessage(convId, sora.id, "", { reviewId: review.id }, 4000);
    }
  }

  // 대화 D: jihun → chaeyeon, 안읽음 남기기 (chaeyeon 이 마지막에 보냄)
  if (jihun && chaeyeon) {
    const convId = await ensureConv(jihun.id, chaeyeon.id, { sourceType: "direct" });
    convCount++;
    await ensureMessage(convId, jihun.id, "PSA 감정 어디서 맡기셨어요?", undefined, 300);
    await ensureMessage(convId, chaeyeon.id, "국내 대행 이용했어요! 추천드릴게요.", undefined, 200);
    await ensureMessage(convId, chaeyeon.id, "DM 주시면 링크 보내드릴게요 :)", undefined, 100);
  }

  console.log(`[seed-market] 대화: ${convCount}건, offer: ${offerCount}건`);
  console.log("[seed-market] 완료.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
