import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export default async function RootLayout({ children }: { children: ReactNode }) {
  // 로케일 실패 시 기본값은 i18n/routing 단일출처를 따른다(html lang 전용).
  const locale = await getLocale().catch(() => routing.defaultLocale);
  return (
    <html lang={locale}>
      {/* font-sans 는 globals.css 의 `html { @apply font-sans }` 가 전역 적용 — body 중복 제거됨 */}
      <body className="min-h-screen flex flex-col bg-toss-bg-subtle text-toss-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
