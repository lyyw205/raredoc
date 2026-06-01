"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type CardVersion = {
  region: string; // EN | JP | KR
  name: string;
  nameKo: string | null;
  number: string;
  artist: string | null;
  rarity: string | null;
  image: string | null;
};

const REGION_LABEL: Record<string, string> = {
  EN: "영문판",
  JP: "일본판",
  KR: "한국판",
};

/**
 * 카드 상세 좌측: 같은 카드(CardGroup)의 영/일/한 발매판을 탭으로 전환.
 * 그룹에 존재하는 지역만 탭으로 노출(부분 그룹 허용).
 */
export function CardVersionTabs({ versions, locale }: { versions: CardVersion[]; locale?: string }) {
  const [active, setActive] = useState(versions[0]?.region ?? "EN");
  const cur = versions.find((v) => v.region === active) ?? versions[0];
  if (!cur) return null;

  return (
    <div>
      {/* 지역 탭 */}
      <div className="flex gap-1 mb-3 justify-start">
        {versions.map((v) => (
          <button
            key={v.region}
            type="button"
            onClick={() => setActive(v.region)}
            className={cn(
              "px-3 py-1.5 rounded-toss-md text-toss-caption font-semibold transition-colors",
              v.region === active
                ? "bg-toss-brand text-white"
                : "bg-toss-bg-muted text-toss-text-secondary hover:bg-toss-hover",
            )}
          >
            {REGION_LABEL[v.region] ?? v.region}
          </button>
        ))}
      </div>

      {/* 활성 판본 이미지 + 메타 */}
      <div className="w-full max-w-xs">
        {cur.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cur.image} alt={cur.name} className="rounded-toss-lg shadow-toss-lg w-full" />
        ) : (
          <div className="aspect-[5/7] rounded-toss-lg bg-toss-bg-muted flex items-center justify-center">
            <span className="text-toss-caption text-toss-text-quaternary">이미지 없음</span>
          </div>
        )}
        <div className="mt-3 text-left">
          <p className="text-toss-label font-bold text-toss-text-primary">
            {locale === "ko" && cur.nameKo ? cur.nameKo : cur.name}
          </p>
          {locale === "ko" && cur.nameKo && (
            <p className="text-toss-micro text-toss-text-quaternary">{cur.name}</p>
          )}
          <p className="text-toss-caption text-toss-text-tertiary mt-0.5">
            No.{cur.number}
            {cur.rarity ? ` · ${cur.rarity}` : ""}
            {cur.artist ? ` · ${cur.artist}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
