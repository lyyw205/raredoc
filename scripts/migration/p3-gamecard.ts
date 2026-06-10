// ── P3: GameCard 빌드 (additive, v2 — 언어무관 키) ────────────────────────────
// 개선: ①canonical 이름(다지역 LC에서 JP↔EN↔KR 다리 도출 → 트레이너/에너지 언어split 해소)
//       ②포켓몬 dexKey = 같은 canonical이름 묶음의 dex union(태그팀 불완전dex 보정)
// 키: 포켓몬=[supertype, unionDex, subtypes, effectSig] / 트레이너·에너지=[supertype, canonName, subtypes]
// ★빈-LC(로케일0) 제외. id=결정적('gc_'+sha1) 멱등. 적용 후 고아 GameCard 정리.
// 기본 dry-run. 적용 --apply. 실행: npx tsx scripts/migration/p3-gamecard.ts [--apply]
import "dotenv/config";
import crypto from "crypto";
import { prisma } from "../../src/lib/prisma";
import { TR_JP2EN as TR_SV } from "../lib/trainer-names-sv";
import { TR_JP2EN as TR_SM } from "../lib/trainer-names-sm";
import { TR_JP2EN as TR_SWSH } from "../lib/trainer-names-swsh";
import { TR_JP2EN as TR_XY } from "../lib/trainer-names-xy";
import { TR_JP2EN as TR_BW } from "../lib/trainer-names-bw";
import { TR_JP2EN as TR_EX } from "../lib/trainer-names-ex";
import { TR_JP2EN as TR_HGSS } from "../lib/trainer-names-hgss";
import { TR_JP2EN as TR_DPT } from "../lib/trainer-names-dpt";
// JP 트레이너명 → EN 사전(전 시대 병합) — 언어무관 canonical 다리
const JA2EN: Record<string, string> = { ...TR_EX, ...TR_HGSS, ...TR_DPT, ...TR_BW, ...TR_XY, ...TR_SM, ...TR_SWSH, ...TR_SV };
const NFC = (s: string) => (s || "").normalize("NFC");

const APPLY = process.argv.includes("--apply");
const norm = (s: any) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
const isPk = (st: string | null) => st === "Pokémon" || st === "Pokemon";
const esc = (s: string) => s.replace(/'/g, "''");
const gcId = (key: string) => "gc_" + crypto.createHash("sha1").update(key).digest("hex").slice(0, 20);

async function main() {
  const lcs = await prisma.logicalCard.findMany({
    where: { locales: { some: {} } },
    select: { id: true, supertype: true, regulationMark: true, hp: true, attacks: true, abilities: true, subtypes: true, setGroupId: true, pokedexNumbers: true,
      locales: { select: { region: true, name: true } } },
  });
  const reg = (lc: typeof lcs[0], r: string) => lc.locales.find((l) => l.region === r)?.name;
  const origBest = (lc: typeof lcs[0]) => reg(lc, "EN") || reg(lc, "JP") || reg(lc, "KR") || "";

  // ── ① canonical 이름 다리: 각 LC의 {en,jp,ko} → canon(en우선) 매핑 ──
  const nameCanon = new Map<string, string>(); // normName → canonical normName(en우선)
  for (const lc of lcs) {
    const en = norm(reg(lc, "EN")), jp = norm(reg(lc, "JP")), ko = norm(reg(lc, "KR"));
    const canon = en || jp || ko; if (!canon) continue;
    for (const x of [en, jp, ko]) if (x && !nameCanon.has(x)) nameCanon.set(x, canon);
  }
  // canonical 이름: EN 우선 → JP는 사전(JA2EN)으로 EN화 → 같은LC 다리 → 원명. 괄호 부제 제거(동일카드).
  const stripSub = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const canonRaw = (lc: typeof lcs[0]) => {
    const en = norm(reg(lc, "EN")); if (en) return en;
    const jpRaw = reg(lc, "JP");
    if (jpRaw) {
      const j = NFC(jpRaw);
      const hit = JA2EN[j] ?? JA2EN[j.replace(/\s+/g, "")];
      if (hit) return norm(hit);
      const nj = norm(jpRaw);
      return nameCanon.get(nj) ?? nj;
    }
    return norm(reg(lc, "KR"));
  };
  const canonName = (lc: typeof lcs[0]) => stripSub(canonRaw(lc));

  // ── ② 포켓몬 dex union (canonical이름 기준) — 태그팀 불완전 dex 보정 ──
  const nameDex = new Map<string, Set<number>>();
  for (const lc of lcs) if (isPk(lc.supertype)) {
    const cn = canonName(lc); const s = nameDex.get(cn) ?? nameDex.set(cn, new Set()).get(cn)!;
    for (const d of lc.pokedexNumbers || []) if (d > 0) s.add(d);
  }

  const effPart = (lc: typeof lcs[0]) => {
    let dmg: string[] = [], natk = 0;
    try { const a: any = lc.attacks; if (Array.isArray(a)) { natk = a.length; dmg = a.map((x) => String(x?.damage ?? "")).sort(); } } catch {}
    let nab = 0; try { const b: any = lc.abilities; if (Array.isArray(b)) nab = b.length; } catch {}
    return `hp${lc.hp ?? "?"}|dmg${dmg.join(",")}|na${natk}|ab${nab}`;
  };
  const keyOf = (lc: typeof lcs[0]) => {
    const cn = canonName(lc);
    const sub = `sub:${[...(lc.subtypes || [])].sort().join("/")}`;
    if (isPk(lc.supertype)) {
      const dexU = [...(nameDex.get(cn) || [])].sort((a, b) => a - b);
      const dexK = dexU.length ? `dex:${dexU.join(",")}` : `nm:${cn}`;
      return `${lc.supertype}|${dexK}|${sub}|${effPart(lc)}`;
    }
    return `${lc.supertype ?? "∅"}|nm:${cn}|${sub}`;
  };

  // 그룹핑
  const groups = new Map<string, { id: string; supertype: string | null; name: string; effectKey: string; hp: number | null; reg: string | null; n: number }>();
  const lcToGc: [string, string][] = [];
  let noName = 0;
  for (const lc of lcs) {
    if (!canonName(lc)) { noName++; continue; }
    const key = keyOf(lc); const id = gcId(key);
    let g = groups.get(key);
    if (!g) { g = { id, supertype: lc.supertype, name: origBest(lc), effectKey: key.split("|").slice(1).join("|"), hp: isPk(lc.supertype) ? lc.hp : null, reg: lc.regulationMark, n: 0 }; groups.set(key, g); }
    if (reg(lc, "EN") && /[ぁ-んァ-ヶ一-龯가-힣]/.test(g.name)) g.name = reg(lc, "EN")!; // JP/KR 표시명 → EN 으로 업그레이드
    g.n++; lcToGc.push([lc.id, id]);
  }
  const arr = [...groups.values()];
  const multi = arr.filter((g) => g.n > 1).length;
  console.log(`【P3 GameCard v2】${APPLY ? " ★APPLY" : " (dry-run)"}`);
  console.log(`  대상 LC ${lcs.length} · 이름없음 ${noName} · GameCard 그룹 ${arr.length}(복수멤버 ${multi}) · 연결 ${lcToGc.length}`);
  const top = [...arr].sort((a, b) => b.n - a.n).slice(0, 6);
  console.log("  최다 재수록 표본:", top.map((g) => `"${g.name}"×${g.n}`).join(" · "));

  if (!APPLY) { console.log("\n  (dry-run)"); await prisma.$disconnect(); return; }

  let s = 0;
  const rows = arr.map((g) => ({ id: g.id, supertype: g.supertype, name: g.name, effectKey: g.effectKey, hp: g.hp, regulationMark: g.reg }));
  for (let i = 0; i < rows.length; i += 3000) s += (await prisma.gameCard.createMany({ data: rows.slice(i, i + 3000), skipDuplicates: true })).count;
  let u = 0;
  for (let i = 0; i < lcToGc.length; i += 1000) {
    const vals = lcToGc.slice(i, i + 1000).map(([lc, gc]) => `('${esc(lc)}','${esc(gc)}')`).join(",");
    u += await prisma.$executeRawUnsafe(`UPDATE "LogicalCard" SET "gameCardId"=v.gc FROM (VALUES ${vals}) AS v(lcid,gc) WHERE "LogicalCard".id=v.lcid`);
  }
  // 고아 GameCard 정리(재키잉으로 멤버 0이 된 것)
  const del = await prisma.$executeRawUnsafe(`DELETE FROM "GameCard" WHERE id NOT IN (SELECT DISTINCT "gameCardId" FROM "LogicalCard" WHERE "gameCardId" IS NOT NULL)`);
  console.log(`\n  ✅ GameCard +${s} · LC링크 ${u} · 고아 GameCard 삭제 ${del}`);

  const gcCount = await prisma.gameCard.count();
  console.log(`  검증 — GameCard ${gcCount}`);
  // 트레이너 언어통합 검증(Switch=ポケモンいれかえ)
  const sw: any[] = await prisma.$queryRawUnsafe(`SELECT gc.id, gc.name, count(*)::int c, count(DISTINCT lc."setGroupId")::int packs FROM "GameCard" gc JOIN "LogicalCard" lc ON lc."gameCardId"=gc.id WHERE gc.name ILIKE '%switch%' AND gc.supertype='Trainer' GROUP BY gc.id, gc.name ORDER BY c DESC LIMIT 3`);
  console.log("  트레이너 검증(Switch):", sw.map((g) => `"${g.name}"×${g.c}/${g.packs}팩`).join(" · ") || "(없음)");
  // 태그팀 검증
  const tt: any[] = await prisma.$queryRawUnsafe(`SELECT gc.name, count(*)::int c FROM "GameCard" gc JOIN "LogicalCard" lc ON lc."gameCardId"=gc.id WHERE gc.name ILIKE '%greninja & zoroark%' GROUP BY gc.id, gc.name`);
  console.log("  태그팀 검증(Greninja&Zoroark):", tt.map((g) => `"${g.name}"×${g.c}`).join(" · ") || "(없음)");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
