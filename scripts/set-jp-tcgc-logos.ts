/**
 * JP 구시대 세트 로고 백필 — live tcgcollector(patchright로 Cloudflare 우회 수집)에서 추출한 실로고를 R2 미러링.
 *
 * 배경: logoUrl=null JP세트 중 프로모5(set-jp-promo-logos.ts) 외 잔여를 live tcgc 로 채움.
 *   live tcgc(2026)는 2024 아카이브와 달리 구 JP 본팩·덱 전부 실로고 보유(default 아님). Cloudflare Turnstile 은
 *   insane-search patchright(패치드 크로미움, 헤드드) 로 통과해 /expansions/jp 렌더 HTML 추출 → 세트별 로고 webp URL.
 *   각 후보는 로고(JP텍스트)+세트 nameJa+샘플카드 몽타주로 시각검증.
 *
 * 매핑: setId → tcgc 영문 세트명(정확). 이름 정규화(&amp;→&, 소문자, 영숫자만)로 live-items 매칭 → logo URL.
 * 저장: static.tcgcollector.com/content/images 직다운 → sharp webp(q92) → R2 set-assets/logo/{setId}.webp → Set.logoUrl(FREE).
 *
 * dry/몽타주: npx tsx scripts/set-jp-tcgc-logos.ts            (resolve + 몽타주만)
 * 적용:        npx tsx scripts/set-jp-tcgc-logos.ts --apply
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SCRATCH = "/tmp/claude-1000/-home-lyyw205-repos-raredoc/1115bcd2-72dc-44ac-ae0f-8e71604317ad/scratchpad";
type Item = { slug: string; name: string; code: string; logo: string | null };
const live: Item[] = JSON.parse(readFileSync(`${SCRATCH}/live-items.json`, "utf8"));
const norm = (s: string) => s.replace(/&amp;/g, "&").toLowerCase().replace(/[^a-z0-9]+/g, "");
const byName = new Map<string, Item>();
for (const it of live) { const k = norm(it.name); if (!byName.has(k) && it.logo && !it.logo.includes("default")) byName.set(k, it); }

// setId → tcgc 영문 세트명(정확)
const MAP: Record<string, string> = {
  "jp-tcg-DP1D": "Space-Time Creation",
  "jp-tcg-DP2": "Secret of the Lakes",
  "jp-tcg-DP3": "Shining Darkness",
  "jp-tcg-DP4M": "Moonlit Pursuit",
  "jp-tcg-DP5H": "Cry from the Mysterious",
  "jp-tcg-DP6": "Intense Fight in the Destroyed Sky",
  "jp-tcg-DPt2-Se": "Infernape vs Gallade SP Deck Kit (Gallade)",
  "jp-tcg-DPt2-Sg": "Infernape vs Gallade SP Deck Kit (Infernape)",
  "jp-tcg-DPt3-Sg": "Garchomp vs Charizard SP Deck Kit (Garchomp)",
  "jp-tcg-DPt3-Sl": "Garchomp vs Charizard SP Deck Kit (Charizard)",
  "jp-tcg-DPt4-Slp": "Arceus LV.X Deck: Lightning & Psychic",
  "jp-tcg-DPt4-Sgf": "Arceus LV.X Deck: Grass & Fire",
  "jp-tcg-DPt-EPd": "DPt Entry Pack (Dialga)",
  "jp-tcg-DPt-EPg": "DPt Entry Pack (Giratina)",
  "jp-tcg-DPt-EPp": "DPt Entry Pack (Palkia)",
  "jp-tcg-DPt-GBpi": "DPt Gift Box (Pikachu)",
  "jp-tcg-DPt-GBpo": "DPt Gift Box (Piplup)",
  "jp-tcg-DPt-GBhi": "DPt Gift Box (Chimchar)",
  "jp-tcg-DPt-GBna": "DPt Gift Box (Turtwig)",
  "jp-tcg-DPs-S": "Giratina vs Dialga Deck Kit (Giratina)",
  "jp-tcg-BGV": "Virizion Battle Strength Deck",
  "jp-tcg-BGC": "Cobalion Battle Strength Deck",
  "jp-tcg-BGT": "Terrakion Battle Strength Deck",
  "jp-tcg-BGREX": "Reshiram-EX Battle Strength Deck",
  "jp-tcg-BGZ2": "Zekrom-EX Battle Strength Deck",
  "jp-tcg-BGB2": "Black Kyurem-EX Battle Strength Deck",
  "jp-tcg-BGW2": "White Kyurem-EX Battle Strength Deck",
  "jp-tcg-SBD": "Hydreigon Half Deck",
  "jp-tcg-GBD": "Garchomp Half Deck",
  "jp-tcg-KD2": "Keldeo Battle Strength Deck",
  "jp-tcg-PD2": "Team Plasma Powered Half Deck",
  "jp-tcg-TD2": "Thundurus vs Tornadus Battle Gift Set",
  "jp-tcg-BD2": "Thundurus vs Tornadus Battle Gift Set",
  "jp-btv": "Victini Battle Theme Deck",
  "jp-cs1": "Journey Partners",
  "jp-hs-plus": "Beginning Set +",
  "jp-hsp": "Beginning Set Pikachu",
  "jp-hsz": "National Beginning Set",
  "jp-mdb": "Master Deck Build Box EX",
  "jp-tcg-Br": "Battle Starter Deck (Raichu)",
  "jp-tcg-L2-Sb": "Tyranitar Constructed Standard Deck",
  "jp-tcg-XYB": "Dialga-EX + Aegislash-EX Hyper Metal Chain Deck",
};

async function tryDl(url: string): Promise<Buffer | null> {
  try { const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" } as any);
    const b = stdout as unknown as Buffer; return b.length > 400 ? b : null; } catch { return null; }
}

function resolve(setId: string): Item | null {
  const nm = MAP[setId]; if (!nm) return null;
  return byName.get(norm(nm)) ?? null;
}

async function main() {
  const ids = Object.keys(MAP);
  console.log(`${APPLY ? "APPLY" : "RESOLVE"} set-jp-tcgc-logos | ${ids.length}`);
  const unresolved = ids.filter((id) => !resolve(id));
  if (unresolved.length) console.log(`⚠ resolve 실패: ${unresolved.join(", ")}`);

  if (!APPLY) {
    // montage 검증
    const panels: Buffer[] = [];
    for (const id of ids) {
      const it = resolve(id);
      const set = await prisma.set.findUnique({ where: { id }, select: { nameJa: true, nameKo: true } });
      const rc = await prisma.regionCard.findFirst({ where: { setId: id, imageSmall: { not: null } }, select: { imageSmall: true } });
      const W = 540, H = 250;
      const layers: sharp.OverlayOptions[] = [];
      const logoBuf = it?.logo ? await tryDl(it.logo) : null;
      if (logoBuf) { try { layers.push({ input: await sharp(logoBuf).resize(360, 150, { fit: "inside", background: "#fff" }).flatten({ background: "#fff" }).toBuffer(), top: 60, left: 8 }); } catch {} }
      const cardBuf = rc?.imageSmall ? await tryDl(rc.imageSmall) : null;
      if (cardBuf) { try { layers.push({ input: await sharp(cardBuf).resize(110, 154, { fit: "inside" }).toBuffer(), top: 70, left: 400 }); } catch {} }
      const lbl = `${id}`;
      const ja = (set?.nameJa || set?.nameKo || "").slice(0, 30);
      const en = (it?.name || "??").slice(0, 40);
      const svg = `<svg width="${W}" height="${H}"><rect width="${W}" height="52" fill="#222"/><text x="6" y="20" font-size="15" fill="#fff" font-family="monospace">${lbl}${logoBuf ? "" : " ⚠LOGOFAIL"}</text><text x="6" y="40" font-size="13" fill="#7cf" font-family="monospace">ja:${ja.replace(/&/g,"&amp;")}</text><text x="6" y="${H-6}" font-size="12" fill="#333" font-family="monospace">tcgc:${en.replace(/&/g,"&amp;")}</text></svg>`;
      layers.push({ input: Buffer.from(svg), top: 0, left: 0 });
      panels.push(await sharp({ create: { width: W, height: H, channels: 3, background: "#eee" } }).composite(layers).png().toBuffer());
      console.log(`  ${id.padEnd(18)} → ${it ? it.name.slice(0,38) : "UNRESOLVED"}`);
    }
    // tile 2 cols, split into chunks of 28 per image
    const cols = 2, W = 540, H = 250, per = 28;
    for (let c = 0; c < panels.length; c += per) {
      const chunk = panels.slice(c, c + per);
      const rows = Math.ceil(chunk.length / cols);
      const comp = chunk.map((p, i) => ({ input: p, top: Math.floor(i / cols) * H, left: (i % cols) * W }));
      await sharp({ create: { width: W * cols, height: H * rows, channels: 3, background: "#fff" } }).composite(comp).png().toFile(`${SCRATCH}/tcgc-verify-${c / per}.png`);
      console.log(`WROTE ${SCRATCH}/tcgc-verify-${c / per}.png`);
    }
    return;
  }

  // APPLY
  let ok = 0;
  for (const id of ids) {
    const it = resolve(id);
    if (!it?.logo) { console.log(`  ⚠ ${id} resolve실패 — 스킵`); continue; }
    const buf = await tryDl(it.logo);
    if (!buf) { console.log(`  ⚠ ${id} 다운로드실패 — 스킵`); continue; }
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 60) { console.log(`  ⚠ ${id} 로고 의심 w=${meta.width} — 스킵`); continue; }
    const key = `set-assets/logo/${id}.webp`;
    await uploadBuffer(key, await sharp(buf).webp({ quality: 92 }).toBuffer(), "image/webp");
    if (!(await headExists(key))) throw new Error(`${id} R2 verify 실패`);
    await prisma.set.update({ where: { id }, data: { logoUrl: r2PublicUrl(key) } });
    console.log(`  ✓ ${id.padEnd(18)} ← ${it.name.slice(0,36)} (${meta.width}x${meta.height})`);
    ok++;
  }
  console.log(`\n완료 ${ok}/${ids.length}`);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
