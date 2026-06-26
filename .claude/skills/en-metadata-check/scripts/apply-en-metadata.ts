// en-metadata-check 스킬 — plan(JSON) 기반 EN 메타데이터 적용. dry-run 기본.
//   plan = audit-en-metadata --emit-plan 산출(완전성 채움) 또는 사용자 확인 후 직접 편집한 액션 목록.
//   action: { regionCardId, cardId, layer:"Card"|"RegionCard", field, value, kind, note }
//   계층/필드별로 올바른 컬럼에만 쓴다. 매핑 필드(name/imageLarge/imageSmall/pokedexNumbers) 변경 시
//   --allow-protected 필요(나머지 메타데이터 hp/attacks/rarity 등은 자유). → AGENTS.md "매핑 잠금".
//
// 사용(레포 루트):
//   npx tsx .claude/skills/en-metadata-check/scripts/apply-en-metadata.ts --plan /tmp/<set>-meta-plan.json [--apply] [--allow-protected]
//     [--only hp,types,rarity]            // 특정 필드만
//     [--cards en-tcg-me3-22,en-tcg-me3-1] // 특정 RegionCard 만 (전건 확인 시 부분 적용)
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertMappingWritable, hasAllowProtectedFlag } from "../../../../scripts/lib/protected-groups";
import { readFileSync } from "node:fs";

function parseArgs(argv: string[]) {
  const out: { plan?: string; apply: boolean; only?: Set<string>; cards?: Set<string> } = { apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--plan") out.plan = argv[++i];
    else if (a === "--apply") out.apply = true;
    else if (a === "--only") out.only = new Set(argv[++i].split(",").map((s) => s.trim()).filter(Boolean));
    else if (a === "--cards") out.cards = new Set(argv[++i].split(",").map((s) => s.trim()).filter(Boolean));
  }
  return out;
}

const CARD_FIELDS = new Set(["hp", "types", "subtypes", "retreatCost", "weakness", "resistance", "evolvesFrom", "pokedexNumbers", "illustrator", "attacks", "abilities"]);
const RC_FIELDS = new Set(["imageSmall", "imageLarge", "name", "flavorText", "rarity"]);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.plan) throw new Error("--plan <plan.json> 필요");
  const APPLY = args.apply;
  const parsed = JSON.parse(readFileSync(args.plan, "utf8"));
  let actions: any[] = parsed.actions ?? parsed;
  if (args.only) actions = actions.filter((a) => args.only!.has(a.field));
  if (args.cards) actions = actions.filter((a) => args.cards!.has(a.regionCardId));
  if (!actions.length) { console.log("적용할 액션 0건(필터 결과)."); return; }

  // 매핑 잠금(필드 인지 + 시대 인지) — 액션에 매핑 필드(name/imageLarge/imageSmall/pokedexNumbers)가 있고
  //   그 카드가 잠금 시대 팩이면 가드. 메타데이터(hp/attacks/rarity 등)만이거나 잠금 시대 밖이면 자유.
  const MAPPING_FIELDS = new Set(["name", "imageLarge", "imageSmall", "pokedexNumbers"]);
  const mapActions = actions.filter((a) => MAPPING_FIELDS.has(a.field));
  if (mapActions.length) {
    // 모든 액션은 regionCardId 를 가짐 → 그 RegionCard 의 set.cardPackId 로 영향 팩 판정(Card 레이어 pokedexNumbers 포함).
    const rcIds = [...new Set(mapActions.map((a) => a.regionCardId))];
    const rcs = await prisma.regionCard.findMany({ where: { id: { in: rcIds } }, select: { set: { select: { cardPackId: true } } } });
    const affected = rcs.map((r) => r.set?.cardPackId ?? null);
    const fields = [...new Set(mapActions.map((a) => a.field))].join(", ");
    assertMappingWritable(affected, { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "apply-en-metadata", what: `매핑 필드 ${mapActions.length}건 (${fields})` });
  }

  // rarity 코드→id 캐시
  const rarCache = new Map<string, string | null>();
  const resolveRarity = async (code: string): Promise<string | null> => {
    if (rarCache.has(code)) return rarCache.get(code)!;
    const r = await prisma.rarity.findFirst({ where: { code }, select: { id: true } });
    rarCache.set(code, r?.id ?? null);
    return r?.id ?? null;
  };

  let ok = 0, skip = 0;
  for (const act of actions) {
    const { regionCardId, cardId, layer, field, value, note } = act;
    const tag = `#${regionCardId} ${field}`;
    try {
      if (layer === "Card") {
        if (!CARD_FIELDS.has(field)) { console.log(`  ⚠ skip ${tag}: Card 미지원 필드`); skip++; continue; }
        const data: any = {};
        if (field === "hp" || field === "retreatCost") data[field] = Number(value);
        else if (field === "pokedexNumbers") data[field] = (value as any[]).map(Number);
        else if (field === "types" || field === "subtypes") data[field] = value;
        else if (field === "weakness" || field === "resistance") data[field] = String(value);
        else if (field === "evolvesFrom" || field === "illustrator") data[field] = String(value);
        else if (field === "attacks" || field === "abilities") data[field] = value; // Json
        if (!APPLY) { console.log(`  ◌ (dry) Card.${field} ← ${JSON.stringify(value).slice(0, 80)} [${tag}] ${note ?? ""}`); ok++; continue; }
        await prisma.card.update({ where: { id: cardId }, data });
        console.log(`  ✓ Card.${field} [${tag}]`); ok++;
      } else if (layer === "RegionCard") {
        if (!RC_FIELDS.has(field)) { console.log(`  ⚠ skip ${tag}: RegionCard 미지원 필드`); skip++; continue; }
        const data: any = {};
        if (field === "rarity") {
          const rid = await resolveRarity(String(value));
          if (!rid) { console.log(`  ⚠ skip ${tag}: Rarity code '${value}' 미존재(레퍼런스 매핑 확인)`); skip++; continue; }
          data.rarityId = rid;
        } else data[field] = String(value);
        if (!APPLY) { console.log(`  ◌ (dry) RegionCard.${field} ← ${JSON.stringify(value).slice(0, 80)} [${tag}] ${note ?? ""}`); ok++; continue; }
        await prisma.regionCard.update({ where: { id: regionCardId }, data });
        console.log(`  ✓ RegionCard.${field} [${tag}]`); ok++;
      } else { console.log(`  ⚠ skip ${tag}: 알 수 없는 layer '${layer}'`); skip++; }
    } catch (e) { console.log(`  ✗ ${tag}: ${e instanceof Error ? e.message : e}`); skip++; }
  }
  console.log(`■ apply-en-metadata ${APPLY ? "★적용" : "(dry)"} | 액션 ${actions.length} · 처리 ${ok} · 스킵 ${skip}`);
  if (!APPLY && ok) console.log("  → 실제 적용: --apply 추가(매핑 필드[name/이미지/pokedexNumbers] 포함 시 --allow-protected)");
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); })
  .finally(() => prisma.$disconnect());
