// ── P3: GameCard 빌드 (additive, v2 — 언어무관 키) ────────────────────────────
// 개선: ①canonical 이름(다지역 LC에서 JP↔EN↔KR 다리 도출 → 트레이너/에너지 언어split 해소)
//       ②포켓몬 dexKey = 같은 canonical이름 묶음의 dex union(태그팀 불완전dex 보정)
// 키: 포켓몬=[supertype, unionDex, subtypes, effectSig] / 트레이너·에너지=[supertype, canonName, subtypes]
// ★빈-LC(로케일0) 제외. id=결정적('gc_'+sha1) 멱등. 적용 후 고아 GameCard 정리.
// 기본 dry-run. 적용 --apply. 실행: npx tsx scripts/migration/p3-gamecard.ts [--apply]
import "dotenv/config";
import crypto from "crypto";
import { prisma } from "../../src/lib/prisma";
import { TR_ALL as JA2EN } from "../lib/trainer-names";
import { normSpace as norm } from "../lib/text-norm";
// JP 트레이너명 → EN 사전(전 시대 병합) — 언어무관 canonical 다리
const NFC = (s: string) => (s || "").normalize("NFC");

const APPLY = process.argv.includes("--apply");
const isPk = (st: string | null) => st === "Pokémon" || st === "Pokemon";
const esc = (s: string) => s.replace(/'/g, "''");
const gcId = (key: string) => "gc_" + crypto.createHash("sha1").update(key).digest("hex").slice(0, 20);

async function main() {
  const lcs = await prisma.logicalCard.findMany({
    where: { locales: { some: {} } },
    select: { id: true, supertype: true, regulationMark: true, hp: true, attacks: true, abilities: true, subtypes: true, types: true, setGroupId: true, pokedexNumbers: true,
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
  const subOf = (lc: typeof lcs[0]) => `sub:${[...(lc.subtypes || [])].sort().join("/")}`;
  // 포켓몬 키에서 types 슬롯을 뺀 base (빈-types 흡수 판단용)
  const pkBaseKey = (lc: typeof lcs[0]) => {
    const cn = canonName(lc);
    const dexU = [...(nameDex.get(cn) || [])].sort((a, b) => a - b);
    const dexK = dexU.length ? `dex:${dexU.join(",")}` : `nm:${cn}`;
    return `${lc.supertype}|${dexK}|nm:${cn}|${subOf(lc)}|${effPart(lc)}`;
  };
  // base 그룹별 유일 non-empty types (여러 타입 충돌=cross-era 등이면 null → 흡수불가, 빈채 유지)
  const baseTypes = new Map<string, string | null>();
  for (const lc of lcs) if (isPk(lc.supertype) && canonName(lc)) {
    const t = [...new Set(lc.types || [])].sort().join("/"); if (!t) continue;
    const bk = pkBaseKey(lc);
    if (!baseTypes.has(bk)) baseTypes.set(bk, t);
    else if (baseTypes.get(bk) !== t) baseTypes.set(bk, null);
  }
  // strict: 빈 types(데이터결손)는 같은 base 의 유일 non-empty types 로 흡수 → 같은카드 과분할 방지. 충돌/단독이면 빈채.
  const tyOf = (lc: typeof lcs[0]) => {
    let t = [...new Set(lc.types || [])].sort().join("/");
    if (!t) { const bt = baseTypes.get(pkBaseKey(lc)); if (bt) t = bt; }
    return t;
  };
  const keyOf = (lc: typeof lcs[0]) => {
    const cn = canonName(lc);
    if (isPk(lc.supertype)) {
      const dexU = [...(nameDex.get(cn) || [])].sort((a, b) => a - b);
      const dexK = dexU.length ? `dex:${dexU.join(",")}` : `nm:${cn}`;
      // v3: 폼변종 분리 — dex 있어도 버려지던 canonName(폼명) 병기 + types집합(빈건 strict 흡수).
      //   둘 다 필요: types 단독은 same-types 폼(버드렉스 백/흑마) 놓침, name 단독은 cross-era 재타입(레어코일 L↔M) 놓침.
      return `${lc.supertype}|${dexK}|nm:${cn}|ty:${tyOf(lc)}|${subOf(lc)}|${effPart(lc)}`;
    }
    return `${lc.supertype ?? "∅"}|nm:${cn}|${subOf(lc)}`;
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

  if (!APPLY) {
    const cur = await prisma.gameCard.count();
    console.log(`  [진단] 현재 DB GameCard ${cur} → 새 키 ${arr.length} (증감 ${arr.length - cur >= 0 ? "+" : ""}${arr.length - cur})`);
    // 오거폰(dex 1017) 폼별 분리 확인
    const og = lcs.filter((lc) => (lc.pokedexNumbers || []).includes(1017) && isPk(lc.supertype));
    const ogG = new Map<string, { n: number; ty: string }>();
    for (const lc of og) { const k = keyOf(lc); const g = ogG.get(k) ?? ogG.set(k, { n: 0, ty: [...new Set(lc.types || [])].sort().join("/") || "∅" }).get(k)!; g.n++; }
    console.log(`  [진단] 오거폰 dex1017 → ${ogG.size} GameCard:`, [...ogG.values()].map((g) => `${g.ty}×${g.n}`).join(" · "));
    // 빈-types 과분할 측정: types 슬롯 제거한 baseKey 로는 한 그룹인데 types 포함시 갈린 포켓몬 그룹 + 그중 빈-types 멤버 보유(=과분할 의심)
    const baseGroups = new Map<string, typeof lcs>();
    for (const lc of lcs) { if (!isPk(lc.supertype) || !canonName(lc)) continue; const bk = pkBaseKey(lc); (baseGroups.get(bk) ?? baseGroups.set(bk, []).get(bk)!).push(lc); }
    let splitByTypes = 0, emptyTypeSplit = 0;
    for (const [, mem] of baseGroups) {
      const fullKeys = new Set(mem.map(keyOf));
      if (fullKeys.size > 1) { splitByTypes++; if (mem.some((lc) => !(lc.types || []).length)) emptyTypeSplit++; }
    }
    console.log(`  [진단] types로 추가분리된 포켓몬 그룹(dex+name+sub+eff 동일) ${splitByTypes} · 그중 빈-types 멤버 포함(과분할 의심) ${emptyTypeSplit}`);
    console.log("\n  (dry-run)"); await prisma.$disconnect(); return;
  }

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
