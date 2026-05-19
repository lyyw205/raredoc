import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale().catch(() => "ko");
  return (
    <html lang={locale} className={geist.variable}>
      <body className="min-h-screen flex flex-col bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
