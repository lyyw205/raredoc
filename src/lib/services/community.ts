import { prisma } from "@/lib/prisma";
import type { Post } from "@/components/community/CommunityBoard";
import { isTradeCategory } from "@/components/community/tradeMeta";
import { formatRelativeKo } from "@/lib/format/relative-time";

// ─────────────────────────────────────────────────────────────────────────────
// 공통 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/** 한국어 상대시간. 홈/목록/상세에서 동일 톤으로 사용(일 단위까지만 — 주/개월/년 표기 없음). */
export function relativeKo(date: Date): string {
  return formatRelativeKo(date, { maxUnit: "day" });
}

/** body 첫 줄(비어있지 않은)로 preview 파생. */
function derivePreview(body: string): string {
  const firstLine = body
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return firstLine ?? "";
}

// CommunityBoard 의 Post.condition / tradeStatus 는 유니온 타입이라 안전하게 캐스팅.
function toCondition(v: string | null): Post["condition"] {
  if (v === "NM" || v === "LP" || v === "MP" || v === "HP") return v;
  return undefined;
}

function toDealMethod(v: string | null): Post["dealMethod"] {
  if (v === "direct" || v === "delivery" || v === "both") return v;
  return undefined;
}

function toTradeStatus(v: string | null): Post["tradeStatus"] {
  if (
    v === "active" ||
    v === "reserved" ||
    v === "completed" ||
    v === "hidden" ||
    v === "deleted"
  )
    return v;
  return undefined;
}

// Post + 작성자 join 의 공통 select.
const postAuthorSelect = {
  user: {
    select: {
      username: true,
      displayName: true,
      name: true,
      avatarInitial: true,
    },
  },
} as const;

type PostWithAuthor = {
  id: string;
  userId: string;
  collectibleCategory: string;
  category: string;
  title: string;
  body: string;
  imageUrl: string | null;
  images: string[];
  priceKrw: number | null;
  condition: string | null;
  certified: boolean;
  location: string | null;
  dealMethod: string | null;
  tradeStatus: string | null;
  negotiable: boolean;
  isPinned: boolean;
  isHot: boolean;
  viewCount: number;
  likeCount: number;
  replyCount: number;
  createdAt: Date;
  user: {
    username: string | null;
    displayName: string | null;
    name: string | null;
    avatarInitial: string | null;
  };
};

function authorName(u: PostWithAuthor["user"]): string {
  return u.displayName ?? u.name ?? u.username ?? "익명";
}

function authorInitial(u: PostWithAuthor["user"], name: string): string {
  return u.avatarInitial ?? name.charAt(0) ?? "?";
}

/** Post 레코드 → CommunityBoard 가 소비하는 Post 뷰. */
function toPostView(p: PostWithAuthor): Post {
  const name = authorName(p.user);
  const trade = isTradeCategory(p.category);
  return {
    id: p.id,
    collectibleCategory: p.collectibleCategory,
    category: p.category,
    title: p.title,
    preview: derivePreview(p.body),
    author: name,
    authorInitial: authorInitial(p.user, name),
    ago: relativeKo(p.createdAt),
    replies: p.replyCount,
    views: p.viewCount,
    likes: p.likeCount,
    hot: p.isHot,
    pinned: p.isPinned,
    negotiable: p.negotiable,
    imageUrl: p.imageUrl ?? undefined,
    images: p.images ?? [],
    ...(trade
      ? {
          priceKrw: p.priceKrw,
          condition: toCondition(p.condition),
          certified: p.certified,
          location: p.location ?? undefined,
          dealMethod: toDealMethod(p.dealMethod),
          tradeStatus: toTradeStatus(p.tradeStatus),
        }
      : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 목록
// ─────────────────────────────────────────────────────────────────────────────

export interface GetPostsParams {
  collectibleCategory?: string;
  category?: string;
  sort?: "latest" | "hot";
  page?: number;
  pageSize?: number;
}

export interface GetPostsResult {
  posts: Post[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 게시글 목록. 핀 고정(상단) + 정렬(최신/인기) + 페이지네이션.
 * soft delete(deletedAt) 제외. preview 는 body 첫 줄에서 파생.
 */
export async function getPosts(
  params: GetPostsParams = {}
): Promise<GetPostsResult> {
  const { collectibleCategory, category, sort = "latest" } = params;
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50));

  const where = {
    deletedAt: null,
    ...(collectibleCategory && collectibleCategory !== "전체"
      ? { collectibleCategory }
      : {}),
    ...(category && category !== "전체" ? { category } : {}),
  };

  // 인기순은 (좋아요 + 댓글*2 + 조회/100) 가중. Prisma orderBy 로 직접 표현이 어려워
  // likeCount desc 1차 + 후처리 정렬. 핀은 항상 상단.
  const orderBy =
    sort === "hot"
      ? [{ likeCount: "desc" as const }, { createdAt: "desc" as const }]
      : [{ createdAt: "desc" as const }];

  const [rows, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: { ...selectAllPostFields(), ...postAuthorSelect },
      orderBy: [{ isPinned: "desc" as const }, ...orderBy],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.post.count({ where }),
  ]);

  let views = (rows as unknown as PostWithAuthor[]).map(toPostView);

  if (sort === "hot") {
    // 핀은 유지하고 비핀만 가중 점수로 재정렬.
    const pinned = views.filter((p) => p.pinned);
    const rest = views
      .filter((p) => !p.pinned)
      .sort(
        (a, b) =>
          b.likes + b.replies * 2 + b.views / 100 -
          (a.likes + a.replies * 2 + a.views / 100)
      );
    views = [...pinned, ...rest];
  }

  return { posts: views, total, page, pageSize };
}

function selectAllPostFields() {
  return {
    id: true,
    userId: true,
    collectibleCategory: true,
    category: true,
    title: true,
    body: true,
    imageUrl: true,
    images: true,
    priceKrw: true,
    condition: true,
    certified: true,
    location: true,
    dealMethod: true,
    tradeStatus: true,
    negotiable: true,
    isPinned: true,
    isHot: true,
    viewCount: true,
    likeCount: true,
    replyCount: true,
    createdAt: true,
  } as const;
}

// ─────────────────────────────────────────────────────────────────────────────
// 상세
// ─────────────────────────────────────────────────────────────────────────────

export interface PostDetail extends Post {
  userId: string;
  authorUsername: string | null;
  body: string;
}

/**
 * 게시글 상세 + 작성자. incrementView=true 면 조회수 +1 (상세 진입 시).
 * soft delete 글은 null. 좋아요 여부(likedByMe)는 별도 viewerId 로 판별.
 */
export async function getPost(
  id: string,
  opts: { incrementView?: boolean } = {}
): Promise<PostDetail | null> {
  if (opts.incrementView) {
    // 중복 방지는 단순화 — 매 요청 +1. 없는 글이면 updateMany 가 0건이라 무해.
    await prisma.post
      .updateMany({
        where: { id, deletedAt: null },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => undefined);
  }

  const p = await prisma.post.findFirst({
    where: { id, deletedAt: null },
    select: { ...selectAllPostFields(), body: true, ...postAuthorSelect },
  });
  if (!p) return null;

  const row = p as unknown as PostWithAuthor;
  return {
    ...toPostView(row),
    userId: row.userId,
    authorUsername: row.user.username,
    body: row.body,
  };
}

/** 현재 뷰어가 이 글에 좋아요를 눌렀는지. */
export async function hasLikedPost(
  postId: string,
  userId: string
): Promise<boolean> {
  const like = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId } },
    select: { id: true },
  });
  return !!like;
}

// ─────────────────────────────────────────────────────────────────────────────
// 댓글
// ─────────────────────────────────────────────────────────────────────────────

export interface CommentView {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  body: string;
  author: string;
  authorInitial: string;
  authorUsername: string | null;
  likes: number;
  likedByMe: boolean;
  ago: string;
  createdAt: Date;
  replies: CommentView[];
}

type CommentRow = {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  body: string;
  likeCount: number;
  createdAt: Date;
  user: {
    username: string | null;
    displayName: string | null;
    name: string | null;
    avatarInitial: string | null;
  };
};

/**
 * 게시글 댓글. 작성자 join, parentId 기준 2단 트리(댓글 → 대댓글).
 * soft delete 댓글 제외. likedByMe 는 viewerId 있을 때만.
 */
export async function getComments(
  postId: string,
  viewerId?: string | null
): Promise<CommentView[]> {
  const rows = (await prisma.comment.findMany({
    where: { postId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      postId: true,
      userId: true,
      parentId: true,
      body: true,
      likeCount: true,
      createdAt: true,
      user: {
        select: {
          username: true,
          displayName: true,
          name: true,
          avatarInitial: true,
        },
      },
    },
  })) as unknown as CommentRow[];

  // 뷰어가 좋아요한 댓글 id 집합
  let liked = new Set<string>();
  if (viewerId && rows.length > 0) {
    const likes = await prisma.commentLike.findMany({
      where: { userId: viewerId, commentId: { in: rows.map((r) => r.id) } },
      select: { commentId: true },
    });
    liked = new Set(likes.map((l) => l.commentId));
  }

  const toView = (r: CommentRow): CommentView => {
    const name = r.user.displayName ?? r.user.name ?? r.user.username ?? "익명";
    return {
      id: r.id,
      postId: r.postId,
      userId: r.userId,
      parentId: r.parentId,
      body: r.body,
      author: name,
      authorInitial: r.user.avatarInitial ?? name.charAt(0) ?? "?",
      authorUsername: r.user.username,
      likes: r.likeCount,
      likedByMe: liked.has(r.id),
      ago: relativeKo(r.createdAt),
      createdAt: r.createdAt,
      replies: [],
    };
  };

  const byId = new Map<string, CommentView>();
  const roots: CommentView[] = [];
  for (const r of rows) byId.set(r.id, toView(r));
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parentId && byId.has(r.parentId)) {
      byId.get(r.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// ─────────────────────────────────────────────────────────────────────────────
// 홈 — 핫 토픽
// ─────────────────────────────────────────────────────────────────────────────

export interface HotTopic {
  id: string;
  category: string;
  title: string;
  replies: number;
  views: number;
  hot: boolean;
  ago: string;
}

/**
 * 홈 사이드바용 핫 토픽 n개. 좋아요+조회 가중으로 상위 선별.
 * 거래글(팝니다/삽니다)·공지·핀은 토픽에서 제외해 "읽히는 글" 위주로.
 */
export async function getHotTopics(n = 6): Promise<HotTopic[]> {
  const rows = await prisma.post.findMany({
    where: {
      deletedAt: null,
      category: { notIn: ["팝니다", "삽니다", "공지"] },
    },
    orderBy: [{ likeCount: "desc" }, { viewCount: "desc" }],
    take: n * 3,
    select: {
      id: true,
      category: true,
      title: true,
      replyCount: true,
      viewCount: true,
      likeCount: true,
      isHot: true,
      createdAt: true,
    },
  });

  return rows
    .map((r) => ({
      r,
      score: r.likeCount * 3 + r.viewCount / 100 + r.replyCount * 2,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(({ r }) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      replies: r.replyCount,
      views: r.viewCount,
      hot: r.isHot,
      ago: relativeKo(r.createdAt),
    }));
}
