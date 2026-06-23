/**
 * Card.rarityId 백필 — 4개 출처 통합. rarityId=NULL 카드만 채움(이미지·기존값 절대 불변).
 *
 *   --source=tcgdex      : JP단독(EN locale 없음) 카드 전체. tcgdex ja→en API → rarity 텍스트 매칭.
 *   --source=pokemontcg  : EN locale 보유 카드 전체. pokemontcg.io API → rarity 텍스트(nameEn→code) 매칭.
 *   --source=kr-json     : 특정 KR 세트. KR 공식 목록 JSON 의 rarity 코드(KR은 RR+ 특수레어도만 노출).
 *   --source=jp-icon     : 특정 팩. pc-jp 상세 rarity 아이콘 스크랩 + 기존 rarity 로 아이콘→코드 self-학습.
 *
 * 실행(전부 dry 기본 · 적용은 --apply):
 *   npx tsx scripts/fill-rarity.ts --source=tcgdex --apply
 *   npx tsx scripts/fill-rarity.ts --source=pokemontcg --apply
 *   npx tsx scripts/fill-rarity.ts --source=kr-json <krSetId> <jsonPath> --apply
 *   npx tsx scripts/fill-rarity.ts --source=jp-icon <cardPackId> <officialJson> --apply
 *
 * ※ 통합 이력: fill-rarity-from-tcgdex/pokemontcg/kr-json + fill-jp-rarity 를 1파일로 합침.
 *   tcgdex/pokemontcg 는 본래 즉시적용이었으나 통합하며 --apply 게이트 추가(안전·일관).
 */
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as path from "node:path";

const execFileAsync = promisify(execFile);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── 공용: followup-plans.md 미보강 잔여 기록 (apply 시에만) ──────────────────
function appendFollowup(title: string, note: string, columns: string, lines: string[]) {
  if (lines.length === 0) return;
  const fpath = path.join(process.cwd(), "docs/plans/followup-plans.md");
  const existing = readFileSync(fpath, "utf-8");
  const section = `
---

## ${title} (${new Date().toISOString().slice(0, 10)})

${note}

| Card ID | RegionCard | era | rarity 텍스트 |
|---|---|---|---|
${lines.join("\n")}

`;
  writeFileSync(fpath, existing + section, "utf-8");
  console.log(`followup-plans.md에 미보강 ${lines.length}건 기록 완료.`);
}

// ════════════════════════════════════════════════════════════════════════════
// 출처 1) tcgdex — JP단독(EN locale 없는) 카드의 rarity 를 tcgdex ja/en 에서
// ════════════════════════════════════════════════════════════════════════════
function tcgdexId(regionCardId: string): { setId: string; num: string } | null {
  if (!regionCardId.startsWith("jp-tcg-")) return null; // 비 jp-tcg- 세트(MEGA 등)는 tcgdex 미수록
  const m = regionCardId.replace(/^jp-tcg-/, "").match(/^(.+)-(\d+[A-Za-z]?)$/);
  return m ? { setId: m[1], num: m[2] } : null;
}
async function fetchTcgdexRarity(setId: string, num: string): Promise<string | null> {
  for (const locale of ["ja", "en"]) {
    try {
      const { stdout } = await execFileAsync("curl", ["-s", "-f", "-m", "10", `https://api.tcgdex.net/v2/${locale}/cards/${setId}-${num}`], { timeout: 15000 });
      const json = JSON.parse(stdout);
      if (json?.rarity) return json.rarity as string;
    } catch { /* try next locale */ }
  }
  return null;
}
async function runTcgdex(apply: boolean) {
  const BATCH = 15, DELAY = 200;
  const whereNull = { rarityId: null, locales: { none: { region: "EN" as const }, some: { set: { cardPackId: { not: null } } } } };
  const beforeTotal = await prisma.card.count({ where: whereNull });
  console.log(`시작: JP-only rarityId NULL = ${beforeTotal} ${apply ? "★APPLY" : "(dry)"}`);

  const targets = await prisma.card.findMany({
    where: { rarityId: null, locales: { none: { region: "EN" }, some: { region: "JP", set: { cardPackId: { not: null } } } } },
    select: { id: true, locales: { where: { region: "JP" }, select: { id: true, set: { select: { cardPack: { select: { era: true } } } } }, take: 1 } },
  });
  console.log(`대상: JP-only + rarityId NULL = ${targets.length}건`);

  const rarities = await prisma.rarity.findMany({ select: { id: true, code: true, nameEn: true, nameJa: true } });
  const nameEnMap = new Map<string, string>(), nameJaMap = new Map<string, string>(), codeMap = new Map<string, string>();
  for (const r of rarities) { if (r.nameEn) nameEnMap.set(r.nameEn.toLowerCase(), r.id); if (r.nameJa) nameJaMap.set(r.nameJa.toLowerCase(), r.id); codeMap.set(r.code.toLowerCase(), r.id); }

  const TCGDEX_RARITY_MAP: Record<string, string> = {
    c: "Common", u: "Uncommon", r: "Rare", rr: "Double Rare", sr: "Super Rare", hr: "Hyper Rare", ar: "Art Rare", sar: "Special Art Rare", ur: "Ultra Rare", promo: "Promo",
    common: "Common", uncommon: "Uncommon", rare: "Rare", "キラ": "Holo Rare", "コモン": "Common", "アンコモン": "Uncommon", "レア": "Rare",
  };

  let updated = 0, notFound = 0, apiError = 0, skippedNonTcg = 0;
  const followupLines: string[] = [];
  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    await Promise.all(batch.map(async (lc) => {
      const jpLocaleId = lc.locales[0]?.id; if (!jpLocaleId) return;
      const parsed = tcgdexId(jpLocaleId); if (!parsed) { skippedNonTcg++; return; }
      const rarityText = await fetchTcgdexRarity(parsed.setId, parsed.num);
      if (rarityText === null) { apiError++; return; }
      const rarityLc = rarityText.toLowerCase();
      const mapped = TCGDEX_RARITY_MAP[rarityText] ?? TCGDEX_RARITY_MAP[rarityLc];
      const lookupKey = mapped ? mapped.toLowerCase() : rarityLc;
      const rarityId = nameEnMap.get(lookupKey) ?? nameJaMap.get(lookupKey) ?? codeMap.get(lookupKey);
      if (rarityId) { if (apply) await prisma.card.update({ where: { id: lc.id }, data: { rarityId } }); updated++; }
      else { followupLines.push(`| ${lc.id} | ${jpLocaleId} | ${lc.locales[0]?.set?.cardPack?.era ?? "-"} | ${rarityText} |`); notFound++; }
    }));
    if (i + BATCH < targets.length) await sleep(DELAY);
    if ((i / BATCH) % 10 === 0) console.log(`  진행: ${i + batch.length}/${targets.length} (updated=${updated})`);
  }

  const afterTotal = await prisma.card.count({ where: whereNull });
  const afterEra = await prisma.$queryRaw<{ era: string; cnt: bigint }[]>`
    SELECT sg.era, COUNT(*) as cnt FROM "LogicalCard" lc
    JOIN LATERAL (SELECT s."setGroupId" AS grp FROM "CardLocale" cl JOIN "Set" s ON s.id = cl."setId"
      WHERE cl."logicalCardId" = lc.id AND s."setGroupId" IS NOT NULL
      ORDER BY CASE cl.region WHEN 'JP' THEN 0 WHEN 'KR' THEN 1 WHEN 'EN' THEN 2 ELSE 3 END LIMIT 1) a ON true
    JOIN "SetGroup" sg ON sg.id = a.grp
    WHERE lc."rarityId" IS NULL AND NOT EXISTS (SELECT 1 FROM "CardLocale" cl WHERE cl."logicalCardId" = lc.id AND cl.region = 'EN')
    GROUP BY sg.era ORDER BY cnt DESC`;
  if (apply) appendFollowup("rarityId 미보강 잔여 — tcgdex JP-only (fill-rarity --source=tcgdex)", "tcgdex 에서 rarity 텍스트를 가져왔으나 Rarity 마스터 매칭 실패.", "", followupLines);
  console.log("─".repeat(50));
  console.log(`결과: JP-only rarityId NULL before=${beforeTotal} → after=${afterTotal}`);
  console.log(`  업데이트 ${updated} · 매칭실패(followup) ${notFound} · API오류 ${apiError} · tcgdex미수록 스킵 ${skippedNonTcg}`);
  afterEra.forEach((r) => console.log(`  ${r.era}: ${r.cnt}`));
}

// ════════════════════════════════════════════════════════════════════════════
// 출처 2) pokemontcg.io — EN locale 보유 카드의 rarity
// ════════════════════════════════════════════════════════════════════════════
function pokemontcgId(regionCardId: string): string {
  return regionCardId.replace(/^en-tcg-/, "").replace(/-0*(\d+[A-Za-z]?)$/, (_, n) => `-${n}`);
}
async function fetchPokemontcgRarity(regionCardId: string, apiKey: string): Promise<string | null | undefined> {
  const apiId = pokemontcgId(regionCardId);
  const args = ["-s", "-m", "10", ...(apiKey ? ["-H", `X-Api-Key: ${apiKey}`] : []), `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(apiId)}`];
  try {
    const { stdout } = await execFileAsync("curl", args, { timeout: 15000 });
    const json = JSON.parse(stdout);
    if (!json?.data) return undefined; // API 오류/미수록
    return (json.data.rarity as string) ?? null; // null = 응답엔 있으나 rarity 없음
  } catch { return undefined; }
}
async function runPokemontcg(apply: boolean) {
  const API_KEY = process.env.POKEMONTCG_API_KEY ?? "";
  const BATCH = 20, DELAY = 300;
  const eraSql = prisma.$queryRaw<{ era: string; cnt: bigint }[]>`
    SELECT sg.era, COUNT(*) as cnt FROM "LogicalCard" lc
    JOIN LATERAL (SELECT s."setGroupId" AS grp FROM "CardLocale" cl JOIN "Set" s ON s.id = cl."setId"
      WHERE cl."logicalCardId" = lc.id AND s."setGroupId" IS NOT NULL
      ORDER BY CASE cl.region WHEN 'JP' THEN 0 WHEN 'KR' THEN 1 WHEN 'EN' THEN 2 ELSE 3 END LIMIT 1) a ON true
    JOIN "SetGroup" sg ON sg.id = a.grp
    WHERE lc."rarityId" IS NULL GROUP BY sg.era ORDER BY cnt DESC`;
  const beforeTotal = await prisma.card.count({ where: { rarityId: null, locales: { some: { set: { cardPackId: { not: null } } } } } });
  console.log(`시작: rarityId NULL (era 있는 것) = ${beforeTotal} ${apply ? "★APPLY" : "(dry)"}`);
  (await eraSql).forEach((r) => console.log(`  ${r.era}: ${r.cnt}`));

  const targets = await prisma.card.findMany({
    where: { rarityId: null, locales: { some: { region: "EN", set: { cardPackId: { not: null } } } } },
    select: { id: true, locales: { where: { region: "EN" }, select: { id: true, set: { select: { cardPack: { select: { era: true } } } } }, take: 1 } },
  });
  console.log(`\n대상: EN locale 보유 + rarityId NULL = ${targets.length}건`);

  const rarities = await prisma.rarity.findMany({ select: { id: true, code: true, nameEn: true } });
  const nameEnMap = new Map<string, string>(), codeMap = new Map<string, string>();
  for (const r of rarities) { if (r.nameEn) nameEnMap.set(r.nameEn.toLowerCase(), r.id); codeMap.set(r.code.toLowerCase(), r.id); }

  let updated = 0, notFound = 0, apiError = 0;
  const followupLines: string[] = [];
  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    await Promise.all(batch.map(async (lc) => {
      const enLocaleId = lc.locales[0]?.id; if (!enLocaleId) return;
      const rarityText = await fetchPokemontcgRarity(enLocaleId, API_KEY);
      if (rarityText === undefined) { apiError++; return; }
      if (rarityText === null) { followupLines.push(`| ${lc.id} | ${enLocaleId} | ${lc.locales[0]?.set?.cardPack?.era ?? "-"} | (없음) |`); notFound++; return; }
      const rarityLc = rarityText.toLowerCase();
      const rarityId = nameEnMap.get(rarityLc) ?? codeMap.get(rarityLc);
      if (rarityId) { if (apply) await prisma.card.update({ where: { id: lc.id }, data: { rarityId } }); updated++; }
      else { followupLines.push(`| ${lc.id} | ${enLocaleId} | ${lc.locales[0]?.set?.cardPack?.era ?? "-"} | ${rarityText} |`); notFound++; }
    }));
    if (i + BATCH < targets.length) await sleep(DELAY);
    if ((i / BATCH) % 10 === 0) console.log(`  진행: ${i + batch.length}/${targets.length} (updated=${updated})`);
  }

  const afterTotal = await prisma.card.count({ where: { rarityId: null, locales: { some: { set: { cardPackId: { not: null } } } } } });
  const afterEra = await prisma.$queryRaw<{ era: string; cnt: bigint }[]>`
    SELECT sg.era, COUNT(*) as cnt FROM "LogicalCard" lc
    JOIN LATERAL (SELECT s."setGroupId" AS grp FROM "CardLocale" cl JOIN "Set" s ON s.id = cl."setId"
      WHERE cl."logicalCardId" = lc.id AND s."setGroupId" IS NOT NULL
      ORDER BY CASE cl.region WHEN 'JP' THEN 0 WHEN 'KR' THEN 1 WHEN 'EN' THEN 2 ELSE 3 END LIMIT 1) a ON true
    JOIN "SetGroup" sg ON sg.id = a.grp
    WHERE lc."rarityId" IS NULL GROUP BY sg.era ORDER BY cnt DESC`;
  if (apply) appendFollowup("rarityId 미보강 잔여 — pokemontcg.io (fill-rarity --source=pokemontcg)", "pokemontcg.io rarity 텍스트를 Rarity 마스터에 매칭 실패 (신규 row 생성 금지). 수동 검토 필요.", "", followupLines);
  console.log("─".repeat(50));
  console.log(`결과: rarityId NULL before=${beforeTotal} → after=${afterTotal}`);
  console.log(`  업데이트 ${updated} · 매칭실패(followup) ${notFound} · API오류 ${apiError}`);
  afterEra.forEach((r) => console.log(`  ${r.era}: ${r.cnt}`));
}

// ════════════════════════════════════════════════════════════════════════════
// 출처 3) kr-json — KR 공식 목록 JSON 의 rarity 코드 (RR+ 특수레어도만 노출)
// ════════════════════════════════════════════════════════════════════════════
const KR_RMAP: Record<string, string> = {
  C: "Common", U: "Uncommon", R: "Rare", RR: "Double Rare", RRR: "Triple Rare", AR: "Art Rare",
  SR: "Super Rare", SAR: "Special Art Rare", UR: "Ultra Rare", HR: "Hyper Rare", MUR: "Mega Ultra Rare",
  CHR: "Character Rare", CSR: "Character Super Rare", ACE: "ACE SPEC Rare", K: "Radiant Rare",
  S: "Shiny Rare", SSR: "Shiny Secret Rare", BWR: "Black White Rare", MA: "Mega Attack Rare", MHR: "Mega Hyper Rare",
};
async function runKrJson(krSet: string, jsonPath: string, apply: boolean) {
  const off: any[] = JSON.parse(readFileSync(jsonPath, "utf8"));
  const rarByNum = new Map<number, string>();
  for (const c of off) if (c.rarity) rarByNum.set(parseInt(c.number, 10), c.rarity);
  console.log(`JSON rarity 보유 ${rarByNum.size}/${off.length}`);

  const rarities = await prisma.rarity.findMany({ select: { id: true, code: true } });
  const rarId = new Map(rarities.map((r) => [r.code, r.id]));
  const kr = await prisma.regionCard.findMany({ where: { setId: krSet }, select: { numberInt: true, name: true, cardId: true, card: { select: { rarityId: true } } } });
  const todo = kr.filter((r) => !r.card.rarityId);
  let fill = 0, noJson = 0, unmapped = 0; const unm = new Set<string>(); const samples: string[] = []; const updates: { id: string; rid: string }[] = [];
  for (const r of todo) {
    const code = rarByNum.get(r.numberInt!); if (!code) { noJson++; continue; }
    const rname = KR_RMAP[code], rid = rname ? rarId.get(rname) : undefined;
    if (!rid) { unmapped++; unm.add(code); continue; }
    updates.push({ id: r.cardId, rid }); fill++;
    if (samples.length < 10) samples.push(`#${r.numberInt} ${r.name}=${code}`);
  }
  console.log(`rarity null ${todo.length}/${kr.length} · 채울수있음 ${fill} · JSON공백(C/U/R추정) ${noJson} · 미매핑 ${unmapped}${unm.size ? "(" + [...unm] + ")" : ""} ${apply ? "★APPLY" : "(dry)"}`);
  console.log("  " + samples.join(" | "));
  if (apply) { for (const u of updates) await prisma.card.update({ where: { id: u.id }, data: { rarityId: u.rid } }); console.log(`★적용 ${updates.length}`); }
}

// ════════════════════════════════════════════════════════════════════════════
// 출처 4) jp-icon — pc-jp 상세 rarity 아이콘 + 기존 rarity 로 아이콘→코드 self-학습
// ════════════════════════════════════════════════════════════════════════════
const JP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124";
async function fetchRarityIcon(cardID: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("curl", ["-sSL", "--max-time", "25", "-A", JP_UA, `https://www.pokemon-card.com/card-search/details.php/card/${cardID}/regu/all`], { maxBuffer: 8 * 1024 * 1024 });
    const m = stdout.match(/\/card\/rarity\/ic_rare_([a-z0-9_]+)\.gif/i);
    return m ? m[1] : null;
  } catch { return null; }
}
async function runJpIcon(gid: string, officialJson: string, apply: boolean) {
  const cache = officialJson.replace(/\.json$/, ".rarity.json");
  const off: any[] = JSON.parse(readFileSync(officialJson, "utf8"));
  let iconByNum: Record<string, string>;
  if (existsSync(cache)) { iconByNum = JSON.parse(readFileSync(cache, "utf8")); console.log(`■ 캐시 ${cache}`); }
  else {
    iconByNum = {}; let ok = 0, fail = 0;
    for (const c of off) { if (!c.cardID) continue; const ic = await fetchRarityIcon(c.cardID); await sleep(150); if (ic) { iconByNum[String(parseInt(c.number, 10))] = ic; ok++; } else fail++; }
    writeFileSync(cache, JSON.stringify(iconByNum));
    console.log(`■ 스크랩 ${off.length}: 아이콘 ${ok} · 실패 ${fail} → ${cache}`);
  }

  const lcs = await prisma.card.findMany({ where: { locales: { some: { set: { cardPackId: gid } } } }, select: { id: true, locales: { select: { region: true, numberInt: true } }, rarity: { select: { code: true } } } });
  const learn = new Map<string, Map<string, number>>();
  for (const lc of lcs) {
    if (!lc.rarity?.code) continue;
    const jp = lc.locales.find((l) => l.region === "JP"); if (!jp || jp.numberInt == null) continue;
    const ic = iconByNum[String(jp.numberInt)]; if (!ic) continue;
    if (!learn.has(ic)) learn.set(ic, new Map());
    const m = learn.get(ic)!; m.set(lc.rarity.code, (m.get(lc.rarity.code) ?? 0) + 1);
  }
  const iconMap = new Map<string, string>(); const ambiguous: string[] = [];
  for (const [ic, m] of learn) {
    const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]);
    iconMap.set(ic, sorted[0][0]);
    if (sorted.length > 1) ambiguous.push(`${ic}→${sorted.map(([c, n]) => `${c}(${n})`).join("/")}`);
  }
  console.log(`학습된 아이콘맵 ${iconMap.size}종: ${[...iconMap].map(([i, r]) => `${i}=${r}`).join(", ")}`);
  if (ambiguous.length) console.log(`⚠ 모호(최다값 채택): ${ambiguous.join(" | ")}`);

  const rarities = await prisma.rarity.findMany({ select: { id: true, code: true } });
  const rarId = new Map(rarities.map((r) => [r.code, r.id]));
  let fill = 0, noIcon = 0, unlearned = 0; const unl = new Set<string>(); const samples: string[] = []; const updates: { id: string; rid: string }[] = [];
  for (const lc of lcs) {
    if (lc.rarity?.code) continue;
    const jp = lc.locales.find((l) => l.region === "JP"); if (!jp || jp.numberInt == null) continue;
    const ic = iconByNum[String(jp.numberInt)]; if (!ic) { noIcon++; continue; }
    const rcode = iconMap.get(ic); if (!rcode) { unlearned++; unl.add(ic); continue; }
    const rid = rarId.get(rcode); if (!rid) { unlearned++; unl.add(`${ic}→${rcode}?`); continue; }
    updates.push({ id: lc.id, rid }); fill++;
    if (samples.length < 12) samples.push(`#${jp.numberInt} ${ic}=${rcode}`);
  }
  console.log(`null rarity 채움 ${fill} · 아이콘없음 ${noIcon} · 미학습아이콘 ${unlearned}${unl.size ? "(" + [...unl] + ")" : ""} ${apply ? "★APPLY" : "(dry)"}`);
  console.log("  " + samples.join(" | "));
  if (apply) { for (const u of updates) await prisma.card.update({ where: { id: u.id }, data: { rarityId: u.rid } }); console.log(`★적용 ${updates.length}`); }
}

// ════════════════════════════════════════════════════════════════════════════
async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const source = argv.find((a) => a.startsWith("--source="))?.split("=")[1];
  const pos = argv.filter((a) => !a.startsWith("--")); // 위치인자 (kr-json/jp-icon 용)
  switch (source) {
    case "tcgdex": await runTcgdex(apply); break;
    case "pokemontcg": await runPokemontcg(apply); break;
    case "kr-json":
      if (!pos[0] || !pos[1]) { console.error("usage: --source=kr-json <krSetId> <jsonPath> [--apply]"); process.exit(1); }
      await runKrJson(pos[0], pos[1], apply); break;
    case "jp-icon":
      if (!pos[0] || !pos[1]) { console.error("usage: --source=jp-icon <cardPackId> <officialJson> [--apply]"); process.exit(1); }
      await runJpIcon(pos[0], pos[1], apply); break;
    default:
      console.error("usage: --source=<tcgdex|pokemontcg|kr-json|jp-icon> [args] [--apply]"); process.exit(1);
  }
  if (!apply) console.log(`\n(dry) 적용하려면 --apply`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
