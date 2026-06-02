/**
 * 표준 이름 매핑표(PokeAPI CSV) 갱신기.
 *
 * data/pokeapi/*.csv 를 PokeAPI/pokeapi 의 data/v2/csv 에서 다시 받아온다.
 * 재현성을 위해 커밋에 핀한다. data/pokeapi/.pinned-commit 의 SHA 를 쓰며,
 * 인자로 새 SHA(또는 "master")를 주면 그 리비전으로 갱신하고 핀도 업데이트한다.
 *
 * 실행:
 *   npx tsx scripts/refresh-pokeapi-names.ts            # 현재 핀 SHA 로 재다운로드
 *   npx tsx scripts/refresh-pokeapi-names.ts master     # 최신 master 로 갱신 + 핀 업데이트
 *   npx tsx scripts/refresh-pokeapi-names.ts <sha>      # 특정 커밋으로 갱신 + 핀 업데이트
 *
 * WSL2 에서 node fetch 가 불안정해 curl 을 강제(레포 다른 sync 스크립트와 동일 정책).
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const execFileP = promisify(execFile);
const DATA_DIR = join(process.cwd(), "data", "pokeapi");
const PIN_FILE = join(DATA_DIR, ".pinned-commit");
const FILES = ["languages.csv", "pokemon_species.csv", "pokemon_species_names.csv"];

async function curl(url: string): Promise<string> {
  const { stdout } = await execFileP("curl", ["-sf", url], { maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

async function resolveSha(ref: string): Promise<string> {
  if (/^[0-9a-f]{40}$/.test(ref)) return ref;
  const json = await curl(`https://api.github.com/repos/PokeAPI/pokeapi/commits/${ref}`);
  const sha = JSON.parse(json).sha as string;
  if (!sha) throw new Error(`커밋 SHA 해석 실패: ${ref}`);
  return sha;
}

async function main() {
  const arg = process.argv[2];
  const ref = arg ?? readFileSync(PIN_FILE, "utf8").trim();
  const sha = await resolveSha(ref);
  const base = `https://raw.githubusercontent.com/PokeAPI/pokeapi/${sha}/data/v2/csv`;
  console.log(`PokeAPI CSV 갱신 @ ${sha}`);

  for (const f of FILES) {
    const body = await curl(`${base}/${f}`);
    writeFileSync(join(DATA_DIR, f), body);
    console.log(`  OK  ${f} (${body.split("\n").length - 1} rows)`);
  }
  writeFileSync(PIN_FILE, sha + "\n");
  console.log(`핀 갱신: data/pokeapi/.pinned-commit = ${sha}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
