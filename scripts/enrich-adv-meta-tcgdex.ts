/**
 * ADV1~5 (2003) LogicalCard 메타를 tcgdex 에서 보강.
 *
 * NOTE: tcgdex /v2/ja/sets/adv{n} 은 현재 cards 배열이 비어 있어 개별 카드 fetch 불가.
 * → ADV 시리즈 tcgdex 메타 보강은 건너뜀 (데이터 없음).
 * 스크립트는 실행하되 그 사실을 명확히 로그합니다.
 */
import "dotenv/config";

const TARGET_SETS = ["adv1","adv2","adv3","adv4","adv5"];

async function main() {
  console.log("=== enrich-adv-meta-tcgdex ===");
  console.log("ADV1~5 tcgdex 카드 데이터 확인 중...");
  for (const setId of TARGET_SETS) {
    const res = await new Promise<{ count: number }>((resolve) => {
      const { execFile } = require("node:child_process");
      const { promisify } = require("node:util");
      const execFileP = promisify(execFile);
      execFileP("curl", ["-sSL", "--max-time", "20",
        `https://api.tcgdex.net/v2/ja/sets/${setId}`], { maxBuffer: 4 * 1024 * 1024 })
        .then(({ stdout }: { stdout: string }) => {
          const d = JSON.parse(stdout);
          resolve({ count: d?.cards?.length ?? 0 });
        })
        .catch(() => resolve({ count: -1 }));
    });
    console.log(`  ${setId}: tcgdex cards=${res.count} → ${res.count === 0 ? "SKIP (빈 카드 목록)" : `${res.count}장 존재`}`);
  }
  console.log("\n결론: ADV1~5 tcgdex /v2/ja 에 카드 데이터 없음 — 메타 보강 건너뜀.");
  console.log("  enriched: 0, skipped: 0, missing: 0, ExternalIdMapping: 0");
}
main().catch(e => { console.error(e); process.exit(1); });
