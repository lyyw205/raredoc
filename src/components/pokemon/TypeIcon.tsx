import { cn } from "@/lib/utils";

// 포켓몬 TCG 11타입 아이콘 — 정품 글로시 에너지 심볼(오브).
//  - 에셋: tcgcollector 에너지 심볼 → public/type-icons/{key}.png (자체 색배경 포함 투명 PNG).
//    → 원형 배지 래퍼 불필요, 이미지를 그대로 렌더.
//  - 입력 표기 흔들림 흡수: "Grass"(대문자 TCG·dex/카드상세) 와 "grass"(소문자·cardgame) 둘 다 허용.
//    Lightning=번개, Darkness=악, Metal=강철, Colorless=무색 (TCG 명칭 그대로 key 사용).
//  - 11종 전부 orb PNG(페어리 포함). 매핑에 없는 타입(이론상 없음)은 렌더하지 않음(null).

type TypeMeta = { ko: string };

const TYPE_META: Record<string, TypeMeta> = {
  grass:     { ko: "풀" },
  fire:      { ko: "불꽃" },
  water:     { ko: "물" },
  lightning: { ko: "번개" },
  psychic:   { ko: "에스퍼" },
  fighting:  { ko: "격투" },
  darkness:  { ko: "악" },
  metal:     { ko: "강철" },
  dragon:    { ko: "드래곤" },
  colorless: { ko: "무색" },
  fairy:     { ko: "페어리" },
};

function metaFor(type: string): TypeMeta | undefined {
  return TYPE_META[type.trim().toLowerCase()];
}

/** 타입 한글명(텍스트가 필요한 곳: alt·title·접근성용). */
export function typeKo(type: string): string {
  return metaFor(type)?.ko ?? type;
}

/** 단일 타입을 정품 에너지 심볼(오브 PNG)로 렌더. 매핑에 없는 타입(이론상 없음)은 null. */
export function TypeIcon({
  type,
  size = 18,
  className,
}: {
  type: string;
  size?: number;
  className?: string;
}) {
  const key = type.trim().toLowerCase();
  const meta = TYPE_META[key];
  if (!meta) return null; // 미지원 타입 — 폴백 없이 미렌더(데이터엔 11종만 존재)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/type-icons/${key}.png`}
      alt={meta.ko}
      title={meta.ko}
      width={size}
      height={size}
      className={cn("inline-block shrink-0 align-middle", className)}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * 타입 아이콘 가로 나열. 약점/저항처럼 값(value: "×2", "-30")이 있으면 아이콘 옆에 텍스트로 덧붙인다.
 * 빈 배열이면 "—" 플레이스홀더.
 */
export function TypeIconRow({
  items,
  size = 18,
  className,
}: {
  items: { type: string; value?: string }[];
  size?: number;
  className?: string;
}) {
  if (items.length === 0) {
    return <span className="text-toss-text-quaternary">—</span>;
  }
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-0.5">
          <TypeIcon type={it.type} size={size} />
          {it.value ? (
            <span className="text-[11px] font-semibold text-toss-text-secondary">{it.value}</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
