"use client";

import { useState, useMemo, useDeferredValue, useEffect, Fragment, type ReactNode } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { RARITY_KO } from "@/lib/constants";
import { GroupCards, GROUPED_GROUP_IDS } from "./GroupCards";
import { getCardPrices, type CardPriceRow } from "@/lib/actions/getCardPrices";
import { getCardDetail, type CardLocaleVariant, type CardInfo } from "@/lib/actions/getCardDetail";
import { cardTier, tierFromGroup, categoryTier, categoryTierFromGroup } from "@/lib/cards/rarity";
import {
  Button,
  Card,
  Chip,
  DataRow,
  EmptyState,
  Modal,
  SearchField,
  SegmentedControl,
  Sheet,
} from "@/components/toss";

export type DexCard = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  rarityTier?: number | null; // Rarity.tier (0~9). raw 정렬 키.
  // 카테고리 레이어 (11개 그룹)
  rarityCategoryCode?: string;
  rarityCategoryNameKo?: string;
  rarityCategoryNameJa?: string;
  rarityCategoryNameEn?: string;
  rarityCategoryTier?: number | null; // 카테고리 tier — 필터/그룹화 기준
  types?: string[];
  supertype?: string;
  region?: string; // 대표 locale 의 region (EN | JP | KR) — 상세 패널 지역판 탭 기본값
  imageSmall: string | null;
  imageLarge: string | null;
  owned: boolean;
  grade?: string;
  certified?: boolean;
};

function CardImage({
  src, alt, className,
}: { src: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={`${className ?? ""} bg-toss-bg-muted flex items-center justify-center`}>
        <span className="text-toss-micro text-toss-text-quaternary">이미지 없음</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />;
}

export type DexRegionSet = {
  region: string;
  name: string;
  releaseDate: string | null;
  cardCount: number;
  code: string | null;
};

export type DexSet = {
  id: string;
  name: string;
  era: string;
  logoUrl?: string;
  cards: DexCard[];
  names: { KR?: string; JA?: string; EN?: string };
  releaseDate: string | null;
  regions: string[];
  regionSets: DexRegionSet[];
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

// ── 시리즈(era) 친화 라벨 — 코드만 있는 모던 그룹에 한글 병기 ──────────────
const ERA_FULL: Record<string, string> = {
  SV: "SV (스칼렛 & 바이올렛)",
  MEGA: "MEGA (메가 진화)",
};
function eraLabel(era: string) {
  return ERA_FULL[era] ?? era;
}

const REGION_LABEL: Record<string, string> = { EN: "영문판", JP: "일본판", KR: "한국판" };

type SortKey = "number" | "name" | "rarity";
const SORT_LABELS: { key: SortKey; label: string }[] = [
  { key: "number", label: "번호순" },
  { key: "name",   label: "이름순" },
  { key: "rarity", label: "희귀도순" },
];

// 카테고리 메타 — 필터 칩 표시용 (tier 오름차순)
type CategoryMeta = {
  code: string;
  nameKo: string;
  nameJa?: string;
  nameEn: string;
  tier: number;
};

/** 카드 locale에 맞는 카테고리 표시명 */
function categoryLabel(card: DexCard, locale: string): string {
  if (locale === "ja" && card.rarityCategoryNameJa) return card.rarityCategoryNameJa;
  return card.rarityCategoryNameKo ?? card.rarityCategoryNameEn ?? card.rarityCategoryCode ?? "";
}

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

type SelectedCard = DexCard & { setName: string; setId: string; setLogoUrl?: string };

// 가격 출처별 표시 메타 — 한글명(name)을 기본, 일본어/원문(native)은 작게 병기
const PRICE_SOURCE_META: Record<string, { flag: string; name?: string; native?: string; sub: string }> = {
  tcgplayer:     { flag: "🇺🇸", name: "TCGplayer",                          sub: "미국 · raw 시세" },
  cardmarket:    { flag: "🇪🇺", name: "카드마켓",      native: "Cardmarket", sub: "유럽 · raw 시세" },
  yuyu_tei_sell: { flag: "🇯🇵", name: "유유테이 (판매가)", native: "遊々亭 · 販売", sub: "일본 · 가게가 파는 값" },
  yuyu_tei_buy:  { flag: "🇯🇵", name: "유유테이 (매입가)", native: "遊々亭 · 買取", sub: "일본 · 가게가 사들이는 값" },
  ebay:          { flag: "🌍", name: "이베이",        native: "eBay",       sub: "글로벌 · 낙찰가" },
  poketrace:     { flag: "🌍", name: "포케트레이스",   native: "PokeTrace",  sub: "글로벌 · 등급가" },
  pricecharting: { flag: "🌍", name: "프라이스차팅",   native: "PriceCharting", sub: "글로벌 · 라이브가" },
  hareruya2:     { flag: "🇯🇵", name: "하레루야2",     native: "晴れる屋2",   sub: "일본 · 등급가" },
  bunjang:       { flag: "🇰🇷", name: "번개장터",                            sub: "국내 · 중고" },
};

function formatPrice(amount: number | null, currency: string): string {
  if (amount == null) return "—";
  switch (currency) {
    case "USD": return `$${amount.toFixed(2)}`;
    case "EUR": return `€${amount.toFixed(2)}`;
    case "JPY": return `¥${Math.round(amount).toLocaleString("ja-JP")}`;
    case "KRW": return `₩${Math.round(amount).toLocaleString("ko-KR")}`;
    default:    return `${amount.toFixed(2)} ${currency}`;
  }
}

// ── 카드 정보 섹션 (상세 패널 하단) ───────────────────────────────────────
const TYPE_KO: Record<string, string> = {
  Grass: "풀", Fire: "불꽃", Water: "물", Lightning: "번개", Psychic: "에스퍼",
  Fighting: "격투", Darkness: "악", Metal: "강철", Dragon: "드래곤",
  Colorless: "무색", Fairy: "페어리",
};
const TYPE_BG: Record<string, string> = {
  Grass: "bg-green-100 text-green-700", Fire: "bg-red-100 text-red-700",
  Water: "bg-blue-100 text-blue-700", Lightning: "bg-yellow-100 text-yellow-700",
  Psychic: "bg-purple-100 text-purple-700", Fighting: "bg-orange-100 text-orange-700",
  Darkness: "bg-gray-800 text-gray-100", Metal: "bg-slate-200 text-slate-700",
  Dragon: "bg-indigo-100 text-indigo-700", Colorless: "bg-gray-100 text-gray-600",
  Fairy: "bg-pink-100 text-pink-700",
};
const SUBTYPE_KO: Record<string, string> = {
  Basic: "기본", "Stage 1": "1진화", "Stage 2": "2진화",
  "Mega Evolution": "메가진화", MEGA: "메가진화",
  ex: "ex", EX: "EX", V: "V", VMAX: "VMAX", VSTAR: "VSTAR",
  Item: "아이템", Supporter: "서포트", Stadium: "스타디움",
  "Pokémon Tool": "포켓몬의 도구", Tool: "포켓몬의 도구",
  Special: "특수 에너지", "Basic Energy": "기본 에너지",
};
const SUPERTYPE_KO: Record<string, string> = {
  "Pokémon": "포켓몬", Trainer: "트레이너", Energy: "에너지",
};

function CostPips({ cost }: { cost?: string[] }) {
  if (!cost || cost.length === 0) return <span className="text-toss-micro text-toss-text-quaternary">—</span>;
  return (
    <span className="inline-flex gap-0.5 items-center">
      {cost.map((c, i) => (
        <span
          key={i}
          title={TYPE_KO[c] ?? c}
          className={`inline-flex w-4 h-4 rounded-full text-[9px] font-bold items-center justify-center ${TYPE_BG[c] ?? "bg-gray-100 text-gray-600"}`}
        >
          {c.charAt(0)}
        </span>
      ))}
    </span>
  );
}

function TypeBadges({ items }: { items: { type: string; value?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {items.map((it, i) => (
        <span key={i} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_BG[it.type] ?? "bg-gray-100 text-gray-600"}`}>
          {TYPE_KO[it.type] ?? it.type}{it.value ? ` ${it.value}` : ""}
        </span>
      ))}
    </div>
  );
}

// 슬라이드 패널 래퍼 — 항상 마운트 상태로 두고 open 만 토글해 열림/닫힘 애니메이션을 살린다.
// 닫히는 동안에도 직전 카드를 보여주려고 부모가 selectedCard 를 유지(open 만 false)한다.
function CardDetailPanel({
  card, open, locale, onClose,
}: { card: SelectedCard | null; open: boolean; locale: string; onClose: () => void }) {
  return (
    <Sheet.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }} side="right" width={480}>
      {/* card.id 로 key → 다른 카드 선택 시 remount(상태 초기화). 같은 카드 재오픈은 유지 */}
      {card && <CardDetailContent key={card.id} card={card} locale={locale} />}
    </Sheet.Root>
  );
}

// ── 핵심 정보 (이미지 우측) ───────────────────────────────────────────────
function KeyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="w-14 shrink-0 pt-0.5 text-toss-micro text-toss-text-tertiary">{label}</span>
      <div className="flex-1 min-w-0 text-toss-caption font-medium text-toss-text-primary">{children}</div>
    </div>
  );
}

function CardKeyInfo({
  card, info, primaryName, subNames,
}: { card: SelectedCard; info: CardInfo | null; primaryName: string; subNames: string[] }) {
  const rarityKo = card.rarityCategoryNameKo ?? card.rarity;
  const showRawRarity =
    card.rarity && card.rarityCategoryNameKo && card.rarity !== card.rarityCategoryNameKo;

  const hasEvolution = !!info && (!!info.evolvesFrom || (info.evolvesTo?.length ?? 0) > 0);
  const hasStats =
    !!info &&
    ((info.nationalPokedexNumbers?.length ?? 0) > 0 || !!info.hp || (info.types?.length ?? 0) > 0 ||
      (info.weaknesses?.length ?? 0) > 0 || (info.resistances?.length ?? 0) > 0 ||
      info.convertedRetreatCost != null || hasEvolution);
  const dexNo = (info?.nationalPokedexNumbers ?? [])
    .map((n) => `No.${String(n).padStart(4, "0")}`)
    .join(", ");
  const hasBadges =
    !!info && (!!info.supertype || (info.subtypes?.length ?? 0) > 0 || !!info.regulationMark);

  return (
    <div className="space-y-3">
      {/* 한글명 (일본명/영어명) + 우측 등급 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-toss-title-2 font-bold text-toss-text-primary leading-tight">{primaryName}</h2>
          {subNames.length > 0 && (
            <p className="mt-0.5 text-toss-micro text-toss-text-quaternary truncate">{subNames.join(" · ")}</p>
          )}
        </div>
        {rarityKo && (
          <div className="shrink-0 flex flex-col items-end gap-0.5">
            <Chip variant="tag" size="sm">{rarityKo}</Chip>
            {showRawRarity && <span className="text-toss-micro text-toss-text-quaternary">{card.rarity}</span>}
          </div>
        )}
      </div>

      {/* 분류 / 레귤레이션 */}
      {hasBadges && (
        <div className="flex flex-wrap items-center gap-1.5">
          {info?.supertype && (
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-toss-bg-muted text-toss-text-secondary">
              {SUPERTYPE_KO[info.supertype] ?? info.supertype}
            </span>
          )}
          {info?.subtypes?.map((st) => (
            <span key={st} className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-700">
              {SUBTYPE_KO[st] ?? st}
            </span>
          ))}
          {info?.regulationMark && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-toss-md border border-toss-divider text-[11px] text-toss-text-secondary">
              레귤레이션
              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-toss-text-primary text-toss-bg-base text-[9px] font-bold">
                {info.regulationMark}
              </span>
            </span>
          )}
        </div>
      )}

      {/* HP / 타입 / 약점 / 저항력 / 후퇴비용 */}
      {info === null ? (
        <p className="border-t border-toss-divider pt-2 text-toss-micro text-toss-text-tertiary">정보 불러오는 중…</p>
      ) : hasStats ? (
        <div className="border-t border-toss-divider pt-1 divide-y divide-toss-divider/60">
          {dexNo && <KeyRow label="도감번호"><span className="toss-numeric">{dexNo}</span></KeyRow>}
          <KeyRow label="HP">{info.hp ?? "—"}</KeyRow>
          <KeyRow label="타입">
            {(info.types?.length ?? 0) > 0 ? <TypeBadges items={info.types!.map((t) => ({ type: t }))} /> : "—"}
          </KeyRow>
          <KeyRow label="약점">
            {(info.weaknesses?.length ?? 0) > 0 ? <TypeBadges items={info.weaknesses!} /> : "—"}
          </KeyRow>
          <KeyRow label="저항력">
            {(info.resistances?.length ?? 0) > 0 ? <TypeBadges items={info.resistances!} /> : "—"}
          </KeyRow>
          <KeyRow label="후퇴비용">
            {info.convertedRetreatCost != null
              ? info.convertedRetreatCost === 0 ? "0 (무료)" : `${info.convertedRetreatCost}개`
              : "—"}
          </KeyRow>
          {hasEvolution && (
            <KeyRow label="진화">
              <div className="flex items-center gap-1 flex-wrap">
                {info.evolvesFrom && (
                  <>
                    <span className="px-1.5 py-0.5 rounded-toss-sm bg-toss-bg-muted text-toss-text-secondary">{info.evolvesFrom}</span>
                    <span className="text-toss-text-quaternary">→</span>
                  </>
                )}
                {info.evolvesTo?.map((to, i) => (
                  <span key={to} className="flex items-center gap-1">
                    {(i > 0 || info.evolvesFrom) && <span className="text-toss-text-quaternary">→</span>}
                    <span className="px-1.5 py-0.5 rounded-toss-sm bg-toss-bg-muted text-toss-text-secondary">{to}</span>
                  </span>
                ))}
              </div>
            </KeyRow>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── 특성 · 기술 · 룰 · 도감설명 (시세 위) ──────────────────────────────────
function CardMoves({ info }: { info: CardInfo | null }) {
  if (!info) return null;
  const hasAny =
    (info.abilities?.length ?? 0) > 0 || (info.attacks?.length ?? 0) > 0 ||
    (info.rules?.length ?? 0) > 0 || !!info.flavorText;
  if (!hasAny) return null;
  return (
    <div className="space-y-2">
      {/* 특성 */}
      {info.abilities?.map((ab, i) => (
        <div key={`ab-${i}`} className="p-2.5 border border-toss-divider rounded-toss-md bg-toss-bg-base">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-toss-brand-weak text-toss-brand">
              {ab.type === "Ability" ? "특성" : ab.type}
            </span>
            <span className="text-toss-caption font-semibold text-toss-text-primary">{ab.name}</span>
          </div>
          {ab.text && <p className="text-[11px] leading-relaxed text-toss-text-secondary">{ab.text}</p>}
        </div>
      ))}
      {/* 기술 */}
      {info.attacks?.map((atk, i) => (
        <div key={`atk-${i}`} className="p-2.5 border border-toss-divider rounded-toss-md bg-toss-bg-base">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <CostPips cost={atk.cost} />
              <span className="text-toss-caption font-semibold text-toss-text-primary truncate">{atk.name}</span>
            </div>
            {atk.damage && <span className="text-toss-label font-bold text-toss-text-primary shrink-0">{atk.damage}</span>}
          </div>
          {atk.text && <p className="text-[11px] leading-relaxed text-toss-text-secondary">{atk.text}</p>}
        </div>
      ))}
      {/* 룰 박스 */}
      {info.rules?.map((rule, i) => (
        <div key={`rule-${i}`} className="p-2.5 rounded-toss-md bg-toss-bg-muted border-l-2 border-toss-text-tertiary">
          <p className="text-[11px] leading-relaxed text-toss-text-secondary">{rule}</p>
        </div>
      ))}
      {/* 도감 설명 */}
      {info.flavorText && (
        <p className="text-[11px] leading-relaxed text-toss-text-tertiary italic border-l-2 border-toss-divider pl-3">
          {info.flavorText}
        </p>
      )}
    </div>
  );
}

function CardDetailContent({
  card, locale,
}: { card: SelectedCard; locale: string }) {
  const [prices, setPrices] = useState<CardPriceRow[] | null>(null);
  // 지역판 탭 + 카드 정보 — 같은 LogicalCard 의 한/영/일 이미지 & 메타
  const [variants, setVariants] = useState<CardLocaleVariant[] | null>(null);
  const [info, setInfo] = useState<CardInfo | null>(null);
  const [activeRegion, setActiveRegion] = useState<string>(card.region ?? "");

  // 패널은 카드별로 key 로 remount 되므로(아래 호출부) 초기 state 가 항상 새 카드 기준.
  // 여기선 비동기 fetch 결과만 채운다.
  useEffect(() => {
    let cancelled = false;
    getCardPrices(card.id).then((rows) => {
      if (!cancelled) setPrices(rows);
    });
    getCardDetail(card.id).then(({ variants, info }) => {
      if (!cancelled) {
        setVariants(variants);
        setInfo(info);
        // 현재 카드가 속한 region 을 기본 선택(없으면 첫 지역판)
        const cur = variants.find((r) => r.id === card.id) ?? variants[0];
        if (cur) setActiveRegion(cur.region);
      }
    });
    return () => { cancelled = true; };
  }, [card.id]);


  // 선택된 지역판의 이미지 — 없으면 현재 카드 이미지로 폴백
  const activeVariant = variants?.find((v) => v.region === activeRegion) ?? null;
  const displayLarge =
    activeVariant?.imageLarge ?? activeVariant?.imageSmall ?? card.imageLarge ?? card.imageSmall;
  const displayName = activeVariant?.name ?? card.name;

  // 지역판별 이름 — 한글명 기본(KR 지역판 우선, 없으면 nameKo 오버레이), 하단에 영어명/일본명
  const krName = variants?.find((v) => v.region === "KR")?.name ?? null;
  const jaName = variants?.find((v) => v.region === "JP")?.name ?? null;
  const enName = variants?.find((v) => v.region === "EN")?.name ?? null;
  const koName = krName ?? info?.nameKo ?? null;
  const primaryName = koName ?? enName ?? jaName ?? card.name;
  const subNames = [enName, jaName].filter((n): n is string => !!n && n !== primaryName);

  return (
    <>
      {/* 헤더 — 카드팩 로고 + 한글명 */}
      <Sheet.Header className="px-5 py-3.5">
        <div className="min-w-0 flex items-center gap-2.5">
          {card.setLogoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={card.setLogoUrl}
              alt=""
              className="h-6 w-auto max-w-[96px] object-contain shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <span className="truncate text-toss-label font-semibold text-toss-text-primary">{card.setName}</span>
        </div>
        <Sheet.Close />
      </Sheet.Header>

      {/* 본문 (세로 스택) */}
      <Sheet.Content className="px-5 py-5 space-y-5">
        {/* 상단 — 카드 이미지(좌) + 핵심 정보(우) */}
        <div className="flex gap-4">
          {/* 좌: 이미지 + 지역판 탭 */}
          <div className="shrink-0 flex flex-col items-center gap-2.5">
            <CardImage
              src={displayLarge}
              alt={displayName}
              className="w-[220px] aspect-[63/88] rounded-toss-lg shadow-toss-lg"
            />
            {/* 지역판 탭 — 2개 이상 있을 때만 노출 */}
            {variants && variants.length > 1 && (
              <SegmentedControl
                options={variants.map((v) => ({
                  value: v.region,
                  label: REGION_LABEL[v.region] ?? v.region,
                }))}
                value={activeRegion}
                onChange={(v) => setActiveRegion(v)}
                variant="filled"
                size="sm"
              />
            )}
          </div>

          {/* 우: 한글명/레어도/HP/타입/약점/저항력/후퇴비용 */}
          <div className="flex-1 min-w-0">
            <CardKeyInfo card={card} info={info} primaryName={primaryName} subNames={subNames} />
          </div>
        </div>

        {/* 특성 · 기술 */}
        <CardMoves info={info} />

        {/* 시세 (목업) */}
        <Card padding="md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-toss-caption font-semibold text-toss-text-tertiary uppercase tracking-wide">최근 시세</h3>
                  <Link href={`/${locale}/cards/${card.id}`} className="text-toss-micro text-toss-text-tertiary hover:text-toss-text-primary transition-colors">
                    상세 시세 차트 →
                  </Link>
                </div>

                {prices === null ? (
                  <p className="text-toss-caption text-toss-text-tertiary py-4 text-center">시세 불러오는 중…</p>
                ) : prices.length === 0 ? (
                  <p className="text-toss-caption text-toss-text-tertiary py-4 text-center">시세 정보 없음</p>
                ) : (
                  <div>
                    {prices.map((r, idx) => {
                      const meta = PRICE_SOURCE_META[r.sourceCode] ?? { flag: "🏷️", sub: r.region };
                      const recDate = new Date(r.recordedAt);
                      const recLabel = `${recDate.getFullYear()}-${String(recDate.getMonth()+1).padStart(2,"0")}-${String(recDate.getDate()).padStart(2,"0")}`;
                      return (
                        <DataRow
                          key={r.sourceCode}
                          divider={idx < prices.length - 1}
                          label={
                            <div className="flex items-center gap-2">
                              <span className="text-base">{meta.flag}</span>
                              <div>
                                <p className="text-toss-caption font-semibold text-toss-text-secondary">
                                  {meta.name ?? r.sourceName}
                                  {meta.native && (
                                    <span className="ml-1 text-toss-micro font-normal text-toss-text-quaternary">{meta.native}</span>
                                  )}
                                </p>
                                <p className="text-toss-micro text-toss-text-quaternary">{meta.sub}</p>
                              </div>
                            </div>
                          }
                          value={
                            <div className="text-right">
                              <p className="text-toss-title-2 font-bold text-toss-text-primary toss-numeric">{formatPrice(r.market, r.currency)}</p>
                              <p className="text-toss-micro text-toss-text-quaternary">{recLabel}</p>
                            </div>
                          }
                        />
                      );
                    })}
                  </div>
                )}
        </Card>
      </Sheet.Content>
    </>
  );
}

// ── 세트 상세 모달 ────────────────────────────────────────────────────────
type ModalView = "all" | "owned" | "missing";


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

  // 카테고리별 그룹 (카테고리 tier 오름차순)
  const grouped = useMemo(() => {
    const map = new Map<string, DexCard[]>();
    for (const card of filtered) {
      const key = card.rarityCategoryCode ?? card.rarity ?? "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(card);
    }
    return [...map.entries()].sort(([, a], [, b]) => {
      const dt = categoryTierFromGroup(a) - categoryTierFromGroup(b);
      return dt !== 0 ? dt : 0;
    });
  }, [filtered]);

  // 카테고리별 현황 (tier 오름차순)
  const rarityStats = useMemo(() => {
    const map = new Map<string, { total: number; owned: number; tier: number; nameKo: string }>();
    for (const c of set.cards) {
      const key = c.rarityCategoryCode ?? c.rarity ?? "Unknown";
      const cur = map.get(key) ?? {
        total: 0,
        owned: 0,
        tier: categoryTier(c),
        nameKo: c.rarityCategoryNameKo ?? c.rarity ?? key,
      };
      map.set(key, { total: cur.total + 1, owned: cur.owned + (c.owned ? 1 : 0), tier: cur.tier, nameKo: cur.nameKo });
    }
    return [...map.entries()].sort(([, a], [, b]) => a.tier - b.tier);
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
          {/* 카테고리별 현황 */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {rarityStats.map(([key, stats]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="text-toss-micro text-toss-text-tertiary">{stats.nameKo}</span>
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
              {grouped.map(([catCode, groupCards]) => {
                const rep = groupCards[0];
                const catNameKo = rep?.rarityCategoryNameKo ?? catCode;
                // raw rarity names — dedupe
                const rawRarities = [...new Set(groupCards.map((c) => c.rarity).filter(Boolean))];
                return (
                <div key={catCode}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <h3 className="text-toss-label font-bold text-toss-text-primary">
                      {catNameKo}
                    </h3>
                    {rawRarities.length > 0 && rawRarities.length <= 3 && (
                      <span className="text-toss-micro text-toss-text-quaternary">
                        ({rawRarities.join(", ")})
                      </span>
                    )}
                    <span className="text-toss-micro text-toss-text-quaternary ml-auto">
                      {groupCards.filter((c) => c.owned).length}/{groupCards.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                    {groupCards
                      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
                      .map((card) => (
                        <button
                          key={card.id}
                          onClick={() => { onCardClick({ ...card, setName: set.name, setId: set.id, setLogoUrl: set.logoUrl ?? `https://images.pokemontcg.io/${set.id}/logo.png` }); }}
                          className="relative group block text-left"
                          title={`#${card.number} ${card.name}`}
                        >
                          <div className={`rounded-toss-md overflow-hidden border transition-all ${
                            card.owned
                              ? "border-toss-border group-hover:ring-2 group-hover:ring-toss-brand/40"
                              : "border-toss-border/50 opacity-30 group-hover:opacity-50"
                          }`}>
                            <CardImage
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
                );
              })}
            </div>
          )}
        </div>
      </Modal.Content>
    </Modal.Root>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export function DexCatalog({ sets, locale }: { sets: DexSet[]; locale: string }) {
  const [view, setView]                     = useState<ViewMode>("all");
  const [selCategories, setSelCategories]   = useState<Set<string>>(new Set());
  const [selTypes, setSelTypes]             = useState<Set<string>>(new Set());
  const [selSupertypes, setSelSupertypes]   = useState<Set<string>>(new Set());
  const [search, setSearch]                 = useState("");
  const [sortBy, setSortBy]                 = useState<SortKey>("number");
  const [cols, setCols]                     = useState(10);
  const [modalSetId, setModalSetId]         = useState<string | null>(null);
  const [selectedCard, setSelectedCard]     = useState<SelectedCard | null>(null);
  // 패널 열림 상태는 카드와 분리 — 닫힐 때 selectedCard 를 유지해 슬라이드 아웃 애니메이션 중 직전 카드를 보여준다.
  const [panelOpen, setPanelOpen]           = useState(false);
  const openCard = (card: SelectedCard) => { setSelectedCard(card); setPanelOpen(true); };
  // 좌측 사이드바에서 선택한 팩 — 이 팩의 카드만 렌더
  const [selectedSetId, setSelectedSetId]   = useState<string>(sets[0]?.id ?? "");

  const modalSet = useMemo(() => sets.find((s) => s.id === modalSetId) ?? null, [sets, modalSetId]);

  // 전체 카테고리 추출 (카테고리 tier 오름차순)
  const allCategories = useMemo(() => {
    const map = new Map<string, CategoryMeta>();
    sets.forEach((set) => set.cards.forEach((c) => {
      if (!c.rarityCategoryCode) return;
      if (!map.has(c.rarityCategoryCode)) {
        map.set(c.rarityCategoryCode, {
          code: c.rarityCategoryCode,
          nameKo: c.rarityCategoryNameKo ?? c.rarityCategoryCode,
          nameJa: c.rarityCategoryNameJa,
          nameEn: c.rarityCategoryNameEn ?? c.rarityCategoryCode,
          tier: c.rarityCategoryTier ?? 999,
        });
      }
    }));
    return [...map.values()].sort((a, b) => a.tier - b.tier);
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

  function toggleCategory(code: string) {
    setSelCategories((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
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

  const hasFilter = selCategories.size > 0 || selTypes.size > 0 || selSupertypes.size > 0 || search.trim() !== "";

  // 검색어는 지연값으로 — 입력은 즉시 반영하되 무거운 필터 렌더는 낮은 우선순위로 미룸
  const deferredSearch = useDeferredValue(search);
  const isFiltering = deferredSearch !== search;

  // 선택된 팩의 카드만 필터·정렬해서 렌더 (한 번에 한 팩만 그려 렌더 부담 최소화)
  const activeSet = useMemo(() => {
    const set = sets.find((s) => s.id === selectedSetId) ?? sets[0] ?? null;
    if (!set) return null;
    const q = deferredSearch.trim().toLowerCase();
    const cards = set.cards
      .filter((c) => {
        // 카테고리 필터 (카테고리 code 기준)
        const catOk       = selCategories.size === 0 || (c.rarityCategoryCode != null && selCategories.has(c.rarityCategoryCode));
        const typeOk      = selTypes.size === 0 || c.types?.some((t) => selTypes.has(t));
        const supertypeOk = selSupertypes.size === 0 || (c.supertype && selSupertypes.has(c.supertype));
        const searchOk    = !q || c.name.toLowerCase().includes(q);
        return catOk && typeOk && supertypeOk && searchOk;
      })
      .sort((a, b) => {
        if (sortBy === "name")   return a.name.localeCompare(b.name);
        if (sortBy === "rarity") return categoryTier(b) - categoryTier(a); // 높은 tier 우선
        return a.number.localeCompare(b.number, undefined, { numeric: true });
      });
    return { ...set, cards };
  }, [sets, selectedSetId, selCategories, selTypes, selSupertypes, deferredSearch, sortBy]);

  const totalCards = sets.reduce((n, s) => n + s.cards.length, 0);
  const ownedCards = sets.reduce((n, s) => n + s.cards.filter((c) => c.owned).length, 0);
  const visibleCount = activeSet?.cards.length ?? 0;

  return (
    <div>
      {/* ── 헤더 ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-4">
        <div className="shrink-0">
          <h1 className="text-toss-title-1 font-bold text-toss-text-primary">카드 도감</h1>
          <p className="text-toss-caption text-toss-text-tertiary mt-0.5">
            {view === "mine"
              ? `${totalCards.toLocaleString()}장 중 ${ownedCards.toLocaleString()}장 보유 (${totalCards === 0 ? 0 : Math.round((ownedCards / totalCards) * 100)}%)`
              : hasFilter
              ? `${activeSet?.name ?? ""} · ${visibleCount.toLocaleString()}장 표시 중`
              : `${activeSet?.name ?? ""} · ${visibleCount.toLocaleString()}장`}
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

      {/* ── 모바일 카드팩 바 (lg 미만) ──────────────────────────────────── */}
      <div className="lg:hidden -mx-1 mb-4 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
        {sets.map((s, i) => (
          <Fragment key={s.id}>
            {(i === 0 || sets[i - 1].era !== s.era) && (
              <span className="shrink-0 pl-1 text-toss-tiny font-bold tracking-wider text-toss-text-quaternary">
                {eraLabel(s.era)}
              </span>
            )}
            <Chip
              variant="filter"
              size="sm"
              selected={(activeSet?.id ?? "") === s.id}
              onClick={() => setSelectedSetId(s.id)}
              className="shrink-0"
            >
              {s.name}
            </Chip>
          </Fragment>
        ))}
      </div>

      <div className="flex gap-6">
        {/* ── 좌측 카드팩 네비 (lg 이상) ──────────────────────────────────── */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-[68px] max-h-[calc(100vh-88px)] overflow-y-auto no-scrollbar pr-1">
            <p className="px-2 mb-2 text-toss-micro font-semibold text-toss-text-tertiary uppercase tracking-wide">카드팩</p>
            <nav className="space-y-0.5">
              {sets.map((s, i) => {
                const showEra = i === 0 || sets[i - 1].era !== s.era;
                const active = (activeSet?.id ?? "") === s.id;
                const ownedCount = s.cards.filter((c) => c.owned).length;
                const pct = s.cards.length === 0 ? 0 : Math.round((ownedCount / s.cards.length) * 100);
                const logoUrl = s.logoUrl ?? `https://images.pokemontcg.io/${s.id}/logo.png`;
                return (
                  <Fragment key={s.id}>
                    {showEra && (
                      <p className="px-2 pb-1 pt-3 text-toss-tiny font-bold tracking-wider text-toss-text-quaternary first:pt-0">
                        {eraLabel(s.era)}
                      </p>
                    )}
                    <button
                      onClick={() => setSelectedSetId(s.id)}
                      title={s.name}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-toss-md text-left transition-colors cursor-pointer ${
                        active
                          ? "bg-toss-brand/10 text-toss-brand"
                          : "text-toss-text-secondary hover:bg-toss-hover"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoUrl} alt="" className="h-4 w-8 object-contain shrink-0" loading="lazy" decoding="async" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
                      <span className="flex-1 min-w-0 truncate text-toss-caption font-medium">{s.name}</span>
                      {view === "mine" ? (
                        <span className="shrink-0 text-toss-tiny font-bold">{pct}%</span>
                      ) : (
                        <span className="shrink-0 text-toss-tiny text-toss-text-quaternary toss-numeric">{s.cards.length}</span>
                      )}
                    </button>
                  </Fragment>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ── 우측 본문 ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
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

          {/* 슈퍼타입 */}
          <div className="flex items-start gap-2">
            <span className="text-toss-micro font-semibold text-toss-text-tertiary shrink-0 w-12 pt-1">종류</span>
            <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
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

          {/* 희귀도 카테고리 */}
          <div className="flex items-start gap-2">
            <span className="text-toss-micro font-semibold text-toss-text-tertiary shrink-0 w-12 pt-1">희귀도</span>
            <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
              {allCategories.map((cat) => {
                const on = selCategories.has(cat.code);
                return (
                  <Chip
                    key={cat.code}
                    variant="filter"
                    size="sm"
                    selected={on}
                    onClick={() => toggleCategory(cat.code)}
                  >
                    {locale === "ja" && cat.nameJa ? cat.nameJa : cat.nameKo}
                  </Chip>
                );
              })}
            </div>
          </div>

          {/* 타입 */}
          <div className="flex items-start gap-2">
            <span className="text-toss-micro font-semibold text-toss-text-tertiary shrink-0 w-12 pt-1">타입</span>
            <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
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
                onClick={() => { setSelCategories(new Set()); setSelTypes(new Set()); setSelSupertypes(new Set()); setSearch(""); setSortBy("number"); }}
              >
                전체 초기화
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* ── 카드 섹션 ────────────────────────────────────────────────────── */}
      <div className={`space-y-10 transition-opacity ${isFiltering ? "opacity-50" : "opacity-100"}`}>
        {activeSet && activeSet.cards.length > 0 && (() => {
          const set = activeSet;
          const totalInSet = sets.find((s) => s.id === set.id)?.cards.length ?? set.cards.length;
          const ownedCount = sets.find((s) => s.id === set.id)?.cards.filter((c) => c.owned).length ?? 0;
          const pct = totalInSet === 0 ? 0 : Math.round((ownedCount / totalInSet) * 100);

          return (
            <section key={set.id} className="scroll-mt-16">
              {/* ── 팩 정보 헤더 (확장팩 메타 통합) ───────────────────────── */}
              <div className="mb-5 rounded-toss-lg border border-toss-divider bg-toss-bg-base p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* 로고 + 이름 + 메타 */}
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-16 w-28 shrink-0 items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={set.logoUrl ?? `https://images.pokemontcg.io/${set.id}/logo.png`}
                        alt={set.name}
                        loading="lazy"
                        decoding="async"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                    <div className="min-w-0">
                      {/* 다국어명 (없으면 대표 name) */}
                      {set.names.KR || set.names.JA || set.names.EN ? (
                        <div className="space-y-0.5">
                          {set.names.KR && (
                            <p className="truncate text-toss-title-2 font-bold text-toss-text-primary">
                              <span className="mr-1.5 text-toss-micro font-semibold text-toss-text-quaternary">KR</span>
                              {set.names.KR}
                            </p>
                          )}
                          {set.names.JA && (
                            <p className="truncate text-toss-caption text-toss-text-secondary">
                              <span className="mr-1.5 text-toss-micro font-semibold text-toss-text-quaternary">JA</span>
                              {set.names.JA}
                            </p>
                          )}
                          {set.names.EN && (
                            <p className="truncate text-toss-caption text-toss-text-secondary">
                              <span className="mr-1.5 text-toss-micro font-semibold text-toss-text-quaternary">EN</span>
                              {set.names.EN}
                            </p>
                          )}
                        </div>
                      ) : (
                        <h2 className="truncate text-toss-title-2 font-bold text-toss-text-primary">{set.name}</h2>
                      )}

                      {/* 메타 행: 시리즈 · 발매일 · 수록종 · 지역 · (보유) */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <Chip variant="tag" size="sm">{eraLabel(set.era)}</Chip>
                        {set.releaseDate && (
                          <span className="text-toss-caption text-toss-text-tertiary toss-numeric">📅 {set.releaseDate}</span>
                        )}
                        <span className="text-toss-caption text-toss-text-tertiary">
                          {hasFilter ? `${set.cards.length}/${totalInSet}종` : `${totalInSet}종`}
                        </span>
                        <div className="flex items-center gap-1">
                          {set.regions.map((r) => (
                            <span key={r} className="rounded-toss-sm bg-toss-bg-muted px-1.5 py-0.5 text-toss-micro font-semibold text-toss-text-tertiary">{r}</span>
                          ))}
                        </div>
                        {view === "mine" && (
                          <span className="text-toss-caption font-semibold text-toss-warning">{ownedCount}/{totalInSet} 보유</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 우측: 자세히 보기 */}
                  <div className="flex shrink-0 lg:justify-end">
                    <button
                      onClick={() => setModalSetId(set.id)}
                      className="text-toss-caption text-toss-text-tertiary transition-colors hover:text-toss-text-primary"
                    >
                      희귀도·수집 현황 →
                    </button>
                  </div>
                </div>

                {/* 지역별 발매 상세 (접이식) */}
                {set.regionSets.length > 0 && (
                  <details className="mt-4 border-t border-toss-divider pt-3">
                    <summary className="cursor-pointer list-none text-toss-caption font-semibold text-toss-text-secondary transition-colors hover:text-toss-text-primary [&::-webkit-details-marker]:hidden">
                      지역별 발매 정보 <span className="text-toss-text-quaternary">({set.regionSets.length})</span>
                    </summary>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {set.regionSets.map((rs) => (
                        <div key={`${rs.region}-${rs.code ?? rs.name}`} className="rounded-toss-md bg-toss-bg-muted p-3">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="rounded-toss-sm bg-toss-bg-base px-1.5 py-0.5 text-toss-micro font-semibold text-toss-text-tertiary">{rs.region}</span>
                            <span className="text-toss-caption text-toss-text-tertiary">{REGION_LABEL[rs.region] ?? rs.region}</span>
                          </div>
                          <p className="text-toss-label font-semibold text-toss-text-primary">{rs.name}</p>
                          <p className="mt-0.5 text-toss-caption text-toss-text-quaternary toss-numeric">
                            {rs.releaseDate ?? "—"}
                            {rs.cardCount > 0 ? ` · ${rs.cardCount}종` : ""}
                            {rs.code ? ` · ${rs.code}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>

              {view === "mine" && <ProgressBar value={pct} />}

              {GROUPED_GROUP_IDS.has(set.id) ? (
                <div className="mt-3"><GroupCards groupId={set.id} /></div>
              ) : (
              <div
                className={`grid gap-1.5 ${view === "mine" ? "mt-1" : "mt-3"}`}
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {set.cards.map((card) => {
                  const dimmed = view === "mine" && !card.owned;
                  return (
                    <button
                      key={card.id}
                      onClick={() => openCard({ ...card, setName: set.name, setId: set.id, setLogoUrl: set.logoUrl ?? `https://images.pokemontcg.io/${set.id}/logo.png` })}
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
                        <CardImage
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
              )}
            </section>
          );
        })()}

        {(!activeSet || activeSet.cards.length === 0) && (
          <EmptyState
            icon={<Search />}
            title="해당 조건의 카드가 없어요"
            description="필터를 조정해 보세요"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelCategories(new Set()); setSelTypes(new Set()); }}
              >
                필터 초기화
              </Button>
            }
          />
        )}
      </div>
        </div>
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
          onCardClick={(card) => { setModalSetId(null); openCard(card); }}
        />
      )}

      {/* 카드 상세 슬라이드 패널 (항상 마운트 — open 토글로 슬라이드 인/아웃) */}
      <CardDetailPanel
        card={selectedCard}
        open={panelOpen}
        locale={locale}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  );
}
