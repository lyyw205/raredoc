// TEMP preview — no auth, for visual QA only. Delete after verification.
import { Container } from "@/components/toss";
import { MarketWriteForm } from "@/components/community/MarketWriteForm";

export default async function MarketWritePreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <Container size="lg" padding="md" className="py-8">
      <MarketWriteForm locale={locale} />
    </Container>
  );
}
