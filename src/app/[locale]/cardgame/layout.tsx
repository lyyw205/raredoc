"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/toss";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { emoji: "🏆", label: "메타",   segment: ""           },
  { emoji: "🃏", label: "카드",   segment: "/cards"     },
  { emoji: "📕", label: "덱",     segment: "/decks"     },
  { emoji: "🎮", label: "대회",   segment: "/tournaments" },
  { emoji: "📖", label: "가이드", segment: "/guide"     },
] as const;

export default function CardgameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const locale = (params?.locale as string) ?? "ko";

  const isActive = (segment: string) => {
    const base = `/${locale}/cardgame`;
    const full = `${base}${segment}`;
    if (segment === "") {
      return pathname === base || pathname === `${base}/`;
    }
    return pathname === full || pathname.startsWith(`${full}/`);
  };

  return (
    <Container size="xl" padding="md" className="py-8">
      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        {/* 좌측 사이드바 */}
        <aside className="lg:sticky lg:top-[68px] lg:self-start">
          <div>
            <p className="px-4 pt-3 pb-2 text-toss-body text-toss-text-secondary">
              카드게임
            </p>
            <nav>
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.segment);
                return (
                  <Link
                    key={item.segment}
                    href={`/${locale}/cardgame${item.segment}`}
                    className={cn(
                      "w-full flex items-center gap-2 px-4 py-2.5 h-10 text-toss-body transition-colors rounded-toss-md",
                      active
                        ? "bg-toss-brand-weak text-toss-brand font-semibold"
                        : "text-toss-text-secondary hover:bg-toss-hover"
                    )}
                  >
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* 메인 영역 */}
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
