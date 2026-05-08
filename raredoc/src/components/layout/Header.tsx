"use client";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function toggleLocale() {
    const next = locale === "ko" ? "en" : "ko";
    const newPath = pathname.replace(`/${locale}`, `/${next}`);
    router.push(newPath);
  }

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={`/${locale}`} className="font-bold text-xl text-white tracking-tight">
          Raredoc
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href={`/${locale}/expansions`} className="text-gray-300 hover:text-white transition-colors">
            {t("expansions")}
          </Link>
          <Link href={`/${locale}/tier-list`} className="text-gray-300 hover:text-white transition-colors">
            {t("tierList")}
          </Link>
          <button
            onClick={toggleLocale}
            className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
          >
            {locale === "ko" ? "EN" : "한"}
          </button>
        </nav>
      </div>
    </header>
  );
}
