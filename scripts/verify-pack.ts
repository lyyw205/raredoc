/**
 * 카드팩 단위 검증 (DB-only, 읽기전용). docs/verification/playbook.md Phase B/E 의 자동 점검 백본.
 * 필드 완전성·구조·지역미러·EN-dex 정합·이름누수·dex 교차(PokeAPI)·Set.code 를 점검하고 score 산출.
 *
 * 실행: npx tsx scripts/verify-pack.ts <cardPackId>
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { resolveCardDexes } from "./lib/pokeapi-names";
import { POKE, isPokemonSupertype } from "./lib/supertype";
const isAscii = (s: string) => /^[\x00-\x7F]*$/.test(s);
const hasHangul = (s: string) => /[가-힣]/.test(s);
const hasKana = (s: string) => /[぀-ヿ一-鿿]/.test(s);

async function main() {
  const gid = process.argv[2];
  if (!gid) { console.error("usage: verify-pack.ts <cardPackId>"); process.exit(1); }
  const g = await prisma.cardPack.findFirst({ where: { id: gid }, include: { sets: { select: { id: true, region: true, code: true, cardCount: true } } } });
  if (!g) { console.log(`SCORE: 0  (GROUP NOT FOUND: ${gid})`); return; }
  const lcs = await prisma.card.findMany({ where: { cardPackId: gid }, include: { rarity: { select: { code: true } }, locales: { select: { region: true, setId: true, numberInt: true, name: true, imageSmall: true } } } });
  const n = lcs.length || 1;
  const pc = (c: number) => `${((c / n) * 100).toFixed(0)}%`;

  console.log(`\n══════ ${gid} | era ${g.era} | LC ${lcs.length} ══════`);
  console.log(`sets: ${g.sets.map((s) => `${s.id}(${s.region}${s.code ? ":" + s.code : ":∅CODE"}/${s.cardCount})`).join(" ")}`);
  const noCode = g.sets.filter((s) => !s.code);
  if (noCode.length) console.log(`⚠ Set.code 없음: ${noCode.map((s) => s.id).join(", ")}`);

  // 지역/세트 분포
  const region = new Map<string, number>(), perSet = new Map<string, number>();
  let imgNull = 0, locTot = 0;
  for (const lc of lcs) for (const l of lc.locales) { region.set(l.region, (region.get(l.region) ?? 0) + 1); perSet.set(l.setId, (perSet.get(l.setId) ?? 0) + 1); locTot++; if (!l.imageSmall) imgNull++; }
  console.log(`locale: ${[...region].map(([r, c]) => `${r}:${c}`).join(" ")} | per-set ${[...perSet].map(([s, c]) => `${s}:${c}`).join(" ")} | img누락 ${imgNull}/${locTot}`);

  // supertype + 필드 커버리지
  const st = new Map<string, number>();
  const cov = { types: 0, hp: 0, attacks: 0, abilities: 0, subtypes: 0, illustrator: 0, rarityId: 0, dex: 0, nameKo: 0, regMark: 0, flavor: 0 };
  let pokeN = 0;
  for (const lc of lcs) {
    st.set(lc.supertype ?? "null", (st.get(lc.supertype ?? "null") ?? 0) + 1);
    const poke = isPokemonSupertype(lc.supertype);
    if (poke) pokeN++;
    if (lc.types.length) cov.types++;
    if (lc.hp != null) cov.hp++;
    if (lc.attacks) cov.attacks++;
    if (lc.abilities) cov.abilities++;
    if (lc.subtypes.length) cov.subtypes++;
    if (lc.illustrator) cov.illustrator++;
    if (lc.rarityId) cov.rarityId++;
    if (lc.pokedexNumbers.length) cov.dex++;
    if (lc.nameKo) cov.nameKo++;
    if (lc.regulationMark) cov.regMark++;
    if (lc.flavorText) cov.flavor++;
  }
  console.log(`supertype: ${JSON.stringify(Object.fromEntries(st))}`);
  console.log(`coverage: types ${pc(cov.types)} hp ${pc(cov.hp)} attacks ${pc(cov.attacks)} abilities ${pc(cov.abilities)} subtypes ${pc(cov.subtypes)} illust ${pc(cov.illustrator)} rarity ${pc(cov.rarityId)} dex ${pc(cov.dex)} nameKo ${pc(cov.nameKo)} regMark ${pc(cov.regMark)} flavor ${pc(cov.flavor)}`);
  const typesPokePct = pokeN ? cov.types / pokeN : 1; // 포켓몬 대비 types

  // attacks 구조 (jammed 탐지)
  let aArr = 0, aJam = 0;
  for (const lc of lcs) { const a: any = lc.attacks; if (!a) continue; if (Array.isArray(a) && a[0] && typeof a[0] === "object" && "name" in a[0]) { aArr++; if (String(a[0].name ?? "").length > 45) aJam++; } else aJam++; }
  console.log(`attacks구조: 정상배열 ${aArr} · 의심(jammed) ${aJam}`);

  // 이름 누수 (JP=ASCII / KR=ASCII)
  let jpAscii = 0, krAscii = 0; const jpLeak: string[] = [], krLeak: string[] = [];
  for (const lc of lcs) for (const l of lc.locales) {
    if (l.region === "JP" && isAscii(l.name) && !hasKana(l.name)) { jpAscii++; if (jpLeak.length < 8) jpLeak.push(`#${l.numberInt} ${l.name}`); }
    if (l.region === "KR" && isAscii(l.name) && !hasHangul(l.name)) { krAscii++; if (krLeak.length < 8) krLeak.push(`#${l.numberInt} ${l.name}`); }
  }
  if (jpAscii) console.log(`⚠ JP 이름 영문누수 ${jpAscii}: ${jpLeak.join(", ")}`);
  if (krAscii) console.log(`⚠ KR 이름 영문누수 ${krAscii}: ${krLeak.join(", ")}`);

  // KR↔JP 번호 미러
  const jpNums = new Set<number>(), krNums = new Set<number>();
  for (const lc of lcs) for (const l of lc.locales) { if (l.region === "JP" && l.numberInt != null) jpNums.add(l.numberInt); if (l.region === "KR" && l.numberInt != null) krNums.add(l.numberInt); }
  if (krNums.size) { let both = 0; for (const k of krNums) if (jpNums.has(k)) both++; console.log(`KR↔JP 미러: KR ${krNums.size} 중 JP일치 ${both} · KR-only ${krNums.size - both}`); }

  // PokeAPI dex 교차 (포켓몬): ko 또는 ja 이름 → dex 가 LC.pokedexNumbers 와 일치?
  let dchk = 0, dbad = 0; const dbadEx: string[] = [];
  for (const lc of lcs) {
    if (!isPokemonSupertype(lc.supertype) || !lc.pokedexNumbers.length) continue;
    const kr = lc.locales.find((l) => l.region === "KR"), jp = lc.locales.find((l) => l.region === "JP");
    const nm = kr?.name, lang: "ko" | "ja" = kr ? "ko" : "ja", src = kr ?? jp;
    if (!src) continue; dchk++;
    const d = resolveCardDexes(src.name, kr ? "ko" : "ja");
    if (d.length && !d.some((x) => lc.pokedexNumbers.includes(x))) { dbad++; if (dbadEx.length < 8) dbadEx.push(`#${src.numberInt} ${src.name} →[${d}]⊅LC[${lc.pokedexNumbers}]`); }
  }
  console.log(`PokeAPI dex 교차(포켓몬 ${dchk}): 불일치 ${dbad}${dbadEx.length ? " — " + dbadEx.join(" / ") : ""}`);

  // 점수: 완전성(포켓몬필드) 40 + 구조/정합 30 + 식별 30
  const completeness = (typesPokePct + cov.hp / n + cov.attacks / n + cov.illustrator / n + cov.rarityId / n + cov.dex / n) / 6;
  const structure = (aJam === 0 ? 1 : Math.max(0, 1 - aJam / n)) * 0.5 + (jpAscii + krAscii === 0 ? 1 : Math.max(0, 1 - (jpAscii + krAscii) / locTot)) * 0.5;
  const identity = dchk ? 1 - dbad / dchk : 1;
  const score = Math.round((completeness * 40 + structure * 30 + identity * 30));
  console.log(`SCORE: ${score}  (완전성 ${(completeness * 100).toFixed(0)}/구조 ${(structure * 100).toFixed(0)}/식별 ${(identity * 100).toFixed(0)})`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
