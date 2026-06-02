/**
 * 오픈소스 자료 5종 미리보기용 샘플 데이터 생성기.
 *
 * data/pokeapi 표준 이름표 + 각 레포의 실제 raw URL 을 모아 JSON 으로 떨군다.
 * 미리보기 페이지(src/app/[locale]/dev/opensource-preview)가 이 JSON 을 읽어 렌더.
 * 이미지 자료 = 20개, 표 데이터 = 100행.
 *
 * 실행: npx tsx scripts/build-opensource-preview.ts
 * WSL2 fetch 불안정 → curl 강제(레포 공통 정책).
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadPokeapiNames } from "./lib/pokeapi-names";

const execFileP = promisify(execFile);
const OUT = join(process.cwd(), "src", "data", "opensource-preview.json");

async function curl(args: string[]): Promise<string> {
  const { stdout } = await execFileP("curl", args, { maxBuffer: 32 * 1024 * 1024 });
  return stdout;
}
/** GitHub contents API 의 파일/폴더 이름 목록. */
async function ghList(repo: string, path: string): Promise<{ name: string; type: string }[]> {
  const json = await curl(["-sf", `https://api.github.com/repos/${repo}/contents/${path}`]);
  return (JSON.parse(json) as { name: string; type: string }[]).map((e) => ({ name: e.name, type: e.type }));
}
/** raw URL 이 실제 존재(200)하는지. */
async function exists(url: string): Promise<boolean> {
  try {
    const code = await curl(["-s", "-o", "/dev/null", "-w", "%{http_code}", "-I", url]);
    return code.trim() === "200";
  } catch { return false; }
}
/** 배열에서 n개를 균등 샘플. */
function evenSample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]);
}

type ImageItem = { label: string; url: string };
type Resource =
  | { id: string; title: string; repo: string; repoUrl: string; kind: "image"; note: string; items: ImageItem[] }
  | { id: string; title: string; repo: string; repoUrl: string; kind: "table"; note: string; columns: string[]; rows: (string | number)[][] };

async function main() {
  const names = loadPokeapiNames();
  const resources: Resource[] = [];

  // 1) SilphGhost/pokemon-tcg-symbols — 세트 확장 심볼 (SVG/modern 에서 20개 균등)
  {
    const repo = "SilphGhost/pokemon-tcg-symbols";
    const modern = (await ghList(repo, "SVG/modern")).filter((e) => e.name.endsWith(".svg"));
    const picked = evenSample(modern, 20);
    resources.push({
      id: "tcg-symbols", title: "세트 확장 심볼", repo, repoUrl: `https://github.com/${repo}`,
      kind: "image", note: "파일명 = 세트코드. SVG라 무손실 확대. 로고 스크래핑 대체 후보.",
      items: picked.map((e) => ({
        label: e.name.replace(/\.svg$/, ""),
        url: `https://raw.githubusercontent.com/${repo}/main/SVG/modern/${e.name}`,
      })),
    });
    console.log(`[1] tcg-symbols: ${picked.length}개`);
  }

  // 2) 1niceroli/ptcg-assets — 상품 이미지 "종류별" (로고/심볼/팩샷/박스/ETB/블리스터/배틀덱/미니틴)
  {
    const repo = "1niceroli/ptcg-assets";
    const raw = (p: string) => `https://raw.githubusercontent.com/${repo}/main/${p}`;
    // 시대 대표 세트들에서 종류를 골고루 샘플
    const sampleSets = ["sv1", "swsh1", "sm1", "xy1", "base1", "cel25"];
    // 폴더 내 파일명 → 종류 라벨
    const typeOfFile = (name: string): string | null => {
      if (name === "logo.png") return "로고";
      if (name === "symbol.png") return "심볼";
      if (name === "display.png") return "박스(디스플레이)";
      if (name === "booster-bundle.png") return "부스터번들";
      if (/elite-trainer-box/.test(name)) return "ETB";
      if (/blister/.test(name)) return "블리스터";
      return null;
    };
    const subFolders: [string, string][] = [["packshots", "팩샷"], ["decks", "배틀덱"], ["mini-tins", "미니틴"]];
    const items: ImageItem[] = [];
    for (const s of sampleSets) {
      const files = await ghList(repo, s).catch(() => []);
      // 최상위 타입 파일
      for (const f of files) {
        if (f.type !== "file") continue;
        const t = typeOfFile(f.name);
        if (!t) continue;
        const url = raw(`${s}/${f.name}`);
        if (await exists(url)) items.push({ label: `${s} · ${t}`, url });
      }
      // 하위 폴더는 첫 항목 1개씩(팩샷/배틀덱/미니틴)
      for (const [sub, t] of subFolders) {
        if (!files.some((f) => f.name === sub && f.type === "dir")) continue;
        const inner = await ghList(repo, `${s}/${sub}`).catch(() => []);
        const first = inner.find((f) => f.type === "file");
        if (first) {
          const url = raw(`${s}/${sub}/${first.name}`);
          if (await exists(url)) items.push({ label: `${s} · ${t}`, url });
        }
      }
    }
    resources.push({
      id: "ptcg-assets", title: "상품 이미지 (종류별)", repo, repoUrl: `https://github.com/${repo}`,
      kind: "image", note: "logo만이 아니라 실물 팩(packshots)·박스·ETB·블리스터·배틀덱·미니틴까지. 팩샷/미니틴은 .webp. 일본판(ja_)·중국어(c) 폴더도 존재. ⚠️라이선스 명시 없음.",
      items,
    });
    console.log(`[2] ptcg-assets: ${items.length}개 (종류별)`);
  }

  // 3) PokeAPI/sprites — 공식 아트워크 (도감 1~20, 이름표로 라벨)
  {
    const repo = "PokeAPI/sprites";
    const items: ImageItem[] = [];
    for (let dex = 1; dex <= 20; dex++) {
      const e = names.get(dex);
      items.push({
        label: `#${dex} ${e?.ko ?? ""}`,
        url: `https://raw.githubusercontent.com/${repo}/master/sprites/pokemon/other/official-artwork/${dex}.png`,
      });
    }
    resources.push({
      id: "pokeapi-sprites", title: "종 공식 아트워크", repo, repoUrl: `https://github.com/${repo}`,
      kind: "image", note: "파일명 = 도감번호 → 표준 이름표와 무료 조인. KR 카드 이미지 없을 때 종 일러스트 폴백.",
      items,
    });
    console.log(`[3] pokeapi-sprites: ${items.length}개`);
  }

  // 4) duiker101/pokemon-type-svg-icons — 타입 아이콘 18종
  {
    const repo = "duiker101/pokemon-type-svg-icons";
    const types = ["bug","dark","dragon","electric","fairy","fighting","fire","flying","ghost","grass","ground","ice","normal","poison","psychic","rock","steel","water"];
    resources.push({
      id: "type-icons", title: "타입 아이콘", repo, repoUrl: `https://github.com/${repo}`,
      kind: "image", note: "게임 18타입. TCG 11타입과 매핑 필요: Lightning→electric, Darkness→dark, Metal→steel, Colorless→normal.",
      items: types.map((t) => ({ label: t, url: `https://raw.githubusercontent.com/${repo}/master/icons/${t}.svg` })),
    });
    console.log(`[4] type-icons: 18개`);
  }

  // 5) veekun/pokedex (= PokeAPI data/v2/csv) — 종 데이터 표 100행 (현재 이름표)
  {
    const rows: (string | number)[][] = [];
    for (let dex = 1; dex <= 100; dex++) {
      const e = names.get(dex);
      if (!e) continue;
      rows.push([e.dex, e.slug, e.ko ?? "", e.ja ?? "", e.en ?? "", e.genus.ko ?? ""]);
    }
    resources.push({
      id: "veekun-data", title: "종 데이터 (이름·분류)", repo: "veekun/pokedex", repoUrl: "https://github.com/veekun/pokedex",
      kind: "table", note: "이름표의 본가. 같은 data/v2/csv 폴더에 타입·종족값·진화·특성·기술도 있음(동일 dex# 키로 확장 가능).",
      columns: ["dex", "slug", "ko", "ja", "en", "분류(ko)"], rows,
    });
    console.log(`[5] veekun-data: ${rows.length}행`);
  }

  mkdirSync(join(process.cwd(), "src", "data"), { recursive: true });
  const payload = { generatedAt: new Date().toISOString(), resources };
  writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`\n✅ ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
