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
import { GRADES } from "@/lib/trades/shared";
import { ActionResult, ACTION_ERR } from "./_shared";

export type CollectionActionState = ActionResult<{ itemId?: string; certPending?: boolean }>;

const gradeSchema = z.enum(GRADES);

function revalidateCollectionViews() {
  // 컬렉션이 노출되는 모든 화면 무효화 (cacheComponents 미사용 → path 기반)
  revalidatePath("/", "layout");
}

// ─────────────────────────────────────────────────────────────────────────────
// 삭제
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteItemAction(itemId: string): Promise<CollectionActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: ACTION_ERR.auth };
  if (!itemId) return { ok: false, error: ACTION_ERR.badRequest };

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
): Promise<CollectionActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: ACTION_ERR.auth };

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
): Promise<CollectionActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: ACTION_ERR.auth };

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
// 카드 검색 (인증 신청 모달에서 사용) — pokemontcg.io 외부 API
// ─────────────────────────────────────────────────────────────────────────────

export type CardSearchResult = {
  id: string;
  name: string;
  set: string;
  number: string;
  imageUrl: string;
};

/** pokemontcg.io 카드 이름 검색. 인증 신청 모달의 카드 선택용(외부 API). */
export async function searchExternalCardsAction(query: string): Promise<CardSearchResult[]> {
  // Lucene 특수문자 제거 + 길이 상한(쿼리 깨짐·오용 방지)
  const q = query.trim().replace(/["*:()\\]/g, "").slice(0, 50);
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
  } catch (e) {
    console.error("[searchExternalCardsAction] pokemontcg.io error:", e);
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

/** 인증 사진을 Vercel Blob 에 업로드. 토큰 없음/파일 없음/실패 → 사진 없이 보류(certPending=true). */
async function uploadCertPhoto(
  userId: string,
  photo: FormDataEntryValue | null
): Promise<{ photoUrl: string; certPending: boolean }> {
  const hasFile = photo instanceof File && photo.size > 0;
  if (!hasFile || !process.env.BLOB_READ_WRITE_TOKEN) {
    return { photoUrl: "", certPending: true };
  }
  try {
    const { put } = await import("@vercel/blob");
    const ext = (photo.name.split(".").pop() || "jpg").toLowerCase();
    const blob = await put(`certifications/${userId}/${Date.now()}.${ext}`, photo, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { photoUrl: blob.url, certPending: false };
  } catch (e) {
    // 업로드 실패 → 사진 없이 보류 접수로 graceful fallback
    console.error("[certifyItemAction] blob upload failed:", e);
    return { photoUrl: "", certPending: true };
  }
}

/** 보유 아이템: 있으면 재사용, 없으면 신규 등록. (downstream 은 id 만 사용) */
async function ensureCollectionItem(
  userId: string,
  cardId: string,
  grade: string
): Promise<{ id: string }> {
  const existing = await prisma.collectionItem.findFirst({
    where: { userId, regionCardId: cardId },
    select: { id: true },
  });
  if (existing) return existing;
  return addCollectionItem({ userId, cardId, grade });
}

/**
 * 인증 신청. 보유 아이템이 없으면 먼저 등록 후 Certification(pending) 생성.
 * - BLOB_READ_WRITE_TOKEN 있으면 사진을 Vercel Blob 에 업로드해 photoUrl 저장.
 * - 없으면 사진 없이 보류 접수 (photoUrl="" , certPending=true). 에러 throw 안 함.
 */
export async function certifyItemAction(
  formData: FormData
): Promise<CollectionActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: ACTION_ERR.auth };

  const parsed = certifySchema.safeParse({
    cardId: formData.get("cardId"),
    grade: formData.get("grade"),
  });
  if (!parsed.success) return { ok: false, error: "입력값을 확인해 주세요." };

  const card = await ensureLocale(parsed.data.cardId);
  if (!card) return { ok: false, error: "카드 정보를 찾을 수 없습니다." };

  const { photoUrl, certPending } = await uploadCertPhoto(user.id, formData.get("photo"));
  const item = await ensureCollectionItem(user.id, parsed.data.cardId, parsed.data.grade);

  // Certification upsert (itemId unique)
  await prisma.certification.upsert({
    where: { itemId: item.id },
    create: { itemId: item.id, photoUrl, status: "pending" },
    update: { photoUrl, status: "pending" },
  });

  revalidateCollectionViews();
  return { ok: true, itemId: item.id, certPending };
}
