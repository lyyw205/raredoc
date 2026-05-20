"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { RARITY_KO } from "@/lib/constants";
import {
  Button,
  Card,
  Chip,
  DataRow,
  EmptyState,
  Modal,
  SearchField,
  SegmentedControl,
  TextField,
} from "@/components/toss";

export type DexCard = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  types?: string[];
  supertype?: string;
  imageSmall: string;
  owned: boolean;
  grade?: string;
  certified?: boolean;
};

export type DexSet = {
  id: string;
  name: string;
  logoUrl?: string;
  cards: DexCard[];
};

type ViewMode = "all" | "mine";

// ── 희귀도 메타 ───────────────────────────────────────────────────────────
const RARITY_LABEL: Record<string, string> = {
  "Common": "C",
  "Uncommon": "U",
  "Rare": "R",
  "Rare Holo": "레어홀로",
  "Rare Holo EX": "EX",
  "Double Rare": "2R",
  "Ultra Rare": "UR",
  "Illustration Rare": "IR",
  "Special Illustration Rare": "SAR",
  "Hyper Rare": "HR",
  "ACE SPEC Rare": "ACE",
  "Rare Secret": "시크릿",
  "Promo": "프로모",
  "Trainer Gallery Rare Holo": "TG",
};

// 희귀도 정렬 순서 (낮은 → 높은)
const RARITY_ORDER = [
  "Common", "Uncommon", "Rare", "Rare Holo", "Rare Holo EX",
  "Double Rare", "Trainer Gallery Rare Holo", "Ultra Rare",
  "Illustration Rare", "Special Illustration Rare", "Hyper Rare",
  "ACE SPEC Rare", "Rare Secret", "Promo",
];

// ── 타입 메타 ─────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { emoji: string; label: string; on: string; off: string }> = {
  Fire:      { emoji: "🔥", label: "불꽃",   on: "bg-red-500/25 text-red-300 border-red-500/50",       off: "text-gray-500 border-gray-800" },
  Water:     { emoji: "💧", label: "물",     on: "bg-blue-500/25 text-blue-300 border-blue-500/50",     off: "text-gray-500 border-gray-800" },
  Grass:     { emoji: "🌿", label: "풀",     on: "bg-green-500/25 text-green-300 border-green-500/50",  off: "text-gray-500 border-gray-800" },
  Lightning: { emoji: "⚡", label: "번개",   on: "bg-yellow-500/25 text-yellow-300 border-yellow-500/50", off: "text-gray-500 border-gray-800" },
  Psychic:   { emoji: "🔮", label: "에스퍼", on: "bg-purple-500/25 text-purple-300 border-purple-500/50", off: "text-gray-500 border-gray-800" },
  Fighting:  { emoji: "👊", label: "격투",   on: "bg-orange-500/25 text-orange-300 border-orange-500/50", off: "text-gray-500 border-gray-800" },
  Darkness:  { emoji: "🌑", label: "악",     on: "bg-gray-600/50 text-gray-200 border-gray-500/50",     off: "text-gray-500 border-gray-800" },
  Metal:     { emoji: "⚙️", label: "강철",   on: "bg-slate-500/25 text-slate-200 border-slate-500/50",  off: "text-gray-500 border-gray-800" },
  Dragon:    { emoji: "🐉", label: "드래곤", on: "bg-teal-500/25 text-teal-300 border-teal-500/50",     off: "text-gray-500 border-gray-800" },
  Colorless: { emoji: "⭐", label: "무색",   on: "bg-gray-600/50 text-gray-200 border-gray-600/50",     off: "text-gray-500 border-gray-800" },
};

const TYPE_ORDER = [
  "Fire","Water","Grass","Lightning","Psychic",
  "Fighting","Darkness","Metal","Dragon","Colorless",
];

const SUPERTYPE_META: Record<string, { label: string; emoji: string }> = {
  "Pokémon": { label: "포켓몬", emoji: "🎴" },
  "Trainer": { label: "트레이너", emoji: "🧢" },
  "Energy":  { label: "에너지", emoji: "⚡" },
};

type SortKey = "number" | "name" | "rarity";
const SORT_LABELS: { key: SortKey; label: string }[] = [
  { key: "number", label: "번호순" },
  { key: "name",   label: "이름순" },
  { key: "rarity", label: "희귀도순" },
];

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1 bg-toss-bg-muted rounded-full overflow-hidden mt-2 mb-3">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${value}%`,
          background: "var(--toss-brand)",
        }}
      />
    </div>
  );
}

// ── 카드 상세 모달 ────────────────────────────────────────────────────────

type SelectedCard = DexCard & { setName: string; setId: string };

// 같은 캐릭터의 다른 팩 카드 (목업)
const RELATED_VARIANTS = [
  { set: "포켓몬 151",           number: "025", rarity: "Common",       priceLabel: "₩12,000"  },
  { set: "스타버스 ex",           number: "043", rarity: "Ultra Rare",   priceLabel: "₩85,000"  },
  { set: "이브이 히어로즈",        number: "077", rarity: "Hyper Rare",   priceLabel: "₩320,000" },
  { set: "스칼렛 ex",             number: "215", rarity: "Double Rare",  priceLabel: "₩185,000" },
  { set: "메가 에볼루션 프로모",   number: "198", rarity: "SAR",          priceLabel: "₩240,000" },
  { set: "썬앤문 프로모",          number: "012", rarity: "Hyper Rare",   priceLabel: "₩67,000"  },
  { set: "어둠을 밝힌 달빛",       number: "054", rarity: "Holo Rare",    priceLabel: "₩28,000"  },
];

// 카드 id 기반 결정적 목업 시세 (실데이터 연동 전 임시)
function mockPricesFor(cardId: string) {
  let hash = 0;
  for (let i = 0; i < cardId.length; i++) {
    hash = ((hash << 5) - hash + cardId.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);
  const v = (hash % 60) - 30;
  return {
    tcgplayer: 35 + v * 0.4,
    tcgplayerCount: 12 + (hash % 38),
    ebay: 42 + v * 0.5,
    ebayCount: 30 + (hash % 50),
    bunjang: Math.round((245000 + v * 3000) / 1000) * 1000,
    bunjangCount: 5 + (hash % 20),
  };
}

function CardDetailModal({
  card, locale, onClose,
}: { card: SelectedCard; locale: string; onClose: () => void }) {
  const [alertOpen, setAlertOpen]   = useState(false);
  const [alertPrice, setAlertPrice] = useState("");
  const [alertSaved, setAlertSaved] = useState(false);

  function saveAlert() {
    if (!alertPrice) return;
    setAlertSaved(true);
    setAlertOpen(false);
  }

  const largeImageUrl = card.imageSmall.replace(/\.png$/, "_hires.png");

  return (
    <Modal.Root open={true} onOpenChange={() => onClose()}>
      <Modal.Content maxWidth="max-w-3xl" className="max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* 헤더 */}
        <Modal.Header className="px-5 py-3.5 mb-0 border-b border-toss-divider shrink-0">
          <div className="flex items-center gap-2 text-toss-caption text-toss-text-tertiary">
            <span>{card.setName}</span>
            <span>·</span>
            <span>#{card.number}</span>
            {card.rarity && (
              <>
                <span>·</span>
                <span>{RARITY_KO[card.rarity] ?? RARITY_LABEL[card.rarity] ?? card.rarity}</span>
              </>
            )}
          </div>
          <Modal.Close />
        </Modal.Header>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col sm:flex-row gap-6 p-5">
            {/* 카드 이미지 */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={largeImageUrl}
                alt={card.name}
                className="w-72 rounded-toss-lg shadow-toss-lg"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = card.imageSmall; }}
              />
            </div>

            {/* 우측 */}
            <div className="flex-1 min-w-0 space-y-5">
              {/* 카드 이름 + 타입 */}
              <div>
                <h2 className="text-toss-title-1 font-bold text-toss-text-primary mb-1">{card.name}</h2>
                {card.types && card.types.length > 0 && (
                  <div className="flex gap-1">
                    {card.types.map((t) => (
                      <Chip key={t} variant="tag" size="sm">
                        {TYPE_META[t]?.emoji} {TYPE_META[t]?.label ?? t}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>

              {/* 시세 (목업) */}
              <Card padding="md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-toss-caption font-semibold text-toss-text-tertiary uppercase tracking-wide">최근 시세</h3>
                  <Link href={`/${locale}/cards/${card.id}`} className="text-toss-micro text-toss-text-tertiary hover:text-toss-text-primary transition-colors">
                    상세 시세 차트 →
                  </Link>
                </div>

                {(() => {
                  const p = mockPricesFor(card.id);
                  const rows: { flag: string; name: string; sub: string; price: string; count: number }[] = [
                    { flag: "🇺🇸", name: "TCGplayer", sub: "미국 · NM 기준",        price: `$${p.tcgplayer.toFixed(2)}`,               count: p.tcgplayerCount },
                    { flag: "🌍",  name: "eBay",      sub: "글로벌 · Sold listings", price: `$${p.ebay.toFixed(2)}`,                    count: p.ebayCount      },
                    { flag: "🇰🇷", name: "번개장터",  sub: "국내 · NM 기준",         price: `₩${p.bunjang.toLocaleString("ko-KR")}`,    count: p.bunjangCount   },
                  ];
                  return (
                    <div>
                      {rows.map((r, idx) => (
                        <DataRow
                          key={r.name}
                          divider={idx < rows.length - 1}
                          label={
                            <div className="flex items-center gap-2">
                              <span className="text-base">{r.flag}</span>
                              <div>
                                <p className="text-toss-caption font-semibold text-toss-text-secondary">{r.name}</p>
                                <p className="text-toss-micro text-toss-text-quaternary">{r.sub}</p>
                              </div>
                            </div>
                          }
                          value={
                            <div className="text-right">
                              <p className="text-toss-title-2 font-bold text-toss-text-primary toss-numeric">{r.price}</p>
                              <p className="text-toss-micro text-toss-text-quaternary">{r.count}건</p>
                            </div>
                          }
                        />
                      ))}
                    </div>
                  );
                })()}

                {/* 가격 알림 (번개장터 기준) */}
                <div className="mt-3 pt-3 border-t border-toss-divider">
                  {alertSaved ? (
                    <div className="flex items-center gap-2 text-toss-caption text-toss-success">
                      <span>🔔</span>
                      <span>₩{Number(alertPrice).toLocaleString("ko-KR")} 이하 알림 설정됨</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setAlertSaved(false); setAlertPrice(""); }}
                        className="ml-auto"
                      >
                        취소
                      </Button>
                    </div>
                  ) : alertOpen ? (
                    <div className="flex items-center gap-2">
                      <TextField
                        type="number"
                        placeholder="목표 가격 입력"
                        value={alertPrice}
                        onChange={(e) => setAlertPrice(e.target.value)}
                        size="sm"
                        className="flex-1"
                      />
                      <span className="text-toss-caption text-toss-text-tertiary shrink-0">이하 알림</span>
                      <Button variant="primary" size="sm" onClick={saveAlert}>설정</Button>
                      <Button variant="ghost" size="sm" onClick={() => setAlertOpen(false)}>✕</Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Bell size={14} />}
                      onClick={() => setAlertOpen(true)}
                    >
                      이 가격 이하로 나오면 알림 받기
                    </Button>
                  )}
                </div>
              </Card>

            </div>
          </div>

          {/* 같은 포켓몬 · 다른 카드 (목업) */}
          <div className="px-5 pb-5">
            <h3 className="text-toss-label font-bold text-toss-text-primary mb-3">같은 포켓몬 · 다른 카드</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
              {RELATED_VARIANTS.map((v, i) => (
                <button key={i} className="shrink-0 w-28 group cursor-pointer text-left">
                  <div className="rounded-toss-md overflow-hidden bg-toss-bg-base border border-toss-divider shadow-toss-hairline group-hover:border-toss-border transition-colors">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.imageSmall} alt={card.name} className="w-full block" />
                  </div>
                  <p className="mt-1.5 text-toss-micro font-medium text-toss-text-secondary truncate">{card.name}</p>
                  <p className="text-toss-tiny text-toss-text-tertiary truncate">{v.set} · No.{v.number}</p>
                  <Chip variant="tag" size="sm" className="mt-0.5">{v.rarity}</Chip>
                  <p className="text-toss-micro font-bold text-toss-warning toss-numeric mt-1">{v.priceLabel}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal.Content>
    </Modal.Root>
  );
}

// ── 세트 상세 모달 ────────────────────────────────────────────────────────
type ModalView = "all" | "owned" | "missing";

function rarityRank(rarity?: string) {
  const idx = RARITY_ORDER.indexOf(rarity ?? "");
  return idx === -1 ? 50 : idx;
}

function SetDetailModal({ set, locale, onClose, onCardClick }: { set: DexSet; locale: string; onClose: () => void; onCardClick: (card: SelectedCard) => void }) {
  const [view, setView] = useState<ModalView>("all");

  const owned = set.cards.filter((c) => c.owned).length;
  const total = set.cards.length;
  const pct = total === 0 ? 0 : Math.round((owned / total) * 100);

  const filtered = useMemo(() =>
    set.cards.filter((c) => {
      if (view === "owned" && !c.owned) return false;
      if (view === "missing" && c.owned) return false;
      return true;
    }),
  [set.cards, view]);

  const grouped = useMemo(() => {
    const map = new Map<string, DexCard[]>();
    for (const card of filtered) {
      const key = card.rarity ?? "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(card);
    }
    return [...map.entries()].sort(([a], [b]) => rarityRank(a) - rarityRank(b));
  }, [filtered]);

  const rarityStats = useMemo(() => {
    const map = new Map<string, { total: number; owned: number }>();
    for (const c of set.cards) {
      const key = c.rarity ?? "Unknown";
      const cur = map.get(key) ?? { total: 0, owned: 0 };
      map.set(key, { total: cur.total + 1, owned: cur.owned + (c.owned ? 1 : 0) });
    }
    return [...map.entries()].sort(([a], [b]) => rarityRank(a) - rarityRank(b));
  }, [set.cards]);

  const logoUrl = set.logoUrl ?? `https://images.pokemontcg.io/${set.id}/logo.png`;

  return (
    <Modal.Root open={true} onOpenChange={() => onClose()}>
      <Modal.Content maxWidth="max-w-4xl" className="max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* 헤더 */}
        <Modal.Header className="px-6 py-4 mb-0 border-b border-toss-divider shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="" className="h-8 object-contain shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            <div className="min-w-0">
              <Modal.Title className="truncate">{set.name}</Modal.Title>
              <p className="text-toss-caption text-toss-text-tertiary">전체 {total}장</p>
            </div>
          </div>
          <Modal.Close />
        </Modal.Header>

        {/* 수집 현황 */}
        <div className="px-6 pt-4 pb-3 border-b border-toss-divider shrink-0 bg-toss-bg-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-toss-caption text-toss-text-secondary">내 수집 현황</span>
            <span className="text-toss-caption font-bold text-toss-text-primary">
              {owned} / {total} ({pct}%)
            </span>
          </div>
          <div className="h-2 bg-toss-bg-muted rounded-full overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: "var(--toss-brand)",
              }}
            />
          </div>
          {/* 희귀도별 현황 */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {rarityStats.map(([rarity, stats]) => (
              <div key={rarity} className="flex items-center gap-1.5">
                <span className="text-toss-micro text-toss-text-tertiary">{RARITY_KO[rarity] ?? RARITY_LABEL[rarity] ?? rarity}</span>
                <span className={`text-toss-micro font-semibold ${stats.owned === stats.total ? "text-toss-warning" : "text-toss-text-tertiary"}`}>
                  {stats.owned}/{stats.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 필터 바 */}
        <div className="px-6 py-3 border-b border-toss-divider shrink-0 flex items-center gap-2">
          <SegmentedControl
            options={[
              { value: "all",     label: `전체 ${total}` },
              { value: "owned",   label: `보유 ${owned}` },
              { value: "missing", label: `미보유 ${total - owned}` },
            ]}
            value={view}
            onChange={(v) => setView(v as ModalView)}
            variant="filled"
            size="sm"
          />
        </div>

        {/* 카드 그리드 (스크롤 영역) */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {grouped.length === 0 ? (
            <div className="text-center py-20 text-toss-text-tertiary text-toss-caption">해당 카드가 없어요</div>
          ) : (
            <div className="space-y-7">
              {grouped.map(([rarity, groupCards]) => (
                <div key={rarity}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <h3 className="text-toss-micro font-bold text-toss-text-tertiary uppercase tracking-wide">
                      {RARITY_KO[rarity] ?? RARITY_LABEL[rarity] ?? rarity}
                    </h3>
                    <span className="text-toss-micro text-toss-text-quaternary">
                      {groupCards.filter((c) => c.owned).length}/{groupCards.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                    {groupCards
                      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
                      .map((card) => (
                        <button
                          key={card.id}
                          onClick={() => { onCardClick({ ...card, setName: set.name, setId: set.id }); }}
                          className="relative group block text-left"
                          title={`#${card.number} ${card.name}`}
                        >
                          <div className={`rounded-toss-md overflow-hidden border transition-all ${
                            card.owned
                              ? "border-toss-border group-hover:ring-2 group-hover:ring-toss-brand/40"
                              : "border-toss-border/50 opacity-30 group-hover:opacity-50"
                          }`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={card.imageSmall}
                              alt={card.name}
                              className={`w-full aspect-[2.5/3.5] object-cover ${card.owned ? "" : "grayscale"}`}
                            />
                          </div>
                          {card.owned && card.grade && (
                            <span className="absolute bottom-[14px] left-[2px] text-[7px] font-bold bg-toss-text-primary text-toss-bg-base px-1 py-[1px] rounded leading-tight">
                              {card.grade}
                            </span>
                          )}
                          {card.owned && card.certified && (
                            <span className="absolute top-[2px] right-[2px] w-2 h-2 rounded-full bg-toss-success border border-toss-bg-base" />
                          )}
                          <p className="text-toss-tiny text-center text-toss-text-quaternary mt-[2px] leading-none truncate">
                            #{card.number}
                          </p>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal.Content>
    </Modal.Root>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export function DexCatalog({ sets, locale }: { sets: DexSet[]; locale: string }) {
  const [view, setView]                   = useState<ViewMode>("all");
  const [selSets, setSelSets]             = useState<Set<string>>(new Set());
  const [selRarities, setSelRarities]     = useState<Set<string>>(new Set());
  const [selTypes, setSelTypes]           = useState<Set<string>>(new Set());
  const [selSupertypes, setSelSupertypes] = useState<Set<string>>(new Set());
  const [search, setSearch]               = useState("");
  const [sortBy, setSortBy]               = useState<SortKey>("number");
  const [cols, setCols]                   = useState(10);
  const [modalSetId, setModalSetId]       = useState<string | null>(null);
  const [selectedCard, setSelectedCard]   = useState<SelectedCard | null>(null);

  const modalSet = useMemo(() => sets.find((s) => s.id === modalSetId) ?? null, [sets, modalSetId]);

  // 전체 희귀도·타입 추출 (정렬)
  const allRarities = useMemo(() => {
    const s = new Set<string>();
    sets.forEach((set) => set.cards.forEach((c) => { if (c.rarity) s.add(c.rarity); }));
    return RARITY_ORDER.filter((r) => s.has(r));
  }, [sets]);

  const allTypes = useMemo(() => {
    const s = new Set<string>();
    sets.forEach((set) => set.cards.forEach((c) => c.types?.forEach((t) => s.add(t))));
    return TYPE_ORDER.filter((t) => s.has(t));
  }, [sets]);

  function toggleSupertype(t: string) {
    setSelSupertypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  function toggleSet(id: string) {
    setSelSets((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleRarity(r: string) {
    setSelRarities((prev) => {
      const next = new Set(prev);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  }

  function toggleType(t: string) {
    setSelTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  const hasFilter = selRarities.size > 0 || selTypes.size > 0 || selSupertypes.size > 0 || search.trim() !== "";

  const visibleSets = useMemo(() => {
    const base = selSets.size === 0 ? sets : sets.filter((s) => selSets.has(s.id));
    return base.map((set) => ({
      ...set,
      cards: set.cards
        .filter((c) => {
          const rarityOk    = selRarities.size === 0 || (c.rarity && selRarities.has(c.rarity));
          const typeOk      = selTypes.size === 0 || c.types?.some((t) => selTypes.has(t));
          const supertypeOk = selSupertypes.size === 0 || (c.supertype && selSupertypes.has(c.supertype));
          const searchOk    = !search.trim() || c.name.toLowerCase().includes(search.toLowerCase());
          return rarityOk && typeOk && supertypeOk && searchOk;
        })
        .sort((a, b) => {
          if (sortBy === "name")   return a.name.localeCompare(b.name);
          if (sortBy === "rarity") return RARITY_ORDER.indexOf(b.rarity ?? "") - RARITY_ORDER.indexOf(a.rarity ?? "");
          return a.number.localeCompare(b.number, undefined, { numeric: true });
        }),
    }));
  }, [sets, selSets, selRarities, selTypes, selSupertypes, search, sortBy]);

  const totalCards = sets.reduce((n, s) => n + s.cards.length, 0);
  const ownedCards = sets.reduce((n, s) => n + s.cards.filter((c) => c.owned).length, 0);
  const visibleCount = visibleSets.reduce((n, s) => n + s.cards.length, 0);

  return (
    <div>
      {/* ── 헤더 ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-4">
        <div className="shrink-0">
          <h1 className="text-toss-title-1 font-bold text-toss-text-primary">카드 도감</h1>
          <p className="text-toss-caption text-toss-text-tertiary mt-0.5">
            {view === "mine"
              ? `${totalCards.toLocaleString()}장 중 ${ownedCards.toLocaleString()}장 보유 (${Math.round((ownedCards / totalCards) * 100)}%)`
              : hasFilter
              ? `${visibleCount.toLocaleString()}장 표시 중`
              : `총 ${totalCards.toLocaleString()}장`}
          </p>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* 컬럼 슬라이더 */}
          <div className="flex items-center gap-2 bg-toss-input-bg rounded-toss-md px-3 py-2">
            <span className="text-toss-micro text-toss-text-tertiary shrink-0">열</span>
            <input
              type="range"
              min={5}
              max={15}
              step={1}
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
              className="w-24 h-1 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--toss-brand) 0%, var(--toss-brand) ${((cols - 5) / 10) * 100}%, var(--toss-bg-muted) ${((cols - 5) / 10) * 100}%, var(--toss-bg-muted) 100%)`,
              }}
            />
            <span className="text-toss-micro font-semibold text-toss-brand w-4 text-right shrink-0">{cols}</span>
          </div>

          {/* 모두/내카드 토글 */}
          <SegmentedControl
            options={[
              { value: "all",  label: "모두보기" },
              { value: "mine", label: "내카드보기" },
            ]}
            value={view}
            onChange={(v) => setView(v as ViewMode)}
            variant="filled"
            size="md"
            className="shrink-0"
          />
        </div>
      </div>

      {/* ── 필터 영역 ────────────────────────────────────────────────────── */}
      <Card padding="md" className="mb-6">
        <div className="space-y-3">
          {/* 이름 검색 */}
          <div className="flex items-center gap-2">
            <span className="text-toss-micro font-semibold text-toss-text-tertiary shrink-0 w-12">검색</span>
            <SearchField
              placeholder="카드 이름 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* 카드팩 */}
          <div className="flex items-center gap-2">
            <span className="text-toss-micro font-semibold text-toss-text-tertiary shrink-0 w-12">카드팩</span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <Chip
                variant="filter"
                size="sm"
                selected={selSets.size === 0}
                onClick={() => setSelSets(new Set())}
              >
                전체
              </Chip>
              {sets.map((s) => {
                const ownedCount = s.cards.filter((c) => c.owned).length;
                const pct = Math.round((ownedCount / s.cards.length) * 100);
                const on = selSets.has(s.id);
                const logoUrl = s.logoUrl ?? `https://images.pokemontcg.io/${s.id}/logo.png`;
                return (
                  <Chip
                    key={s.id}
                    variant="filter"
                    size="sm"
                    selected={on}
                    onClick={() => toggleSet(s.id)}
                    leftIcon={
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="" className="h-4 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    }
                  >
                    <span>{s.name}</span>
                    {view === "mine" && (
                      <span className="text-toss-tiny font-bold ml-0.5">{pct}%</span>
                    )}
                  </Chip>
                );
              })}
            </div>
          </div>

          {/* 슈퍼타입 */}
          <div className="flex items-center gap-2">
            <span className="text-toss-micro font-semibold text-toss-text-tertiary shrink-0 w-12">종류</span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {Object.entries(SUPERTYPE_META).map(([key, { label, emoji }]) => {
                const on = selSupertypes.has(key);
                return (
                  <Chip
                    key={key}
                    variant="filter"
                    size="sm"
                    selected={on}
                    onClick={() => toggleSupertype(key)}
                  >
                    <span>{emoji}</span><span>{label}</span>
                  </Chip>
                );
              })}
            </div>
          </div>

          {/* 희귀도 */}
          <div className="flex items-center gap-2">
            <span className="text-toss-micro font-semibold text-toss-text-tertiary shrink-0 w-12">희귀도</span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {allRarities.map((r) => {
                const on = selRarities.has(r);
                return (
                  <Chip
                    key={r}
                    variant="filter"
                    size="sm"
                    selected={on}
                    onClick={() => toggleRarity(r)}
                  >
                    {RARITY_LABEL[r] ?? r}
                  </Chip>
                );
              })}
            </div>
          </div>

          {/* 타입 */}
          <div className="flex items-center gap-2">
            <span className="text-toss-micro font-semibold text-toss-text-tertiary shrink-0 w-12">타입</span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {allTypes.map((t) => {
                const meta = TYPE_META[t];
                const on = selTypes.has(t);
                if (!meta) return null;
                return (
                  <Chip
                    key={t}
                    variant="filter"
                    size="sm"
                    selected={on}
                    onClick={() => toggleType(t)}
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                  </Chip>
                );
              })}
            </div>
          </div>

          {/* 정렬 */}
          <div className="flex items-center gap-2">
            <span className="text-toss-micro font-semibold text-toss-text-tertiary shrink-0 w-12">정렬</span>
            <SegmentedControl
              options={SORT_LABELS.map(({ key, label }) => ({ value: key, label }))}
              value={sortBy}
              onChange={(v) => setSortBy(v as SortKey)}
              size="sm"
              variant="filled"
            />
          </div>

          {/* 필터 초기화 */}
          {(hasFilter || sortBy !== "number") && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelRarities(new Set()); setSelTypes(new Set()); setSelSupertypes(new Set()); setSearch(""); setSortBy("number"); }}
              >
                전체 초기화
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* ── 카드 섹션 ────────────────────────────────────────────────────── */}
      <div className="space-y-10">
        {visibleSets.map((set) => {
          const totalInSet = sets.find((s) => s.id === set.id)?.cards.length ?? set.cards.length;
          const ownedCount = sets.find((s) => s.id === set.id)?.cards.filter((c) => c.owned).length ?? 0;
          const pct = Math.round((ownedCount / totalInSet) * 100);

          if (set.cards.length === 0) return null;

          return (
            <section key={set.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={set.logoUrl ?? `https://images.pokemontcg.io/${set.id}/logo.png`} alt="" className="h-5 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  <h2 className="text-toss-label font-bold text-toss-text-primary">{set.name}</h2>
                  <span className="text-toss-caption text-toss-text-tertiary">
                    {hasFilter ? `${set.cards.length}/${totalInSet}장` : `${totalInSet}장`}
                  </span>
                  {view === "mine" && (
                    <span className="text-toss-caption font-semibold text-toss-warning">{ownedCount}/{totalInSet} 보유</span>
                  )}
                </div>
                <button
                  onClick={() => setModalSetId(set.id)}
                  className="text-toss-caption text-toss-text-tertiary hover:text-toss-text-primary transition-colors"
                >
                  자세히 보기 →
                </button>
              </div>

              {view === "mine" && <ProgressBar value={pct} />}

              <div
                className={`grid gap-1.5 ${view === "mine" ? "mt-1" : "mt-3"}`}
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {set.cards.map((card) => {
                  const dimmed = view === "mine" && !card.owned;
                  return (
                    <button
                      key={card.id}
                      onClick={() => setSelectedCard({ ...card, setName: set.name, setId: set.id })}
                      className="group relative block text-left"
                      title={`${card.name} · No.${card.number}`}
                    >
                      <div
                        className="rounded-toss-md overflow-hidden group-hover:shadow-toss-md transition-shadow"
                        style={{
                          aspectRatio: "63 / 88",
                          filter: dimmed ? "grayscale(100%)" : "none",
                          opacity: dimmed ? 0.3 : 1,
                          transition: "filter 0.3s, opacity 0.3s",
                        }}
                      >
                        <img
                          src={card.imageSmall}
                          alt={card.name}
                          className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-200"
                        />
                      </div>
                      {view === "mine" && card.owned && card.grade && (
                        <div className="absolute bottom-[14px] left-[2px] text-[7px] font-bold bg-toss-text-primary text-toss-bg-base px-1 py-[1px] rounded leading-tight">
                          {card.grade}
                        </div>
                      )}
                      {view === "mine" && card.owned && card.certified && (
                        <div className="absolute top-[2px] right-[2px] w-2.5 h-2.5 rounded-full bg-toss-success ring-1 ring-toss-bg-base shadow" />
                      )}
                      <p className="text-toss-tiny text-center text-toss-text-quaternary mt-[2px] leading-none truncate">
                        {card.number}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        {visibleSets.every((s) => s.cards.length === 0) && (
          <EmptyState
            icon={<Search />}
            title="해당 조건의 카드가 없어요"
            description="필터를 조정해 보세요"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelRarities(new Set()); setSelTypes(new Set()); }}
              >
                필터 초기화
              </Button>
            }
          />
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: var(--toss-brand);
          cursor: pointer;
          box-shadow: 0 0 6px rgba(49,130,246,0.5);
        }
        input[type=range]::-moz-range-thumb {
          width: 14px; height: 14px;
          border-radius: 50%;
          background: var(--toss-brand);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 6px rgba(49,130,246,0.5);
        }
      `}</style>

      {/* 세트 상세 모달 */}
      {modalSet && (
        <SetDetailModal
          set={modalSet}
          locale={locale}
          onClose={() => setModalSetId(null)}
          onCardClick={(card) => { setModalSetId(null); setSelectedCard(card); }}
        />
      )}

      {/* 카드 상세 모달 */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          locale={locale}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
