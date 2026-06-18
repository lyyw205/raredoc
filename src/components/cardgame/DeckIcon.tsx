import iconMap from "@/data/deck-icon-map.json";
import { cn } from "@/lib/utils";

// 아키타입 아이콘 — DeckArchetype.iconKeys(Limitless 슬러그) → PokeAPI 공식 아트워크(R2 미러).
// 미해석 슬러그(예: "substitute")는 모노그램 폴백. 훅 없음 — 서버/클라이언트 양쪽에서 사용 가능.
// docs/cardgame/cardgame-ui-plan.md §2-I2

const ICONS: Record<string, string> = (iconMap as { icons: Record<string, string> }).icons;

const SIZE = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-12 h-12 text-sm",
} as const;

function Monogram({ slug, sizeCls }: { slug: string; sizeCls: string }) {
  return (
    <span
      className={cn(
        sizeCls,
        "rounded-full bg-toss-bg-muted text-toss-text-tertiary font-bold inline-flex items-center justify-center uppercase shrink-0 ring-2 ring-white",
      )}
      title={slug}
    >
      {slug.charAt(0)}
    </span>
  );
}

export function DeckIcon({
  iconKeys,
  size = "md",
  className,
}: {
  iconKeys: string[];
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const keys = iconKeys.slice(0, 2);
  const sizeCls = SIZE[size];
  if (keys.length === 0) return null;

  return (
    <span className={cn("inline-flex items-center shrink-0", className)}>
      {keys.map((k, i) => {
        const url = ICONS[k];
        return url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={k}
            src={url}
            alt={k}
            loading="lazy"
            decoding="async"
            className={cn(
              sizeCls,
              "rounded-full bg-white object-contain ring-2 ring-white shrink-0",
              i > 0 && "-ml-2",
            )}
          />
        ) : (
          <Monogram key={k} slug={k} sizeCls={cn(sizeCls, i > 0 && "-ml-2")} />
        );
      })}
    </span>
  );
}
