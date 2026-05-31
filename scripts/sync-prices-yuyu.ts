/**
 * JP 시세 수집 — 遊々亭(yuyu-tei) 스크래퍼 (Layer 1, 결정적 스크립트)
 *
 * 출처: yuyu-tei.jp 정적 HTML (robots 클린, 2026-05-31 실측).
 *   販売(sell): https://yuyu-tei.jp/sell/poc/s/{yuyuCode}  → 샵 판매 호가(JPY)
 *   買取(buy):  https://yuyu-tei.jp/buy/poc/s/{yuyuCode}   → 샵 매입가(JPY)
 * 매핑: 세트 = 큐레이션 SET_MAP(yuyuCode → 우리 setId). 카드 = setId + numberInt.
 *       Set.code 가 인기 JP세트에서 null 이라 자동매칭 불가 → 수동 맵으로 시작(확장 가능).
 *       같은 numberInt 가 복수면 모호 → skip(추측 금지).
 * 적재: Price (sourceId=PriceSource 'yuyu_tei_sell' / 'yuyu_tei_buy', currency=JPY, marketPrice=값). 하루 1행/출처(멱등).
 *
 * 실행(단독):
 *   npm run sync:prices:jp:yuyu                 # SET_MAP 전체
 *   npm run sync:prices:jp:yuyu -- --set=sv02a  # 특정 yuyu 코드만
 *   npm run sync:prices:jp:yuyu -- --buy-only | --sell-only
 * 오케스트레이터에서: import { run } from "./sync-prices-yuyu"
 *
 * docs/agents/price-collector-plan.md
 */
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";
import {
  Logger,
  type SyncResult,
  emptyResult,
  startOfUtcDay,
  fetchTextWithRetry,
  upsertDailyPrice,
  getSourceIds,
  sanityCheck,
} from "./lib/price-sync-lib";

// 큐레이션: yuyu-tei 세트코드 → 우리 Set.id (JP). 확인된 것부터, 점진 확장.
// (yuyu /top/poc 및 세트페이지에서 코드 확인. 검증 안 된 매핑은 넣지 말 것.)
export const SET_MAP: Record<string, string> = {
  // ── 1단계: 최신 SV + MEGA 본탄 (拡張パック/強化拡張パック). 합본·스타터·덱빌드BOX 제외. ──
  // MEGA 시리즈
  m05: "jp-mega-abyss-eye", // [M5] アビスアイ
  m04: "jp-mega-ninja-spinner", // [M4] ニンジャスピナー
  m03: "jp-mega-munikisuzero", // [M3] ムニキスゼロ
  m02a: "jp-mega-dream-ex", // [M2a] MEGAドリームex
  m02: "jp-mega-infernox", // [M2] インフェルノX
  m01s: "jp-tcg-M1S", // [M1S] メガシンフォニア
  m01l: "jp-tcg-M1L", // [M1L] メガブレイブ
  // SV 시리즈
  sv11b: "jp-tcg-SV11B", // ブラックボルト
  sv11w: "jp-tcg-SV11W", // ホワイトフレア
  sv10: "jp-sv-destined-rivals", // ロケット団の栄光
  sv09a: "jp-sv-heatwave-arena", // 熱風のアリーナ
  sv09: "jp-sv-journey-together", // バトルパートナーズ
  sv08a: "jp-sv-prismatic-evolutions", // テラスタルフェスex
  sv08: "jp-sv-surging-sparks", // 超電ブレイカー
  sv07a: "jp-sv-paradise-dragona", // 楽園ドラゴーナ
  sv07: "jp-sv-stellar-crown", // ステラミラクル
  // sv06a(ナイトワンダラー) 제외 — 우리 DB jp-sv-shrouded-fable 카드 0장
  sv06: "jp-sv-twilight-masquerade", // 変幻の仮面
  sv05a: "jp-sv-crimson-haze", // クリムゾンヘイズ
  sv05k: "jp-tcg-SV5K", // ワイルドフォース
  // sv05m(サイバージャッジ) 제외 — 우리 DB jp-sv-cyber-judge 카드 0장
  sv04k: "jp-tcg-SV4K", // 古代の咆哮
  sv04m: "jp-tcg-SV4M", // 未来の一閃
  sv03a: "jp-sv-raging-surf", // レイジングサーフ
  sv03: "jp-sv-obsidian-flames", // 黒炎の支配者
  sv02a: "jp-sv-151", // ポケモンカード151
  sv02p: "jp-tcg-SV2P", // スノーハザード
  sv02d: "jp-tcg-SV2D", // クレイバースト
  sv01v: "jp-tcg-SV1V", // バイオレットex
  sv01s: "jp-tcg-SV1S", // スカーレットex

  // ── 2단계: S(소드실드) + SM(썬문) 본탄 + 하이클래스팩. 스타터·덱빌드 제외. ──
  // S 시리즈
  s12a: "jp-tcg-S12a", // VSTARユニバース (하이클래스)
  s12: "jp-tcg-S12", // パラダイムトリガー
  s11a: "jp-tcg-S11a", // 白熱のアルカナ
  // s11(ロストアビス) 제외 — 우리 DB에 jp-tcg-S11 세트 없음(카탈로그 미수집)
  s10b: "jp-tcg-S10b", // Pokémon GO
  s10a: "jp-tcg-S10a", // ダークファンタズマ
  s10d: "jp-tcg-S10D", // タイムゲイザー
  s10p: "jp-tcg-S10P", // スペースジャグラー
  s09a: "jp-tcg-S9a", // バトルリージョン
  s09: "jp-tcg-S9", // スターバース
  s08b: "jp-tcg-S8b", // VMAXクライマックス (하이클래스)
  s08a: "jp-tcg-S8a", // 25th アニバーサリーコレクション
  s08: "jp-tcg-S8", // フュージョンアーツ
  s07r: "jp-tcg-S7R", // 蒼空ストリーム
  s07d: "jp-tcg-S7D", // 摩天パーフェクト
  s06a: "jp-tcg-S6a", // イーブイヒーローズ
  s06h: "jp-tcg-S6H", // 白銀のランス
  s06k: "jp-tcg-S6K", // 漆黒のガイスト
  s05a: "jp-tcg-S5a", // 双璧のファイター
  s05r: "jp-tcg-S5R", // 連撃マスター
  s05i: "jp-tcg-S5I", // 一撃マスター
  s04a: "jp-tcg-S4a", // シャイニースターV (하이클래스)
  s04: "jp-tcg-S4", // 仰天のボルテッカー
  s03a: "jp-tcg-S3a", // 伝説の鼓動
  s03: "jp-tcg-S3", // ムゲンゾーン
  s02a: "jp-tcg-S2a", // 爆炎ウォーカー
  s02: "jp-tcg-S2", // 反逆クラッシュ
  s01a: "jp-tcg-S1a", // VMAXライジング
  s01w: "jp-tcg-S1W", // ソード
  s01h: "jp-tcg-S1H", // シールド
  // SM 시리즈
  sm12a: "jp-tcg-SM12a", // TAG TEAM GX タッグオールスターズ (하이클래스)
  sm12: "jp-tcg-SM12", // オルタージェネシス
  sm11b: "jp-tcg-SM11b", // ドリームリーグ
  sm11a: "jp-tcg-SM11a", // リミックスバウト
  sm10b: "jp-tcg-SM10b", // スカイレジェンド
  sm10: "jp-tcg-SM10", // ダブルブレイズ
  sm09b: "jp-tcg-SM9b", // フルメタルウォール
  sm09a: "jp-tcg-SM9a", // ナイトユニゾン
  sm09: "jp-tcg-SM9", // タッグボルト
  sm08b: "jp-tcg-SM8b", // GXウルトラシャイニー (하이클래스)
  sm08a: "jp-tcg-SM8a", // ダークオーダー
  sm08: "jp-tcg-SM8", // 超爆インパクト
  sm07a: "jp-tcg-SM7a", // 迅雷スパーク
  sm07b: "jp-tcg-SM7b", // フェアリーライズ
  sm07: "jp-tcg-SM7", // 裂空のカリスマ
  sm06b: "jp-tcg-SM6b", // チャンピオンロード
  sm06a: "jp-tcg-SM6a", // ドラゴンストーム
  sm06: "jp-tcg-SM6", // 禁断の光
  sm05plus: "jp-tcg-SM5+", // ウルトラフォース
  sm05m: "jp-tcg-SM5M", // ウルトラムーン
  sm05s: "jp-tcg-SM5S", // ウルトラサン
  sm04plus: "jp-tcg-SM4+", // GXバトルブースト (하이클래스)
  sm04s: "jp-tcg-SM4S", // 覚醒の勇者
  sm04a: "jp-tcg-SM4A", // 超次元の暴獣
  sm03plus: "jp-tcg-SM3+", // ひかる伝説
  sm03n: "jp-tcg-SM3N", // 光を喰らう闇
  sm03h: "jp-tcg-SM3H", // 闘う虹を見たか
  sm02plus: "jp-tcg-sm2+", // 新たな試練に直面
  sm02k: "jp-tcg-SM2K", // キミを待つ島々
  sm02l: "jp-tcg-SM2L", // アローラの月光
  // SM1S/SM1M(コレクションサン/ムーン) 제외 — yuyu poc 카탈로그 미존재
  // SM1+(サン&ムーン) 우리 DB 1장만 — 스킵해도 무방하나 매핑은 유지
  sm01plus: "jp-tcg-SM1+", // サン＆ムーン
};

export type YuyuOptions = {
  set?: string; // 특정 yuyu 코드만
  buyOnly?: boolean;
  sellOnly?: boolean;
};

type ParsedCard = {
  numberInt: number;
  numberRaw: string;
  name: string;
  priceJpy: number;
  yuyuId: string | null;
};

/** card-product 블록 단위로 번호/이름/가격/yuyuId 추출. */
function parseCards(html: string): ParsedCard[] {
  const blocks = html.split("card-product").slice(1);
  const cards: ParsedCard[] = [];
  for (const b of blocks) {
    const numM = b.match(/border border-dark[^>]*>\s*([0-9]{1,3})\s*\/\s*[0-9]{1,3}/);
    const nameM = b.match(/<h4[^>]*text-primary[^>]*>\s*([^<]+?)\s*<\/h4>/);
    const priceM = b.match(/<strong[^>]*text-end[^>]*>\s*([0-9,]+)\s*円/);
    const idM = b.match(/\/poc\/card\/[A-Za-z0-9]+\/(\d+)/);
    if (!numM || !priceM) continue;
    const numberInt = parseInt(numM[1], 10);
    const priceJpy = parseInt(priceM[1].replace(/,/g, ""), 10);
    if (!Number.isFinite(numberInt) || !Number.isFinite(priceJpy) || priceJpy <= 0) continue;
    cards.push({
      numberInt,
      numberRaw: numM[1],
      name: nameM ? nameM[1].trim() : "",
      priceJpy,
      yuyuId: idM ? idM[1] : null,
    });
  }
  return cards;
}

async function syncOne(
  yuyuCode: string,
  setId: string,
  kind: "sell" | "buy",
  sourceId: string,
  today: Date,
  r: SyncResult,
  log: Logger
) {
  const url = `https://yuyu-tei.jp/${kind}/poc/s/${yuyuCode}`;
  const html = await fetchTextWithRetry(url, {
    headers: { "Accept-Language": "ja,en;q=0.8" },
    log,
  });
  if (!html) {
    r.errors.push(`[${yuyuCode}/${kind}] fetch 실패(재시도 소진)`);
    r.ok = false;
    return;
  }
  const cards = parseCards(html);
  if (!cards.length) {
    r.warnings.push(`[${yuyuCode}/${kind}] 파싱 0건 (HTML 구조 변경 의심)`);
    return;
  }
  r.units++;

  const locales = await prisma.cardLocale.findMany({
    where: { setId },
    select: { id: true, numberInt: true },
  });
  const byNum = new Map<number, string[]>();
  for (const l of locales) {
    if (l.numberInt == null) continue;
    const arr = byNum.get(l.numberInt) ?? [];
    arr.push(l.id);
    byNum.set(l.numberInt, arr);
  }

  let written = 0,
    dup = 0,
    ambiguous = 0,
    unmatched = 0;
  for (const c of cards) {
    const ids = byNum.get(c.numberInt);
    if (!ids || ids.length === 0) {
      unmatched++;
      continue;
    }
    if (ids.length > 1) {
      ambiguous++;
      continue;
    }
    const wrote = await upsertDailyPrice(ids[0], sourceId, today, {
      marketPrice: c.priceJpy,
      currency: "JPY",
    });
    wrote ? written++ : dup++;
  }
  r.written += written;
  r.dupSkipped += dup;
  r.ambiguous += ambiguous;
  r.unmatched += unmatched;
  log.info(
    `[${yuyuCode}/${kind}] parsed=${cards.length} written=${written} dup=${dup} ambiguous=${ambiguous} unmatched=${unmatched}`
  );
}

/** 오케스트레이터/단독 공용 진입점. prisma.$disconnect 는 호출자 책임. */
export async function run(opts: YuyuOptions = {}): Promise<SyncResult> {
  const t0 = Date.now();
  const log = new Logger("JP yuyu-tei");
  const r = emptyResult("JP yuyu-tei");

  const sid = await getSourceIds(["yuyu_tei_sell", "yuyu_tei_buy"]);
  const entries = opts.set
    ? Object.entries(SET_MAP).filter(([code]) => code === opts.set)
    : Object.entries(SET_MAP);
  if (!entries.length) {
    r.ok = false;
    r.errors.push(
      `SET_MAP 에 '${opts.set}' 없음. 등록 코드: ${Object.keys(SET_MAP).join(", ")}`
    );
    r.durationMs = Date.now() - t0;
    return r;
  }

  const today = startOfUtcDay();
  log.info(`세트 ${entries.length}개 시작`);
  for (const [yuyuCode, setId] of entries) {
    const exists = await prisma.set.count({ where: { id: setId } });
    if (!exists) {
      r.warnings.push(`[${yuyuCode}] 우리 Set '${setId}' 없음 — SET_MAP 확인, skip`);
      continue;
    }
    if (!opts.buyOnly) await syncOne(yuyuCode, setId, "sell", sid.yuyu_tei_sell, today, r, log);
    if (!opts.sellOnly) await syncOne(yuyuCode, setId, "buy", sid.yuyu_tei_buy, today, r, log);
  }

  r.durationMs = Date.now() - t0;
  sanityCheck(r);
  return r;
}

// ── 단독 실행 ──
const isMain = process.argv[1]?.includes("sync-prices-yuyu");
if (isMain) {
  const args = process.argv.slice(2);
  const opts: YuyuOptions = {
    set: args.find((a) => a.startsWith("--set="))?.split("=")[1],
    buyOnly: args.includes("--buy-only"),
    sellOnly: args.includes("--sell-only"),
  };
  run(opts)
    .then((r) => {
      console.log(
        `YUYU-SYNC done: written=${r.written} dup=${r.dupSkipped} unmatched=${r.unmatched} ambiguous=${r.ambiguous} warnings=${r.warnings.length} errors=${r.errors.length} in ${(r.durationMs / 1000).toFixed(1)}s`
      );
      r.warnings.forEach((w) => console.warn("  ⚠ " + w));
      r.errors.forEach((e) => console.error("  ✗ " + e));
      return prisma.$disconnect();
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
