/**
 * P3: 코리안리그 KR 공식 보강 — docs/meta-pipeline-multisource.md §3 #6
 *
 * 실행: npx tsx scripts/enrich-koreanleague-kr.ts [--dry-run]
 *
 * - 보강(enrichment) 수집기: **행 생성 금지** — limitless-web 정본(lw-*) standings 에
 *   공식 덱코드 + (덱리스트 없으면) KR decklist 를 주입하고 SourceRef(enrichment) 등록만.
 * - 입상덱: pokemonkorea.co.kr/koreanleague_2026/menu700 (시즌×부문×성적×선수+덱코드 48)
 * - 덱코드 해석: POST pokemoncard.co.kr/v2/ajax2 (action=get_dec_detail)
 *   ⚠ 헤더 3종 필수: Referer + Origin + X-Requested-With (없으면 "접근불가")
 *   → BS코드 → resolver 경로④ → logicalCardId
 * - 부착 검증: 이름(한글↔로마자 자동대조 불가) 대신 **덱 핑거프린트** —
 *   KR 덱 logicalCard 집합 ↔ standing 의 limitless decklist 집합 일치율 ≥0.8 이면 검증 부착.
 *   TOP4(placing 3·4 동순위)는 핑거프린트가 높은 쪽에 부착(모호성 해소).
 * - 마스터 부문만 부착 가능(정본 standings 가 마스터 게재) — 주니어/시니어는 사유 로그.
 * - 덱코드 JSON 은 data/deck-codes/kr/{code}.json 영구 캐시(재조회 0).
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "../src/lib/prisma";
import { CardResolver } from "./lib/resolve-card";
import { registerEnrichmentRef } from "./lib/tournament-loader";
import { resolveCardDexes } from "./lib/pokeapi-names";

const execFileAsync = promisify(execFile);
const dryRun = process.argv.includes("--dry-run");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const MENU_URL = "https://www.pokemonkorea.co.kr/koreanleague_2026/menu700";
const CODE_CACHE = path.join(process.cwd(), "data", "deck-codes", "kr");
const THROTTLE_MS = 300;

/** 시즌 라벨 → limitless-web 정본 Tournament (2026 리그년도: 2025-11 ~ 2026-05) */
const SEASON_TO_LW: Record<string, string> = {
  "시즌1": "lw-556", // 2025-11-29
  "시즌2": "lw-561", // 2026-01-10
  "시즌3": "lw-562", // 2026-03-07
  "시즌4": "lw-565", // 2026-04-25
  "파이널": "lw-567", // 2026-05-24
};

type Entry = { season: string; division: string; result: string; player: string; code: string };

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

function parseEntries(html: string): Entry[] {
  const text = stripTags(html);
  // 시즌 섹션 경계: "시즌1(...)입상 덱 레시피" / "파이널 시즌(26.5.25) 입상 덱 레시피"
  const sections: { season: string; start: number }[] = [];
  const secRe = /(파이널\s*시즌|시즌\s*(\d))[^가-힣]{0,40}?입상\s*덱\s*레시피/g;
  let sm: RegExpExecArray | null;
  while ((sm = secRe.exec(text)) !== null) {
    const season = sm[1].includes("파이널") ? "파이널" : `시즌${sm[2]}`;
    sections.push({ season, start: sm.index });
  }
  if (sections.length === 0) throw new Error("[kr-league] 시즌 섹션 0건 — 구조 변경 의심, hard fail");

  const entries: Entry[] = [];
  const entryRe =
    /(마스터|시니어|주니어)\s*부문\s*(우승|준우승|TOP\s*4)\s*\/\s*([^/]{1,30}?)\s*덱\s*코드\s*[:：]?\s*([A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4})/g;
  let em: RegExpExecArray | null;
  while ((em = entryRe.exec(text)) !== null) {
    let season = sections[0].season;
    for (const s of sections) if (s.start < em.index) season = s.season;
    entries.push({ season, division: em[1], result: em[2].replace(/\s/g, ""), player: em[3].trim(), code: em[4] });
  }
  return entries;
}

type KrCard = { cardNum: string; cardName: string; cardCount: number; CardType?: string; cardImg?: string };

let lastFetch = 0;
async function fetchDeckCode(code: string): Promise<KrCard[]> {
  fs.mkdirSync(CODE_CACHE, { recursive: true });
  const cachePath = path.join(CODE_CACHE, `${code}.json`);
  if (fs.existsSync(cachePath)) return JSON.parse(fs.readFileSync(cachePath, "utf8"));

  const wait = lastFetch + THROTTLE_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetch = Date.now();
  const { stdout } = await execFileAsync("curl", [
    "-sS",
    "--max-time",
    "30",
    "-X",
    "POST",
    "https://pokemoncard.co.kr/v2/ajax2",
    "-A",
    UA,
    "-H",
    `Referer: https://pokemoncard.co.kr/recipe/search?code=${code}`,
    "-H",
    "Origin: https://pokemoncard.co.kr",
    "-H",
    "X-Requested-With: XMLHttpRequest",
    "-F",
    "action=get_dec_detail",
    "-F",
    `code=${code}`,
  ]);
  if (stdout.includes("접근불가")) throw new Error(`덱코드 API 접근불가 (헤더 정책 변경?): ${code}`);
  const cards = JSON.parse(stdout) as KrCard[];
  if (!Array.isArray(cards) || cards.length === 0) throw new Error(`덱코드 응답 비정상: ${code}`);
  fs.writeFileSync(cachePath, JSON.stringify(cards, null, 1));
  return cards;
}

type Bucket = "pokemon" | "trainer" | "energy";
function bucketOf(cardType?: string): Bucket {
  const t = cardType ?? "";
  if (t.includes("에너지")) return "energy";
  if (/트레이너|서포트|아이템|스타디움|도구|굿즈/.test(t)) return "trainer";
  return "pokemon";
}

/**
 * 종(dex) 핑거프린트 — 포켓몬 카드명 → 도감번호 멀티셋 (count 가중).
 * LogicalCard 는 인쇄판 단위라 같은 덱도 등록 인쇄판이 다르면 어긋남(재록/프로모) →
 * 인쇄판 불변·교차언어(ko/en) 동일성은 종 단위가 정답 (PokeAPI 이름표 활용).
 */
function dexFingerprint(cards: Array<{ name: string; count: number }>, lang: "ko" | "en"): Map<number, number> {
  const fp = new Map<number, number>();
  for (const c of cards) {
    for (const dex of resolveCardDexes(c.name, lang)) {
      fp.set(dex, (fp.get(dex) ?? 0) + c.count);
    }
  }
  return fp;
}
function similarity(a: Map<number, number>, b: Map<number, number>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  let totalA = 0;
  for (const [k, n] of a) {
    totalA += n;
    inter += Math.min(n, b.get(k) ?? 0);
  }
  return totalA ? inter / totalA : 0;
}

async function main() {
  const resolver = await CardResolver.create();

  // 1. 입상덱 페이지 (캐시 우선 — 시즌 후 수동 실행이라 신선도 문제 없음, --force 시 재다운로드 가능 여지)
  const menuCache = path.join(process.cwd(), "data", "kr-league", "menu700.html");
  let html: string;
  if (fs.existsSync(menuCache)) {
    html = fs.readFileSync(menuCache, "utf8");
  } else {
    const { stdout } = await execFileAsync("curl", ["-sS", "--max-time", "30", "-A", UA, MENU_URL]);
    fs.mkdirSync(path.dirname(menuCache), { recursive: true });
    fs.writeFileSync(menuCache, stdout);
    html = stdout;
  }
  const entries = parseEntries(html);
  console.log(`[kr-league] 입상덱 엔트리 ${entries.length}건 파싱 (고유 코드 ${new Set(entries.map((e) => e.code)).size})`);
  if (entries.length === 0) throw new Error("[kr-league] 엔트리 0건 — hard fail");

  const stats = { attached: 0, verified: 0, unverified: 0, skippedDivision: 0, noTournament: 0, failed: 0 };
  const logs: string[] = [];

  for (const e of entries) {
    const lwId = SEASON_TO_LW[e.season];
    if (!lwId) {
      stats.noTournament++;
      logs.push(`미부착(시즌 매핑 없음): ${e.season} ${e.division} ${e.result} ${e.player} ${e.code}`);
      continue;
    }
    if (e.division !== "마스터") {
      // 정본(limitless-web) standings 는 마스터 부문 — 주/시 부문은 부착 대상 행이 없음 (행 생성 금지 원칙)
      stats.skippedDivision++;
      logs.push(`미부착(${e.division} 부문 — 정본 standings 부재): ${e.season} ${e.result} ${e.player} ${e.code}`);
      continue;
    }

    try {
      // 덱코드 해석 → 통일 양식 + logicalCardId
      const krCards = await fetchDeckCode(e.code);
      const buckets: Record<Bucket, Array<{ count: number; set: string; number: string; name: string; cardId: string; logicalCardId?: string | null }>> = {
        pokemon: [],
        trainer: [],
        energy: [],
      };
      for (const c of krCards) {
        const resolved = await resolver.resolveKrBs(c.cardNum);
        buckets[bucketOf(c.CardType)].push({
          count: c.cardCount,
          set: "",
          number: "",
          name: c.cardName,
          cardId: c.cardNum,
          logicalCardId: resolved?.logicalCardId ?? null,
        });
      }
      const krFp = dexFingerprint(buckets.pokemon, "ko");

      // 부착 후보 standings: 우승=1, 준우승=2, TOP4={3,4}
      const placings = e.result === "우승" ? [1] : e.result === "준우승" ? [2] : [3, 4];
      const candidates = await prisma.tournamentStanding.findMany({
        where: { tournamentId: lwId, placing: { in: placings } },
        select: { id: true, placing: true, playerName: true, decklist: true, deckCode: true },
      });
      if (candidates.length === 0) {
        stats.failed++;
        logs.push(`미부착(후보 행 없음): ${e.season} ${e.result} ${e.player} → ${lwId} placing ${placings}`);
        continue;
      }

      // 핑거프린트 대조 (limitless decklist 보유 후보만 점수 산출)
      type Scored = { c: (typeof candidates)[number]; score: number };
      const scored: Scored[] = candidates.map((c) => {
        const dl = c.decklist as { pokemon?: Array<{ count: number; name: string }> } | null;
        return { c, score: similarity(krFp, dexFingerprint(dl?.pokemon ?? [], "en")) };
      });
      scored.sort((a, b) => b.score - a.score);
      // 이미 deckCode 부착된 후보는 후순위 (TOP4 두 코드의 순차 배정)
      const target = scored.find((s) => !s.c.deckCode) ?? scored[0];
      const verified = target.score >= 0.7 && krFp.size >= 2;

      if (!dryRun) {
        await prisma.tournamentStanding.update({
          where: { id: target.c.id },
          data: {
            deckCode: e.code,
            // limitless decklist 없으면 KR 해석분으로 채움 (있으면 원본 보존)
            ...(target.c.decklist ? {} : { decklist: buckets as object, deckSource: "kr-deckcode" }),
          },
        });
      }
      stats.attached++;
      if (verified) stats.verified++;
      else {
        stats.unverified++;
        logs.push(
          `부착(미검증 score=${target.score.toFixed(2)}): ${e.season} ${e.result} ${e.player}(${e.code}) → ${lwId}#${target.c.placing} ${target.c.playerName}`,
        );
      }
    } catch (err) {
      stats.failed++;
      logs.push(`실패: ${e.season} ${e.result} ${e.player} ${e.code} — ${(err as Error).message}`);
    }
  }

  // SourceRef(enrichment) — 시즌(=정본 대회) 단위 1건
  if (!dryRun) {
    for (const [season, lwId] of Object.entries(SEASON_TO_LW)) {
      try {
        await registerEnrichmentRef(lwId, "kr-official", `koreanleague_2026-${season}`, MENU_URL);
      } catch (err) {
        logs.push(`SourceRef 실패(${season}→${lwId}): ${(err as Error).message}`);
      }
    }
  }

  console.log(
    `\n[kr-league] 부착 ${stats.attached}(검증 ${stats.verified}·미검증 ${stats.unverified}) / 주·시 부문 보류 ${stats.skippedDivision} / 실패 ${stats.failed}${dryRun ? " (dry)" : ""}`,
  );
  if (logs.length) {
    console.log(`[kr-league] 사유 로그 ${logs.length}건:`);
    for (const l of logs) console.log(`  - ${l}`);
  }
  console.log(`[kr-league] 카드 미해석 사유:\n${resolver.reportMisses() || "  없음"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
