/**
 * 덱리스트 카드 → raredoc 카드 단일 해석기 (4경로) — docs/cardgame/meta-pipeline-multisource.md §4-②
 *
 * 경로① EN 약어:    setmap.en[ptcgoCode] → setId → RegionCard 직결({setId}-{number}) → EIM pokemontcg_io → (setId,number) 폴백
 * 경로② JP 세트코드: setmap.jp[code] → jp-tcg-* setId → (setId, numberInt) 조회   [limitless standard-jp — P3]
 * 경로③ JP cardID:  EIM pokemoncard_jp (인쇄판 1:1 — 재록 안전)                   [jp-official 덱코드 — P4]
 * 경로④ KR BS코드:  EIM pokemoncard_kr                                            [kr-official 덱코드 — P3]
 *
 * 미해석은 null + reason 카운터 — 호출측이 리포트. DB 쓰기 없음(읽기 전용).
 */
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../../src/lib/prisma";

export type ResolveInput = {
  /** Limitless 세트코드 (EN ptcgoCode "TWM" 또는 JP 세트코드 "SV11B") */
  set?: string | null;
  number?: string | null;
  /** 외부 카드 식별자: pc-jp 숫자ID("48778") 또는 KR BS코드("BS2025010051") */
  cardId?: string | null;
};

export type Resolved = { regionCardId: string | null; cardId: string };

type SetMap = { en: Record<string, string>; enUnmapped: Record<string, string>; jp: Record<string, string> };

const SETMAP_PATH = path.join(process.cwd(), "data", "limitless-setmap.json");

export class CardResolver {
  private setmap: SetMap;
  private memo = new Map<string, Resolved | null>();
  private eimSourceIds = new Map<string, string>(); // ExternalSource.code → cuid
  /** 미해석 사유 카운터 (리포트용) */
  readonly missReasons = new Map<string, number>();

  private constructor(setmap: SetMap) {
    this.setmap = setmap;
  }

  static async create(): Promise<CardResolver> {
    if (!fs.existsSync(SETMAP_PATH)) {
      throw new Error(`setmap 없음: ${SETMAP_PATH} — 먼저 npx tsx scripts/build-limitless-setmap.ts 실행`);
    }
    return new CardResolver(JSON.parse(fs.readFileSync(SETMAP_PATH, "utf8")));
  }

  private miss(reason: string): null {
    this.missReasons.set(reason, (this.missReasons.get(reason) ?? 0) + 1);
    return null;
  }

  private async eimSourceId(code: string): Promise<string | null> {
    if (this.eimSourceIds.has(code)) return this.eimSourceIds.get(code)!;
    const src = await prisma.externalSource.findUnique({ where: { code }, select: { id: true } });
    if (!src) return null;
    this.eimSourceIds.set(code, src.id);
    return src.id;
  }

  private async byEim(sourceCode: string, externalId: string): Promise<Resolved | null> {
    const sourceId = await this.eimSourceId(sourceCode);
    if (!sourceId) return null;
    const m = await prisma.externalIdMapping.findUnique({
      where: { sourceId_externalId: { sourceId, externalId } },
      select: { regionCardId: true, cardId: true, regionCard: { select: { cardId: true } } },
    });
    if (!m) return null;
    const cardId = m.cardId ?? m.regionCard?.cardId ?? null;
    if (!cardId) return null;
    return { regionCardId: m.regionCardId, cardId };
  }

  private async byLocale(where: object): Promise<Resolved | null> {
    const cl = await prisma.regionCard.findFirst({
      where,
      select: { id: true, cardId: true },
    });
    return cl ? { regionCardId: cl.id, cardId: cl.cardId } : null;
  }

  /** 경로①: EN ptcgoCode + number */
  async resolveEn(set: string, number: string): Promise<Resolved | null> {
    const key = `en|${set}|${number}`;
    if (this.memo.has(key)) return this.memo.get(key)!;
    let out: Resolved | null = null;

    const setId = this.setmap.en[set];
    if (!setId) {
      this.memo.set(key, null);
      return this.miss(this.setmap.enUnmapped[set] ? `set-unmappable:${set}` : `set-unknown:${set}`);
    }
    // a) SV/me 시대: RegionCard.id = "{setId}-{number}" (pokemontcg.io 원시 id, 비패딩)
    out = await this.byLocale({ id: `${setId}-${number}` });
    // b) SWSH 이전: EIM pokemontcg_io ("{setId}-{number}" → regionCard)
    if (!out) out = await this.byEim("pokemontcg_io", `${setId}-${number}`);
    // c) 폴백: (setId, number|numberInt) — en-tcg-* id 의 패딩 차이 흡수
    if (!out) {
      const n = parseInt(number, 10);
      out = await this.byLocale(
        Number.isNaN(n) ? { setId, number } : { setId, OR: [{ number }, { numberInt: n }] },
      );
    }
    if (!out) this.miss(`en-no-locale:${set}`);
    this.memo.set(key, out);
    return out;
  }

  /** 경로②: limitless JP 세트코드 + number (standard-jp 덱리스트) */
  async resolveJpSet(set: string, number: string): Promise<Resolved | null> {
    const key = `jpset|${set}|${number}`;
    if (this.memo.has(key)) return this.memo.get(key)!;
    const setId = this.setmap.jp[set];
    if (!setId) {
      this.memo.set(key, null);
      return this.miss(`jpset-unknown:${set}`);
    }
    const n = parseInt(number, 10);
    const out = await this.byLocale(
      Number.isNaN(n) ? { setId, number } : { setId, OR: [{ number }, { numberInt: n }] },
    );
    if (!out) this.miss(`jpset-no-locale:${set}`);
    this.memo.set(key, out);
    return out;
  }

  /** 경로③: pc-jp 숫자 cardID (jp-official 덱코드 hidden input) */
  async resolveJpCardId(cardId: string): Promise<Resolved | null> {
    const key = `jpid|${cardId}`;
    if (this.memo.has(key)) return this.memo.get(key)!;
    const out = await this.byEim("pokemoncard_jp", cardId);
    if (!out) this.miss("jp-cardid-no-eim");
    this.memo.set(key, out);
    return out;
  }

  /** 경로④: KR BS코드 (kr-official 덱코드 해석 API cardNum) */
  async resolveKrBs(bsCode: string): Promise<Resolved | null> {
    const key = `krbs|${bsCode}`;
    if (this.memo.has(key)) return this.memo.get(key)!;
    const out = await this.byEim("pokemoncard_kr", bsCode);
    if (!out) this.miss("kr-bs-no-eim");
    this.memo.set(key, out);
    return out;
  }

  /** 입력 모양으로 경로 자동 선택 */
  async resolve(input: ResolveInput): Promise<Resolved | null> {
    if (input.cardId) {
      if (/^BS\d+$/i.test(input.cardId)) return this.resolveKrBs(input.cardId);
      if (/^\d+$/.test(input.cardId)) return this.resolveJpCardId(input.cardId);
    }
    if (input.set && input.number != null) {
      // JP 세트코드는 setmap.jp 에만 존재 (EN ptcgoCode 와 키 공간 분리)
      if (this.setmap.jp[input.set] && !this.setmap.en[input.set]) {
        return this.resolveJpSet(input.set, String(input.number));
      }
      return this.resolveEn(input.set, String(input.number));
    }
    return this.miss("no-key");
  }

  reportMisses(): string {
    return [...this.missReasons.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([r, n]) => `  ${r}: ${n}`)
      .join("\n");
  }
}
