"use client";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

// 목업: 로그인 상태 + 유저 정보 (추후 auth로 교체)
const MOCK_USER = { username: "yujin", displayName: "유진", avatarInitial: "유" };

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function toggleLocale() {
    const next = locale === "ko" ? "en" : "ko";
    router.push(pathname.replace(`/${locale}`, `/${next}`));
  }

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* 좌측: 로고 + 메인 메뉴 */}
        <div className="flex items-center gap-7">
          <Link href={`/${locale}`} className="font-bold text-xl text-white tracking-tight">
            Raredoc
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href={`/${locale}/dex`} className="text-gray-300 hover:text-white transition-colors">
              카드 도감
            </Link>
            <Link href={`/${locale}/tier-list`} className="text-gray-300 hover:text-white transition-colors">
              마켓 랭킹
            </Link>
            <Link href={`/${locale}/community`} className="text-gray-300 hover:text-white transition-colors">
              커뮤니티
            </Link>
          </nav>
        </div>

        {/* 우측: 메시지 / 언어 / 프로필 / 설정 / 로그아웃 */}
        <nav className="flex items-center gap-6 text-sm">
          {/* 메세지 아이콘 */}
          <Link href={`/${locale}/messages`} className="relative text-gray-300 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {/* 읽지 않은 메세지 뱃지 (목업: 3개) */}
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
              3
            </span>
          </Link>

          <button
            onClick={toggleLocale}
            className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
          >
            {locale === "ko" ? "EN" : "한"}
          </button>

          {/* 프로필 (마이페이지로 이동) */}
          <Link
            href={`/${locale}/profile/${MOCK_USER.username}`}
            className="w-8 h-8 rounded-full bg-gray-700 ring-2 ring-yellow-500/60 hover:ring-yellow-500 flex items-center justify-center text-sm font-bold text-white transition-all"
            aria-label="내 프로필"
          >
            {MOCK_USER.avatarInitial}
          </Link>

          {/* 설정 */}
          <button
            type="button"
            aria-label="설정"
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* 로그아웃 */}
          <button
            type="button"
            aria-label="로그아웃"
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </nav>
      </div>
    </header>
  );
}
