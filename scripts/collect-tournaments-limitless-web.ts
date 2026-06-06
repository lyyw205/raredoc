/**
 * P3: limitlesstcg.com 메인 사이트 수집기 — 코리안리그 정본 (docs/meta-pipeline-multisource.md §3 #2)
 *
 * 실행: npx tsx scripts/collect-tournaments-limitless-web.ts [--dry-run] [--force] [--limit=N] [--id=567]
 *
 * - 대회 선별은 **시리즈명 기준**("Korean League" prefix) — data-country 단독 선별 금지(리스크 P1-2:
 *   한국 개최 메이저가 KR 메타를 오염). 메이저 enrichment 용도는 후속(P5).
 * - 메인 사이트는 JSON API 없음 → SSR HTML 정규식 파싱 (data-* 속성, sync-pack-namu-ko 관례).
 * - standings 는 사이트 게재분(top cut, 보통 32)만 — usageRate 는 "입상 점유율" 의미 (UI 라벨 구분).
 * - 아키타입: 메인 사이트는 숫자 id(/decks/284)라 정본 슬러그가 아님 → tooltip 이름을
 *   DB(DeckArchetype.nameEn / standings.deckName)와 archetype-aliases.json 으로 슬러그 매핑.
 *   실패 시 deckKey=null + archetypeRaw 보존(P4 분류기로 사후 재분류).
 * - 덱리스트 카드는 EN ptcgoCode 표기(2026-06-06 실측 — standard-jp 대회 포함) → resolver 경로①.
 * - 0건 파싱 시 hard fail (HTML 구조 변경 감지 — 나무위키 다중표 오염 선례).
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "../src/lib/prisma";
import { CardResolver } from "./lib/resolve-card";
import {
  loadNormalizedTournament,
  type NormalizedStanding,
  type NormalizedTournament,
} from "./lib/tournament-loader";

const execFileAsync = promisify(execFile);
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const BASE = "https://limitlesstcg.com";
const CACHE_DIR = path.join(process.cwd(), "data", "limitless-web");
const ALIASES_PATH = path.join(process.cwd(), "src", "data", "archetype-aliases.json");
const THROTTLE_MS = 1000;

type Args = { dryRun: boolean; force: boolean; limit: number; id: string | null };
function parseArgs(): Args {
  const a: Args = { dryRun: false, force: false, limit: 99, id: null };
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") a.dryRun = true;
    else if (arg === "--force") a.force = true;
    else if (arg.startsWith("--limit=")) a.limit = parseInt(arg.slice("--limit=".length), 10);
    else if (arg.startsWith("--id=")) a.id = arg.slice("--id=".length);
  }
  return a;
}

let lastFetch = 0;
async function fetchHtml(url: string, cacheName: string): Promise<string> {
  const wait = lastFetch + THROTTLE_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetch = Date.now();
  const { stdout } = await execFileAsync(
    "curl",
    ["-sSL", "--max-time", "60", "-A", UA, url],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  if (!stdout || stdout.length < 1000) throw new Error(`응답 비정상(${stdout?.length ?? 0}B): ${url}`);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, cacheName), stdout);
  return stdout;
}

/** "1st Juho Ko" → { placing: 1, player: "Juho Ko" } */
function parseToggle(text: string): { placing: number; player: string } | null {
  const m = text.trim().match(/^(\d+)(?:st|nd|rd|th)\s+(.+)$/);
  return m ? { placing: parseInt(m[1], 10), player: m[2].trim() } : null;
}

type WebStanding = {
  placing: number;
  player: string;
  country: string | null;
  archetypeName: string | null; // data-tooltip (예 "Dragapult Dusknoir")
};

function parseStandings(html: string): WebStanding[] {
  const out: WebStanding[] = [];
  for (const tr of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
    if (!tr.includes("/players/")) continue;
    const placing = tr.match(/<td>(\d+)<\/td>/)?.[1];
    const player = tr.match(/<a href="\/players\/\d+">([^<]+)<\/a>/)?.[1];
    if (!placing || !player) continue;
    const country = tr.match(/class="flag"[^>]*alt="([A-Z]{2})"/)?.[1] ?? null;
    const archetypeName = tr.match(/<a href="\/decks\/\d+[^"]*"><span data-tooltip="([^"]+)"/)?.[1] ?? null;
    out.push({ placing: parseInt(placing, 10), player: player.trim(), country, archetypeName });
  }
  return out;
}

type Bucket = "pokemon" | "trainer" | "energy";
type DeckEntry = { count: number; set: string; number: string; name: string; logicalCardId?: string | null };
type ParsedDecklist = { placing: number; player: string; cards: Record<Bucket, DeckEntry[]> };

function parseDecklists(html: string): ParsedDecklist[] {
  const out: ParsedDecklist[] = [];
  const sections = html.split('<div class="tournament-decklist">').slice(1);
  for (const sec of sections) {
    const toggleText = sec.match(/<div class="decklist-toggle"[^>]*>([^<]+)<\/div>/)?.[1];
    const head = toggleText ? parseToggle(toggleText) : null;
    if (!head) continue;
    const cards: Record<Bucket, DeckEntry[]> = { pokemon: [], trainer: [], energy: [] };
    // 컬럼 단위: <div class="decklist-column-heading">Pokémon (12)</div> 뒤의 decklist-card 들
    const cols = sec.split('<div class="decklist-column-heading">').slice(1);
    for (const col of cols) {
      const heading = col.slice(0, col.indexOf("<")).toLowerCase();
      const bucket: Bucket | null = heading.includes("pok")
        ? "pokemon"
        : heading.includes("trainer")
          ? "trainer"
          : heading.includes("energy")
            ? "energy"
            : null;
      if (!bucket) continue;
      const cardRe =
        /<div class="decklist-card"[^>]*data-set="([^"]+)"[^>]*data-number="([^"]+)"[^>]*>[\s\S]*?<span class="card-count">(\d+)<\/span>\s*<span class="card-name">([^<]+)<\/span>/g;
      let m: RegExpExecArray | null;
      while ((m = cardRe.exec(col)) !== null) {
        cards[bucket].push({ set: m[1], number: m[2], count: parseInt(m[3], 10), name: m[4].trim() });
      }
    }
    out.push({ placing: head.placing, player: head.player, cards });
  }
  return out;
}

/** 아키타입 이름 → 정본 슬러그 매핑 사전 구축 (DB + aliases.json) */
async function buildSlugMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  // 1) DeckArchetype.nameEn (집계가 채운 play 원문)
  for (const a of await prisma.deckArchetype.findMany({ select: { id: true, nameEn: true } })) {
    if (a.nameEn) map.set(a.nameEn.toLowerCase(), a.id);
  }
  // 2) standings 의 (deckName, deckKey) — play 수집분이 더 넓음
  const rows = await prisma.tournamentStanding.findMany({
    where: { deckKey: { not: null }, deckName: { not: null } },
    select: { deckKey: true, deckName: true },
    distinct: ["deckKey", "deckName"],
  });
  for (const r of rows) map.set(r.deckName!.toLowerCase(), r.deckKey!);
  // 3) aliases.json (수동 보강 — 네임스페이스 limitless-web)
  if (fs.existsSync(ALIASES_PATH)) {
    const aliases = JSON.parse(fs.readFileSync(ALIASES_PATH, "utf8"));
    for (const [name, slug] of Object.entries(aliases["limitless-web"] ?? {})) {
      map.set(name.toLowerCase(), slug as string);
    }
  }
  return map;
}

async function main() {
  const args = parseArgs();
  const resolver = await CardResolver.create();
  const slugMap = await buildSlugMap();
  console.log(`[lw] 슬러그 매핑 사전 ${slugMap.size}건 (DB nameEn/deckName + aliases.json)`);

  // 1. 대회 목록 — 시리즈명 선별
  const listHtml = await fetchHtml(`${BASE}/tournaments?show=300`, "tournaments-list.html");
  const rowRe = /<tr[^>]*data-name="(Korean League[^"]*)"[^>]*>[\s\S]*?<\/tr>/g;
  type Row = { name: string; date: string; format: string; players: number; id: string };
  const rows: Row[] = [];
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(listHtml)) !== null) {
    const tr = m[0];
    const attrs = Object.fromEntries([...tr.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
    const id = tr.match(/href="\/tournaments\/(\d+)"/)?.[1];
    if (!id) continue;
    rows.push({
      name: attrs["name"],
      date: attrs["date"],
      format: attrs["format"] || "standard",
      players: parseInt(attrs["players"] || "0", 10),
      id,
    });
  }
  if (rows.length === 0) throw new Error("[lw] Korean League 행 0건 — HTML 구조 변경 의심, hard fail");
  console.log(`[lw] Korean League ${rows.length}건 발견`);

  const targets = (args.id ? rows.filter((r) => r.id === args.id) : rows).slice(0, args.limit);
  const stats = { tournaments: 0, standings: 0, decklists: 0, skipped: 0, unmappedNames: new Map<string, number>() };

  for (const row of targets) {
    const tid = `lw-${row.id}`;
    // 멱등: 이미 sync 된 대회 skip (--force 로 재수집)
    if (!args.force) {
      const existing = await prisma.tournament.findUnique({ where: { id: tid }, select: { syncedAt: true } });
      if (existing?.syncedAt) {
        stats.skipped++;
        continue;
      }
    }

    const pageHtml = await fetchHtml(`${BASE}/tournaments/${row.id}`, `tournament-${row.id}.html`);
    const webStandings = parseStandings(pageHtml);
    if (webStandings.length === 0) throw new Error(`[lw] ${tid} standings 0건 파싱 — 구조 변경 의심, hard fail`);

    // 덱리스트 (없는 대회도 있음 — 페이지 404/빈 섹션 허용)
    let decklists: ParsedDecklist[] = [];
    try {
      const dlHtml = await fetchHtml(`${BASE}/tournaments/${row.id}/decklists`, `decklists-${row.id}.html`);
      decklists = parseDecklists(dlHtml);
    } catch {
      console.warn(`[lw] ${tid} decklists 페이지 없음/실패 — standings 만 적재`);
    }
    const dlByPlacing = new Map(decklists.map((d) => [d.placing, d]));

    const standings: NormalizedStanding[] = [];
    for (const s of webStandings) {
      const deckKey = s.archetypeName ? (slugMap.get(s.archetypeName.toLowerCase()) ?? null) : null;
      if (s.archetypeName && !deckKey) {
        stats.unmappedNames.set(s.archetypeName, (stats.unmappedNames.get(s.archetypeName) ?? 0) + 1);
      }
      const dl = dlByPlacing.get(s.placing);
      let decklist: object | null = null;
      if (dl) {
        // EN ptcgoCode 표기 → resolver 경로① 로 logicalCardId additive 보강
        for (const bucket of ["pokemon", "trainer", "energy"] as const) {
          for (const c of dl.cards[bucket]) {
            const resolved = await resolver.resolveEn(c.set, c.number);
            if (resolved) c.logicalCardId = resolved.logicalCardId;
          }
        }
        decklist = dl.cards;
        stats.decklists++;
      }
      standings.push({
        placing: s.placing,
        playerName: s.player,
        country: s.country,
        deckKey,
        deckName: s.archetypeName,
        archetypeRaw: s.archetypeName,
        decklist,
        deckSource: decklist ? "limitless" : null,
      });
    }

    const t: NormalizedTournament = {
      id: tid,
      source: "limitless-web",
      sourceId: row.id,
      metaRegion: "KR",
      level: "league",
      externalUrl: `${BASE}/tournaments/${row.id}`,
      name: `${row.name} ${row.date.slice(0, 4)}`,
      date: new Date(row.date),
      region: "KR",
      format: row.format === "standard-jp" ? "STANDARD_JP" : "STANDARD",
      players: row.players,
      platform: "오프라인",
    };
    const res = await loadNormalizedTournament(t, standings, { dryRun: args.dryRun });
    console.log(
      `[lw] ${tid} "${t.name}" ${row.date} p=${row.players} → standings ${res.standings} (덱리스트 ${decklists.length})${args.dryRun ? " (dry)" : ""}`,
    );
    stats.tournaments++;
    stats.standings += res.standings;
  }

  console.log(
    `\n[lw] 완료: 대회 ${stats.tournaments} / standings ${stats.standings} / 덱리스트 ${stats.decklists} / skip ${stats.skipped}`,
  );
  if (stats.unmappedNames.size) {
    console.log(`[lw] ⚠ 슬러그 미매핑 아키타입 ${stats.unmappedNames.size}종 (archetypeRaw 보존, aliases.json 보강 대상):`);
    for (const [name, n] of [...stats.unmappedNames.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  - "${name}" ×${n}`);
    }
  }
  console.log(`[lw] 카드 미해석 사유:\n${resolver.reportMisses() || "  없음"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
