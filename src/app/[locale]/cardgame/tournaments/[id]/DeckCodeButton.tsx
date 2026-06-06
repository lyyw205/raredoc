"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// 공식 덱코드 복사 버튼 — pokemoncard.co.kr 덱 빌더에 import 가능 (multisource P3).
export function DeckCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard 미지원 — 무시 */
        }
      }}
      title={`덱코드 복사: ${code} (공식 덱 빌더에 불러오기 가능)`}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-md text-toss-micro font-medium transition-colors",
        copied
          ? "bg-green-50 text-green-600"
          : "bg-toss-bg-muted text-toss-text-tertiary hover:text-toss-text-primary",
      )}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "복사됨" : "덱코드"}
    </button>
  );
}
