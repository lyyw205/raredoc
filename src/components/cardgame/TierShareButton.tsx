"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import { Download, Check } from "lucide-react";

// 티어표 이미지 저장 (UI-2차) — 커뮤니티 유통 단위화 (벤치마크 A급 패턴 12:
// 티어표가 짤로 돌아야 유입이 생긴다). 캡처 대상은 targetId 의 DOM.
export function TierShareButton({ targetId, filename }: { targetId: string; filename: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  return (
    <button
      type="button"
      disabled={state === "busy"}
      onClick={async () => {
        const el = document.getElementById(targetId);
        if (!el) return;
        setState("busy");
        try {
          const dataUrl = await toPng(el, { backgroundColor: "#ffffff", pixelRatio: 2 });
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `${filename}.png`;
          a.click();
          setState("done");
          setTimeout(() => setState("idle"), 1500);
        } catch {
          setState("idle");
        }
      }}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-toss-bg-muted text-toss-caption font-medium text-toss-text-tertiary hover:text-toss-text-primary transition-colors disabled:opacity-50"
    >
      {state === "done" ? <Check size={13} /> : <Download size={13} />}
      {state === "done" ? "저장됨" : "이미지 저장"}
    </button>
  );
}
