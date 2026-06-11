/**
 * Bulbapedia/Bulbagarden Archives 에서 JP 로고를 추가 백필한다.
 * 이전 backfill-logos-pokellector.ts 가 처리하지 못한 (logoUrl=null) JP 세트 보강용.
 *
 * 출처(리서치로 검증, 팩트):
 *   - JP-only 세트(영문판 미발매)는 Bulbapedia 의 JP 페이지가 `setlogo=` 에 JP 로고 파일을 직접 보유.
 *     예: Pokémon Web (TCG) → setlogo=Pokémon Card web Logo.png (실파일 200 확인)
 *   - 영문 EX 시리즈로 합쳐진 JP 세트(ADV/PCG/E 등)는 Bulbapedia 가 영문 로고만 보유 → JP 로고 없음.
 *   - SV 스타터/덱빌드BOX(SVK/SVLN/SVLS) 은 Bulbapedia 가 "박스아트(packaging)" 만 보유 → 로고 아님 → 미적용.
 *   - 따라서 본 스크립트의 매핑은 명시적 화이트리스트(검증된 setId → MediaWiki File 제목) 만.
 *
 * 동작:
 *   1. 화이트리스트의 각 (setId, fileTitle) 을 MediaWiki API(action=query&prop=imageinfo)로 실URL 조회.
 *   2. HTTP 200 확인 후, Set.logoUrl=null 인 경우에만 저장(멱등).
 *   3. 같은 CardPack 의 KR 세트(logoUrl=null) 에도 동일 URL 재사용(기존 패턴 일치).
 *
 * 제약:
 *   - 추측 금지. 실제 페이지 wikitext 확인된 파일명만 사용.
 *   - 멱등. 동시성 ≤2, robots crawl-delay 5초 준수.
 *   - 검색·발견 결과 본 후보군 외에는 JP 로고 미발견(보고에 명시).
 *
 * 실행: npm run backfill:logos:bulbapedia
 */
import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";

// ── 화이트리스트 ──────────────────────────────────────────────────────────────
// setId → Bulbagarden Archives File 제목 (확장자 포함, 공백 그대로).
// 모든 항목은 해당 세트의 Bulbapedia 페이지 wikitext 의 setlogo= 값에서 추출 검증됨.
const FILE_BY_SET: Record<string, string> = {
  // JP-only 세트: web 시대 (2001)
  "jp-tcg-web1": "Pokémon Card web Logo.png",
};

// ── 상수 ─────────────────────────────────────────────────────────────────────

const UA = "raredoc-research/1.0 (lyyw205@gmail.com)";
const HEADERS = { "User-Agent": UA, Accept: "application/json" };
// MediaWiki API: Archives 호스트(Bulbagarden 미디어 저장소) 직접 사용
const ARCHIVES_API = "https://archives.bulbagarden.net/w/api.php";

// ── 타입 ─────────────────────────────────────────────────────────────────────

interface ResolvedLogo {
  setId: string;
  fileTitle: string;
  url: string;
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isPoolExhausted(e: unknown): boolean {
  const msg = String(e);
  return msg.includes("max clients") || msg.includes("Too many connections") || msg.includes("pool");
}

/** Bulbagarden Archives MediaWiki API 로 File 의 실제 CDN URL 조회. 못 찾으면 null. */
async function resolveFileUrl(fileTitle: string): Promise<string | null> {
  const title = `File:${fileTitle}`;
  const url = `${ARCHIVES_API}?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      query?: { pages?: Record<string, { missing?: string; imageinfo?: Array<{ url?: string }> }> };
    };
    const pages = j.query?.pages ?? {};
    for (const k of Object.keys(pages)) {
      const p = pages[k];
      if (p.missing !== undefined) return null;
      const u = p.imageinfo?.[0]?.url;
      if (u) return u;
    }
    return null;
  } catch {
    return null;
  }
}

/** 로고 URL 이 실제로 200 인지 확인. */
async function urlIs200(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", headers: { "User-Agent": UA } });
    return res.ok;
  } catch {
    return false;
  }
}

async function setLogoIfNull(setId: string, logoUrl: string, retries = 5): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await prisma.set.updateMany({
        where: { id: setId, logoUrl: null },
        data: { logoUrl },
      });
      return res.count > 0;
    } catch (e) {
      if (isPoolExhausted(e) && attempt < retries) {
        const wait = attempt * 3000;
        console.warn(`  [pool] max clients — ${wait}ms 후 재시도 (${attempt}/${retries})`);
        await sleep(wait);
      } else {
        throw e;
      }
    }
  }
  return false;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("[backfill-logos-bulbapedia] 시작");
  console.log(`  출처: ${ARCHIVES_API} (JP 로고) — KR 은 동일 CardPack 의 JP 로고 재사용`);
  console.log(`  화이트리스트 크기: ${Object.keys(FILE_BY_SET).length}\n`);

  const beforeWithLogo = await prisma.set.count({ where: { logoUrl: { not: null } } });
  console.log(`  현재 로고 보유 세트: ${beforeWithLogo}개\n`);

  // 1. 화이트리스트 → 실 URL 해석 (Crawl-delay 준수: 직렬 + 5s)
  const resolved: ResolvedLogo[] = [];
  const failures: { setId: string; fileTitle: string; reason: string }[] = [];

  const ids = Object.keys(FILE_BY_SET);
  for (let i = 0; i < ids.length; i++) {
    const setId = ids[i];
    const fileTitle = FILE_BY_SET[setId];
    const url = await resolveFileUrl(fileTitle);
    if (!url) {
      failures.push({ setId, fileTitle, reason: "MediaWiki API: 파일 미발견(missing)" });
      console.log(`  [miss] ${setId} ← File:${fileTitle}`);
    } else {
      const ok = await urlIs200(url);
      if (!ok) {
        failures.push({ setId, fileTitle, reason: `URL 200 실패: ${url}` });
        console.log(`  [bad200] ${setId} ← ${url}`);
      } else {
        resolved.push({ setId, fileTitle, url });
        console.log(`  [ok]   ${setId} ← ${url}`);
      }
    }
    if (i < ids.length - 1) await sleep(5500); // robots crawl-delay
  }

  // 2. JP 저장(멱등, null 만)
  let jpFilled = 0;
  for (const r of resolved) {
    const updated = await setLogoIfNull(r.setId, r.url);
    if (updated) jpFilled++;
    console.log(`  [JP] ${r.setId} ← ${r.url}${updated ? "" : " (이미 있음/0건)"}`);
  }

  // 3. KR 재사용: 같은 CardPack
  const groupBy = new Map<string, string>(); // cardPackId → JP logo url
  if (resolved.length > 0) {
    const jpSets = await prisma.set.findMany({
      where: { id: { in: resolved.map((r) => r.setId) } },
      select: { id: true, cardPackId: true },
    });
    const sgById = new Map(jpSets.map((s) => [s.id, s.cardPackId]));
    for (const r of resolved) {
      const sg = sgById.get(r.setId);
      if (sg && !groupBy.has(sg)) groupBy.set(sg, r.url);
    }
  }

  let krFilled = 0;
  if (groupBy.size > 0) {
    const krSets = await prisma.set.findMany({
      where: {
        region: "KR",
        logoUrl: null,
        cardPackId: { in: Array.from(groupBy.keys()) },
      },
      select: { id: true, cardPackId: true },
    });
    for (const s of krSets) {
      const url = s.cardPackId ? groupBy.get(s.cardPackId) : undefined;
      if (!url) continue;
      const updated = await setLogoIfNull(s.id, url);
      if (updated) {
        krFilled++;
        console.log(`  [KR] ${s.id} (grp=${s.cardPackId}) ← ${url} (JP 재사용)`);
      }
    }
  }

  const afterWithLogo = await prisma.set.count({ where: { logoUrl: { not: null } } });
  console.log("\n" + "═".repeat(70));
  console.log("[backfill-logos-bulbapedia] 완료 보고");
  console.log(`  로고 보유 세트: ${beforeWithLogo} → ${afterWithLogo} (+${afterWithLogo - beforeWithLogo})`);
  console.log(`  JP 채움: ${jpFilled}개 / KR 채움(JP 재사용): ${krFilled}개`);
  console.log(`  해석 성공: ${resolved.length}개 / 해석 실패: ${failures.length}개`);
  if (failures.length > 0) {
    console.log(`\n  [실패 목록]`);
    for (const f of failures) console.log(`    ${f.setId} (File:${f.fileTitle}) — ${f.reason}`);
  }

  // 최종 남은 JP 미보유
  const remainingJp = await prisma.set.findMany({
    where: { region: "JP", logoUrl: null },
    select: { id: true, code: true, name: true },
    orderBy: { releaseDate: "asc" },
  });
  console.log(`\n  [JP 로고 여전히 없음: ${remainingJp.length}개]`);
  for (const s of remainingJp) {
    console.log(`    ${s.id} (code=${s.code}) "${s.name}"`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
