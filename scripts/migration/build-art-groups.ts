// build-art-groups — 추가형 ArtCard 그룹 산출 (P9 로드맵 S3b, docs/migration §0′).
//
// 같은 gameCardId 안에서 "같은 그림" Card 들을 한 artCardId 로 묶는다(추가형·가역).
//   합치는 3조건(전부 충족): ① 같은 gameCardId ② 이미지 pHash Hamming ≤ THRESHOLD
//     ③ art-불변 메타 무충돌(illustrator·types·subtypes·supertype·pokedexNumbers·evolvesFrom).
//   하나라도 어긋나면 안 합침(under-merge 선호) → over-merge(오거폰 4가면류) 구조적 차단.
//   이미지/gameCardId/pHash 없으면 단독 그룹(자기 id).
//
// ★실행 전: npm i image-hash  +  prisma db push && prisma generate (artFingerprint·artCardId 컬럼)
//   dry-run:  npx tsx scripts/migration/build-art-groups.ts [--threshold=10]
//   적용:     npx tsx scripts/migration/build-art-groups.ts --apply [--allow-protected]
//   이후:     gate-merge.ts (over-merge 0 확인) · gate-fk.ts --compare base (손실 0)
//   ※ THRESHOLD 는 dry-run 의 샘플(오거폰=분리 유지 / 동일아트 재판=병합)을 보고 보정.
//
// 멱등: artFingerprint 가 이미 있으면 pHash 재계산 생략(캐시). artCardId 는 매 실행 재산출(결정적: 그룹 최소 id).
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../lib/protected-groups";
import { imageHash } from "image-hash"; // npm i image-hash (순수 JS·jimp 기반·결정성)
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const APPLY = process.argv.includes("--apply");
const ALLOW = hasAllowProtectedFlag();
const THRESHOLD = Number(process.argv.find((a) => a.startsWith("--threshold="))?.split("=")[1] ?? 10);
const HASH_BITS = 16; // image-hash bits → 64 hex 길이 해시
const CONCURRENCY = 8;
const SNAP_DIR = resolve(process.cwd(), ".migration-snapshots");
const CACHE = resolve(SNAP_DIR, "art-phash-cache.json");

const norm = (s: string | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const setKey = (a: unknown) => [...new Set((Array.isArray(a) ? a : []).map(String))].sort().join(",");

type Row = {
  id: string;
  cardPackId: string | null;
  gameCardId: string | null;
  illustrator: string | null;
  types: unknown;
  subtypes: unknown;
  supertype: string | null;
  pokedexNumbers: unknown;
  evolvesFrom: string | null;
  artFingerprint: string | null;
  img: string | null;
};

const phash = (url: string): Promise<string | null> =>
  new Promise((res) => {
    try {
      imageHash(url, HASH_BITS, true, (err: unknown, data: string) => res(err ? null : data));
    } catch {
      res(null);
    }
  });

const POP = (n: number) => { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; };
function hamming(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let d = 0;
  for (let i = 0; i < a.length; i++) d += POP(parseInt(a[i], 16) ^ parseInt(b[i], 16));
  return d;
}

// art-불변 메타 충돌 여부(둘 다 값 있고 다르면 충돌). G_MERGE 와 동일 기준.
function metaConflict(a: Row, b: Row): boolean {
  const f: ((r: Row) => string)[] = [
    (r) => norm(r.illustrator),
    (r) => setKey(r.types),
    (r) => setKey(r.subtypes),
    (r) => norm(r.supertype),
    (r) => setKey(r.pokedexNumbers),
    (r) => norm(r.evolvesFrom),
  ];
  return f.some((g) => { const x = g(a), y = g(b); return x !== "" && y !== "" && x !== y; });
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const worker = async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

async function main() {
  if (!existsSync(SNAP_DIR)) mkdirSync(SNAP_DIR, { recursive: true });
  const cache: Record<string, string> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};

  // 대표 이미지 = JP>EN>KR 우선 non-null imageLarge.
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT lc.id, lc."setGroupId" AS "cardPackId", lc."gameCardId", lc.illustrator, lc.types, lc.subtypes,
            lc.supertype, lc."pokedexNumbers", lc."evolvesFrom", lc."artFingerprint",
            (SELECT rc."imageLarge" FROM "CardLocale" rc
              WHERE rc."logicalCardId"=lc.id AND rc."imageLarge" IS NOT NULL
              ORDER BY CASE rc.region WHEN 'JP' THEN 0 WHEN 'EN' THEN 1 ELSE 2 END LIMIT 1) AS img
     FROM "LogicalCard" lc`,
  )) as Row[];

  // 1) pHash 산출(캐시·artFingerprint 재사용). 키=이미지 URL.
  const toHash = rows.filter((r) => r.img && !(r.artFingerprint || cache[r.img!]));
  console.log(`pHash 산출 대상 ${toHash.length} / 전체 ${rows.length} (캐시·기존 재사용)`);
  let done = 0;
  await pool(toHash, CONCURRENCY, async (r) => {
    const h = await phash(r.img!);
    if (h) cache[r.img!] = h;
    if (++done % 500 === 0) { console.log(`  …${done}/${toHash.length}`); writeFileSync(CACHE, JSON.stringify(cache)); }
  });
  writeFileSync(CACHE, JSON.stringify(cache));
  // 각 Row 의 pHash 확정(기존 artFingerprint 우선, 없으면 캐시)
  const ph = new Map<string, string | null>();
  for (const r of rows) ph.set(r.id, r.artFingerprint ?? (r.img ? cache[r.img] ?? null : null));

  // 2) gameCardId 버킷 내 union-find 클러스터링
  const parent = new Map<string, string>();
  const find = (x: string): string => { while (parent.get(x)! !== x) { parent.set(x, parent.get(parent.get(x)!)!); x = parent.get(x)!; } return x; };
  const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb); };
  for (const r of rows) parent.set(r.id, r.id);

  const byGc = new Map<string, Row[]>();
  for (const r of rows) {
    const k = r.gameCardId ?? `__solo_${r.id}`; // gameCardId 없으면 단독
    const g = byGc.get(k); if (g) g.push(r); else byGc.set(k, [r]);
  }
  let edges = 0;
  for (const [, bucket] of byGc) {
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = bucket[i], b = bucket[j];
        const ha = ph.get(a.id), hb = ph.get(b.id);
        if (!ha || !hb) continue;                 // pHash 없음 → 병합 안 함(under-merge)
        if (metaConflict(a, b)) continue;          // 메타 충돌 → 병합 안 함
        if (hamming(ha, hb) <= THRESHOLD) { union(a.id, b.id); edges++; }
      }
    }
  }
  // 그룹 대표 = 컴포넌트 최소 id(결정적)
  const groupRep = new Map<string, string>();
  for (const r of rows) groupRep.set(r.id, find(r.id));

  // 3) 리포트
  const groups = new Map<string, string[]>();
  for (const r of rows) { const g = groupRep.get(r.id)!; (groups.get(g) ?? groups.set(g, []).get(g)!).push(r.id); }
  const multi = [...groups.values()].filter((m) => m.length > 1);
  const noHash = rows.filter((r) => !ph.get(r.id)).length;
  console.log(`\n그룹 ${groups.size} (멤버 2+ ${multi.length}) · 병합엣지 ${edges} · pHash없음 ${noHash}(단독) · THRESHOLD ${THRESHOLD}`);
  console.log(`최대 그룹 크기: ${Math.max(...[...groups.values()].map((m) => m.length))}`);

  if (!APPLY) {
    console.log(`\n[dry-run] 변경 없음. 샘플 검토(오거폰=분리 유지여야 / 동일아트 재판=병합) 후 --apply.`);
    await prisma.$disconnect();
    return;
  }

  // 4) 적용 — 동결 가드
  const affected = [...new Set(rows.map((r) => r.cardPackId))];
  assertWritable(affected, { allow: ALLOW, dryRun: false, tool: "build-art-groups" });

  let n = 0;
  for (const r of rows) {
    const fp = ph.get(r.id);
    await prisma.$executeRawUnsafe(
      `UPDATE "LogicalCard" SET "artFingerprint"=$1, "artCardId"=$2 WHERE id=$3`,
      fp ?? null, groupRep.get(r.id)!, r.id,
    );
    if (++n % 1000 === 0) console.log(`  적용 …${n}/${rows.length}`);
  }
  console.log(`\n✅ artFingerprint·artCardId ${n}건 기록. 다음: gate-merge.ts · gate-fk.ts --compare base`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
