# raredoc 디자인 시스템

> 이 문서는 **실제 코드에 구현된** raredoc 디자인 시스템의 단일 출처(SSoT)입니다.
> 모든 값은 소스 파일에서 직접 검증했습니다 (2026-06-11 기준).
>
> - 토스 토큰 정의: [`src/styles/toss.css`](../../src/styles/toss.css)
> - shadcn 베이스 토큰: [`src/app/globals.css`](../../src/app/globals.css)
> - 토스 컴포넌트 라이브러리: [`src/components/toss/`](../../src/components/toss/) ([README](../../src/components/toss/README.md))
> - 디자인 출처/철학(역추출 레퍼런스): [`README.md`](./README.md)

관련 문서와의 관계:
- **이 문서** = 코드에 실재하는 토큰·컴포넌트의 정확한 카탈로그.
- [`README.md`](./README.md) = tossinvest.com에서 Playwright로 역추출한 *원본 레퍼런스 스펙* (토큰 이름이 코드와 다름, 디자인 철학 참고용).
- [`toss/README.md`](../../src/components/toss/README.md) = 컴포넌트 라이브러리 사용 가이드.

---

## 1. 아키텍처 — 두 개의 토큰 레이어

raredoc은 **두 개의 디자인 토큰 시스템이 공존**합니다. 둘 다 Tailwind v4의 `@theme inline`으로 노출되어 유틸리티 클래스로 쓸 수 있습니다.

| 레이어 | 토큰 prefix | 정의 파일 | 소비 컴포넌트 | 용도 |
|---|---|---|---|---|
| **shadcn neutral** | `--background`, `--primary`, `--muted`, … | `src/app/globals.css` | `src/components/ui/*` (shadcn) | shadcn 기본 컴포넌트, 무채색 베이스 |
| **Toss** | `--toss-*` | `src/styles/toss.css` | `src/components/toss/*` | 카드/시세/거래 UI, 한국 증권 톤 |

> **원칙**: 새 UI는 가능한 한 **Toss 레이어(`bg-toss-*`, `text-toss-*`, `rounded-toss-*`)** 로 작성합니다. shadcn neutral 토큰은 shadcn에서 가져온 컴포넌트의 베이스로만 남겨둡니다.

빌드 스택:
- **Tailwind v4** (`@import "tailwindcss"`, `@theme inline` 으로 토큰→유틸리티 매핑) — `tailwind.config.ts` **없음**.
- **shadcn** (`style: base-nova`, baseColor `neutral`, `cssVariables: true`) — `components.json`.
- `class-variance-authority` (variant 정의) + `clsx` + `tailwind-merge`.
- 아이콘: `lucide-react`.
- 폰트: `pretendard` (npm 패키지).

### `cn()` 헬퍼의 특이점

`src/lib/utils.ts`의 `cn()`은 `extendTailwindMerge`로 커스터마이즈되어 있습니다. Toss의 `text-toss-*` 사이즈 토큰(예: `text-toss-body`)을 tailwind-merge가 **color로 오인해 `text-white`와 충돌시켜 색을 떨어뜨리는 문제**를 막기 위해, 해당 사이즈 변형들을 `font-size` 그룹으로 명시 등록했습니다. → **색과 글자 크기를 같은 className에서 함께 쓸 수 있습니다.**

---

## 2. 컬러 시스템

### 2.1 shadcn neutral 베이스 (`globals.css`)

전부 무채색(OKLCH, chroma 0)입니다. light / dark 두 테마.

| 토큰 (유틸리티) | Light | Dark | 용도 |
|---|---|---|---|
| `background` / `foreground` | `oklch(1 0 0)` / `oklch(0.145 0 0)` | `oklch(0.145 0 0)` / `oklch(0.985 0 0)` | 페이지 배경/본문 |
| `card` / `card-foreground` | white / `0.145` | `0.205` / `0.985` | 카드 |
| `primary` / `primary-foreground` | `0.205` / `0.985` | `0.922` / `0.205` | 기본 강조 |
| `secondary` | `0.97` | `0.269` | 보조 |
| `muted` / `muted-foreground` | `0.97` / `0.556` | `0.269` / `0.708` | 약한 배경/라벨 |
| `accent` | `0.97` | `0.269` | 강조 배경 |
| `destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | 파괴적 액션 (유일한 유채색) |
| `border` / `input` / `ring` | `0.922` / `0.922` / `0.708` | `white/10%` / `white/15%` / `0.556` | 외곽선/입력/포커스 |
| `chart-1`…`chart-5` | `0.87` → `0.269` 그라데이션 | 동일 | 차트 (무채색) |
| `sidebar*` | — | — | 사이드바 전용 세트 |

다크 모드 전환: `.dark` 클래스 (`@custom-variant dark (&:is(.dark *))`).

### 2.2 Toss 토큰 — 3계층 구조 (`toss.css`)

```
LAYER 1 primitive   →   LAYER 2 adaptive   →   LAYER 3 semantic
  --toss-blue-500         (light/dark 자동 스왑)     --toss-brand
```

UI 코드에서는 **항상 시맨틱 토큰(`--toss-brand`, `--toss-text-primary` 등)** 만 씁니다.

#### Primitive 팔레트

| 그룹 | 핵심 값 |
|---|---|
| **Toss Blue** | `50 #ebf2ff` · `500 #3182f6` · `600 #1b64da` · `700 #1957b5` · `900 #0f3066` |
| **Red** | `50 #ffeeee` · `500 #f04452` · `600 #dc2e47` · `700 #bc1b2a` |
| **Green** | `50 #e6f7ef` · `500 #02a262` · `600 #009169` · `700 #07a978` |
| **Yellow** | `50 #fff1d4` · `500 #ffb134` · `600 #f29300` · `700 #dd7d02` |
| **Grey** | `50 #f9fafb` · `100 #f2f4f6` · `200 #e5e8eb` · `400 #b0b8c1` · `600 #6b7684` · `700 #4e5968` · `900 #191f28` |
| **Grey opacity** | `o-50 rgba(0,12,30,.04)` … `o-100 .08` · `o-300 .19` · `o-700 .80` · `o-900 .96` |

#### Semantic 토큰 (Light / Dark)

| 시맨틱 토큰 | 유틸리티 | Light | Dark | 용도 |
|---|---|---|---|---|
| `--toss-bg-base` | `bg-toss-bg-base` | `#ffffff` | `#17171c` | 페이지/카드 |
| `--toss-bg-subtle` | `bg-toss-bg-subtle` | `#f9fafb` | `#101013` | 섹션 구분 |
| `--toss-bg-muted` | `bg-toss-bg-muted` | `#f2f4f6` | `#1c1c22` | hover/입력 |
| `--toss-bg-overlay` | `bg-toss-bg-overlay` | `rgba(0,0,0,.56)` | `rgba(0,0,0,.72)` | 모달 백드롭 |
| `--toss-text-primary` | `text-toss-text-primary` | `rgba(0,12,30,.96)` | `rgba(255,255,255,.96)` | 강조 헤드라인 |
| `--toss-text-secondary` | `text-toss-text-secondary` | `rgba(0,12,30,.80)` | `rgba(217,223,235,.80)` | 본문 |
| `--toss-text-tertiary` | `text-toss-text-tertiary` | `#6b7684` | `#888d97` | 보조 라벨 |
| `--toss-text-quaternary` | `text-toss-text-quaternary` | `#8b95a1` | `#676c77` | placeholder |
| `--toss-text-disabled` | `text-toss-text-disabled` | `#b0b8c1` | `#4f525d` | 비활성 |
| `--toss-brand` | `*-toss-brand` | `#3182f6` | `#3182f6` | **기본 CTA / 링크** |
| `--toss-brand-hover` | | `#1b64da` | `#4391ff` | hover |
| `--toss-brand-pressed` | | `#1957b5` | `#74b1f8` | pressed |
| `--toss-brand-weak` | `*-toss-brand-weak` | `#ebf2ff` | `#212b41` | 약한 배경 |
| **`--toss-positive`** | `text-toss-positive` | `#f04452` (빨강) | `#f5445a` | **상승 / +%** |
| `--toss-positive-weak` | `bg-toss-positive-weak` | `#ffeeee` | `#3e2429` | 상승 pill 배경 |
| **`--toss-negative`** | `text-toss-negative` | `#3182f6` (파랑) | `#4391ff` | **하락 / −%** |
| `--toss-negative-weak` | `bg-toss-negative-weak` | `#ebf2ff` | `#212b41` | 하락 pill 배경 |
| `--toss-danger` | `*-toss-danger` | `#f04452` | `#f5445a` | 위험 액션 |
| `--toss-warning` / `-weak` | `*-toss-warning` | `#dd7d02` / `#fff1d4` | `#fcb50c` / `#312a25` | 경고 |
| `--toss-success` / `-weak` | `*-toss-success` | `#02a262` / `#e6f7ef` | `#07a978` / `#212e2e` | 성공 |
| `--toss-border` | `border-toss-border` | `rgba(0,27,55,.10)` | `rgba(214,224,239,.09)` | 1px 헤어라인 |
| `--toss-border-strong` | `border-toss-border-strong` | `rgba(0,12,30,.19)` | `rgba(212,223,248,.19)` | 강한 보더 |
| `--toss-divider` | `*-toss-divider` | `rgba(0,12,30,.08)` | `rgba(214,224,239,.09)` | 디바이더 |
| `--toss-hover` / `--toss-pressed` | `*-toss-hover` | `rgba(0,12,30,.04)` / `.08` | … | 인터랙션 |
| `--toss-input-bg` | `bg-toss-input-bg` | `rgba(2,32,71,.05)` | `rgba(255,255,255,.06)` | 입력/2차 버튼 |
| `--toss-icon-default` | `text-toss-icon` | `rgba(3,24,50,.46)` | `rgba(255,255,255,.55)` | 기본 아이콘 |
| `--toss-focus-ring` | — | `rgba(49,130,246,.40)` | — | 포커스 링 |

> ⚠️ **한국 증권 컨벤션**: `positive = 빨강`, `negative = 파랑`. 미국식(녹색=상승)과 절대 헷갈리지 마세요. 시맨틱 토큰만 쓰면 자동으로 올바릅니다.

---

## 3. 타이포그래피

### 3.1 폰트 패밀리

전역 베이스 폰트는 **Pretendard** (`globals.css`의 `--font-sans`, `toss.css`의 `html,body` 둘 다에 지정):

```
"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont,
"Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", Roboto,
"Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", …
```

- `--font-sans` → `font-sans` (기본). `html`에 `@apply font-sans` 적용.
- `--font-mono` → Geist Mono (차트/숫자 코드용, `--font-geist-mono`).
- `--font-heading` = `--font-sans` (별도 헤딩 폰트 없음).
- 렌더링: `-webkit-font-smoothing: antialiased`, `text-rendering: optimizeLegibility`.

### 3.2 Toss 타이포 스케일 (`text-toss-*`)

size + line-height 쌍으로 `@theme`에 등록되어 `text-toss-*` 유틸리티로 사용. (※ weight는 토큰에 포함되지 않음 — 컴포넌트에서 `font-*`로 지정.)

| 유틸리티 | size / line-height | 대표 용도 |
|---|---|---|
| `text-toss-display` | 24 / 34.8 | 페이지 H1, 모달 타이틀 |
| `text-toss-title-1` | 20 / 29 | 섹션 H2, 큰 가격 |
| `text-toss-title-2` | 17 / 24.65 | 카드 타이틀, xl 버튼 |
| `text-toss-subtitle` | 15 / 21.75 | 강조 라벨 |
| `text-toss-body` | 15 / 21.75 | 본문, 기본 가격 |
| `text-toss-label` | 14 / 20.3 | 버튼 텍스트, 메뉴, 등락률 |
| `text-toss-caption` | 13 / 18.85 | 보조 설명, sm 버튼 |
| `text-toss-micro` | 12 / 17.4 | 칩, 배지, pill |
| `text-toss-tiny` | 10 / 14 | 차트 축 라벨 |

### 3.3 숫자 표시 규칙

- 가격/금액/등락 같은 **수치는 항상 `toss-numeric` 클래스** (`font-variant-numeric: tabular-nums`).
- 가격 → `PriceText` (`font-semibold`, `strong`이면 `font-bold`).
- 등락 → `DeltaBadge` (부호 자동 `+`/`−`, positive/negative 색 자동).
- 헬퍼: `formatKRW` (천단위 `,` + `원`), `formatPercent`, `formatSignedNumber` (`_utils.ts`).

---

## 4. Radius

### 4.1 shadcn 베이스 (`--radius` = `0.625rem` ≈ 10px)

`@theme inline`에서 파생: `sm = ×0.6` · `md = ×0.8` · `lg = ×1` · `xl = ×1.4` · `2xl = ×1.8` · `3xl = ×2.2` · `4xl = ×2.6`.

### 4.2 Toss radius (`rounded-toss-*`)

| 유틸리티 | px | 용도 |
|---|---|---|
| `rounded-toss-xs` | 4 | Tag, 칩 내부 액티브 |
| `rounded-toss-sm` | 6 | 작은 배지, IconButton xs |
| `rounded-toss-md` | 8 | 입력, 2차 버튼, 토글, IconButton |
| `rounded-toss-lg` | 12 | 카드, xl 버튼 |
| `rounded-toss-xl` | 16 | 모달 |
| `rounded-toss-2xl` | 20 | 큰 시트 |
| `rounded-toss-pill` | 9999 | CTA, 필터 칩, 토글, count 배지 |

---

## 5. Shadow / Elevation (`shadow-toss-*`)

토스는 **그림자보다 헤어라인을 선호** — 카드는 기본 `shadow-toss-hairline`, hover 시에만 띄웁니다.

| 유틸리티 | 값 | 용도 |
|---|---|---|
| `shadow-toss-hairline` | `inset 0 0 0 1px var(--toss-hairline)` | 카드 외곽 (보더 대용) |
| `shadow-toss-xs` | `0 1px 3px 0 rgba(0,27,55,.10)` | 떠 있는 버튼, sticky 헤더 |
| `shadow-toss-md` | 3-레이어 소프트 섀도우 | 드롭다운, hover 카드 |
| `shadow-toss-lg` | `0 4px 8px −2px …, 0 24px 32px −8px …` | 모달, 팝오버 |
| `shadow-toss-sidebar` | `−1px 0 0 …, −1px 0 20px …` | 사이드바 경계 |

---

## 6. 레이아웃 치수

raw CSS 변수로만 정의됨 (Tailwind가 `h-toss-*`를 자동 생성하지 않으므로 `h-[var(--toss-header)]` 또는 직접 `h-[52px]` 형태로 사용):

| 변수 | 값 | 용도 |
|---|---|---|
| `--toss-header` | `52px` | 상단 헤더 높이 (sticky) |
| `--toss-rail` | `60px` | 우측 아이콘 레일 |
| `--toss-sidebar` | `344px` | 우측 사이드바 폭 |

---

## 7. 다크 모드

두 시스템이 **각각 다른 메커니즘**을 씁니다 (주의):

| 시스템 | 트리거 | 비고 |
|---|---|---|
| shadcn | `.dark` 클래스 | `@custom-variant dark (&:is(.dark *))` |
| Toss | `<html data-toss-theme="dark">` 또는 OS `prefers-color-scheme` | `:root:not([data-toss-theme="light"])` fallback |

Toss 시맨틱 토큰은 자동 스왑되므로 **컴포넌트 코드는 변경 불필요**.

```tsx
<html data-toss-theme={isDark ? "dark" : "light"}>
```

유틸 클래스:
- `.toss-numeric` — `tabular-nums` + `tnum`/`lnum` on.
- `.toss-focus-ring` — `outline: 2px solid var(--toss-focus-ring); outline-offset: 2px`.

---

## 8. 컴포넌트 라이브러리 (`src/components/toss/`)

배럴 export: `import { Button, Card, PriceText, … } from "@/components/toss"`.
네임스페이스 export도 가능: `Primitives` · `Surfaces` · `Inputs` · `Data` · `Layout`.

### 8.1 Primitives

| 컴포넌트 | variant | size | 핵심 props |
|---|---|---|---|
| **Button** | `primary` · `secondary` · `ghost` · `danger` · `outline` | `sm`(h28) · `md`(h32) · `lg`(h44) · `xl`(h56) | `loading`, `leftIcon`, `rightIcon`, `fullWidth`, `asChild` |
| **IconButton** | `default` · `subtle` | `xs`(24) · `sm`(28) · `md`(32) · `lg`(40) | `icon`, `loading`, **`aria-label` 필수** |
| **Chip** | `filter` · `tag` | `sm`(h24) · `md`(h28) | `color`(neutral/brand/positive/negative), `selected`, `onRemove`, `leftIcon`, `as` |
| **Tag** | `shape`: `solid` · `soft` | (h20 고정, 11px bold) | `color`(brand/positive/negative/warning/success/neutral) — 비클릭 라벨 |
| **Badge** | `dot` · `count` | (고정) | `count`, `max`(기본 99), `color` |

- Button 기본 = `primary` / `md`. primary·danger·outline은 pill, secondary·ghost는 `rounded-toss-md`. xl만 `rounded-toss-lg`.
- Chip `filter`가 `selected`되면 `brand-weak` 배경. `onClick`/`onRemove`가 있으면 `<button>`, 없으면 `<span>`.

### 8.2 Surfaces

| 컴포넌트 | 구성 | 비고 |
|---|---|---|
| **Card** | `Card` · `CardHeader` · `CardTitle` · `CardDescription` · `CardContent` · `CardFooter` · `CardDivider` | variant: `default`(hairline) · `interactive`(hover 시 `shadow-toss-md`) · `flat`; padding: `sm`(12) · `md`(16) · `lg`(24) |
| **Modal** | compound (`Root`/`Trigger`/`Content`/`Header`/`Title`/`Description`/`Footer`/`Close`) | radius `xl`(16), `shadow-toss-lg`, 백드롭 56% |
| **Tooltip** | hover 툴팁 | `shadow-toss-md`, radius `sm` |
| **Popover** | 클릭 팝오버 | |
| **Sheet** | 사이드 드로어 | |

### 8.3 Inputs

`TextField` · `SearchField` · `SegmentedControl`(filled/underline) · `ToggleGroup` · `Tab`(라인 탭, compound) · `Switch` · `Checkbox` · `Radio`.

TextField 사이즈: `sm`(32) · `md`(40) · `lg`(48).

### 8.4 Data

| 컴포넌트 | 핵심 props |
|---|---|
| **PriceText** | `value`, `currency`(`KRW`/`USD`/`none`), `delta`, `size`(sm/md/lg/xl), `strong`, `colored`, `fractionDigits` |
| **DeltaBadge** | `delta`, `percent`, `mode`(`text`/`pill`), `size`(sm/md), `showSign`, `showPercent`, `showIcon`, `decimals` |
| **DataRow** | 라벨–값 한 줄 |
| **StockListItem** | 사이드바 관심종목 행 |
| **RankingTable** | compound (`Root`/`Head`/`HeadRow`/`Header`/`Body`/`Row`/`Cell`) — `align`, `numeric`, `interactive`, `href` |
| 기타 | `Skeleton` · `Avatar` · `Spinner` · `EmptyState` |

- **PriceText**: `colored`일 때만 delta 부호로 색 적용 (up=positive빨강 / down=negative파랑 / flat=primary). 기본은 무채색.
- **DeltaBadge**: `percent ?? delta` 부호로 방향 판단. pill 모드는 weak 배경 + micro 텍스트.

### 8.5 Layout

`Container` · `Divider` · `Header`(52px) · `SideRail`(60px) · `Sidebar`(344px) · `PanelHeader` · `PageLayout`(header/main/sidebar/rail 골격) · `TickerBar`(하단 지수 ticker).

### 8.6 shadcn UI (`src/components/ui/`)

shadcn에서 가져온 무채색 베이스 컴포넌트: `badge` · `button` · `card` · `select` · `separator` · `skeleton` · `tabs`. neutral 토큰 사용. **신규 작업은 가급적 Toss 컴포넌트를 우선.**

---

## 9. 컨벤션 & 규칙

1. **토스 토큰만 사용** — 새 컴포넌트는 `bg-toss-*` / `text-toss-*` / `rounded-toss-*` / `shadow-toss-*`. 임의 hex/rgb 금지.
2. **한국 증권 색 규칙 고정** — `positive=빨강`, `negative=파랑`. 절대 미국식으로 바꾸지 않음.
3. **수치엔 `toss-numeric`** — 가격·등락·카운트는 `tabular-nums`.
4. **카드는 헤어라인 우선** — `shadow-toss-hairline` 기본, 클릭 가능 시 `interactive`로 hover 시 띄움.
5. **CTA는 pill + Toss Blue**, 텍스트 14/600(`text-toss-label` + `font-semibold`).
6. **색 + 글자크기 동시 사용 OK** — `cn()`이 `text-toss-*` 사이즈를 font-size로 인식하므로 `text-toss-body text-toss-positive` 같이 함께 써도 색이 유지됨.
7. **폰트는 Pretendard** (Toss Product Sans는 비공개). 시스템 fallback 자동.

---

## 10. 토큰 사용법 (요약)

```tsx
// 1) Tailwind 유틸리티 (권장)
<div className="bg-toss-bg-base text-toss-text-primary rounded-toss-lg shadow-toss-hairline p-4" />

// 2) 컴포넌트
import { Card, PriceText, DeltaBadge, Button } from "@/components/toss";
<Card variant="interactive" padding="md">
  <PriceText value={274500} currency="KRW" size="lg" strong colored delta={+1200} />
  <DeltaBadge percent={0.46} mode="pill" />
  <Button variant="primary" size="md">매수</Button>
</Card>

// 3) raw CSS 변수 (커스텀 컴포넌트)
<div style={{ background: "var(--toss-brand)", color: "var(--toss-text-on-brand)" }} />
```

전체 토큰 원본은 [`src/styles/toss.css`](../../src/styles/toss.css)와 [`src/app/globals.css`](../../src/app/globals.css)를 참조하세요.
