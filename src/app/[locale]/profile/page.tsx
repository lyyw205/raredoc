import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * /profile → 로그인한 본인 프로필로 리다이렉트.
 * username 이 없으면 user id 로, 미로그인 시 로그인 페이지로.
 */
export default async function MyProfileRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  redirect(`/${locale}/profile/${user.username ?? user.id}`);
}
