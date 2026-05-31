"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, MessageSquare, Settings } from "lucide-react";

import {
  Avatar,
  Badge,
  Button,
  Header as TossHeader,
  IconButton,
} from "@/components/toss";
import { logoutAction } from "@/lib/actions/auth";

export type HeaderUser = {
  username: string | null;
  displayName: string | null;
  avatarInitial: string;
};

export function Header({ user, unread = 0 }: { user: HeaderUser | null; unread?: number }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const toggleLocale = () => {
    const next = locale === "ko" ? "en" : "ko";
    router.push(pathname.replace(`/${locale}`, `/${next}`));
  };

  const link = (segment: string) => `/${locale}${segment}`;
  const isActive = (segment: string) =>
    pathname === link(segment) || pathname.startsWith(`${link(segment)}/`);

  const profileHref = user?.username
    ? link(`/profile/${user.username}`)
    : link("/profile");

  return (
    <TossHeader sticky bordered>
      <TossHeader.Inner className="mx-auto w-full max-w-[1120px]">
        <TossHeader.Logo href={link("")}>Raredoc</TossHeader.Logo>

        <TossHeader.Nav className="ml-6">
          <TossHeader.NavItem href={link("/dex")} active={isActive("/dex")}>
            카드 도감
          </TossHeader.NavItem>
          <TossHeader.NavItem href={link("/tier-list")} active={isActive("/tier-list")}>
            마켓 랭킹
          </TossHeader.NavItem>
          <TossHeader.NavItem href={link("/cardgame")} active={isActive("/cardgame")}>
            카드게임
          </TossHeader.NavItem>
          <TossHeader.NavItem href={link("/community")} active={isActive("/community")}>
            커뮤니티
          </TossHeader.NavItem>
        </TossHeader.Nav>

        <TossHeader.Actions>
          {/* 메시지 — IconButton + count Badge (로그인 시) */}
          {user && (
            <Link
              href={link("/messages")}
              aria-label="메시지"
              className="relative inline-flex items-center justify-center w-8 h-8 rounded-toss-md text-toss-icon hover:bg-toss-hover transition-colors"
            >
              <MessageSquare size={18} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1">
                  <Badge variant="count" count={unread} />
                </span>
              )}
            </Link>
          )}

          {/* 언어 토글 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLocale}
            aria-label="언어 전환"
          >
            {locale === "ko" ? "EN" : "한"}
          </Button>

          {user ? (
            <>
              {/* 프로필 */}
              <Link
                href={profileHref}
                aria-label="내 프로필"
                className="inline-flex"
              >
                <Avatar name={user.avatarInitial} size="sm" />
              </Link>

              {/* 설정 */}
              <IconButton aria-label="설정" size="sm" icon={<Settings size={18} />} />

              {/* 로그아웃 */}
              <IconButton
                aria-label="로그아웃"
                size="sm"
                icon={<LogOut size={18} />}
                onClick={() => logoutAction(locale)}
              />
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={() => router.push(link("/login"))}>
              로그인
            </Button>
          )}
        </TossHeader.Actions>
      </TossHeader.Inner>
    </TossHeader>
  );
}
