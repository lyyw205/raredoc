"use client";

import { Fragment, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { Search, Settings, Calendar } from "lucide-react";
import { Card, Chip, Modal, SegmentedControl, Switch } from "@/components/toss";
import { eraLabel, eraParts } from "@/lib/cards/eras";
import { PACK_TYPE_LABEL, PACK_TYPE_CHIP, SIDEBAR_PRIMARY, type PackType } from "@/lib/cards/set-meta";
import { matchesSearch } from "@/lib/search";
import { RarityComposition, type RarityStatEntry } from "@/components/cards/RarityComposition";
import {
  deleteItemAction,
  setHighlightAction,
  toggleForSaleAction,
  loadCollectionSetCardsAction,
} from "@/lib/actions/collection";
import type { CollectionPackMeta } from "@/lib/services/collection";

type Region = "JP" | "EN" | "KR";
type ViewMode = "all" | "mine";
const REGION_LABEL: Record<string, string> = { EN: "영문판", JP: "일본판", KR: "한국판" };
const REGION_TAB_ORDER: Region[] = ["JP", "KR", "EN"];
const ALL_ID = "__all__";
const ETC_ORDER = 9_000;
const packSortKey = (p: { isEtc: boolean; eraOrder: number }) => (p.isEtc ? ETC_ORDER : p.eraOrder);

// ── 타입 (서버 getCollectionTabData 와 구조 일치) ───────────────────────────────
export type CollectionCard = {
  cardId: string; // RegionCard id
  logicalCardId: string; // 논리 Card id (트윈 판정용)
  name: string;
  number: string;
  imageUrl: string | null;
  owned: boolean;
  // 희귀도 카테고리 — "등급 구성"용
  rarityCategoryCode?: string;
  rarityCategoryTier?: number | null;
  rarityCategoryNameKo?: string;
  itemId?: string;
  grade?: string;
  certified?: boolean;
  forSale?: boolean;
  highlightSlot?: number | null;
  valueKrw?: number;
};

export type CollectionSet = {
  setId: string;
  name: string;
  totalCards: number;
  ownedCount: number;
  estimatedKrw: number;
  cards: CollectionCard[];
  region: Region;
  era: string;
  eraOrder: number;
  isEtc: boolean;
  releaseDate: string | null;
  logoUrl: string | null;
  packType: string | null;
  mergeOf?: number;
  code: string | null;
  nameSub?: string;
  searchText: string;
};

// ── 컬렉션 설정 (localStorage, 기기별) ──────────────────────────────────────────
type CollSettings = { showUnownedPacks: boolean; autoRegisterTwins: boolean };
const SETTINGS_KEY = "raredoc:collectionSettings";
const DEFAULT_SETTINGS: CollSettings = { showUnownedPacks: false, autoRegisterTwins: false };

function useCollectionSettings() {
  const [settings, setSettings] = useState<CollSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);
  const update = useCallback((patch: Partial<CollSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  return [settings, update] as const;
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 bg-toss-bg-muted rounded-full overflow-hidden">
      <div className="h-full rounded-full bg-toss-brand transition-all duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}

export function CollectionTab({
  sets = [],
  packs,
  ownedLogicalCardIds = [],
  profileUserId,
  isOwnProfile = false,
}: {
  sets?: CollectionSet[];
  packs?: Record<Region, CollectionPackMeta[]>;
  ownedLogicalCardIds?: string[];
  profileUserId: string;
  isOwnProfile?: boolean;
}) {
  const params = useParams();
  const locale = (params?.locale as string) ?? "ko";
  const [isPending, startTransition] = useTransition();
  const [settings, updateSettings] = useCollectionSettings();

  const [cols, setCols] = useState(10);
  const [packSearch, setPackSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("mine"); // 카드팩 정보 섹션 전체/수집 토글
  const [lazyCards, setLazyCards] = useState<Record<string, CollectionCard[] | "loading">>({});

  const ownedLogical = useMemo(() => new Set(ownedLogicalCardIds), [ownedLogicalCardIds]);
  const eagerSets = useMemo(() => new Map(sets.map((s) => [s.setId, s])), [sets]);

  // 트윈 포함 보유 표시 여부
  const isOwnedDisplay = useCallback(
    (c: CollectionCard) => c.owned || (settings.autoRegisterTwins && ownedLogical.has(c.logicalCardId)),
    [settings.autoRegisterTwins, ownedLogical],
  );

  // 지역별 팩(메타) — 도감 동일축 정렬(시대 asc → 발매일 desc → 이름)
  const packsByRegion = useMemo(() => {
    const src: Record<Region, CollectionPackMeta[]> = packs ?? { JP: [], EN: [], KR: [] };
    const out: Record<Region, CollectionPackMeta[]> = { JP: [], EN: [], KR: [] };
    for (const r of REGION_TAB_ORDER) {
      out[r] = [...(src[r] ?? [])].sort((a, b) => {
        const d = packSortKey(a) - packSortKey(b);
        if (d !== 0) return d;
        if (a.releaseDate !== b.releaseDate) {
          if (!a.releaseDate) return 1;
          if (!b.releaseDate) return -1;
          return b.releaseDate.localeCompare(a.releaseDate);
        }
        return a.name.localeCompare(b.name);
      });
    }
    return out;
  }, [packs]);

  // 팩 보유수(트윈 토글 반영, totalCards 로 클램프)
  const packOwned = useCallback(
    (p: CollectionPackMeta) =>
      settings.autoRegisterTwins ? Math.min(p.twinOwnedCount, p.totalCards) : p.directOwnedCount,
    [settings.autoRegisterTwins],
  );

  // 지역 탭 — 0수집팩 노출이면 전 지역, 아니면 보유 팩 있는 지역만
  const availableRegions = useMemo(
    () => REGION_TAB_ORDER.filter((r) =>
      settings.showUnownedPacks
        ? (packsByRegion[r]?.length ?? 0) > 0
        : (packsByRegion[r] ?? []).some((p) => packOwned(p) > 0),
    ),
    [packsByRegion, settings.showUnownedPacks, packOwned],
  );

  const [activeRegion, setActiveRegion] = useState<Region>(sets[0]?.region ?? "JP");
  const [selectedId, setSelectedId] = useState<string>(ALL_ID);

  // 설정 토글(미수집 팩/트윈) 등으로 활성 지역이 노출 목록에서 빠지면 첫 유효 지역으로 복귀(orphan 방지)
  useEffect(() => {
    if (availableRegions.length > 0 && !availableRegions.includes(activeRegion)) {
      setActiveRegion(availableRegions[0]);
      setSelectedId(ALL_ID);
    }
  }, [availableRegions, activeRegion]);

  // 사이드바/팩바에 보일 팩 목록(0수집팩 토글 + 검색)
  const deferredSearch = useDeferredValue(packSearch);
  const navPacks = useMemo(() => {
    let list = packsByRegion[activeRegion] ?? [];
    if (!settings.showUnownedPacks) list = list.filter((p) => packOwned(p) > 0);
    if (deferredSearch.trim()) list = list.filter((p) => matchesSearch(p.searchText ?? p.name, deferredSearch));
    return list;
  }, [packsByRegion, activeRegion, settings.showUnownedPacks, deferredSearch, packOwned]);

  function changeRegion(r: string) {
    const reg = r as Region;
    setActiveRegion(reg);
    setPackSearch("");
    setSelectedId(ALL_ID);
  }

  // 미보유(eager 아님) 팩 선택 시 카드 지연 로드 — 요청 set 추적은 ref(재요청 방지, 의존성 안정).
  const requestedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (selectedId === ALL_ID || eagerSets.has(selectedId) || requestedRef.current.has(selectedId)) return;
    requestedRef.current.add(selectedId);
    let cancelled = false;
    setLazyCards((prev) => ({ ...prev, [selectedId]: "loading" }));
    loadCollectionSetCardsAction(profileUserId, selectedId)
      .then((cards) => { if (!cancelled) setLazyCards((prev) => ({ ...prev, [selectedId]: cards })); })
      .catch(() => {
        // 즉시는 빈 상태로(스피너 고착 방지), 요청 기록은 해제해 재선택 시 다시 시도하도록 함(일시적 실패 비영구화)
        requestedRef.current.delete(selectedId);
        if (!cancelled) setLazyCards((prev) => ({ ...prev, [selectedId]: [] }));
      });
    return () => { cancelled = true; };
  }, [selectedId, eagerSets, profileUserId]);

  function runAction(fn: () => Promise<unknown>) {
    startTransition(() => { void fn(); });
  }

  // ── 우측 본문 데이터 ──
  const isAll = selectedId === ALL_ID;
  const packMeta = useMemo(
    () => (isAll ? null : (packsByRegion[activeRegion] ?? []).find((p) => p.setId === selectedId)
      ?? REGION_TAB_ORDER.flatMap((r) => packsByRegion[r] ?? []).find((p) => p.setId === selectedId) ?? null),
    [isAll, packsByRegion, activeRegion, selectedId],
  );

  // 전체(보유만, 활성 지역) — eager 보유 세트의 보유 카드 집계
  const allOwnedCards = useMemo(() => {
    if (!isAll) return [];
    return sets
      .filter((s) => s.region === activeRegion)
      .flatMap((s) => s.cards.filter((c) => c.owned));
  }, [isAll, sets, activeRegion]);

  // 팩 모드 카드(eager or lazy)
  const eager = !isAll ? eagerSets.get(selectedId) : undefined;
  const lazy = !isAll && !eager ? lazyCards[selectedId] : undefined;
  const panelLoading = !isAll && !eager && (lazy === undefined || lazy === "loading");
  const panelCards = useMemo<CollectionCard[]>(
    () => (isAll ? allOwnedCards : eager ? eager.cards : Array.isArray(lazy) ? lazy : []),
    [isAll, allOwnedCards, eager, lazy],
  );

  // 우측 요약
  const ownedShown = panelCards.filter((c) => isOwnedDisplay(c)).length;
  const panelValue = panelCards.reduce((n, c) => n + (c.owned ? (c.valueKrw ?? 0) : 0), 0);
  const panelName = isAll ? `전체 · ${REGION_LABEL[activeRegion] ?? activeRegion}` : (packMeta?.name ?? eager?.name ?? "");

  // 등급 구성 — 선택 팩 카드의 카테고리별 구성(보유는 isOwnedDisplay 기준, tier 오름차순). 도감과 동일.
  const packRarityStats = useMemo<RarityStatEntry[]>(() => {
    if (isAll) return [];
    const map = new Map<string, { total: number; owned: number; tier: number; nameKo: string }>();
    for (const c of panelCards) {
      const key = c.rarityCategoryCode ?? "unknown";
      const cur = map.get(key) ?? { total: 0, owned: 0, tier: c.rarityCategoryTier ?? 999, nameKo: c.rarityCategoryNameKo ?? key };
      map.set(key, { total: cur.total + 1, owned: cur.owned + (isOwnedDisplay(c) ? 1 : 0), tier: cur.tier, nameKo: cur.nameKo });
    }
    return [...map.entries()].sort(([, a], [, b]) => a.tier - b.tier);
  }, [isAll, panelCards, isOwnedDisplay]);

  const hasAnything = sets.length > 0 || navPacks.length > 0 || settings.showUnownedPacks;
  const logoFallback = (setId: string) => `https://images.pokemontcg.io/${setId}/logo.png`;

  return (
    <div>
      {/* ── 필터 카드섹션 — 지역선택 + 검색 + 컬렉션 설정 ── */}
      <Card padding="sm" className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {hasAnything && availableRegions.length > 1 && (
            <SegmentedControl
              options={availableRegions.map((r) => ({ value: r, label: REGION_LABEL[r] ?? r }))}
              value={activeRegion}
              onChange={changeRegion}
              variant="filled"
              size="sm"
              className="shrink-0"
            />
          )}
          <div className="ml-auto flex items-center gap-2">
            {hasAnything && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-toss-icon pointer-events-none" />
                <input
                  type="text"
                  value={packSearch}
                  onChange={(e) => setPackSearch(e.target.value)}
                  placeholder="팩 이름 검색…"
                  className="h-8 w-40 sm:w-56 rounded-toss-md border border-toss-divider bg-toss-input-bg pl-8 pr-2 text-toss-caption text-toss-text-primary placeholder:text-toss-text-quaternary focus:outline-none focus:ring-2 focus:ring-toss-brand/30"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-toss-md border border-toss-divider bg-toss-input-bg px-3 text-toss-caption font-medium text-toss-text-secondary transition-colors hover:bg-toss-hover cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">컬렉션 설정</span>
            </button>
          </div>
        </div>
      </Card>

      {!hasAnything ? (
        <div className="flex flex-col items-center justify-center py-20 text-toss-text-quaternary">
          <p className="text-toss-body">아직 등록한 카드가 없어요</p>
          {isOwnProfile && (
            <p className="text-toss-caption mt-1">하이라이트 갤러리에서 카드를 등록하거나, 컬렉션 설정에서 ‘미수집 팩도 표시’를 켜보세요</p>
          )}
        </div>
      ) : (
        <>
          {/* 모바일(lg 미만): 가로 스크롤 팩 바 (지역선택은 위 필터 섹션) */}
          <div className="lg:hidden mb-4 -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedId(ALL_ID)}
              className={`shrink-0 rounded-toss-md border px-2.5 py-1.5 transition-colors ${isAll ? "border-toss-brand/40 bg-toss-brand/10 text-toss-brand" : "border-toss-border bg-toss-bg-base text-toss-text-secondary hover:bg-toss-hover"}`}
            >
              <span className="text-toss-caption font-medium whitespace-nowrap">전체</span>
            </button>
            {navPacks.map((p) => {
              const active = selectedId === p.setId;
              const owned = packOwned(p);
              const pct = p.totalCards > 0 ? Math.round((owned / p.totalCards) * 100) : 0;
              return (
                <button
                  key={p.setId}
                  onClick={() => setSelectedId(p.setId)}
                  className={`shrink-0 rounded-toss-md border px-2.5 py-1.5 transition-colors ${active ? "border-toss-brand/40 bg-toss-brand/10 text-toss-brand" : "border-toss-border bg-toss-bg-base text-toss-text-secondary hover:bg-toss-hover"}`}
                >
                  <span className="text-toss-caption font-medium whitespace-nowrap">{p.name}</span>
                  <span className="ml-1.5 text-toss-micro font-bold toss-numeric">{pct}%</span>
                </button>
              );
            })}
          </div>

          {/* ── 2컬럼 레이아웃 ── */}
          <div className="flex gap-4 items-start">

            {/* 왼쪽: 카드팩 리스트(전체 + 시대그룹 + 카드배경/게이지) */}
            <aside className="hidden lg:block w-52 shrink-0">
              <div className="sticky top-[68px] max-h-[calc(100vh-88px)] overflow-y-auto no-scrollbar pr-1">
                <nav className="space-y-1.5">
                  {/* 전체 — 보유 카드 전체(활성 지역) */}
                  <button
                    onClick={() => setSelectedId(ALL_ID)}
                    className={`w-full flex items-center gap-2 rounded-toss-lg border px-2.5 py-2 text-left transition-colors cursor-pointer ${isAll ? "border-toss-brand/40 bg-toss-bg-subtle" : "border-toss-border bg-toss-bg-base hover:border-toss-border-strong"}`}
                  >
                    <span className="flex h-4 w-8 shrink-0 items-center justify-center text-[11px]">🗂️</span>
                    <span className={`flex-1 text-toss-caption font-semibold leading-4 ${isAll ? "text-toss-brand" : "text-toss-text-secondary"}`}>전체</span>
                  </button>

                  {navPacks.length === 0 ? (
                    <p className="px-2 py-4 text-toss-caption text-toss-text-quaternary">표시할 팩이 없어요</p>
                  ) : navPacks.map((p, i) => {
                    const prev = navPacks[i - 1];
                    const showEra = i === 0 || !prev || packSortKey(prev) !== packSortKey(p) || prev.isEtc !== p.isEtc;
                    const active = selectedId === p.setId;
                    const owned = packOwned(p);
                    const pct = p.totalCards > 0 ? Math.round((owned / p.totalCards) * 100) : 0;
                    const logoUrl = p.logoUrl ?? logoFallback(p.setId);
                    return (
                      <Fragment key={p.setId}>
                        {showEra && (
                          <p className="px-2 pb-1 pt-3 text-toss-tiny font-bold tracking-wider text-toss-text-quaternary">
                            {p.isEtc ? "기타" : eraLabel(p.era)}
                          </p>
                        )}
                        <button
                          onClick={() => setSelectedId(p.setId)}
                          title={p.name}
                          className={`w-full rounded-toss-lg border px-2.5 py-2.5 text-left transition-colors cursor-pointer ${active ? "border-toss-brand/40 bg-toss-bg-subtle" : "border-toss-border bg-toss-bg-base hover:border-toss-border-strong"}`}
                        >
                          <div className="flex items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={logoUrl} alt="" className="h-4 w-8 object-contain shrink-0" loading="lazy" decoding="async" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
                            <span className={`flex-1 min-w-0 truncate text-toss-caption font-medium leading-4 ${active ? "text-toss-brand" : "text-toss-text-secondary"}`}>{p.name}</span>
                            {p.packType && !SIDEBAR_PRIMARY.has(p.packType as PackType) ? (
                              <span className="shrink-0 rounded-toss-sm bg-toss-bg-muted px-1 text-toss-tiny font-medium text-toss-text-tertiary">{PACK_TYPE_LABEL[p.packType as PackType]}</span>
                            ) : null}
                            {p.mergeOf && p.mergeOf > 1 ? (
                              <span className="shrink-0 rounded-toss-sm bg-toss-bg-muted px-1 text-toss-tiny font-semibold text-toss-text-quaternary">합본</span>
                            ) : null}
                          </div>
                          <div className="mt-1.5">
                            <ProgressBar value={pct} />
                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-toss-micro text-toss-text-quaternary toss-numeric">{owned}/{p.totalCards}</span>
                              <span className={`text-toss-micro font-bold toss-numeric ${active ? "text-toss-brand" : "text-toss-text-tertiary"}`}>{pct}%</span>
                            </div>
                          </div>
                        </button>
                      </Fragment>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* 오른쪽: 카드팩 정보 섹션(도감 동일) + 카드 그리드 */}
            <div className="flex-1 min-w-0">

              {/* 카드팩 정보 섹션 — 도감 /dex 카드팩 정보 섹션과 동일 구성·디자인.
                  전체/팩 모드가 같은 컨테이너 골격을 공유하고 내부 요소만 isAll 로 토글(도감 isAllMode 와 동일). */}
              {(isAll || packMeta) && (
                <div className="mb-4 rounded-toss-lg border border-toss-divider bg-toss-bg-base p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* 로고 + 이름 + 메타 */}
                    <div className="flex min-w-0 items-center gap-4">
                      {!isAll && packMeta && (
                        <div className="flex h-20 w-36 shrink-0 items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={packMeta.logoUrl ?? logoFallback(packMeta.setId)}
                            alt={packMeta.name}
                            loading="lazy"
                            decoding="async"
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {!isAll && packMeta?.code && (
                            <span className="shrink-0 rounded-toss-sm bg-toss-brand/10 px-1.5 py-0.5 text-toss-micro font-bold text-toss-brand toss-numeric">{packMeta.code}</span>
                          )}
                          <h2 className="text-toss-title-2 font-bold text-toss-text-primary">{isAll ? panelName : packMeta?.name}</h2>
                          {!isAll && packMeta?.nameSub && (
                            <span className="text-toss-caption text-toss-text-tertiary">{packMeta.nameSub}</span>
                          )}
                        </div>

                        {/* 메타 행: (팩) 시리즈·팩타입·합본·발매일 / (전체) N장 보유 + 추정가치(공통, 컬렉션 전용) */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          {!isAll && packMeta && (packMeta.isEtc ? (
                            <Chip variant="tag" size="sm">기타</Chip>
                          ) : (() => {
                            const { code, name } = eraParts(packMeta.era);
                            return (
                              <Chip variant="tag" size="sm">
                                <span className="font-bold">{code}</span>
                                {name && <><span className="mx-0.5 text-toss-text-quaternary">·</span>{name}</>}
                              </Chip>
                            );
                          })())}
                          {!isAll && packMeta?.packType && (
                            <span className={`inline-flex items-center rounded-toss-sm px-2 py-0.5 text-toss-micro font-semibold ${PACK_TYPE_CHIP[packMeta.packType as PackType] ?? "bg-toss-bg-muted text-toss-text-secondary"}`}>
                              {PACK_TYPE_LABEL[packMeta.packType as PackType] ?? packMeta.packType}
                            </span>
                          )}
                          {!isAll && packMeta?.mergeOf && packMeta.mergeOf > 1 ? (
                            <Chip variant="tag" size="sm">합본 ({packMeta.mergeOf})</Chip>
                          ) : null}
                          {!isAll && packMeta?.releaseDate && (
                            <span className="inline-flex items-center gap-1 text-toss-caption text-toss-text-tertiary"><Calendar className="h-3.5 w-3.5 shrink-0" /><span className="toss-numeric">{packMeta.releaseDate}</span></span>
                          )}
                          {isAll && (
                            <span className="text-toss-caption text-toss-text-tertiary"><span className="text-toss-text-primary font-semibold toss-numeric">{ownedShown}</span>장 보유</span>
                          )}
                          <span className="inline-flex items-center gap-1 text-toss-caption">
                            <span className="text-toss-text-tertiary">추정</span>
                            <span className="font-bold text-toss-warning toss-numeric">₩{panelValue.toLocaleString("ko-KR")}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 우측: 전체/수집 토글 (팩 모드만 — 도감과 동일) */}
                    {!isAll && (
                      <SegmentedControl
                        options={[
                          { value: "all",  label: "전체" },
                          { value: "mine", label: "수집" },
                        ]}
                        value={view}
                        onChange={(v) => setView(v as ViewMode)}
                        variant="filled"
                        size="sm"
                        className="shrink-0"
                      />
                    )}
                  </div>

                  {/* 등급 구성 (도감 공용 컴포넌트) — 팩 모드만 */}
                  {!isAll && <RarityComposition stats={packRarityStats} view={view} />}
                </div>
              )}

              {/* 카드 그리드 */}
              <Card padding="md">
                <div className="flex items-center justify-end gap-3 mb-3">
                  <div className="flex items-center gap-3 text-toss-micro text-toss-text-quaternary">
                    <div className="flex items-center gap-1.5">
                      <span className="text-toss-text-tertiary">열</span>
                      <input type="range" min={5} max={15} step={1} value={cols} onChange={(e) => setCols(Number(e.target.value))} className="w-20 cursor-pointer accent-[var(--toss-brand)]" />
                      <span className="font-semibold text-toss-brand w-4 text-right">{cols}</span>
                    </div>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-toss-positive inline-block" />인증</span>
                    {isOwnProfile && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-toss-warning inline-block" />판매중</span>}
                  </div>
                </div>

                {panelLoading ? (
                  <div className="py-20 text-center text-toss-caption text-toss-text-tertiary">카드 불러오는 중…</div>
                ) : panelCards.length === 0 ? (
                  <div className="py-20 text-center text-toss-caption text-toss-text-quaternary">{isAll ? "보유한 카드가 없어요" : "표시할 카드가 없어요"}</div>
                ) : (
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    {panelCards.map((card) => {
                      const ownedDisp = isOwnedDisplay(card);
                      const dim = view === "mine" && !ownedDisp; // 수집 뷰에서만 미보유 흐림(전체 뷰=풀컬러 브라우즈)
                      return (
                        <div key={card.cardId} className="group relative cursor-pointer" title={`${card.name} · No.${card.number}`}>
                          <a href={`/${locale}/cards/${card.cardId}`} className="block">
                            <div
                              className="rounded-toss-sm overflow-hidden"
                              style={{ aspectRatio: "63 / 88", filter: dim ? "grayscale(100%)" : "none", opacity: dim ? 0.35 : 1, transition: "opacity 0.2s, filter 0.2s" }}
                            >
                              {card.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={card.imageUrl} alt={card.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                              ) : null}
                            </div>
                          </a>

                          {card.owned && card.certified && (
                            <div className="absolute top-[3px] right-[3px] w-2.5 h-2.5 rounded-full bg-toss-positive ring-1 ring-toss-bg-base shadow" />
                          )}
                          {card.owned && card.forSale && (
                            <div className="absolute top-[3px] left-[3px] w-2.5 h-2.5 rounded-full bg-toss-warning ring-1 ring-toss-bg-base shadow" />
                          )}
                          {card.owned && card.grade && (
                            <div className="absolute bottom-[14px] left-[2px] text-[7px] font-bold bg-black/75 text-white px-1 py-[1px] rounded leading-tight">{card.grade}</div>
                          )}

                          {isOwnProfile && card.owned && card.itemId && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-toss-sm">
                              <button disabled={isPending} onClick={() => runAction(() => setHighlightAction(card.itemId!, card.highlightSlot != null ? null : 1))} className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded bg-toss-brand/90 hover:bg-toss-brand disabled:opacity-50" title={card.highlightSlot != null ? "하이라이트 해제" : "하이라이트 추가"}>
                                {card.highlightSlot != null ? "★해제" : "★대표"}
                              </button>
                              <button disabled={isPending} onClick={() => runAction(() => toggleForSaleAction(card.itemId!, !card.forSale))} className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded bg-toss-warning/90 hover:bg-toss-warning disabled:opacity-50">
                                {card.forSale ? "판매중지" : "판매"}
                              </button>
                              <button disabled={isPending} onClick={() => { if (confirm(`${card.name} 카드를 삭제할까요?`)) runAction(() => deleteItemAction(card.itemId!)); }} className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded bg-red-600/90 hover:bg-red-600 disabled:opacity-50">
                                삭제
                              </button>
                            </div>
                          )}

                          <p className="text-toss-tiny text-center text-toss-text-quaternary mt-[2px] leading-none truncate">{card.number}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      {/* 컬렉션 설정 모달 */}
      <Modal.Root open={settingsOpen} onOpenChange={(o) => { if (!o) setSettingsOpen(false); }}>
        <Modal.Content maxWidth="max-w-md">
          <Modal.Header>
            <Modal.Title>컬렉션 설정</Modal.Title>
            <Modal.Close />
          </Modal.Header>
          <div className="space-y-4 py-1">
            <label className="flex items-start justify-between gap-4 cursor-pointer">
              <span className="min-w-0">
                <span className="block text-toss-label font-semibold text-toss-text-primary">미수집 팩도 표시</span>
                <span className="block text-toss-caption text-toss-text-tertiary mt-0.5">한 장도 수집하지 않은 카드팩도 사이드바에 보여줍니다.</span>
              </span>
              <Switch checked={settings.showUnownedPacks} onCheckedChange={(v) => updateSettings({ showUnownedPacks: v })} />
            </label>
            <label className="flex items-start justify-between gap-4 cursor-pointer">
              <span className="min-w-0">
                <span className="block text-toss-label font-semibold text-toss-text-primary">같은 카드 다른 지역판도 수집 처리</span>
                <span className="block text-toss-caption text-toss-text-tertiary mt-0.5">한 지역판을 보유하면 같은 카드의 다른 지역판(일/영/한)도 수집한 것으로 표시·집계합니다. (표시용 — 실제 등록은 변경 없음)</span>
              </span>
              <Switch checked={settings.autoRegisterTwins} onCheckedChange={(v) => updateSettings({ autoRegisterTwins: v })} />
            </label>
          </div>
          <Modal.Footer>
            <span className="text-toss-micro text-toss-text-quaternary">이 기기에만 저장됩니다.</span>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
