// ─────────────────────────────────────────────────────────────────────────────
// 임시 DB 그룹 검증 페이지 (/test)
//   정체성 4계층 마이그 후 "잘 묶였는지" 눈으로 확인하는 개발용 도구.
//   계층:  종(Species, 도감번호) ▸ GameCard(oracle) ▸ Card(LogicalCard 정체성) ▸ row들(RegionCard 지역판 + CardText 텍스트)
//   - [locale] 밖 최상위 라우트라 정확히 "/test" 로만 진입(사이트 헤더/푸터 없음). 어디서도 링크 안 함.
//   - 도감번호(Species.id) 윈도우 단위 페이지네이션(기본 25). ?dex= 로 점프, ?size= 로 윈도우 폭.
//   - ?view=trainers 로 무종(트레이너·에너지) 카드 GameCard 묶음 확인.
//   확인 끝나면 이 파일(src/app/test) 통째로 지우면 됨.
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "DB 그룹 검증 (/test)",
  robots: { index: false, follow: false },
};

const MAX_DEX = 1025; // National Pokédex 상한(Species.id)
const REGION_RANK: Record<string, number> = { JP: 0, EN: 1, KR: 2 }; // 표시 순서

// ── 쿼리가 돌려줄 모양(필요한 필드만 select → 그대로 캐스팅) ───────────────────
interface LocaleRow {
  id: string;
  region: string;
  language: string;
  number: string;
  numberInt: number | null;
  name: string;
  imageSmall: string | null;
  rarity: { code: string } | null;
  set: { id: string; name: string; region: string; cardPack: PackLite | null };
}
type PackLite = { id: string; nameKo: string | null; nameJa: string | null; nameEn: string | null };
interface TextRow {
  language: string;
  name: string | null;
  source: string;
}
interface CardRow {
  id: string;
  supertype: string | null;
  subtypes: string[];
  types: string[];
  hp: number | null;
  nameKo: string | null;
  primaryNumber: string | null;
  primaryNumberInt: number | null;
  gameCardId: string | null;
  gameCard: { id: string; name: string; supertype: string | null; hp: number | null } | null;
  rarity: { code: string; abbr: string | null } | null;
  locales: LocaleRow[];
  texts: TextRow[];
}
interface SpeciesRow {
  id: number;
  nameKo: string | null;
  nameEn: string;
  cards: { card: CardRow }[];
}

// 카드 1장에 대해 select 할 필드(종 뷰·무종 뷰 공용)
const cardSelect = {
  id: true,
  supertype: true,
  subtypes: true,
  types: true,
  hp: true,
  nameKo: true,
  primaryNumber: true,
  primaryNumberInt: true,
  gameCardId: true,
  gameCard: { select: { id: true, name: true, supertype: true, hp: true } },
  rarity: { select: { code: true, abbr: true } },
  // 팩소속 직교화(P9): Card.cardPackId 폐지 → 카드의 팩은 각 locale 의 set.cardPack 에서 도출.
  locales: {
    select: {
      id: true,
      region: true,
      language: true,
      number: true,
      numberInt: true,
      name: true,
      imageSmall: true,
      rarity: { select: { code: true } },
      set: { select: { id: true, name: true, region: true, cardPack: { select: { id: true, nameKo: true, nameJa: true, nameEn: true } } } },
    },
  },
  texts: { select: { language: true, name: true, source: true } },
} as const;

// ── 데이터 로드 ───────────────────────────────────────────────────────────────
async function getSummary() {
  const [species, cards, locales, gameCards, noGame, noLoc, noSpecies] = await Promise.all([
    prisma.species.count(),
    prisma.card.count(),
    prisma.regionCard.count(),
    prisma.gameCard.count(),
    prisma.card.count({ where: { gameCardId: null } }),
    prisma.card.count({ where: { locales: { none: {} } } }),
    prisma.card.count({ where: { speciesLinks: { none: {} } } }),
  ]);
  return { species, cards, locales, gameCards, noGame, noLoc, noSpecies };
}

async function getSpeciesWindow(lo: number, hi: number): Promise<SpeciesRow[]> {
  const rows = await prisma.species.findMany({
    where: { id: { gte: lo, lte: hi } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      nameKo: true,
      nameEn: true,
      cards: { select: { card: { select: cardSelect } } },
    },
  });
  return rows as unknown as SpeciesRow[];
}

async function getTrainerPage(skip: number, take: number): Promise<CardRow[]> {
  const rows = await prisma.card.findMany({
    where: { speciesLinks: { none: {} } },
    orderBy: [{ supertype: "asc" }, { gameCardId: "asc" }, { primaryNumberInt: "asc" }],
    skip,
    take,
    select: cardSelect,
  });
  return rows as unknown as CardRow[];
}

// ── 작은 표시 헬퍼 ────────────────────────────────────────────────────────────
function shortId(id: string, n = 8) {
  return id.length > n ? `${id.slice(0, n)}…` : id;
}
function sortLocales(locales: LocaleRow[]): LocaleRow[] {
  return [...locales].sort(
    (a, b) =>
      (REGION_RANK[a.region] ?? 9) - (REGION_RANK[b.region] ?? 9) ||
      (a.numberInt ?? 99999) - (b.numberInt ?? 99999) ||
      a.number.localeCompare(b.number),
  );
}
function cardDisplayName(card: CardRow): string {
  const koText = card.texts.find((t) => t.language === "ko" && t.name)?.name;
  return card.nameKo ?? koText ?? card.locales[0]?.name ?? "(이름 없음)";
}
function packDisplayName(pack: PackLite): string {
  return pack.nameKo ?? pack.nameJa ?? pack.nameEn ?? pack.id;
}
// 팩소속 직교화: 카드가 걸친 모든 팩 = 각 locale 의 set.cardPack 중복제거(앵커 JP>KR>EN 순서로 정렬).
const ANCHOR_RANK: Record<string, number> = { JP: 0, KR: 1, EN: 2 };
function cardPacks(card: CardRow): PackLite[] {
  const seen = new Map<string, PackLite>();
  for (const l of [...card.locales].sort((a, b) => (ANCHOR_RANK[a.region] ?? 9) - (ANCHOR_RANK[b.region] ?? 9))) {
    const p = l.set.cardPack;
    if (p && !seen.has(p.id)) seen.set(p.id, p);
  }
  return [...seen.values()];
}

function RegionBadge({ region }: { region: string }) {
  const tone =
    region === "JP"
      ? "bg-blue-100 text-blue-700"
      : region === "EN"
        ? "bg-emerald-100 text-emerald-700"
        : region === "KR"
          ? "bg-rose-100 text-rose-700"
          : "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-bold ${tone}`}>{region}</span>
  );
}

// ── row(지역판) 타일 — 같은 그림 비교용으로 이미지 크게, 가로 나열 ──────────────
function LocaleRowView({ loc }: { loc: LocaleRow }) {
  return (
    <div className="flex w-[150px] flex-none flex-col gap-1 rounded-md border border-gray-200 bg-white p-1.5 text-[12px]">
      {loc.imageSmall ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={loc.imageSmall}
          alt={loc.name}
          width={140}
          height={196}
          loading="lazy"
          className="h-[196px] w-full flex-none rounded border border-gray-200 bg-gray-50 object-contain"
        />
      ) : (
        <span className="flex h-[196px] w-full flex-none items-center justify-center rounded border border-dashed border-gray-300 text-[11px] text-gray-400">
          no img
        </span>
      )}
      <div className="flex items-center gap-1">
        <RegionBadge region={loc.region} />
        {loc.rarity && <span className="text-[10px] text-gray-400">{loc.rarity.code}</span>}
        <span className="ml-auto font-mono text-[10px] text-gray-300">{shortId(loc.id, 5)}</span>
      </div>
      <div className="truncate font-mono text-[10px] text-gray-500">
        {loc.set.id} <span className="text-gray-400">#{loc.number}</span>
      </div>
      {/* 이 행(RegionCard)의 팩 = set.cardPack — "이 행이 어느 팩"을 1:1 로 표시 */}
      {loc.set.cardPack ? (
        <div
          className="truncate rounded bg-violet-100 px-1 py-0.5 text-[10px] font-medium text-violet-700"
          title={loc.set.cardPack.id}
        >
          📦 {packDisplayName(loc.set.cardPack)}
        </div>
      ) : (
        <div className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700">📦 소속팩 ∅</div>
      )}
      <div className="line-clamp-2 font-medium leading-tight text-gray-900">{loc.name}</div>
    </div>
  );
}

// ── Card(정체성) 1장 ──────────────────────────────────────────────────────────
function CardView({ card }: { card: CardRow }) {
  const locales = sortLocales(card.locales);
  return (
    <div className="w-fit max-w-full rounded-md border border-gray-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px]">
        <span className="font-semibold text-gray-900">{cardDisplayName(card)}</span>
        {card.supertype && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
            {card.supertype}
          </span>
        )}
        {card.subtypes.length > 0 && (
          <span className="text-[11px] text-gray-400">{card.subtypes.join("/")}</span>
        )}
        {card.hp != null && <span className="text-[11px] text-gray-400">HP {card.hp}</span>}
        {card.types.length > 0 && (
          <span className="text-[11px] text-gray-400">{card.types.join("·")}</span>
        )}
        {card.rarity && (
          <span className="text-[11px] text-gray-400">레어 {card.rarity.abbr ?? card.rarity.code}</span>
        )}
        {(() => {
          const packs = cardPacks(card);
          return packs.length > 0 ? (
            packs.map((p) => (
              <span
                key={p.id}
                className="rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-medium text-violet-700"
                title={p.id}
              >
                📦 {packDisplayName(p)}
              </span>
            ))
          ) : (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
              📦 소속팩 ∅
            </span>
          );
        })()}
        <span className="ml-auto font-mono text-[11px] text-gray-300">Card {shortId(card.id)}</span>
      </div>
      {/* row들: 지역판(RegionCard) — 같은 그림인지 가로로 비교 */}
      <div className="mt-2 flex flex-wrap gap-2">
        {locales.length === 0 ? (
          <div className="py-1 text-[12px] text-amber-600">⚠ 지역판(row) 없음 — 빈 카드</div>
        ) : (
          locales.map((loc) => <LocaleRowView key={loc.id} loc={loc} />)
        )}
      </div>
      {/* 텍스트 오버레이(CardText) 요약 */}
      {card.texts.length > 0 && (
        <div className="mt-1 text-[11px] text-gray-400">
          텍스트:{" "}
          {card.texts
            .map((t) => `${t.language}${t.name ? "" : "(이름∅)"}·${t.source}`)
            .join("  ")}
        </div>
      )}
    </div>
  );
}

// ── 종(Species) 1개 ───────────────────────────────────────────────────────────
function SpeciesView({ sp }: { sp: SpeciesRow }) {
  const cards = sp.cards
    .map((c) => c.card)
    .sort((a, b) => (a.primaryNumberInt ?? 99999) - (b.primaryNumberInt ?? 99999));
  const localeTotal = cards.reduce((n, c) => n + c.locales.length, 0);
  return (
    <details open className="rounded-xl border border-gray-300 bg-gray-50 p-3">
      <summary className="cursor-pointer select-none text-[15px] font-bold text-gray-900">
        <span className="font-mono text-gray-400">#{sp.id}</span> {sp.nameKo ?? sp.nameEn}{" "}
        <span className="text-[12px] font-normal text-gray-400">
          {sp.nameEn} · Card {cards.length} · row {localeTotal}
        </span>
      </summary>
      {cards.length === 0 ? (
        <div className="mt-2 text-[13px] text-gray-400">연결된 Card 없음</div>
      ) : (
        <div className="mt-2 flex flex-wrap items-start gap-2">
          {cards.map((card) => (
            <CardView key={card.id} card={card} />
          ))}
        </div>
      )}
    </details>
  );
}

// ── 페이지네이션 / 헤더 UI ────────────────────────────────────────────────────
function Chip({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-md border px-2 py-1 text-[12px] ${
        warn ? "border-amber-300 bg-amber-50 text-amber-700" : "border-gray-200 bg-white text-gray-600"
      }`}
    >
      {label} <strong className="text-[13px]">{value.toLocaleString()}</strong>
    </span>
  );
}

function clampInt(v: string | undefined, def: number, min: number, max: number): number {
  const n = Number.parseInt(v ?? "", 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

// ── 페이지 본체 ───────────────────────────────────────────────────────────────
export default async function TestPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string; size?: string; dex?: string }>;
}) {
  const sp = await searchParams;
  const summary = await getSummary();
  const view = sp.view === "trainers" ? "trainers" : "species";

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">DB 그룹 검증 — /test</h1>
        <p className="mt-1 text-[13px] text-gray-500">
          계층: <b>종(도감#)</b> ▸ <b>Card</b> ▸ row(지역판 RegionCard). 마이그 후 묶임 점검용 임시
          페이지. (GameCard 묶음 표시는 제외)
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip label="종" value={summary.species} />
          <Chip label="GameCard" value={summary.gameCards} />
          <Chip label="Card" value={summary.cards} />
          <Chip label="row(지역판)" value={summary.locales} />
          <Chip label="GameCard 없는 Card" value={summary.noGame} warn={summary.noGame > 0} />
          <Chip label="종 없는 Card" value={summary.noSpecies} warn={summary.noSpecies > 0} />
          <Chip label="row 없는 Card" value={summary.noLoc} warn={summary.noLoc > 0} />
        </div>
        <nav className="mt-3 flex gap-2 text-[13px]">
          <Link
            href="/test"
            className={`rounded-md px-3 py-1 ${view === "species" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            종 ▸ GameCard ▸ Card (도감순)
          </Link>
          <Link
            href="/test?view=trainers"
            className={`rounded-md px-3 py-1 ${view === "trainers" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            무종(트레이너·에너지)
          </Link>
        </nav>
      </header>

      {view === "species" ? (
        <SpeciesSection sp={sp} />
      ) : (
        <TrainerSection sp={sp} total={summary.noSpecies} />
      )}
    </main>
  );
}

// 종 뷰 섹션
async function SpeciesSection({ sp }: { sp: { page?: string; size?: string; dex?: string } }) {
  const size = clampInt(sp.size, 25, 5, 100); // 도감 윈도우 폭
  // dex 점프가 있으면 그 종이 포함된 페이지로, 없으면 page 사용
  const page = sp.dex
    ? Math.floor((clampInt(sp.dex, 1, 1, MAX_DEX) - 1) / size)
    : clampInt(sp.page, 0, 0, Math.ceil(MAX_DEX / size) - 1);
  const lo = page * size + 1;
  const hi = Math.min(lo + size - 1, MAX_DEX);
  const totalPages = Math.ceil(MAX_DEX / size);
  const species = await getSpeciesWindow(lo, hi);

  const mk = (p: number) => `/test?page=${p}&size=${size}`;
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="text-[14px] font-semibold text-gray-700">
          도감 #{lo}–#{hi}{" "}
          <span className="text-[12px] font-normal text-gray-400">
            (페이지 {page + 1}/{totalPages})
          </span>
        </div>
        <div className="flex gap-1">
          {page > 0 && (
            <Link href={mk(page - 1)} className="rounded bg-gray-100 px-2 py-1 text-[13px] text-gray-700">
              ← 이전
            </Link>
          )}
          {hi < MAX_DEX && (
            <Link href={mk(page + 1)} className="rounded bg-gray-100 px-2 py-1 text-[13px] text-gray-700">
              다음 →
            </Link>
          )}
        </div>
        {/* 도감번호 / 윈도우 점프 (서버 GET 폼) */}
        <form action="/test" method="get" className="ml-auto flex items-center gap-1 text-[13px]">
          <input
            type="number"
            name="dex"
            min={1}
            max={MAX_DEX}
            placeholder="도감#"
            className="w-20 rounded border border-gray-300 px-2 py-1"
          />
          <input
            type="number"
            name="size"
            min={5}
            max={100}
            defaultValue={size}
            className="w-16 rounded border border-gray-300 px-2 py-1"
            title="윈도우 폭"
          />
          <button type="submit" className="rounded bg-gray-900 px-3 py-1 text-white">
            이동
          </button>
        </form>
      </div>
      <div className="space-y-3">
        {species.length === 0 ? (
          <div className="text-[13px] text-gray-400">이 범위에 종 없음</div>
        ) : (
          species.map((s) => <SpeciesView key={s.id} sp={s} />)
        )}
      </div>
    </section>
  );
}

// 무종(트레이너·에너지) 뷰 섹션 — 현재 페이지 카드를 gameCard 로 묶어 표시
async function TrainerSection({
  sp,
  total,
}: {
  sp: { page?: string; size?: string };
  total: number;
}) {
  const size = clampInt(sp.size, 60, 10, 200);
  const totalPages = Math.max(1, Math.ceil(total / size));
  const page = clampInt(sp.page, 0, 0, totalPages - 1);
  const cards = await getTrainerPage(page * size, size);

  const mk = (p: number) => `/test?view=trainers&page=${p}&size=${size}`;
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="text-[14px] font-semibold text-gray-700">
          무종 카드 {page * size + 1}–{page * size + cards.length} / {total.toLocaleString()}{" "}
          <span className="text-[12px] font-normal text-gray-400">
            (페이지 {page + 1}/{totalPages})
          </span>
        </div>
        <div className="flex gap-1">
          {page > 0 && (
            <Link href={mk(page - 1)} className="rounded bg-gray-100 px-2 py-1 text-[13px] text-gray-700">
              ← 이전
            </Link>
          )}
          {page < totalPages - 1 && (
            <Link href={mk(page + 1)} className="rounded bg-gray-100 px-2 py-1 text-[13px] text-gray-700">
              다음 →
            </Link>
          )}
        </div>
        <p className="ml-auto text-[11px] text-gray-400">
          ※ 정렬: supertype ▸ 번호.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        {cards.length === 0 ? (
          <div className="text-[13px] text-gray-400">카드 없음</div>
        ) : (
          cards.map((card) => <CardView key={card.id} card={card} />)
        )}
      </div>
    </section>
  );
}
