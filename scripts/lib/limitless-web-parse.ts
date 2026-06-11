/**
 * limitlesstcg.com 메인 사이트 공용 파서 — collect-tournaments-limitless-web(P3 코리안리그 정본)와
 * enrich-majors-limitless(P5 메이저 보강)가 공유. docs/meta-pipeline-multisource.md §3
 *
 * 메인 사이트는 JSON API 없음 → SSR HTML 정규식 파싱 (data-* 속성).
 * 아키타입 링크는 숫자 id(/decks/284)라 정본 슬러그가 아님 → tooltip 이름을
 * DB(DeckArchetype.nameEn / standings.deckName) + archetype-aliases.json 으로 매핑.
 */
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "../../src/lib/prisma";

const execFileAsync = promisify(execFile);

export const LW_BASE = "https://limitlesstcg.com";
export const LW_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const ALIASES_PATH = path.join(process.cwd(), "src", "data", "archetype-aliases.json");
const THROTTLE_MS = 1000;

let lastFetch = 0;
/** 1req/s 스로틀 + 캐시 디렉토리 보존 fetch (응답 1KB 미만이면 구조 이상으로 간주) */
export async function fetchLwHtml(url: string, cacheDir: string, cacheName: string): Promise<string> {
  const wait = lastFetch + THROTTLE_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetch = Date.now();
  const { stdout } = await execFileAsync("curl", ["-sSL", "--max-time", "60", "-A", LW_UA, url], {
    maxBuffer: 32 * 1024 * 1024,
  });
  if (!stdout || stdout.length < 1000) throw new Error(`응답 비정상(${stdout?.length ?? 0}B): ${url}`);
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(path.join(cacheDir, cacheName), stdout);
  return stdout;
}

/** HTML 엔티티 디코드 (선수명 "O&#039;Neill" 류 — 미디코드 시 정본과 이름 대조 실패) */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** "1st Juho Ko" → { placing: 1, player: "Juho Ko" } */
export function parseToggle(text: string): { placing: number; player: string } | null {
  const m = text.trim().match(/^(\d+)(?:st|nd|rd|th)\s+(.+)$/);
  return m ? { placing: parseInt(m[1], 10), player: decodeEntities(m[2].trim()) } : null;
}

export type WebStanding = {
  placing: number;
  player: string;
  country: string | null;
  archetypeName: string | null; // data-tooltip (예 "Dragapult Dusknoir")
};

/** 대회 상세 페이지 standings 테이블 파싱 */
export function parseStandings(html: string): WebStanding[] {
  const out: WebStanding[] = [];
  for (const tr of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
    if (!tr.includes("/players/")) continue;
    const placing = tr.match(/<td>(\d+)<\/td>/)?.[1];
    const player = tr.match(/<a href="\/players\/\d+">([^<]+)<\/a>/)?.[1];
    if (!placing || !player) continue;
    const country = tr.match(/class="flag"[^>]*alt="([A-Z]{2})"/)?.[1] ?? null;
    const archetypeNameRaw = tr.match(/<a href="\/decks\/\d+[^"]*"><span data-tooltip="([^"]+)"/)?.[1] ?? null;
    out.push({
      placing: parseInt(placing, 10),
      player: decodeEntities(player.trim()),
      country,
      archetypeName: archetypeNameRaw ? decodeEntities(archetypeNameRaw) : null,
    });
  }
  return out;
}

export type LwBucket = "pokemon" | "trainer" | "energy";
export type LwDeckEntry = { count: number; set: string; number: string; name: string; cardId?: string | null };
export type ParsedDecklist = { placing: number; player: string; cards: Record<LwBucket, LwDeckEntry[]> };

/** /tournaments/{id}/decklists 페이지 파싱 — EN ptcgoCode 표기 (2026-06-06 실측) */
export function parseDecklists(html: string): ParsedDecklist[] {
  const out: ParsedDecklist[] = [];
  const sections = html.split('<div class="tournament-decklist">').slice(1);
  for (const sec of sections) {
    const toggleText = sec.match(/<div class="decklist-toggle"[^>]*>([^<]+)<\/div>/)?.[1];
    const head = toggleText ? parseToggle(toggleText) : null;
    if (!head) continue;
    const cards: Record<LwBucket, LwDeckEntry[]> = { pokemon: [], trainer: [], energy: [] };
    const cols = sec.split('<div class="decklist-column-heading">').slice(1);
    for (const col of cols) {
      const heading = col.slice(0, col.indexOf("<")).toLowerCase();
      const bucket: LwBucket | null = heading.includes("pok")
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

/** 아키타입 tooltip 이름 → 정본 슬러그 매핑 사전 (DB nameEn/deckName + aliases.json) */
export async function buildSlugMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const a of await prisma.deckArchetype.findMany({ select: { id: true, nameEn: true } })) {
    if (a.nameEn) map.set(a.nameEn.toLowerCase(), a.id);
  }
  const rows = await prisma.tournamentStanding.findMany({
    where: { deckKey: { not: null }, deckName: { not: null } },
    select: { deckKey: true, deckName: true },
    distinct: ["deckKey", "deckName"],
  });
  for (const r of rows) map.set(r.deckName!.toLowerCase(), r.deckKey!);
  if (fs.existsSync(ALIASES_PATH)) {
    const aliases = JSON.parse(fs.readFileSync(ALIASES_PATH, "utf8"));
    for (const [name, slug] of Object.entries(aliases["limitless-web"] ?? {})) {
      map.set(name.toLowerCase(), slug as string);
    }
  }
  return map;
}
