import { redirect } from "next/navigation";

// 확장팩(세트) 정보는 카드 도감 `/dex` 으로 통합되었다.
// mock 세트 ID는 실제 세트와 대응되지 않아 도감 목록으로 폴백한다.
export default async function CardgameSetDetailRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dex`);
}
