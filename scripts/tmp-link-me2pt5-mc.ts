// me2pt5(Ascended Heroes) orphan ↔ jp-tcg-MC(스타트덱100) 신규분 매칭
//   포켓몬: dex+일러 양방향 유일쌍(ADV4 신기법) · 트레이너: TR_JP2EN 사전 + n:n 구간 zip(본문1~742/시크릿743~766)
//   사용: npx tsx scripts/tmp-link-me2pt5-mc.ts [--apply]
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { TR_JP2EN } from "./lib/trainer-names-sv";

const POKE = ["Pokémon", "Pokemon"];
const APPLY = process.argv.includes("--apply");

async function main() {
  // 1) MC: EN짝 없는 JP locale
  const mcAll = await prisma.cardLocale.findMany({
    where: { setId: "jp-tcg-MC" },
    select: { id: true, number: true, name: true, logicalCardId: true,
      logicalCard: { select: { supertype: true, pokedexNumbers: true, illustrator: true, locales: { where: { region: "EN" }, select: { id: true } } } } },
  });
  const mc = mcAll.filter(m => !m.logicalCard?.locales.length);

  // 2) me2pt5 orphan
  const en = await prisma.cardLocale.findMany({
    where: { setId: "en-tcg-me2pt5", logicalCardId: { startsWith: "lc-orphan-en-tcg-me2pt5-" } },
    select: { id: true, number: true, name: true, logicalCardId: true,
      logicalCard: { select: { supertype: true, pokedexNumbers: true, illustrator: true } } },
  });

  const pairs: { enId: string; enName: string; lcid: string; jpNum: string; jpName: string; via: string }[] = [];
  const usedJp = new Set<string>();
  const usedEn = new Set<string>();

  // 3) 포켓몬: dex|일러 양방향 유일쌍
  const key = (dex: number | undefined, il: string | null | undefined) => `${dex}|${(il ?? "").trim().toLowerCase()}`;
  const jpByKey = new Map<string, typeof mc>();
  for (const m of mc) {
    if (!POKE.includes(m.logicalCard?.supertype ?? "")) continue;
    const d = m.logicalCard?.pokedexNumbers?.[0]; if (d == null || !m.logicalCard?.illustrator) continue;
    const k = key(d, m.logicalCard.illustrator);
    (jpByKey.get(k) ?? jpByKey.set(k, []).get(k))!.push(m);
  }
  const enByKey = new Map<string, typeof en>();
  for (const e of en) {
    if (!POKE.includes(e.logicalCard?.supertype ?? "")) continue;
    const d = e.logicalCard?.pokedexNumbers?.[0]; if (d == null || !e.logicalCard?.illustrator) continue;
    const k = key(d, e.logicalCard.illustrator);
    (enByKey.get(k) ?? enByKey.set(k, []).get(k))!.push(e);
  }
  let multi = 0;
  for (const [k, el] of enByKey) {
    const jl = jpByKey.get(k) ?? [];
    if (el.length === 1 && jl.length === 1) {
      pairs.push({ enId: el[0].id, enName: el[0].name, lcid: jl[0].logicalCardId!, jpNum: jl[0].number, jpName: jl[0].name, via: "dex+일러" });
      usedJp.add(jl[0].id); usedEn.add(el[0].id);
    } else if (jl.length) { multi++; console.log(`  ⚠ 다후보 보류 [${k}]: EN ${el.map(e=>"#"+e.number).join(",")} ↔ JP ${jl.map(j=>"#"+j.number).join(",")}`); }
  }

  // 4) 트레이너/에너지: 사전 변환 일치 + 구간 zip (MC 본문 1~742 / 시크릿 743~766 ↔ EN 레귤러 ~252 / UR 253+)
  const enTr = en.filter(e => !POKE.includes(e.logicalCard?.supertype ?? "") && !usedEn.has(e.id));
  const jpTr = mc.filter(m => !POKE.includes(m.logicalCard?.supertype ?? "") && !usedJp.has(m.id));
  const enByName = new Map<string, typeof enTr>();
  for (const e of enTr) (enByName.get(e.name) ?? enByName.set(e.name, []).get(e.name))!.push(e);
  const jpByEnName = new Map<string, typeof jpTr>();
  for (const j of jpTr) { const t = TR_JP2EN[j.name]; if (!t) continue; (jpByEnName.get(t) ?? jpByEnName.set(t, []).get(t))!.push(j); }
  for (const [name, el] of enByName) {
    const jl = (jpByEnName.get(name) ?? []).slice().sort((a, b) => parseInt(a.number) - parseInt(b.number));
    const es = el.slice().sort((a, b) => parseInt(a.number) - parseInt(b.number));
    if (!jl.length) continue;
    const n = Math.min(es.length, jl.length);
    for (let i = 0; i < n; i++) {
      pairs.push({ enId: es[i].id, enName: name, lcid: jl[i].logicalCardId!, jpNum: jl[i].number, jpName: jl[i].name, via: es.length > 1 ? "사전+구간zip" : "사전" });
      usedEn.add(es[i].id); usedJp.add(jl[i].id);
    }
  }

  // 5) 출력·적용
  console.log(`\n쌍 ${pairs.length} (포켓몬 다후보 보류 ${multi})`);
  for (const p of pairs.sort((a, b) => parseInt(a.enId.split("-").pop()!) - parseInt(b.enId.split("-").pop()!)))
    console.log(`  EN#${p.enId.split("-").pop()} ${p.enName} → MC#${p.jpNum} ${p.jpName} [${p.via}]`);
  const remain = en.filter(e => !usedEn.has(e.id));
  console.log(`\n잔여 orphan ${remain.length}:`);
  for (const r of remain) console.log(`  EN#${r.number} ${r.name}`);

  if (APPLY) {
    for (const p of pairs) {
      const cur = await prisma.cardLocale.findUnique({ where: { id: p.enId }, select: { logicalCardId: true } });
      await prisma.cardLocale.update({ where: { id: p.enId }, data: { logicalCardId: p.lcid } });
      if (cur?.logicalCardId?.startsWith("lc-orphan-en-tcg-me2pt5")) {
        const left = await prisma.cardLocale.count({ where: { logicalCardId: cur.logicalCardId } });
        if (left === 0) await prisma.logicalCard.delete({ where: { id: cur.logicalCardId } });
      }
    }
    console.log(`\n★적용 ${pairs.length}`);
  } else console.log("\n(dry — --apply 로 적용)");
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
