import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("home");
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-white mb-4">{t("hero")}</h1>
        <p className="text-gray-400 text-lg">{t("heroSub")}</p>
        <div className="mt-8 flex gap-4 justify-center">
          <a href="./expansions" className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors">
            {t("viewAll")} →
          </a>
        </div>
      </div>
    </div>
  );
}
