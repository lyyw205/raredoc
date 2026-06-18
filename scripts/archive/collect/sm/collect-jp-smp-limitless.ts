/**
 * SMP(サン&ムーン プロモカード / SM-P, JP 대형 프로모) 일본어판 전수 스크랩 → data/collect/jp-smp.json.
 * 워크플로 wrg0zj7va 의 SMP 스크랩 에이전트가 실패해 메인루프에서 직접 수집.
 * 출처: Limitless JP DB (/cards/jp/SMP). 리스트→상세에서 JP명(<title>)·이미지(HTML 실제 URL) 추출.
 *   ★?translate=en 금지. 이미지 패턴이 세트마다 달라(SMP_{N}_R_JP_LG.png) HTML에서 추출.
 * Limitless 보유 405장(결번 400·401, Bulba 권위는 ~408 — 차이는 보고만).
 * 일본어판 전용. 적재는 별도 로더가 함(이 스크립트는 JSON 생성만).
 * Run: npx tsx scripts/collect-jp-smp-limitless.ts
 */
import { writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const CODE = "SMP";
const OUT = "data/collect/jp-smp.json";
const DELAY_MS = 250;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function curlText(url: string): Promise<string> {
  const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "30", "-A", "Mozilla/5.0", url],
    { maxBuffer: 32 * 1024 * 1024 });
  return stdout;
}

type Card = { number: string; numberInt: number | null; name: string; language: "ja"; region: "JP"; supertype: string | null; imageLarge: string | null };

function parseName(html: string): string | null {
  const m = html.match(/<title>([^<]*?)\s+-\s+Sun and Moon Promotional Cards/i);
  return m ? m[1].trim() : null;
}
function parseImg(html: string, n: number): string | null {
  const all = [...html.matchAll(new RegExp(`https://limitlesstcg\\.nyc3\\.cdn\\.digitaloceanspaces\\.com/tpc/${CODE}/${CODE}_${n}_[^"' )]+\\.png`, "g"))].map((x) => x[0]);
  if (!all.length) return null;
  return all.find((u) => /_LG\.png$/i.test(u)) ?? all.find((u) => /_SM\.png$/i.test(u)) ?? all[0];
}
function guessSupertype(html: string): string | null {
  // 상세페이지 카드타입 텍스트로 대략 분류(없으면 null)
  if (/\bPok[eé]mon\b/.test(html) && /\bHP\b/.test(html)) return "Pokemon";
  if (/Trainer\s*-|\bSupporter\b|\bItem\b|\bStadium\b|\bPok[eé]mon Tool\b/.test(html)) return "Trainer";
  if (/\bEnergy\b/.test(html) && !/\bHP\b/.test(html)) return "Energy";
  return null;
}

async function main() {
  console.log(`■ SMP 전수 스크랩 (Limitless JP) → ${OUT}`);
  const listHtml = await curlText(`https://limitlesstcg.com/cards/jp/${CODE}`);
  const nums = [...new Set([...listHtml.matchAll(/href="\/cards\/jp\/SMP\/(\d+)"/g)].map((m) => parseInt(m[1], 10)))].sort((a, b) => a - b);
  console.log(`  리스트 카드 ${nums.length}장 (min ${nums[0]} / max ${nums[nums.length - 1]})`);

  const cards: Card[] = [];
  let noName = 0, noImg = 0;
  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    let html: string;
    try { html = await curlText(`https://limitlesstcg.com/cards/jp/${CODE}/${n}`); }
    catch { console.warn(`  ⚠ #${n} fetch 실패 — 스킵`); continue; }
    const name = parseName(html);
    const img = parseImg(html, n);
    if (!name) { noName++; console.warn(`  ⚠ #${n} 이름추출 실패 — 스킵`); continue; }
    if (!img) noImg++;
    cards.push({ number: String(n), numberInt: n, name, language: "ja", region: "JP", supertype: guessSupertype(html), imageLarge: img });
    if ((i + 1) % 50 === 0) console.log(`  …${i + 1}/${nums.length} (예: #${n} ${name})`);
    await sleep(DELAY_MS);
  }

  const ko = cards.filter((c) => /[가-힣]/.test(c.name)).length;
  const nonja = cards.filter((c) => !/[ぁ-ゟァ-ヿ一-鿿]/.test(c.name)).length;
  writeFileSync(OUT, JSON.stringify(cards, null, 1));
  console.log(`\n✅ ${cards.length}장 저장 | 이미지 ${cards.filter((c) => c.imageLarge).length} | 이름실패 ${noName} | 이미지없음 ${noImg}`);
  console.log(`   언어체크: 한글 ${ko} / 비일본어 ${nonja}`);
  console.log(`   샘플: ${cards.slice(0, 2).map((c) => `${c.number} ${c.name}`).join(" / ")} … ${cards.slice(-1).map((c) => `${c.number} ${c.name}`)}`);
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); });
