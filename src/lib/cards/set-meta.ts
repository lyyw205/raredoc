/**
 * 카드 도감 팩 메타(packType 분류 + 클린 팩명) 단일출처.
 *
 * ✅ 배선됨: dex-region.ts(buildRegionPacks/resolveSidebarTitle) 가 import 해 사이드바
 *    클린 팩명·packType 뱃지/필터를 그린다. backfill-set-meta.ts / verify-set-meta.ts(scripts)
 *    도 이 헬퍼를 공유 funnel 로 호출한다.
 *
 * 분류기는 전 Set(717건) 전수 실측으로 검증됨 — 705/717 = 98.3% 자동 분류.
 * 미분류 12건은 전부 EN SM 본탄(Sun & Moon … Cosmic Eclipse)으로, packType 문제가 아니라
 * 해당 EN Set 이 setGroup 미연결(era=null)인 기존 데이터 갭이다(docs/design/dex-pack-typing.md §3.1).
 *
 * 검증 분포(717): expansion 400 · deck 89 · starter 60 · box_set 57 · reinforced 49 ·
 *                 promo 27 · high_class 16 · subset 4 · concept 3 · NULL 12.
 *
 * 설계 배경/마이그 단계: docs/design/dex-pack-typing.md
 */

// ── packType ────────────────────────────────────────────────────────────────
export type PackType =
  | "expansion"   // 확장팩(본탄)
  | "reinforced"  // 강화확장팩
  | "high_class"  // 하이클래스팩
  | "concept"     // 컨셉팩
  | "starter"     // 스타터
  | "deck"        // 덱
  | "box_set"     // 특전박스(배틀강화BOX·프리미엄트레이너박스·GOLDEN BOX 등)
  | "promo"       // 프로모
  | "subset";     // 서브셋(EN Trainer Gallery 등)

export const PACK_TYPE_LABEL: Record<PackType, string> = {
  expansion: "확장팩",
  reinforced: "강화확장팩",
  high_class: "하이클래스팩",
  concept: "컨셉팩",
  starter: "스타터",
  deck: "덱",
  box_set: "특전박스",
  promo: "프로모",
  subset: "서브셋",
};

/** 팩 종류(packType) → 종류별 컬러 칩(본탄=파랑/청록 계열, 특전·덱=따뜻한 색, 프로모=회색). 카드팩 정보 섹션 공용. */
export const PACK_TYPE_CHIP: Record<PackType, string> = {
  expansion:  "bg-blue-100 text-blue-700",     // 확장팩(본탄)
  reinforced: "bg-sky-100 text-sky-700",       // 강화확장팩
  high_class: "bg-purple-100 text-purple-700", // 하이클래스팩
  concept:    "bg-pink-100 text-pink-700",     // 컨셉팩
  subset:     "bg-slate-100 text-slate-600",   // 서브셋
  starter:    "bg-green-100 text-green-700",   // 스타터
  deck:       "bg-teal-100 text-teal-700",     // 덱
  box_set:    "bg-amber-100 text-amber-700",   // 특전박스
  promo:      "bg-gray-100 text-gray-600",     // 프로모
};

/** 사이드바 정렬·접기 우선순위(본탄 먼저, 특전·프로모 뒤). 작을수록 위. */
export const PACK_TYPE_ORDER: Record<PackType, number> = {
  expansion: 0, reinforced: 1, high_class: 2, concept: 3, subset: 4,
  starter: 10, deck: 11, box_set: 12,
  promo: 20,
};

/** 펼쳐 노출하는 본탄 섹션. 나머지는 접힘 디스클로저("특전·덱·프로모"). */
export const SIDEBAR_PRIMARY: ReadonlySet<PackType> = new Set<PackType>([
  "expansion", "reinforced", "high_class", "concept", "subset",
]);

// ── 분류기 ────────────────────────────────────────────────────────────────
// 입력 name 은 locale 우선 표시명(EN=영문 Set.name, JP/KR=Set.nameKo). rawEra 는 CardPack.era
// (Set 엔 era 컬럼이 없으므로 cardPack join 으로 읽어 넘긴다). 위→아래 첫 매치.
export function derivePackType(input: {
  name: string;
  code: string | null;
  rawEra: string | null | undefined;
}): PackType | null {
  const { name } = input;
  const code = input.code ?? "";
  const era = input.rawEra ?? "";
  const sp = era.endsWith("-SP"); // 특전 게이트(저해상도 본탄/특전 비트)

  // 1) 프로모: EN code PR* / 각국 프로모 표기 / 조직플레이(POP)
  if (/^PR/i.test(code) || /Black Star Promo|프로모|プロモ|[SM]-P\b|POP Series/.test(name)) return "promo";
  // 2) 서브셋(EN 부속 갤러리)
  if (/Trainer Gallery|트레이너 갤러리/.test(name)) return "subset";
  // 3) 하이클래스(본탄 게이트 — SP 의 '하이클래스 덱'과 구분)
  if (!sp && /하이클래스|ハイクラス|BREAK進化パック|Classic Collection/.test(name)) return "high_class";
  // 4) 강화확장팩
  if (/강화\s?확장팩|強化拡張パック/.test(name)) return "reinforced";
  // 5) 컨셉팩 (★GOLDEN BOX 는 box_set 이므로 제외)
  if (/コンセプトパック|ANNIVERSARY COLLECTION|BASE PACK/.test(name) && !/GOLDEN BOX/.test(name)) return "concept";
  // 5.5) 명시 박스류 — era 무관(GOLDEN BOX·프리미엄트레이너박스는 regular era 에 있음)
  if (/GOLDEN BOX|프리미엄 트레이너 박스|プレミアムトレーナーボックス|Elite Trainer Box/.test(name)) return "box_set";
  // 6) 특전(-SP) 게이트 세분
  if (sp) {
    if (/스타터|スターター|スタートデッキ|Starter|Trainer Kit/.test(name)) return "starter";
    if (/덱|デッキ|\bDeck\b/.test(name)) return "deck";
    return "box_set"; // BOX|박스|세트|セット|Set|Collection 등
  }
  // 7) 본탄 기본(구세대 「」 없는 이름=타이틀 포함)
  if (era) return "expansion";
  // 8) era=null(isEtc 잔여): 안전 키워드 재시도, 그래도 안 잡히면 null(수동 override·setGroup 백필 권장)
  if (/확장팩|拡張パック/.test(name)) return "expansion";       // KR DP bs1-10 등 setGroup 미연결 본탄
  if (/Trainer Kit/.test(name)) return "starter";
  if (/POP Series|Best of Game|Pokémon Rumble/.test(name)) return "promo";
  if (/McDonald|Futsal|Energies|Classic Collection/.test(name)) return "box_set";
  return null;                                                  // EN sm1-12 등 — setGroup 백필 또는 override
}

// ── 클린 title 추출 ──────────────────────────────────────────────────────
// 「」 안쪽 우선. 없으면 시리즈·product-type 접두 제거 후 잔여. 잔여가 비거나 타입어휘뿐이면 원본.
const SERIES_PREFIX =
  /^(스칼렛\s?&\s?바이올렛|소드\s?&\s?실드|썬\s?&\s?문|MEGA|XY|BW|포켓몬\s?카드\s?게임|ポケモンカードゲーム)\s*/;
const TYPE_PREFIX =
  /^(확장팩(\s?제\s?\d+\s?탄)?|강화\s?확장팩|하이클래스팩|컨셉팩|스타터\s?세트|배틀\s?강화\s?BOX|프리미엄\s?트레이너\s?박스|拡張パック|強化拡張パック|ハイクラスパック|スターターセット|デッキビルドBOX)\s*/;

export function deriveCleanTitle(name: string): string {
  const bracket = name.match(/「([^」]+)」/);
  if (bracket) return bracket[1].trim();
  const s = name.replace(SERIES_PREFIX, "").replace(TYPE_PREFIX, "").trim();
  if (!s || TYPE_PREFIX.test(s + " ")) return name; // 잔여가 비거나 타입어휘뿐이면 원본 유지
  return s;
}

// ── 통합 헬퍼(모든 Set 업서트·백필·verify 의 단일 funnel) ──────────────────
export function deriveSetMeta(
  set: { name: string; code: string | null; rawEra: string | null | undefined },
  override?: { packType?: PackType; title?: string },
): { packType: PackType | null; titleClean: string } {
  return {
    packType: override?.packType ?? derivePackType(set),
    titleClean: override?.title ?? deriveCleanTitle(set.name),
  };
}

// ── 렌더 시 3단 폴백(향후 buildRegionPacks 에서 사용) ────────────────────────
// titleClean(Set 영속) → CardPack.name{locale}(콘텐츠 canonical) → shortenPackName(미백필 graceful 폴백)
export function resolveSidebarTitle(args: {
  setTitleClean: string | null;   // Set.titleClean{locale}
  cardPackName: string | null;    // CardPack.name{locale} (canonical, region 무관 동일표기 보장)
  legacyName: string;             // Set.name{locale} || Set.name
  rawEra: string | null | undefined;
  shortenPackName: (name: string, era: string | null | undefined) => string;
}): string {
  return (
    args.setTitleClean ||
    args.cardPackName ||
    args.shortenPackName(args.legacyName, args.rawEra)
  );
}
