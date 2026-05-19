"use client";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

// 목업: 로그인 상태 + 유저 정보 (추후 auth로 교체)
const MOCK_USER = { username: "yujin", displayName: "유진", avatarInitial: "유" };

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function toggleLocale() {
    const next = locale === "ko" ? "en" : "ko";
    router.push(pathname.replace(`/${locale}`, `/${next}`));
  }

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={`/${locale}`} className="font-bold text-xl text-white tracking-tight">
          Raredoc
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href={`/${locale}/community`} className="text-gray-300 hover:text-white transition-colors">
            커뮤니티
          </Link>
          <Link href={`/${locale}/dex`} className="text-gray-300 hover:text-white transition-colors">
            카드 도감
          </Link>

          <Link href={`/${locale}/tier-list`} className="text-gray-300 hover:text-white transition-colors">
            마켓 랭킹
          </Link>

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

          {/* 프로필 메뉴 */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 rounded-full bg-gray-700 ring-2 ring-yellow-500/60 hover:ring-yellow-500 flex items-center justify-center text-sm font-bold text-white transition-all"
            >
              {MOCK_USER.avatarInitial}
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-800 bg-gray-900 shadow-xl overflow-hidden">
                {/* 유저 정보 */}
                <div className="px-4 py-3 border-b border-gray-800">
                  <p className="text-sm font-semibold text-white">{MOCK_USER.displayName}</p>
                  <p className="text-xs text-gray-500">@{MOCK_USER.username}</p>
                </div>

                {/* 메뉴 항목 */}
                <div className="py-1">
                  <Link
                    href={`/${locale}/profile/${MOCK_USER.username}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <span>👤</span> 내 프로필
                  </Link>
                  <Link
                    href={`/${locale}/collection`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <span>📚</span> 컬렉션 관리
                  </Link>
                  <Link
                    href={`/${locale}/badges`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <span>🏅</span> 내 뱃지
                  </Link>
                  <Link
                    href={`/${locale}/ranking`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <span>🏆</span> 랭킹
                  </Link>
                </div>

                <div className="border-t border-gray-800 py-1">
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <span>⚙️</span> 설정
                  </button>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
                  >
                    <span>↩︎</span> 로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
