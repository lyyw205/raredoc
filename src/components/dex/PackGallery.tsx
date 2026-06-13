"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { eraLabel } from "@/lib/cards/eras";
import type { Region, RegionPack } from "@/lib/cards/dex-region";
import { EmptyState, SearchField, SegmentedControl } from "@/components/toss";

const REGION_ORDER: Region[] = ["JP", "EN", "KR"];
const REGION_LABEL: Record<string, string> = { EN: "영문판", JP: "일본판", KR: "한국판" };

// era(시리즈) 헤더로 묶인 팩 그룹. packs 는 listRegionPacks 가 이미 정렬해 줌
// (eraOrder asc, isEtc 맨뒤, releaseDate desc) → 순차 스캔으로 그룹 경계 판정.
type PackGroup = { key: string; label: string; packs: RegionPack[] };

function PackTile({ pack, onOpen }: { pack: RegionPack; onOpen: (setId: string) => void }) {
  const logoUrl = pack.logoUrl ?? `https://images.pokemontcg.io/${pack.setId}/logo.png`;
  // 발매일 YY.MM (releaseDate = ISO yyyy-mm-dd)
  const ym = pack.releaseDate ? `${pack.releaseDate.slice(2, 4)}.${pack.releaseDate.slice(5, 7)}` : null;
  return (
    <button
      onClick={() => onOpen(pack.setId)}
      title={pack.name}
      className="group flex flex-col items-center gap-2 rounded-toss-lg border border-toss-divider bg-toss-bg-base p-3 text-center transition-all hover:border-toss-brand/60 hover:shadow-toss-md cursor-pointer"
    >
      <div className="flex h-14 w-full items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={pack.name}
          loading="lazy"
          decoding="async"
          className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
        />
      </div>
      {/* 세트코드(인라인 SPAN, 제목 첫 글자 앞) + 이름 — 최대 2줄, 자연 높이 */}
      <span className="line-clamp-2 w-full text-toss-caption font-semibold leading-snug text-toss-text-primary">
        {pack.code && (
          <span className="mr-1 mb-[2px] inline-block rounded-toss-sm bg-toss-bg-muted px-1 align-middle text-toss-tiny font-semibold uppercase tracking-wide text-toss-text-tertiary">
            {pack.code}
          </span>
        )}
        {pack.name}
        {pack.mergeOf && pack.mergeOf > 1 ? " (합본)" : ""}
      </span>
      {/* 출시일 YY.MM · 카드장수 */}
      <span className="text-toss-micro text-toss-text-quaternary toss-numeric">
        {ym ? `${ym} · ` : ""}{pack.cardCount}종
      </span>
    </button>
  );
}

export function PackGallery({ regionPacks, locale }: { regionPacks: Record<Region, RegionPack[]>; locale: string }) {
  const router = useRouter();

  // 노출 지역 = 팩이 1개 이상 있는 지역(JP/EN/KR 순). 기본은 JP 있으면 JP, 없으면 첫째.
  const availableRegions = useMemo(
    () => REGION_ORDER.filter((r) => (regionPacks[r]?.length ?? 0) > 0),
    [regionPacks],
  );
  const [activeRegion, setActiveRegion] = useState<Region>(
    availableRegions.includes("JP") ? "JP" : (availableRegions[0] ?? "JP"),
  );
  const [search, setSearch] = useState("");

  const packs = regionPacks[activeRegion] ?? [];

  const filteredPacks = useMemo(() => {
    const all = regionPacks[activeRegion] ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((p) => p.name.toLowerCase().includes(q));
  }, [regionPacks, activeRegion, search]);

  // era 별 그룹화 — 정렬된 목록을 순차 스캔(인접 동일 era 묶음).
  const groups = useMemo(() => {
    const out: PackGroup[] = [];
    for (const p of filteredPacks) {
      const key = p.isEtc ? "__etc__" : p.era;
      const label = p.isEtc ? "기타" : eraLabel(p.era);
      const last = out[out.length - 1];
      if (last && last.key === key) last.packs.push(p);
      else out.push({ key, label, packs: [p] });
    }
    return out;
  }, [filteredPacks]);

  // 팩 선택 → 도감으로 딥링크(지역탭 + 팩 선택 상태로 진입).
  function openPack(setId: string) {
    router.push(`/${locale}/dex?region=${activeRegion}&pack=${encodeURIComponent(setId)}`);
  }

  const totalPacks = packs.length;
  const visiblePacks = filteredPacks.length;

  return (
    <div>
      {/* ── 헤더 ──────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-toss-title-1 font-bold text-toss-text-primary">카드팩</h1>
          <p className="mt-0.5 text-toss-caption text-toss-text-tertiary">
            카드팩을 선택하면 도감에서 해당 팩의 카드를 볼 수 있어요 ·{" "}
            {search.trim() ? `${visiblePacks.toLocaleString()}/${totalPacks.toLocaleString()}팩` : `${totalPacks.toLocaleString()}팩`}
          </p>
        </div>

        {availableRegions.length > 1 && (
          <SegmentedControl
            options={availableRegions.map((r) => ({ value: r, label: REGION_LABEL[r] ?? r }))}
            value={activeRegion}
            onChange={(v) => { setActiveRegion(v as Region); setSearch(""); }}
            variant="filled"
            size="md"
            className="shrink-0"
          />
        )}
      </div>

      {/* ── 검색 ──────────────────────────────────────────────────────────── */}
      <div className="mb-6 max-w-sm">
        <SearchField
          placeholder="카드팩 이름 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── era 그룹별 팩 그리드 ──────────────────────────────────────────── */}
      {groups.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="해당 카드팩이 없어요"
          description="검색어를 바꿔보세요"
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-toss-label font-bold text-toss-text-primary">{group.label}</h2>
                <span className="text-toss-micro text-toss-text-quaternary toss-numeric">{group.packs.length}팩</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {group.packs.map((p) => (
                  <PackTile key={p.setId} pack={p} onOpen={openPack} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
