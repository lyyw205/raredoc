/**
 * 미매칭 트레이너 JP명→EN명 후보 도출 — illustrator(언어중립 정답키) 1:1 페어링을 증거로.
 * 각 그룹에서 [미매칭 JP트레이너] 와 [EN-only orphan 트레이너] 를 illustrator 로 매칭:
 *   같은 illustrator 에 미매칭 JP 1장 + EN 1장 만 있으면 → (JP명→EN명) 후보(고신뢰).
 *   여러 그룹에서 같은 JP명이 **항상 같은 EN명**으로 나오면 일관성↑ → 사전화 안전.
 * 출력: 후보 사전(JSON) + 일관성/빈도. 적용 안 함(읽기전용 도출).
 *
 * 실행: npx tsx scripts/derive-trainer-pairs.ts [--out <path>]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { writeFileSync } from "node:fs";

async function main() {
  const outI = process.argv.indexOf("--out");
  const outPath = outI >= 0 ? process.argv[outI + 1] : null;

  const groups = await prisma.setGroup.findMany({ select: { id: true } });
  // jpName → Map(enName → count)  (일관성 추적)
  const cand = new Map<string, Map<string, number>>();
  let pairs = 0, ambig = 0;
  for (const g of groups) {
    const hasEn = await prisma.cardLocale.count({ where: { logicalCard: { setGroupId: g.id }, region: "EN" } });
    if (!hasEn) continue;
    const lcs = await prisma.logicalCard.findMany({
      where: { setGroupId: g.id, supertype: "Trainer" },
      select: { illustrator: true, subtypes: true, locales: { select: { region: true, name: true } } },
    });
    const jpOnly = lcs.filter((l) => l.locales.some((x) => x.region === "JP") && !l.locales.some((x) => x.region === "EN") && l.illustrator);
    const enOnly = lcs.filter((l) => l.locales.length && l.locales.every((x) => x.region === "EN") && l.illustrator);
    // illustrator 별 카운트
    const jpByIll = new Map<string, typeof jpOnly>(), enByIll = new Map<string, typeof enOnly>();
    for (const l of jpOnly) (jpByIll.get(l.illustrator!) ?? jpByIll.set(l.illustrator!, []).get(l.illustrator!))!.push(l);
    for (const l of enOnly) (enByIll.get(l.illustrator!) ?? enByIll.set(l.illustrator!, []).get(l.illustrator!))!.push(l);
    for (const [ill, js] of jpByIll) {
      const es = enByIll.get(ill);
      if (!es) continue;
      if (js.length === 1 && es.length === 1) {
        // 1:1 + 같은 trainerType(subtypes) 면 채택
        const jSub = [...js[0].subtypes].sort().join(","), eSub = [...es[0].subtypes].sort().join(",");
        if (jSub && eSub && jSub !== eSub) { ambig++; continue; }
        const jn = js[0].locales.find((x) => x.region === "JP")!.name;
        const en = es[0].locales[0].name;
        (cand.get(jn) ?? cand.set(jn, new Map()).get(jn))!.set(en, ((cand.get(jn)!.get(en)) ?? 0) + 1);
        pairs++;
      } else ambig++;
    }
  }
  // 일관성: 한 JP명이 단일 EN명으로만 나오면 확정, 여러개면 충돌
  const confirmed: Record<string, string> = {}; const conflict: string[] = [];
  for (const [jn, ens] of cand) {
    if (ens.size === 1) confirmed[jn] = [...ens.keys()][0];
    else conflict.push(`${jn} → {${[...ens].map(([e, c]) => `${e}:${c}`).join(", ")}}`);
  }
  console.log(`illustrator 1:1 페어 ${pairs} · 모호 ${ambig}`);
  console.log(`확정 후보(일관) ${Object.keys(confirmed).length} · 충돌 ${conflict.length}`);
  console.log("─ 확정 후보 샘플 ─");
  for (const [j, e] of Object.entries(confirmed).slice(0, 30)) console.log(`  "${j}": "${e}",`);
  if (conflict.length) { console.log("─ 충돌(수동확인) ─"); conflict.slice(0, 15).forEach((c) => console.log(`  ${c}`)); }
  if (outPath) { writeFileSync(outPath, JSON.stringify(confirmed, null, 2)); console.log(`\n→ ${outPath} (${Object.keys(confirmed).length})`); }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
