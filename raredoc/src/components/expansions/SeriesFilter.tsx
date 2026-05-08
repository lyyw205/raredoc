"use client";
import { useRouter, usePathname } from "next/navigation";
import { SERIES_KO } from "@/lib/constants";

interface Props {
  series: { name: string; count: number }[];
  selected?: string;
}

export function SeriesFilter({ series, selected }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function select(seriesName: string | null) {
    const url = new URL(pathname, "http://x");
    if (seriesName) url.searchParams.set("series", seriesName);
    else url.searchParams.delete("series");
    router.push(url.pathname + url.search);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => select(null)}
        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
          !selected
            ? "bg-red-600 text-white"
            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
        }`}
      >
        전체
      </button>
      {series.map(({ name, count }) => (
        <button
          key={name}
          onClick={() => select(name)}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            selected === name
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          {SERIES_KO[name] ?? name}
          <span className="ml-1 text-xs opacity-70">({count})</span>
        </button>
      ))}
    </div>
  );
}
