"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

type ViewTab = "sets" | "recent" | "pending";

interface SetProgress {
  setId: string;
  name: string;
  franchise: string;
  total: number;
  owned: number;
  certified: number;
  valueKrw: number;
  recentlyAdded: number;

}

interface RecentCard {
  id: string;
  name: string;
  setName: string;
  imageUrl: string;
  grade: string;
  certified: boolean;
  valueKrw: number;
  addedAt: string;
}

interface PendingCard {
  id: string;
  name: string;
  setName: string;
  imageUrl: string;
  grade: string;
  addedAt: string;
}

// ── 카드 등록 모달 ────────────────────────────────────────────────────────────

function AddCardModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">카드 등록</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">카드 검색</label>
            <input type="text" placeholder="카드명 또는 번호로 검색..."
              className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">컨디션</label>
            <div className="flex gap-2">
              {["NM", "LP", "MP", "HP", "D"].map((g) => (
                <button key={g} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                  g === "NM" ? "bg-green-600/20 border-green-600 text-green-400" : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500"
                }`}>{g}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">수량</label>
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 text-white hover:bg-gray-700">−</button>
              <span className="text-sm font-bold text-white w-6 text-center">1</span>
              <button className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 text-white hover:bg-gray-700">+</button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">메모 (선택)</label>
            <input type="text" placeholder="예: 일본판, 1에디션..."
              className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors">취소</button>
          <button className="flex-1 py-2.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-sm font-bold text-black transition-colors">등록</button>
        </div>
      </div>
    </div>
  );
}

// ── 세트 카드 ─────────────────────────────────────────────────────────────────

function SetCard({ set, locale }: { set: SetProgress; locale: string }) {
  const pct = Math.round((set.owned / set.total) * 100);
  const logoUrl = `https://images.pokemontcg.io/${set.setId}/logo.png`;

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-600 transition-all overflow-hidden group">
      {/* 세트 로고 히어로 */}
      <div className="relative h-36 flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={set.name}
          className="h-[72px] object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-300 select-none"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = "none";
            const next = el.nextSibling as HTMLElement | null;
            if (next) next.style.display = "block";
          }}
        />
        <span className="hidden text-4xl select-none opacity-30">📦</span>

        {/* 완성도 뱃지 */}
        <div className={`absolute top-3 right-3 text-xs font-black px-2.5 py-0.5 rounded-full border ${
          pct >= 80 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" :
          pct >= 50 ? "bg-blue-500/20 text-blue-400 border-blue-500/40" :
          "bg-gray-700/60 text-gray-400 border-gray-600/60"
        }`}>
          {pct}%
        </div>

        {set.recentlyAdded > 0 && (
          <div className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300 border border-blue-700/50">
            +{set.recentlyAdded} 이번달
          </div>
        )}
      </div>

      {/* 콘텐츠 */}
      <div className="p-4">
        <p className="text-[10px] text-gray-600 uppercase tracking-wide">{set.franchise}</p>
        <p className="text-sm font-bold text-white mt-0.5 mb-3 leading-tight">{set.name}</p>

        {/* 진행 바 */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-400 font-medium">{set.owned}<span className="text-gray-600">/{set.total}장</span></span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pct >= 80 ? "bg-gradient-to-r from-yellow-600 to-yellow-400" :
                pct >= 50 ? "bg-gradient-to-r from-blue-700 to-blue-400" :
                "bg-gray-600"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Stats 3칸 */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="text-center rounded-xl bg-gray-800/60 py-2">
            <p className="text-xs font-bold text-yellow-400">
              {set.valueKrw >= 10000 ? `${Math.round(set.valueKrw / 10000)}만` : `₩${set.valueKrw.toLocaleString()}`}
            </p>
            <p className="text-[10px] text-gray-600 mt-0.5">추정가</p>
          </div>
          <div className="text-center rounded-xl bg-gray-800/60 py-2">
            <p className="text-xs font-bold text-green-400">{set.certified}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">인증</p>
          </div>
          <div className="text-center rounded-xl bg-gray-800/60 py-2">
            <p className="text-xs font-bold text-gray-400">{set.total - set.owned}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">미보유</p>
          </div>
        </div>

        <Link
          href={`/${locale}/collection/${set.setId}`}
          className="block w-full py-2 rounded-xl border border-gray-700 hover:border-gray-500 text-xs text-gray-400 hover:text-white text-center transition-colors"
        >
          도감 보기 →
        </Link>
      </div>
    </div>
  );
}

// ── 최근 추가 카드 행 ─────────────────────────────────────────────────────────

function RecentRow({ card }: { card: RecentCard }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-800 last:border-0">
      <div className="w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{card.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{card.setName}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {card.certified && (
          <span className="text-[10px] font-bold text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded-full">인증</span>
        )}
        <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{card.grade}</span>
        <span className="text-xs font-semibold text-yellow-400">₩{card.valueKrw.toLocaleString("ko-KR")}</span>
      </div>
      <p className="text-xs text-gray-600 w-12 text-right shrink-0">{card.addedAt}</p>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function CollectionDashboard({
  sets,
  recent,
  pending,
  stats,
}: {
  sets: SetProgress[];
  recent: RecentCard[];
  pending: PendingCard[];
  stats: { totalCards: number; totalValue: number; certified: number; sets: number };
}) {
  const [tab, setTab] = useState<ViewTab>("sets");
  const [showModal, setShowModal] = useState(false);
  const locale = useLocale();

  const totalOwned = sets.reduce((s, x) => s + x.owned, 0);
  const totalPossible = sets.reduce((s, x) => s + x.total, 0);
  const overallPct = totalPossible > 0 ? Math.round((totalOwned / totalPossible) * 100) : 0;
  const totalRecentlyAdded = sets.reduce((s, x) => s + x.recentlyAdded, 0);

  const TABS: { key: ViewTab; label: string; count?: number }[] = [
    { key: "sets",    label: "세트별",    count: stats.sets },
    { key: "recent",  label: "최근 추가", count: recent.length },
    { key: "pending", label: "인증 대기", count: pending.length },
  ];

  return (
    <>
      {showModal && <AddCardModal onClose={() => setShowModal(false)} />}

      {/* ── 컬렉션 현황 히어로 ─────────────────────────────────────────── */}
      <div className="mb-7 rounded-2xl bg-gray-900 border border-gray-800 p-5 overflow-hidden relative">
        {/* 배경 장식 */}
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-yellow-500/5 blur-2xl pointer-events-none" />
        <div className="absolute -right-4 bottom-0 w-28 h-28 rounded-full bg-blue-500/5 blur-xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap mb-5">
          {/* 좌: 핵심 수치 */}
          <div>
            <p className="text-[11px] text-gray-500 mb-1 uppercase tracking-wide">총 컬렉션 현황</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-white">{stats.totalCards.toLocaleString()}</span>
              <span className="text-base text-gray-500 mb-1">장</span>
            </div>
            <p className="text-lg font-bold text-yellow-400 mt-0.5">
              ₩{stats.totalValue.toLocaleString("ko-KR")}
              <span className="text-xs text-gray-600 font-normal ml-1.5">추정가</span>
            </p>
          </div>

          {/* 우: 보조 stats */}
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-xl font-black text-blue-400">{stats.sets}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">수집 세트</p>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div className="text-center">
              <p className="text-xl font-black text-green-400">{stats.certified}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">인증 완료</p>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div className="text-center">
              <p className="text-xl font-black text-orange-400">+{totalRecentlyAdded}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">이번달 추가</p>
            </div>
          </div>
        </div>

        {/* 전체 완성도 바 */}
        <div>
          <div className="flex justify-between text-[11px] text-gray-500 mb-1.5">
            <span>전체 수집 완성도</span>
            <span>{totalOwned.toLocaleString()} / {totalPossible.toLocaleString()}장 · <span className="text-gray-300 font-semibold">{overallPct}%</span></span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-300 transition-all"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── 탭 + 등록 버튼 ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1">
          {TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {label}
              {count !== undefined && (
                <span className={`text-xs ${tab === key ? "text-gray-400" : "text-gray-600"}`}>{count}</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-sm font-bold text-black transition-colors"
        >
          + 카드 등록
        </button>
      </div>

      {/* ── 세트별 ──────────────────────────────────────────────────────── */}
      {tab === "sets" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {sets.map((s) => <SetCard key={s.setId} set={s} locale={locale} />)}
        </div>
      )}

      {/* ── 최근 추가 ───────────────────────────────────────────────────── */}
      {tab === "recent" && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 px-4 divide-y divide-gray-800">
          {recent.map((c) => <RecentRow key={c.id} card={c} />)}
        </div>
      )}

      {/* ── 인증 대기 ───────────────────────────────────────────────────── */}
      {tab === "pending" && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 px-5 py-12 text-center">
          {pending.length === 0 ? (
            <div className="text-gray-600">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-sm">인증 대기 중인 카드가 없습니다</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">{pending.length}장 인증 대기 중</p>
          )}
        </div>
      )}
    </>
  );
}
