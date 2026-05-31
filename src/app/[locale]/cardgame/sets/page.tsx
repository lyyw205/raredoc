import { redirect } from "next/navigation";

// 확장팩(세트) 정보는 카드 도감 `/dex` 으로 통합되었다.
export default async function CardgameSetsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dex`);
}
