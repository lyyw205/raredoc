/**
 * 범용 Limitless JP DB 스크래퍼 — 코드 인자로 일본어판 카드 전수 → data/collect/{out}.json.
 *   리스트(/cards/jp/{CODE}) → 번호 추출 → 상세(/cards/jp/{CODE}/{N})에서 JP명(<title> 첫 " - " 앞) + 이미지(HTML 실제 URL) 추출.
 *   ★?translate=en 금지. 이미지 패턴 세트마다 달라 HTML에서 추출(없으면 기본패턴 HEAD 200 확인).
 * 일본어판 전용(적재는 별도 로더). 멱등(덮어쓰기).
 * Run: npx tsx scripts/collect-jp-limitless.ts --code=BWP --out=jp-bwp [--name-mode=first|strip]
 */
import { writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const arg = (k: string, d = "") => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const CODE = arg("code");
const OUT = `data/collect/${arg("out", `jp-${CODE.toLowerCase()}`)}.json`;
const NAME_MODE = arg("name-mode", "first"); // first: 첫 " - " 앞 / strip: " (CODE) #N" 앞 전체
const DELAY_MS = 250;
if (!CODE) { console.error("--code= 필요"); process.exit(1); }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function curlText(url: string): Promise<string> {
  const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "30", "-A", "Mozilla/5.0", url], { maxBuffer: 32 * 1024 * 1024 });
  return stdout;
}
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

type Card = { number: string; numberInt: number | null; name: string; language: "ja"; region: "JP"; supertype: string | null; imageLarge: string | null };

function parseName(html: string): string | null {
  const t = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "";
  if (!t) return null;
  // 형식: "NAME - SETFULLNAME (CODE) #N – Limitless"
  if (NAME_MODE === "strip") {
    const m = t.match(new RegExp(`^(.*?)\\s+-\\s+.*\\(${CODE}\\)`, "i"));
    if (m) return decode(m[1]);
  }
  const first = t.split(" - ")[0];
  return first ? decode(first) : null;
}
function parseImg(html: string, n: number): string | null {
  const re = new RegExp(`https://limitlesstcg\\.nyc3\\.cdn\\.digitaloceanspaces\\.com/tpc/${CODE}/${CODE}_${n}_[^"' )]+\\.png`, "g");
  const all = [...html.matchAll(re)].map((x) => x[0]);
  if (!all.length) return null;
  return all.find((u) => /_LG\.png$/i.test(u)) ?? all.find((u) => /_JP\.png$/i.test(u)) ?? all.find((u) => /_SM\.png$/i.test(u)) ?? all[0];
}
function guessSupertype(html: string): string | null {
  if (/>\s*HP\s*</.test(html) || /\bHP\b/.test(html)) {
    if (/Trainer|Supporter|Stadium|Item/.test(html) && !/\bweakness\b/i.test(html)) return "Trainer";
    return "Pokemon";
  }
  if (/\bEnergy\b/i.test(html)) return "Energy";
  if (/Trainer|Supporter|Stadium|Item/.test(html)) return "Trainer";
  return null;
}

async function main() {
  console.log(`■ ${CODE} 스크랩 (Limitless JP) → ${OUT}`);
  const listHtml = await curlText(`https://limitlesstcg.com/cards/jp/${CODE}`);
  const nums = [...new Set([...listHtml.matchAll(new RegExp(`href="/cards/jp/${CODE}/(\\d+)"`, "g"))].map((m) => parseInt(m[1], 10)))].sort((a, b) => a - b);
  console.log(`  리스트 ${nums.length}장 (min ${nums[0]} / max ${nums[nums.length - 1]})`);

  const cards: Card[] = [];
  let noName = 0, noImg = 0;
  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    let html: string;
    try { html = await curlText(`https://limitlesstcg.com/cards/jp/${CODE}/${n}`); }
    catch { console.warn(`  ⚠ #${n} fetch 실패`); continue; }
    const name = parseName(html);
    const img = parseImg(html, n);
    if (!name) { noName++; console.warn(`  ⚠ #${n} 이름실패`); continue; }
    if (!img) noImg++;
    cards.push({ number: String(n), numberInt: n, name, language: "ja", region: "JP", supertype: guessSupertype(html), imageLarge: img });
    if ((i + 1) % 50 === 0) console.log(`  …${i + 1}/${nums.length}`);
    await sleep(DELAY_MS);
  }

  const ko = cards.filter((c) => /[가-힣]/.test(c.name)).length;
  const nonja = cards.filter((c) => !/[ぁ-ゟァ-ヿ一-鿿]/.test(c.name)).length;
  writeFileSync(OUT, JSON.stringify(cards, null, 1));
  console.log(`✅ ${cards.length}장 | img ${cards.filter((c) => c.imageLarge).length} | 이름실패 ${noName} | 이미지없음 ${noImg} | 한글 ${ko} / 비일본어 ${nonja}`);
  console.log(`   샘플: ${cards.slice(0, 3).map((c) => `${c.number} ${c.name}`).join(" / ")}`);
  if (nonja > 0) console.log(`   ⚠ 비일본어: ${cards.filter((c) => !/[ぁ-ゟァ-ヿ一-鿿]/.test(c.name)).slice(0, 5).map((c) => c.number + " " + c.name).join(", ")}`);
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); });
