// TEMP preview — no auth, mock data, for visual/UX QA only. Delete after verification.
// 호가 테스트 페이지: 시세(참고밴드) + 사진·컨디션 개별 매물 호가창 + 즉시구매/즉시판매(taker).
import { OrderbookPreviewView } from "./OrderbookPreviewView";

export default async function OrderbookPreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <OrderbookPreviewView locale={locale} />;
}
