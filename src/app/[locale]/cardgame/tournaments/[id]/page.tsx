import Link from "next/link";
import { ArrowLeft, Users, ExternalLink } from "lucide-react";
import { Card, CardDivider, EmptyState } from "@/components/toss";
import { cn } from "@/lib/utils";
import { getTournamentStandings } from "@/lib/services/cardgame";
import { platformBadge } from "@/lib/cardgame/platform";
import { DeckCodeButton } from "./DeckCodeButton";

// 출처 표기 — 정본 소스별 (multisource P3)
const SOURCE_LABELS: Record<string, string> = {
  "limitless-play": "Limitless TCG (온라인 대회)",
  "limitless-web": "Limitless TCG 공식 대회 DB",
  "jp-official": "포켓몬카드게임 플레이어즈클럽 (일본 공식)",
  pokedata: "PokeData (공식 메이저)",
  ptcglegends: "PTCG Legends",
};

// 대형 메이저(standings ~2,000행) 페이지 비대화 방지 — 상위 N위만 렌더 (데이터는 전체 보유).
const STANDINGS_DISPLAY_CAP = 128;

// 국가 코드 → 국기 이모지 (없으면 코드 그대로).
function flag(country: string | null): string {
  if (!country || country.length !== 2) return country ?? "";
  const base = 0x1f1e6;
  const cc = country.toUpperCase();
  return String.fromCodePoint(base + (cc.charCodeAt(0) - 65), base + (cc.charCodeAt(1) - 65));
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const detail = await getTournamentStandings(id);

  if (!detail) {
    return (
      <div>
        <Link
          href={`/${locale}/cardgame/tournaments`}
          className="inline-flex items-center gap-1 text-toss-caption text-toss-text-tertiary hover:text-toss-text-primary mb-6"
        >
          <ArrowLeft size={14} />
          대회 목록으로
        </Link>
        <EmptyState
          title="대회를 찾을 수 없습니다"
          description="잘못된 대회 ID이거나 아직 등록되지 않은 대회입니다."
          action={
            <Link href={`/${locale}/cardgame/tournaments`} className="text-toss-brand text-toss-label">
              대회 목록 보기
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      {/* 뒤로가기 */}
      <Link
        href={`/${locale}/cardgame/tournaments`}
        className="inline-flex items-center gap-1 text-toss-caption text-toss-text-tertiary hover:text-toss-text-primary mb-6"
      >
        <ArrowLeft size={14} />
        대회 목록으로
      </Link>

      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-toss-display font-bold text-toss-text-primary">{detail.nameKo}</h1>
        {detail.name && detail.name !== detail.nameKo && (
          <p className="text-toss-caption text-toss-text-tertiary mt-1">{detail.name}</p>
        )}
        <div className="flex items-center gap-4 flex-wrap mt-3">
          <span className="text-toss-caption text-toss-text-tertiary">{detail.date}</span>
          <span className="text-toss-micro px-1.5 py-0.5 rounded bg-toss-bg-muted text-toss-text-tertiary">
            {detail.format}
          </span>
          {(() => {
            const b = platformBadge(detail.platform);
            return (
              <span
                className={`text-toss-micro px-1.5 py-0.5 rounded font-medium ${
                  b.online ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-700"
                }`}
                title={b.sub ?? undefined}
              >
                {b.emoji} {b.label}
              </span>
            );
          })()}
          <span className="flex items-center gap-1 text-toss-caption text-toss-text-secondary">
            <Users size={13} className="text-toss-text-tertiary" />
            {detail.players}명
          </span>
          {detail.externalUrl && (
            <a
              href={detail.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-toss-micro text-toss-text-tertiary hover:text-toss-brand transition-colors"
            >
              <ExternalLink size={11} />
              출처
            </a>
          )}
        </div>
      </div>

      {/* 순위표 — 대형 메이저(2,000행)는 표시 상한 (데이터는 전체 보유) */}
      <section>
        <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">
          순위표
          {detail.standings.length > STANDINGS_DISPLAY_CAP && (
            <span className="ml-2 text-toss-caption font-normal text-toss-text-tertiary">
              전체 {detail.standings.length}명 중 상위 {STANDINGS_DISPLAY_CAP}위 표시
            </span>
          )}
        </h2>
        {detail.standings.length === 0 ? (
          <EmptyState title="입상 데이터가 없습니다" />
        ) : (
          <div className="overflow-x-auto rounded-toss-lg border border-toss-divider">
            <table className="w-full text-toss-caption">
              <thead>
                <tr className="text-left border-b border-toss-divider bg-toss-bg-muted">
                  <th className="py-3 px-3 font-semibold text-toss-text-tertiary w-12 text-center">순위</th>
                  <th className="py-3 px-3 font-semibold text-toss-text-tertiary">선수</th>
                  <th className="py-3 px-3 font-semibold text-toss-text-tertiary text-center w-12">국가</th>
                  <th className="py-3 px-3 font-semibold text-toss-text-tertiary">덱</th>
                  <th className="py-3 px-3 font-semibold text-toss-text-tertiary text-right">전적</th>
                </tr>
              </thead>
              <tbody>
                {detail.standings.slice(0, STANDINGS_DISPLAY_CAP).map((s) => (
                  <tr key={s.placing} className="border-b border-toss-divider last:border-0 hover:bg-toss-hover transition-colors">
                    <td className="py-3 px-3 text-center">
                      <span
                        className={cn(
                          "inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold",
                          s.placing === 1
                            ? "bg-yellow-100 text-yellow-700"
                            : s.placing === 2
                            ? "bg-gray-200 text-gray-600"
                            : s.placing === 3
                            ? "bg-orange-100 text-orange-600"
                            : "bg-toss-bg-muted text-toss-text-tertiary"
                        )}
                      >
                        {s.placing}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-toss-text-primary">{s.playerName}</td>
                    <td className="py-3 px-3 text-center text-toss-text-tertiary">{flag(s.country)}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {s.deckKey ? (
                          <Link
                            href={`/${locale}/cardgame/decks/${s.deckKey}`}
                            className="text-toss-text-primary hover:text-toss-brand transition-colors"
                          >
                            {s.deckNameKo}
                          </Link>
                        ) : (
                          <span className="text-toss-text-quaternary">{s.deckNameKo ?? "—"}</span>
                        )}
                        {s.deckCode && <DeckCodeButton code={s.deckCode} />}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-toss-text-secondary whitespace-nowrap">
                      {s.wins + s.losses + s.ties > 0
                        ? `${s.wins}-${s.losses}${s.ties > 0 ? `-${s.ties}` : ""}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-toss-micro text-toss-text-quaternary mt-3">
          덱 명칭은 제출된 데클리스트를 기반으로 Limitless가 자동 분류한 값입니다 (선수 입력 아님).
        </p>
      </section>

      {/* 데클리스트 — 카드 매칭 보류 → 준비중 */}
      <section className="mt-8">
        <Card variant="default" padding="lg">
          <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
            <span className="text-toss-label font-semibold text-toss-text-secondary">데클리스트 준비 중</span>
            <p className="text-toss-caption text-toss-text-tertiary max-w-md">
              원본 데클리스트는 보존되어 있으나, 카드 이미지·시세 매칭 작업 후 카드별로 표시될
              예정입니다.
            </p>
          </div>
        </Card>
      </section>

      <CardDivider />
      <p className="text-toss-micro text-toss-text-quaternary text-center mt-6">
        {SOURCE_LABELS[detail.source ?? ""] ?? "외부 대회 데이터"}
        {detail.source === "limitless-web" && " · 입상덱 코드: 포켓몬코리아 공식"}
      </p>
    </div>
  );
}
