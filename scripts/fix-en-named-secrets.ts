/**
 * EN소스 레코드오염 시크릿 복구 — JP locale 이름이 영어("Ampharos GX - 059/052")이고
 * supertype/dex/types/subtypes 가 비어버린 시크릿(UR/골드 알트아트). 같은 그룹의 깨끗한 base 에서 복구.
 *   매칭(자동): ① stripped EN이름 == 그룹내 clean LC 의 EN locale 이름  ② (포켓몬 GX) species→dex == clean base dex + GX subtype
 *   복구: LC.supertype/types/attacks/subtypes/pokedexNumbers ← base, JP/KR locale.name ← base 의 JP/KR locale.name.
 * 실행: npx tsx scripts/fix-en-named-secrets.ts <gid> [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { resolveCardDexes } from "./lib/pokeapi-names";

async function main() {
  const gid = process.argv[2], APPLY = process.argv.includes("--apply");
  if (!gid) { console.error("usage: <gid> [--apply]"); process.exit(1); }
  const all = await prisma.logicalCard.findMany({
    where: { cardPackId: gid },
    select: { id: true, supertype: true, subtypes: true, types: true, attacks: true, pokedexNumbers: true,
      locales: { select: { id: true, region: true, name: true } } },
  });
  // clean base 인덱스
  const byEn = new Map<string, typeof all[0]>(), byDexGX = new Map<number, typeof all[0]>();
  const nameOf = (lc: typeof all[0], r: string) => lc.locales.find((l) => l.region === r)?.name;
  for (const lc of all) {
    if (lc.supertype == null) continue;
    const en = nameOf(lc, "EN"); if (en && !byEn.has(en)) byEn.set(en, lc);
    if (["Pokémon", "Pokemon"].includes(lc.supertype) && lc.subtypes.includes("GX") && lc.pokedexNumbers.length)
      for (const d of lc.pokedexNumbers) if (!byDexGX.has(d)) byDexGX.set(d, lc);
  }
  const broken = all.filter((lc) => lc.supertype == null && lc.locales.some((l) => l.region === "JP"));
  let fix = 0, noMatch = 0; const lcUpd: any[] = [], locUpd: any[] = []; const samp: string[] = [];
  for (const lc of broken) {
    const jpName = nameOf(lc, "JP") ?? "";
    const stripped = jpName.replace(/\s*-\s*\d+\/\d+\s*$/, "").trim();
    let base = byEn.get(stripped);
    if (!base) { const m = stripped.match(/^(.+?)\s*GX$/); if (m) { const d = resolveCardDexes(m[1].trim(), "en"); for (const x of d) if (byDexGX.has(x)) { base = byDexGX.get(x); break; } } }
    if (!base) { noMatch++; samp.push(`✗ "${stripped}" 매칭실패`); continue; }
    fix++;
    lcUpd.push({ id: lc.id, data: { supertype: base.supertype, subtypes: base.subtypes, types: base.types, attacks: base.attacks as any, pokedexNumbers: base.pokedexNumbers } });
    for (const r of ["JP", "KR"]) {
      const loc = lc.locales.find((l) => l.region === r), bn = nameOf(base, r);
      if (loc && bn) locUpd.push({ id: loc.id, name: bn });
    }
    if (samp.length < 12) samp.push(`✔ "${stripped}" → ${nameOf(base, "JP")} [${base.supertype}/${base.types.join(",")}]`);
  }
  console.log(`${gid}: 깊은오염 ${broken.length} · 복구 ${fix} · 매칭실패 ${noMatch} ${APPLY ? "★APPLY" : "(dry)"}`);
  samp.forEach((s) => console.log("  " + s));
  if (APPLY) {
    for (const u of lcUpd) await prisma.logicalCard.update({ where: { id: u.id }, data: u.data });
    for (const u of locUpd) await prisma.regionCard.update({ where: { id: u.id }, data: { name: u.name } });
    console.log(`★복구: LC ${lcUpd.length} · locale이름 ${locUpd.length}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
