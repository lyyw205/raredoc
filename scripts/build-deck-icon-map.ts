/**
 * UI-1a/I2: 아키타입 아이콘 맵 빌더 — docs/cardgame-ui-plan.md §2-I2
 *
 * 실행: npx tsx scripts/build-deck-icon-map.ts [--force]
 *
 * DeckArchetype.iconKeys 의 Limitless 슬러그("dragapult", "venusaur-mega", "ogerpon-wellspring")를
 * 포켓몬 공식 아트워크 이미지로 해석해 R2 에 미러하고, 슬러그→URL 맵을 src/data/deck-icon-map.json
 * 으로 출력한다 (RSC/클라이언트가 정적 import — node:fs 로더 의존 없음, 계획 §2-I2).
 *
 * 해석 순서 (슬러그당):
 *  1. PokeAPI /pokemon/{slug} — 폼 포함 정확 해석, 응답의 official-artwork URL 사용
 *  2. 404 면 마지막 토큰 제거 반복("charizard-mega-x"→"charizard-mega"→"charizard")
 *  3. 전부 실패 → unresolved (컴포넌트가 모노그램 폴백 — 예: "substitute" 는 종이 아님)
 * 멱등: 기존 맵에 있는 슬러그는 skip(--force 로 재해석). 라이브 호출은 1회성 빌더 한정
 * (런타임은 JSON 만 — 종 "이름"의 정본은 여전히 data/pokeapi CSV 라는 기존 결정과 충돌 없음).
 * R2 키: deck-icons/{slug}.png · 출처 표기: PokeAPI official artwork (오픈소스 자산 메모 §3).
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { getR2Client, r2PublicUrl } from "../src/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const force = process.argv.includes("--force");
const MAP_PATH = path.join(process.cwd(), "src", "data", "deck-icon-map.json");
const THROTTLE_MS = 700; // PokeAPI 예의상

type IconMap = { _note: string; icons: Record<string, string> };

function loadMap(): IconMap {
  if (fs.existsSync(MAP_PATH)) return JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  return {
    _note: "Limitless 아키타입 슬러그 → 아이콘 URL (PokeAPI official artwork, R2 미러). build-deck-icon-map.ts 생성 — 수동 편집 가능(미해석 슬러그 보충).",
    icons: {},
  };
}

let last = 0;
async function throttledFetch(url: string): Promise<Response> {
  const wait = last + THROTTLE_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  return fetch(url, { headers: { "User-Agent": "raredoc-deck-icons/1.0" } });
}

async function artworkOfPokemon(name: string): Promise<string | null> {
  const res = await throttledFetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { sprites?: { other?: Record<string, { front_default?: string | null }> } };
  return data.sprites?.other?.["official-artwork"]?.front_default ?? null;
}

/** 슬러그 → 공식 아트워크 URL — ①/pokemon 직해석 ②/pokemon-species 기본 variety(두두지·텍사스 류:
 *  기본 폼 식별자에 접미사 "dudunsparce-two-segment") ③토큰 제거 반복 */
async function resolveArtwork(slug: string): Promise<string | null> {
  let candidate = slug;
  while (candidate) {
    const direct = await artworkOfPokemon(candidate);
    if (direct) return direct;
    const sp = await throttledFetch(`https://pokeapi.co/api/v2/pokemon-species/${candidate}`);
    if (sp.ok) {
      const data = (await sp.json()) as { varieties?: Array<{ is_default?: boolean; pokemon?: { name?: string } }> };
      const def = data.varieties?.find((v) => v.is_default)?.pokemon?.name ?? data.varieties?.[0]?.pokemon?.name;
      if (def) {
        const art = await artworkOfPokemon(def);
        if (art) return art;
      }
    }
    const i = candidate.lastIndexOf("-");
    if (i === -1) return null;
    candidate = candidate.slice(0, i);
  }
  return null;
}

async function main() {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET 미설정");
  const r2 = getR2Client();
  const map = loadMap();

  const rows = await prisma.deckArchetype.findMany({ select: { iconKeys: true } });
  const slugs = [...new Set(rows.flatMap((r) => r.iconKeys))].sort();
  console.log(`[icons] 대상 슬러그 ${slugs.length}종 (기존 맵 ${Object.keys(map.icons).length})`);

  let added = 0;
  const unresolved: string[] = [];
  for (const slug of slugs) {
    if (map.icons[slug] && !force) continue;
    const artUrl = await resolveArtwork(slug);
    if (!artUrl) {
      unresolved.push(slug);
      console.warn(`[icons] 미해석: ${slug} (모노그램 폴백 대상)`);
      continue;
    }
    const img = await throttledFetch(artUrl);
    if (!img.ok) {
      unresolved.push(slug);
      continue;
    }
    const buf = Buffer.from(await img.arrayBuffer());
    const key = `deck-icons/${slug}.png`;
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buf,
        ContentType: "image/png",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    map.icons[slug] = r2PublicUrl(key);
    added++;
    console.log(`[icons] ${slug} → ${key} (${(buf.length / 1024).toFixed(0)}KB)`);
  }

  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n");
  console.log(`\n[icons] 완료: 신규 ${added} / 총 ${Object.keys(map.icons).length} / 미해석 ${unresolved.length}${unresolved.length ? ` (${unresolved.join(", ")})` : ""}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
