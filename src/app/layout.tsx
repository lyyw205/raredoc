import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale().catch(() => "ko");
  return (
    <html lang={locale}>
      <body className="min-h-screen flex flex-col bg-toss-bg-subtle text-toss-text-primary antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
