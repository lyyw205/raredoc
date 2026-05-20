# @raredoc/toss — Toss-flavored Component Library

> tossinvest.com 의 디자인 시스템을 Playwright 로 추출하여 React/Tailwind v4 로 재구현한 컴포넌트 라이브러리. raredoc 의 카드/시세/거래 UI 를 토스증권 톤으로 통일합니다.

- 디자인 토큰 정의: [`src/styles/toss.css`](../../styles/toss.css)
- 전체 디자인 시스템 문서: [`docs/design-system/README.md`](../../../docs/design-system/README.md)
- 참고 스크린샷: [`docs/design-system/tossinvest-home-viewport.jpeg`](../../../docs/design-system/tossinvest-home-viewport.jpeg)

---

## 빠른 시작

```tsx
import { Button, Card, PriceText, DeltaBadge, RankingTable } from "@/components/toss";

export function StockRow() {
  return (
    <Card padding="md">
      <Card.Title>삼성전자</Card.Title>
      <div className="flex items-center gap-2">
        <PriceText value={274_500} currency="KRW" size="lg" strong />
        <DeltaBadge delta={-1_000} percent={-0.36} />
      </div>
      <Button variant="primary">매수</Button>
    </Card>
  );
}
```

---

## 디렉토리 구조

```
src/components/toss/
├── _utils.ts            # 가격/등락 헬퍼 (formatKRW, directionFromDelta, ...)
├── index.ts             # 전체 barrel export
├── primitives/          # 가장 작은 단위 컴포넌트
│   ├── Button.tsx       # primary | secondary | ghost | danger | outline × sm | md | lg | xl
│   ├── IconButton.tsx   # 아이콘 전용 (24/28/32/40px)
│   ├── Chip.tsx         # 필터·태그용 pill
│   ├── Tag.tsx          # 비클릭 컬러 라벨 (solid/soft × 6 colors)
│   └── Badge.tsx        # 도트 / 카운트
├── surfaces/            # 면과 컨테이너
│   ├── Card.tsx         # Card · Header · Title · Description · Content · Footer · Divider
│   ├── Modal.tsx        # Dialog (compound: Root/Trigger/Content/Header/Title/...)
│   ├── Tooltip.tsx      # hover 툴팁
│   ├── Popover.tsx      # 클릭 팝오버
│   └── Sheet.tsx        # 사이드 드로어
├── inputs/              # 입력 & 선택
│   ├── TextField.tsx
│   ├── SearchField.tsx
│   ├── SegmentedControl.tsx   # filled / underline 변형
│   ├── ToggleGroup.tsx        # 시간범위 같은 가벼운 토글
│   ├── Tab.tsx                # 라인 탭 (compound)
│   ├── Switch.tsx
│   ├── Checkbox.tsx
│   └── Radio.tsx
├── data/                # 데이터 표시
│   ├── PriceText.tsx          # 가격 표시 (KRW/USD/none, delta 색 자동)
│   ├── DeltaBadge.tsx         # +0.46% / -1.32% 배지 (text | pill)
│   ├── DataRow.tsx            # 라벨-값 한 줄
│   ├── StockListItem.tsx      # 사이드바 관심종목 행
│   ├── RankingTable.tsx       # 시세 랭킹 테이블 (compound)
│   ├── Skeleton.tsx
│   ├── Avatar.tsx
│   ├── Spinner.tsx
│   └── EmptyState.tsx
└── layout/              # 페이지 골격
    ├── Container.tsx
    ├── Divider.tsx
    ├── Header.tsx             # 52px 상단 (Logo · Nav · Actions)
    ├── SideRail.tsx           # 60px 우측 아이콘 레일
    ├── Sidebar.tsx            # 344px 사이드바
    ├── PanelHeader.tsx        # 패널 상단바 (탭 + 우측 액션 + grip)
    ├── PageLayout.tsx         # header / main / sidebar / rail 골격
    └── TickerBar.tsx          # 하단 가로 스크롤 지수 ticker
```

---

## 한국 증권 시장 컨벤션

이 라이브러리는 **상승 = 빨강, 하락 = 파랑** 의 한국식 색상 규칙을 따릅니다. (미국식 녹색/빨강 아님)

| 의미 | 토큰 | 값 |
|---|---|---|
| 상승 / positive | `text-toss-positive` | `#F04452` |
| 하락 / negative | `text-toss-negative` | `#3182F6` |
| 보합 / flat | `text-toss-text-tertiary` | `#6B7684` |

`PriceText` 와 `DeltaBadge` 는 `delta` prop 부호에 따라 자동으로 색을 결정합니다.

```tsx
<PriceText value={1_510.85} delta={+7.05} colored />
// → 빨강 (delta > 0)

<DeltaBadge delta={-132.91} percent={-1.82} />
// → 파랑
```

---

## 사이즈 가이드

토스의 컴포넌트 사이즈는 다음 토큰 베이스라인을 따릅니다.

| 컴포넌트 | sm | md (default) | lg | xl |
|---|---|---|---|---|
| Button | 28h, text-caption | 32h, text-label | 44h, text-label | 56h, text-title-2 |
| IconButton | 28×28 | 32×32 | 40×40 | — |
| Avatar | 24 | 32 | 40 | 56 / 72 |
| TextField | 32 | 40 | 48 | — |
| Chip | 24 | 28 | — | — |

라운드:
- `rounded-toss-xs (4)` – 칩 내부 액티브
- `rounded-toss-sm (6)` – 작은 배지
- `rounded-toss-md (8)` – 입력, 보조 버튼, 토글
- `rounded-toss-lg (12)` – 카드
- `rounded-toss-xl (16)` – 모달
- `rounded-toss-pill (∞)` – CTA, 필터 칩, 토글

---

## 토큰 사용

CSS 변수와 Tailwind 유틸리티 둘 다 사용 가능합니다.

```tsx
// Tailwind utility
<div className="bg-toss-bg-base text-toss-text-primary rounded-toss-lg shadow-toss-hairline" />

// CSS 변수 (커스텀 컴포넌트에서)
<div style={{ background: "var(--toss-brand)", color: "var(--toss-text-on-brand)" }} />
```

전체 토큰 목록은 [`src/styles/toss.css`](../../styles/toss.css) 또는 [디자인 시스템 문서](../../../docs/design-system/README.md#2-컬러-시스템) 참조.

---

## 다크 모드

`<html data-toss-theme="dark">` 또는 OS prefers-color-scheme 으로 자동 적용. 모든 시맨틱 토큰이 자동 스왑되므로 컴포넌트 코드는 변경 불필요.

```tsx
// 수동 토글 예
<html data-toss-theme={isDark ? "dark" : "light"}>
```

---

## 패턴

### 카드 (헤어라인 + 라운드)
```tsx
<Card padding="md">
  <CardHeader>
    <CardTitle>제목</CardTitle>
    <CardDescription>부가 설명</CardDescription>
  </CardHeader>
  <CardContent>본문</CardContent>
</Card>
```

### 모달
```tsx
<Modal.Root>
  <Modal.Trigger asChild><Button>열기</Button></Modal.Trigger>
  <Modal.Content>
    <Modal.Header>
      <Modal.Title>확인</Modal.Title>
      <Modal.Close />
    </Modal.Header>
    <Modal.Description>정말 진행하시겠어요?</Modal.Description>
    <Modal.Footer>
      <Button variant="ghost">취소</Button>
      <Button variant="primary">확인</Button>
    </Modal.Footer>
  </Modal.Content>
</Modal.Root>
```

### 시세 랭킹 테이블
```tsx
<RankingTable.Root>
  <RankingTable.Head>
    <RankingTable.HeadRow>
      <RankingTable.Header>순위</RankingTable.Header>
      <RankingTable.Header>종목</RankingTable.Header>
      <RankingTable.Header align="right">현재가</RankingTable.Header>
      <RankingTable.Header align="right">등락률</RankingTable.Header>
    </RankingTable.HeadRow>
  </RankingTable.Head>
  <RankingTable.Body>
    {stocks.map(s => (
      <RankingTable.Row key={s.id} interactive href={`/stocks/${s.code}`}>
        <RankingTable.Cell numeric>{s.rank}</RankingTable.Cell>
        <RankingTable.Cell>{s.name}</RankingTable.Cell>
        <RankingTable.Cell align="right" numeric>
          <PriceText value={s.price} currency="KRW" />
        </RankingTable.Cell>
        <RankingTable.Cell align="right">
          <DeltaBadge percent={s.percent} mode="pill" />
        </RankingTable.Cell>
      </RankingTable.Row>
    ))}
  </RankingTable.Body>
</RankingTable.Root>
```

---

## 의존성

- React 19, Next.js 16 (App Router)
- Tailwind v4 (`@theme inline` 으로 토큰 노출)
- `class-variance-authority`, `clsx`, `tailwind-merge`
- `lucide-react` (아이콘)
- `next/link` (Header/SideRail 등 내부에서 사용)

---

## 비교: tossinvest.com 측정값 vs 본 라이브러리

| 항목 | Toss 실측 | 본 라이브러리 |
|---|---|---|
| CTA Button | h32, pill, 14/600, padding 6 12, bg #3182f6 | ✅ 동일 |
| Toggle pill (시간범위) | h32, radius 8, padding 6 12, bg `rgba(2,32,71,0.05)` | ✅ 동일 (`rounded-toss-md`, `bg-toss-input-bg`) |
| IconButton | 32×32, radius 8, padding 6 8, color `rgba(3,24,50,0.46)` | ✅ 동일 (`text-toss-icon`) |
| 닫기 X | 24×24, radius 6, padding 2 4 | ✅ `IconButton size="xs"` |
| Header | h52, sticky, hairline border | ✅ `Header.Root sticky bordered` |
| Sidebar | w344, hairline left border | ✅ `Sidebar position="right"` |
| Card | bg white, shadow-hairline, radius 12 | ✅ 동일 |
| Modal | bg white, radius 16, shadow-lg, backdrop 56% | ✅ 동일 |
| Color (KR) | positive=빨강 / negative=파랑 | ✅ 동일 |

---

## 변경 시 주의

1. 새 컴포넌트를 만들 때는 **반드시 토스 토큰만 사용** (`bg-toss-*`, `text-toss-*`, `rounded-toss-*`). 임의 hex/rgb 값 금지.
2. 한국 증권 컨벤션 (positive=빨강) 을 절대 미국식으로 바꾸지 마세요.
3. 가격/숫자는 항상 `font-variant-numeric: tabular-nums` (className: `toss-numeric`) 적용.
4. 폰트는 Pretendard 권장 (Toss Product Sans 는 비공개). 시스템에 따라 fallback 됩니다.
