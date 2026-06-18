/**
 * 시세 3출처(TCGplayer/eBay/번개장터) 카드의 헤더 행만 공통화한 컴포넌트.
 * 본문(가격값·폴백문구)은 출처마다 달라 호출부에 그대로 둔다 — 여기선 헤더 행만 렌더.
 *
 * 렌더는 기존 인라인 마크업과 100% 동일:
 *   <div className="flex items-center justify-between mb-2">
 *     <h3 ...><span>{emoji}</span> {title}</h3>
 *     {href ? <a ...>↗</a> : rightText ? <span ...>{rightText}</span> : null}
 *   </div>
 * - href 가 truthy 면 외부링크(↗), 아니면 rightText(정적 텍스트), 둘 다 없으면 우측 미렌더.
 */
export function PriceSourceHeader({
  emoji,
  title,
  href,
  rightText,
}: {
  emoji: string;
  title: string;
  href?: string | null;
  rightText?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-toss-caption font-semibold text-toss-text-secondary flex items-center gap-1.5">
        <span>{emoji}</span> {title}
      </h3>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-toss-tiny text-toss-brand hover:text-toss-brand-hover transition-colors"
        >
          ↗
        </a>
      ) : rightText ? (
        <span className="text-toss-tiny text-toss-text-quaternary">{rightText}</span>
      ) : null}
    </div>
  );
}
