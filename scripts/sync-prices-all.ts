/**
 * 시세 수집 오케스트레이터 (Layer 1 총괄) — 순수 코드, LLM 없음.
 *
 * 역할:
 *  - 출처별 sync(run())을 순서대로 실행
 *  - 출처 단위로 "치명 실패(ok=false)" 시 지수 백오프 재시도 (최대 N회)
 *  - 각 출처 결과를 sanity 검증 + 타임스탬프 로그로 출력
 *  - 마지막에 전체 요약표 + 종료코드(실패 있으면 1) → CLI 로그로 바로 판단
 *
 * 자동화(cron) 안 함. 터미널에서 사람이 실행하고 로그 보고 대응.
 *
 * 실행:
 *   npm run sync:prices:all                 # 전 출처
 *   npm run sync:prices:all -- --only=en    # 특정 출처만 (en|jp-yuyu)
 *   npm run sync:prices:all -- --en-limit=5 # EN 세트 N개만(테스트)
 *   npm run sync:prices:all -- --retries=2  # 출처별 재시도 횟수(기본 2)
 *
 * docs/agents/price-collector-plan.md
 */
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";
import { type SyncResult, sleep } from "./lib/price-sync-lib";
import { run as runTcgcsv } from "./sync-prices-tcgcsv";
import { run as runYuyu } from "./sync-prices-yuyu";
// import { run as runEn } from "./sync-prices-pokemontcg"; // 보조/백업(2026-07-02~ tcgcsv 가 메인) — 재도입 시 주석 해제
// import { run as runPoketrace } from "./sync-prices-poketrace"; // 미사용(2026-07-02) — 재도입 시 주석 해제

type Job = {
  key: string; // --only 필터용
  label: string;
  run: () => Promise<SyncResult>;
};

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.split("=")[1];
const enLimit = Number(args.find((a) => a.startsWith("--en-limit="))?.split("=")[1]) || undefined;
const retries = Number(args.find((a) => a.startsWith("--retries="))?.split("=")[1]) || 2;

function ts() {
  return new Date().toISOString().slice(11, 19);
}

const ALL_JOBS: Job[] = [
  { key: "en", label: "EN tcgcsv", run: () => runTcgcsv({ cat: 3 }) },
  { key: "jp-yuyu", label: "JP yuyu-tei", run: () => runYuyu({}) },
  // { key: "en-pmtcg", label: "EN pokemontcg.io", run: () => runEn({ limit: enLimit }) }, // 보조/백업(2026-07-02)
  // { key: "en-poketrace", label: "EN PokeTrace", run: () => runPoketrace({ limit: enLimit }) }, // 미사용(2026-07-02)
];

/** 출처 1개를 ok 될 때까지(또는 횟수 소진까지) 재시도. */
async function runWithRetry(job: Job): Promise<SyncResult> {
  let last: SyncResult | null = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`\n${ts()} ━━ ${job.label} (시도 ${attempt}/${retries}) ━━`);
    last = await job.run();
    last.warnings.forEach((w) => console.warn(`${ts()}   ⚠ ${w}`));
    last.errors.forEach((e) => console.error(`${ts()}   ✗ ${e}`));
    if (last.ok) {
      console.log(
        `${ts()}   ✓ ${job.label}: written=${last.written} dup=${last.dupSkipped} unmatched=${last.unmatched} (${(last.durationMs / 1000).toFixed(1)}s)`
      );
      return last;
    }
    if (attempt < retries) {
      const backoff = 3000 * attempt;
      console.warn(`${ts()}   ↻ ${job.label} 치명 실패 → ${backoff / 1000}s 후 재시도`);
      await sleep(backoff);
    }
  }
  console.error(`${ts()}   ✗✗ ${job.label}: ${retries}회 재시도 모두 실패`);
  return last!;
}

async function main() {
  const t0 = Date.now();
  const jobs = only ? ALL_JOBS.filter((j) => j.key === only) : ALL_JOBS;
  if (!jobs.length) {
    console.error(`--only='${only}' 매칭 없음. 사용 가능: ${ALL_JOBS.map((j) => j.key).join(", ")}`);
    process.exit(1);
  }

  console.log(`${ts()} ▶ 시세 수집 오케스트레이터 시작 — 출처 ${jobs.length}개, 재시도 ${retries}회`);
  const results: SyncResult[] = [];
  for (const job of jobs) {
    results.push(await runWithRetry(job));
  }

  // ── 요약표 ──
  console.log(`\n${ts()} ═══ 요약 ═══`);
  const pad = (s: string | number, n: number) => String(s).padStart(n);
  console.log(
    `  ${"출처".padEnd(20)} ${"결과"} ${"written".padStart(8)} ${"dup".padStart(6)} ${"unmatch".padStart(8)} ${"warn".padStart(5)} ${"err".padStart(4)}`
  );
  let anyFail = false;
  for (const r of results) {
    if (!r.ok) anyFail = true;
    console.log(
      `  ${r.label.padEnd(20)} ${r.ok ? " OK " : "FAIL"} ${pad(r.written, 8)} ${pad(r.dupSkipped, 6)} ${pad(r.unmatched, 8)} ${pad(r.warnings.length, 5)} ${pad(r.errors.length, 4)}`
    );
  }
  const totalWritten = results.reduce((s, r) => s + r.written, 0);
  console.log(
    `${ts()} ◀ 완료: 총 written=${totalWritten}, ${anyFail ? "일부 실패 있음 ✗" : "전부 성공 ✓"}, ${((Date.now() - t0) / 1000).toFixed(1)}s`
  );

  await prisma.$disconnect();
  process.exit(anyFail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
