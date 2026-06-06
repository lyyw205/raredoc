/**
 * P5: pokedata.ovh 공식 메이저 수집기 — 정본 (docs/meta-pipeline-multisource.md §3 #8)
 *
 * 실행: npx tsx scripts/collect-majors-pokedata.ts [--dry-run] [--force] [--limit=6] [--id=0000208]
 *
 * - 정본: 공식 메이저(Regionals/IC/Worlds/Special) standings+풀덱리스트. RK9 직접 스크랩은
 *   robots 금지 — pokedata 가 robots 제약 없는 JSON 재공급원 (2026-06-06 실측·재검증 완료).
 * - 디스커버리: /standings/ HTML 의 onclick 내부ID + 대회명·날짜. **진행중(live) 대회 제외**.
 * - Tournament 행은 디비전 단위 분리: id `pd-{numId}-{division}` (리스크 P1-4). 기본 masters.
 * - ⚠ 개인 취미서버(.ovh) — **영구 캐시 필수·재조회 금지**: data/pokedata/{id}-{division}.json
 *   이 있으면 API 를 다시 부르지 않는다. 스로틀 2s.
 * - 아키타입 없음(deckKey=null) → 집계에서 자동 제외. top cut 라벨은 enrich-majors-limitless(보강)가
 *   부여 — 전량 분류는 P4 분류기 과제.
 * - 한국 개최 메이저도 metaRegion=INTL (리스크 P1-2 — KR 메타는 코리안리그만).
 * - major-registry.json 에 limitless-web 조인 후보를 자동 기입(city+date ±3d) — 보강 스크립트가 소비.
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
import { LW_BASE, fetchLwHtml } from "./lib/limitless-web-parse";

const execFileAsync = promisify(execFile);
const PD_BASE = "https://www.pokedata.ovh";
const CACHE_DIR = path.join(process.cwd(), "data", "pokedata");
const LW_CACHE_DIR = path.join(process.cwd(), "data", "limitless-web");
const REGISTRY_PATH = path.join(process.cwd(), "data", "major-registry.json");
const THROTTLE_MS = 2000;

type Args = { dryRun: boolean; force: boolean; limit: number; id: string | null; division: string };
function parseArgs(): Args {
  const a: Args = { dryRun: false, force: false, limit: 6, id: null, division: "masters" };
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") a.dryRun = true;
    else if (arg === "--force") a.force = true;
    else if (arg.startsWith("--limit=")) a.limit = parseInt(arg.slice("--limit=".length), 10);
    else if (arg.startsWith("--id=")) a.id = arg.slice("--id=".length);
    else if (arg.startsWith("--division=")) a.division = arg.slice("--division=".length);
  }
  return a;
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/** "May 29-31, 2026" / "June 6-7, 2026" / "Feb 13 - 15, 2026" → 종료일 ISO */
function parseEndDate(text: string): string | null {
  const m = text.match(/([A-Z][a-z]+)\.?\s+(\d{1,2})(?:\s*-\s*(?:([A-Z][a-z]+)\.?\s+)?(\d{1,2}))?,\s*(\d{4})/);
  if (!m) return null;
  const month = MONTHS[(m[3] ?? m[1]).toLowerCase()];
  const day = parseInt(m[4] ?? m[2], 10);
  if (!month) return null;
  return `${m[5]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function levelOf(name: string): string {
  if (/World/i.test(name)) return "worlds";
  if (/International/i.test(name)) return "ic";
  if (/Regional/i.test(name)) return "regional";
  return "special"; // Special Championships / Cup 등
}

/** "2026 Indianapolis Pokémon TCG Regional Championships" → "Indianapolis" */
function cityOf(name: string): string | null {
  const m = name.match(/^\d{4}\s+(.+?)\s+Pok/);
  return m ? m[1].trim() : null;
}

type Discovered = { id: string; name: string; dateEnd: string };

async function discover(): Promise<Discovered[]> {
  const { stdout } = await execFileAsync("curl", ["-sS", "--max-time", "30", `${PD_BASE}/standings/`], {
    maxBuffer: 8 * 1024 * 1024,
  });
  const out: Discovered[] = [];
  const re = /onclick="location\.href='(\d{7})\/'"[^>]*>\s*([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stdout)) !== null) {
    const raw = m[2].replace(/\s+/g, " ").trim();
    const dateEnd = parseEndDate(raw);
    if (!dateEnd) continue;
    const name = raw.replace(/\s*-\s*[A-Z][a-z]+\.?\s+\d.*$/, "").trim();
    out.push({ id: m[1], name, dateEnd });
  }
  if (out.length === 0) throw new Error("[pd] 디스커버리 0건 — HTML 구조 변경 의심, hard fail");
  return out;
}

type PdCard = { count: number; name: string; number: string; set: string; logicalCardId?: string | null };
type PdPlayer = {
  name: string;
  placing: number;
  record?: { wins?: number; losses?: number; ties?: number };
  decklist?: { pokemon?: PdCard[]; trainer?: PdCard[]; energy?: PdCard[] } | null;
};
type PdResponse = { tournament: string; data: Record<string, PdPlayer[]> };

let lastFetch = 0;
async function fetchComplete(numId: string, division: string): Promise<PdResponse> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, `${numId}-${division}.json`);
  if (fs.existsSync(cachePath)) return JSON.parse(fs.readFileSync(cachePath, "utf8"));

  const wait = lastFetch + THROTTLE_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetch = Date.now();
  const url = `${PD_BASE}/api/complete/?id=${numId}&division=${division}&game=tcg`;
  const { stdout } = await execFileAsync("curl", ["-sS", "--max-time", "120", url], {
    maxBuffer: 64 * 1024 * 1024,
  });
  const data = JSON.parse(stdout) as PdResponse;
  if (!data?.data) throw new Error(`[pd] 응답 비정상: ${url}`);
  fs.writeFileSync(cachePath, JSON.stringify(data));
  return data;
}

/** major-registry: limitless-web 조인 후보 자동 기입 (city 포함 + 날짜 ±3일) */
type RegistryEntry = {
  pokedataId: string;
  division: string;
  name: string;
  dateEnd: string;
  level: string;
  limitlessWebId: string | null;
  matchedBy: string | null;
};

async function matchLimitlessWeb(d: Discovered): Promise<string | null> {
  const listPath = path.join(LW_CACHE_DIR, "tournaments-list.html");
  let html: string;
  if (fs.existsSync(listPath)) html = fs.readFileSync(listPath, "utf8");
  else html = await fetchLwHtml(`${LW_BASE}/tournaments?show=300`, LW_CACHE_DIR, "tournaments-list.html");
  const city = cityOf(d.name);
  if (!city) return null;
  const rowRe = /<tr[^>]*data-date="([^"]+)"[^>]*data-name="([^"]*)"[^>]*>[\s\S]*?href="\/tournaments\/(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const [, date, name, id] = m;
    if (!name.toLowerCase().includes(city.toLowerCase())) continue;
    const diff = Math.abs(new Date(date).getTime() - new Date(d.dateEnd).getTime()) / 86_400_000;
    if (diff <= 3) return id;
  }
  return null;
}

function loadRegistry(): { _note: string; majors: RegistryEntry[] } {
  if (fs.existsSync(REGISTRY_PATH)) return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  return {
    _note:
      "공식 메이저 정본(pokedata) ↔ 보강(limitless-web) 조인 레지스트리 (multisource §1). limitlessWebId 는 city+date 자동 후보 — 수기 검증/보강 가능. 한국 개최 메이저도 metaRegion=INTL.",
    majors: [],
  };
}

async function main() {
  const args = parseArgs();
  const resolver = await CardResolver.create();
  const today = new Date().toISOString().slice(0, 10);

  const all = await discover();
  console.log(`[pd] 디스커버리 ${all.length}건 (최신: ${all[0]?.name} ~${all[0]?.dateEnd})`);
  const completed = all.filter((d) => d.dateEnd < today); // 진행중(live) 제외
  const targets = (args.id ? completed.filter((d) => d.id === args.id) : completed).slice(0, args.limit);
  console.log(`[pd] 대상 ${targets.length}건 (완료 대회만, limit=${args.limit})`);

  const registry = loadRegistry();
  const stats = { tournaments: 0, standings: 0, decklists: 0, skipped: 0 };

  for (const d of targets) {
    const tid = `pd-${d.id}-${args.division}`;
    if (!args.force) {
      const existing = await prisma.tournament.findUnique({ where: { id: tid }, select: { syncedAt: true } });
      if (existing?.syncedAt) {
        stats.skipped++;
        continue;
      }
    }

    const res = await fetchComplete(d.id, args.division);
    const players = res.data[args.division] ?? [];
    if (players.length === 0) {
      console.warn(`[pd] ${tid} ${args.division} 0명 — skip`);
      continue;
    }

    const countryCount = new Map<string, number>();
    const standings: NormalizedStanding[] = [];
    let withDeck = 0;
    for (const p of players) {
      if (p.placing == null) continue;
      // "Cerys Jones [US]" → 이름 + 국가
      const nm = p.name.match(/^(.*?)\s*\[([A-Z]{2})\]\s*$/);
      const playerName = (nm ? nm[1] : p.name).trim();
      const country = nm ? nm[2] : null;
      if (country) countryCount.set(country, (countryCount.get(country) ?? 0) + 1);

      let decklist: object | null = null;
      if (p.decklist && (p.decklist.pokemon?.length || p.decklist.trainer?.length)) {
        for (const bucket of ["pokemon", "trainer", "energy"] as const) {
          for (const c of p.decklist[bucket] ?? []) {
            const resolved = await resolver.resolveEn(c.set, c.number);
            if (resolved) c.logicalCardId = resolved.logicalCardId;
          }
        }
        decklist = p.decklist;
        withDeck++;
      }
      standings.push({
        placing: p.placing,
        playerName,
        country,
        deckKey: null, // 아키타입 미제공 — enrich-majors-limitless(top cut) / P4 분류기(전량) 과제
        decklist,
        wins: p.record?.wins ?? 0,
        losses: p.record?.losses ?? 0,
        ties: p.record?.ties ?? 0,
        deckSource: decklist ? "pokedata" : null,
      });
    }
    const region = [...countryCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "INTL";

    const t: NormalizedTournament = {
      id: tid,
      source: "pokedata",
      sourceId: `${d.id}-${args.division}`,
      metaRegion: "INTL", // 한국 개최 포함 — 메이저는 국제 메타 (리스크 P1-2)
      level: levelOf(d.name),
      division: args.division,
      externalUrl: `${PD_BASE}/standings/${d.id}/`,
      name: d.name,
      date: new Date(d.dateEnd),
      region,
      format: "STANDARD",
      players: standings.length,
      platform: "오프라인",
    };
    const loaded = await loadNormalizedTournament(t, standings, { dryRun: args.dryRun });
    console.log(
      `[pd] ${tid} "${d.name}" ~${d.dateEnd} → standings ${loaded.standings} (덱리스트 ${withDeck})${args.dryRun ? " (dry)" : ""}`,
    );
    stats.tournaments++;
    stats.standings += loaded.standings;
    stats.decklists += withDeck;

    // 레지스트리 갱신 (보강 조인 후보)
    if (!registry.majors.some((r) => r.pokedataId === d.id && r.division === args.division)) {
      const lwId = await matchLimitlessWeb(d);
      registry.majors.push({
        pokedataId: d.id,
        division: args.division,
        name: d.name,
        dateEnd: d.dateEnd,
        level: levelOf(d.name),
        limitlessWebId: lwId,
        matchedBy: lwId ? "auto(city+date±3d)" : null,
      });
    }
  }

  if (!args.dryRun) fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n");
  console.log(
    `\n[pd] 완료: 대회 ${stats.tournaments} / standings ${stats.standings} / 덱리스트 ${stats.decklists} / skip ${stats.skipped}`,
  );
  console.log(`[pd] 카드 미해석 사유:\n${resolver.reportMisses() || "  없음"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
