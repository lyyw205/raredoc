/**
 * EN단독(영판전용) orphan LC 게임메타 보강 — merge-en-identity 가 만든 orphan LC 는
 * supertype/subtypes/dex/illustrator 만 있고 attacks/types/hp/abilities 가 비어있음.
 * EN locale 의 setId(=pokemontcg.io 코드)+number 로 pokemontcg.io 카드 조회해 **null 필드만** 채움(additive).
 *
 * 매핑: attacks[{name,cost,damage,text}]→{cost,name,text,damage} · abilities[{name,text,type}] 직접
 *       types · hp(parseInt) · retreatCost(convertedRetreatCost) · weakness/resistance(type+value)
 *       regulationMark · flavorText · supertype(null만) · subtypes(빈것만)
 * 캐시: data/en-ptcg/<setId>.json
 *
 * 실행: npx tsx scripts/fill-en-orphan-meta.ts [gid] [--apply]   (gid 생략=전체 EN-only orphan)
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { POKE, isPokemonSupertype } from "./lib/supertype";
const CACHE = "data/en-ptcg";

async function fetchSet(sid: string): Promise<any[]> {
  const code = sid.replace(/^en-tcg-/, ""); // DB setId(en-tcg-swsh8) → pokemontcg.io 코드(swsh8)
  const f = `${CACHE}/${code}.json`;
  if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8"));
  const out: any[] = [];
  for (let pg = 1; pg <= 6; pg++) {
    const r = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${code}&pageSize=250&page=${pg}`);
    if (!r.ok) break;
    const j = await r.json();
    if (!j.data?.length) break;
    out.push(...j.data);
    if (j.data.length < 250) break;
  }
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(f, JSON.stringify(out));
  return out;
}

const numKey = (n: string) => String(n).replace(/^0+(?=\d)/, "");
const mapAttacks = (a: any[]) => (a ?? []).map((x) => ({ cost: x.cost ?? [], name: x.name, text: x.text ?? "", damage: x.damage || null }));
const mapAbilities = (a: any[]) => (a ?? []).map((x) => ({ name: x.name, text: x.text ?? "", type: x.type ?? "Ability" }));
const wr = (a: any[]) => (a?.[0] ? `${a[0].type}${a[0].value}` : null);

async function main() {
  const args = process.argv.slice(2);
  const APPLY = args.includes("--apply");
  const gid = args.find((a) => !a.startsWith("--"));

  // EN-only LC (모든 locale 이 EN) 로드
  const where: any = { locales: { every: { region: "EN" }, some: {} } };
  if (gid) where.cardPackId = gid;
  const lcs = await prisma.logicalCard.findMany({
    where,
    select: { id: true, supertype: true, subtypes: true, types: true, hp: true, attacks: true, abilities: true,
      retreatCost: true, weakness: true, resistance: true, regulationMark: true, flavorText: true,
      locales: { select: { region: true, setId: true, number: true, numberInt: true } } },
  });
  // 채울 게 있는 LC 만(attacks null Pokémon, 또는 supertype null, 또는 types 빈 Pokémon)
  const isEmpty = (a: any) => !a || (Array.isArray(a) && a.length === 0);
  const need = lcs.filter((lc) => {
    const poke = isPokemonSupertype(lc.supertype);
    return lc.supertype == null || (poke && (isEmpty(lc.attacks) || lc.types.length === 0 || lc.hp == null)) || isEmpty(lc.abilities) && false;
  });
  console.log(`EN-only LC ${lcs.length} · 보강대상 ${need.length}${gid ? ` (${gid})` : " (전체)"}`);

  // setId 별 그룹
  const bySet = new Map<string, typeof need>();
  for (const lc of need) {
    const en = lc.locales[0]; if (!en) continue;
    (bySet.get(en.setId) ?? bySet.set(en.setId, []).get(en.setId))!.push(lc);
  }
  console.log(`관련 EN set ${bySet.size}개`);

  let fill = 0, noCard = 0; const fields = { attacks: 0, abilities: 0, types: 0, hp: 0, retreat: 0, weak: 0, resist: 0, regMark: 0, flavor: 0, supertype: 0, subtypes: 0 };
  const updates: { id: string; data: any }[] = [];
  for (const [sid, group] of bySet) {
    const cards = await fetchSet(sid);
    const byNum = new Map(cards.map((c: any) => [numKey(String(c.number)), c]));
    for (const lc of group) {
      const en = lc.locales[0];
      const c = byNum.get(numKey(en.number ?? String(en.numberInt ?? "")));
      if (!c) { noCard++; continue; }
      const d: any = {};
      if (lc.supertype == null && c.supertype) { d.supertype = c.supertype; fields.supertype++; }
      if (lc.subtypes.length === 0 && c.subtypes?.length) { d.subtypes = c.subtypes; fields.subtypes++; }
      const poke = isPokemonSupertype(c.supertype);
      if (poke) {
        if (isEmpty(lc.attacks) && c.attacks?.length) { d.attacks = mapAttacks(c.attacks); fields.attacks++; }
        if (isEmpty(lc.abilities) && c.abilities?.length) { d.abilities = mapAbilities(c.abilities); fields.abilities++; }
        if (lc.types.length === 0 && c.types?.length) { d.types = c.types; fields.types++; }
        if (lc.hp == null && c.hp) { d.hp = parseInt(c.hp, 10) || null; if (d.hp) fields.hp++; }
        if (lc.retreatCost == null && c.convertedRetreatCost != null) { d.retreatCost = c.convertedRetreatCost; fields.retreat++; }
        if (lc.weakness == null && c.weaknesses?.length) { d.weakness = wr(c.weaknesses); fields.weak++; }
        if (lc.resistance == null && c.resistances?.length) { d.resistance = wr(c.resistances); fields.resist++; }
        if (lc.regulationMark == null && c.regulationMark) { d.regulationMark = c.regulationMark; fields.regMark++; }
      }
      if (lc.flavorText == null && c.flavorText) { d.flavorText = c.flavorText; fields.flavor++; }
      if (Object.keys(d).length) { updates.push({ id: lc.id, data: d }); fill++; }
    }
  }
  console.log(`보강 ${fill} · 카드없음 ${noCard} | 필드: ${JSON.stringify(fields)} ${APPLY ? "★APPLY" : "(dry)"}`);
  if (APPLY) {
    let n = 0;
    for (const u of updates) { await prisma.logicalCard.update({ where: { id: u.id }, data: u.data }); if (++n % 500 === 0) console.log(`  …${n}/${updates.length}`); }
    console.log(`★적용 ${updates.length}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
