"use client";
import { useEffect, useRef } from "react";

interface Props {
  slot: string;
  format?: "auto" | "rectangle" | "horizontal";
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdUnit({ slot, format = "auto", className = "" }: Props) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    if (!process.env.NEXT_PUBLIC_ADSENSE_ID) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {}
  }, []);

  if (!process.env.NEXT_PUBLIC_ADSENSE_ID) {
    // 개발 환경: 광고 플레이스홀더 표시
    return (
      <div className={`border border-dashed border-gray-700 rounded-lg flex items-center justify-center text-gray-600 text-xs ${className}`}
        style={{ minHeight: 90 }}>
        AdSense 광고 영역
      </div>
    );
  }

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle block ${className}`}
      style={{ display: "block" }}
      data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
