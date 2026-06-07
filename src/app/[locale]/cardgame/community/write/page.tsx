import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CommunityWriteForm } from "@/components/community/CommunityWriteForm";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "커뮤니티 글 작성 — Raredoc" };

export default async function CommunityWritePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(`/${locale}/login`);

  // cardgame/layout 이 Container + 사이드바를 제공하므로 폭만 제한.
  return (
    <div className="mx-auto max-w-3xl">
      <CommunityWriteForm locale={locale} />
    </div>
  );
}
