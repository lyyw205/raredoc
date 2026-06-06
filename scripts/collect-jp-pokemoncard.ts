/**
 * 일본공식(pokemon-card.com) 카드 수집 — 재사용 컬렉터. JSON 출력 전용(DB·prisma 무관).
 *   목록 API(JSON): resultAPI.php?pg={pgCode}&page={N} → cardList[{cardID,name,thumb}] (39장/page)
 *   상세(정적 HTML): details.php/card/{cardID}/regu/all (폴백 /card/{cardID}/) 파싱
 *   ※ node fetch 가 이 호스트에서 차단됨 → collect-pack.ts 처럼 curl(execFile) 로 우회.
 *
 * 출력 스키마(배열, scripts/load-jp-official.ts 소비):
 *   { jaName, number, numberFull, rarity, illustrator, category, stage, suffix,
 *     trainerType, hp, types, dexId, image, detailUrl }
 *   number 오름차순 정렬.
 *
 * 실행: npx tsx scripts/collect-jp-pokemoncard.ts <jpSetId> <pgCode> <outPath>
 *   예:  npx tsx scripts/collect-jp-pokemoncard.ts jp-tcg-SM1S 568 data/jp-official/jp-sm1s.json
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const BASE = "https://www.pokemon-card.com";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// pokemon-card.com 은 node fetch 차단(curl 만 통과) — collect-pack.ts 의 curl 헬퍼 패턴 차용
const curlText = async (url: string): Promise<string> => {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "25", url], { maxBuffer: 16 * 1024 * 1024 });
    return stdout;
  } catch {
    return "";
  }
};
const curlJson = async (url: string): Promise<any> => {
  const t = await curlText(url);
  try { return JSON.parse(t); } catch { return null; }
};

// ── HTML 헬퍼 ──
const decode = (s: string) =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#039;/g, "'").replace(/&quot;/g, '"');
const stripTags = (s: string) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

// 타입 아이콘 → EN 타입명
const TYPE_ICON: Record<string, string> = {
  grass: "Grass", fire: "Fire", water: "Water", lightning: "Lightning", electric: "Lightning", psychic: "Psychic",
  fighting: "Fighting", darkness: "Darkness", dark: "Darkness", metal: "Metal", steel: "Metal", fairy: "Fairy",
  dragon: "Dragon", colorless: "Colorless", none: "Colorless",
};

type Rec = {
  jaName: string;
  number: string;
  numberFull: string | null;
  rarity: string | null;
  illustrator: string | null;
  category: string | null;
  stage: string | null;
  suffix: string | null;
  trainerType: string | null;
  hp: number | null;
  types: string[];
  dexId: number | null;
  image: string | null;
  detailUrl: string;
};

// 접미사: 이름에서 ex / V / VMAX / VSTAR / GX / TAG TEAM(GX) 추출
function parseSuffix(name: string): string | null {
  if (/TAG\s*TEAM/i.test(name)) return "TAG TEAM";
  if (/VMAX$/i.test(name)) return "VMAX";
  if (/VSTAR$/i.test(name)) return "VSTAR";
  if (/GX$/i.test(name)) return "GX";
  if (/(?<![A-Za-z])EX$/i.test(name) || /ＥＸ$/.test(name)) return "EX";
  if (/(ex)$/.test(name)) return "ex";
  if (/(?<![A-Za-z])V$/.test(name) || /Ｖ$/.test(name)) return "V";
  return null;
}

// 진화단계: <span class="type">たね|1進化|2進化</span>
function parseStage(html: string): string | null {
  const m = html.match(/<span class="type">([\s\S]*?)<\/span>/);
  if (!m) return null;
  const t = decode(m[1]).replace(/\s/g, "");
  if (/^M進化/.test(t) || /^メガ進化/.test(t)) return "MEGA"; // 메가진화(XY EX시대)
  if (/^BREAK進化/.test(t)) return "BREAK"; // BREAK진화(XY BREAK시대)
  if (/^たね/.test(t) || /^基本/.test(t)) return "Basic";
  if (/^1進化/.test(t) || /^一進化/.test(t)) return "Stage1";
  if (/^2進化/.test(t) || /^二進化/.test(t)) return "Stage2";
  return null;
}

// 카테고리 + 트레이너타입: TopInfo 뒤 <h2 class="mt20">…</h2> 블록 + 이미지파일 _P_/_T_/_E_ 보조신호
function parseCategory(html: string, imgFile: string): { category: string | null; trainerType: string | null } {
  // 본문 카드타입 헤딩 후보 수집
  const heads = [...html.matchAll(/<h2 class="mt20">([\s\S]*?)<\/h2>/g)].map((m) => stripTags(m[1]));
  const head = heads.find((h) =>
    /(グッズ|サポート|スタジアム|ポケモンのどうぐ|特殊エネルギー|基本エネルギー)/.test(h)
  ) ?? "";
  // 이미지 파일 인픽스(_P_/_T_/_E_) 카테고리 신호
  const infix = imgFile.match(/_([PTE])_/)?.[1] ?? null;

  if (/グッズ/.test(head)) return { category: "Trainer", trainerType: "Item" };
  if (/サポート/.test(head)) return { category: "Trainer", trainerType: "Supporter" };
  if (/スタジアム/.test(head)) return { category: "Trainer", trainerType: "Stadium" };
  if (/ポケモンのどうぐ/.test(head)) return { category: "Trainer", trainerType: "Pokémon Tool" };
  if (/エネルギー/.test(head)) return { category: "Energy", trainerType: null };

  // 헤딩으로 트레이너/에너지 판정 못하면 이미지 인픽스로:
  if (infix === "T") return { category: "Trainer", trainerType: null };
  if (infix === "E") return { category: "Energy", trainerType: null };
  if (infix === "P") return { category: "Pokemon", trainerType: null };
  // TopInfo 에 진화단계 span 있으면 포켓몬
  if (/<span class="type">/.test(html)) return { category: "Pokemon", trainerType: null };
  return { category: null, trainerType: null };
}

// 타입: hp-type 라벨 뒤(같은 td-r 안)의 icon-XXX 만 수집(약점/저항/도주 아이콘 제외)
function parseTypes(html: string): string[] {
  const m = html.match(/<span class="hp-type">[\s\S]*?<\/span>([\s\S]*?)<\/div>/);
  if (!m) return [];
  const out: string[] = [];
  for (const im of m[1].matchAll(/icon-([a-z]+)\s+icon/g)) {
    const t = TYPE_ICON[im[1]];
    if (t) out.push(t);
  }
  return out;
}

// HP: <span class="hp-num">50</span>
function parseHp(html: string): number | null {
  const m = html.match(/<span class="hp-num">\s*(\d+)\s*<\/span>/);
  return m ? parseInt(m[1], 10) : null;
}

// dexId: <h4>No.043 …</h4>  (ex/GX 등은 블록 없음 → null)
function parseDex(html: string): number | null {
  const m = html.match(/No\.(\d{1,4})/);
  return m ? parseInt(m[1], 10) : null;
}

// illustrator: <h4>イラストレーター</h4><a …>NAME</a>
function parseIllustrator(html: string): string | null {
  const m = html.match(/イラストレーター<\/h4>\s*<a[^>]*>([\s\S]*?)<\/a>/);
  return m ? stripTags(m[1]) || null : null;
}

// number / numberFull: 이미지 직후 <div class="subtext …">… NNN / DDD …</div>
function parseNumber(html: string): { number: string | null; numberFull: string | null } {
  const m = html.match(/<div class="subtext[^"]*">([\s\S]*?)<\/div>/);
  if (!m) return { number: null, numberFull: null };
  const txt = stripTags(m[1]);
  const nf = txt.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
  if (!nf) return { number: null, numberFull: null };
  return { number: nf[1], numberFull: `${nf[1]}/${nf[2]}` };
}

// 큰 이미지 URL + 파일명
function parseImage(html: string): { image: string | null; imgFile: string } {
  const m = html.match(/\/assets\/images\/card_images\/large\/[A-Za-z0-9+-]+\/([0-9A-Za-z_]+\.jpg)/); // 디렉토리 하이픈 허용(XY9-B 등)
  if (!m) return { image: null, imgFile: "" };
  return { image: `${BASE}${m[0]}`, imgFile: m[1] };
}

async function fetchDetail(cardID: string): Promise<{ html: string; detailUrl: string } | null> {
  const primary = `${BASE}/card-search/details.php/card/${cardID}/regu/all`;
  let html = await curlText(primary);
  if (html && /<h1 class="Heading1/.test(html)) return { html, detailUrl: primary };
  // 폴백
  const fallback = `${BASE}/card-search/details.php/card/${cardID}/`;
  html = await curlText(fallback);
  if (html && /<h1 class="Heading1/.test(html)) return { html, detailUrl: fallback };
  return null;
}

function parseCard(html: string, detailUrl: string): Rec | null {
  const nameM = html.match(/<h1 class="Heading1[^"]*">([\s\S]*?)<\/h1>/);
  if (!nameM) return null;
  const isMega = /pcg-megamark/.test(nameM[1]); // h1 메가마크 span(빈 태그라 stripTags 후 사라짐)
  let jaName = stripTags(nameM[1]);
  if (isMega && !/^(メガ|M)/.test(jaName)) jaName = "メガ" + jaName; // 메가진화 정식명 복원(메가フシギバナEX 등)

  const { image, imgFile } = parseImage(html);
  const { number, numberFull } = parseNumber(html);
  const { category, trainerType } = parseCategory(html, imgFile);
  const illustrator = parseIllustrator(html);

  const isPokemon = category === "Pokemon";
  const stage = isPokemon ? parseStage(html) : null;
  const suffix = isPokemon ? parseSuffix(jaName) : null;
  const hp = isPokemon ? parseHp(html) : null;
  const types = isPokemon ? parseTypes(html) : [];
  const dexId = isPokemon ? parseDex(html) : null;

  return {
    jaName,
    number: number ?? "",
    numberFull,
    rarity: null,
    illustrator,
    category,
    stage,
    suffix,
    trainerType,
    hp,
    types,
    dexId,
    image,
    detailUrl,
  };
}

async function main() {
  const jpSetId = process.argv[2];
  const pgCode = process.argv[3];
  const outPath = process.argv[4];
  // --merge: 기존 outPath 에서 빠진 cardID 만 재수집해 병합(스로틀 부분실패 복구). JP_SLEEP_MS 로 간격 조절.
  const MERGE = process.argv.includes("--merge");
  const SLEEP = parseInt(process.env.JP_SLEEP_MS ?? "150", 10);
  if (!jpSetId || !pgCode || !outPath) {
    console.error("usage: npx tsx scripts/collect-jp-pokemoncard.ts <jpSetId> <pgCode> <outPath> [--merge]");
    process.exit(1);
  }

  // ── 목록 수집 ──
  const ids: string[] = [];
  let hitCnt = 0, maxPage = 1;
  for (let pg = 1; pg <= maxPage; pg++) {
    const url = `${BASE}/card-search/resultAPI.php?pg=${pgCode}&regulation_sidebar_form=all&page=${pg}`;
    const j = await curlJson(url);
    if (!j) { console.error(`목록 실패: page ${pg}`); break; }
    if (pg === 1) { hitCnt = j.hitCnt ?? 0; maxPage = j.maxPage ?? 1; }
    for (const c of j.cardList ?? []) ids.push(String(c.cardID));
    await sleep(150);
  }
  console.log(`■ ${jpSetId} (pg=${pgCode}) | hitCnt=${hitCnt} maxPage=${maxPage} | 목록 ${ids.length}개 cardID`);

  // ── --merge: 기존 수집분 로드, 누락 cardID 만 대상 ──
  const recs: Rec[] = [];
  let targetIds = ids;
  if (MERGE) {
    try {
      const prev: Rec[] = JSON.parse(readFileSync(outPath, "utf8"));
      const have = new Set(prev.map((r) => (r.detailUrl?.match(/\/card\/(\d+)/) ?? [])[1]).filter(Boolean));
      recs.push(...prev);
      targetIds = ids.filter((id) => !have.has(id));
      console.log(`  --merge: 기존 ${prev.length}건 유지, 누락 ${targetIds.length}건만 수집 (sleep=${SLEEP}ms)`);
    } catch { console.log("  --merge: 기존 파일 없음 — 전체 수집"); }
  }

  // ── 상세 수집 ──
  let failed = 0;
  for (const id of targetIds) {
    const d = await fetchDetail(id);
    await sleep(SLEEP);
    if (!d) { failed++; console.error(`  상세 실패 cardID=${id}`); continue; }
    const rec = parseCard(d.html, d.detailUrl);
    if (!rec) { failed++; console.error(`  파싱 실패 cardID=${id}`); continue; }
    recs.push(rec);
  }

  // number 오름차순 정렬(빈 number 는 뒤로)
  const numInt = (n: string) => (n ? parseInt(n, 10) || 9999 : 9999);
  recs.sort((a, b) => numInt(a.number) - numInt(b.number));

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(recs, null, 2) + "\n", "utf8");

  // ── 커버리지 리포트 ──
  const pk = recs.filter((r) => r.category === "Pokemon");
  const cov = (arr: Rec[], pred: (r: Rec) => boolean) => arr.length ? `${arr.filter(pred).length}/${arr.length}` : "0/0";
  const cats: Record<string, number> = {};
  for (const r of recs) cats[r.category ?? "null"] = (cats[r.category ?? "null"] ?? 0) + 1;
  const missingNum = recs.filter((r) => !r.number).map((r) => r.jaName);
  const missingCat = recs.filter((r) => !r.category).map((r) => `#${r.number} ${r.jaName}`);

  console.log(`✔ 저장: ${outPath} | ${recs.length}장 (실패 ${failed})`);
  console.log(`  카테고리분포: ${JSON.stringify(cats)}`);
  console.log(`  커버리지: category ${cov(recs, (r) => !!r.category)} · number ${cov(recs, (r) => !!r.number)} · image ${cov(recs, (r) => !!r.image)} · illustrator ${cov(recs, (r) => !!r.illustrator)}`);
  console.log(`  포켓몬(${pk.length}): dexId ${cov(pk, (r) => r.dexId != null)} · stage ${cov(pk, (r) => !!r.stage)} · hp ${cov(pk, (r) => r.hp != null)} · types ${cov(pk, (r) => r.types.length > 0)}`);
  if (recs[0]) console.log(`  #1 = ${recs[0].number} ${recs[0].jaName} (${recs[0].category})`);
  if (missingNum.length) console.log(`  ⚠ number 누락 ${missingNum.length}: ${missingNum.slice(0, 10).join(", ")}`);
  if (missingCat.length) console.log(`  ⚠ category 누락 ${missingCat.length}: ${missingCat.slice(0, 10).join(", ")}`);
  if (recs.length < hitCnt) console.log(`  ⚠ 수집 ${recs.length} < hitCnt ${hitCnt} (차이 ${hitCnt - recs.length})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
