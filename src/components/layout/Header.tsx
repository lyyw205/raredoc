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

// 목업: 로그인 상태 + 유저 정보 (추후 auth로 교체)
const MOCK_USER = { username: "yujin", displayName: "유진", initial: "유" };
const UNREAD_MESSAGES = 3;

export function Header() {
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

  return (
    <TossHeader sticky bordered>
      <TossHeader.Inner>
        <TossHeader.Logo href={link("")}>Raredoc</TossHeader.Logo>

        <TossHeader.Nav className="ml-6">
          <TossHeader.NavItem href={link("/dex")} active={isActive("/dex")}>
            카드 도감
          </TossHeader.NavItem>
          <TossHeader.NavItem href={link("/tier-list")} active={isActive("/tier-list")}>
            마켓 랭킹
          </TossHeader.NavItem>
          <TossHeader.NavItem href={link("/community")} active={isActive("/community")}>
            커뮤니티
          </TossHeader.NavItem>
        </TossHeader.Nav>

        <TossHeader.Actions>
          {/* 메시지 — IconButton + count Badge */}
          <Link
            href={link("/messages")}
            aria-label="메시지"
            className="relative inline-flex items-center justify-center w-8 h-8 rounded-toss-md text-toss-icon hover:bg-toss-hover transition-colors"
          >
            <MessageSquare size={18} />
            {UNREAD_MESSAGES > 0 && (
              <span className="absolute -top-1 -right-1">
                <Badge variant="count" count={UNREAD_MESSAGES} />
              </span>
            )}
          </Link>

          {/* 언어 토글 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLocale}
            aria-label="언어 전환"
          >
            {locale === "ko" ? "EN" : "한"}
          </Button>

          {/* 프로필 */}
          <Link
            href={link(`/profile/${MOCK_USER.username}`)}
            aria-label="내 프로필"
            className="inline-flex"
          >
            <Avatar name={MOCK_USER.initial} size="sm" />
          </Link>

          {/* 설정 */}
          <IconButton aria-label="설정" size="sm" icon={<Settings size={18} />} />

          {/* 로그아웃 */}
          <IconButton aria-label="로그아웃" size="sm" icon={<LogOut size={18} />} />
        </TossHeader.Actions>
      </TossHeader.Inner>
    </TossHeader>
  );
}
