"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardDivider,
  SearchField,
  ToggleGroup,
  EmptyState,
  Tab,
} from "@/components/toss";
import { cn } from "@/lib/utils";
import type { RulingRow, GlossaryRow, ResolvedCard } from "@/lib/services/cardgame";
import { BookOpen, ExternalLink } from "lucide-react";

// ── FAQ 데이터 ────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "어디서 카드를 살 수 있나요?",
    a: "국내에서는 포켓몬 공식 샵, 대형 완구점(토이저러스·하비샵), 편의점(CU·GS25 일부 지점), 온라인 쇼핑몰(스마트스토어·쿠팡 등)에서 구매 가능합니다. 정가보다 비싸게 파는 경우도 있으니 공식 가격을 먼저 확인하세요.",
  },
  {
    q: "한국 발매일과 일본 발매일은 왜 다른가요?",
    a: "포켓몬 카드게임은 일본에서 먼저 발매된 후 한국, 북미, 유럽 등 각 지역에 순차 발매됩니다. 한국은 보통 일본 발매 후 약 30~60일 후 한국포켓몬(The Pokémon Company Korea)을 통해 정식 발매됩니다.",
  },
  {
    q: "PTCGL은 어떻게 시작하나요?",
    a: "Pokémon Trading Card Game Live(PTCGL)는 공식 홈페이지(tcg.pokemon.com)에서 무료로 다운로드할 수 있습니다. 튜토리얼 완료 후 스타터 덱을 받아 바로 대전이 가능합니다. 실물 카드의 QR 코드를 스캔하면 디지털 카드로 전환할 수도 있습니다.",
  },
  {
    q: "시티리그 참가 자격은 어떻게 되나요?",
    a: "시티리그는 만 11세 이상이면 누구나 참가 가능합니다(주니어/시니어/마스터 부문 구분). 참가 신청은 공식 이벤트 페이지 또는 주최 샵을 통해 사전 접수가 일반적입니다. 정규 인증 카드게임샵에서 주로 개최됩니다.",
  },
  {
    q: "포켓 카드와 본가 카드는 호환되나요?",
    a: "호환되지 않습니다. 포켓몬 카드 게임 포켓(Pocket)은 모바일 전용 디지털 게임으로 실물 카드와는 별도의 규칙과 포맷을 사용합니다. 실물 카드와 PTCGL 카드도 직접 호환되지 않으며 QR 코드 변환이 필요합니다.",
  },
  {
    q: "덱은 몇 장으로 구성하나요?",
    a: "공식 규칙에 따라 정확히 60장으로 구성해야 합니다. 같은 카드명(한국어 기준)은 최대 4장까지 채용 가능합니다. 단, 기본 에너지 카드는 4장 제한이 없습니다.",
  },
  {
    q: "MUR 카드는 박스에서 꼭 나오나요?",
    a: "MUR(메가 울트라 레어)는 박스당 약 0.02장 확률로, 사실상 박스 1개로는 거의 나오지 않습니다. 평균적으로 박스 50개 이상을 열어야 1장 기대치가 됩니다. 봉입률 페이지에서 정확한 통계를 확인하세요.",
  },
  {
    q: "레귤레이션 마크가 없는 카드는 사용할 수 없나요?",
    a: "레귤레이션 마크가 없는 구 카드(XY 시리즈 이전)는 스탠다드·익스텐디드 포맷에서 사용할 수 없습니다. 殿堂(전당) 포맷에서는 특정 조건 하에 사용 가능한 경우가 있습니다. 항상 주최 측 공지를 확인하세요.",
  },
];

// ── 가나다/알파벳 인덱스 ──────────────────────────────────────────────────────

function getInitial(term: string): string {
  const first = term[0];
  const code = first.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const initials = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    return initials[Math.floor((code - 0xAC00) / 588)];
  }
  if (first >= "A" && first <= "Z") return first;
  if (first >= "a" && first <= "z") return first.toUpperCase();
  return "#";
}

// ── 추천 스타터 덱 mock ───────────────────────────────────────────────────────

const STARTER_DECKS = [
  {
    id: "starter-darkrai",
    name: "다크라이 스타터",
    description: "메가다크라이 ex를 중심으로 초보자도 쉽게 다룰 수 있는 구성. 에너지 가속과 수면 전략을 배울 수 있습니다.",
    heroCardId: "m5-118",
    price: "12,000원",
    level: "입문",
  },
  {
    id: "starter-dragapult",
    name: "드라파르트 스타터",
    description: "스프레드 딜링 전략을 배울 수 있는 덱. 벤치 관리와 에너지 이동의 기초를 익히기에 최적.",
    heroCardId: "m5-120",
    price: "12,000원",
    level: "초급",
  },
  {
    id: "starter-pikachu",
    name: "피카츄 스타터",
    description: "번개 타입의 기본기를 다지는 입문 덱. 빠른 템포와 마비 효과로 상대를 제압하는 전략 학습.",
    heroCardId: "sv3pt5-215",
    price: "12,000원",
    level: "입문",
  },
];

// ── 탭 1: 입문 ────────────────────────────────────────────────────────────────

function BeginnerTab({ starterCards }: { starterCards: Record<string, ResolvedCard> }) {
  return (
    <div className="space-y-8">
      {/* 추천 스타터덱 */}
      <section>
        <h3 className="text-toss-title font-bold text-toss-text-primary mb-4">첫 덱 만들기</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {STARTER_DECKS.map((deck) => {
            const card = starterCards[deck.heroCardId];
            return (
              <Card key={deck.id} variant="default" padding="md">
                <div className="flex gap-3 mb-3">
                  {card?.imageUrl && (
                    <div className="w-14 aspect-[5/7] rounded overflow-hidden bg-toss-bg-muted shrink-0">
                      <img src={card.imageUrl} alt={card.nameKo} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-toss-label font-bold text-toss-text-primary">{deck.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-toss-brand/10 text-toss-brand font-semibold">
                        {deck.level}
                      </span>
                      <span className="text-toss-micro text-toss-text-tertiary">{deck.price}</span>
                    </div>
                  </div>
                </div>
                <p className="text-toss-caption text-toss-text-secondary">{deck.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 5분 룰 요약 */}
      <section>
        <h3 className="text-toss-title font-bold text-toss-text-primary mb-4">5분 룰 요약</h3>
        <div className="space-y-2">
          {[
            { step: 1, title: "멀리건", desc: "덱을 60장으로 준비하고 7장씩 드로우. 배틀 포켓몬이 없으면 멀리건 선언 후 재드로우." },
            { step: 2, title: "사이드 6장 설정", desc: "덱 상단에서 6장을 뒤집어 사이드로 올려놓는다. 포켓몬을 기절시킬 때마다 1장씩 가져온다." },
            { step: 3, title: "진화 & 기술 사용", desc: "자신의 차례에 포켓몬을 진화시키고 에너지를 붙인 뒤 기술을 사용. 서포트는 1장만 낼 수 있다." },
            { step: 4, title: "KO 시 사이드 획득", desc: "상대 포켓몬을 기절시키면 사이드 카드 1장(ex는 2장)을 가져온다." },
            { step: 5, title: "승리 조건", desc: "다음 중 하나 달성 시 승리: ① 사이드 6장 모두 획득 ② 상대 배틀 포켓몬 없음 ③ 상대 덱 소진." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3 p-3 rounded-toss-md bg-toss-bg-muted">
              <div className="w-7 h-7 rounded-full bg-toss-brand text-white flex items-center justify-center text-sm font-bold shrink-0">
                {step}
              </div>
              <div>
                <p className="text-toss-label font-semibold text-toss-text-primary">{title}</p>
                <p className="text-toss-caption text-toss-text-secondary mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 카드 보관·관리 */}
      <section>
        <h3 className="text-toss-title font-bold text-toss-text-primary mb-4">카드 보관 & 관리</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { icon: "🛡", title: "슬리브", desc: "카드를 먼지·스크래치로부터 보호. 대회 참가 시 불투명 슬리브 필수. KMC·UltraPro 등이 인기." },
            { icon: "📒", title: "바인더", desc: "컬렉션 보관용. 9포켓 바인더에 세트별로 정리하면 열람이 쉽고 상태 유지에 유리." },
            { icon: "🎮", title: "플레이매트", desc: "대전 시 카드 보호 및 구역 구분 역할. 60×35cm 전후가 표준. 일러스트 커스텀 제품도 있음." },
          ].map(({ icon, title, desc }) => (
            <Card key={title} variant="default" padding="md">
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-toss-label font-bold text-toss-text-primary mb-1">{title}</p>
              <p className="text-toss-caption text-toss-text-secondary">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* PTCGL vs Pocket vs 본가 */}
      <section>
        <h3 className="text-toss-title font-bold text-toss-text-primary mb-4">PTCGL vs Pocket vs 본가 비교</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-toss-caption border-collapse">
            <thead>
              <tr className="border-b border-toss-divider">
                <th className="pb-3 text-left font-semibold text-toss-text-tertiary w-28">구분</th>
                <th className="pb-3 text-center font-semibold text-toss-brand">PTCGL</th>
                <th className="pb-3 text-center font-semibold text-toss-text-secondary">Pocket</th>
                <th className="pb-3 text-center font-semibold text-toss-text-secondary">본가(실물)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "플랫폼", a: "PC/모바일", b: "모바일", c: "오프라인" },
                { label: "가격", a: "무료", b: "부분유료", c: "실물 구매" },
                { label: "덱 구성", a: "60장", b: "20장", c: "60장" },
                { label: "대회", a: "온라인 공식", b: "미지원", c: "시티리그·CL" },
                { label: "CSP", a: "일부 이벤트", b: "없음", c: "공식 부여" },
              ].map(({ label, a, b, c }) => (
                <tr key={label} className="border-b border-toss-divider last:border-0">
                  <td className="py-2.5 font-medium text-toss-text-primary">{label}</td>
                  <td className="py-2.5 text-center text-toss-text-secondary">{a}</td>
                  <td className="py-2.5 text-center text-toss-text-secondary">{b}</td>
                  <td className="py-2.5 text-center text-toss-text-secondary">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ── 탭 2: 룰·재정 ─────────────────────────────────────────────────────────────

function RulesTab({ locale, rulings }: { locale: string; rulings: RulingRow[] }) {
  return (
    <div className="space-y-8">
      {/* 레귤레이션 카드 */}
      <section>
        <h3 className="text-toss-title font-bold text-toss-text-primary mb-4">레귤레이션 포맷</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              name: "스탠다드",
              desc: "최근 3개 시즌(현재 G·H·I 마크)만 사용 가능한 공식 주력 포맷. 시티리그·CL 기본 포맷.",
              color: "border-toss-brand",
            },
            {
              name: "익스텐디드",
              desc: "더 많은 과거 카드를 허용하는 포맷. 강력한 구 카드들이 환경을 지배하며 전략 폭이 넓다.",
              color: "border-orange-300",
            },
            {
              name: "殿堂(전당)",
              desc: "카드별 포인트를 합산해 덱 포인트 상한 내에서 구성. 강력한 카드일수록 포인트가 높다.",
              color: "border-purple-300",
            },
          ].map(({ name, desc, color }) => (
            <Card key={name} variant="default" padding="md" className={cn("border-l-4", color)}>
              <p className="text-toss-label font-bold text-toss-text-primary mb-2">{name}</p>
              <p className="text-toss-caption text-toss-text-secondary">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 룰 재정 */}
      <section>
        <h3 className="text-toss-title font-bold text-toss-text-primary mb-4">공식 룰 & 재정</h3>
        <div className="space-y-3">
          {rulings.map((ruling) => {
            const card = ruling.card;
            return (
              <Card key={ruling.id} variant="default" padding="md">
                <p className="text-toss-label font-semibold text-toss-text-primary mb-2">
                  Q. {ruling.question}
                </p>
                <CardDivider />
                <p className="text-toss-body text-toss-text-secondary mt-2 mb-2">
                  A. {ruling.answer}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  {card && ruling.logicalCardId && (
                    <Link
                      href={`/${locale}/cardgame/cards/${ruling.logicalCardId}`}
                      className="text-toss-micro text-toss-brand hover:underline"
                    >
                      관련 카드: {card.nameKo} →
                    </Link>
                  )}
                  {ruling.sourceUrl && (
                    <a
                      href={ruling.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-toss-micro text-toss-text-tertiary hover:text-toss-text-primary"
                    >
                      <ExternalLink size={11} />
                      공식 출처
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 금지·제한 */}
      <section>
        <h3 className="text-toss-title font-bold text-toss-text-primary mb-4">금지 · 제한 카드</h3>
        <Card variant="default" padding="md">
          <EmptyState
            title="현재 금지·제한 카드 없음"
            description="현 스탠다드·익스텐디드 포맷에는 금지/제한 카드가 없습니다. 레귤레이션 마크로 사용 가능 여부가 결정됩니다."
          />
        </Card>
      </section>

      {/* 페널티 가이드라인 */}
      <section>
        <h3 className="text-toss-title font-bold text-toss-text-primary mb-4">페널티 가이드라인</h3>
        <Card variant="default" padding="md">
          <div className="space-y-3">
            {[
              { level: "주의", desc: "경미한 실수 (카드 공개 순서 오류, 발음 오류 등). 구두 경고 후 진행.", color: "bg-yellow-100 text-yellow-700" },
              { level: "게임 패널티", desc: "규칙 위반 (무효 카드 사용 시도, 덱 불법 구성 등). 해당 게임 패배 처리.", color: "bg-orange-100 text-orange-700" },
              { level: "실격", desc: "비스포츠맨십 행위, 부정 행위, 위협 등. 대회 즉시 퇴출 및 CSP 박탈 가능.", color: "bg-red-100 text-red-700" },
            ].map(({ level, desc, color }) => (
              <div key={level} className="flex gap-3 items-start">
                <span className={cn("text-[10px] font-bold px-2 py-1 rounded shrink-0 mt-0.5", color)}>
                  {level}
                </span>
                <p className="text-toss-caption text-toss-text-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

// ── 탭 3: 용어집 ──────────────────────────────────────────────────────────────

function GlossaryTab({ glossary }: { glossary: GlossaryRow[] }) {
  const [query, setQuery] = useState("");
  const [indexFilter, setIndexFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = [...glossary];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.term.toLowerCase().includes(q) ||
          e.definition.toLowerCase().includes(q)
      );
    }
    if (indexFilter !== "all") {
      list = list.filter((e) => getInitial(e.term) === indexFilter);
    }
    return list.sort((a, b) => a.term.localeCompare(b.term, "ko"));
  }, [glossary, query, indexFilter]);

  const allInitials = Array.from(new Set(glossary.map((e) => getInitial(e.term)))).sort();

  const indexOptions = [
    { value: "all", label: "전체" },
    ...allInitials.map((ch) => ({ value: ch, label: ch })),
  ];

  return (
    <div className="space-y-4">
      <SearchField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="용어 검색"
        className="w-full max-w-sm"
      />

      <ToggleGroup
        options={indexOptions}
        value={indexFilter}
        onChange={setIndexFilter}
        size="sm"
      />

      <p className="text-toss-caption text-toss-text-tertiary">{filtered.length}개 용어</p>

      {filtered.length === 0 ? (
        <EmptyState title="검색 결과가 없습니다" />
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <Card key={entry.term} variant="default" padding="md">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded bg-toss-brand/10 text-toss-brand text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {getInitial(entry.term)}
                </span>
                <div className="flex-1">
                  <p className="text-toss-label font-bold text-toss-text-primary">{entry.term}</p>
                  <p className="text-toss-caption text-toss-text-secondary mt-0.5">{entry.definition}</p>
                  {entry.example && (
                    <p className="text-toss-micro text-toss-text-tertiary mt-1 italic">
                      예: {entry.example}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 탭 4: FAQ ─────────────────────────────────────────────────────────────────

function FaqTab() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {FAQS.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <Card key={i} variant="default" padding="md">
            <button
              className="w-full flex items-start justify-between gap-3 text-left"
              onClick={() => setOpenIndex(isOpen ? null : i)}
            >
              <p className="text-toss-label font-semibold text-toss-text-primary">
                Q. {faq.q}
              </p>
              <span className="text-toss-text-tertiary text-lg leading-none shrink-0 mt-0.5">
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen && (
              <>
                <CardDivider />
                <p className="text-toss-body text-toss-text-secondary mt-3">
                  {faq.a}
                </p>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ── 페이지 뷰 ──────────────────────────────────────────────────────────────────

export function GuidePageView({
  locale,
  rulings,
  glossary,
  starterCards,
}: {
  locale: string;
  rulings: RulingRow[];
  glossary: GlossaryRow[];
  starterCards: Record<string, ResolvedCard>;
}) {
  const [activeTab, setActiveTab] = useState("beginner");

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-toss-display font-bold text-toss-text-primary flex items-center gap-2">
          <BookOpen size={24} className="text-toss-brand" />
          가이드
        </h1>
        <p className="text-toss-body text-toss-text-tertiary mt-1">
          입문 · 룰·재정 · 용어집 · FAQ
        </p>
      </div>

      {/* 탭 */}
      <Tab.Root value={activeTab} onChange={setActiveTab}>
        <Tab.List className="mb-8">
          <Tab.Trigger value="beginner">입문</Tab.Trigger>
          <Tab.Trigger value="rules">룰·재정</Tab.Trigger>
          <Tab.Trigger value="glossary">용어집</Tab.Trigger>
          <Tab.Trigger value="faq">FAQ</Tab.Trigger>
        </Tab.List>
        <Tab.Panel value="beginner">
          <BeginnerTab starterCards={starterCards} />
        </Tab.Panel>
        <Tab.Panel value="rules">
          <RulesTab locale={locale} rulings={rulings} />
        </Tab.Panel>
        <Tab.Panel value="glossary">
          <GlossaryTab glossary={glossary} />
        </Tab.Panel>
        <Tab.Panel value="faq">
          <FaqTab />
        </Tab.Panel>
      </Tab.Root>
    </div>
  );
}
