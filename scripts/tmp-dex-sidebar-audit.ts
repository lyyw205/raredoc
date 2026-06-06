/**
 * [임시] 도감 사이드바 감사 (읽기전용): 정렬 기준일(JP vs EN)과 표시명(nameKo) 출처 검증.
 * 실행: npx tsx scripts/tmp-dex-sidebar-audit.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { canonEra, eraOrderIndex } from "../src/lib/cards/eras";

const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

async function main() {
  const groups = await prisma.setGroup.findMany({
    orderBy: [{ releaseDate: "desc" }, { order: "asc" }],
    include: {
      sets: { select: { region: true, name: true, nameKo: true, nameJa: true, releaseDate: true } },
      _count: { select: { logicalCards: true } },
    },
  });

  const rows = groups
    .filter((g) => g._count.logicalCards > 0)
    .map((g) => {
      const jp = g.sets.find((s) => s.region === "JP");
      const en = g.sets.find((s) => s.region === "EN");
      const kr = g.sets.find((s) => s.region === "KR");
      const grpDate = fmt(g.releaseDate);
      const jpDate = fmt(jp?.releaseDate ?? null);
      const enDate = fmt(en?.releaseDate ?? null);
      const krDate = fmt(kr?.releaseDate ?? null);
      // 그룹 기준일이 어느 판 발매일과 일치하는지
      const dateSrc =
        grpDate === null ? "NONE"
        : grpDate === jpDate ? "JP"
        : grpDate === krDate ? "KR"
        : grpDate === enDate ? "EN"
        : "OTHER";
      const isSpecial = /-SP$/.test(g.era) || /-(decks|goods)$/.test(g.id);
      return {
        id: g.id,
        era: canonEra(g.era),
        sidebarName: g.nameKo ?? g.nameEn ?? g.nameJa ?? g.id,
        nameKo: g.nameKo,
        nameJa: g.nameJa,
        nameEn: g.nameEn,
        grpDate, jpDate, enDate, krDate, dateSrc,
        regions: ["EN", "JP", "KR"].filter((r) => g.sets.some((s) => s.region === r)).join("/") || "-",
        isSpecial,
      };
    });

  rows.sort((a, b) => {
    const ea = eraOrderIndex(a.era) - eraOrderIndex(b.era);
    if (ea !== 0) return ea;
    const sp = (a.isSpecial ? 1 : 0) - (b.isSpecial ? 1 : 0);
    if (sp !== 0) return sp;
    if (a.grpDate && b.grpDate) return b.grpDate.localeCompare(a.grpDate);
    if (a.grpDate) return -1;
    if (b.grpDate) return 1;
    return 0;
  });

  // 1) 사이드바 순서 그대로 출력
  console.log("=== 사이드바 순서 (표시명 | 기준일 | 기준일출처 | 지역 | id) ===");
  let curEra = "";
  for (const r of rows) {
    if (r.era !== curEra) { curEra = r.era; console.log(`\n--- [${curEra}] ---`); }
    console.log(
      `${r.sidebarName}${r.isSpecial ? " (특수)" : ""} | ${r.grpDate ?? "—"} | src:${r.dateSrc} | ${r.regions} | ${r.id}`
    );
  }

  // 2) 기준일 출처 통계
  const stat: Record<string, number> = {};
  for (const r of rows) stat[r.dateSrc] = (stat[r.dateSrc] ?? 0) + 1;
  console.log("\n=== 그룹 기준일(releaseDate) 출처 통계 ===");
  console.log(JSON.stringify(stat));

  // 3) JP가 있는데 기준일이 JP가 아닌 그룹 (정렬이 JP기준이 아닌 의심 사례)
  console.log("\n=== JP세트 존재 but 기준일≠JP발매일 ===");
  for (const r of rows.filter((r) => r.jpDate && r.dateSrc !== "JP")) {
    console.log(`${r.id} | grp:${r.grpDate} jp:${r.jpDate} en:${r.enDate} kr:${r.krDate} | src:${r.dateSrc}`);
  }

  // 4) nameKo 출처 의심: KR세트가 없는데 nameKo가 채워진 그룹 (번역명일 가능성)
  console.log("\n=== KR세트 없음 but nameKo 존재 (번역명 의심) ===");
  for (const r of rows.filter((r) => !r.regions.includes("KR") && r.nameKo)) {
    console.log(`${r.id} | ko:"${r.nameKo}" | ja:"${r.nameJa ?? ""}" | en:"${r.nameEn ?? ""}" | ${r.regions}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
