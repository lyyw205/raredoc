// ── P0 reconciliation 타깃 해결 + 정합성 검증 → 매핑 JSON 출력 (읽기전용) ──────
// 빈-LC 각각의 재포인트 타깃 LC를 4단 좌표 폴백으로 해결, 타깃이 같은 카드인지(dex/이름) 검증.
//   후보 좌표 우선순위: (setId,numInt) → (en-tcg-setId,numInt) → (setId,numStr) → (en-tcg-setId,numStr)
//   검증: 포켓몬=dex 교집합 / 트레이너·에너지=이름 일치. 미통과·미해결은 격리(quarantine).
// 출력: .migration-snapshots/recon-empty-mapping.json { map:{empty:target}, quarantine:[...], stats }
// 실행: npx tsx scripts/migration/p0-recon-resolve.ts
import "dotenv/config";
import fs from "fs";
import { prisma } from "../../src/lib/prisma";

const OUT = ".migration-snapshots/recon-empty-mapping.json";
const norm = (s: any) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
const esc = (s: string) => s.replace(/'/g, "''");
const K = (a: string, b: string | number) => a + "" + b; // 안전 구분자

// 빈-LC id → (setId, numTok). 접두 제거 후 마지막 '-' 기준 분할.
function parseLcId(id: string) {
  let s = id;
  if (s.startsWith("lc-orphan-")) s = s.slice("lc-orphan-".length);
  else if (s.startsWith("lc-")) s = s.slice("lc-".length);
  else return null;
  const i = s.lastIndexOf("-");
  if (i <= 0 || i === s.length - 1) return null;
  const setId = s.slice(0, i), numTok = s.slice(i + 1);
  const numInt = /^\d+$/.test(numTok) ? parseInt(numTok, 10) : null;
  return { setId, numTok, numInt };
}

type Cand = { setId: string; numInt: number | null; numStr: string };
function candsOf(id: string): Cand[] {
  const p = parseLcId(id);
  if (!p) return [];
  const sets = [p.setId, p.setId.startsWith("en-tcg-") ? null : "en-tcg-" + p.setId].filter(Boolean) as string[];
  const out: Cand[] = [];
  for (const setId of sets) if (p.numInt != null) out.push({ setId, numInt: p.numInt, numStr: "" });
  for (const setId of sets) out.push({ setId, numInt: null, numStr: p.numTok });
  return out;
}

async function main() {
  const empties = await prisma.logicalCard.findMany({
    where: { locales: { none: {} } },
    select: { id: true, supertype: true, pokedexNumbers: true, texts: { select: { language: true, name: true } } },
  });
  const emptyIds = new Set(empties.map((e) => e.id));
  console.log(`빈-LC ${empties.length}개 — 4단 좌표 해결 + 정합성 검증\n`);

  // 후보 좌표 일괄 조회
  const intProbes = new Map<string, { s: string; n: number }>();
  const strProbes = new Map<string, { s: string; n: string }>();
  for (const e of empties) for (const c of candsOf(e.id)) {
    if (c.numInt != null) intProbes.set(K(c.setId, c.numInt), { s: c.setId, n: c.numInt });
    else strProbes.set(K(c.setId, c.numStr), { s: c.setId, n: c.numStr });
  }
  const intMap = new Map<string, string>(), strMap = new Map<string, string>();
  const intArr = [...intProbes.values()];
  for (let i = 0; i < intArr.length; i += 400) {
    const b = intArr.slice(i, i + 400);
    const ors = b.map((x) => `("setId"='${esc(x.s)}' AND "numberInt"=${x.n})`).join(" OR ");
    const rows: any[] = await prisma.$queryRawUnsafe(`SELECT "setId" s,"numberInt" n,"logicalCardId" lc FROM "CardLocale" WHERE ${ors}`);
    for (const r of rows) { const k = K(r.s, r.n); if (!intMap.has(k)) intMap.set(k, r.lc); }
  }
  const strArr = [...strProbes.values()];
  for (let i = 0; i < strArr.length; i += 400) {
    const b = strArr.slice(i, i + 400);
    const ors = b.map((x) => `("setId"='${esc(x.s)}' AND "number"='${esc(x.n)}')`).join(" OR ");
    const rows: any[] = await prisma.$queryRawUnsafe(`SELECT "setId" s,"number" n,"logicalCardId" lc FROM "CardLocale" WHERE ${ors}`);
    for (const r of rows) { const k = K(r.s, r.n); if (!strMap.has(k)) strMap.set(k, r.lc); }
  }

  // 해결: 우선순위대로 첫 살아있는 타깃
  const resolved = new Map<string, { target: string; via: string }>();
  for (const e of empties) {
    for (const c of candsOf(e.id)) {
      const lc = c.numInt != null ? intMap.get(K(c.setId, c.numInt)) : strMap.get(K(c.setId, c.numStr));
      if (lc && !emptyIds.has(lc) && lc !== e.id) {
        resolved.set(e.id, { target: lc, via: `${c.setId.startsWith("en-tcg-") ? "en" : "raw"}/${c.numInt != null ? "int" : "str"}` });
        break;
      }
    }
  }

  // 타깃 메타 로드
  const liveMeta = new Map<string, { dex: number[]; names: Set<string> }>();
  const tids = [...new Set([...resolved.values()].map((r) => r.target))];
  for (let i = 0; i < tids.length; i += 500) {
    const rows = await prisma.logicalCard.findMany({ where: { id: { in: tids.slice(i, i + 500) } },
      select: { id: true, pokedexNumbers: true, locales: { select: { name: true } } } });
    for (const r of rows) liveMeta.set(r.id, { dex: r.pokedexNumbers || [], names: new Set(r.locales.map((l) => norm(l.name))) });
  }

  // 검증 → 통과만 채택
  const map: Record<string, string> = {};
  const quarantine: { id: string; reason: string; target?: string }[] = [];
  let okPk = 0, okTr = 0, mism = 0;
  const viaCount = new Map<string, number>();
  const mismSamples: string[] = [];
  for (const e of empties) {
    const r = resolved.get(e.id);
    if (!r) { quarantine.push({ id: e.id, reason: "unresolved" }); continue; }
    const m = liveMeta.get(r.target)!;
    const isPk = e.supertype === "Pokémon" || e.supertype === "Pokemon";
    let ok = false;
    if (isPk) { const ed = new Set(e.pokedexNumbers || []); ok = ed.size === 0 || m.dex.some((d) => ed.has(d)); }
    else { const en = new Set(e.texts.map((c) => norm(c.name)).filter(Boolean)); ok = en.size === 0 || [...en].some((nm) => m.names.has(nm)); }
    if (ok) { map[e.id] = r.target; viaCount.set(r.via, (viaCount.get(r.via) || 0) + 1); if (isPk) okPk++; else okTr++; }
    else {
      mism++; quarantine.push({ id: e.id, reason: "identity-mismatch", target: r.target });
      if (mismSamples.length < 10) mismSamples.push(`${e.id} dex[${e.pokedexNumbers}] → ${r.target} dex[${m.dex}]`);
    }
  }

  console.log("── 해결/검증 ──");
  console.log(`  ✅ 채택 ${Object.keys(map).length} (포켓몬 ${okPk}+트레이너 ${okTr}) · via: ${[...viaCount].map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  console.log(`  🟡 격리 ${quarantine.length} (미해결 ${quarantine.filter((q) => q.reason === "unresolved").length} · mismatch ${mism})`);
  if (mismSamples.length) console.log("  mismatch 표본:\n    " + mismSamples.join("\n    "));
  const qfam = new Map<string, number>();
  for (const q of quarantine) { const k = q.id.replace(/[0-9].*$/, "").slice(0, 22); qfam.set(k, (qfam.get(k) || 0) + 1); }
  console.log("  격리 패밀리:", [...qfam].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(" · "));

  if (!fs.existsSync(".migration-snapshots")) fs.mkdirSync(".migration-snapshots", { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ map, quarantine, stats: { empties: empties.length, adopted: Object.keys(map).length, quarantine: quarantine.length } }));
  console.log(`\n  💾 ${OUT} (채택 ${Object.keys(map).length})`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
