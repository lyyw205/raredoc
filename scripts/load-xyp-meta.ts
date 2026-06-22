/**
 * XY-P 타입/단계 enrich 적재 — data/collect/jp-xyp-meta.json(Limitless 상세 파싱) → LC 메타 업데이트.
 *   대상: lc-jp-tcg-XYP-NNN (298장 전수, 기존 31 포함). 채우기 전용(파싱된 값만 set, 빈 파싱으로 기존값 안 지움).
 *   건드리는 필드: supertype·subtypes·types·hp 만. illustrator/rarity/name/image/연결/gameCardId 불변(비파괴).
 *   비동결 og-kr-xy-promo. 멱등.
 * Run: npx tsx scripts/load-xyp-meta.ts [--apply]
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const SET_ID = "jp-tcg-XYP", GROUP = "og-kr-xy-promo";
const SRC = "data/collect/jp-xyp-meta.json";

type Meta = { number: string; numberInt: number; name: string; supertype: string|null; subtypes: string[]; types: string[]; hp: number|null };

async function main() {
  const apply = process.argv.includes("--apply");
  assertWritable([GROUP], { allow: hasAllowProtectedFlag(), dryRun: !apply, tool: "load-xyp-meta" });

  const metas: Meta[] = JSON.parse(readFileSync(SRC, "utf8"));
  const existing = new Map(
    (await prisma.card.findMany({ where: { primarySetId: SET_ID }, select: { id: true, supertype: true, subtypes: true, types: true, hp: true } }))
      .map((c) => [c.id, c]),
  );
  // ★공식 우선: pokemon-card.com 공식 카드(illustrator/메타 완비)는 enrich 제외. Limitless 갭채움(limitless 이미지)만 대상.
  const gapIds = new Set(
    (await prisma.regionCard.findMany({
      where: { setId: SET_ID, region: "JP", imageLarge: { contains: "limitlesstcg" } },
      select: { cardId: true },
    })).map((r) => r.cardId),
  );
  console.log(`  enrich 범위: Limitless 갭채움 ${gapIds.size}장만(공식 ${existing.size - gapIds.size}장 제외)`);

  let upSuper=0, upSub=0, upType=0, upHp=0, miss=0;
  const plans: { id: string; data: Record<string, unknown>; label: string }[] = [];
  for (const m of metas) {
    const lcId = `lc-${SET_ID}-${m.number}`;
    const cur = existing.get(lcId);
    if (!cur) { miss++; continue; }
    if (!gapIds.has(lcId)) continue; // 공식 카드 제외(공식 우선)
    const data: Record<string, unknown> = {};
    if (m.supertype && m.supertype !== cur.supertype) { data.supertype = m.supertype; upSuper++; }
    if (m.subtypes.length && JSON.stringify(m.subtypes) !== JSON.stringify(cur.subtypes)) { data.subtypes = m.subtypes; upSub++; }
    if (m.types.length && JSON.stringify(m.types) !== JSON.stringify(cur.types)) { data.types = m.types; upType++; }
    if (m.hp != null && m.hp !== cur.hp) { data.hp = m.hp; upHp++; }
    if (Object.keys(data).length) plans.push({ id: lcId, data, label: `#${m.number} ${m.name} ${m.supertype}/${m.subtypes.join("+")||"-"}/${m.types.join("")||"-"}${m.hp?` HP${m.hp}`:""}` });
  }

  console.log(`${apply ? "[APPLY]" : "[DRY]"} XY-P enrich — meta ${metas.length} · 업데이트 대상 LC ${plans.length} (LC없음 ${miss})`);
  console.log(`  필드 변경: supertype ${upSuper} · subtypes ${upSub} · types ${upType} · hp ${upHp}`);
  console.log(`  샘플:\n${plans.slice(0, 8).map((p) => `    ${p.label}`).join("\n")}`);
  if (!apply) { console.log("\n(dry-run — --apply 로 적용)"); return; }

  let done = 0;
  for (const p of plans) { await prisma.card.update({ where: { id: p.id }, data: p.data }); if (++done % 50 === 0) console.log(`  …${done}/${plans.length}`); }
  console.log(`✅ ${done} LC 업데이트`);

  // 검증
  const after = await prisma.card.findMany({ where: { primarySetId: SET_ID }, select: { subtypes: true, types: true, supertype: true } });
  console.log(`   결과: subtype有 ${after.filter((c)=>c.subtypes.length).length}/${after.length} · type有 ${after.filter((c)=>c.types.length).length} · supertype Pokémon ${after.filter((c)=>c.supertype==="Pokémon").length}`);
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e instanceof Error ? e.message : e); prisma.$disconnect(); process.exit(1); });
