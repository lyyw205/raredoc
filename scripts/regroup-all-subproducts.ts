/**
 * 전 시리즈 부속상품(구축덱/기타강화상품)을 본확장 그룹에서 분리 → era별 {prefix}-decks/{prefix}-goods 로 이동.
 *
 * - era 추론은 **이름 우선**(잘못 묶인 setGroup.era 교정). 예: "스칼렛&바이올렛 랜덤 스타트 덱"(og-s1w 소속) → SV.
 * - 분류 휴리스틱(나무위키 구축덱 정의): 덱|스타터|스타트|구축|아카데미|퍼스트 → 구축덱, 그 외 → 기타.
 * - 부속상품이 **본확장 그룹**(확장팩 보유) 안에 있으면 그 KR 세트만 이동.
 *   **전용 제품 그룹**(확장팩 없음: og-svk, kr-startdeck-100, kr-starter-m1 등)이면 JP/EN 형제까지 전부 이동 후 빈 그룹 삭제.
 * 멱등. 실행: npx tsx scripts/regroup-all-subproducts.ts [--dry-run]
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const DRY = process.argv.includes("--dry-run");

const ERA: Record<string, { p: string; e: string; l: string }> = {
  SV:   { p: "sv",   e: "SV-SP",   l: "SV" },
  S:    { p: "swsh", e: "S-SP",    l: "소드실드" },
  SM:   { p: "sm",   e: "SM-SP",   l: "썬·문" },
  XY:   { p: "xy",   e: "XY-SP",   l: "XY" },
  BW:   { p: "bw",   e: "BW-SP",   l: "BW" },
  DP:   { p: "dp",   e: "DP-SP",   l: "DP" },
  MEGA: { p: "mega", e: "MEGA-SP", l: "MEGA" },
};

const SUB_KW = /스타터|스타트|덱|박스|BOX|프리미엄|트레이너|구축|아카데미|퍼스트|스페셜 ?(덱 ?)?세트|컬렉션|GOLDEN/;
const EXP_KW = /확장팩|하이클래스|강화\s?확장/;
const DECK_KW = /덱|스타터|스타트|구축|아카데미|퍼스트/;

// 이름 우선 era 추론
function eraOf(name: string, fallbackEra?: string | null): string | null {
  if (/스칼렛\s?&\s?바이올렛|로켓단/.test(name)) return "SV";
  if (/\bMEGA\b/.test(name)) return "MEGA";
  if (/소드\s?&\s?실드/.test(name)) return "S";
  if (/썬\s?&\s?문/.test(name)) return "SM";
  if (/\bXY\b/.test(name)) return "XY";
  if (/\bBW\b|플라스마|큐레무|제크로무|토네로스|볼트로스|케르디오|비리디온|테라키온|코바르온|게노세크트|뮤츠VS/.test(name)) return "BW";
  if (/\bDP\b|크레세리아|펄기아/.test(name)) return "DP";
  const base = fallbackEra?.replace(/\s*\(.*$/, "").trim();
  if (base && ERA[base]) return base;
  return null;
}

async function main() {
  const allSets = await prisma.set.findMany({
    select: { id: true, name: true, region: true, setGroupId: true, setGroup: { select: { id: true, era: true } } },
  });
  // group → its sets (for dedicated detection)
  const byGroup = new Map<string, typeof allSets>();
  for (const s of allSets) { const k = s.setGroupId ?? "(null)"; if (!byGroup.has(k)) byGroup.set(k, []); byGroup.get(k)!.push(s); }
  const groupHasExpansion = (gid: string) => (byGroup.get(gid) ?? []).some((s) => EXP_KW.test(s.name));

  const plan: { sid: string; region: string; group: string; kind: string; name: string; srcGroup: string }[] = [];
  const skipped: string[] = [];
  const movedSetIds = new Set<string>();

  for (const s of allSets) {
    if (s.region !== "KR") continue;
    if (movedSetIds.has(s.id)) continue; // 형제 로직으로 이미 편입됨
    if (!SUB_KW.test(s.name) || EXP_KW.test(s.name)) continue;
    if (s.setGroup?.era === "SV-SP" || s.setGroupId === "sv-decks" || s.setGroupId === "sv-goods") continue;
    const era = eraOf(s.name, s.setGroup?.era);
    const cfg = era ? ERA[era] : undefined;
    if (!cfg) { skipped.push(`${s.id} (era=${era ?? "?"}) ${s.name}`); continue; }
    const group = `${cfg.p}-${DECK_KW.test(s.name) ? "decks" : "goods"}`;
    const src = s.setGroupId ?? "(null)";
    plan.push({ sid: s.id, region: "KR", group, kind: DECK_KW.test(s.name) ? "구축덱" : "기타", name: s.name, srcGroup: src });
    movedSetIds.add(s.id);
    // 전용 제품 그룹이면 JP/EN 형제도 같은 그룹으로
    if (src !== "(null)" && !groupHasExpansion(src)) {
      for (const sib of byGroup.get(src) ?? []) {
        if (sib.id !== s.id && !movedSetIds.has(sib.id)) {
          plan.push({ sid: sib.id, region: sib.region, group, kind: "(형제)", name: sib.name, srcGroup: src });
          movedSetIds.add(sib.id);
        }
      }
    }
  }

  const groupMeta: Record<string, { era: string; nameKo: string; order: number }> = {};
  for (const cfg of Object.values(ERA)) {
    groupMeta[`${cfg.p}-decks`] = { era: cfg.e, nameKo: `${cfg.l} 구축덱`, order: 90 };
    groupMeta[`${cfg.p}-goods`] = { era: cfg.e, nameKo: `${cfg.l} 기타 강화상품`, order: 91 };
  }
  const usedGroups = new Set(plan.map((p) => p.group));
  const srcGroups = new Set(plan.map((p) => p.srcGroup).filter((g) => g !== "(null)"));

  if (!DRY) for (const g of usedGroups) {
    const m = groupMeta[g];
    await prisma.setGroup.upsert({ where: { id: g }, update: { era: m.era, nameKo: m.nameKo, order: m.order }, create: { id: g, era: m.era, nameKo: m.nameKo, order: m.order, releaseDate: null } });
  }

  let lc = 0;
  for (const p of plan) {
    if (!DRY) {
      await prisma.set.update({ where: { id: p.sid }, data: { setGroupId: p.group } });
      lc += (await prisma.logicalCard.updateMany({ where: { primarySetId: p.sid }, data: { setGroupId: p.group } })).count;
    }
    console.log(`  ${p.sid} (${p.region}) → ${p.group} [${p.kind}] | ${p.name}`);
  }
  console.log(`\n${DRY ? "[DRY] " : ""}이동 세트 ${plan.length} / 그룹 ${usedGroups.size}개${DRY ? "" : ` / LC ${lc}`}`);

  // 비워진 source 그룹 삭제
  const emptied: string[] = [];
  for (const g of srcGroups) {
    const remain = DRY ? (byGroup.get(g) ?? []).filter((s) => !movedSetIds.has(s.id)).length : await prisma.set.count({ where: { setGroupId: g } });
    if (remain === 0) { emptied.push(g); if (!DRY) await prisma.setGroup.delete({ where: { id: g } }).catch(() => {}); }
  }
  console.log(`${DRY ? "[DRY] 삭제예정" : "삭제"} 빈 그룹 ${emptied.length}: ${emptied.join(", ")}`);
  if (skipped.length) { console.log("\n⚠ era 미상 건너뜀:"); skipped.forEach((s) => console.log("   " + s)); }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
