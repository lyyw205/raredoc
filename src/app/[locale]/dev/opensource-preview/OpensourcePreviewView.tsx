"use client";

import * as React from "react";
import type { PreviewData } from "./page";

type ImageItem = { label: string; url: string };
type ImageResource = {
  id: string; title: string; repo: string; repoUrl: string;
  kind: "image"; note: string; items: ImageItem[];
};
type TableResource = {
  id: string; title: string; repo: string; repoUrl: string;
  kind: "table"; note: string; columns: string[]; rows: (string | number)[][];
};
type Resource = ImageResource | TableResource;

export function OpensourcePreviewView({ data }: { data: PreviewData }) {
  const resources = data.resources as unknown as Resource[];
  const [active, setActive] = React.useState(resources[0]?.id ?? "");
  const current = resources.find((r) => r.id === active) ?? resources[0];

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 16px 64px" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>포켓몬 오픈소스 자료 미리보기</h1>
        <p style={{ color: "#8b95a1", fontSize: 13, marginTop: 6 }}>
          각 자료의 실제 샘플 (이미지 20개 · 표 100행). 생성:{" "}
          {new Date(data.generatedAt).toLocaleString("ko-KR")} ·{" "}
          <code style={{ fontSize: 12 }}>scripts/build-opensource-preview.ts</code>
        </p>
      </header>

      {/* 탭 */}
      <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {resources.map((r) => {
          const on = r.id === active;
          return (
            <button
              key={r.id}
              onClick={() => setActive(r.id)}
              style={{
                padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                cursor: "pointer", border: "1px solid", transition: "all .15s",
                borderColor: on ? "#3182f6" : "#e5e8eb",
                background: on ? "#3182f6" : "#fff",
                color: on ? "#fff" : "#4e5968",
              }}
            >
              {r.title}
              <span style={{ marginLeft: 6, opacity: 0.7, fontWeight: 400 }}>
                {r.kind === "image" ? `${r.items.length}` : `${r.rows.length}`}
              </span>
            </button>
          );
        })}
      </nav>

      {current && <ResourcePanel resource={current} />}
    </div>
  );
}

function ResourcePanel({ resource }: { resource: Resource }) {
  return (
    <section>
      <div
        style={{
          background: "#f9fafb", border: "1px solid #f2f4f6", borderRadius: 12,
          padding: "14px 16px", marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 15 }}>{resource.title}</strong>
          <a
            href={resource.repoUrl}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12.5, color: "#3182f6", textDecoration: "none" }}
          >
            {resource.repo} ↗
          </a>
        </div>
        <p style={{ color: "#6b7684", fontSize: 13, margin: "6px 0 0", lineHeight: 1.5 }}>
          {resource.note}
        </p>
      </div>

      {resource.kind === "image" ? (
        <ImageGrid items={resource.items} />
      ) : (
        <DataTable columns={resource.columns} rows={resource.rows} />
      )}
    </section>
  );
}

function ImageGrid({ items }: { items: ImageItem[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: 12,
      }}
    >
      {items.map((it) => (
        <figure
          key={it.url}
          style={{
            margin: 0, border: "1px solid #f2f4f6", borderRadius: 12, overflow: "hidden",
            background: "#fff", display: "flex", flexDirection: "column",
          }}
        >
          <div
            style={{
              height: 110, display: "flex", alignItems: "center", justifyContent: "center",
              padding: 12,
              // 투명/흰 이미지 대비용 체커보드
              backgroundImage:
                "linear-gradient(45deg,#eef1f4 25%,transparent 25%),linear-gradient(-45deg,#eef1f4 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eef1f4 75%),linear-gradient(-45deg,transparent 75%,#eef1f4 75%)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={it.url}
              alt={it.label}
              loading="lazy"
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          </div>
          <figcaption
            style={{
              fontSize: 11.5, color: "#4e5968", textAlign: "center", padding: "6px 4px",
              borderTop: "1px solid #f2f4f6", whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={it.label}
          >
            {it.label}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <div style={{ border: "1px solid #f2f4f6", borderRadius: 12, overflow: "auto", maxHeight: 560 }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                style={{
                  position: "sticky", top: 0, background: "#f9fafb", textAlign: "left",
                  padding: "9px 12px", borderBottom: "1px solid #e5e8eb", fontWeight: 700,
                  color: "#4e5968", whiteSpace: "nowrap",
                }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 ? "#fff" : "#fcfcfd" }}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: "8px 12px", borderBottom: "1px solid #f2f4f6", whiteSpace: "nowrap",
                    color: j === 0 ? "#8b95a1" : "#191f28",
                  }}
                >
                  {String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
