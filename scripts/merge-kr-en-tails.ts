/**
 * 그룹 내 KR단독 LC ↔ EN단독 LC 통합 — JP 미발매 카드의 "영판·한국판 전용" 단일 LC 화.
 * (apply-kr --keep-unmatched 가 만든 KR tail 과 merge-en-identity 의 EN orphan 이 같은 카드일 때.)
 * 매칭 규칙(언어중립 신호만, 추측 금지):
 *   1) 포켓몬: dex 일치 + 메가여부 일치(KR "M"접두 ↔ EN subtypes MEGA)
 *   2) 소울링크/스피릿링크: 양측 종명→dex 해석 일치 ("{종} 소울링크" ↔ "{Species} Spirit Link")
 *   3) 기본에너지: "기본 X 에너지" ↔ "X Energy" 타입 맵
 *   4) 트레이너: ko→ja(TR_JA2KO 역) → ja→EN(시대 사전) 체인 일치
 * 통합: KR locale 을 EN LC 로 이동(+nameKo, 에너지 supertype 보강) → 빈 KR LC 삭제(참조 0 확인).
 *
 * 실행: npx tsx scripts/merge-kr-en-tails.ts <setGroupId> [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { resolveCardDexes } from "./lib/pokeapi-names";
import { TR_JA2KO } from "./lib/trainer-names-jako";
import { TR_JP2EN as TR_XY } from "./lib/trainer-names-xy";
import { TR_JP2EN as TR_SM } from "./lib/trainer-names-sm";
import { TR_JP2EN as TR_SWSH } from "./lib/trainer-names-swsh";
import { TR_JP2EN as TR_SV } from "./lib/trainer-names-sv";
import { TR_JP2EN as TR_BW } from "./lib/trainer-names-bw";

const KO_E: Record<string, string> = { "풀": "Grass", "불꽃": "Fire", "물": "Water", "번개": "Lightning", "초": "Psychic", "격투": "Fighting", "악": "Darkness", "강철": "Metal", "페어리": "Fairy", "무색": "Colorless" };
// ko명 → EN명 (트레이너 체인: ko→ja→en)
const KO2JA = new Map(Object.entries(TR_JA2KO).map(([ja, ko]) => [ko, ja]));
const JA2EN: Record<string, string> = { ...TR_SV, ...TR_SM, ...TR_SWSH, ...TR_XY, ...TR_BW };

async function main() {
  const gid = process.argv[2], APPLY = process.argv.includes("--apply");
  if (!gid) { console.error("usage: <setGroupId> [--apply]"); process.exit(1); }
  const lcs = await prisma.logicalCard.findMany({
    where: { setGroupId: gid },
    select: { id: true, supertype: true, subtypes: true, pokedexNumbers: true, nameKo: true,
      locales: { select: { id: true, region: true, name: true, number: true } },
      _count: { select: { collectionItems: true, trades: true, deckCards: true, tierEntries: true, rulings: true } } },
  });
  const krOnly = lcs.filter((l) => l.locales.length && l.locales.every((x) => x.region === "KR"));
  const enOnly = lcs.filter((l) => l.locales.length && l.locales.every((x) => x.region === "EN"));
  console.log(`■ ${gid}: KR단독 ${krOnly.length} · EN단독 ${enOnly.length}`);
  const linkDex = (s: string, lang: "ko" | "en") => {
    const m = lang === "ko" ? s.match(/^(.+?)\s*소울\s*링크$/) : s.match(/^(.+?) Spirit Link$/);
    if (!m) return null; const d = resolveCardDexes(m[1].trim(), lang); return d.length ? d[0] : null;
  };
  const used = new Set<string>();
  const pairs: { kr: typeof krOnly[0]; en: typeof enOnly[0]; via: string }[] = [];
  for (const k of krOnly) {
    const kn = k.locales[0].name;
    let hit: typeof enOnly[0] | undefined; let via = "";
    // 1) 포켓몬 dex + 메가여부 + EX여부 (일반판·EX판 동dex 공존 모호성 해소 — BW SR tail)
    if (k.supertype === "Pokémon" && k.pokedexNumbers?.length) {
      const mega = /^M(?=[가-힣])/.test(kn);
      const krEx = /\sEX$/.test(kn);
      const cands = enOnly.filter((e) => !used.has(e.id) && e.pokedexNumbers?.[0] === k.pokedexNumbers![0]
        && ((e.subtypes as string[])?.includes("MEGA") === mega)
        && (((e.subtypes as string[])?.includes("EX") || /-EX$/.test(e.locales[0].name)) === krEx));
      if (cands.length === 1) { hit = cands[0]; via = "dex+mega"; }
    }
    // 2) 소울링크
    if (!hit) {
      const kd = linkDex(kn, "ko");
      if (kd != null) { const cands = enOnly.filter((e) => !used.has(e.id) && linkDex(e.locales[0].name, "en") === kd); if (cands.length === 1) { hit = cands[0]; via = "spiritlink-dex"; } }
    }
    // 3) 기본에너지
    if (!hit) {
      const m = kn.match(/^기본\s*(.+?)\s*에너지$/);
      if (m && KO_E[m[1]]) { const en = `${KO_E[m[1]]} Energy`; const cands = enOnly.filter((e) => !used.has(e.id) && e.locales[0].name === en); if (cands.length === 1) { hit = cands[0]; via = "basic-energy"; } }
    }
    // 4) 트레이너 ko→ja→en 체인
    if (!hit) {
      const ja = KO2JA.get(kn); const en = ja ? JA2EN[ja] : null;
      if (en) { const cands = enOnly.filter((e) => !used.has(e.id) && e.locales[0].name === en); if (cands.length === 1) { hit = cands[0]; via = "dict-chain"; } }
    }
    if (hit) { used.add(hit.id); pairs.push({ kr: k, en: hit, via }); }
  }
  for (const p of pairs) console.log(`  ${p.kr.locales[0].name} ↔ ${p.en.locales[0].name} [${p.via}]`);
  const unmatchedKr = krOnly.filter((k) => !pairs.some((p) => p.kr.id === k.id));
  if (unmatchedKr.length) console.log(`  미통합 KR단독 잔존: ${unmatchedKr.map((k) => k.locales[0].name).join(", ")}`);
  if (!APPLY) { console.log(`(dry) 통합 ${pairs.length} — 적용: --apply`); await prisma.$disconnect(); return; }
  let moved = 0;
  for (const p of pairs) {
    const refs = p.kr._count;
    if (refs.collectionItems + refs.trades + refs.deckCards + refs.tierEntries + refs.rulings > 0) { console.log(`  ⚠ 참조있음 skip: ${p.kr.id}`); continue; }
    for (const loc of p.kr.locales) await prisma.cardLocale.update({ where: { id: loc.id }, data: { logicalCardId: p.en.id } });
    const data: any = { nameKo: p.kr.locales[0].name.replace(/\s*-\s*\d+\/\d+$/, "") };
    if (p.via === "basic-energy") { data.supertype = "Energy"; data.subtypes = ["Basic"]; }
    await prisma.logicalCard.update({ where: { id: p.en.id }, data });
    await prisma.logicalCard.delete({ where: { id: p.kr.id } });
    moved++;
  }
  console.log(`★통합 ${moved} (KR locale 이동 + 빈 KR LC 삭제)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
