"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button, SearchField } from "@/components/toss";

// TODO: 임시 배경 이미지. 추후 제작한 이미지로 교체.
const TEMP_BG_IMAGE =
  "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1920&q=80";

export function HomeHero({ locale }: { locale: string }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  const handleSearch = (value: string) => {
    const q = value.trim();
    if (!q) return;
    router.push(`/${locale}/dex?q=${encodeURIComponent(q)}`);
  };

  return (
    <section className="relative w-full overflow-hidden">
      {/* 배경 이미지 (임시) */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${TEMP_BG_IMAGE})` }}
        aria-hidden
      />
      {/* 가독성 오버레이 */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/60"
        aria-hidden
      />

      {/* 콘텐츠 */}
      <div className="relative mx-auto flex min-h-[420px] max-w-3xl flex-col items-center justify-center px-4 py-24 text-center sm:min-h-[520px] sm:py-36">
        <h1 className="text-2xl font-bold leading-tight text-white sm:text-4xl">
          내 포켓몬 카드, 지금 얼마일까?
        </h1>
        <p className="mt-3 text-toss-label text-white/80 sm:text-toss-subtitle">
          카드 시세 · 도감 · 컬렉션을 한 번에 검색하세요
        </p>

        <div className="mt-7 flex w-full max-w-xl items-stretch gap-2">
          <div className="flex-1 rounded-toss-md shadow-toss-md [&_input]:text-toss-text-primary [&>div>div]:!bg-white">
            <SearchField
              size="lg"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery("")}
              placeholder="카드 이름, 세트, 카드 번호로 검색"
              onSearch={handleSearch}
              aria-label="카드 검색"
            />
          </div>
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Search className="h-4 w-4" />}
            onClick={() => handleSearch(query)}
            className="h-12 shrink-0 !rounded-toss-md shadow-toss-md"
          >
            검색
          </Button>
        </div>
      </div>
    </section>
  );
}
