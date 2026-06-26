/**
 * PT1 (ギンガの覇道, jp-tcg-PT1, og-pl1, 96장) 레퍼런스 빌드 — 이름기반 매칭판.
 *   pg=105 (DPt1-B) resultAPI 전 페이지 → 기본에너지(cardID<1000) 필터.
 *   ★위치(cardID정렬↔번호순) 매핑이 꼬리에서 어긋남(レインボーエネルギー가 공식 맨끝) →
 *     정규화 이름 그룹 매칭: 같은 이름끼리 official=cardID순 / DB=번호순 zip.
 *   레퍼런스 이미지는 resultAPI 썸네일(small, 클린 .jpg). 매칭/검증 전용.
 *   출력: data/collect/jp-pt1-images.json (전체) + tmp/pt1-ref-missing.json (NULL 21).
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync } from "node:fs";
const ex = promisify(execFile);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BASE = "https://www.pokemon-card.com";

async function api(pg: number, page: number): Promise<any> {
  const { stdout } = await ex("curl", ["-sSL", "--max-time", "30", "-A", "Mozilla/5.0",
    `${BASE}/card-search/resultAPI.php?pg=${pg}&regulation_sidebar_form=all&page=${page}`], { maxBuffer: 16 * 1024 * 1024 });
  return JSON.parse(stdout as string);
}
// 정규화: NFC, 괄호류 제거([..]/［..］/(..)/（..）), 전각ASCII→반각, 공백제거
function norm(s: string): string {
  return s.normalize("NFC")
    .replace(/[［\[][^］\]]*[］\]]/g, "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, "")
    .trim();
}

async function main() {
  const first = await api(105, 1);
  const maxPage = first.maxPage ?? 1;
  let all: any[] = [...(first.cardList ?? [])];
  for (let p = 2; p <= maxPage; p++) { await sleep(300); const j = await api(105, p); all.push(...(j.cardList ?? [])); }
  console.log(`pg=105 raw ${all.length}장 (hit ${first.hitCnt}, maxPage ${maxPage})`);

  const official = all.map((c) => ({ cardID: Number(c.cardID), thumb: c.cardThumbFile as string, name: (c.cardNameViewText as string).normalize("NFC") }))
    .filter((c) => c.cardID >= 1000);
  console.log(`기본에너지 필터 후 ${official.length}장 (cardID ${Math.min(...official.map(o=>o.cardID))}~${Math.max(...official.map(o=>o.cardID))})`);

  const db: { number: string; name: string }[] = JSON.parse(readFileSync("tmp/pt1-all.json", "utf8"));
  console.log(`db ${db.length} vs official ${official.length}`);

  // 이름 그룹: official(cardID순) / db(번호순)
  const offByName = new Map<string, typeof official>();
  for (const o of official) { const k = norm(o.name); (offByName.get(k) ?? offByName.set(k, []).get(k)!).push(o); }
  for (const arr of offByName.values()) arr.sort((a, b) => a.cardID - b.cardID);
  const dbByName = new Map<string, typeof db>();
  for (const d of db) { const k = norm(d.name); (dbByName.get(k) ?? dbByName.set(k, []).get(k)!).push(d); }
  for (const arr of dbByName.values()) arr.sort((a, b) => a.number.localeCompare(b.number));

  const ref: any[] = []; const unmatched: any[] = [];
  const cursor = new Map<string, number>();
  for (const d of db) {
    const k = norm(d.name);
    const grp = offByName.get(k);
    const idx = cursor.get(k) ?? 0;
    if (!grp || idx >= grp.length) { unmatched.push(d); continue; }
    const o = grp[idx]; cursor.set(k, idx + 1);
    ref.push({ number: d.number, name: d.name, imageUrl: BASE + o.thumb.replace("/small/", "/large/"), thumbUrl: BASE + o.thumb, cardID: String(o.cardID), officialName: o.name });
  }
  ref.sort((a, b) => a.number.localeCompare(b.number));
  console.log(`이름매칭: ref ${ref.length} / 미매칭 ${unmatched.length}${unmatched.length ? " -> " + unmatched.map(u=>`#${u.number} ${u.name}`).join(", ") : ""}`);

  // 검증: official 모두 1회씩 소비됐는지(중복/누락 그룹 확인)
  let leftover = 0;
  for (const [k, grp] of offByName) { const used = cursor.get(k) ?? 0; if (used !== grp.length) { leftover += grp.length - used; console.log(`  ⚠ official 잔여 "${k}" ${grp.length - used}장`); } }
  console.log(`official 잔여(미소비) ${leftover}장`);

  writeFileSync("data/collect/jp-pt1-images.json", JSON.stringify(ref, null, 1));
  const missNums = new Set<string>(JSON.parse(readFileSync("tmp/pt1-missing.json", "utf8")).map((x: any) => x.number));
  const miss = ref.filter((r) => missNums.has(r.number));
  writeFileSync("tmp/pt1-ref-missing.json", JSON.stringify(miss, null, 1));
  const got = new Set(miss.map((m) => m.number));
  const absent = [...missNums].filter((x) => !got.has(x));
  console.log(`레퍼런스 ${ref.length} → data/collect/jp-pt1-images.json | 누락대상 ${miss.length}/${missNums.size} → tmp/pt1-ref-missing.json`);
  if (absent.length) console.log(`  ⚠ 레퍼런스에서 못찾은 누락번호: ${absent.join(",")}`);
  // 누락 21 의 매핑 미리보기
  for (const m of miss) console.log(`  #${m.number} ${m.name}  <- cardID ${m.cardID} (official "${m.officialName}")`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
