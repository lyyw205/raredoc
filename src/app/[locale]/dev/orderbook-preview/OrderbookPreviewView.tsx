"use client";

import * as React from "react";

/* ────────────────────────────────────────────────────────────────────────────
 * 호가 테스트 페이지 (목업)
 *
 * 확정 모델:
 *  - 우리 = 시세 제공자: 과거 거래내역 누적 → 참고 시세밴드(상·하한·중앙값). 강제 아님.
 *  - 호가창 = 사진+컨디션 단 개별 매물 리스트. 매도 호가는 사진 필수.
 *  - 자동 매칭 없음 → 사진 보고 사람이 특정 매물 즉시구매(taker) / 매수호가에 즉시판매.
 *  - 미리 걸어두기: 매도·매수 호가 둘 다 rest.
 *
 * 전부 in-memory 목업. DB/마이그레이션 없음. UX 검증 후 삭제.
 * ──────────────────────────────────────────────────────────────────────────── */

// 토스 팔레트
const C = {
  blue: "#3182f6",
  red: "#f04452",
  ink: "#191f28",
  gray700: "#4e5968",
  gray500: "#6b7684",
  gray400: "#8b95a1",
  line: "#e5e8eb",
  line2: "#f2f4f6",
  surface: "#f9fafb",
  white: "#fff",
  green: "#0f9d58",
};

type Side = "buy" | "sell";

type Ask = {
  id: string;
  priceKrw: number;
  condition: string;
  seller: string;
  photos: string[]; // blob:/http = 실제 업로드, 그 외 = 목업 placeholder 시드
  createdAt: number;
};
type Bid = {
  id: string;
  priceKrw: number;
  condition: string | null; // 희망 컨디션(선택)
  buyer: string;
  createdAt: number;
};
type Fill = {
  id: string;
  priceKrw: number;
  condition: string;
  side: Side; // 체결을 일으킨 taker 방향
  at: number;
};

// 샘플 카드 (목업)
const CARD = {
  name: "리자몽 ex",
  sub: "SV2a 포켓몬카드151 · #185 · SAR",
  region: "JP",
};

const CONDITIONS = ["미개봉", "PSA 10", "PSA 9", "NM", "LP", "MP", "HP"] as const;

const CONDITION_META: Record<string, { color: string; bg: string }> = {
  "미개봉": { color: "#0f9d58", bg: "#e6f4ea" },
  "PSA 10": { color: "#b8860b", bg: "#fbf3d9" },
  "PSA 9": { color: "#a06a00", bg: "#fbf0d6" },
  NM: { color: "#3182f6", bg: "#e8f1ff" },
  LP: { color: "#1f9b8e", bg: "#e3f5f2" },
  MP: { color: "#c2790a", bg: "#fbeedd" },
  HP: { color: "#e0533f", bg: "#fde9e6" },
};

// 시세 참고밴드 (거래내역 기반 — 목업)
const BAND = {
  low: 710000,
  mid: 820000,
  high: 980000,
  change1w: 3.2, // %
  spark: [762, 748, 790, 805, 786, 814, 800, 828, 818, 820, 835, 822],
};

const SEED_ASKS: Ask[] = [
  { id: "a1", priceKrw: 769000, condition: "LP", seller: "카드창고**", photos: ["seed:11"], createdAt: 1010 },
  { id: "a2", priceKrw: 789000, condition: "NM", seller: "포켓몬덕**", photos: ["seed:204", "seed:88"], createdAt: 1020 },
  { id: "a3", priceKrw: 815000, condition: "NM", seller: "레어독**", photos: ["seed:330"], createdAt: 1030 },
  { id: "a4", priceKrw: 920000, condition: "PSA 9", seller: "그레이딩**", photos: ["seed:48"], createdAt: 1040 },
  { id: "a5", priceKrw: 1180000, condition: "PSA 10", seller: "민트킹**", photos: ["seed:150"], createdAt: 1050 },
];

const SEED_BIDS: Bid[] = [
  { id: "b1", priceKrw: 745000, condition: "NM", buyer: "수집가A**", createdAt: 1015 },
  { id: "b2", priceKrw: 720000, condition: null, buyer: "초보컬렉**", createdAt: 1025 },
  { id: "b3", priceKrw: 700000, condition: "LP", buyer: "가성비**", createdAt: 1035 },
];

const SEED_FILLS: Fill[] = [
  { id: "f1", priceKrw: 812000, condition: "NM", side: "buy", at: 990 },
  { id: "f2", priceKrw: 805000, condition: "LP", side: "sell", at: 950 },
  { id: "f3", priceKrw: 835000, condition: "NM", side: "buy", at: 900 },
];

// ── helpers ───────────────────────────────────────────────────────────────
const won = (n: number) => "₩" + n.toLocaleString("ko-KR");
const isRealUrl = (s: string) => s.startsWith("blob:") || s.startsWith("http");
const hashHue = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};
const relTime = (at: number) => {
  // 목업 상대시각 (작을수록 과거)
  const map: Record<number, string> = { 990: "방금", 950: "12분 전", 900: "1시간 전" };
  return map[at] ?? "방금";
};

let uid = 0;
const nextId = (p: string) => `${p}_${Date.now()}_${uid++}`;

// ── 작은 컴포넌트 ───────────────────────────────────────────────────────────
function ConditionBadge({ value }: { value: string }) {
  const m = CONDITION_META[value] ?? { color: C.gray700, bg: C.line2 };
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        color: m.color,
        background: m.bg,
        borderRadius: 6,
        padding: "2px 7px",
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </span>
  );
}

function PhotoThumb({
  src,
  size = 52,
  onClick,
}: {
  src: string;
  size?: number;
  onClick?: () => void;
}) {
  const real = isRealUrl(src);
  const common: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 8,
    flexShrink: 0,
    cursor: onClick ? "zoom-in" : "default",
    border: `1px solid ${C.line2}`,
    objectFit: "cover",
  };
  if (real) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="실물 사진" style={common} onClick={onClick} />;
  }
  const hue = hashHue(src);
  return (
    <div
      onClick={onClick}
      style={{
        ...common,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        lineHeight: 1.15,
        fontSize: 8.5,
        fontWeight: 700,
        color: "rgba(255,255,255,.9)",
        background: `linear-gradient(135deg, hsl(${hue} 68% 72%), hsl(${(hue + 40) % 360} 70% 56%))`,
      }}
    >
      실물사진
      <br />
      (목업)
    </div>
  );
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export function OrderbookPreviewView({ locale }: { locale: string }) {
  const [asks, setAsks] = React.useState<Ask[]>(SEED_ASKS);
  const [bids, setBids] = React.useState<Bid[]>(SEED_BIDS);
  const [fills, setFills] = React.useState<Fill[]>(SEED_FILLS);

  const [modal, setModal] = React.useState<Side | null>(null);
  const [lightbox, setLightbox] = React.useState<{ photos: string[]; idx: number } | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const sortedAsks = React.useMemo(
    () => [...asks].sort((a, b) => a.priceKrw - b.priceKrw || a.createdAt - b.createdAt),
    [asks],
  );
  const sortedBids = React.useMemo(
    () => [...bids].sort((a, b) => b.priceKrw - a.priceKrw || a.createdAt - b.createdAt),
    [bids],
  );
  const bestAsk = sortedAsks[0]?.priceKrw ?? null;
  const bestBid = sortedBids[0]?.priceKrw ?? null;
  const spread = bestAsk != null && bestBid != null ? bestAsk - bestBid : null;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  // 즉시구매: 특정 매도 호가를 taker가 체결 (사진 확인 후)
  const buyNow = (ask: Ask) => {
    setAsks((prev) => prev.filter((a) => a.id !== ask.id));
    setFills((prev) => [
      { id: nextId("f"), priceKrw: ask.priceKrw, condition: ask.condition, side: "buy", at: Date.now() },
      ...prev,
    ]);
    flash(`즉시구매 체결 · ${ask.condition} · ${won(ask.priceKrw)} (→ 거래 채팅 자동 생성)`);
  };

  // 즉시판매: 매수 호가에 응함. 우리 모델상 판매자가 사진 제출 → 매수자 확인. 목업은 확인 단계 생략.
  const sellNow = (bid: Bid) => {
    setBids((prev) => prev.filter((b) => b.id !== bid.id));
    setFills((prev) => [
      { id: nextId("f"), priceKrw: bid.priceKrw, condition: bid.condition ?? "NM", side: "sell", at: Date.now() },
      ...prev,
    ]);
    flash(`즉시판매 매칭 · ${won(bid.priceKrw)} (→ 사진 제출 후 매수자 확인 단계)`);
  };

  const wrap: React.CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "20px 16px 96px" };
  const cardBox: React.CSSProperties = {
    background: C.white,
    border: `1px solid ${C.line2}`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  };

  return (
    <div style={{ background: C.surface, minHeight: "100vh", color: C.ink }}>
      <div style={wrap}>
        {/* 헤더 */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 4 }}>
          <PhotoThumb src="seed:271" size={56} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>{CARD.name}</h1>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: C.gray500,
                  background: C.line2,
                  borderRadius: 999,
                  padding: "2px 8px",
                }}
              >
                호가 테스트 · 목업
              </span>
            </div>
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: C.gray500 }}>{CARD.sub}</p>
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: C.gray400, margin: "0 0 16px" }}>
          시세는 <b>우리가 거래내역으로 계산한 참고값</b> · 호가는 사용자가 <b>자기 컨디션+사진</b>으로 올린 개별
          매물 · 자동매칭 없이 <b>사진 보고 즉시구매/즉시판매</b>. (locale: {locale})
        </p>

        {/* 시세 참고밴드 */}
        <div style={cardBox}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.gray700 }}>거래내역 기반 시세 (참고용)</span>
            <span style={{ fontSize: 11.5, color: C.gray400 }}>등록 가이드 · 강제 아님</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "8px 0 12px" }}>
            <span style={{ fontSize: 26, fontWeight: 800 }}>{won(BAND.mid)}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: BAND.change1w >= 0 ? C.red : C.blue }}>
              {BAND.change1w >= 0 ? "▲" : "▼"} {Math.abs(BAND.change1w)}% <span style={{ color: C.gray400, fontWeight: 500 }}>1주</span>
            </span>
            <Sparkline data={BAND.spark} />
          </div>
          <RangeBar low={BAND.low} mid={BAND.mid} high={BAND.high} />
        </div>

        {/* best / spread 요약 */}
        <div style={{ ...cardBox, display: "flex", textAlign: "center", padding: "12px 16px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: C.gray500 }}>최저 매도</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.blue }}>{bestAsk != null ? won(bestAsk) : "—"}</div>
          </div>
          <div style={{ width: 1, background: C.line2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: C.gray500 }}>스프레드</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.gray700 }}>{spread != null ? won(spread) : "—"}</div>
          </div>
          <div style={{ width: 1, background: C.line2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: C.gray500 }}>최고 매수</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.red }}>{bestBid != null ? won(bestBid) : "—"}</div>
          </div>
        </div>

        {/* 등록 버튼 */}
        <div style={{ display: "flex", gap: 10, margin: "4px 0 18px" }}>
          <button onClick={() => setModal("sell")} style={bigBtn(C.blue)}>
            + 매도 호가 등록
          </button>
          <button onClick={() => setModal("buy")} style={bigBtn(C.red)}>
            + 매수 호가 등록
          </button>
        </div>

        {/* 매도 호가 */}
        <SectionHeader color={C.blue} title="매도 호가" hint="낮은 가격순 · 사진·컨디션 확인 후 즉시구매" count={sortedAsks.length} />
        <div style={{ marginBottom: 22 }}>
          {sortedAsks.length === 0 && <EmptyRow text="등록된 매도 호가가 없어요" />}
          {sortedAsks.map((a) => (
            <div key={a.id} style={rowBox}>
              <div style={{ position: "relative" }}>
                <PhotoThumb src={a.photos[0]} onClick={() => setLightbox({ photos: a.photos, idx: 0 })} />
                {a.photos.length > 1 && (
                  <span style={photoCountChip}>+{a.photos.length - 1}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <ConditionBadge value={a.condition} />
                  <span style={{ fontSize: 11.5, color: C.gray400 }}>{a.seller}</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{won(a.priceKrw)}</div>
                <div style={{ fontSize: 11, color: C.gray400 }}>{deltaVsMid(a.priceKrw)}</div>
              </div>
              <button onClick={() => buyNow(a)} style={takerBtn(C.blue)}>
                즉시구매
              </button>
            </div>
          ))}
        </div>

        {/* 매수 호가 */}
        <SectionHeader color={C.red} title="매수 호가" hint="높은 가격순 · 응하면 사진 제출 후 매수자 확인" count={sortedBids.length} />
        <div style={{ marginBottom: 22 }}>
          {sortedBids.length === 0 && <EmptyRow text="등록된 매수 호가가 없어요" />}
          {sortedBids.map((b) => (
            <div key={b.id} style={rowBox}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  {b.condition ? <ConditionBadge value={`${b.condition}+ 희망`} /> : (
                    <span style={{ fontSize: 11.5, color: C.gray400 }}>컨디션 무관</span>
                  )}
                  <span style={{ fontSize: 11.5, color: C.gray400 }}>{b.buyer}</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{won(b.priceKrw)}</div>
                <div style={{ fontSize: 11, color: C.gray400 }}>{deltaVsMid(b.priceKrw)}</div>
              </div>
              <button onClick={() => sellNow(b)} style={takerBtn(C.red)}>
                즉시판매
              </button>
            </div>
          ))}
        </div>

        {/* 최근 체결 */}
        <SectionHeader color={C.gray500} title="최근 체결" hint="이 데이터가 시세로 누적됩니다" count={fills.length} />
        <div style={{ ...cardBox, padding: "6px 14px" }}>
          {fills.slice(0, 8).map((f, i) => (
            <div
              key={f.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 0",
                borderBottom: i < Math.min(fills.length, 8) - 1 ? `1px solid ${C.line2}` : "none",
              }}
            >
              <ConditionBadge value={f.condition} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>{won(f.priceKrw)}</span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: f.side === "buy" ? C.blue : C.red,
                }}
              >
                {f.side === "buy" ? "구매체결" : "판매체결"}
              </span>
              <span style={{ marginLeft: "auto", fontSize: 11.5, color: C.gray400 }}>{relTime(f.at)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 등록 모달 */}
      {modal && (
        <RegisterModal
          side={modal}
          onClose={() => setModal(null)}
          onSubmit={(payload) => {
            if (modal === "sell") {
              setAsks((prev) => [
                {
                  id: nextId("a"),
                  priceKrw: payload.priceKrw,
                  condition: payload.condition,
                  seller: "나(테스트)",
                  photos: payload.photos,
                  createdAt: Date.now(),
                },
                ...prev,
              ]);
              flash(`매도 호가 등록 · ${payload.condition} · ${won(payload.priceKrw)}`);
            } else {
              setBids((prev) => [
                {
                  id: nextId("b"),
                  priceKrw: payload.priceKrw,
                  condition: payload.wantCondition,
                  buyer: "나(테스트)",
                  createdAt: Date.now(),
                },
                ...prev,
              ]);
              flash(`매수 호가 등록 · ${won(payload.priceKrw)}`);
            }
            setModal(null);
          }}
        />
      )}

      {/* 사진 라이트박스 */}
      {lightbox && <Lightbox state={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />}

      {/* 토스트 */}
      {toast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 26,
            transform: "translateX(-50%)",
            background: "rgba(25,31,40,.94)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            padding: "11px 16px",
            borderRadius: 12,
            maxWidth: 560,
            width: "calc(100% - 32px)",
            textAlign: "center",
            zIndex: 60,
            boxShadow: "0 8px 24px rgba(0,0,0,.2)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );

  function deltaVsMid(price: number) {
    const d = ((price - BAND.mid) / BAND.mid) * 100;
    const sign = d >= 0 ? "+" : "";
    return `시세 대비 ${sign}${d.toFixed(1)}%`;
  }
}

// ── 보조 컴포넌트 ───────────────────────────────────────────────────────────
function SectionHeader({
  color,
  title,
  hint,
  count,
}: {
  color: string;
  title: string;
  hint: string;
  count: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "0 2px 8px" }}>
      <span style={{ width: 4, height: 15, borderRadius: 2, background: color, alignSelf: "center" }} />
      <span style={{ fontSize: 15, fontWeight: 800 }}>{title}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.gray400 }}>{count}</span>
      <span style={{ marginLeft: "auto", fontSize: 11, color: C.gray400 }}>{hint}</span>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px dashed ${C.line}`,
        borderRadius: 12,
        padding: "22px 14px",
        textAlign: "center",
        fontSize: 13,
        color: C.gray400,
      }}
    >
      {text}
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 64,
    h = 22;
  const min = Math.min(...data),
    max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={w} height={h} style={{ marginLeft: "auto" }}>
      <polyline points={pts} fill="none" stroke={up ? C.red : C.blue} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function RangeBar({ low, mid, high }: { low: number; mid: number; high: number }) {
  const pct = ((mid - low) / (high - low)) * 100;
  return (
    <div>
      <div style={{ position: "relative", height: 8, borderRadius: 999, background: `linear-gradient(90deg, ${C.blue}22, ${C.gray400}22, ${C.red}22)` }}>
        <div
          style={{
            position: "absolute",
            top: -3,
            left: `${pct}%`,
            transform: "translateX(-50%)",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: C.white,
            border: `3px solid ${C.ink}`,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11.5, color: C.gray500 }}>
        <span>하한 {won(low)}</span>
        <span style={{ color: C.gray400 }}>중앙값 {won(mid)}</span>
        <span>상한 {won(high)}</span>
      </div>
    </div>
  );
}

// ── 등록 모달 ───────────────────────────────────────────────────────────────
type RegisterPayload = { priceKrw: number; condition: string; wantCondition: string | null; photos: string[] };

function RegisterModal({
  side,
  onClose,
  onSubmit,
}: {
  side: Side;
  onClose: () => void;
  onSubmit: (p: RegisterPayload) => void;
}) {
  const isSell = side === "sell";
  const [price, setPrice] = React.useState<string>("");
  const [condition, setCondition] = React.useState<string>(isSell ? "NM" : "");
  const [files, setFiles] = React.useState<{ url: string; name: string }[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const priceNum = parseInt(price.replace(/[^0-9]/g, ""), 10) || 0;
  const inBand = priceNum >= BAND.low && priceNum <= BAND.high;
  const photoMissing = isSell && files.length === 0;
  const canSubmit = priceNum > 0 && (!isSell || (files.length > 0 && !!condition));

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    const mapped = list.map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
    setFiles((prev) => [...prev, ...mapped].slice(0, 6));
  };

  const accent = isSell ? C.blue : C.red;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.4)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.white,
          width: "100%",
          maxWidth: 480,
          borderRadius: "20px 20px 0 0",
          padding: "20px 18px calc(20px + env(safe-area-inset-bottom))",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: accent }}>
            {isSell ? "매도 호가 등록" : "매수 호가 등록"}
          </h2>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 22, color: C.gray400, cursor: "pointer", lineHeight: 1 }}>
            ×
          </button>
        </div>

        {/* 가격 */}
        <Label text="가격" />
        <input
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={`예: ${BAND.mid.toLocaleString("ko-KR")}`}
          style={inputStyle}
        />
        <div style={{ fontSize: 11.5, marginTop: 6, color: priceNum === 0 ? C.gray400 : inBand ? C.green : "#e0820a" }}>
          참고 시세범위 {won(BAND.low)} ~ {won(BAND.high)}
          {priceNum > 0 && (inBand ? " · 범위 내 ✓" : " · 범위 밖 ⚠ (자유 등록 가능)")}
        </div>

        {/* 컨디션 */}
        <div style={{ height: 14 }} />
        <Label text={isSell ? "컨디션 (실물 상태)" : "희망 컨디션 (선택)"} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {!isSell && (
            <Chip active={condition === ""} onClick={() => setCondition("")} label="무관" />
          )}
          {CONDITIONS.map((c) => (
            <Chip key={c} active={condition === c} onClick={() => setCondition(c)} label={c} />
          ))}
        </div>

        {/* 사진 (매도 필수) */}
        {isSell && (
          <>
            <div style={{ height: 14 }} />
            <Label text="실물 사진 (필수)" required />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {files.map((f) => (
                <div key={f.url} style={{ position: "relative" }}>
                  <PhotoThumb src={f.url} size={64} />
                  <button
                    onClick={() => setFiles((prev) => prev.filter((x) => x.url !== f.url))}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "none",
                      background: C.ink,
                      color: "#fff",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {files.length < 6 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    border: `1.5px dashed ${photoMissing ? C.red : C.line}`,
                    background: C.surface,
                    color: photoMissing ? C.red : C.gray400,
                    fontSize: 22,
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPick} style={{ display: "none" }} />
            <div style={{ fontSize: 11.5, marginTop: 6, color: photoMissing ? C.red : C.gray400 }}>
              매수자가 컨디션을 사진으로 직접 확인합니다 · 최소 1장 필수
            </div>
          </>
        )}

        {/* 제출 */}
        <button
          disabled={!canSubmit}
          onClick={() =>
            onSubmit({
              priceKrw: priceNum,
              condition: isSell ? condition : "NM",
              wantCondition: isSell ? null : condition || null,
              photos: files.map((f) => f.url),
            })
          }
          style={{
            marginTop: 20,
            width: "100%",
            padding: "14px",
            borderRadius: 12,
            border: "none",
            fontSize: 15,
            fontWeight: 800,
            color: "#fff",
            background: canSubmit ? accent : C.line,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {isSell ? "매도 호가 걸기" : "매수 호가 걸기"}
        </button>
      </div>
    </div>
  );
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.gray700, marginBottom: 7 }}>
      {text}
      {required && <span style={{ color: C.red, marginLeft: 3 }}>*</span>}
    </div>
  );
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer",
        border: `1px solid ${active ? C.ink : C.line}`,
        background: active ? C.ink : C.white,
        color: active ? "#fff" : C.gray700,
      }}
    >
      {label}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: `1px solid ${C.line}`,
  fontSize: 15,
  fontWeight: 700,
  outline: "none",
  boxSizing: "border-box",
};

// ── 라이트박스 ──────────────────────────────────────────────────────────────
function Lightbox({
  state,
  onChange,
  onClose,
}: {
  state: { photos: string[]; idx: number };
  onChange: (s: { photos: string[]; idx: number }) => void;
  onClose: () => void;
}) {
  const { photos, idx } = state;
  const src = photos[idx];
  const real = isRealUrl(src);
  const hue = hashHue(src);
  const move = (d: number) => onChange({ photos, idx: (idx + d + photos.length) % photos.length });
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.86)",
        zIndex: 70,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      {real ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="실물 사진" style={{ maxWidth: "92vw", maxHeight: "76vh", borderRadius: 12, objectFit: "contain" }} onClick={(e) => e.stopPropagation()} />
      ) : (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "min(78vw, 360px)",
            aspectRatio: "5/7",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            color: "rgba(255,255,255,.92)",
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1.5,
            background: `linear-gradient(135deg, hsl(${hue} 64% 64%), hsl(${(hue + 40) % 360} 66% 48%))`,
          }}
        >
          판매자 실물 사진
          <br />
          (목업 placeholder)
          <br />
          <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.85 }}>실제로는 업로드된 카드 사진 표시</span>
        </div>
      )}

      {photos.length > 1 && (
        <div style={{ display: "flex", gap: 14, marginTop: 18 }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => move(-1)} style={lbNav}>
            ‹
          </button>
          <span style={{ color: "#fff", fontSize: 13, alignSelf: "center" }}>
            {idx + 1} / {photos.length}
          </span>
          <button onClick={() => move(1)} style={lbNav}>
            ›
          </button>
        </div>
      )}
      <button onClick={onClose} style={{ position: "absolute", top: 18, right: 18, border: "none", background: "rgba(255,255,255,.15)", color: "#fff", width: 38, height: 38, borderRadius: "50%", fontSize: 20, cursor: "pointer" }}>
        ×
      </button>
    </div>
  );
}

// ── 스타일 헬퍼 ─────────────────────────────────────────────────────────────
const rowBox: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: C.white,
  border: `1px solid ${C.line2}`,
  borderRadius: 12,
  padding: "11px 13px",
  marginBottom: 8,
};

const photoCountChip: React.CSSProperties = {
  position: "absolute",
  bottom: 2,
  right: 2,
  background: "rgba(25,31,40,.8)",
  color: "#fff",
  fontSize: 9.5,
  fontWeight: 700,
  borderRadius: 5,
  padding: "1px 4px",
};

const lbNav: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  border: "none",
  background: "rgba(255,255,255,.16)",
  color: "#fff",
  fontSize: 22,
  cursor: "pointer",
};

function bigBtn(color: string): React.CSSProperties {
  return {
    flex: 1,
    padding: "13px",
    borderRadius: 12,
    border: `1.5px solid ${color}`,
    background: `${color}0f`,
    color,
    fontSize: 14.5,
    fontWeight: 800,
    cursor: "pointer",
  };
}

function takerBtn(color: string): React.CSSProperties {
  return {
    padding: "9px 14px",
    borderRadius: 10,
    border: "none",
    background: color,
    color: "#fff",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  };
}
