import Link from "next/link";
import type { PurchasableSet } from "@/lib/api/home";

interface SetGridProps {
  sets: PurchasableSet[];
  locale: string;
  title: string;
}

function SetCard({ set, locale }: { set: PurchasableSet; locale: string }) {
  const displayName = locale === "ko" ? set.nameKo ?? set.name : set.name;
  const series = locale === "ko" ? set.seriesKo ?? set.series : set.series;
  const year = new Date(set.releaseDate).getFullYear();
  const month = String(new Date(set.releaseDate).getMonth() + 1).padStart(2, "0");

  return (
    <Link
      href={`/${locale}/expansions/${set.id}`}
      className="group rounded-lg border border-gray-800 bg-gray-900/60 hover:bg-gray-900 hover:border-gray-700 transition-colors p-3"
    >
      <div className="flex items-center justify-center h-20 mb-2">
        {set.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={set.logoUrl}
            alt={set.name}
            className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
            loading="lazy"
          />
        ) : (
          <span className="text-4xl">📦</span>
        )}
      </div>
      <p className="text-[11px] text-gray-500 truncate">{series}</p>
      <p className="text-sm font-medium text-white truncate mt-0.5">
        {displayName}
      </p>
      <p className="text-[11px] text-gray-500 mt-1">
        {year}.{month} · {set.cardCount}
      </p>
    </Link>
  );
}

export function SetGrid({ sets, locale, title }: SetGridProps) {
  // Ascending by release date for left-to-right chronological flow
  const ordered = [...sets].sort(
    (a, b) => a.releaseDate.getTime() - b.releaseDate.getTime()
  );

  if (ordered.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-6">{title}</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {ordered.map((set) => (
          <SetCard key={set.id} set={set} locale={locale} />
        ))}
      </div>
    </section>
  );
}
