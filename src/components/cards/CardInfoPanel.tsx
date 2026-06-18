import { cn } from "@/lib/utils";
import { TypeIconRow } from "@/components/pokemon/TypeIcon";
import { CostPips } from "@/components/pokemon/CostPips";
import { SUBTYPE_KO, supertypeKo, FORMAT_LABEL } from "@/lib/cards/card-fields";
import { Card, Button } from "@/components/toss";
import type { TCGCard } from "@/lib/api/pokemontcg";

/**
 * 카드 상세 우측 정보 패널 — 이름/등급/분류·레귤/스탯/진화/특성·기술·룰·도감설명.
 * page 에서 이미 계산된 평탄 값(card·displayName·rarityLabel·subNames·stats·locale·regionCardId)을
 * 그대로 받아 렌더만 한다. 렌더 결과는 추출 전 인라인 마크업과 100% 동일.
 */
export function CardInfoPanel({
  card,
  displayName,
  rarityLabel,
  subNames,
  stats,
  locale,
  regionCardId,
}: {
  card: TCGCard;
  displayName: string;
  rarityLabel: string | null | undefined;
  subNames: string[];
  stats: { total: number; offerable: number };
  locale: string;
  regionCardId: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      {/* 이름 + 등급 / 원어명(영어 / 일본명) */}
      <div className="mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-toss-title-1 font-bold text-toss-text-primary">{displayName}</h1>
          {rarityLabel && (
            <span className="px-2 py-0.5 rounded-toss-md bg-toss-bg-muted text-toss-caption font-semibold text-toss-text-secondary">
              {rarityLabel}
            </span>
          )}
        </div>
        {subNames.length > 0 && (
          <p className="text-toss-caption text-toss-text-quaternary mt-0.5">{subNames.join(" / ")}</p>
        )}
      </div>

      {/* 분류·서브타입·레귤레이션·포맷 카드 + 보유 현황 카드 (한 행, 좌우) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {/* 분류 / 서브타입 / 레귤레이션 / 포맷 */}
        <Card padding="md">
          <div className="flex flex-wrap items-center gap-1.5">
            {card.supertype && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-toss-bg-muted text-toss-text-secondary">
                {supertypeKo(card.supertype)}
              </span>
            )}
            {card.subtypes?.map((st) => (
              <span key={st} className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">
                {SUBTYPE_KO[st] ?? st}
              </span>
            ))}
            {card.regulationMark && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-toss-md border border-toss-divider text-toss-caption text-toss-text-secondary">
                레귤레이션
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-toss-text-primary text-toss-bg-base text-[10px] font-bold">
                  {card.regulationMark}
                </span>
              </span>
            )}
            {card.legalities &&
              (["standard", "expanded"] as const).map((fmt) => {
                const status = card.legalities?.[fmt];
                if (!status) return null;
                const legal = status === "Legal";
                return (
                  <span
                    key={fmt}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-toss-md text-toss-caption font-medium",
                      legal ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}
                  >
                    {FORMAT_LABEL[fmt]} {legal ? "사용 가능" : "사용 금지"}
                  </span>
                );
              })}
          </div>
        </Card>

        {/* 보유 현황 + 구매 제안 */}
        <Card padding="md">
          <p className="text-toss-caption text-toss-text-secondary">
            👥 <span className="text-toss-text-primary font-bold">{stats.total}명</span> 등록
            <span className="mx-1.5 text-toss-text-quaternary">·</span>
            💬 <span className="text-toss-brand font-bold">{stats.offerable}명</span> 제안 가능
          </p>
          {stats.offerable > 0 && (
            <Button variant="primary" size="sm" asChild className="mt-2.5 w-full">
              <a href={`/${locale}/cards/${regionCardId}/owners`}>구매 제안 →</a>
            </Button>
          )}
        </Card>
      </div>

      {/* 스탯 그리드 — 도감번호 / HP / 타입 / 약점 / 저항력 / 후퇴비 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {card.nationalPokedexNumbers?.length ? (
          <div className="p-3 bg-toss-bg-muted rounded-toss-md">
            <p className="text-toss-micro text-toss-text-tertiary">도감번호</p>
            <p className="text-toss-label font-semibold text-toss-text-primary mt-0.5 toss-numeric">
              No.{card.nationalPokedexNumbers.map((n) => String(n).padStart(4, "0")).join(", No.")}
            </p>
          </div>
        ) : null}
        {card.hp && (
          <div className="p-3 bg-toss-bg-muted rounded-toss-md">
            <p className="text-toss-micro text-toss-text-tertiary">HP</p>
            <p className="text-toss-title font-bold text-toss-text-primary">{card.hp}</p>
          </div>
        )}
        {card.types?.length ? (
          <div className="p-3 bg-toss-bg-muted rounded-toss-md">
            <p className="text-toss-micro text-toss-text-tertiary">타입</p>
            <TypeIconRow items={card.types.map((t) => ({ type: t }))} className="mt-0.5" />
          </div>
        ) : null}
        {card.weaknesses?.length ? (
          <div className="p-3 bg-toss-bg-muted rounded-toss-md">
            <p className="text-toss-micro text-toss-text-tertiary">약점</p>
            <TypeIconRow items={card.weaknesses} className="mt-0.5" />
          </div>
        ) : null}
        {card.resistances?.length ? (
          <div className="p-3 bg-toss-bg-muted rounded-toss-md">
            <p className="text-toss-micro text-toss-text-tertiary">저항력</p>
            <TypeIconRow items={card.resistances} className="mt-0.5" />
          </div>
        ) : null}
        {card.convertedRetreatCost != null && (
          <div className="p-3 bg-toss-bg-muted rounded-toss-md">
            <p className="text-toss-micro text-toss-text-tertiary">후퇴비</p>
            <p className="text-toss-label font-semibold text-toss-text-primary mt-0.5">
              {card.convertedRetreatCost === 0 ? "0 (무료)" : `${card.convertedRetreatCost}개`}
            </p>
          </div>
        )}
      </div>

      {/* 진화 라인 (후퇴비 아래) */}
      {(card.evolvesFrom || card.evolvesTo?.length) && (
        <div className="flex items-center gap-1.5 flex-wrap text-toss-caption mb-5">
          <span className="text-toss-text-tertiary">진화</span>
          {card.evolvesFrom && (
            <>
              <span className="px-2 py-1 rounded-toss-md bg-toss-bg-muted text-toss-text-secondary">
                {card.evolvesFrom}
              </span>
              <span className="text-toss-text-quaternary">→</span>
            </>
          )}
          <span className="px-2 py-1 rounded-toss-md bg-toss-brand-weak text-toss-brand font-semibold">
            {card.name}
          </span>
          {card.evolvesTo?.map((to) => (
            <span key={to} className="flex items-center gap-1.5">
              <span className="text-toss-text-quaternary">→</span>
              <span className="px-2 py-1 rounded-toss-md bg-toss-bg-muted text-toss-text-secondary">
                {to}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* 특성 */}
      {card.abilities?.map((ab, i) => (
        <div key={i} className="p-3 border border-toss-divider rounded-toss-md bg-toss-bg-base mb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-toss-brand-weak text-toss-brand">
              {ab.type === "Ability" ? "특성" : ab.type}
            </span>
            <span className="text-toss-label font-semibold text-toss-text-primary">{ab.name}</span>
          </div>
          <p className="text-toss-caption text-toss-text-secondary">{ab.text}</p>
        </div>
      ))}

      {/* 기술 */}
      {card.attacks?.map((atk, i) => (
        <div key={i} className="p-3 border border-toss-divider rounded-toss-md bg-toss-bg-base mb-2">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <CostPips cost={atk.cost} />
              <span className="text-toss-label font-semibold text-toss-text-primary">{atk.name}</span>
            </div>
            {atk.damage && (
              <span className="text-toss-title font-bold text-toss-text-primary">{atk.damage}</span>
            )}
          </div>
          {atk.text && <p className="text-toss-caption text-toss-text-secondary">{atk.text}</p>}
        </div>
      ))}

      {/* 룰 박스 (ex / 메가 등) */}
      {card.rules?.map((rule, i) => (
        <div key={i} className="p-3 rounded-toss-md bg-toss-bg-muted border-l-2 border-toss-text-tertiary mb-2">
          <p className="text-toss-caption text-toss-text-secondary">{rule}</p>
        </div>
      ))}

      {/* 도감 설명 */}
      {card.flavorText && (
        <p className="text-toss-caption text-toss-text-tertiary italic border-l-2 border-toss-divider pl-3 mt-3">
          {card.flavorText}
        </p>
      )}
    </div>
  );
}
