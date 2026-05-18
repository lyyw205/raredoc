import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import Script from "next/script";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WebSiteJsonLd } from "@/components/seo/JsonLd";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://raredoc.kr";
const ADSENSE_ID = process.env.NEXT_PUBLIC_ADSENSE_ID ?? "";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";
  return {
    title: {
      default: isKo ? "레어독 | 포켓몬 카드 시세 & 투자 정보" : "Raredoc | Pokémon Card Prices & Investment",
      template: isKo ? "%s | 레어독" : "%s | Raredoc",
    },
    description: isKo
      ? "포켓몬 카드 시세, 투자 티어리스트, 확장팩 정보를 한눈에."
      : "Pokémon card prices, investment tier lists, and expansion info in one place.",
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: `/${locale}`,
      languages: { ko: "/ko", en: "/en" },
    },
    openGraph: {
      siteName: "Raredoc",
      locale: isKo ? "ko_KR" : "en_US",
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "ko" | "en")) notFound();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <WebSiteJsonLd locale={locale} />
      {ADSENSE_ID && (
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </NextIntlClientProvider>
  );
}
