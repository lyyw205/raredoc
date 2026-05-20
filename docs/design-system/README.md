# Toss Invest 기반 디자인 시스템

> tossinvest.com 의 라이브 디자인 토큰을 Playwright 로 추출하여 정리한 디자인 시스템.
> 이 문서는 raredoc 의 UI 를 토스증권 톤으로 통일하기 위한 단일 출처(SSoT)입니다.
> 토큰 파일: [`tokens.css`](./tokens.css)
> 레퍼런스 스크린샷: [`tossinvest-home-viewport.jpeg`](./tossinvest-home-viewport.jpeg), [`tossinvest-home-fullpage.jpeg`](./tossinvest-home-fullpage.jpeg)

---

## 1. 디자인 원칙 (관찰 기반)

분석 결과 토스증권은 다음 원칙으로 구성되어 있습니다.

1. **컨텐츠 우선, 크롬은 무채색** — 배경은 거의 모두 `#FFFFFF` 또는 `rgb(249,250,251) ≈ #F9FAFB`. 색은 데이터(상승/하락/브랜드 CTA)에만 씁니다.
2. **숫자 중심 UI** — 등락률·금액 표시가 1등 시민. 한국 관습으로 **상승=빨강 / 하락=파랑** (semantic 토큰의 `positive→red`, `negative→blue` 매핑으로 확인됨).
3. **얇은 헤어라인 + 옅은 그림자** — 박스 분리를 보더(`rgba(0,27,55,0.1)`) 또는 1px shadow 로 처리. 굵은 보더 없음.
4. **pill 또는 작은 라운딩** — 버튼은 pill(`100px`) 또는 `8px`. 카드/모달은 `12~16px`. 칩/태그는 `6px`.
5. **다층 무채색 텍스트** — 4단계 (`primary / secondary / tertiary / quaternary`) 의 opacity 기반 그레이로 정보 위계를 만듭니다.
6. **반응형 다크 모드** — 토큰이 `--tw-adaptive-*` (테마 반응) 와 `--tw-semantic-*` (역할 기반) 로 분리되어 있어 light/dark 가 자동 스왑됩니다.

---

## 2. 컬러 시스템

### 2.1 토큰 계층

토스는 3-계층 토큰을 씁니다.

```
원시(primitive) → 적응(adaptive, light/dark 자동) → 시맨틱(semantic, 역할 기반)
   blue600       --tw-adaptive-color-blue600     --tw-semantic-color-fill-brand-default
```

UI 코드에서는 **항상 시맨틱 토큰을 사용**합니다. adaptive/primitive 는 토큰 정의 내부에서만 참조합니다.

### 2.2 브랜드 컬러 (Toss Blue)

| 토큰 | Light | Dark | 용도 |
|---|---|---|---|
| `--brand-50` | `#EBF2FF` | `#202c4d` | 배경 강조 |
| `--brand-100` | `#D6E4FE` | `#212b41` | weak fill |
| `--brand-500` | `#3182F6` | `#3182f6` | **기본 CTA / 링크** |
| `--brand-600` | `#1B64DA` | `#2562b9` | hover |
| `--brand-700` | `#1957B5` | `#4391ff` | pressed / 텍스트 |

> 라이브에서 확인된 핵심값: `#3182F6` (CTA 버튼 배경, "로그인" 등).

### 2.3 의미 컬러 (KR 금융 컨벤션)

| 의미 | 라이트 텍스트 | 라이트 fill | 용도 |
|---|---|---|---|
| **상승 (positive)** | `#F04452` | `#FFEEEE` | 가격 ↑, +%, 매수 강조 |
| **하락 (negative)** | `#3182F6` | `#EBF2FF` | 가격 ↓, -%, 매도 강조 |
| **경고 (warning)** | `#DD7D02` | `#FFF1D4` | 안내 |
| **위험 (danger)** | `#F04452` | `#FFEEEE` | 파괴적 액션 |
| **성공 (success)** | `#02A262` | `rgba(26,182,122,0.08)` | 성공 토스트, 체결 완료 |

> ⚠️ raredoc 은 카드/시세 거래 도메인이라 **positive=빨강** 규칙을 따릅니다. 미국식(녹색=상승)과 헷갈리지 않도록 시맨틱 토큰만 쓰세요.

### 2.4 그레이 스케일 (텍스트/배경)

라이트 모드에서 가장 자주 등장한 무채색:

| 토큰 | 값 | 실제 쓰임 |
|---|---|---|
| `--text-primary` | `rgba(0,12,30,0.8)` | 본문 / 강조 헤드라인 |
| `--text-secondary` | `#4E5968` | 본문 |
| `--text-tertiary` | `#6B7684` | 보조 라벨 |
| `--text-quaternary` | `#8B95A1` | 비활성 / placeholder |
| `--bg-base` | `#FFFFFF` | 페이지/카드 |
| `--bg-subtle` | `#F9FAFB` | 섹션 구분 |
| `--bg-muted` | `#F2F4F6` | input / hover |
| `--hairline` | `rgba(0,27,55,0.1)` | 1px border |

### 2.5 Opacity 스케일 (그레이)

토스는 무채색을 opacity 기반으로도 운용합니다 (위에 무엇이 깔리든 자연스럽게 어우러짐).

```
greyOpacity50  rgba(0,12,30,0.04)   - 가장 옅은 hover
greyOpacity100 rgba(0,12,30,0.08)   - 디바이더, 카드 보더
greyOpacity200 rgba(0,12,30,0.13)
greyOpacity300 rgba(0,12,30,0.19)
greyOpacity500 rgba(0,12,30,0.42)
greyOpacity700 rgba(0,12,30,0.80)   - 본문 텍스트
greyOpacity900 rgba(0,12,30,0.96)   - 강조 텍스트
```

---

## 3. 타이포그래피

### 3.1 폰트 패밀리

```css
font-family: "Toss Product Sans", Tossface,
  -apple-system, BlinkMacSystemFont,
  "Noto Sans KR", "Apple SD Gothic Neo",
  Roboto, "Helvetica Neue", Arial, sans-serif,
  "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji";
```

> Toss Product Sans 는 비공개 폰트입니다. 외부 사이트에서는 **Pretendard** (오픈소스, 한글+영문 통합) 를 대체로 권장합니다. raredoc 도 Pretendard 기준으로 사용합니다.

### 3.2 타이포 스케일 (관찰값)

라이브에서 발견된 사이즈: `10, 12, 14, 15, 16, 17, 18.72(h3), 20, 24(h2)` px.

| 토큰 | size / line-height / weight | 용도 |
|---|---|---|
| `text-display` | 24 / 34.8 / 700 | 페이지 H1, 모달 타이틀 |
| `text-title-1` | 20 / 29 / 700 | 섹션 H2 |
| `text-title-2` | 17 / 24.65 / 700 | 카드 타이틀 |
| `text-subtitle` | 15 / 21.75 / 700 | 강조 라벨 |
| `text-body` | 15 / 21.75 / 500 | 본문 |
| `text-body-strong` | 15 / 21.75 / 600 | 강조 숫자 (가격, 등락) |
| `text-label` | 14 / 20.3 / 600 | 버튼 텍스트, 헤더 메뉴 |
| `text-caption` | 13 / 18.85 / 500 | 보조 설명 |
| `text-micro` | 12 / 17.4 / 700 | 칩, 배지, 카운터 |
| `text-tiny` | 10 / 14 / 600 | 차트 축 라벨 |

### 3.3 Weight

토스는 `400 / 500 / 600 / 700` 네 단계만 씁니다. (Light/Black 없음)

| 토큰 | 값 |
|---|---|
| `--font-regular` | 400 |
| `--font-medium` | 500 |
| `--font-semibold` | 600 |
| `--font-bold` | 700 |

### 3.4 숫자 표시 규칙

- 가격/금액 → `text-body-strong` (15px / 600) 이상.
- 등락률 → `text-label` (14px / 600), 색상은 positive/negative 시맨틱.
- 항상 **양수 앞에 `+`, 음수 앞에 `-`** 를 명시 (`+7.05 (0.46%)` 형태).
- 천 단위 구분자 `,` 필수. 통화 단위는 숫자 뒤 `원` 또는 `$`.

---

## 4. Spacing & Layout

### 4.1 Spacing 스케일

라이브에서 발견된 gap 값: `2, 4, 6, 8, 10, 12, 16, 24`. 4-baseline 으로 정규화합니다.

| 토큰 | px |
|---|---|
| `space-0.5` | 2 |
| `space-1` | 4 |
| `space-1.5` | 6 |
| `space-2` | 8 |
| `space-2.5` | 10 |
| `space-3` | 12 |
| `space-4` | 16 |
| `space-5` | 20 |
| `space-6` | 24 |
| `space-8` | 32 |
| `space-10` | 40 |
| `space-12` | 48 |

### 4.2 Radius 스케일

| 토큰 | px | 용도 |
|---|---|---|
| `radius-xs` | 4 | 칩 내부 액티브 |
| `radius-sm` | 6 | 칩, 작은 배지 |
| `radius-md` | 8 | 입력 / 보조 버튼 |
| `radius-lg` | 12 | 카드 |
| `radius-xl` | 16 | 모달 |
| `radius-pill` | 9999 (100px) | 기본 CTA, 토글, 필터 |
| `radius-circle` | 50% | 아바타, 아이콘 버튼 |

### 4.3 Shadow / Elevation

라이브에서 추출한 5종:

| 토큰 | 값 | 용도 |
|---|---|---|
| `shadow-hairline` | `inset 0 0 0 1px rgba(0,27,55,0.1)` | 카드 외곽 (보더 대용) |
| `shadow-xs` | `0 1px 3px 0 rgba(0,27,55,0.1)` | 떠 있는 버튼, sticky 헤더 |
| `shadow-md` | `0 0.6px 0.6px -1.25px rgba(0,0,0,0.12), 0 2.2px 2.2px -2.5px rgba(0,0,0,0.1), 0 10px 10px -3.75px rgba(0,0,0,0.043)` | 드롭다운, 툴팁 |
| `shadow-lg` | `0 4px 8px -2px rgba(0,0,0,0.1), 0 24px 32px -8px rgba(0,0,0,0.08)` | 모달, 팝오버 |
| `shadow-sidebar` | `-1px 0 0 0 rgba(2,32,71,0.05), -1px 0 20px 0 rgba(2,32,71,0.05)` | 좌측 사이드바 경계 |

토스는 **그림자보다 헤어라인을 선호**합니다. 카드는 `shadow-hairline` 기본, hover 시에만 `shadow-md` 로 띄웁니다.

### 4.4 그리드 / 레이아웃

홈 화면 분석 (`viewport 1440px`):

```
┌─────────────────────────────────────────────────────────────────┐
│  Header  52px sticky                                            │
├──────────┬──────────────────────────────┬────────────┬──────────┤
│          │                              │            │          │
│  (없음)  │     main  ≈ 1070 max         │  aside     │ rail     │
│          │                              │   344px    │  60px    │
│          │                              │            │          │
└──────────┴──────────────────────────────┴────────────┴──────────┘
```

| 항목 | 값 |
|---|---|
| 헤더 높이 | 52px (sticky, white bg, hairline bottom) |
| 메인 max-width | 1984px (확장 가능), 실측 ~1070px |
| 메인 ↔ 사이드바 gap | 24px |
| 우측 사이드바 | 344px 고정 |
| 우측 레일 (퀵 메뉴) | 60px 고정, 아이콘+라벨 |
| 본문 컨테이너 padding | 좌우 0, 상하 52px(헤더 분량) + 40px(하단) |

### 4.5 Breakpoint (권장)

토스는 PC 전용이지만 raredoc 은 모바일 우선이므로:

```
sm: 640   (모바일)
md: 768   (태블릿)
lg: 1024  (작은 데스크탑)
xl: 1280  (기본 데스크탑)
2xl:1536  (와이드)
```

---

## 5. 컴포넌트

### 5.1 Button

라이브에서 발견된 패턴:

| 변형 | bg | text | radius | font | padding | height |
|---|---|---|---|---|---|---|
| **Primary (CTA)** | `--brand-500` `#3182F6` | `#FFF` | `pill` | 14/600 | 6 12 | 32 |
| **Secondary** | `rgba(2,32,71,0.05)` | `rgba(0,12,30,0.8)` | `md` (8) | 14/600 | 6 12 | 32 |
| **Ghost** | transparent | `rgba(0,12,30,0.8)` | `md` (8) | 14/600 | 6 12 | 32 |
| **Icon-only** | transparent | `--text-primary` | circle (50%) | — | 0 0 0 2 | 44 |
| **Tab text** | transparent | `#000` | 0 (밑줄) | 16/400 | 10 0 | 39 |

크기 변형:

| size | height | font | padding | radius |
|---|---|---|---|---|
| `sm` | 28 | 13/600 | 4 10 | `md` |
| `md` (기본) | 32 | 14/600 | 6 12 | `pill` |
| `lg` | 44 | 16/600 | 12 20 | `pill` |
| `xl` | 56 | 17/700 | 16 24 | `lg` (12) |

### 5.2 Card

- bg: `#FFFFFF`
- border: 없음, 대신 `shadow-hairline`
- radius: `radius-lg` (12px)
- padding: `space-4`(16) 또는 `space-6`(24)
- 내부 섹션 사이 gap: `space-3`(12)
- hover (클릭 가능 시): `shadow-md` + `transform: translateY(-1px)`

### 5.3 Input / Search

- bg: `rgba(2,32,71,0.05)` (옅은 무채색)
- border: `1px solid rgba(2,32,71,0.05)` (있는 듯 없는)
- radius: `radius-md` (8)
- height: 32 (sm) / 40 (md) / 48 (lg)
- font: 14/400
- placeholder color: `--text-tertiary`
- focus: `outline: 2px solid --brand-500`, `border-color: --brand-500`

### 5.4 Chip / Tag / Filter Pill

- 선택 안 됨: bg transparent, text `--text-secondary`, 보더 `--hairline`
- 선택됨: bg `--brand-50` (또는 `rgba(0,12,30,0.08)`), text `--text-primary`, 보더 none
- radius: `radius-pill` (100px)
- font: 13~14 / 600
- padding: 6 12
- height: 28

### 5.5 Table (시세 랭킹)

- 행 높이: 48~52px
- zebra striping 없음 — 행 사이 hairline `--hairline` 만 사용
- 행 hover: `bg --bg-muted` (`#F2F4F6`)
- 수치 정렬: **우측 정렬**, tabular-nums 폰트 feature 필수
- 순위(1~10): 폰트 600, `--text-secondary`
- 첫 번째 컬럼(찜 아이콘): 24x24
- 등락률 셀: 작은 pill 배경(`positive-weak` / `negative-weak`)

### 5.6 Modal / Dialog

- bg: `#FFFFFF`
- radius: `radius-xl` (16)
- shadow: `shadow-lg`
- backdrop: `rgba(0,0,0,0.56)` (`--tw-semantic-color-bg-overlayDim`)
- close 버튼: 우상단 24x24 ghost
- 본문 padding: 24px
- 하단 액션: 우측 정렬, 버튼 사이 gap 8

### 5.7 Segmented Control (탭/필터)

- 컨테이너 bg: transparent
- 아이템 hover: `rgba(0,12,30,0.04)`
- 선택 아이템 bg: `rgba(0,12,30,0.08)`
- pressed: `rgba(0,12,30,0.13)`
- 라디우스: `radius-md`
- font: 14/600

### 5.8 Tooltip

- bg: `--bg-base` light / `#202025` dark
- border: `1px solid --hairline`
- radius: `radius-sm`
- shadow: `shadow-md`
- font: 13/500
- padding: 8 12

### 5.9 Badge / Pill (등락률 표시)

```
+22.44%  → bg #FFEEEE  text #F04452  pill  font 13/600  padding 2 8
-2.31%   → bg #EBF2FF  text #3182F6  pill  font 13/600  padding 2 8
```

---

## 6. 아이콘

- 기본 사이즈: **20px** (`--standard-icon-size`)
- 작은 사이즈: 16px (입력 내부)
- 큰 사이즈: 24px (헤더)
- stroke 기반, 1.5~2px weight
- color: 텍스트와 같은 위계 토큰 (`--icon-neutral-primary`, `--icon-brand`, …)

권장 아이콘 셋: [Lucide](https://lucide.dev/) 또는 [Phosphor](https://phosphoricons.com/) — 토스의 라인 굵기와 가장 유사.

---

## 7. 모션

토스는 거의 모든 인터랙션이 빠르고 잔잔합니다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `motion-fast` | `120ms cubic-bezier(0.4, 0, 0.2, 1)` | hover, color 변경 |
| `motion-base` | `200ms cubic-bezier(0.4, 0, 0.2, 1)` | 토글, 패널 |
| `motion-slow` | `320ms cubic-bezier(0.16, 1, 0.3, 1)` | 모달, 드로어 |

페이지 전환, 가격 변동 애니메이션은 **300ms 이내** 권장.

---

## 8. 적용 가이드 (raredoc 관점)

1. **컬러 토큰 마이그레이션**
   - 기존 컬러 변수 (`bg-blue-600`, hardcoded `#xxx`) 를 [`tokens.css`](./tokens.css) 의 시맨틱 변수로 교체.
   - Tailwind 사용 시 `tailwind.config.ts` 에서 `theme.extend.colors` 를 시맨틱 토큰으로 바인딩.

2. **가격/등락 컴포넌트**
   - `<PriceText delta={+0.46} />` 단일 컴포넌트로 통일. 부호·색·포맷을 캡슐화.
   - **항상 `positive=빨강` / `negative=파랑`** — 미국식 색을 쓰지 말 것.

3. **카드 패턴**
   - 외곽선 대신 `box-shadow: var(--shadow-hairline)` 만 사용.
   - 라운딩은 `radius-lg` 통일.

4. **버튼**
   - 기본 CTA 는 pill + Toss Blue.
   - 모든 텍스트는 14/600.

5. **다크 모드**
   - `:root[data-theme="dark"]` 에서 `--tw-adaptive-*` 그룹만 교체. 시맨틱 토큰은 변경 불필요.

---

## 9. 출처 / 검증

- 라이브 URL: https://www.tossinvest.com (2026-05-20 19:00 KST)
- 추출 방식: Playwright + `document.styleSheets` 순회로 707개 CSS 변수 dump.
- 핵심 namespaces: `--tw-semantic-*` (150), `--tw-adaptive-*` (126), `--wts-adaptive-*` (122), `--wts-button-*` (28), `--wts-chip-*` (9).
- 단, **`--wts-adaptive-*` 그룹은 dark 모드 기준값**이 노출됩니다. 본 문서는 라이트 모드에서 실제로 렌더된 RGB 를 우선으로 표기.

> ⚠️ 토스는 자사 디자인 토큰을 공식 공개하지 않으므로 이 문서는 **관찰 기반 모방**입니다. 상업적 재사용 시 라이선스 위험은 직접 검토하세요. 폰트는 Pretendard 등 오픈소스를 사용하세요.
