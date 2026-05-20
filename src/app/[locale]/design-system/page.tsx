"use client";

import * as React from "react";
import {
  Bell,
  Heart,
  Menu,
  Search,
  TrendingUp,
  X,
  BarChart2,
  PackageSearch,
} from "lucide-react";

// primitives
import { Badge, Button, Chip, IconButton, Tag } from "@/components/toss";
// surfaces
import { Card, CardContent, CardDescription, CardDivider, CardFooter, CardHeader, CardTitle } from "@/components/toss";
import { Modal } from "@/components/toss";
import { Popover } from "@/components/toss";
import { Sheet } from "@/components/toss";
import { Tooltip } from "@/components/toss";
// inputs
import { Checkbox, Radio, SearchField, SegmentedControl, Switch, Tab, TextField, ToggleGroup } from "@/components/toss";
// data
import { Avatar, DataRow, DeltaBadge, EmptyState, PriceText, RankingTable, Skeleton, Spinner, StockListItem } from "@/components/toss";
// layout
import { Container, Divider, Header } from "@/components/toss";
import { formatKRW, formatPercent } from "@/components/toss";

// ── 샘플 데이터 ──────────────────────────────────────────────────────────────

const STOCKS = [
  { rank: 1, name: "SK하이닉스",  code: "A000660", price: 1721000, delta: -24000,  percent: -1.37,  volume: 420 },
  { rank: 2, name: "삼성전자",    code: "A005930", price: 274500,  delta: -1000,   percent: -0.36,  volume: 401 },
  { rank: 3, name: "광전자",      code: "A017900", price: 12450,   delta: +2870,   percent: +29.95, volume: 119 },
  { rank: 4, name: "빛과전자",    code: "A069540", price: 5640,    delta: +1030,   percent: +22.34, volume: 80  },
  { rank: 5, name: "현대차",      code: "A005380", price: 586000,  delta: -18000,  percent: -2.98,  volume: 114 },
];

const COLOR_SWATCHES = [
  { name: "brand",           cls: "bg-toss-brand",           cssVar: "--toss-brand" },
  { name: "brand-hover",     cls: "bg-toss-brand-hover",     cssVar: "--toss-brand-hover" },
  { name: "brand-weak",      cls: "bg-toss-brand-weak",      cssVar: "--toss-brand-weak" },
  { name: "positive",        cls: "bg-toss-positive",        cssVar: "--toss-positive" },
  { name: "positive-weak",   cls: "bg-toss-positive-weak",   cssVar: "--toss-positive-weak" },
  { name: "negative",        cls: "bg-toss-negative",        cssVar: "--toss-negative" },
  { name: "negative-weak",   cls: "bg-toss-negative-weak",   cssVar: "--toss-negative-weak" },
  { name: "warning",         cls: "bg-toss-warning",         cssVar: "--toss-warning" },
  { name: "success",         cls: "bg-toss-success",         cssVar: "--toss-success" },
  { name: "text-primary",    cls: "bg-toss-text-primary",    cssVar: "--toss-text-primary" },
  { name: "text-secondary",  cls: "bg-toss-text-secondary",  cssVar: "--toss-text-secondary" },
  { name: "bg-subtle",       cls: "bg-toss-bg-subtle",       cssVar: "--toss-bg-subtle" },
];

function ColorSwatch({ name, cls, cssVar }: { name: string; cls: string; cssVar: string }) {
  const [resolved, setResolved] = React.useState<string>("");
  React.useEffect(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    setResolved(raw);
  }, [cssVar]);
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`${cls} h-12 rounded-toss-md shadow-toss-hairline`} />
      <span className="text-toss-micro font-semibold text-toss-text-secondary">{name}</span>
      <span className="text-toss-micro text-toss-text-tertiary">{resolved || cssVar}</span>
    </div>
  );
}

const TYPO_SAMPLES = [
  { cls: "text-toss-display",    label: "display" },
  { cls: "text-toss-title-1",    label: "title-1" },
  { cls: "text-toss-title-2",    label: "title-2" },
  { cls: "text-toss-subtitle",   label: "subtitle" },
  { cls: "text-toss-body",       label: "body" },
  { cls: "text-toss-label",      label: "label" },
  { cls: "text-toss-caption",    label: "caption" },
  { cls: "text-toss-micro",      label: "micro" },
  { cls: "text-toss-tiny",       label: "tiny" },
];

// ── 섹션 헤더 헬퍼 ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-toss-title-1 font-bold text-toss-text-primary mb-1">{children}</h2>
  );
}

function SectionDesc({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-toss-caption text-toss-text-tertiary mb-6">{children}</p>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-toss-micro text-toss-text-tertiary">{children}</span>
  );
}

// ── 페이지 ────────────────────────────────────────────────────────────────────

export default function DesignSystemPage() {
  // Segmented / Toggle state
  const [market, setMarket] = React.useState("all");
  const [marketUl, setMarketUl] = React.useState("all");
  const [period, setPeriod] = React.useState("1d");
  // Tab state
  const [tabValue, setTabValue] = React.useState("chart");
  // Switch / Checkbox / Radio
  const [sw1, setSw1] = React.useState(true);
  const [sw2, setSw2] = React.useState(false);
  const [cb1, setCb1] = React.useState(true);
  const [cb2, setCb2] = React.useState(false);
  const [radio, setRadio] = React.useState("a");
  // Modal / Sheet
  const [modalOpen, setModalOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  // Favorites
  const [favs, setFavs] = React.useState<Set<string>>(new Set(["A000660"]));

  return (
    <div className="min-h-screen bg-toss-bg-subtle">
      {/* ── 페이지 헤더 ───────────────────────────────────────────── */}
      <Header sticky bordered>
        <Header.Inner>
          <Header.Logo>디자인 시스템</Header.Logo>
          <Header.Actions>
            <IconButton aria-label="검색" icon={<Search size={18} />} />
            <IconButton aria-label="알림" icon={<Bell size={18} />} />
          </Header.Actions>
        </Header.Inner>
      </Header>

      <Container className="py-12 space-y-16">

        {/* ①  컬러 토큰 */}
        <section>
          <SectionTitle>컬러 토큰</SectionTitle>
          <SectionDesc>bg-toss-* 시맨틱 색상 팔레트</SectionDesc>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {COLOR_SWATCHES.map((swatch) => (
              <ColorSwatch key={swatch.name} {...swatch} />
            ))}
          </div>
        </section>

        <Divider />

        {/* ②  타이포그래피 */}
        <section>
          <SectionTitle>타이포그래피</SectionTitle>
          <SectionDesc>text-toss-* 텍스트 스케일</SectionDesc>
          <div className="space-y-3">
            {TYPO_SAMPLES.map(({ cls, label }) => (
              <div key={label} className="flex items-baseline gap-4">
                <span className="w-20 text-toss-micro text-toss-text-tertiary shrink-0">{label}</span>
                <span className={`${cls} font-semibold text-toss-text-primary toss-numeric`}>
                  1,234,567원
                </span>
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* ③  Buttons */}
        <section>
          <SectionTitle>Button</SectionTitle>
          <SectionDesc>variant 5종 × size 4종</SectionDesc>
          <div className="space-y-4">
            {(["primary", "secondary", "ghost", "danger", "outline"] as const).map((variant) => (
              <div key={variant} className="flex flex-wrap items-center gap-3">
                <Label>{variant}</Label>
                <Button variant={variant} size="sm">sm</Button>
                <Button variant={variant} size="md">md</Button>
                <Button variant={variant} size="lg">lg</Button>
                <Button variant={variant} size="xl">xl</Button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <Button variant="primary" loading>로딩 중</Button>
              <Button variant="primary" leftIcon={<TrendingUp size={16} />}>매수하기</Button>
              <Button variant="primary" fullWidth className="max-w-xs">전체 너비</Button>
            </div>
          </div>
        </section>

        <Divider />

        {/* ④  Icon Buttons */}
        <section>
          <SectionTitle>IconButton</SectionTitle>
          <SectionDesc>size 4종 × variant 2종</SectionDesc>
          <div className="flex flex-wrap gap-4 items-center">
            {(["xs", "sm", "md", "lg"] as const).map((size) => (
              <div key={size} className="flex flex-col items-center gap-2">
                <IconButton aria-label="닫기" size={size} icon={<X size={14} />} />
                <Label>{size}</Label>
              </div>
            ))}
            <div className="w-px h-8 bg-toss-divider mx-2" />
            <IconButton aria-label="검색" variant="subtle" icon={<Search size={18} />} />
            <IconButton aria-label="관심종목" variant="subtle" icon={<Heart size={18} />} />
            <IconButton aria-label="알림" variant="subtle" icon={<Bell size={18} />} />
            <IconButton aria-label="메뉴" variant="default" icon={<Menu size={18} />} />
          </div>
        </section>

        <Divider />

        {/* ⑤  Chip / Tag / Badge */}
        <section>
          <SectionTitle>Chip · Tag · Badge</SectionTitle>
          <SectionDesc>필터 칩, 태그, 배지</SectionDesc>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <Label>Chip filter</Label>
              <Chip variant="filter" onClick={() => {}}>전체</Chip>
              <Chip variant="filter" selected onClick={() => {}}>국내주식</Chip>
              <Chip variant="filter" color="brand" onClick={() => {}}>해외주식</Chip>
              <Chip variant="filter" color="positive" selected onClick={() => {}}>급등</Chip>
              <Chip variant="filter" color="negative" onClick={() => {}}>급락</Chip>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Label>Chip tag</Label>
              <Chip variant="tag" size="sm">sm 태그</Chip>
              <Chip variant="tag" size="md">md 태그</Chip>
              <Chip variant="tag" size="md" onRemove={() => {}}>삭제 가능</Chip>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Label>Tag</Label>
              <Tag color="brand" shape="solid">매수</Tag>
              <Tag color="positive" shape="solid">상승</Tag>
              <Tag color="negative" shape="solid">하락</Tag>
              <Tag color="warning" shape="solid">주의</Tag>
              <Tag color="brand" shape="soft">브랜드</Tag>
              <Tag color="success" shape="soft">성공</Tag>
              <Tag color="neutral" shape="soft">중립</Tag>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Label>Badge</Label>
              <Badge variant="dot" color="brand" />
              <Badge variant="dot" color="positive" />
              <Badge variant="dot" color="negative" />
              <Badge variant="count" count={3} color="brand" />
              <Badge variant="count" count={42} color="positive" />
              <Badge variant="count" count={120} max={99} color="negative" />
            </div>
          </div>
        </section>

        <Divider />

        {/* ⑥  Inputs */}
        <section>
          <SectionTitle>TextField · SearchField</SectionTitle>
          <SectionDesc>텍스트 입력 컴포넌트</SectionDesc>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <TextField placeholder="기본 입력" />
            <TextField label="종목 이름" placeholder="삼성전자" />
            <TextField
              label="수량"
              placeholder="0"
              leftIcon={<BarChart2 size={16} className="text-toss-icon" />}
            />
            <TextField
              label="에러 상태"
              placeholder="잘못된 값"
              errorText="올바른 값을 입력해주세요"
              defaultValue="abc"
            />
            <div className="sm:col-span-2">
              <SearchField placeholder="종목 검색" shortcut="/" />
            </div>
          </div>
        </section>

        <Divider />

        {/* ⑦  Selectors */}
        <section>
          <SectionTitle>SegmentedControl · ToggleGroup</SectionTitle>
          <SectionDesc>시장 필터, 기간 선택</SectionDesc>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>SegmentedControl filled</Label>
              <SegmentedControl
                variant="filled"
                value={market}
                onChange={setMarket}
                options={[
                  { value: "all",    label: "전체" },
                  { value: "domestic", label: "국내" },
                  { value: "global",   label: "해외" },
                ]}
                className="max-w-xs"
              />
            </div>
            <div className="space-y-2">
              <Label>SegmentedControl underline</Label>
              <SegmentedControl
                variant="underline"
                value={marketUl}
                onChange={setMarketUl}
                options={[
                  { value: "all",    label: "전체" },
                  { value: "domestic", label: "국내" },
                  { value: "global",   label: "해외" },
                ]}
                className="max-w-xs"
              />
            </div>
            <div className="space-y-2">
              <Label>ToggleGroup</Label>
              <ToggleGroup
                value={period}
                onChange={setPeriod}
                options={[
                  { value: "1m",  label: "1분" },
                  { value: "1d",  label: "일" },
                  { value: "1w",  label: "주" },
                  { value: "1mo", label: "월" },
                  { value: "1y",  label: "년" },
                ]}
              />
            </div>
          </div>
        </section>

        <Divider />

        {/* ⑧  Tab */}
        <section>
          <SectionTitle>Tab</SectionTitle>
          <SectionDesc>탭 컴포넌트 (compound)</SectionDesc>
          <Tab.Root value={tabValue} onChange={setTabValue} className="max-w-lg">
            <Tab.List>
              <Tab.Trigger value="chart">차트</Tab.Trigger>
              <Tab.Trigger value="info">종목정보</Tab.Trigger>
              <Tab.Trigger value="news">뉴스</Tab.Trigger>
              <Tab.Trigger value="fin" disabled>재무제표</Tab.Trigger>
            </Tab.List>
            <Tab.Panel value="chart" className="pt-4">
              <p className="text-toss-body text-toss-text-secondary">차트 패널 콘텐츠</p>
            </Tab.Panel>
            <Tab.Panel value="info" className="pt-4">
              <p className="text-toss-body text-toss-text-secondary">종목정보 패널 콘텐츠</p>
            </Tab.Panel>
            <Tab.Panel value="news" className="pt-4">
              <p className="text-toss-body text-toss-text-secondary">뉴스 패널 콘텐츠</p>
            </Tab.Panel>
          </Tab.Root>
        </section>

        <Divider />

        {/* ⑨  Switch / Checkbox / Radio */}
        <section>
          <SectionTitle>Switch · Checkbox · Radio</SectionTitle>
          <SectionDesc>선택 입력 컴포넌트</SectionDesc>
          <div className="flex flex-wrap gap-8">
            <div className="space-y-3">
              <Label>Switch</Label>
              <div className="flex items-center gap-3">
                <Switch checked={sw1} onCheckedChange={setSw1} />
                <span className="text-toss-label text-toss-text-secondary">알림 켜짐</span>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={sw2} onCheckedChange={setSw2} size="sm" />
                <span className="text-toss-label text-toss-text-secondary">소형 (sm)</span>
              </div>
            </div>
            <div className="space-y-3">
              <Label>Checkbox</Label>
              <div className="flex items-center gap-3">
                <Checkbox checked={cb1} onCheckedChange={setCb1} />
                <span className="text-toss-label text-toss-text-secondary">동의합니다</span>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox checked={cb2} onCheckedChange={setCb2} size="sm" />
                <span className="text-toss-label text-toss-text-secondary">소형 (sm)</span>
              </div>
            </div>
            <div className="space-y-3">
              <Label>Radio</Label>
              {["a", "b", "c"].map((v) => (
                <div key={v} className="flex items-center gap-3">
                  <Radio
                    checked={radio === v}
                    onCheckedChange={() => setRadio(v)}
                  />
                  <span className="text-toss-label text-toss-text-secondary">옵션 {v.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ⑩  Cards */}
        <section>
          <SectionTitle>Card</SectionTitle>
          <SectionDesc>default · interactive · flat, padding 변형</SectionDesc>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card variant="default" padding="md">
              <CardHeader>
                <CardTitle>기본 카드</CardTitle>
                <Badge variant="count" count={3} color="brand" />
              </CardHeader>
              <CardDescription>default / md padding</CardDescription>
              <CardDivider />
              <CardContent>
                <p className="text-toss-body text-toss-text-secondary">콘텐츠 영역</p>
              </CardContent>
              <CardFooter className="mt-4 justify-end">
                <Button variant="ghost" size="sm">자세히</Button>
              </CardFooter>
            </Card>

            <Card variant="interactive" padding="lg">
              <CardHeader>
                <CardTitle>인터랙티브 카드</CardTitle>
              </CardHeader>
              <CardDescription>interactive / lg — hover 시 그림자</CardDescription>
              <CardContent className="mt-3">
                <PriceText value={274500} size="lg" strong />
              </CardContent>
            </Card>

            <Card variant="flat" padding="sm">
              <CardHeader>
                <CardTitle>플랫 카드</CardTitle>
              </CardHeader>
              <CardDescription>flat / sm padding — 그림자 없음</CardDescription>
              <CardContent className="mt-3">
                <p className="text-toss-caption text-toss-text-tertiary">보조 정보</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Divider />

        {/* ⑪  Data Display */}
        <section>
          <SectionTitle>데이터 표시</SectionTitle>
          <SectionDesc>PriceText · DeltaBadge · DataRow · StockListItem · Avatar</SectionDesc>

          {/* PriceText */}
          <div className="mb-6">
            <Label>PriceText</Label>
            <div className="flex flex-wrap gap-4 mt-2 items-baseline">
              <PriceText value={274500} size="sm" />
              <PriceText value={274500} size="md" />
              <PriceText value={274500} size="lg" strong />
              <PriceText value={274500} size="xl" strong />
              <PriceText value={274500} size="md" delta={-1000} colored />
              <PriceText value={12450}  size="md" delta={2870}  colored />
            </div>
          </div>

          {/* DeltaBadge */}
          <div className="mb-6">
            <Label>DeltaBadge</Label>
            <div className="flex flex-wrap gap-3 mt-2 items-center">
              <DeltaBadge percent={-1.37} />
              <DeltaBadge percent={+29.95} />
              <DeltaBadge percent={0} />
              <DeltaBadge percent={-2.98} mode="pill" />
              <DeltaBadge percent={+22.34} mode="pill" />
              <DeltaBadge percent={-1.37} showIcon />
            </div>
          </div>

          {/* DataRow */}
          <div className="mb-6 max-w-sm">
            <Label>DataRow</Label>
            <Card variant="default" padding="sm" className="mt-2 divide-y divide-toss-divider">
              <DataRow label="현재가" value={`${formatKRW(274500)}원`} />
              <DataRow label="등락률" value={formatPercent(-0.36)} delta={<DeltaBadge percent={-0.36} />} />
              <DataRow label="거래대금" value="401억" compact />
              <DataRow label="상세 보기" value="" rightIcon={<span className="text-toss-text-tertiary">›</span>} interactive />
            </Card>
          </div>

          {/* StockListItem */}
          <div className="mb-6 max-w-sm">
            <Label>StockListItem</Label>
            <div className="mt-2 space-y-1">
              {STOCKS.slice(0, 3).map((s) => (
                <StockListItem
                  key={s.code}
                  name={s.name}
                  price={s.price}
                  percent={s.percent}
                  rank={s.rank}
                  favorited={favs.has(s.code)}
                  onFavoriteToggle={() =>
                    setFavs((prev) => {
                      const next = new Set(prev);
                      next.has(s.code) ? next.delete(s.code) : next.add(s.code);
                      return next;
                    })
                  }
                />
              ))}
            </div>
          </div>

          {/* Avatar */}
          <div>
            <Label>Avatar</Label>
            <div className="flex flex-wrap gap-4 mt-2 items-end">
              {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
                <div key={size} className="flex flex-col items-center gap-1.5">
                  <Avatar name="김영우" size={size} />
                  <Label>{size}</Label>
                </div>
              ))}
              <Avatar name="박지수" size="md" status="online" />
              <Avatar name="이도현" size="md" status="busy" />
              <Avatar name="최민준" size="md" shape="rounded" />
            </div>
          </div>
        </section>

        <Divider />

        {/* ⑫  RankingTable */}
        <section>
          <SectionTitle>RankingTable</SectionTitle>
          <SectionDesc>순위 / 종목 / 현재가 / 등락률 / 거래대금</SectionDesc>
          <Card variant="default" padding="sm" className="max-w-2xl overflow-hidden">
            <RankingTable.Root>
              <RankingTable.Head>
                <RankingTable.HeadRow>
                  <RankingTable.Header className="max-w-[40px]">순위</RankingTable.Header>
                  <RankingTable.Header>종목</RankingTable.Header>
                  <RankingTable.Header align="right">현재가</RankingTable.Header>
                  <RankingTable.Header align="right">등락률</RankingTable.Header>
                  <RankingTable.Header align="right">거래대금</RankingTable.Header>
                </RankingTable.HeadRow>
              </RankingTable.Head>
              <RankingTable.Body>
                {STOCKS.map((s) => (
                  <RankingTable.Row key={s.code} interactive>
                    <RankingTable.Cell className="max-w-[40px] text-toss-text-tertiary toss-numeric font-bold">{s.rank}</RankingTable.Cell>
                    <RankingTable.Cell className="font-semibold text-toss-text-primary">{s.name}</RankingTable.Cell>
                    <RankingTable.Cell align="right" numeric>{formatKRW(s.price)}원</RankingTable.Cell>
                    <RankingTable.Cell align="right">
                      <DeltaBadge percent={s.percent} />
                    </RankingTable.Cell>
                    <RankingTable.Cell align="right" numeric>{s.volume}억</RankingTable.Cell>
                  </RankingTable.Row>
                ))}
              </RankingTable.Body>
            </RankingTable.Root>
          </Card>
        </section>

        <Divider />

        {/* ⑬  Skeleton / Spinner / EmptyState */}
        <section>
          <SectionTitle>Skeleton · Spinner · EmptyState</SectionTitle>
          <SectionDesc>로딩 & 빈 상태</SectionDesc>
          <div className="flex flex-wrap gap-8 items-start">
            <div className="space-y-2 w-52">
              <Label>Skeleton</Label>
              <div className="flex items-center gap-2 mt-2">
                <Skeleton.Avatar />
                <div className="flex-1 space-y-2">
                  <Skeleton.Text width="80%" />
                  <Skeleton.Text width="50%" />
                </div>
              </div>
              <Skeleton.Card />
            </div>
            <div className="space-y-3">
              <Label>Spinner</Label>
              <div className="flex gap-4 mt-2 items-center">
                <Spinner size={16} />
                <Spinner size={24} />
                <Spinner size={32} color="text" />
              </div>
            </div>
            <div className="w-60">
              <Label>EmptyState</Label>
              <EmptyState
                icon={<PackageSearch />}
                title="결과 없음"
                description="검색어를 바꿔보세요"
                action={<Button variant="secondary" size="sm">초기화</Button>}
              />
            </div>
          </div>
        </section>

        <Divider />

        {/* ⑭  Surfaces */}
        <section>
          <SectionTitle>Surfaces</SectionTitle>
          <SectionDesc>Modal · Tooltip · Popover · Sheet</SectionDesc>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Modal */}
            <div className="flex flex-col gap-1 items-center">
              <Button variant="secondary" onClick={() => setModalOpen(true)}>모달 열기</Button>
              <Label>Modal</Label>
            </div>

            <Modal.Root open={modalOpen} onOpenChange={setModalOpen}>
              <Modal.Content>
                <Modal.Header>
                  <Modal.Title>매수 확인</Modal.Title>
                  <Modal.Close />
                </Modal.Header>
                <Modal.Description>삼성전자 10주를 274,500원에 매수하시겠어요?</Modal.Description>
                <Modal.Footer>
                  <Button variant="ghost" size="md" onClick={() => setModalOpen(false)}>취소</Button>
                  <Button variant="primary" size="md" onClick={() => setModalOpen(false)}>매수</Button>
                </Modal.Footer>
              </Modal.Content>
            </Modal.Root>

            {/* Tooltip */}
            <div className="flex flex-col gap-1 items-center">
              <Tooltip content="종목 상세 페이지로 이동합니다" side="top">
                <Button variant="secondary">Tooltip 호버</Button>
              </Tooltip>
              <Label>Tooltip</Label>
            </div>

            {/* Popover */}
            <div className="flex flex-col gap-1 items-center">
              <Popover.Root>
                <Popover.Trigger asChild>
                  <Button variant="secondary">Popover 열기</Button>
                </Popover.Trigger>
                <Popover.Content className="p-4">
                  <p className="text-toss-label font-semibold text-toss-text-primary mb-1">필터 옵션</p>
                  <p className="text-toss-caption text-toss-text-tertiary">정렬 기준을 선택하세요</p>
                  <div className="mt-3 space-y-1">
                    {["시가총액순", "등락률순", "거래대금순"].map((opt) => (
                      <button key={opt} className="block w-full text-left px-2 py-1.5 rounded-toss-sm text-toss-label text-toss-text-secondary hover:bg-toss-hover transition-colors">
                        {opt}
                      </button>
                    ))}
                  </div>
                </Popover.Content>
              </Popover.Root>
              <Label>Popover</Label>
            </div>

            {/* Sheet */}
            <div className="flex flex-col gap-1 items-center">
              <Button variant="secondary" onClick={() => setSheetOpen(true)}>Sheet 열기</Button>
              <Label>Sheet</Label>
            </div>
          </div>
        </section>

      </Container>

      {/* Sheet (portal, rendered outside Container) */}
      <Sheet.Root open={sheetOpen} onOpenChange={setSheetOpen} width={360}>
        <Sheet.Header>
          <Sheet.Title>종목 상세</Sheet.Title>
          <Sheet.Close />
        </Sheet.Header>
        <Sheet.Content>
          <div className="space-y-2">
            {STOCKS.map((s) => (
              <StockListItem
                key={s.code}
                name={s.name}
                price={s.price}
                percent={s.percent}
                rank={s.rank}
              />
            ))}
          </div>
        </Sheet.Content>
        <Sheet.Footer>
          <Button variant="ghost" size="md" onClick={() => setSheetOpen(false)}>닫기</Button>
        </Sheet.Footer>
      </Sheet.Root>
    </div>
  );
}
