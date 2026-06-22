// build-art-groups — 추가형 ArtCard 그룹 산출 (P9 로드맵 S3b, docs/migration §0′).
//
// 같은 gameCardId 안에서 "같은 그림" Card 들을 한 artCardId 로 묶는다(추가형·가역).
//   합치는 3조건(전부 충족): ① 같은 gameCardId ② 이미지 pHash 공통지역 최소거리 ≤ THRESHOLD
//     ③ art-불변 메타 무충돌(illustrator·types·subtypes·supertype·pokedexNumbers·evolvesFrom).
//   하나라도 어긋나면 안 합침(under-merge 선호) → over-merge(오거폰 4가면=types충돌) 구조적 차단.
//
// ★pHash 보정(실측 2026-06-22): 같은그림·같은지역=0~4 / 같은그림·다른지역=24~32(프레임·홀로차) / 다른그림=70~98.
//   → 카드 비교는 "공통 지역 이미지끼리"(EN↔EN, JP↔JP, KR↔KR) 최소거리로 한다. 같은그림=0~4, 다른그림=70+ → THRESHOLD 12 로 깔끔 분리.
//   공통 지역이 없으면(한쪽 JP단독·다른쪽 EN단독 등) 병합 안 함(under-merge). 메타 가드가 일러/타입 차이를 1차 차단.
//
// ★실행 전: npm i -D image-hash  +  prisma db push (artFingerprint·artCardId 컬럼; 이미 적용됨).
//   dry-run:  npx tsx scripts/migration/build-art-groups.ts [--threshold=12] [--limit=N] [--gamecards=a,b]
//   적용:     npx tsx scripts/migration/build-art-groups.ts --apply [--allow-protected]
//   이후:     gate-merge.ts (over-merge 0) · gate-fk.ts --compare base (손실 0)
//
// 멱등: pHash 는 URL 캐시(.migration-snapshots/art-phash-cache.json)에 저장돼 재실행 시 재fetch 생략.
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../lib/protected-groups";
import { imageHash } from "image-hash"; // npm i -D image-hash (순수 JS·jimp 기반·결정성·webp OK)
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const APPLY = process.argv.includes("--apply");
const ALLOW = hasAllowProtectedFlag();
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const THRESHOLD = Number(arg("threshold") ?? 12);
const LIMIT = arg("limit") ? Number(arg("limit")) : null;
const ONLY = arg("gamecards")?.split(",").map((s) => s.trim()).filter(Boolean) ?? null;
const HASH_BITS = 16;
const CONCURRENCY = 8;
const SNAP_DIR = resolve(process.cwd(), ".migration-snapshots");
const CACHE = resolve(SNAP_DIR, "art-phash-cache.json");
const REGIONS = ["JP", "EN", "KR"] as const;

const norm = (s: string | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const setKey = (a: unknown) => [...new Set((Array.isArray(a) ? a : []).map(String))].sort().join(",");

type Row = {
  id: string; cardPackId: string | null; gameCardId: string | null;
  illustrator: string | null; types: unknown; subtypes: unknown; supertype: string | null;
  pokedexNumbers: unknown; evolvesFrom: string | null;
  jp: string | null; en: string | null; kr: string | null;
};

const phash = (url: string): Promise<string | null> =>
  new Promise((res) => { try { imageHash(url, HASH_BITS, true, (e: unknown, d: string) => res(e ? null : d)); } catch { res(null); } });

const POP = (n: number) => { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; };
function hamming(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let d = 0; for (let i = 0; i < a.length; i++) d += POP(parseInt(a[i], 16) ^ parseInt(b[i], 16)); return d;
}
function metaConflict(a: Row, b: Row): boolean {
  const f: ((r: Row) => string)[] = [
    (r) => norm(r.illustrator), (r) => setKey(r.types), (r) => setKey(r.subtypes),
    (r) => norm(r.supertype), (r) => setKey(r.pokedexNumbers), (r) => norm(r.evolvesFrom),
  ];
  return f.some((g) => { const x = g(a), y = g(b); return x !== "" && y !== "" && x !== y; });
}
async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>): Promise<void> {
  let i = 0;
  const worker = async () => { while (i < items.length) { await fn(items[i++]); } };
  await Promise.all(Array.from({ length: Math.min(n, items.length || 1) }, worker));
}

async function main() {
  if (!existsSync(SNAP_DIR)) mkdirSync(SNAP_DIR, { recursive: true });
  const cache: Record<string, string> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};

  let where = "";
  if (ONLY) where = `WHERE lc."gameCardId" IN (${ONLY.map((g) => `'${g.replace(/'/g, "")}'`).join(",")})`;
  const limit = LIMIT ? `LIMIT ${LIMIT}` : "";
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT lc.id, lc."setGroupId" AS "cardPackId", lc."gameCardId", lc.illustrator, lc.types, lc.subtypes,
            lc.supertype, lc."pokedexNumbers", lc."evolvesFrom",
            (SELECT rc."imageLarge" FROM "CardLocale" rc WHERE rc."logicalCardId"=lc.id AND rc.region='JP' AND rc."imageLarge" IS NOT NULL LIMIT 1) AS jp,
            (SELECT rc."imageLarge" FROM "CardLocale" rc WHERE rc."logicalCardId"=lc.id AND rc.region='EN' AND rc."imageLarge" IS NOT NULL LIMIT 1) AS en,
            (SELECT rc."imageLarge" FROM "CardLocale" rc WHERE rc."logicalCardId"=lc.id AND rc.region='KR' AND rc."imageLarge" IS NOT NULL LIMIT 1) AS kr
     FROM "LogicalCard" lc ${where} ORDER BY lc."gameCardId" NULLS LAST, lc.id ${limit}`,
  )) as Row[];

  // 1) pHash 산출(URL 캐시). 카드별 지역 이미지(JP/EN/KR) 전부.
  const urls = [...new Set(rows.flatMap((r) => [r.jp, r.en, r.kr]).filter((u): u is string => !!u && !cache[u]))];
  console.log(`pHash 산출 대상 URL ${urls.length} (캐시 재사용) · 카드 ${rows.length} · THRESHOLD ${THRESHOLD}`);
  let done = 0;
  await pool(urls, CONCURRENCY, async (u) => {
    const h = await phash(u); if (h) cache[u] = h;
    if (++done % 500 === 0) { console.log(`  …${done}/${urls.length}`); writeFileSync(CACHE, JSON.stringify(cache)); }
  });
  writeFileSync(CACHE, JSON.stringify(cache));

  // 카드별 지역→해시 맵 + 대표(JP>EN>KR) 해시
  const rh = new Map<string, Partial<Record<(typeof REGIONS)[number], string>>>();
  const repFp = new Map<string, string | null>();
  for (const r of rows) {
    const m: Partial<Record<(typeof REGIONS)[number], string>> = {};
    if (r.jp && cache[r.jp]) m.JP = cache[r.jp];
    if (r.en && cache[r.en]) m.EN = cache[r.en];
    if (r.kr && cache[r.kr]) m.KR = cache[r.kr];
    rh.set(r.id, m);
    repFp.set(r.id, m.JP ?? m.EN ?? m.KR ?? null);
  }
  // 공통지역 최소거리(없으면 Infinity)
  const dist = (a: string, b: string): number => {
    const ma = rh.get(a)!, mb = rh.get(b)!; let best = Infinity;
    for (const r of REGIONS) if (ma[r] && mb[r]) best = Math.min(best, hamming(ma[r]!, mb[r]!));
    return best;
  };

  // 2) gameCardId 버킷 내 union-find
  const parent = new Map<string, string>();
  const find = (x: string): string => { while (parent.get(x)! !== x) { parent.set(x, parent.get(parent.get(x)!)!); x = parent.get(x)!; } return x; };
  const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb); };
  for (const r of rows) parent.set(r.id, r.id);
  const byGc = new Map<string, Row[]>();
  for (const r of rows) { const k = r.gameCardId ?? `__solo_${r.id}`; const g = byGc.get(k); if (g) g.push(r); else byGc.set(k, [r]); }
  let edges = 0;
  for (const [, bucket] of byGc) {
    for (let i = 0; i < bucket.length; i++) for (let j = i + 1; j < bucket.length; j++) {
      const a = bucket[i], b = bucket[j];
      if (metaConflict(a, b)) continue;
      if (dist(a.id, b.id) <= THRESHOLD) { union(a.id, b.id); edges++; }
    }
  }
  const rep = new Map<string, string>();
  for (const r of rows) rep.set(r.id, find(r.id));

  // 3) 리포트
  const groups = new Map<string, Row[]>();
  for (const r of rows) { const g = rep.get(r.id)!; const a = groups.get(g); if (a) a.push(r); else groups.set(g, [r]); }
  const multi = [...groups.values()].filter((m) => m.length > 1);
  const noHash = rows.filter((r) => !repFp.get(r.id)).length;
  console.log(`\n그룹 ${groups.size} (멤버 2+ ${multi.length}) · 병합엣지 ${edges} · pHash없음 ${noHash}(단독) · 최대그룹 ${Math.max(...[...groups.values()].map((m) => m.length))}`);
  if (ONLY || (LIMIT && LIMIT <= 600)) {
    console.log(`\n[샘플 상세] gameCard별 멤버·공통지역 최소거리:`);
    for (const [gc, bucket] of byGc) {
      if (bucket.length < 2) continue;
      console.log(` · ${gc} (멤버 ${bucket.length}, 그룹 ${new Set(bucket.map((r) => rep.get(r.id))).size})`);
      for (let i = 0; i < bucket.length; i++) for (let j = i + 1; j < bucket.length; j++) {
        const a = bucket[i], b = bucket[j]; const d = dist(a.id, b.id); const mc = metaConflict(a, b);
        const merged = rep.get(a.id) === rep.get(b.id);
        console.log(`     ${a.id.slice(-22).padEnd(22)} ~ ${b.id.slice(-22).padEnd(22)} d=${d === Infinity ? "∞" : d}${mc ? " 메타충돌" : ""} → ${merged ? "병합" : "분리"}`);
      }
    }
  }

  if (!APPLY) { console.log(`\n[dry-run] 변경 없음. 샘플(오거폰=분리 / 동일아트 재판=병합) 확인 후 --apply.`); await prisma.$disconnect(); return; }

  // 4) 적용
  assertWritable([...new Set(rows.map((r) => r.cardPackId))], { allow: ALLOW, dryRun: false, tool: "build-art-groups" });
  let n = 0;
  for (const r of rows) {
    await prisma.$executeRawUnsafe(`UPDATE "LogicalCard" SET "artFingerprint"=$1, "artCardId"=$2 WHERE id=$3`, repFp.get(r.id) ?? null, rep.get(r.id)!, r.id);
    if (++n % 1000 === 0) console.log(`  적용 …${n}/${rows.length}`);
  }
  console.log(`\n✅ artFingerprint·artCardId ${n}건 기록. 다음: gate-merge.ts · gate-fk.ts --compare base`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
