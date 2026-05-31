"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureLocale } from "@/lib/services/cards";
import { searchCards } from "@/lib/api/pokemontcg";
import {
  addCollectionItem,
  updateCollectionItem,
  deleteCollectionItem,
} from "@/lib/services/collection";
import { ensureListingForItem } from "@/lib/services/marketplace";

export type ActionState = {
  ok: boolean;
  error?: string;
  itemId?: string;
  /** 인증 사진을 업로드할 Blob 토큰이 없어 사진 없이 보류 접수된 경우 true */
  certPending?: boolean;
};

const GRADES = ["미개봉", "1착", "NM", "VNDS", "LP", "MP", "HP", "DS", "D"] as const;
const gradeSchema = z.enum(GRADES);

function revalidateCollectionViews() {
  // 컬렉션이 노출되는 모든 화면 무효화 (cacheComponents 미사용 → path 기반)
  revalidatePath("/", "layout");
}

// ─────────────────────────────────────────────────────────────────────────────
// 등록
// ─────────────────────────────────────────────────────────────────────────────

const addSchema = z.object({
  cardId: z.string().min(1),
  grade: gradeSchema,
  estimatedKrw: z.number().int().positive().nullable().optional(),
  forSale: z.boolean().optional(),
});

export async function addItemAction(input: {
  cardId: string;
  grade: string;
  estimatedKrw?: number | null;
  forSale?: boolean;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "입력값을 확인해 주세요." };

  // FK 무결성: 카드가 DB 에 없으면 pokemontcg.io 에서 가져와 upsert
  const card = await ensureLocale(parsed.data.cardId);
  if (!card) return { ok: false, error: "카드 정보를 찾을 수 없습니다." };

  const item = await addCollectionItem({
    userId: user.id,
    cardId: parsed.data.cardId,
    grade: parsed.data.grade,
    estimatedKrw: parsed.data.estimatedKrw ?? null,
    forSale: parsed.data.forSale ?? false,
  });

  revalidateCollectionViews();
  return { ok: true, itemId: item.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// 수정 / 삭제
// ─────────────────────────────────────────────────────────────────────────────

const updateSchema = z.object({
  itemId: z.string().min(1),
  grade: gradeSchema.optional(),
  estimatedKrw: z.number().int().positive().nullable().optional(),
  forSale: z.boolean().optional(),
});

export async function updateItemAction(input: {
  itemId: string;
  grade?: string;
  estimatedKrw?: number | null;
  forSale?: boolean;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "입력값을 확인해 주세요." };

  const { itemId, ...patch } = parsed.data;
  const ok = await updateCollectionItem(itemId, user.id, patch);
  if (!ok) return { ok: false, error: "수정 권한이 없습니다." };

  revalidateCollectionViews();
  return { ok: true, itemId };
}

export async function deleteItemAction(itemId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!itemId) return { ok: false, error: "잘못된 요청입니다." };

  const ok = await deleteCollectionItem(itemId, user.id);
  if (!ok) return { ok: false, error: "삭제 권한이 없습니다." };

  revalidateCollectionViews();
  return { ok: true, itemId };
}

// ─────────────────────────────────────────────────────────────────────────────
// 판매 토글
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleForSaleAction(
  itemId: string,
  forSale: boolean
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const ok = await updateCollectionItem(itemId, user.id, { forSale });
  if (!ok) return { ok: false, error: "권한이 없습니다." };

  // forSale 토글에 맞춰 Listing 동기화 (생성/active/hidden)
  await ensureListingForItem(itemId);

  revalidateCollectionViews();
  return { ok: true, itemId };
}

// ─────────────────────────────────────────────────────────────────────────────
// 하이라이트 설정 (슬롯 1~5, null = 해제)
// ─────────────────────────────────────────────────────────────────────────────

const highlightSchema = z.object({
  itemId: z.string().min(1),
  slot: z.number().int().min(1).max(5).nullable(),
});

export async function setHighlightAction(
  itemId: string,
  slot: number | null
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const parsed = highlightSchema.safeParse({ itemId, slot });
  if (!parsed.success) return { ok: false, error: "잘못된 슬롯입니다." };

  // 같은 슬롯을 쓰던 다른 아이템이 있으면 비워서 슬롯 유일성 유지
  if (parsed.data.slot != null) {
    await prisma.collectionItem.updateMany({
      where: { userId: user.id, highlightSlot: parsed.data.slot },
      data: { highlightSlot: null },
    });
  }
  const ok = await updateCollectionItem(itemId, user.id, {
    highlightSlot: parsed.data.slot,
  });
  if (!ok) return { ok: false, error: "권한이 없습니다." };

  revalidateCollectionViews();
  return { ok: true, itemId };
}

// ─────────────────────────────────────────────────────────────────────────────
// 카드 검색 (인증 신청 모달에서 사용)
// ─────────────────────────────────────────────────────────────────────────────

export type CardSearchResult = {
  id: string;
  name: string;
  set: string;
  number: string;
  imageUrl: string;
};

/** pokemontcg.io 카드 이름 검색. 인증 신청 모달의 카드 선택용. */
export async function searchCardsAction(query: string): Promise<CardSearchResult[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  try {
    const res = await searchCards(`name:"*${q}*"`, 1);
    return res.data.slice(0, 24).map((c) => ({
      id: c.id,
      name: c.name,
      set: c.set?.name ?? "",
      number: c.number,
      imageUrl: c.images?.large ?? c.images?.small ?? "",
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 인증 신청 (사진 업로드 → Vercel Blob, 토큰 없으면 사진 없이 보류 접수)
// ─────────────────────────────────────────────────────────────────────────────

const certifySchema = z.object({
  cardId: z.string().min(1),
  grade: gradeSchema,
});

/**
 * 인증 신청. 보유 아이템이 없으면 먼저 등록 후 Certification(pending) 생성.
 * - BLOB_READ_WRITE_TOKEN 있으면 사진을 Vercel Blob 에 업로드해 photoUrl 저장.
 * - 없으면 사진 없이 보류 접수 (photoUrl="" , certPending=true). 에러 throw 안 함.
 */
export async function certifyItemAction(
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const parsed = certifySchema.safeParse({
    cardId: formData.get("cardId"),
    grade: formData.get("grade"),
  });
  if (!parsed.success) return { ok: false, error: "입력값을 확인해 주세요." };

  const card = await ensureLocale(parsed.data.cardId);
  if (!card) return { ok: false, error: "카드 정보를 찾을 수 없습니다." };

  // 사진 업로드 (토큰 있을 때만)
  let photoUrl = "";
  let certPending = true;
  const photo = formData.get("photo");
  const hasFile = photo instanceof File && photo.size > 0;

  if (hasFile && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const ext = (photo.name.split(".").pop() || "jpg").toLowerCase();
      const blob = await put(
        `certifications/${user.id}/${Date.now()}.${ext}`,
        photo,
        { access: "public", token: process.env.BLOB_READ_WRITE_TOKEN }
      );
      photoUrl = blob.url;
      certPending = false;
    } catch {
      // 업로드 실패 → 사진 없이 보류 접수로 graceful fallback
      photoUrl = "";
      certPending = true;
    }
  }

  // 기존 보유 아이템 있으면 재사용, 없으면 등록
  let item = await prisma.collectionItem.findFirst({
    where: { userId: user.id, localeId: parsed.data.cardId },
    include: { certification: { select: { id: true } } },
  });
  if (!item) {
    const created = await addCollectionItem({
      userId: user.id,
      cardId: parsed.data.cardId,
      grade: parsed.data.grade,
    });
    item = await prisma.collectionItem.findUnique({
      where: { id: created.id },
      include: { certification: { select: { id: true } } },
    });
  }
  if (!item) return { ok: false, error: "등록 중 오류가 발생했습니다." };

  // Certification upsert (itemId unique)
  await prisma.certification.upsert({
    where: { itemId: item.id },
    create: { itemId: item.id, photoUrl, status: "pending" },
    update: { photoUrl, status: "pending" },
  });

  revalidateCollectionViews();
  return { ok: true, itemId: item.id, certPending };
}
