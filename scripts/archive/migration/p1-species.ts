// ── P1: Species 시드 + Card↔Species N:M 조인 채우기 (additive) ──────────
// data/pokeapi CSV(권위) → Species(1..1025). Card.pokedexNumbers → 조인.
// 기본 dry-run. 적용 --apply. 멱등(skipDuplicates). 실행: npx tsx scripts/migration/p1-species.ts [--apply]
import "dotenv/config";
import fs from "fs";
import { prisma } from "../../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const cap = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : s;
const splitCsv = (p: string) => fs.readFileSync(p, "utf8").split("\n").slice(1).filter((l) => l.trim());

async function main() {
  // 1) names: id → {ja, ko, en, genusKo}
  const names = new Map<number, { ja?: string; ko?: string; en?: string; genusKo?: string }>();
  for (const line of splitCsv("data/pokeapi/pokemon_species_names.csv")) {
    const c = line.split(",");
    const id = parseInt(c[0]); const lang = parseInt(c[1]); const name = (c[2] || "").trim(); const genus = (c[3] || "").trim();
    if (!id) continue;
    const e = names.get(id) ?? names.set(id, {}).get(id)!;
    if (lang === 1) e.ja = name;
    else if (lang === 3) { e.ko = name; e.genusKo = genus || undefined; }
    else if (lang === 9) e.en = name;
  }

  // 2) species 메타
  const speciesRows: any[] = [];
  for (const line of splitCsv("data/pokeapi/pokemon_species.csv")) {
    const c = line.split(",");
    const id = parseInt(c[0]); if (!id) continue;
    const nm = names.get(id) || {};
    speciesRows.push({
      id, nameEn: nm.en || cap(c[1] || String(id)), nameJa: nm.ja || null, nameKo: nm.ko || null,
      genusKo: nm.genusKo || null,
      generation: c[2] ? parseInt(c[2]) : null,
      evolvesFromId: c[3] ? parseInt(c[3]) : null,
      evolutionChainId: c[4] ? parseInt(c[4]) : null,
    });
  }
  const maxId = Math.max(...speciesRows.map((s) => s.id));
  console.log(`【P1 Species】${APPLY ? " ★APPLY" : " (dry-run)"}`);
  console.log(`  Species 시드 대상: ${speciesRows.length}종 (id 1..${maxId})`);
  console.log(`  샘플: ${speciesRows.slice(0, 3).map((s) => `#${s.id} ${s.nameKo}/${s.nameJa}/${s.nameEn}`).join(" · ")}`);
  const koMiss = speciesRows.filter((s) => !s.nameKo).length;
  console.log(`  KR명 없는 종: ${koMiss} · JP명 없는 종: ${speciesRows.filter((s) => !s.nameJa).length}`);

  // 3) 조인 대상: 포켓몬 LC의 dex(1..maxId)
  const lcs = await prisma.card.findMany({
    where: { supertype: "Pokémon" }, select: { id: true, pokedexNumbers: true },
  });
  const validIds = new Set(speciesRows.map((s) => s.id));
  const joinRows: { cardId: string; speciesId: number }[] = [];
  let lcLinked = 0, lcNoValid = 0, tagTeam = 0;
  for (const lc of lcs) {
    const dn = [...new Set((lc.pokedexNumbers || []).filter((d) => validIds.has(d)))];
    if (!dn.length) { lcNoValid++; continue; }
    if (dn.length >= 2) tagTeam++;
    lcLinked++;
    for (const d of dn) joinRows.push({ cardId: lc.id, speciesId: d });
  }
  console.log(`  포켓몬 LC ${lcs.length} → 연결 ${lcLinked}(태그팀 ${tagTeam}) · 유효dex없음 ${lcNoValid}`);
  console.log(`  조인 행 ${joinRows.length}개 생성 예정`);

  if (!APPLY) { console.log("\n  (dry-run — 변경 0. --apply 로 적용)"); await prisma.$disconnect(); return; }

  // 적용: Species
  let s = 0;
  for (let i = 0; i < speciesRows.length; i += 1000) {
    const r = await prisma.species.createMany({ data: speciesRows.slice(i, i + 1000), skipDuplicates: true });
    s += r.count;
  }
  console.log(`\n  ✅ Species 삽입 ${s}`);
  // 적용: 조인
  let j = 0;
  for (let i = 0; i < joinRows.length; i += 5000) {
    const r = await prisma.cardSpecies.createMany({ data: joinRows.slice(i, i + 5000), skipDuplicates: true });
    j += r.count;
  }
  console.log(`  ✅ 조인 삽입 ${j}`);

  // 검증
  const spCount = await prisma.species.count();
  const joinCount = await prisma.cardSpecies.count();
  const linkedLC = (await prisma.cardSpecies.findMany({ select: { cardId: true }, distinct: ["cardId"] })).length;
  console.log(`  검증 — Species ${spCount} · 조인 ${joinCount} · 연결된 LC ${linkedLC}`);
  // 태그팀 표본 (raw)
  const tt: any[] = await prisma.$queryRawUnsafe(`SELECT "logicalCardId" lc, count(*)::int c FROM "LogicalCardSpecies" GROUP BY "logicalCardId" HAVING count(*)>1 LIMIT 3`);
  console.log(`  태그팀(복수 종) 표본: ${tt.map((t) => `${String(t.lc).slice(0, 18)}×${t.c}`).join(", ")}`);
  // 피카츄(#25) 연결 카드 수
  const pk: any[] = await prisma.$queryRawUnsafe(`SELECT s."nameKo" ko, s."nameEn" en, count(*)::int c FROM "Species" s JOIN "LogicalCardSpecies" l ON l."speciesId"=s.id WHERE s.id=25 GROUP BY s."nameKo", s."nameEn"`);
  if (pk[0]) console.log(`  종 검증 — 피카츄(#25) ${pk[0].ko}/${pk[0].en} 연결 카드 ${pk[0].c}장`);

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
