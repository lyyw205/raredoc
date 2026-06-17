import { TypeIcon } from "@/components/pokemon/TypeIcon";

/** 기술 코스트(에너지 타입 배열) → 타입 아이콘 핍. 빈 코스트는 "—" 표시. */
export function CostPips({ cost }: { cost?: string[] }) {
  if (!cost || cost.length === 0)
    return <span className="text-toss-micro text-toss-text-quaternary">—</span>;
  return (
    <span className="inline-flex gap-0.5 items-center">
      {cost.map((c, i) => (
        <TypeIcon key={i} type={c} size={16} />
      ))}
    </span>
  );
}
