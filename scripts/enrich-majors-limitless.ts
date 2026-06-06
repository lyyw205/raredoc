/**
 * P5: 메이저 아키타입 보강 — limitless-web top cut 라벨 → pokedata 정본 standings
 * (docs/meta-pipeline-multisource.md §1 — 메이저 정본=pokedata, limitless-web 은 보강)
 *
 * 실행: npx tsx scripts/enrich-majors-limitless.ts [--dry-run] [--force]
 *
 * - 행 생성 금지: pd-* 행에 deckKey/deckName/archetypeRaw 주입 + SourceRef(enrichment)만.
 * - 조인: data/major-registry.json 의 (pokedataId ↔ limitlessWebId) — collect-majors-pokedata 가
 *   city+date±3d 로 자동 기입(수기 보강 가능).
 * - 부착 검증: (placing 일치) AND (선수명 일치 — 양쪽 모두 로마자라 직접 대조 가능).
 *   불일치는 미부착 + 로그 (조용한 오부착 금지).
 * - limitless-web standings 는 top cut(보통 32)만 — 나머지는 P4 분류기 과제(deckKey null 유지).
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { registerEnrichmentRef } from "./lib/tournament-loader";
import { LW_BASE, fetchLwHtml, parseStandings, buildSlugMap } from "./lib/limitless-web-parse";

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const REGISTRY_PATH = path.join(process.cwd(), "data", "major-registry.json");
const LW_CACHE_DIR = path.join(process.cwd(), "data", "limitless-web");

// 디아크리틱 제거(NFD) — pd 는 ASCII 변환명(Muller), lw 는 원형(Müller)인 경우 흡수
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const tokens = (s: string) => norm(s).split(" ").filter(Boolean);
/** 이름 일치: 정확 일치 또는 토큰 부분집합(≥2 토큰) — pd 축약("Oliver Rochin") vs lw 풀네임("Oliver Rochin Montijo") 흡수 */
function nameMatch(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.join(" ") === tb.join(" ")) return true;
  const [small, big] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return small.length >= 2 && small.every((t) => big.includes(t));
}

async function main() {
  if (!fs.existsSync(REGISTRY_PATH)) throw new Error("major-registry.json 없음 — collect-majors-pokedata 먼저 실행");
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8")) as {
    majors: Array<{ pokedataId: string; division: string; name: string; limitlessWebId: string | null }>;
  };
  const slugMap = await buildSlugMap();
  console.log(`[mj] 슬러그 매핑 사전 ${slugMap.size}건`);

  const stats = { tournaments: 0, labeled: 0, nameMismatch: 0, noStanding: 0 };
  const unmapped = new Map<string, number>();

  for (const entry of registry.majors) {
    if (!entry.limitlessWebId) {
      console.log(`[mj] skip(${entry.name}): limitlessWebId 없음 — 레지스트리 수기 보강 필요`);
      continue;
    }
    const pdId = `pd-${entry.pokedataId}-${entry.division}`;
    const pd = await prisma.tournament.findUnique({ where: { id: pdId }, select: { id: true } });
    if (!pd) {
      console.log(`[mj] skip(${entry.name}): 정본 행 ${pdId} 없음`);
      continue;
    }

    const url = `${LW_BASE}/tournaments/${entry.limitlessWebId}`;
    const html = await fetchLwHtml(url, LW_CACHE_DIR, `tournament-${entry.limitlessWebId}.html`);
    const lwStandings = parseStandings(html);
    if (lwStandings.length === 0) {
      console.warn(`[mj] ${entry.name}: lw standings 0건 — skip`);
      continue;
    }

    // 정본 standings 일괄 인덱스 (placing 기본 + 이름 폴백 — 스위스 동률 구간은 두 사이트 정렬이 다름)
    const pdStandings = await prisma.tournamentStanding.findMany({
      where: { tournamentId: pdId },
      select: { id: true, placing: true, playerName: true, deckKey: true },
    });
    const byPlacing = new Map(pdStandings.map((p) => [p.placing, p]));

    let labeled = 0;
    for (const s of lwStandings) {
      if (!s.archetypeName) continue;
      // 1차: placing 일치 + 이름 검증(토큰 부분집합)
      let target = byPlacing.get(s.placing);
      if (!target || !nameMatch(target.playerName, s.player)) {
        // 2차: 이름 전역 매치(유일할 때만) + placing 근접(±30 — 동률 구간 정렬 차이 허용)
        const candidates = pdStandings.filter(
          (p) => nameMatch(p.playerName, s.player) && Math.abs(p.placing - s.placing) <= 30,
        );
        if (candidates.length === 1) {
          target = candidates[0];
        } else {
          stats.nameMismatch++;
          console.log(
            `  ⚠ 미부착 ${pdId} lw#${s.placing} "${s.player}": placing 불일치 + 이름 후보 ${candidates.length}건`,
          );
          continue;
        }
      }
      if (target.deckKey && !force) {
        labeled++;
        continue;
      }
      const deckKey = slugMap.get(s.archetypeName.toLowerCase()) ?? null;
      if (!deckKey) unmapped.set(s.archetypeName, (unmapped.get(s.archetypeName) ?? 0) + 1);
      if (!dryRun) {
        await prisma.tournamentStanding.update({
          where: { id: target.id },
          data: { deckKey, deckName: s.archetypeName, archetypeRaw: s.archetypeName },
        });
      }
      labeled++;
    }

    if (!dryRun) {
      try {
        await registerEnrichmentRef(pdId, "limitless-web", entry.limitlessWebId, url);
      } catch (e) {
        console.warn(`[mj] SourceRef 실패(${pdId}): ${(e as Error).message}`);
      }
    }
    console.log(`[mj] ${pdId} "${entry.name}" ← lw/${entry.limitlessWebId}: 라벨 ${labeled}/${lwStandings.length}${dryRun ? " (dry)" : ""}`);
    stats.tournaments++;
    stats.labeled += labeled;
  }

  console.log(
    `\n[mj] 완료: 대회 ${stats.tournaments} / 라벨 ${stats.labeled} / 이름불일치 미부착 ${stats.nameMismatch} / 정본행 없음 ${stats.noStanding}`,
  );
  if (unmapped.size) {
    console.log(`[mj] ⚠ 슬러그 미매핑 ${unmapped.size}종 (archetypeRaw 보존 — aliases.json 보강 대상):`);
    for (const [name, n] of [...unmapped.entries()].sort((a, b) => b[1] - a[1])) console.log(`  - "${name}" ×${n}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
