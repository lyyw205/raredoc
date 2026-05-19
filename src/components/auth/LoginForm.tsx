"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

export function LoginForm() {
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1200);
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* 브랜드 */}
        <div className="text-center mb-8">
          <Link href={`/${locale}`} className="text-2xl font-bold text-white tracking-tight">
            Raredoc
          </Link>
          <p className="text-sm text-gray-500 mt-2">내 수집품을 기록하고 전시하세요</p>
        </div>

        {/* 소셜 로그인 */}
        <div className="space-y-3 mb-6">
          <button className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-bold text-sm bg-[#FEE500] hover:bg-[#F5DC00] text-[#181600] transition-colors">
            <KakaoIcon />
            카카오로 로그인
          </button>
          <button className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium text-sm bg-white hover:bg-gray-100 text-gray-800 transition-colors border border-gray-200">
            <GoogleIcon />
            Google로 로그인
          </button>
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-xs text-gray-600">또는 이메일로</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* 이메일 폼 */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
              required
            />
          </div>

          <div className="flex justify-end">
            <button type="button" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              비밀번호 찾기
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-sm font-bold text-black transition-colors"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {/* 회원가입 링크 */}
        <p className="text-center text-sm text-gray-600 mt-6">
          아직 계정이 없으신가요?{" "}
          <Link href={`/${locale}/signup`} className="text-yellow-500 hover:text-yellow-400 font-medium transition-colors">
            회원가입
          </Link>
        </p>

      </div>
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M9 1.5C4.86 1.5 1.5 4.16 1.5 7.43c0 2.1 1.4 3.94 3.51 5.01L4.18 15l3.36-2.2c.47.07.96.1 1.46.1 4.14 0 7.5-2.66 7.5-5.93C16.5 4.16 13.14 1.5 9 1.5Z"
        fill="#181600"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}
