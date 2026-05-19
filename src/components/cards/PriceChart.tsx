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

interface PricePoint {
  recordedAt: string;
  normal: number | null;
  holofoil: number | null;
}

type RangeDef = { key: string; label: string; days: number | null };

interface Props {
  history: PricePoint[];
  lineLabels?: { normal: string; holofoil: string };
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

export function PriceChart({ history, lineLabels, ranges = DEFAULT_RANGES }: Props) {
  const labels = lineLabels ?? { normal: "노말", holofoil: "홀로포일" };
  const [rangeKey, setRangeKey] = useState(ranges[0].key);

  const selected = ranges.find((r) => r.key === rangeKey) ?? ranges[0];
  const now = Date.now();
  const filtered = history.filter((p) => {
    if (selected.days === null) return true;
    return now - new Date(p.recordedAt).getTime() <= selected.days * 86400000;
  });

  if (!filtered.length) {
    return <p className="text-sm text-gray-500 py-4">가격 히스토리 데이터가 없습니다.</p>;
  }

  const data = filtered.map((p) => ({
    date: new Date(p.recordedAt).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    }),
    normal: p.normal,
    holofoil: p.holofoil,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-300">가격 히스토리</h2>
        <div className="flex gap-1 bg-gray-800 rounded p-1">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                rangeKey === r.key ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: 8,
            }}
            labelStyle={{ color: "#E5E7EB" }}
            formatter={(v) => {
              const num = typeof v === "number" ? v : Number(v);
              return [`$${num?.toFixed(2)}`, ""] as [string, string];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#9CA3AF" }} />
          <Line
            type="monotone"
            dataKey="normal"
            name={labels.normal}
            stroke="#60A5FA"
            dot={false}
            strokeWidth={2}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="holofoil"
            name={labels.holofoil}
            stroke="#FBBF24"
            dot={false}
            strokeWidth={2}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
