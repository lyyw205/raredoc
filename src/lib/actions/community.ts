"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export type ActionState = {
  ok: boolean;
  error?: string;
  postId?: string;
  commentId?: string;
  liked?: boolean;
  likeCount?: number;
};

function revalidateCommunityViews() {
  // 커뮤니티가 노출되는 모든 화면 무효화 (cacheComponents 미사용 → path 기반)
  revalidatePath("/", "layout");
}

const COLLECTIBLE_CATS = [
  "포켓몬 TCG",
  "유희왕",
  "원피스 TCG",
  "스니커즈",
  "피규어",
] as const;

const POST_CATS = [
  "자유",
  "팝니다",
  "삽니다",
  "공략",
  "메타분석",
  "자랑",
  "질문",
  "정보",
  "거래후기",
] as const;

const TRADE_CATS = new Set(["팝니다", "삽니다"]);

// ─────────────────────────────────────────────────────────────────────────────
// 게시글 생성
// ─────────────────────────────────────────────────────────────────────────────

const createPostSchema = z
  .object({
    collectibleCategory: z.enum(COLLECTIBLE_CATS),
    category: z.enum(POST_CATS),
    title: z.string().trim().min(1).max(100),
    body: z.string().trim().min(1).max(5000),
    // 거래글 전용 (category 가 팝니다/삽니다 일 때)
    imageUrl: z.string().url().optional().or(z.literal("")),
    images: z.array(z.string().url()).max(10).optional(),
    priceKrw: z.number().int().positive().nullable().optional(),
    condition: z.enum(["NM", "LP", "MP", "HP"]).optional(),
    certified: z.boolean().optional(),
    location: z.string().trim().max(50).optional(),
    dealMethod: z.enum(["direct", "delivery", "both"]).optional(),
    negotiable: z.boolean().optional(),
  })
  .refine(
    (d) => !TRADE_CATS.has(d.category) || d.priceKrw != null || d.category === "삽니다",
    { message: "거래글은 희망 가격이 필요합니다.", path: ["priceKrw"] }
  );

export type CreatePostInput = z.input<typeof createPostSchema>;

export async function createPost(input: CreatePostInput): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
    };
  }
  const d = parsed.data;
  const isTrade = TRADE_CATS.has(d.category);

  // 다중 이미지: 거래/게시판 모두 지원. imageUrl(커버)은 항상 images[0] 와 동기화.
  const images = d.images ?? [];
  const cover = images[0] ?? (d.imageUrl || null);

  const post = await prisma.post.create({
    data: {
      userId: user.id,
      collectibleCategory: d.collectibleCategory,
      category: d.category,
      title: d.title,
      body: d.body,
      imageUrl: cover,
      images,
      priceKrw: isTrade ? d.priceKrw ?? null : null,
      condition: isTrade ? d.condition ?? null : null,
      certified: isTrade ? d.certified ?? false : false,
      location: isTrade ? d.location || null : null,
      dealMethod: isTrade ? d.dealMethod ?? null : null,
      tradeStatus: isTrade ? "active" : null,
      negotiable: isTrade ? d.negotiable ?? false : false,
    },
  });

  revalidateCommunityViews();
  return { ok: true, postId: post.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// 거래글 이미지 업로드 (Vercel Blob)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FormData("file") 의 이미지들을 Vercel Blob 에 업로드하고 public URL 배열을 반환.
 * collection.ts 의 put() 패턴 재사용. 최대 5장, 5MB/장.
 * BLOB_READ_WRITE_TOKEN 없거나 업로드 실패 시 빈 배열로 graceful fallback(throw 안 함).
 */
export async function uploadCommunityImages(
  formData: FormData
): Promise<{ ok: boolean; urls: string[]; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, urls: [], error: "로그인이 필요합니다." };

  const files = formData
    .getAll("file")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, 5);

  if (files.length === 0) return { ok: true, urls: [] };

  const oversized = files.find((f) => f.size > 5 * 1024 * 1024);
  if (oversized) return { ok: false, urls: [], error: "이미지는 장당 5MB 이하만 가능합니다." };

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // 토큰 없는 환경 — 업로드 생략하고 빈 배열 (글 작성 자체는 가능하게)
    return { ok: true, urls: [] };
  }

  try {
    const { put } = await import("@vercel/blob");
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const urls = await Promise.all(
      files.map(async (file, i) => {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const blob = await put(
          `community/${user.id}/${Date.now()}-${i}.${ext}`,
          file,
          { access: "public", token }
        );
        return blob.url;
      })
    );
    return { ok: true, urls };
  } catch {
    return { ok: false, urls: [], error: "이미지 업로드에 실패했습니다." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 게시글 수정 / 삭제 (소유자 확인)
// ─────────────────────────────────────────────────────────────────────────────

const updatePostSchema = z.object({
  postId: z.string().min(1),
  title: z.string().trim().min(1).max(100).optional(),
  body: z.string().trim().min(1).max(5000).optional(),
  images: z.array(z.string().url()).max(10).optional(),
  priceKrw: z.number().int().positive().nullable().optional(),
  location: z.string().trim().max(50).optional(),
  dealMethod: z.enum(["direct", "delivery", "both"]).optional(),
  tradeStatus: z
    .enum(["active", "reserved", "completed", "hidden"])
    .optional(),
  negotiable: z.boolean().optional(),
});

export type UpdatePostInput = z.input<typeof updatePostSchema>;

export async function updatePost(input: UpdatePostInput): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const parsed = updatePostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "입력값을 확인해 주세요." };

  const { postId, ...patch } = parsed.data;
  // images 가 들어오면 imageUrl(커버)도 함께 동기화
  const data =
    patch.images !== undefined
      ? { ...patch, imageUrl: patch.images[0] ?? null }
      : patch;
  // 소유권 확인 후 수정 (updateMany 로 userId 조건 강제)
  const res = await prisma.post.updateMany({
    where: { id: postId, userId: user.id, deletedAt: null },
    data,
  });
  if (res.count === 0) return { ok: false, error: "수정 권한이 없습니다." };

  revalidateCommunityViews();
  return { ok: true, postId };
}

/** soft delete (deletedAt). 소유자만. */
export async function deletePost(postId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!postId) return { ok: false, error: "잘못된 요청입니다." };

  const res = await prisma.post.updateMany({
    where: { id: postId, userId: user.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (res.count === 0) return { ok: false, error: "삭제 권한이 없습니다." };

  revalidateCommunityViews();
  return { ok: true, postId };
}

// ─────────────────────────────────────────────────────────────────────────────
// 댓글 생성 / 삭제
// ─────────────────────────────────────────────────────────────────────────────

const createCommentSchema = z.object({
  postId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
  parentId: z.string().min(1).nullable().optional(),
});

export type CreateCommentInput = z.input<typeof createCommentSchema>;

export async function createComment(
  input: CreateCommentInput
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const parsed = createCommentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "댓글 내용을 확인해 주세요." };
  const d = parsed.data;

  // 게시글 존재 확인 (soft delete 아닌 것)
  const post = await prisma.post.findFirst({
    where: { id: d.postId, deletedAt: null },
    select: { id: true },
  });
  if (!post) return { ok: false, error: "게시글을 찾을 수 없습니다." };

  // 대댓글이면 부모가 같은 글의 댓글인지 확인 (2단 트리 유지: 부모는 최상위만)
  if (d.parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: d.parentId, postId: d.postId, deletedAt: null },
      select: { id: true, parentId: true },
    });
    if (!parent) return { ok: false, error: "원 댓글을 찾을 수 없습니다." };
  }

  const created = await prisma.$transaction(async (tx) => {
    const c = await tx.comment.create({
      data: {
        postId: d.postId,
        userId: user.id,
        parentId: d.parentId ?? null,
        body: d.body,
      },
    });
    await tx.post.update({
      where: { id: d.postId },
      data: { replyCount: { increment: 1 } },
    });
    return c;
  });

  revalidateCommunityViews();
  return { ok: true, commentId: created.id };
}

/** soft delete 댓글 + post.replyCount 감소. 소유자만. */
export async function deleteComment(commentId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!commentId) return { ok: false, error: "잘못된 요청입니다." };

  const comment = await prisma.comment.findFirst({
    where: { id: commentId, userId: user.id, deletedAt: null },
    select: { id: true, postId: true },
  });
  if (!comment) return { ok: false, error: "삭제 권한이 없습니다." };

  await prisma.$transaction(async (tx) => {
    await tx.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
    await tx.post.update({
      where: { id: comment.postId },
      data: { replyCount: { decrement: 1 } },
    });
  });

  revalidateCommunityViews();
  return { ok: true, commentId };
}

// ─────────────────────────────────────────────────────────────────────────────
// 좋아요 토글 (PostLike / CommentLike upsert + 카운트 동기화)
// ─────────────────────────────────────────────────────────────────────────────

export async function togglePostLike(postId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!postId) return { ok: false, error: "잘못된 요청입니다." };

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId: user.id } },
    select: { id: true },
  });

  const liked = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.postLike.delete({ where: { id: existing.id } });
      await tx.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      });
      return false;
    }
    await tx.postLike.create({ data: { postId, userId: user.id } });
    await tx.post.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
    });
    return true;
  });

  // 음수 방지 (동기화 안전망)
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { likeCount: true },
  });

  revalidateCommunityViews();
  return { ok: true, postId, liked, likeCount: Math.max(0, post?.likeCount ?? 0) };
}

export async function toggleCommentLike(
  commentId: string
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!commentId) return { ok: false, error: "잘못된 요청입니다." };

  const existing = await prisma.commentLike.findUnique({
    where: { commentId_userId: { commentId, userId: user.id } },
    select: { id: true },
  });

  const liked = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.commentLike.delete({ where: { id: existing.id } });
      await tx.comment.update({
        where: { id: commentId },
        data: { likeCount: { decrement: 1 } },
      });
      return false;
    }
    await tx.commentLike.create({ data: { commentId, userId: user.id } });
    await tx.comment.update({
      where: { id: commentId },
      data: { likeCount: { increment: 1 } },
    });
    return true;
  });

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { likeCount: true },
  });

  revalidateCommunityViews();
  return {
    ok: true,
    commentId,
    liked,
    likeCount: Math.max(0, comment?.likeCount ?? 0),
  };
}
