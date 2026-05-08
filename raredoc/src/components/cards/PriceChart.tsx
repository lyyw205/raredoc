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
  recordedAt: string; // ISO string
  normal: number | null;
  holofoil: number | null;
}

interface Props {
  history: PricePoint[];
}

type Range = "30d" | "90d" | "all";

export function PriceChart({ history }: Props) {
  const [range, setRange] = useState<Range>("30d");

  const now = Date.now();
  const filtered = history.filter((p) => {
    if (range === "all") return true;
    const days = range === "30d" ? 30 : 90;
    return now - new Date(p.recordedAt).getTime() <= days * 86400000;
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
          {(["30d", "90d", "all"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                range === r ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {r === "30d" ? "30일" : r === "90d" ? "90일" : "전체"}
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
            name="노말"
            stroke="#60A5FA"
            dot={false}
            strokeWidth={2}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="holofoil"
            name="홀로포일"
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
