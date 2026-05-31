/**
 * 커뮤니티(게시판) 시드 (멱등).
 *
 * 실행: npm run seed:community
 *
 * - seed-users 로 생성된 유저들이 작성한 게시글 ~25개 (일반 + 거래글 혼합)
 * - 카테고리/수집품 다양, 댓글 다수(일부 대댓글), 좋아요 일부
 * - 멱등: 게시글은 (userId, title) 조합으로 중복 방지. 댓글/좋아요도 멱등.
 *
 * 선행: `npm run seed:users` (시드 유저 + 컬렉션). 유저가 없으면 건너뜀.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// 결정적 의사난수 (멱등성 유지용 — Date.now() 미사용)
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) & 0x7fffffff;
  return h;
}

type SeedPost = {
  author: string; // username
  collectibleCategory: string;
  category: string;
  title: string;
  body: string;
  hoursAgo: number;
  isPinned?: boolean;
  isHot?: boolean;
  // 거래글
  imageUrl?: string;
  priceKrw?: number | null;
  condition?: string;
  certified?: boolean;
  location?: string;
  dealMethod?: string;
  tradeStatus?: string;
  negotiable?: boolean;
};

const POSTS: SeedPost[] = [
  // ── 공지 (핀) ──────────────────────────────────────────────────────────
  {
    author: "raymond_tcg",
    collectibleCategory: "포켓몬 TCG",
    category: "정보",
    title: "레어독 커뮤니티 오픈 안내 및 이용 규칙",
    body: "안녕하세요, 레어독 운영팀입니다.\n커뮤니티 게시판이 정식 오픈되었습니다.\n\n허위 거래·욕설·도배는 제재 대상입니다. 즐거운 수집 생활 되세요!",
    hoursAgo: 48,
    isPinned: true,
  },
  // ── 포켓몬 TCG 일반 ────────────────────────────────────────────────────
  {
    author: "meta_kang" /* 없으면 fallback */,
    collectibleCategory: "포켓몬 TCG",
    category: "메타분석",
    title: "151 SAR 피카츄 가격 폭등 원인 심층 분석 — 공급 감소 vs 수요 급증",
    body: "최근 3개월간 번개장터·Pokémarket 데이터를 토대로 분석했습니다.\n\n공급은 줄고 수요는 늘어 가격이 우상향 중입니다.",
    hoursAgo: 1,
    isHot: true,
  },
  {
    author: "chaeyeon",
    collectibleCategory: "포켓몬 TCG",
    category: "자랑",
    title: "드디어 PSA 10 리자몽 ex SAR 받았어요 🎉 8개월 만에..",
    body: "작년 10월에 감정 맡긴게 드디어 왔네요.\n기다린 보람 있습니다. 다들 감정 얼마나 걸리셨어요?",
    hoursAgo: 2,
    isHot: true,
  },
  {
    author: "jihun99",
    collectibleCategory: "포켓몬 TCG",
    category: "질문",
    title: "LP 카드랑 NM 카드 가격 차이 실제로 얼마나 나요?",
    body: "고가 SAR 카드 기준으로 LP면 얼마나 낮게 봐야 하는지 궁금합니다.",
    hoursAgo: 3,
  },
  {
    author: "nari_collect",
    collectibleCategory: "포켓몬 TCG",
    category: "공략",
    title: "현재 메타 리자몽덱 최강 빌드 공유 — 지방대회 3연속 우승 레시피",
    body: "리자몽 ex + 마자용 + 불비달마 조합으로 안정성과 폭발력 모두 잡은 빌드입니다.",
    hoursAgo: 4,
    isHot: true,
  },
  {
    author: "sora_cards",
    collectibleCategory: "포켓몬 TCG",
    category: "거래후기",
    title: "레어독 통해서 뮤츠 ex SAR 직거래 완료 후기",
    body: "처음 직거래였는데 상대분이 친절하게 대응해 주셔서 감사했습니다.",
    hoursAgo: 5,
  },
  {
    author: "yujin",
    collectibleCategory: "포켓몬 TCG",
    category: "정보",
    title: "번개장터 사기 계정 주의 — 스크린샷 모음 (업데이트 중)",
    body: "최근 위조 PSA 케이스 사기 사례가 늘고 있습니다.\n거래 전 반드시 실물 확인하세요.",
    hoursAgo: 6,
    isHot: true,
  },
  {
    author: "dohyun_kr",
    collectibleCategory: "포켓몬 TCG",
    category: "자유",
    title: "포켓몬 카드 수집 몇 년째 하고 계세요?",
    body: "저는 5년째인데 주변에 같은 취미 가진 분들이 없어서 외롭네요 ㅎㅎ",
    hoursAgo: 7,
  },
  {
    author: "minjun_",
    collectibleCategory: "포켓몬 TCG",
    category: "공략",
    title: "뮤덱 입문 가이드 — 저예산으로 시작하는 방법",
    body: "고가 SAR 없이도 충분히 경쟁 가능한 뮤덱 빌드를 소개합니다.",
    hoursAgo: 26,
  },
  {
    author: "taeho_kr",
    collectibleCategory: "포켓몬 TCG",
    category: "메타분석",
    title: "파라다이스 드래고나 발매 1개월 — SAR 전 종목 시세 정리",
    body: "리자몽/가이오가/아마루르가 등 주요 SAR 1개월 추이 정리했습니다.",
    hoursAgo: 27,
  },
  {
    author: "seoyeon_",
    collectibleCategory: "포켓몬 TCG",
    category: "질문",
    title: "PSA 9 vs BGS 9.5 — 어떤 게 더 가치 있나요?",
    body: "감정사마다 기준이 다르다고 들었는데 실제 시장 반응이 궁금합니다.",
    hoursAgo: 28,
  },
  {
    author: "nari_collect",
    collectibleCategory: "포켓몬 TCG",
    category: "자랑",
    title: "151 세트 SAR 풀셋 완성! 총 18종 모두 수집 완료",
    body: "2년 동안 조금씩 모았는데 드디어 완성입니다. 총 비용 약 650만원..",
    hoursAgo: 48,
    isHot: true,
  },
  {
    author: "yeji_collect",
    collectibleCategory: "포켓몬 TCG",
    category: "정보",
    title: "포켓몬 TCG 공식 한국어판 vs 일본어판 가격 비교 분석",
    body: "같은 카드인데 언어판에 따라 가격이 다른 이유와 수집 전략을 공유합니다.",
    hoursAgo: 72,
  },
  // ── 포켓몬 거래글 (팝니다/삽니다) ──────────────────────────────────────
  {
    author: "raymond_tcg",
    collectibleCategory: "포켓몬 TCG",
    category: "팝니다",
    title: "피카츄 ex SAR (sv3pt5-215) NM 판매합니다",
    body: "PSA 미감정 NM급, 직접 확인 후 구매 가능.\n서울 강남 직거래 or 안전결제.",
    hoursAgo: 0,
    isHot: true,
    imageUrl: "https://images.pokemontcg.io/sv3pt5/215.png",
    priceKrw: 250000,
    condition: "NM",
    certified: false,
    location: "서울 강남구",
    dealMethod: "both",
    tradeStatus: "active",
    negotiable: false,
  },
  {
    author: "sora_cards",
    collectibleCategory: "포켓몬 TCG",
    category: "팝니다",
    title: "파라다이스 드래고나 풀박스 판매 (미개봉)",
    body: "발매일 구매 후 보관만 했습니다. 직거래 or 등기 발송 가능.",
    hoursAgo: 8,
    imageUrl: "https://images.pokemontcg.io/sv4pt5/191.png",
    priceKrw: 600000,
    condition: "NM",
    certified: false,
    location: "경기 성남시",
    dealMethod: "delivery",
    tradeStatus: "reserved",
    negotiable: true,
  },
  {
    author: "jihun99",
    collectibleCategory: "포켓몬 TCG",
    category: "삽니다",
    title: "피카츄 ex SAR (sv3pt5) NM 구합니다 — 24만원 이하",
    body: "PSA 미감정 NM급 이상 구합니다. 강남/서초 직거래 선호. 가격 협의 가능해요.",
    hoursAgo: 2,
    priceKrw: 240000,
    location: "서울 서초구",
    dealMethod: "direct",
    tradeStatus: "active",
    negotiable: true,
  },
  {
    author: "dohyun_kr",
    collectibleCategory: "포켓몬 TCG",
    category: "삽니다",
    title: "초승달의 섬 잠만보 ex SAR 구합니다",
    body: "등급 불문, 가격 맞으면 구매 의사 있습니다. 댓글 주세요.",
    hoursAgo: 5,
    priceKrw: null,
    dealMethod: "both",
    tradeStatus: "active",
    negotiable: true,
  },
  // ── 유희왕 ─────────────────────────────────────────────────────────────
  {
    author: "minjun_",
    collectibleCategory: "유희왕",
    category: "메타분석",
    title: "파이어킹 덱 현 메타 정리 — 일본 대회 Top8 기반 분석",
    body: "최근 일본 CS 결과를 보면 파이어킹의 비율이 압도적입니다. 구성 분석합니다.",
    hoursAgo: 1,
    isHot: true,
  },
  {
    author: "taeho_kr",
    collectibleCategory: "유희왕",
    category: "팝니다",
    title: "유희왕 블루아이즈 화이트 드래곤 1st 프리즈마틱",
    body: "상태 NM, PSA 감정 예정이었으나 급매합니다.",
    hoursAgo: 2,
    imageUrl: "https://images.pokemontcg.io/sv4pt5/182.png",
    priceKrw: 350000,
    condition: "NM",
    certified: false,
    location: "부산 해운대구",
    dealMethod: "both",
    tradeStatus: "completed",
    negotiable: true,
  },
  {
    author: "chaeyeon",
    collectibleCategory: "유희왕",
    category: "자랑",
    title: "드래그마 풀 아트 3종 PSA 10 풀셋 완성했습니다",
    body: "국내에 PSA 10 드래그마 3종 풀셋은 저만 있을 것 같아요 ㅎㅎ",
    hoursAgo: 24,
    isHot: true,
  },
  // ── 스니커즈 ───────────────────────────────────────────────────────────
  {
    author: "yeji_collect",
    collectibleCategory: "스니커즈",
    category: "정보",
    title: "나이키 X 사카이 콜라보 2026 발매 일정 정리",
    body: "글로벌 / 한국 발매 일정과 응모 방법 정리했습니다. SNKRS 앱 기준.",
    hoursAgo: 1,
    isHot: true,
  },
  {
    author: "seoyeon_",
    collectibleCategory: "스니커즈",
    category: "자랑",
    title: "Jordan 1 Retro High OG 'Chicago' DS 박스채 보관 자랑",
    body: "2015년 발매분 미착용 DS 상태입니다. 요즘 시세 얼마나 하나요?",
    hoursAgo: 3,
  },
  {
    author: "yujin",
    collectibleCategory: "스니커즈",
    category: "팝니다",
    title: "Nike Dunk Low 'Panda' 265mm 팝니다 — 12만원",
    body: "1회 착용, 케어 완료. 박스 있음. 직거래 합정역 가능.",
    hoursAgo: 5,
    priceKrw: 120000,
    condition: "LP",
    certified: false,
    location: "서울 마포구",
    dealMethod: "direct",
    tradeStatus: "active",
    negotiable: false,
  },
  {
    author: "seoyeon_",
    collectibleCategory: "스니커즈",
    category: "삽니다",
    title: "Jordan 1 Chicago 2015 270mm 구합니다",
    body: "DS 또는 VNDS 상태. 박스 있으면 우대. 시세 맞게 드릴게요.",
    hoursAgo: 24,
    priceKrw: null,
    dealMethod: "both",
    tradeStatus: "active",
    negotiable: true,
  },
  // ── 피규어 ─────────────────────────────────────────────────────────────
  {
    author: "yeji_collect",
    collectibleCategory: "피규어",
    category: "자랑",
    title: "굿스마일 피카츄 넨도로이드 한정판 개봉기",
    body: "원더페스티벌 한정판 드디어 받았습니다. 포장부터 완성도까지 공유해요.",
    hoursAgo: 4,
  },
  {
    author: "dohyun_kr",
    collectibleCategory: "피규어",
    category: "질문",
    title: "1/6 피규어 디스플레이 케이스 추천 받습니다",
    body: "먼지 차단 + 조명 내장 제품으로 국내 구매 가능한 것 있을까요?",
    hoursAgo: 6,
  },
];

// 게시글별 댓글 풀 (작성자 username, 본문). 대댓글은 parentIdx 로 첫 댓글에 연결.
const COMMENT_TEMPLATES: { body: string; reply?: string }[][] = [
  [{ body: "좋은 정보 감사합니다!" }, { body: "저도 궁금했던 내용이었어요." }, { body: "잘 봤습니다 👍", reply: "감사합니다!" }],
  [{ body: "분석 깔끔하네요. 잘 봤습니다." }, { body: "공급 감소가 핵심인 것 같아요." }],
  [{ body: "축하드려요! 부럽습니다 🎉" }, { body: "PSA 10 진짜 멋지네요", reply: "감사합니다 ㅎㅎ" }, { body: "감정 얼마나 걸리셨어요?" }],
  [{ body: "보통 LP면 NM 대비 70~85% 봐요." }, { body: "카드마다 편차가 커요." }],
  [{ body: "레시피 공유 감사합니다!" }, { body: "마자용 채용이 인상적이네요." }],
];

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, avatarInitial: true },
  });
  if (users.length === 0) {
    console.warn("[seed-community] 유저가 없습니다. 먼저 `npm run seed:users` 를 실행하세요.");
    return;
  }
  const byUsername = new Map(users.map((u) => [u.username ?? "", u]));
  const fallback = users[0];

  function resolveUser(username: string) {
    return byUsername.get(username) ?? fallback;
  }

  let postCount = 0;
  let commentCount = 0;
  let likeCount = 0;

  for (const [pi, p] of POSTS.entries()) {
    const author = resolveUser(p.author);
    const createdAt = new Date(Date.now() - p.hoursAgo * 3600_000);

    // 멱등: (userId, title) 로 기존 글 찾기
    const existing = await prisma.post.findFirst({
      where: { userId: author.id, title: p.title },
      select: { id: true },
    });

    const data = {
      userId: author.id,
      collectibleCategory: p.collectibleCategory,
      category: p.category,
      title: p.title,
      body: p.body,
      imageUrl: p.imageUrl ?? null,
      priceKrw: p.priceKrw ?? null,
      condition: p.condition ?? null,
      certified: p.certified ?? false,
      location: p.location ?? null,
      dealMethod: p.dealMethod ?? null,
      tradeStatus: p.tradeStatus ?? null,
      negotiable: p.negotiable ?? false,
      isPinned: p.isPinned ?? false,
      isHot: p.isHot ?? false,
      createdAt,
    };

    let postId: string;
    if (existing) {
      await prisma.post.update({ where: { id: existing.id }, data });
      postId = existing.id;
    } else {
      const created = await prisma.post.create({ data });
      postId = created.id;
      postCount++;
    }

    // ── 댓글 ──
    const tmpl = COMMENT_TEMPLATES[pi % COMMENT_TEMPLATES.length];
    const commenters = users.filter((u) => u.id !== author.id);
    let firstCommentId: string | null = null;

    for (const [ci, c] of tmpl.entries()) {
      const commenter = commenters[(hashStr(p.title) + ci) % commenters.length];
      // 멱등: (postId, userId, body) 로 중복 방지
      let comment = await prisma.comment.findFirst({
        where: { postId, userId: commenter.id, body: c.body, parentId: null },
        select: { id: true },
      });
      if (!comment) {
        comment = await prisma.comment.create({
          data: {
            postId,
            userId: commenter.id,
            body: c.body,
            createdAt: new Date(createdAt.getTime() + (ci + 1) * 600_000),
          },
          select: { id: true },
        });
        commentCount++;
      }
      if (ci === 0) firstCommentId = comment.id;

      // 대댓글 (작성자가 답글)
      if (c.reply && firstCommentId) {
        const existingReply = await prisma.comment.findFirst({
          where: { postId, userId: author.id, body: c.reply, parentId: comment.id },
          select: { id: true },
        });
        if (!existingReply) {
          await prisma.comment.create({
            data: {
              postId,
              userId: author.id,
              parentId: comment.id,
              body: c.reply,
              createdAt: new Date(createdAt.getTime() + (ci + 2) * 600_000),
            },
          });
          commentCount++;
        }
      }
    }

    // replyCount 동기화
    const replyTotal = await prisma.comment.count({
      where: { postId, deletedAt: null },
    });

    // ── 좋아요 (일부 유저) ──
    const likeN = (hashStr(p.title) % 6) + 1; // 1~6명
    const likers = users.slice(0, Math.min(likeN, users.length));
    for (const liker of likers) {
      const existingLike = await prisma.postLike.findUnique({
        where: { postId_userId: { postId, userId: liker.id } },
        select: { id: true },
      });
      if (!existingLike) {
        await prisma.postLike.create({ data: { postId, userId: liker.id } });
        likeCount++;
      }
    }
    const likeTotal = await prisma.postLike.count({ where: { postId } });

    await prisma.post.update({
      where: { id: postId },
      data: { replyCount: replyTotal, likeCount: likeTotal },
    });
  }

  console.log(
    `[seed-community] 완료. 신규 게시글 ${postCount} / 신규 댓글 ${commentCount} / 신규 좋아요 ${likeCount} (총 게시글 ${POSTS.length}건 동기화)`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
