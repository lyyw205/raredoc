/**
 * 도감번호(pokedexNumbers) 매핑 감사 — DB 포켓몬 vs 표준 이름표(PokeAPI) 대조.
 *
 * 목적(사용자 질문):
 *   1) classic~modern 전 era 포켓몬이 글로벌 도감번호를 갖고 있나? (보유율/era별)
 *   2) DB 도감번호 vs 오픈소스(PokeAPI) 도감번호가 어긋나는 값이 있나? (이름→dex 역해석 대조)
 *   3) 앞으로 오픈소스 도감번호로 전부 매핑해도 되나? (해석 가능률/충돌)
 *
 * 방법: 포켓몬 Card 의 EN(우선)·KO 이름을 표준 이름표로 역해석한 dex 와
 *       저장된 pokedexNumbers 를 비교. 카드명 수식어(ex/GX/V/Mega/지역폼 등)는 stripping.
 *       태그팀("A & B")은 다중 dex 로 처리.
 *
 * 실행: npx tsx scripts/audit-pokedex-mapping.ts [--samples=N]
 * 변경 없음(읽기 전용 감사).
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { resolveCardDexes, loadPokeapiNames } from "./lib/pokeapi-names";
import { POKE } from "./lib/supertype";

const SAMPLES = parseInt(process.argv.find((a) => a.startsWith("--samples="))?.split("=")[1] ?? "25", 10);

/** 카드명(다국어) → 도감 집합. EN 우선, 실패 시 KO. (해석기는 로더 공용 resolveCardDexes) */
function deriveDexes(enName: string | null, koName: string | null): { dexes: number[]; via: "en" | "ko" | null } {
  if (enName) { const d = resolveCardDexes(enName, "en"); if (d.length) return { dexes: d, via: "en" }; }
  if (koName) { const d = resolveCardDexes(koName, "ko"); if (d.length) return { dexes: d, via: "ko" }; }
  return { dexes: [], via: null };
}

/** cardPackId / setId 에서 거친 era 라벨. */
function eraOf(cardPackId: string | null, anySetId: string | null): string {
  const s = (cardPackId ?? anySetId ?? "").toLowerCase();
  const tok = s.replace(/^og-/, "").replace(/^(en-tcg-|jp-tcg-|kr-)/, "");
  const rules: [RegExp, string][] = [
    [/^(base|gym|neo|jungle|fossil|si1|bp|np)/, "01·WOTC/Neo"],
    [/^(ecard|e[0-9]|web|vs)/, "02·e-card"],
    [/^(adv|pcg|ex[0-9]|pop)/, "03·EX/ADV"],
    [/^(dp|pl|dpp)/, "04·DP/Platinum"],
    [/^(hgss|hs|l[0-9]|ll|col|hsp)/, "05·HGSS/Call"],
    [/^(bw|dv|dragon|emerging)/, "06·BW"],
    [/^(xy|cp|g1|kss|fla|gen)/, "07·XY"],
    [/^(sm|sn|smp|sma)/, "08·SM"],
    [/^(s[0-9]|s1|swsh|cel|zenit)/, "09·SWSH"],
    [/^(sv|mew|151|svp|sve|paldea|obsid)/, "10·SV"],
    [/^(mega|me[0-9]|m[0-9])/, "11·MEGA"],
  ];
  for (const [re, label] of rules) if (re.test(tok)) return label;
  return "99·기타/미상";
}

async function main() {
  loadPokeapiNames(); // 표준표 워밍업
  console.log("포켓몬 Card 적재 중...");
  const cards = await prisma.card.findMany({
    where: { supertype: { in: POKE as unknown as string[] } },
    select: {
      id: true, supertype: true, pokedexNumbers: true, nameKo: true, cardPackId: true,
      locales: { select: { language: true, name: true, setId: true } },
    },
  });
  console.log(`적재 ${cards.length}\n`);

  type Era = { total: number; hasDex: number; resolvable: number; match: number; mismatch: number; noNameResolve: number };
  const eras = new Map<string, Era>();
  const E = (k: string) => { let e = eras.get(k); if (!e) { e = { total: 0, hasDex: 0, resolvable: 0, match: 0, mismatch: 0, noNameResolve: 0 }; eras.set(k, e); } return e; };

  const mismatches: { id: string; name: string; stored: number[]; derived: number[]; via: string }[] = [];
  const unresolved: { id: string; name: string; era: string }[] = [];

  for (const c of cards) {
    const en = c.locales.find((l) => l.language === "en")?.name ?? null;
    const ko = c.nameKo ?? c.locales.find((l) => l.language === "ko")?.name ?? null;
    const anySetId = c.locales[0]?.setId ?? null;
    const era = eraOf(c.cardPackId, anySetId);
    const e = E(era);
    e.total++;

    const stored = (c.pokedexNumbers ?? []).filter((n) => n > 0);
    const hasStored = stored.length > 0;
    if (hasStored) e.hasDex++;

    const { dexes: derived, via } = deriveDexes(en, ko);
    const resolvable = derived.length > 0;
    if (resolvable) e.resolvable++;

    const dispName = en ?? ko ?? "(이름없음)";

    if (hasStored && resolvable) {
      // 교집합 있으면 일치로 간주(태그팀 부분일치 허용)
      const overlap = derived.some((d) => stored.includes(d)) || stored.some((d) => derived.includes(d));
      if (overlap) e.match++;
      else { e.mismatch++; if (mismatches.length < 100000) mismatches.push({ id: c.id, name: dispName, stored, derived, via: via! }); }
    } else if (!resolvable) {
      e.noNameResolve++;
      if (unresolved.length < 100000) unresolved.push({ id: c.id, name: dispName, era });
    }
  }

  // ── 출력 ──
  const order = [...eras.keys()].sort();
  console.log("═══ era별 도감 보유율 & 이름해석 ═══");
  console.log("era".padEnd(18), "총".padStart(6), "도감보유".padStart(8), "이름해석가능".padStart(11), "일치".padStart(6), "불일치".padStart(7), "해석불가".padStart(8));
  let T = { total: 0, hasDex: 0, resolvable: 0, match: 0, mismatch: 0, noNameResolve: 0 };
  for (const k of order) {
    const e = eras.get(k)!;
    (Object.keys(T) as (keyof Era)[]).forEach((kk) => (T[kk] += e[kk]));
    const pct = (n: number) => `${((n / e.total) * 100).toFixed(0)}%`;
    console.log(k.padEnd(18), String(e.total).padStart(6), `${e.hasDex}(${pct(e.hasDex)})`.padStart(8), `${e.resolvable}(${pct(e.resolvable)})`.padStart(11), String(e.match).padStart(6), String(e.mismatch).padStart(7), String(e.noNameResolve).padStart(8));
  }
  console.log("─".repeat(70));
  console.log("합계".padEnd(18), String(T.total).padStart(6), `${T.hasDex}`.padStart(8), `${T.resolvable}`.padStart(11), String(T.match).padStart(6), String(T.mismatch).padStart(7), String(T.noNameResolve).padStart(8));

  console.log(`\n═══ 핵심 지표 ═══`);
  console.log(`  도감 보유: ${T.hasDex}/${T.total} (${(T.hasDex/T.total*100).toFixed(1)}%)  → 없음 ${T.total-T.hasDex}`);
  console.log(`  이름으로 PokeAPI dex 해석 가능: ${T.resolvable}/${T.total} (${(T.resolvable/T.total*100).toFixed(1)}%)`);
  console.log(`  [대조] 저장 dex 있고 이름도 해석됨: 일치 ${T.match} / 불일치 ${T.mismatch}  (불일치율 ${(T.mismatch/(T.match+T.mismatch||1)*100).toFixed(2)}%)`);
  console.log(`  채울 수 있음(저장X·해석O): 약 ${T.resolvable - T.match - T.mismatch} ↑`);
  console.log(`  이름 해석 불가(수동확인 필요): ${T.noNameResolve}`);

  console.log(`\n═══ ⚠️ 불일치 샘플 (DB dex ≠ PokeAPI dex) — 앞 ${SAMPLES}건 ═══`);
  for (const m of mismatches.slice(0, SAMPLES)) {
    console.log(`  [${m.via}] "${m.name}"  저장=[${m.stored}]  vs  PokeAPI=[${m.derived}]  (${m.id})`);
  }
  console.log(`  ... 총 불일치 ${mismatches.length}건`);

  console.log(`\n═══ 이름 해석 불가 샘플 — 앞 ${SAMPLES}건 (태그팀/특수명/이름없음 등) ═══`);
  for (const u of unresolved.slice(0, SAMPLES)) console.log(`  ${u.era}  "${u.name}"  (${u.id})`);
  console.log(`  ... 총 해석불가 ${unresolved.length}건`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
