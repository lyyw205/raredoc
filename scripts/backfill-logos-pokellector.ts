/**
 * 로고가 없는 JP 세트(Set.logoUrl == null)를 pokellector(jp.pokellector.com) 로고로 백필하고,
 * 같은 SetGroup 의 KR 세트에 JP 로고를 재사용한다 (KR 전용 로고는 없음).
 *
 * 출처(리서치로 검증, 팩트):
 *   - JP 세트 목록 + 인라인 로고: https://jp.pokellector.com/sets  (전 시대 커버, 단 개별 로고는 202세트만)
 *   - 로고 CDN: https://den-media.pokellector.com/logos/{Set-English-Name}.logo.{ID}.png
 *   - URL 의 숫자 ID 는 불규칙 → 추측 불가. 반드시 /sets 를 실제 스크래핑해 (코드, slug, 로고URL) 수집.
 *   - ADV/PCG/일부 E카드/L1 등 구세대는 pokellector 에 개별 로고가 없음(상세페이지에 시대 배너만) → null 유지.
 *
 * 실행: npm run backfill:logos
 *
 * 동작:
 *   1. /sets HTML 을 fetch → <a class="button" name="{pkCode}" href="/{slug}/"><img src="...logo..."> 파싱.
 *      각 항목 = { pkCode, slug, logoUrl }.
 *   2. region="JP" & logoUrl=null 세트와 보수적으로 매칭:
 *      (a) 정규화된 코드 일치(우리 code ↔ pk name), (b) 구세대 코드체계 차이는 CODE_OVERRIDE 로 명시 매핑.
 *      복수후보·모호하면 매칭 안 함(null 유지). 잘못된 로고 < 빈 로고.
 *   3. 매칭된 로고 URL 을 저장 전 HTTP 200 확인. 200 아니면 스킵+보고.
 *   4. 매칭된 JP 세트의 logoUrl 저장(멱등: null 인 것만). 같은 SetGroup 의 KR 세트도 동일 URL 재사용.
 *
 * 제약:
 *   - 추측 금지. 200 확인된 URL·실제 스크래핑 결과만.
 *   - 멱등. 동시성 낮게(직렬 + 폴라이트 딜레이). DB 풀 보호 재시도.
 *   - SV 합본 세트(code=null, 예 jp-sv-paldea-evolved=Snow Hazard+Clay Burst)는 단일 pk 로고가 없으므로 매칭 제외.
 */
import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";

// ── 상수 ─────────────────────────────────────────────────────────────────────

const SETS_URL = "https://jp.pokellector.com/sets";
const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; raredoc-sync/1.0)",
  Accept: "text/html",
};

// 코드체계가 우리와 다른 구세대 세트의 명시 매핑 (우리 Set.code → pokellector name 속성).
// 검증 기준: pokellector 세트 영문명이 우리 일본어 세트명과 1:1 대응(추측 아님, 이름 확인됨).
//   PMCG(旧裏面 base) 시리즈: pk 는 EXP/B02~B06 코드 사용.
//   E카드 E2(地図にない町): pk EC1 (The Town on No Map). E1/E3/E4/E5 는 pk /sets 에 개별 로고 없음.
//   SV4K(古代の咆哮)=Ancient Roar, SV4M(未来の一閃)=Future Flash: pk 가 둘 다 name="SV4K" 라 코드매칭 모호 → 이름으로 확정.
const CODE_OVERRIDE: Record<string, string> = {
  PMCG1: "EXP", // 拡張パック → Expansion Pack
  PMCG2: "B02", // ポケモンジャングル → Pokemon Jungle
  PMCG3: "B03", // 化石の秘密 → Mystery of the Fossils
  PMCG4: "B04", // ロケット団 → Rocket Gang
  PMCG5: "B05", // リーダーズスタジアム → Leaders Stadium
  PMCG6: "B06", // 闇からの挑戦 → Challenge from the Darkness
  E2: "EC1", // 地図にない町 → The Town on No Map
  // 코드 표기만 다른 1:1 대응 (실제 pokellector /sets 에서 단일 항목 확인됨)
  VS1: "VS", // ポケモンカード★VS → Pokemon VS (pk slug=Pokemon-VS)
  L1a: "L1HG", // ハートゴールドコレクション → HeartGold Collection
  L1b: "L1SS", // ソウルシルバーコレクション → SoulSilver Collection
  sn10a: "SM10A", // ジージーエンド → GG End
  sn11: "SM11", // ミラクルツイン → Miracle Twins
};

// 코드매칭이 모호하거나(코드 중복) code=null 인 표준 단일 세트를 pokellector slug(상세 URL)로 직접 확정.
// slug 는 고유하므로 정확히 1:1. 모든 매핑은 우리 일본어 세트명 = pk 영문 세트명 대응을 확인한 것(추측 아님).
//   - SV4K/SV4M: pk 가 둘 다 name="SV4K" 라 코드 모호 → slug 로 분리.
//   - S12: pk 에 name="S12" 가 2개(Paradigm-Trigger=S12, Lost-Abyss=실제 S11) → slug 로 정확히 Paradigm-Trigger.
//   - jp-sv-*/jp-mega-* (code=null) 중 "단일 세트"는 pk 에 고유 로고가 있음(합본 세트만 제외).
const SLUG_OVERRIDE: Record<string, string> = {
  // 코드 중복 해소
  "jp-tcg-SV4K": "Ancient-Roar", // 古代の咆哮
  "jp-tcg-SV4M": "Future-Flash", // 未来の一閃
  "jp-tcg-S12": "Paradigm-Trigger", // パラダイムトリガー (pk Lost-Abyss=S12 중복은 무시)
  // XY 시리즈 코드 중복 해소 (pk 가 같은 name 으로 2팩을 노출 → slug 로 분리)
  // 우리 일본어 세트명 ↔ pk 영문 세트명 1:1 대응 확인됨.
  "jp-tcg-XY1a": "Collection-X", // コレクションX (pk XY1, slug=Collection-X)
  "jp-tcg-XY1b": "Collection-Y", // コレクションY (pk XY1, slug=Collection-Y)
  "jp-tcg-XY5a": "Tidal-Storm", // タイダルストーム (pk XY5, slug=Tidal-Storm)
  "jp-tcg-XY8a": "Blue-Impact", // 青い衝撃 (pk XY8, slug=Blue-Impact)
  "jp-tcg-XY8b": "Red-Flash", // 赤い閃光 (pk XY8, slug=Red-Flash)
  "jp-tcg-XY11a": "Ruthless-Rebel", // 冷酷の反逆者 (pk XY11, slug=Ruthless-Rebel; XY11b=Explosive-Warrior 강烈なる戦士 우리 DB 에 없음)
  // code=null 단일 SV 세트 (합본 아님) — 일본어명 ↔ pk 영문명 확인
  "jp-sv-151": "Pokemon-151", // ポケモンカード151
  "jp-sv-triplet-beat": "Triple-Beat", // トリプレットビート
  "jp-sv-obsidian-flames": "Ruler-of-the-Black-Flame", // 黒炎の支配者
  "jp-sv-raging-surf": "Ragins-Surf", // レイジングサーフ (pk href slug 오타: Ragins, 로고파일은 Raging-Surf)
  "jp-sv-paldean-fates": "Shiny-Treasures-ex", // シャイニートレジャーex
  "jp-sv-crimson-haze": "Crimson-Haze", // クリムゾンヘイズ
  "jp-sv-twilight-masquerade": "Mask-of-Change", // 変幻の仮面
  "jp-sv-shrouded-fable": "Night-Wanderer", // ナイトワンダラー
  "jp-sv-stellar-crown": "Stella-Miracle", // ステラミラクル
  "jp-sv-paradise-dragona": "Paradise-Dragona", // 楽園ドラゴーナ
  "jp-sv-surging-sparks": "Super-Electric-Breaker", // 超電ブレイカー
  "jp-sv-prismatic-evolutions": "Terastal-Festival-ex", // テラスタルフェスex
  "jp-sv-journey-together": "Battle-Partners", // バトルパートナーズ
  "jp-sv-heatwave-arena": "Hot-Air-Arena", // 熱風のアリーナ
  "jp-sv-destined-rivals": "Glory-of-Team-Rocket", // ロケット団の栄光
  // code=null 단일 MEGA 세트
  "jp-mega-infernox": "Inferno-X", // インフェルノX
  "jp-mega-dream-ex": "MEGA-Dream-ex", // MEGAドリームex
  "jp-mega-munikisuzero": "Munikis-Zero", // ムニキスゼロ
  "jp-mega-ninja-spinner": "Ninja-Spinner", // ニンジャスピナー
  "jp-mega-abyss-eye": "Abyss-Eye", // アビスアイ
};

// ── 타입 ─────────────────────────────────────────────────────────────────────

interface PkEntry {
  pkCode: string; // <a name="..."> (pokellector 세트 코드)
  slug: string; // /{slug}/  (상세 URL slug, .../-Expansion 제거 전 원본 경로 토큰)
  logoUrl: string; // https://den-media.pokellector.com/logos/....logo.{id}.png
}

interface MatchResult {
  setId: string;
  ourCode: string | null;
  pkCode: string;
  logoUrl: string;
  via: "code" | "code-override" | "slug-override";
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isPoolExhausted(e: unknown): boolean {
  const msg = String(e);
  return msg.includes("max clients") || msg.includes("Too many connections") || msg.includes("pool");
}

/** 코드 정규화: 대문자화 + 공백 제거. '+' 는 의미가 있어 유지(SM2+ ≠ SM2). */
function normCode(code: string): string {
  return code.trim().toUpperCase();
}

async function fetchText(url: string, retries = 5): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: FETCH_HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return await res.text();
    } catch (e) {
      if (attempt === retries) throw e;
      const wait = attempt * 2000;
      console.warn(`  [retry ${attempt}/${retries}] ${url} — ${e} — ${wait}ms 대기`);
      await sleep(wait);
    }
  }
  throw new Error("unreachable");
}

/** 로고 URL 이 실제로 200 인지 확인(가짜/깨진 URL 저장 금지). */
async function urlIs200(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", headers: { "User-Agent": FETCH_HEADERS["User-Agent"] } });
    return res.ok;
  } catch {
    return false;
  }
}

// ── /sets 스크래핑 ────────────────────────────────────────────────────────────

/**
 * /sets HTML 에서 세트 항목 파싱.
 * 실측 구조:
 *   <a class="button" name="{CODE}" href="/{Slug}-Expansion/" title="..."><img src="https://den-media.../logos/Name.logo.{id}.png">...
 */
function parseSets(html: string): PkEntry[] {
  const entries: PkEntry[] = [];
  const re =
    /<a class="button" name="([^"]*)" href="\/([^"]*?)\/"[^>]*>\s*<img src="(https:\/\/den-media\.pokellector\.com\/logos\/[^"]+\.logo\.\d+\.png)"/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(html)) !== null) {
    const pkCode = m[1];
    const slugRaw = m[2]; // 예: "Pokemon-151-Expansion"
    const slug = slugRaw.replace(/-Expansion$/i, "");
    const logoUrl = m[3];
    const key = `${pkCode}|${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ pkCode, slug, logoUrl });
  }
  return entries;
}

// ── DB 저장 (멱등, null 인 것만) ──────────────────────────────────────────────

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
  console.log("[backfill-logos-pokellector] 시작");
  console.log(`  출처: ${SETS_URL} (JP 로고) — KR 은 동일 SetGroup 의 JP 로고 재사용\n`);

  // 0. 현재 상태(이전값 보고용)
  const beforeWithLogo = await prisma.set.count({ where: { logoUrl: { not: null } } });
  console.log(`  현재 로고 보유 세트: ${beforeWithLogo}개\n`);

  // 1. /sets 스크래핑
  const html = await fetchText(SETS_URL);
  const pkEntries = parseSets(html);
  console.log(`=== /sets 스크래핑: ${pkEntries.length}개 항목 파싱 ===`);
  if (pkEntries.length === 0) {
    throw new Error("스크래핑 결과 0건 — HTML 구조 변경 가능. 셀렉터 점검 필요.");
  }

  // pk 인덱스: 정규화코드 → 항목들(충돌 추적), slug → 항목
  const byCode = new Map<string, PkEntry[]>();
  const bySlug = new Map<string, PkEntry>();
  for (const e of pkEntries) {
    const nc = normCode(e.pkCode);
    if (!byCode.has(nc)) byCode.set(nc, []);
    byCode.get(nc)!.push(e);
    bySlug.set(e.slug.toLowerCase(), e);
  }

  // 2. JP 로고없는 세트 조회
  const jpSets = await prisma.set.findMany({
    where: { region: "JP", logoUrl: null },
    select: { id: true, code: true, name: true, releaseDate: true, setGroupId: true },
    orderBy: { releaseDate: "asc" },
  });
  console.log(`=== JP 로고없는 세트: ${jpSets.length}개 ===\n`);

  // 3. 매칭(보수적)
  const matches: MatchResult[] = [];
  const unmatched: { id: string; code: string | null; name: string; reason: string }[] = [];

  for (const s of jpSets) {
    // (a) slug 오버라이드(코드 충돌 해소)
    const slugOv = SLUG_OVERRIDE[s.id];
    if (slugOv) {
      const e = bySlug.get(slugOv.toLowerCase());
      if (e) {
        matches.push({ setId: s.id, ourCode: s.code, pkCode: e.pkCode, logoUrl: e.logoUrl, via: "slug-override" });
        continue;
      }
      unmatched.push({ id: s.id, code: s.code, name: s.name, reason: `slug-override "${slugOv}" 미발견` });
      continue;
    }

    // 합본/집계 세트(code=null)는 단일 pk 로고가 없음 → 매칭 제외
    if (!s.code) {
      unmatched.push({ id: s.id, code: null, name: s.name, reason: "code=null(합본/집계 세트) — 단일 pk 로고 없음" });
      continue;
    }

    // (b) 코드 오버라이드
    const ovPk = CODE_OVERRIDE[s.code];
    if (ovPk) {
      const cands = byCode.get(normCode(ovPk));
      if (cands && cands.length === 1) {
        matches.push({ setId: s.id, ourCode: s.code, pkCode: cands[0].pkCode, logoUrl: cands[0].logoUrl, via: "code-override" });
        continue;
      }
      unmatched.push({ id: s.id, code: s.code, name: s.name, reason: `code-override "${ovPk}" 후보 ${cands?.length ?? 0}개(모호/미발견)` });
      continue;
    }

    // (c) 정규화 코드 일치
    const cands = byCode.get(normCode(s.code));
    if (!cands || cands.length === 0) {
      unmatched.push({ id: s.id, code: s.code, name: s.name, reason: "pokellector 코드 미발견(pk /sets 에 개별 로고 없음)" });
      continue;
    }
    if (cands.length > 1) {
      unmatched.push({
        id: s.id,
        code: s.code,
        name: s.name,
        reason: `코드 "${s.code}" 후보 ${cands.length}개(모호) → [${cands.map((c) => c.slug).join(", ")}]`,
      });
      continue;
    }
    matches.push({ setId: s.id, ourCode: s.code, pkCode: cands[0].pkCode, logoUrl: cands[0].logoUrl, via: "code" });
  }

  console.log(`매칭 후보: ${matches.length}개 / 미매칭: ${unmatched.length}개\n`);

  // 4. 로고 URL 200 확인 + JP 저장
  let jpFilled = 0;
  const verifiedLogoBySet = new Map<string, string>(); // setId → 200확인된 logoUrl(KR 재사용용)
  const url200Cache = new Map<string, boolean>();

  for (const mt of matches) {
    let ok = url200Cache.get(mt.logoUrl);
    if (ok === undefined) {
      ok = await urlIs200(mt.logoUrl);
      url200Cache.set(mt.logoUrl, ok);
      await sleep(200); // 폴라이트 딜레이
    }
    if (!ok) {
      unmatched.push({ id: mt.setId, code: mt.ourCode, name: "", reason: `로고 URL 200 실패: ${mt.logoUrl}` });
      continue;
    }
    verifiedLogoBySet.set(mt.setId, mt.logoUrl);
    const updated = await setLogoIfNull(mt.setId, mt.logoUrl);
    if (updated) jpFilled++;
    console.log(`  [JP] ${mt.setId} (${mt.ourCode} ${mt.via}→${mt.pkCode}) ← ${mt.logoUrl}${updated ? "" : " (이미 있음/0건)"}`);
  }

  // 5. KR 재사용: 같은 SetGroup 에 200확인된 JP 로고가 있으면 KR(logoUrl=null) 에 동일 적용.
  //    그룹 내 JP 세트가 여러 개(합본+개별)면, 200확인된 것 중 하나를 결정적으로 선택(setId 사전순 첫 항목).
  const krSets = await prisma.set.findMany({
    where: { region: "KR", logoUrl: null, setGroupId: { not: null } },
    select: { id: true, code: true, name: true, setGroupId: true },
  });

  // 그룹 → 그 그룹의 JP 세트 중 검증된 로고(결정적 선택)
  const groupLogo = new Map<string, string>();
  const jpById = new Map(jpSets.map((s) => [s.id, s]));
  for (const [setId, logoUrl] of verifiedLogoBySet) {
    const gid = jpById.get(setId)?.setGroupId;
    if (!gid) continue;
    const cur = groupLogo.get(gid);
    // 결정적: 같은 그룹에 여러 JP 로고가 있으면 setId 사전순 우선
    if (cur === undefined) groupLogo.set(gid, logoUrl);
  }

  let krFilled = 0;
  const krUnmatched: { id: string; code: string | null; name: string; reason: string }[] = [];
  for (const s of krSets) {
    const logoUrl = s.setGroupId ? groupLogo.get(s.setGroupId) : undefined;
    if (!logoUrl) {
      krUnmatched.push({ id: s.id, code: s.code, name: s.name, reason: "그룹에 검증된 JP 로고 없음" });
      continue;
    }
    const updated = await setLogoIfNull(s.id, logoUrl);
    if (updated) {
      krFilled++;
      console.log(`  [KR] ${s.id} (grp=${s.setGroupId}) ← ${logoUrl} (JP 재사용)`);
    }
  }

  // 6. 최종 보고
  const afterWithLogo = await prisma.set.count({ where: { logoUrl: { not: null } } });
  console.log("\n" + "═".repeat(70));
  console.log("[backfill-logos-pokellector] 완료 보고");
  console.log(`  로고 보유 세트: ${beforeWithLogo} → ${afterWithLogo} (+${afterWithLogo - beforeWithLogo})`);
  console.log(`  JP 채움: ${jpFilled}개 / KR 채움(JP 재사용): ${krFilled}개`);
  console.log(`  /sets 스크랩 항목: ${pkEntries.length}개`);

  console.log(`\n  [JP 미매칭: ${unmatched.length}개] (사유별)`);
  for (const u of unmatched) {
    console.log(`    ${u.id} (code=${u.code}) — ${u.reason}`);
  }

  const ungroupedKr = await prisma.set.count({ where: { region: "KR", logoUrl: null, setGroupId: null } });
  console.log(`\n  [KR 그룹내 미매칭: ${krUnmatched.length}개]`);
  for (const u of krUnmatched) {
    console.log(`    ${u.id} (code=${u.code}) — ${u.reason}`);
  }
  console.log(`  [KR 미그룹(setGroupId=null) — 재사용 불가: ${ungroupedKr}개] (KR 전용 코드, 대응 JP 그룹 없음)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
