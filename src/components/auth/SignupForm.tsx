"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

export function SignupForm() {
  const locale = useLocale();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", passwordConfirm: "", nickname: "", agreed: false,
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const pwMatch = form.password === form.passwordConfirm;
  const step1Valid = form.email && form.password.length >= 8 && pwMatch;

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (step1Valid) setStep(2);
  }

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nickname || !form.agreed) return;
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
          <p className="text-sm text-gray-500 mt-2">컬렉터 계정 만들기</p>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`flex-1 flex items-center gap-2`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step >= 1 ? "bg-yellow-500 text-black" : "bg-gray-800 text-gray-500"}`}>1</div>
            <span className={`text-xs ${step === 1 ? "text-white font-medium" : "text-gray-500"}`}>계정 정보</span>
          </div>
          <div className="w-8 h-px bg-gray-800 shrink-0" />
          <div className="flex-1 flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step >= 2 ? "bg-yellow-500 text-black" : "bg-gray-800 text-gray-500"}`}>2</div>
            <span className={`text-xs ${step === 2 ? "text-white font-medium" : "text-gray-500"}`}>프로필 설정</span>
          </div>
        </div>

        {/* Step 1 — 이메일/비밀번호 */}
        {step === 1 && (
          <>
            {/* 소셜 로그인 */}
            <div className="space-y-3 mb-6">
              <button className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-bold text-sm bg-[#FEE500] hover:bg-[#F5DC00] text-[#181600] transition-colors">
                <KakaoIcon /> 카카오로 가입
              </button>
              <button className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium text-sm bg-white hover:bg-gray-100 text-gray-800 transition-colors border border-gray-200">
                <GoogleIcon /> Google로 가입
              </button>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-600">또는 이메일로</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            <form onSubmit={handleStep1} className="space-y-3">
              <input
                type="email" placeholder="이메일" value={form.email} onChange={set("email")}
                className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
                required
              />
              <input
                type="password" placeholder="비밀번호 (8자 이상)" value={form.password} onChange={set("password")}
                className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
                required minLength={8}
              />
              <div>
                <input
                  type="password" placeholder="비밀번호 확인" value={form.passwordConfirm} onChange={set("passwordConfirm")}
                  className={`w-full px-4 py-3 rounded-xl bg-gray-900 border text-sm text-white placeholder-gray-600 focus:outline-none transition-colors ${
                    form.passwordConfirm && !pwMatch ? "border-red-700" : "border-gray-800 focus:border-gray-600"
                  }`}
                  required
                />
                {form.passwordConfirm && !pwMatch && (
                  <p className="text-xs text-red-500 mt-1.5 ml-1">비밀번호가 일치하지 않습니다</p>
                )}
              </div>
              <button
                type="submit" disabled={!step1Valid}
                className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-black transition-colors mt-1"
              >
                다음
              </button>
            </form>
          </>
        )}

        {/* Step 2 — 닉네임 + 약관 */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">닉네임</label>
              <input
                type="text" placeholder="다른 컬렉터들에게 보여질 이름" value={form.nickname} onChange={set("nickname")}
                className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
                required maxLength={20}
              />
              <p className="text-[11px] text-gray-600 mt-1.5 ml-1">영문·숫자·한글 2~20자</p>
            </div>

            {/* 약관 동의 */}
            <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-300">약관 동의</p>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.agreed} onChange={set("agreed")} className="mt-0.5 accent-yellow-500" />
                <span className="text-xs text-gray-400 leading-relaxed">
                  <span className="text-white font-medium">[필수] </span>
                  서비스 이용약관 및 개인정보처리방침에 동의합니다
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" className="mt-0.5 accent-yellow-500" />
                <span className="text-xs text-gray-400 leading-relaxed">
                  <span className="text-gray-500 font-medium">[선택] </span>
                  마케팅 정보 수신에 동의합니다 (신규 뱃지·이벤트 알림)
                </span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="button" onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl border border-gray-700 hover:border-gray-500 text-sm text-gray-400 hover:text-white transition-colors"
              >
                이전
              </button>
              <button
                type="submit" disabled={!form.nickname || !form.agreed || loading}
                className="flex-1 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-black transition-colors"
              >
                {loading ? "가입 중..." : "가입 완료"}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-gray-600 mt-6">
          이미 계정이 있으신가요?{" "}
          <Link href={`/${locale}/login`} className="text-yellow-500 hover:text-yellow-400 font-medium transition-colors">
            로그인
          </Link>
        </p>

      </div>
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 1.5C4.86 1.5 1.5 4.16 1.5 7.43c0 2.1 1.4 3.94 3.51 5.01L4.18 15l3.36-2.2c.47.07.96.1 1.46.1 4.14 0 7.5-2.66 7.5-5.93C16.5 4.16 13.14 1.5 9 1.5Z" fill="#181600"/>
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
