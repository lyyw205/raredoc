/**
 * LogicalCard 메타 이전 — 합본(enrich 완료) 세트 → 분할 세트.
 *   분할 JP 세트(jp-tcg-M1L 등)가 이미지·이름만 있는 스켈레톤일 때, 검증 완료된 합본
 *   (jp-mega-brave-symphonia)의 supertype·dex·illustrator·rarity·nameKo·hp·types 를
 *   (번호+이름) 매칭으로 분할 LC 에 복사. 분할 LC 의 빈 필드만 채움(기존값 보존, --overwrite 시 덮어씀).
 *   subtypes 는 합본도 비어있으면 제외 → 이후 fill-jp-meta-tcgdex 로 보강.
 *
 * 실행: npx tsx scripts/transfer-lc-meta.ts --from=jp-mega-brave-symphonia --to=jp-tcg-M1L [--apply] [--overwrite]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const FIELDS = ["supertype", "pokedexNumbers", "illustrator", "rarityId", "nameKo", "hp", "types", "subtypes"] as const;

async function main() {
  const APPLY = process.argv.includes("--apply");
  const OW = process.argv.includes("--overwrite");
  const from = process.argv.find((a) => a.startsWith("--from="))?.slice("--from=".length);
  const to = process.argv.find((a) => a.startsWith("--to="))?.slice("--to=".length);
  if (!from || !to) { console.error("usage: --from=<combinedSet> --to=<splitSet> [--apply] [--overwrite]"); process.exit(1); }

  const sel = { number: true, name: true, logicalCardId: true,
    logicalCard: { select: { supertype: true, pokedexNumbers: true, illustrator: true, rarityId: true, nameKo: true, hp: true, types: true, subtypes: true } } } as const;
  const src = await prisma.cardLocale.findMany({ where: { setId: from }, select: sel });
  const smap = new Map<string, any>(); for (const c of src) smap.set(`${c.number}|${c.name}`, c.logicalCard);
  const dst = await prisma.cardLocale.findMany({ where: { setId: to }, orderBy: { numberInt: "asc" }, select: sel });

  let updated = 0, miss = 0; const sample: string[] = []; const missList: string[] = [];
  const empty = (v: any) => v == null || (Array.isArray(v) && v.length === 0);
  for (const d of dst) {
    const s = smap.get(`${d.number}|${d.name}`);
    if (!s) { miss++; if (missList.length < 8) missList.push(`#${d.number} ${d.name}`); continue; }
    const data: Record<string, unknown> = {};
    for (const f of FIELDS) {
      const sv = s[f]; if (empty(sv)) continue;                 // 소스가 비었으면 스킵
      if (!OW && !empty(d.logicalCard[f])) continue;            // 대상이 이미 있으면 보존
      data[f] = sv;
    }
    if (Object.keys(data).length) {
      if (sample.length < 4) sample.push(`#${d.number} ${d.name} ${Object.keys(data).join(",")}`);
      if (APPLY) await prisma.logicalCard.update({ where: { id: d.logicalCardId }, data });
      updated++;
    }
  }
  console.log(`■ ${from} → ${to}: 대상 ${dst.length} | 갱신 ${updated} · 조인미스 ${miss} ${APPLY ? "★적용" : "(dry)"}${OW ? " [OW]" : ""}`);
  if (sample.length) console.log("  예:", sample.join(" | "));
  if (missList.length) console.log("  미스:", missList.join(", "));
  await prisma.$disconnect();
  if (!APPLY) console.log("(dry) 적용: --apply");
}
main().catch((e) => { console.error(e); process.exit(1); });
