"use client";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ToggleGroup } from "@/components/toss";

interface PricePoint {
  recordedAt: string;
  amount: number | null;
}

type RangeDef = { key: string; label: string; days: number | null };

interface Props {
  history: PricePoint[];
  lineLabel?: string;
  ranges?: RangeDef[];
}

const DEFAULT_RANGES: RangeDef[] = [
  { key: "30d", label: "30일", days: 30 },
  { key: "90d", label: "90일", days: 90 },
  { key: "all", label: "전체", days: null },
];

export const PT_RANGES: RangeDef[] = [
  { key: "7d",  label: "7일",  days: 7  },
  { key: "14d", label: "14일", days: 14 },
  { key: "30d", label: "30일", days: 30 },
];

// 토스 토큰 (실제 값) — recharts 가 CSS var() 를 인식하지 않는 경우가 있어 hex 사용
const COLORS = {
  grid:         "#E5E8EB",            // toss-grey-200 (옅은 회색)
  axisTick:     "#6B7684",            // toss-text-tertiary
  legend:       "#6B7684",            // toss-text-tertiary
  tooltipBg:    "#FFFFFF",            // toss-bg-base
  tooltipBorder:"rgba(0,27,55,0.10)", // toss-border
  tooltipLabel: "#191F28",            // toss-text-primary
  line1:        "#3182F6",            // toss-brand (파랑)
  line2:        "#DD7D02",            // toss-warning (오렌지)
};

export function PriceChart({ history, lineLabel, ranges = DEFAULT_RANGES }: Props) {
  const label = lineLabel ?? "시세";
  const [rangeKey, setRangeKey] = useState(ranges[0].key);

  const selected = ranges.find((r) => r.key === rangeKey) ?? ranges[0];
  const now = Date.now();
  const filtered = history.filter((p) => {
    if (selected.days === null) return true;
    return now - new Date(p.recordedAt).getTime() <= selected.days * 86400000;
  });

  if (!filtered.length) {
    return <p className="text-toss-caption text-toss-text-tertiary py-4">가격 히스토리 데이터가 없습니다.</p>;
  }

  const data = filtered.map((p) => ({
    date: new Date(p.recordedAt).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    }),
    amount: p.amount,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-toss-label font-bold text-toss-text-primary">가격 히스토리</h2>
        <ToggleGroup
          options={ranges.map((r) => ({ value: r.key, label: r.label }))}
          value={rangeKey}
          onChange={setRangeKey}
          size="sm"
        />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: COLORS.axisTick }} stroke={COLORS.grid} />
          <YAxis
            tick={{ fontSize: 11, fill: COLORS.axisTick }}
            stroke={COLORS.grid}
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: COLORS.tooltipBg,
              border: `1px solid ${COLORS.tooltipBorder}`,
              borderRadius: 8,
              boxShadow:
                "0 0.6px 0.6px -1.25px rgba(0,0,0,0.12), 0 2.2px 2.2px -2.5px rgba(0,0,0,0.10), 0 10px 10px -3.75px rgba(0,0,0,0.043)",
              fontFamily: "Pretendard Variable, Pretendard, sans-serif",
            }}
            labelStyle={{ color: COLORS.tooltipLabel, fontWeight: 600 }}
            itemStyle={{ color: COLORS.tooltipLabel }}
            formatter={(v) => {
              const num = typeof v === "number" ? v : Number(v);
              return [`$${num?.toFixed(2)}`, ""] as [string, string];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: COLORS.legend }} />
          <Line
            type="monotone"
            dataKey="amount"
            name={label}
            stroke={COLORS.line1}
            dot={false}
            strokeWidth={2}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
