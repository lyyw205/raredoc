import { auth } from "@/auth";

export type CurrentUser = {
  id: string;
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
  image?: string | null;
  avatarInitial: string;
};

/**
 * 현재 로그인한 유저를 세션(JWT) 기반으로 반환. 미로그인 시 null.
 * 세션에 실린 최소 정보만 사용하므로 DB 조회 없이 동작.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return null;

  const displayName = user.displayName ?? user.name ?? null;
  const avatarInitial =
    displayName?.trim().charAt(0) ||
    user.username?.charAt(0) ||
    user.email?.charAt(0) ||
    "?";

  return {
    id: user.id,
    email: user.email,
    username: user.username ?? null,
    displayName,
    image: user.image,
    avatarInitial,
  };
}
