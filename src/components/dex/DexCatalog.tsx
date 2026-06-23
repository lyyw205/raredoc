"use client";

import { useState, useMemo, useDeferredValue, useEffect, useCallback, useRef, Fragment, type ReactNode } from "react";
import Link from "next/link";
import { Search, ImageOff, SlidersHorizontal, Calendar, ChevronDown } from "lucide-react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { eraLabel, eraParts } from "@/lib/cards/eras";
import { getCardPrices, type CardPriceRow } from "@/lib/actions/getCardPrices";
import { PRICE_SOURCE_META, formatPrice } from "@/lib/cards/price-display";
import { getCardDetail, type RegionCardVariant, type CardInfo } from "@/lib/actions/getCardDetail";
import { loadSetCards } from "@/lib/actions/loadSetCards";
import { loadRegionCardsPage } from "@/lib/actions/loadRegionCardsPage";
import { matchesSearch } from "@/lib/search";
import type { Region, RegionPack, RegionFilterMeta } from "@/lib/cards/dex-region";
import { REGION_ORDER } from "@/lib/cards/card-fields";
import { PACK_TYPE_LABEL, PACK_TYPE_CHIP, SIDEBAR_PRIMARY, type PackType } from "@/lib/cards/set-meta";
import { categoryTier } from "@/lib/cards/rarity";
import { RARITY_CAT_ABBR } from "@/lib/cards/rarity-display";
import { RarityComposition } from "@/components/cards/RarityComposition";
import { TypeIcon, TypeIconRow } from "@/components/pokemon/TypeIcon";
import { CostPips } from "@/components/pokemon/CostPips";
import { SUBTYPE_KO, supertypeKo, FORMAT_LABEL, REGION_LABEL } from "@/lib/cards/card-fields";
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

export type DexCardVariant = {
  id: string;
  region: string;
  name: string;
  number: string;
  imageSmall: string | null;
  rarity?: string;
  rarityCategoryNameKo?: string;
};

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
  variants?: DexCardVariant[]; // 지역 형제(JP/EN/KR) — "3종" 보기(GridCardTile) 전용. 검증 후 제거 예정.
  searchText?: string; // 교차언어 검색 인덱스(대표명+한글오버레이+전 지역 형제명 정규화 결합)
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

// (DexSet/DexRegionSet/specialSuffix 제거됨 — 구 eager dex-catalog 전용 死타입.
//  라이브 /dex 는 Set.cardPackId 앵커 경로(dex-region.ts RegionPack)로 동작. 팩소속 직교화 P9.)

type ViewMode = "all" | "mine";
// 카드 타일 레이아웃 — single=선택 팩 지역 카드 1장만(기본), triple=JP·EN·KR 한 묶음(검증 보기).
// triple(번들)은 그룹 매핑 검증용 임시 보기로, 삭제 예정이나 당분간 토글로 유지.
type CardLayout = "single" | "triple";

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

// 희귀도 카테고리 약칭/색상은 공용 단일출처(rarity-display.ts) 사용. 팩타입 컬러칩은 set-meta.ts.

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

// 시리즈(era) 라벨·정렬은 공용 단일출처 사용 — docs/design/card-packs-jp-en-guide.md 참고
// (eraLabel: canonical era → 한글 병기 라벨)


type SortKey = "number" | "name" | "rarity";
const SORT_LABELS: { key: SortKey; label: string }[] = [
  { key: "number", label: "번호순" },
  { key: "name",   label: "이름순" },
  { key: "rarity", label: "희귀도순" },
];
// 정렬 셀렉박스 — 필터 행 높이(h-8)에 맞춘 native select 스타일(화살표는 ChevronDown 오버레이)
const SORT_SELECT_CLASS =
  "h-8 cursor-pointer appearance-none rounded-toss-md border border-toss-divider " +
  "bg-toss-input-bg pl-3 pr-8 text-toss-caption text-toss-text-primary " +
  "focus:outline-none focus:ring-2 focus:ring-toss-brand/30";

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

// ── 카드 상세 모달 ────────────────────────────────────────────────────────

type SelectedCard = DexCard & { setName: string; setId: string; setLogoUrl?: string };

// 시세 출처 표시 메타(PRICE_SOURCE_META) + 통화 포맷(formatPrice)은 시세 페이지와 공유 → @/lib/cards/price-display

// ── 카드 정보 섹션 (상세 패널 하단) ───────────────────────────────────────
// subtypes(한 배열에 섞임) → 단계 / 트레이너 종류 / 에너지 종류 버킷. 나머지는 전부 특수타입.
const STAGE_SUBTYPES = new Set([
  "Basic", "Stage 1", "Stage 2", "Mega Evolution", "MEGA", "Level-Up", "BREAK", "Restored", "Baby", "V-UNION",
]);
const TRAINER_SUBTYPES = new Set([
  "Item", "Supporter", "Stadium", "Pokémon Tool", "Tool", "Technical Machine",
  "Rocket's Secret Machine", "Goldenrod Game Corner",
]);
const ENERGY_SUBTYPES = new Set(["Special", "Basic Energy", "Special Energy"]);
// 카드 포맷(레귤레이션 사용범위) — legalities 의 "Legal" 포맷만 노출. FORMAT_LABEL 은 card-fields 공용.
const FORMAT_ORDER = ["standard", "expanded", "unlimited"] as const;
// 카드번호 표시 — 순수 숫자는 3자리 0패딩(005), 문자 포함(TG01 등)은 원본 유지
function padCardNumber(n: string): string {
  return /^\d+$/.test(n) ? n.padStart(3, "0") : n;
}

function TypeBadges({ items }: { items: { type: string; value?: string }[] }) {
  return <TypeIconRow items={items} size={18} className="mt-0.5" />;
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
  card, info, primaryName, subNames, number, setTotal,
}: { card: SelectedCard; info: CardInfo | null; primaryName: string; subNames: string[]; number?: string | null; setTotal?: number | null }) {
  // 레어도 칩 — 축약형(C·U·SR·SAR…). 카테고리 코드 → RARITY_CAT_ABBR, 폴백 raw rarity 약칭.
  const rarityAbbr =
    (card.rarityCategoryCode && RARITY_CAT_ABBR[card.rarityCategoryCode]) ||
    (card.rarity && RARITY_LABEL[card.rarity]) ||
    card.rarity ||
    null;
  const rarityFull = card.rarityCategoryNameKo ?? card.rarity ?? undefined;

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
  // subtypes(섞인 배열)를 단계 / 특수타입 / 트레이너 종류 / 에너지 종류로 분리.
  const subtypes = info?.subtypes ?? [];
  const stageSub   = subtypes.filter((s) => STAGE_SUBTYPES.has(s));
  const trainerSub = subtypes.filter((s) => TRAINER_SUBTYPES.has(s));
  const energySub  = subtypes.filter((s) => ENERGY_SUBTYPES.has(s));
  const mechSub    = subtypes.filter((s) => !STAGE_SUBTYPES.has(s) && !TRAINER_SUBTYPES.has(s) && !ENERGY_SUBTYPES.has(s));
  const koList = (arr: string[]) => arr.map((s) => SUBTYPE_KO[s] ?? s).join(" · ");
  // 포맷은 중첩(standard⊂expanded⊂unlimited) — "Legal" 중 가장 제한적인 하나만 노출.
  const legalities = info?.legalities;
  const legalFmt = legalities ? FORMAT_ORDER.find((f) => legalities[f] === "Legal") : undefined;
  const formatText = legalFmt ? FORMAT_LABEL[legalFmt] : "";
  const hasInfoRows = hasBadges || hasStats || !!number || !!formatText;

  return (
    <div className="space-y-3">
      {/* 한글명 (일본명/영어명) + 우측 등급 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-baseline gap-x-1.5 flex-wrap">
          <h2 className="text-toss-title-2 font-bold text-toss-text-primary leading-tight">{primaryName}</h2>
          {subNames.length > 0 && (
            <span className="text-toss-micro text-toss-text-quaternary">{subNames.join(" · ")}</span>
          )}
        </div>
        {rarityAbbr && (
          <div className="shrink-0" title={rarityFull}>
            <Chip variant="tag" size="sm">{rarityAbbr}</Chip>
          </div>
        )}
      </div>

      {/* 분류·단계·특수타입·종류·레귤레이션 / 수록 / 도감번호 / HP·타입·약점·저항·후퇴 / 진화 / 카드 포맷 */}
      {info === null ? (
        <p className="border-t border-toss-divider pt-2 text-toss-micro text-toss-text-tertiary">정보 불러오는 중…</p>
      ) : hasInfoRows ? (
        <div className="border-t border-toss-divider pt-1 divide-y divide-toss-divider/60">
          {info.supertype && <KeyRow label="분류">{supertypeKo(info.supertype)}</KeyRow>}
          {stageSub.length > 0 && <KeyRow label="진화 단계">{koList(stageSub)}</KeyRow>}
          {mechSub.length > 0 && <KeyRow label="특수타입">{koList(mechSub)}</KeyRow>}
          {trainerSub.length > 0 && <KeyRow label="종류">{koList(trainerSub)}</KeyRow>}
          {energySub.length > 0 && <KeyRow label="종류">{koList(energySub)}</KeyRow>}
          {info.regulationMark && (
            <KeyRow label="레귤레이션">
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded bg-toss-text-primary text-toss-bg-base text-[10px] font-bold">
                {info.regulationMark}
              </span>
            </KeyRow>
          )}
          {number && (
            <KeyRow label="수록">
              <span className="toss-numeric">
                {padCardNumber(number)}
                {setTotal && /^\d+$/.test(number) ? `/${String(setTotal).padStart(3, "0")}` : ""}
              </span>
            </KeyRow>
          )}
          {hasStats && (<>
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
            {info.convertedRetreatCost == null
              ? "—"
              : info.convertedRetreatCost === 0
                ? "없음"
                : <CostPips cost={Array(info.convertedRetreatCost).fill("Colorless")} />}
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
          </>)}
          {formatText && <KeyRow label="카드 포맷">{formatText}</KeyRow>}
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
  // 지역판 탭 + 카드 정보 — 같은 Card 의 한/영/일 이미지 & 메타
  const [variants, setVariants] = useState<RegionCardVariant[] | null>(null);
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
  // 활성 지역판 이미지 없으면 EN→JP 순 다른 지역판 일러로 대체 + 미수집 마커
  const activeHasImg = !!(activeVariant?.imageLarge || activeVariant?.imageSmall);
  const borrowDetail = activeHasImg
    ? null
    : (variants?.find((v) => v.region === "EN" && (v.imageLarge || v.imageSmall))
      ?? variants?.find((v) => v.region === "JP" && (v.imageLarge || v.imageSmall))
      ?? variants?.find((v) => v.imageLarge || v.imageSmall));
  const displayLarge =
    activeVariant?.imageLarge ?? activeVariant?.imageSmall
    ?? borrowDetail?.imageLarge ?? borrowDetail?.imageSmall
    ?? card.imageLarge ?? card.imageSmall;
  const detailBorrowedFrom = !activeHasImg && borrowDetail ? borrowDetail.region : null;
  const displayName = activeVariant?.name ?? card.name;

  // 지역판별 이름 — 한글명 기본(KR 지역판 우선, 없으면 nameKo 오버레이), 하단에 영어명/일본명
  const krName = variants?.find((v) => v.region === "KR")?.name ?? null;
  const jaName = variants?.find((v) => v.region === "JP")?.name ?? null;
  const enName = variants?.find((v) => v.region === "EN")?.name ?? null;
  const koName = krName ?? info?.nameKo ?? null;
  const primaryName = koName ?? enName ?? jaName ?? card.name;
  const subNames = [enName, jaName].filter((n): n is string => !!n && n !== primaryName);

  // 카드팩명 — 지역판 탭(activeRegion)에 맞춰: 영문판=영문명/한글명, 그 외(JP/KR)=한글명/일본명.
  const setKo = variants?.find((v) => v.region === "KR")?.setName ?? null;
  const setJa = variants?.find((v) => v.region === "JP")?.setName ?? null;
  const setEn = variants?.find((v) => v.region === "EN")?.setName ?? null;
  const setPrimary = activeRegion === "EN" ? (setEn ?? card.setName) : (setKo ?? card.setName);
  const setSub = activeRegion === "EN" ? setKo : setJa;

  return (
    <>
      {/* 헤더 — 카드팩 로고 + 세트코드 + 카드팩명(지역별 1차/2차명: EN판=영문/한글, 그 외=한글/일본어) */}
      <Sheet.Header className="px-5 py-3.5">
        <div className="min-w-0 flex items-center gap-2.5">
          {card.setLogoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={card.setLogoUrl}
              alt=""
              className="h-9 w-auto max-w-[120px] object-contain shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div className="min-w-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            {activeVariant?.setCode && (
              <>
                <span className="shrink-0 text-toss-label font-semibold text-toss-text-primary toss-numeric">{activeVariant.setCode}</span>
                <span className="shrink-0 text-toss-text-quaternary">·</span>
              </>
            )}
            <span className="text-toss-label font-semibold text-toss-text-primary">{setPrimary}</span>
            {setSub && setSub !== setPrimary && (
              <span className="text-toss-micro text-toss-text-quaternary">{setSub}</span>
            )}
          </div>
        </div>
        <Sheet.Close />
      </Sheet.Header>

      {/* 본문 (세로 스택) */}
      <Sheet.Content className="px-5 py-5 space-y-5">
        {/* 상단 — 카드 이미지(좌) + 핵심 정보(우) */}
        <div className="flex gap-4">
          {/* 좌: 이미지 + 지역판 탭 */}
          <div className="shrink-0 flex flex-col items-center gap-2.5">
            <div className="relative w-[220px]">
              <CardImage
                src={displayLarge}
                alt={displayName}
                className="w-[220px] aspect-[63/88] rounded-toss-lg shadow-toss-lg"
              />
              {detailBorrowedFrom && (
                <div
                  className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full bg-toss-text-primary/70 text-white ring-1 ring-white/60"
                  title={`${REGION_LABEL[activeRegion] ?? activeRegion} 이미지 미수집 — ${REGION_LABEL[detailBorrowedFrom] ?? detailBorrowedFrom}판 일러로 대체 표시`}
                >
                  <ImageOff className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
              )}
            </div>
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
            <CardKeyInfo
              card={card}
              info={info}
              primaryName={primaryName}
              subNames={subNames}
              number={activeVariant?.number ?? card.number}
              setTotal={activeVariant?.setTotal ?? null}
            />
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

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────

// [3종 보기 — 그룹 검증용] JP/EN/KR 3장을 한 묶음에 나란히 펼쳐 표시(없는 언어는 회색 빈 슬롯).
// 기본은 단일 보기(SingleCardTile). 이 번들은 "단일/3종" 토글의 3종일 때만 노출하며, 검증 끝나면 제거 예정.
const REGION_TAG: Record<string, string> = { JP: "일본판", EN: "영문판", KR: "한국판" };
const REGION_HEX: Record<string, string> = { JP: "#e2504a", EN: "#3182f6", KR: "#1f9d55" };

function GridCardTile({ card, dimmed, showOwned, onOpen }: {
  card: DexCard;
  dimmed: boolean;
  showOwned: boolean;
  onOpen: (v: DexCardVariant) => void;
}) {
  const variants = card.variants && card.variants.length > 0
    ? card.variants
    : [{ id: card.id, region: card.region ?? "", name: card.name, number: card.number, imageSmall: card.imageSmall, rarity: card.rarity, rarityCategoryNameKo: card.rarityCategoryNameKo }];
  return (
    <div
      className="rounded-toss-md p-1 bg-toss-bg-muted/30"
      style={{ filter: dimmed ? "grayscale(100%)" : "none", opacity: dimmed ? 0.3 : 1, transition: "filter 0.3s, opacity 0.3s" }}
    >
      <div className="grid grid-cols-3 gap-1">
        {(["JP", "EN", "KR"] as const).map((r) => (
          <RegionSlot
            key={r}
            region={r}
            variant={variants.find((v) => v.region === r) ?? null}
            card={card}
            showOwned={showOwned}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

function RegionSlot({ region, variant, card, showOwned, onOpen }: {
  region: "JP" | "EN" | "KR";
  variant: DexCardVariant | null;
  card: DexCard;
  showOwned: boolean;
  onOpen: (v: DexCardVariant) => void;
}) {
  if (!variant) {
    return (
      <div className="block text-left">
        <div
          className="rounded-toss-md overflow-hidden border border-dashed border-toss-divider bg-toss-bg-muted flex items-center justify-center"
          style={{ aspectRatio: "63 / 88" }}
        >
          <span className="text-toss-tiny font-bold text-toss-text-quaternary">{region} 없음</span>
        </div>
        <p className="mt-1 text-toss-tiny text-center font-bold leading-none text-toss-text-quaternary">{REGION_TAG[region]}</p>
      </div>
    );
  }
  const rarLabel = variant.rarityCategoryNameKo ?? variant.rarity;
  // 발매됐으나 이미지 미수집 → EN→JP 순 다른 지역판 일러로 대체 표시 + 미수집 마커
  const sibs = card.variants ?? [];
  const borrow = variant.imageSmall
    ? null
    : (sibs.find((v) => v.region === "EN" && v.imageSmall)
      ?? sibs.find((v) => v.region === "JP" && v.imageSmall)
      ?? sibs.find((v) => v.imageSmall));
  const displaySrc = variant.imageSmall ?? borrow?.imageSmall ?? null;
  const borrowedFrom = !variant.imageSmall && borrow ? borrow.region : null;
  return (
    <div className="group block text-left">
      <button type="button" onClick={() => onOpen(variant)} className="block w-full" title={`${variant.name} · No.${variant.number}`}>
        <div
          className="relative rounded-toss-md overflow-hidden group-hover:shadow-toss-md transition-shadow"
          style={{ aspectRatio: "63 / 88" }}
        >
          <CardImage src={displaySrc} alt={variant.name} className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-200" />
          {borrowedFrom && (
            <div
              className="absolute top-[3px] right-[3px] flex items-center justify-center w-4 h-4 rounded-full bg-toss-text-primary/65 text-white ring-1 ring-white/60"
              title={`${REGION_TAG[region]} 이미지 미수집 — ${borrowedFrom}판 일러로 대체 표시`}
            >
              <ImageOff className="w-2.5 h-2.5" strokeWidth={2.5} />
            </div>
          )}
          {showOwned && card.owned && card.grade && (
            <div className="absolute bottom-[2px] left-[2px] text-[7px] font-bold bg-toss-text-primary text-toss-bg-base px-1 py-[1px] rounded leading-tight">{card.grade}</div>
          )}
          {showOwned && card.owned && card.certified && (
            <div className="absolute top-[2px] right-[2px] w-2.5 h-2.5 rounded-full bg-toss-success ring-1 ring-toss-bg-base shadow" />
          )}
        </div>
      </button>
      <p className="mt-1 text-toss-tiny text-center font-bold leading-none" style={{ color: REGION_HEX[region] }}>{REGION_TAG[region]}</p>
      <p className="mt-0.5 text-toss-micro text-center text-toss-text-secondary leading-tight truncate" title={variant.name}>{variant.name}</p>
      <p className="text-toss-tiny text-center text-toss-text-quaternary leading-none truncate">
        #{variant.number}{rarLabel ? ` · ${rarLabel}` : ""}
      </p>
    </div>
  );
}

// [단일 보기 — 기본] 선택 팩 지역의 대표 카드 1장만 표시. card 자체가 그 지역 RegionCard 라
// 별도 형제(variants) 없이 card 필드로 그린다. 검증용 3종 보기(GridCardTile)와 짝.
function SingleCardTile({ card, dimmed, showOwned, onOpen }: {
  card: DexCard;
  dimmed: boolean;
  showOwned: boolean;
  onOpen: (v: DexCardVariant) => void;
}) {
  const self: DexCardVariant = {
    id: card.id, region: card.region ?? "", name: card.name, number: card.number,
    imageSmall: card.imageSmall, rarity: card.rarity, rarityCategoryNameKo: card.rarityCategoryNameKo,
  };
  const rarLabel = card.rarityCategoryNameKo ?? card.rarity;
  return (
    <div
      className="group block text-left"
      style={{ filter: dimmed ? "grayscale(100%)" : "none", opacity: dimmed ? 0.3 : 1, transition: "filter 0.3s, opacity 0.3s" }}
    >
      <button type="button" onClick={() => onOpen(self)} className="block w-full" title={`${card.name} · No.${card.number}`}>
        <div
          className="relative rounded-toss-md overflow-hidden group-hover:shadow-toss-md transition-shadow"
          style={{ aspectRatio: "63 / 88" }}
        >
          <CardImage src={card.imageSmall} alt={card.name} className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-200" />
          {showOwned && card.owned && card.grade && (
            <div className="absolute bottom-[2px] left-[2px] text-[7px] font-bold bg-toss-text-primary text-toss-bg-base px-1 py-[1px] rounded leading-tight">{card.grade}</div>
          )}
          {showOwned && card.owned && card.certified && (
            <div className="absolute top-[2px] right-[2px] w-2.5 h-2.5 rounded-full bg-toss-success ring-1 ring-toss-bg-base shadow" />
          )}
        </div>
      </button>
      <p className="mt-1 text-toss-micro text-center text-toss-text-secondary leading-tight truncate" title={card.name}>{card.name}</p>
      <p className="text-toss-tiny text-center text-toss-text-quaternary leading-none truncate">
        #{card.number}{rarLabel ? ` · ${rarLabel}` : ""}
      </p>
    </div>
  );
}

// "전체" 가상 팩 식별자 — 사이드바에 prepend, 선택 시 서버필터+무한스크롤 모드.
const ALL_PACK_ID = "__all__";

// 통합 필터 모달 — 종류·희귀도·타입 그룹을 한 모달에서 다중선택(토글 즉시반영). 닫으면 적용.
type FilterGroupDef = {
  title: string;
  items: { key: string; label: ReactNode }[];
  selected: Set<string>;
  onToggle: (key: string) => void;
};
function FilterModal({ open, onClose, groups, total, onClear }: {
  open: boolean;
  onClose: () => void;
  groups: FilterGroupDef[];
  total: number;
  onClear: () => void;
}) {
  return (
    <Modal.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Content maxWidth="max-w-lg">
        <Modal.Header>
          <Modal.Title>필터</Modal.Title>
          <Modal.Close />
        </Modal.Header>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto py-1">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 text-toss-micro font-semibold uppercase tracking-wide text-toss-text-tertiary">{g.title}</p>
              {g.items.length === 0 ? (
                <p className="py-1 text-toss-caption text-toss-text-quaternary">해당 항목이 없어요</p>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {g.items.map((it) => (
                    <Chip key={it.key} variant="filter" size="sm" selected={g.selected.has(it.key)} onClick={() => g.onToggle(it.key)}>
                      {it.label}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <Modal.Footer>
          <Button variant="ghost" size="sm" onClick={onClear}>초기화</Button>
          <Button variant="primary" size="sm" onClick={onClose}>적용 ({total})</Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}

// "전체" 가상 팩 — 윈도우 가상 스크롤(행 = cols 타일). 하단 근접 시 다음 페이지 로드.
function AllModeGrid({ cards, cols, layout, showOwned, dimUnowned, onOpen, hasMore, loadingMore, onLoadMore }: {
  cards: DexCard[];
  cols: number;
  layout: CardLayout;
  showOwned: boolean;
  dimUnowned: boolean;
  onOpen: (card: DexCard, v: DexCardVariant) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(cards.length / cols);
  // 윈도우 가상화 기준점(그리드의 문서 상단 오프셋) — 렌더 중 ref 접근 금지라 effect 에서 측정.
  const [scrollMargin, setScrollMargin] = useState(0);
  useEffect(() => {
    const measure = () => { if (listRef.current) setScrollMargin(listRef.current.offsetTop); };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => 260,
    overscan: 4,
    scrollMargin,
  });
  const items = virtualizer.getVirtualItems();
  // 하단 근접(마지막 2행 이내) → 다음 페이지
  useEffect(() => {
    const last = items[items.length - 1];
    if (last && last.index >= rowCount - 2 && hasMore && !loadingMore) onLoadMore();
  }, [items, rowCount, hasMore, loadingMore, onLoadMore]);

  return (
    <>
      <div ref={listRef} style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {items.map((vi) => {
          const start = vi.index * cols;
          const rowCards = cards.slice(start, start + cols);
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute", top: 0, left: 0, width: "100%",
                transform: `translateY(${vi.start - scrollMargin}px)`,
                paddingBottom: 6,
              }}
            >
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {rowCards.map((card) => (
                  layout === "triple" ? (
                    <GridCardTile
                      key={card.id}
                      card={card}
                      dimmed={dimUnowned && !card.owned}
                      showOwned={showOwned}
                      onOpen={(v) => onOpen(card, v)}
                    />
                  ) : (
                    <SingleCardTile
                      key={card.id}
                      card={card}
                      dimmed={dimUnowned && !card.owned}
                      showOwned={showOwned}
                      onOpen={(v) => onOpen(card, v)}
                    />
                  )
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {loadingMore && (
        <div className="flex items-center justify-center py-6 text-toss-caption text-toss-text-tertiary">더 불러오는 중…</div>
      )}
    </>
  );
}

// 카드팩 네비(지역탭 + 팩 검색 + 시대별 그룹 목록) — 데스크톱 사이드바와 모바일 바텀시트가 공유.
// onSelectPack 만 컨텍스트별로 다름(데스크톱=선택만, 모바일=선택+시트 닫기).
function PackNav({
  availableRegions, activeRegion, onRegionChange,
  packSearch, onPackSearchChange,
  navPacks, allPack, isAllMode, selectedSetId, onSelectPack, activeNavRef,
}: {
  availableRegions: Region[];
  activeRegion: Region;
  onRegionChange: (r: string) => void;
  packSearch: string;
  onPackSearchChange: (v: string) => void;
  navPacks: RegionPack[];
  allPack: RegionPack;
  isAllMode: boolean;
  selectedSetId: string;
  onSelectPack: (setId: string) => void;
  activeNavRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <>
      {availableRegions.length > 1 && (
        <SegmentedControl
          options={availableRegions.map((r) => ({ value: r, label: REGION_LABEL[r] ?? r }))}
          value={activeRegion}
          onChange={onRegionChange}
          variant="filled"
          size="sm"
          className="w-full mb-2"
        />
      )}
      <div className="mb-2 relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-toss-icon pointer-events-none" />
        <input
          type="text"
          value={packSearch}
          onChange={(e) => onPackSearchChange(e.target.value)}
          placeholder="팩 이름 검색…"
          className="w-full rounded-toss-sm bg-toss-input-bg pl-7 pr-2 py-1.5 text-toss-caption text-toss-text-primary placeholder:text-toss-text-quaternary focus:outline-none focus:ring-1 focus:ring-inset focus:ring-toss-brand"
        />
      </div>
      <nav className="space-y-0.5">
        {/* "전체" — 지역 전체 카드(서버필터+무한스크롤) */}
        <button
          onClick={() => onSelectPack(ALL_PACK_ID)}
          title="전체"
          className={`mb-1 w-full flex items-center gap-2 px-2 py-1.5 rounded-toss-md text-left transition-colors cursor-pointer ${
            isAllMode ? "bg-toss-brand/10 text-toss-brand" : "text-toss-text-secondary hover:bg-toss-hover"
          }`}
        >
          <span className="flex h-4 w-8 shrink-0 items-center justify-center text-[11px]">🗂️</span>
          <span className="flex-1 min-w-0 truncate text-toss-caption font-semibold">전체</span>
          <span className="shrink-0 text-toss-tiny text-toss-text-quaternary toss-numeric">{allPack.cardCount}</span>
        </button>
        {navPacks.map((p, i) => {
          const showEra = i === 0 || navPacks[i - 1].eraOrder !== p.eraOrder || navPacks[i - 1].isEtc !== p.isEtc;
          const active = selectedSetId === p.setId;
          const logoUrl = p.logoUrl ?? `https://images.pokemontcg.io/${p.setId}/logo.png`;
          return (
            <Fragment key={p.setId}>
              {showEra && (
                <p className="px-2 pb-1 pt-3 text-toss-tiny font-bold tracking-wider text-toss-text-quaternary first:pt-0">
                  {p.isEtc ? "기타" : eraLabel(p.era)}
                </p>
              )}
              <button
                ref={active ? activeNavRef : null}
                onClick={() => onSelectPack(p.setId)}
                title={p.name}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-toss-md text-left transition-colors cursor-pointer ${
                  active
                    ? "bg-toss-brand/10 text-toss-brand"
                    : "text-toss-text-secondary hover:bg-toss-hover"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="" className="h-4 w-8 object-contain shrink-0" loading="lazy" decoding="async" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
                <span className="flex-1 min-w-0 truncate text-toss-caption font-medium">{p.name}</span>
                {p.packType && !SIDEBAR_PRIMARY.has(p.packType as PackType) ? (
                  <span className="shrink-0 rounded-toss-sm bg-toss-bg-muted px-1 text-toss-tiny font-medium text-toss-text-tertiary">{PACK_TYPE_LABEL[p.packType as PackType]}</span>
                ) : null}
                {p.mergeOf && p.mergeOf > 1 ? (
                  <span className="shrink-0 rounded-toss-sm bg-toss-bg-muted px-1 text-toss-tiny font-semibold text-toss-text-quaternary">합본</span>
                ) : null}
                <span className="shrink-0 text-toss-tiny text-toss-text-quaternary toss-numeric">{p.cardCount}</span>
              </button>
            </Fragment>
          );
        })}
      </nav>
    </>
  );
}

export function DexCatalog({ regionPacks, locale, initialRegion, initialPack }: {
  regionPacks: Record<Region, RegionPack[]>;
  locale: string;
  initialRegion?: Region; // 딥링크(/dex?region=) 초기 지역탭
  initialPack?: string;   // 딥링크(/dex?pack=) 초기 선택 팩(= Set.id)
}) {
  // 노출 지역 = 팩이 1개 이상 있는 지역(JP/EN/KR 순). 기본은 JP 있으면 JP, 없으면 첫째.
  const availableRegions = useMemo(
    () => REGION_ORDER.filter((r) => (regionPacks[r]?.length ?? 0) > 0),
    [regionPacks],
  );
  // 딥링크 초기 지역: region 우선 → pack 이 속한 지역 추론 → JP/첫째.
  const resolvedInitRegion: Region = (() => {
    if (initialRegion && availableRegions.includes(initialRegion)) return initialRegion;
    if (initialPack) {
      const owner = REGION_ORDER.find((r) => (regionPacks[r] ?? []).some((p) => p.setId === initialPack));
      if (owner && availableRegions.includes(owner)) return owner;
    }
    return availableRegions.includes("JP") ? "JP" : (availableRegions[0] ?? "JP");
  })();
  const [activeRegion, setActiveRegion] = useState<Region>(resolvedInitRegion);

  const [packSearch, setPackSearch] = useState(""); // 사이드바 카드팩 이름 검색
  // 본문/선택(activePack)은 전체 packs 기준 → 검색 타이핑해도 본문 리로드 안 됨(렉 방지 핵심).
  const packs = useMemo(() => regionPacks[activeRegion] ?? [], [regionPacks, activeRegion]);
  // 검색은 '사이드바 목록 표시'만 필터. useDeferredValue 로 타이핑 우선, 목록 재필터는 저우선.
  const deferredPackSearch = useDeferredValue(packSearch);
  const navPacks = useMemo(() => {
    if (!deferredPackSearch.trim()) return packs;
    // 교차언어 팩명 검색 — 다국어 팩명/코드 인덱스(searchText) 매칭, 없으면 표시명 폴백
    return packs.filter((p) => matchesSearch(p.searchText ?? p.name, deferredPackSearch));
  }, [packs, deferredPackSearch]);

  const [view, setView]                     = useState<ViewMode>("all");
  // 카드 타일 레이아웃 — 기본 단일(선택 팩 지역만), 3종은 JP·EN·KR 묶음(검증 보기).
  const [cardLayout, setCardLayout]         = useState<CardLayout>("single");
  const [selCategories, setSelCategories]   = useState<Set<string>>(new Set());
  const [selTypes, setSelTypes]             = useState<Set<string>>(new Set());
  const [selSupertypes, setSelSupertypes]   = useState<Set<string>>(new Set());
  const [search, setSearch]                 = useState("");
  const [sortBy, setSortBy]                 = useState<SortKey>("number");
  const [cols, setCols]                     = useState(6);
  const [selectedCard, setSelectedCard]     = useState<SelectedCard | null>(null);
  // 패널 열림 상태는 카드와 분리 — 닫힐 때 selectedCard 를 유지해 슬라이드 아웃 애니메이션 중 직전 카드를 보여준다.
  const [panelOpen, setPanelOpen]           = useState(false);
  const openCard = (card: SelectedCard) => { setSelectedCard(card); setPanelOpen(true); };
  // 좌측 사이드바에서 선택한 팩(= Set.id). 딥링크 pack 우선, 없으면 지역 첫 팩.
  const [selectedSetId, setSelectedSetId]   = useState<string>(
    initialPack && packs.some((p) => p.setId === initialPack) ? initialPack : packs[0]?.setId ?? "",
  );
  // 선택 팩의 카드 — 팩 선택 시 액션으로 lazy 로드. null = 로딩 전/중.
  const [activeCards, setActiveCards]       = useState<DexCard[] | null>(null);
  const [loadingCards, setLoadingCards]     = useState(false);

  // [점2] 필터 모달(종류·희귀도·타입 통합) 열림 상태.
  const [filterOpen, setFilterOpen]         = useState(false);
  // 모바일 카드팩 선택 바텀시트 열림 상태(lg 미만에서만 사용).
  const [packSheetOpen, setPackSheetOpen]   = useState(false);

  // [점1] "전체" 가상 팩 — 서버필터+무한스크롤 누적 상태.
  const isAllMode = selectedSetId === ALL_PACK_ID;
  const [allCards, setAllCards]             = useState<DexCard[]>([]);
  const [allTotal, setAllTotal]             = useState(0);
  const [allNextOffset, setAllNextOffset]   = useState<number | null>(0); // 0=첫페이지대기, null=끝
  const [allLoading, setAllLoading]         = useState(false);
  const [allMeta, setAllMeta]               = useState<RegionFilterMeta | null>(null);
  const allSeqRef = useRef(0); // 페이지0 리셋 시 증가 → 진행중 loadMore 무효화

  // 필터 Set 직렬화 키(effect 의존성 안정화 — Set 객체 identity 변화 방지)
  const catKey   = useMemo(() => [...selCategories].sort().join("|"), [selCategories]);
  const typeKey  = useMemo(() => [...selTypes].sort().join("|"), [selTypes]);
  const superKey = useMemo(() => [...selSupertypes].sort().join("|"), [selSupertypes]);

  // "전체" 가상 팩(사이드바 prepend·본문 헤더용)
  const allPack: RegionPack = useMemo(() => ({
    setId: ALL_PACK_ID, code: null, cardPackId: null, name: "전체", era: "", eraOrder: -1,
    releaseDate: null, cardCount: packs.reduce((s, p) => s + p.cardCount, 0),
    logoUrl: null, isEtc: false, packType: null,
  }), [packs]);

  // 딥링크로 진입 시 선택된 팩이 사이드바 스크롤 밖일 수 있어 마운트 시 보이게 스크롤.
  const activeNavRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (initialPack) activeNavRef.current?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 지역 전환 → (전체모드면 전체 유지, 아니면 첫 팩) + 카드/전체누적 리셋.
  function changeRegion(r: string) {
    const region = r as Region;
    setActiveRegion(region);
    setSelectedSetId(isAllMode ? ALL_PACK_ID : ((regionPacks[region] ?? [])[0]?.setId ?? ""));
    setActiveCards(null);
    setAllCards([]); setAllTotal(0); setAllNextOffset(0); setAllMeta(null);
  }

  // 선택 팩 변경 → 카드 lazy 로드(경합 무효화: 최신 요청만 반영). 전체 모드는 별도 effect 가 처리.
  useEffect(() => {
    if (selectedSetId === ALL_PACK_ID) return;
    if (!selectedSetId) { setActiveCards([]); return; }
    let cancelled = false;
    setLoadingCards(true);
    setActiveCards(null);
    loadSetCards(selectedSetId)
      .then((cards) => { if (!cancelled) setActiveCards(cards); })
      .catch(() => { if (!cancelled) setActiveCards([]); })
      .finally(() => { if (!cancelled) setLoadingCards(false); });
    return () => { cancelled = true; };
  }, [selectedSetId]);

  const activePack = useMemo(
    () => (isAllMode ? allPack : (packs.find((p) => p.setId === selectedSetId) ?? packs[0] ?? null)),
    [isAllMode, allPack, packs, selectedSetId],
  );
  const cardsSource = activeCards ?? [];

  // 팩 정보 카드 — 카테고리(희귀도)별 구성·수집 현황 (cardsSource 전체, tier 오름차순)
  const packRarityStats = useMemo(() => {
    const map = new Map<string, { total: number; owned: number; tier: number; nameKo: string }>();
    for (const c of cardsSource) {
      const key = c.rarityCategoryCode ?? c.rarity ?? "Unknown";
      const cur = map.get(key) ?? { total: 0, owned: 0, tier: categoryTier(c), nameKo: c.rarityCategoryNameKo ?? c.rarity ?? key };
      map.set(key, { total: cur.total + 1, owned: cur.owned + (c.owned ? 1 : 0), tier: cur.tier, nameKo: cur.nameKo });
    }
    return [...map.entries()].sort(([, a], [, b]) => a.tier - b.tier);
  }, [cardsSource]);

  // 카테고리/타입 필터 후보는 현재 팩 카드 기준(lazy).
  const allCategories = useMemo(() => {
    const map = new Map<string, CategoryMeta>();
    cardsSource.forEach((c) => {
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
    });
    return [...map.values()].sort((a, b) => a.tier - b.tier);
  }, [cardsSource]);

  const allTypes = useMemo(() => {
    const s = new Set<string>();
    cardsSource.forEach((c) => c.types?.forEach((t) => s.add(t)));
    return TYPE_ORDER.filter((t) => s.has(t));
  }, [cardsSource]);

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

  const filterCount = selSupertypes.size + selCategories.size + selTypes.size;

  // 검색어는 지연값으로 — 입력은 즉시 반영하되 무거운 필터 렌더는 낮은 우선순위로 미룸
  const deferredSearch = useDeferredValue(search);
  const isFiltering = deferredSearch !== search;

  // 현재 팩 카드 필터·정렬 (한 번에 한 팩만 그려 렌더 부담 최소화)
  const filteredCards = useMemo(() => {
    return cardsSource
      .filter((c) => {
        const catOk       = selCategories.size === 0 || (c.rarityCategoryCode != null && selCategories.has(c.rarityCategoryCode));
        const typeOk      = selTypes.size === 0 || c.types?.some((t) => selTypes.has(t));
        const supertypeOk = selSupertypes.size === 0 || (c.supertype && selSupertypes.has(c.supertype));
        // 검색: 공용 헬퍼로 교차언어 매칭(대표명+한글오버레이+전 지역명 인덱스, 정규화). 서버 전체모드와 동일 로직.
        const searchOk    = matchesSearch(c.searchText ?? c.name, deferredSearch);
        return catOk && typeOk && supertypeOk && searchOk;
      })
      .sort((a, b) => {
        if (sortBy === "name")   return a.name.localeCompare(b.name);
        if (sortBy === "rarity") return categoryTier(b) - categoryTier(a); // 높은 tier 우선
        return a.number.localeCompare(b.number, undefined, { numeric: true });
      });
  }, [cardsSource, selCategories, selTypes, selSupertypes, deferredSearch, sortBy]);

  const totalInSet = cardsSource.length;
  const ownedInSet = cardsSource.filter((c) => c.owned).length;
  const visibleCount = filteredCards.length;

  // ── [점1] 전체 모드: 서버필터 page0 리셋 로드(필터/정렬/지역 변경 시) ─────────
  useEffect(() => {
    if (!isAllMode) return;
    const seq = ++allSeqRef.current;
    let cancelled = false;
    setAllLoading(true);
    setAllCards([]);
    setAllNextOffset(0);
    loadRegionCardsPage(activeRegion, {
      offset: 0, limit: 50, search: deferredSearch,
      categories: [...selCategories], types: [...selTypes], supertypes: [...selSupertypes], sort: sortBy,
    })
      .then((page) => {
        if (cancelled || allSeqRef.current !== seq) return;
        setAllCards(page.cards);
        setAllTotal(page.total);
        setAllNextOffset(page.nextOffset);
        if (page.meta) setAllMeta(page.meta);
      })
      .catch(() => { if (!cancelled && allSeqRef.current === seq) { setAllCards([]); setAllTotal(0); setAllNextOffset(null); } })
      .finally(() => { if (!cancelled && allSeqRef.current === seq) setAllLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllMode, activeRegion, deferredSearch, catKey, typeKey, superKey, sortBy]);

  // 무한스크롤 다음 페이지(진행중 page0 리셋이 끼어들면 seq 불일치로 무효)
  const loadMoreAll = useCallback(() => {
    if (!isAllMode || allNextOffset == null || allLoading) return;
    const seq = allSeqRef.current;
    const offset = allNextOffset;
    setAllLoading(true);
    loadRegionCardsPage(activeRegion, {
      offset, limit: 50, search: deferredSearch,
      categories: [...selCategories], types: [...selTypes], supertypes: [...selSupertypes], sort: sortBy,
    })
      .then((page) => {
        if (allSeqRef.current !== seq) return;
        setAllCards((prev) => [...prev, ...page.cards]);
        setAllNextOffset(page.nextOffset);
      })
      .catch(() => {})
      .finally(() => { if (allSeqRef.current === seq) setAllLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllMode, allNextOffset, allLoading, activeRegion, deferredSearch, catKey, typeKey, superKey, sortBy]);

  // 표시 카드/총계 — 전체 모드는 서버가 필터·정렬·페이징한 누적분, 일반 모드는 클라 필터.
  const displayCards = isAllMode ? allCards : filteredCards;
  const headerTotal = isAllMode ? allTotal : totalInSet;
  const headerVisible = isAllMode ? allCards.length : visibleCount;
  const showLoading = isAllMode ? (allLoading && allCards.length === 0) : (loadingCards || activeCards === null);

  // 내카드 수집 분모/분자 — 헤더 보유 표시 공용(IIFE 밖으로 끌어올림).
  const ownedShown = displayCards.filter((c) => c.owned).length;
  const mineDenom = isAllMode ? headerVisible : totalInSet;
  const mineOwned = isAllMode ? ownedShown : ownedInSet;

  // 필터 모달 후보 — 전체 모드는 지역 전체(allMeta), 일반 모드는 현재 팩.
  const modalCategoryItems = (isAllMode ? (allMeta?.categories ?? []) : allCategories)
    .map((cat) => ({ key: cat.code, label: (RARITY_CAT_ABBR[cat.code] ?? cat.nameKo) as ReactNode }));
  const modalTypeItems = (isAllMode ? TYPE_ORDER.filter((t) => allMeta?.types.includes(t)) : allTypes)
    .flatMap((t) => { const m = TYPE_META[t]; return m ? [{ key: t, label: (<><TypeIcon type={t} size={16} /><span>{m.label}</span></>) as ReactNode }] : []; });
  const modalSupertypeItems = Object.entries(SUPERTYPE_META)
    .filter(([key]) => !isAllMode || (allMeta?.supertypes.includes(key) ?? true))
    .map(([key, { label }]) => ({ key, label: label as ReactNode }));

  return (
    <div>
      {/* ── 모바일 카드팩 선택 트리거 (lg 미만) — 탭하면 하단 시트 ──────────────── */}
      <button
        type="button"
        onClick={() => setPackSheetOpen(true)}
        className="lg:hidden mb-4 w-full flex items-center gap-2.5 rounded-toss-md border border-toss-divider bg-toss-bg-base px-3 py-2.5 text-left transition-colors hover:bg-toss-hover active:bg-toss-pressed"
      >
        {!isAllMode && activePack && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={activePack.logoUrl ?? `https://images.pokemontcg.io/${activePack.setId}/logo.png`}
            alt=""
            className="h-5 w-10 object-contain shrink-0"
            loading="lazy"
            decoding="async"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
          />
        )}
        <span className="flex-1 min-w-0 truncate text-toss-caption font-semibold text-toss-text-primary">
          {isAllMode ? `전체 · ${REGION_LABEL[activeRegion] ?? activeRegion}` : (activePack?.name ?? "카드팩 선택")}
        </span>
        {!isAllMode && (
          <span className="shrink-0 rounded-toss-sm bg-toss-bg-muted px-1.5 py-0.5 text-toss-tiny font-semibold text-toss-text-tertiary">
            {REGION_LABEL[activeRegion] ?? activeRegion}
          </span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-toss-text-tertiary" />
      </button>

      {/* 모바일 카드팩 선택 바텀시트 — 데스크톱 사이드바와 동일한 PackNav(지역탭+검색+시대그룹) */}
      <Sheet.Root open={packSheetOpen} onOpenChange={setPackSheetOpen} side="bottom">
        <Sheet.Header className="px-5 py-3.5">
          <Sheet.Title>카드팩 선택</Sheet.Title>
          <Sheet.Close />
        </Sheet.Header>
        <Sheet.Content className="px-4 py-3">
          <PackNav
            availableRegions={availableRegions}
            activeRegion={activeRegion}
            onRegionChange={changeRegion}
            packSearch={packSearch}
            onPackSearchChange={setPackSearch}
            navPacks={navPacks}
            allPack={allPack}
            isAllMode={isAllMode}
            selectedSetId={selectedSetId}
            onSelectPack={(id) => { setSelectedSetId(id); setPackSheetOpen(false); }}
          />
        </Sheet.Content>
      </Sheet.Root>

      <div className="flex gap-6">
        {/* ── 좌측 카드팩 네비 (lg 이상) ──────────────────────────────────── */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-[68px] max-h-[calc(100vh-88px)] overflow-y-auto no-scrollbar pr-1">
            <PackNav
              availableRegions={availableRegions}
              activeRegion={activeRegion}
              onRegionChange={changeRegion}
              packSearch={packSearch}
              onPackSearchChange={setPackSearch}
              navPacks={navPacks}
              allPack={allPack}
              isAllMode={isAllMode}
              selectedSetId={selectedSetId}
              onSelectPack={setSelectedSetId}
              activeNavRef={activeNavRef}
            />
          </div>
        </aside>

        {/* ── 우측 본문 ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
      {/* ── 팩 정보 헤더 (필터 위로 이동 — IIFE 밖, 로딩 외 항상) ──────────────── */}
      {activePack && !showLoading && (
        <div className="mb-4 rounded-toss-lg border border-toss-divider bg-toss-bg-base p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            {/* 로고 + 이름 + 메타 */}
            <div className="flex min-w-0 items-center gap-4">
              {!isAllMode && (
                <div className="flex h-20 w-36 shrink-0 items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activePack.logoUrl ?? `https://images.pokemontcg.io/${activePack.setId}/logo.png`}
                    alt={activePack.name}
                    loading="lazy"
                    decoding="async"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {!isAllMode && activePack.code && (
                    <span className="shrink-0 rounded-toss-sm bg-toss-brand/10 px-1.5 py-0.5 text-toss-micro font-bold text-toss-brand toss-numeric">{activePack.code}</span>
                  )}
                  <h2 className="text-toss-title-2 font-bold text-toss-text-primary">
                    {isAllMode ? `전체 · ${REGION_LABEL[activeRegion] ?? activeRegion}` : activePack.name}
                  </h2>
                  {!isAllMode && activePack.nameSub && (
                    <span className="text-toss-caption text-toss-text-tertiary">{activePack.nameSub}</span>
                  )}
                </div>

                {/* 메타 행: 시리즈 · 팩타입 · 합본 · 발매일 · 수록종 · 지역 · (보유) */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {!isAllMode && (
                    activePack.isEtc ? (
                      <Chip variant="tag" size="sm">기타</Chip>
                    ) : (() => {
                      const { code, name } = eraParts(activePack.era);
                      return (
                        <Chip variant="tag" size="sm">
                          <span className="font-bold">{code}</span>
                          {name && <><span className="mx-0.5 text-toss-text-quaternary">·</span>{name}</>}
                        </Chip>
                      );
                    })()
                  )}
                  {!isAllMode && activePack.packType && (
                    <span className={`inline-flex items-center rounded-toss-sm px-2 py-0.5 text-toss-micro font-semibold ${PACK_TYPE_CHIP[activePack.packType as PackType] ?? "bg-toss-bg-muted text-toss-text-secondary"}`}>
                      {PACK_TYPE_LABEL[activePack.packType as PackType] ?? activePack.packType}
                    </span>
                  )}
                  {!isAllMode && activePack.mergeOf && activePack.mergeOf > 1 ? (
                    <Chip variant="tag" size="sm">합본 ({activePack.mergeOf})</Chip>
                  ) : null}
                  {!isAllMode && activePack.releaseDate && (
                    <span className="inline-flex items-center gap-1 text-toss-caption text-toss-text-tertiary"><Calendar className="h-3.5 w-3.5 shrink-0" /><span className="toss-numeric">{activePack.releaseDate}</span></span>
                  )}
                  {/* 종수/보유 — 전체 모드만(개별 팩은 희귀도 구성 헤더가 대체) */}
                  {isAllMode && (
                    <span className="text-toss-caption text-toss-text-tertiary">
                      {headerVisible < headerTotal ? `${headerTotal.toLocaleString()}종 (로드 ${headerVisible.toLocaleString()})` : `${headerTotal.toLocaleString()}종`}
                    </span>
                  )}
                  {isAllMode && view === "mine" && (
                    <span className="text-toss-caption font-semibold text-toss-warning">{mineOwned}/{mineDenom} 보유 (로드분)</span>
                  )}
                </div>
              </div>
            </div>

            {/* 우측: 단일/3종 레이아웃 토글 + 전체/수집 토글 */}
            <div className="flex shrink-0 items-center gap-2">
              <SegmentedControl
                options={[
                  { value: "single", label: "단일" },
                  { value: "triple", label: "3종" },
                ]}
                value={cardLayout}
                onChange={(v) => setCardLayout(v as CardLayout)}
                variant="filled"
                size="sm"
              />
              {!isAllMode && (
                <SegmentedControl
                  options={[
                    { value: "all",  label: "전체" },
                    { value: "mine", label: "수집" },
                  ]}
                  value={view}
                  onChange={(v) => setView(v as ViewMode)}
                  variant="filled"
                  size="sm"
                />
              )}
            </div>
          </div>

          {/* 희귀도 구성 — 전체 모드는 부분 로드라 미표시 (공용 RarityComposition) */}
          {!isAllMode && <RarityComposition stats={packRarityStats} view={view} />}
        </div>
      )}

      {/* ── 필터 행 (카드 래퍼 없이) ─────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            placeholder="카드 이름 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="sm"
            className="min-w-[160px] flex-1 sm:flex-none sm:w-64"
          />

          {/* 우측 컨트롤 그룹 — 열갯수 / 필터 / 정렬 (완전 우측) */}
          <div className="ml-auto flex items-center gap-2">
            {/* 열 수 슬라이더 — 모바일은 2열 고정이라 sm+ 에서만 (h-8 통일) */}
            <div className="hidden sm:flex h-8 items-center gap-2 rounded-toss-md bg-toss-input-bg px-3 shrink-0">
              <span className="text-toss-micro text-toss-text-tertiary shrink-0">열</span>
              <input
                type="range"
                min={5}
                max={15}
                step={1}
                value={cols}
                onChange={(e) => setCols(Number(e.target.value))}
                className="w-20 h-1 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--toss-brand) 0%, var(--toss-brand) ${((cols - 5) / 10) * 100}%, var(--toss-bg-muted) ${((cols - 5) / 10) * 100}%, var(--toss-bg-muted) 100%)`,
                }}
              />
              <span className="text-toss-micro font-semibold text-toss-brand w-4 text-right shrink-0">{cols}</span>
            </div>

            {/* 통합 필터 버튼 (종류·희귀도·타입) — h-8 통일 */}
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-toss-md border px-3 text-toss-caption font-medium transition-colors cursor-pointer ${
                filterCount > 0
                  ? "border-toss-brand/40 bg-toss-brand/10 text-toss-brand"
                  : "border-toss-divider bg-toss-input-bg text-toss-text-secondary hover:bg-toss-hover"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>필터</span>
              {filterCount > 0 && (
                <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-toss-brand px-1 text-toss-tiny font-bold text-white toss-numeric">{filterCount}</span>
              )}
            </button>

            {/* 정렬 셀렉박스 (번호/이름/희귀도) — 화살표는 ChevronDown 오버레이 */}
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className={SORT_SELECT_CLASS}
                aria-label="정렬"
              >
                {SORT_LABELS.map(({ key, label }) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-toss-text-tertiary" />
            </div>
          </div>
        </div>

        {/* 선택한 필터 — 칩 선택 시에만 노출 */}
        {(selSupertypes.size > 0 || selCategories.size > 0 || selTypes.size > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-toss-micro font-semibold text-toss-text-tertiary shrink-0">선택한 필터</span>
            {[...selSupertypes].map((k) => (
              <Chip key={`s-${k}`} variant="filter" size="sm" selected onRemove={() => toggleSupertype(k)}>
                {SUPERTYPE_META[k]?.label ?? k}
              </Chip>
            ))}
            {[...selCategories].map((code) => {
              const cat = (isAllMode ? (allMeta?.categories ?? []) : allCategories).find((c) => c.code === code);
              return (
                <Chip key={`c-${code}`} variant="filter" size="sm" selected onRemove={() => toggleCategory(code)}>
                  {cat ? (locale === "ja" && cat.nameJa ? cat.nameJa : cat.nameKo) : code}
                </Chip>
              );
            })}
            {[...selTypes].map((t) => (
              <Chip key={`t-${t}`} variant="filter" size="sm" selected onRemove={() => toggleType(t)}>
                <span className="inline-flex items-center gap-1"><TypeIcon type={t} size={14} />{TYPE_META[t]?.label ?? t}</span>
              </Chip>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto shrink-0"
              onClick={() => { setSelCategories(new Set()); setSelTypes(new Set()); setSelSupertypes(new Set()); }}
            >
              필터 초기화
            </Button>
          </div>
        )}
      </div>

      {/* ── 카드 섹션 ────────────────────────────────────────────────────── */}
      <div className={`space-y-10 transition-opacity ${isFiltering ? "opacity-50" : "opacity-100"}`}>
        {showLoading ? (
          <div className="flex items-center justify-center py-24 text-toss-caption text-toss-text-tertiary">
            카드 불러오는 중…
          </div>
        ) : activePack && displayCards.length > 0 ? (
            <section key={activePack.setId} className="scroll-mt-16">
              {isAllMode ? (
                <AllModeGrid
                  cards={displayCards}
                  cols={cardLayout === "triple" ? Math.max(1, Math.round(cols / 3)) : cols}
                  layout={cardLayout}
                  showOwned={view === "mine"}
                  dimUnowned={view === "mine"}
                  hasMore={allNextOffset != null}
                  loadingMore={allLoading}
                  onLoadMore={loadMoreAll}
                  onOpen={(card, v) => openCard({
                    ...card,
                    id: v.id, region: v.region, name: v.name, number: v.number,
                    imageSmall: v.imageSmall, rarity: v.rarity, rarityCategoryNameKo: v.rarityCategoryNameKo,
                    setName: `전체 · ${REGION_LABEL[activeRegion] ?? activeRegion}`, setId: ALL_PACK_ID, setLogoUrl: undefined,
                  })}
                />
              ) : (
                <div
                  className={`grid gap-1.5 dex-card-grid ${view === "mine" ? "mt-1" : "mt-3"}`}
                  /* 단일=cols 그대로, 3종은 JP/EN/KR 3장 묶음이라 열 수를 1/3로 보정. */
                  style={{ "--dex-cols": cardLayout === "triple" ? Math.max(1, Math.round(cols / 3)) : cols } as React.CSSProperties}
                >
                  {displayCards.map((card) => {
                    const onOpenVariant = (v: DexCardVariant) => openCard({
                      ...card,
                      id: v.id, region: v.region, name: v.name, number: v.number,
                      imageSmall: v.imageSmall, rarity: v.rarity, rarityCategoryNameKo: v.rarityCategoryNameKo,
                      setName: activePack.name, setId: activePack.setId,
                      setLogoUrl: activePack.logoUrl ?? `https://images.pokemontcg.io/${activePack.setId}/logo.png`,
                    });
                    return cardLayout === "triple" ? (
                      <GridCardTile
                        key={card.id}
                        card={card}
                        dimmed={view === "mine" && !card.owned}
                        showOwned={view === "mine"}
                        onOpen={onOpenVariant}
                      />
                    ) : (
                      <SingleCardTile
                        key={card.id}
                        card={card}
                        dimmed={view === "mine" && !card.owned}
                        showOwned={view === "mine"}
                        onOpen={onOpenVariant}
                      />
                    );
                  })}
                </div>
              )}
            </section>
        ) : (
          <EmptyState
            icon={<Search />}
            title="해당 조건의 카드가 없어요"
            description="필터를 조정해 보세요"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelCategories(new Set()); setSelTypes(new Set()); setSelSupertypes(new Set()); setSearch(""); }}
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

      {/* 카드 상세 슬라이드 패널 (항상 마운트 — open 토글로 슬라이드 인/아웃) */}
      <CardDetailPanel
        card={selectedCard}
        open={panelOpen}
        locale={locale}
        onClose={() => setPanelOpen(false)}
      />

      {/* [점2] 통합 필터 모달(종류·희귀도·타입 다중선택) */}
      <FilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        total={filterCount}
        groups={[
          { title: "종류",   items: modalSupertypeItems, selected: selSupertypes, onToggle: toggleSupertype },
          { title: "희귀도", items: modalCategoryItems,  selected: selCategories, onToggle: toggleCategory },
          { title: "타입",   items: modalTypeItems,      selected: selTypes,      onToggle: toggleType },
        ]}
        onClear={() => { setSelSupertypes(new Set()); setSelCategories(new Set()); setSelTypes(new Set()); }}
      />
    </div>
  );
}
