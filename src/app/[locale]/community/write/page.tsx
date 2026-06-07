import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/toss";
import { MarketWriteForm } from "@/components/community/MarketWriteForm";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "마켓 글 작성 — Raredoc" };

export default async function MarketWritePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(`/${locale}/login`);

  return (
    <Container size="lg" padding="md" className="py-8">
      <MarketWriteForm locale={locale} />
    </Container>
  );
}
