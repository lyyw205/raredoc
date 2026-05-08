import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-gray-800 mt-16 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <p className="text-xs text-gray-500 leading-relaxed">{t("disclaimer")}</p>
        <p className="text-xs text-gray-600 mt-2">© 2026 Raredoc. Not affiliated with The Pokémon Company.</p>
      </div>
    </footer>
  );
}
