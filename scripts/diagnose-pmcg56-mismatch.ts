/**
 * PMCG5/6 카드의 Bulbapedia 매핑 vs tcgdex 카드 mismatch 진단.
 *
 * - DB 의 CardLocale.name (= tcgdex JP name)
 * - ExternalIdMapping(bulbapedia) 의 externalId (= 영문 slug)
 * - 위 두개가 같은 카드를 가리키는지 검증
 *   영문 slug 를 일본어로 변환 후 DB name 과 매칭
 *
 * 대조표 (Bulbapedia EN slug → tcgdex JP name) 는 heuristic 사용:
 *   - 인물 카드: Blaine→ブレイン, Koga→コガ, Giovanni→ジョバンニ, Sabrina→サブリナ, Brock→ブロック,
 *     Misty→ミスティ, Erika→エリカ, Lt._Surge→中佐, Surge→Surge, Imakuni?→イマクニ?
 *   - 스타디움/짐: ".._Gym" 단어 매칭
 *   - 일반 영문→일본어는 tcgdex 의 동일 set 안에서 같은 type/rarity 인 카드들과 fuzzy match
 *
 * 더 정확한 방법: tcgdex 의 PMCG{5,6} 전체 카드 받아 영문 변환된 tcgdex name 과 직접 매칭.
 * (영문 변환 사전이 없어 정확도 ↓, 그래서 결과는 "의심 카드 리스트" 로 봐야 함)
 *
 * Output: docs/pmcg56-mismatch.md
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
const execFileP = promisify(execFile);

async function curlJson<T>(url: string): Promise<T | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "30", url], { maxBuffer: 16 * 1024 * 1024 });
    return JSON.parse(stdout) as T;
  } catch {
    return null;
  }
}

// Bulbapedia slug 정규화: %27 → ', _ → 공백, %27d → 'd 등
function decodeSlug(slug: string): string {
  return decodeURIComponent(slug).replace(/_/g, " ");
}

// 사람/포켓몬/짐 변환 사전 (manual seed)
const EN_TO_JP: Record<string, string> = {
  "Blaine": "ブレイン",
  "Koga": "コガ",
  "Giovanni": "ジョバンニ",
  "Sabrina": "サブリナ",
  "Brock": "ブロック",
  "Misty": "ミスティ",
  "Erika": "エリカ",
  "Lt. Surge": "中佐",
  "Surge": "中佐",
  "Imakuni?": "イマクニ?",
};

type TcgdexSet = { cards: { id: string; localId: string; name: string }[] };

async function main() {
  const SETS = [
    { setId: "PMCG5", group: "og-pmcg5" },
    { setId: "PMCG6", group: "og-pmcg6" },
  ];

  const src = await prisma.externalSource.findUniqueOrThrow({ where: { code: "bulbapedia" } });
  const lines: string[] = [];
  lines.push(`# PMCG5/6 Bulbapedia 매핑 진단\n\n생성: ${new Date().toISOString()}\n`);

  for (const set of SETS) {
    lines.push(`\n## ${set.setId}\n`);
    console.log(`\n─── ${set.setId} ───`);

    // tcgdex 의 그 set 의 모든 카드 (정답)
    const tcgdex = await curlJson<TcgdexSet>(`https://api.tcgdex.net/v2/ja/sets/${set.setId}`);
    if (!tcgdex) {
      lines.push(`tcgdex fetch 실패`);
      continue;
    }
    const tcgdexById = new Map(tcgdex.cards.map((c) => [`jp-tcg-${c.id}`, c.name]));

    // DB 카드 + Bulbapedia 매핑
    const cards = await prisma.cardLocale.findMany({
      where: { id: { startsWith: `jp-tcg-${set.setId}-` } },
      select: { id: true, name: true, imageSmall: true },
      orderBy: { id: "asc" },
    });
    const mappings = await prisma.externalIdMapping.findMany({
      where: { sourceId: src.id, cardLocaleId: { startsWith: `jp-tcg-${set.setId}-` } },
      select: { cardLocaleId: true, externalId: true },
    });
    const mapByCard = new Map(mappings.map((m) => [m.cardLocaleId!, m.externalId]));

    const mismatches: { id: string; dbName: string; bulbaSlug: string; expectedDbName: string; imgLink: string }[] = [];
    const noMap: { id: string; dbName: string }[] = [];

    for (const c of cards) {
      const tcgdexName = tcgdexById.get(c.id) ?? "?";
      const slug = mapByCard.get(c.id);
      if (!slug) {
        noMap.push({ id: c.id, dbName: c.name });
        continue;
      }
      // slug 의 첫 단어를 카드 타이틀로 사용
      const titleEn = decodeSlug(slug).split(" (")[0];
      // 영문→일본어 변환 시도. 변환 사전에 있으면 그것, 없으면 영문 그대로.
      const titleJpExpected = EN_TO_JP[titleEn] ?? titleEn;
      // DB 의 tcgdex name 안에 변환된 일본어가 포함되어야 정상 매칭
      // (DB name 은 short label, ex. "ブレイン" / "ジョバンニの最後の手段")
      const isMatch =
        c.name === titleJpExpected ||
        c.name.includes(titleJpExpected) ||
        titleJpExpected.includes(c.name) ||
        c.name.toLowerCase() === titleEn.toLowerCase();
      if (!isMatch) {
        mismatches.push({
          id: c.id,
          dbName: c.name,
          bulbaSlug: titleEn,
          expectedDbName: titleJpExpected,
          imgLink: c.imageSmall ?? "(없음)",
        });
      }
    }

    lines.push(`- 총 카드: ${cards.length}\n`);
    lines.push(`- Bulbapedia 매핑 있음: ${cards.length - noMap.length}\n`);
    lines.push(`- 매핑 없음: ${noMap.length}\n`);
    lines.push(`- ⚠ mismatch (의심): ${mismatches.length}\n`);

    if (mismatches.length > 0) {
      lines.push(`\n### Mismatch 카드\n`);
      lines.push(`| DB ID | DB name (tcgdex JP) | Bulbapedia URL 슬러그 | 예상 일본어 |`);
      lines.push(`| --- | --- | --- | --- |`);
      for (const m of mismatches) {
        lines.push(`| ${m.id} | ${m.dbName} | ${m.bulbaSlug} | ${m.expectedDbName} |`);
      }
    }
    if (noMap.length > 0) {
      lines.push(`\n### 매핑 없음 카드 (이미지 무)\n`);
      for (const m of noMap.slice(0, 30)) lines.push(`- ${m.id}: ${m.dbName}`);
      if (noMap.length > 30) lines.push(`- (... ${noMap.length - 30} 더)`);
    }

    console.log(`  카드 ${cards.length}, mismatch ${mismatches.length}, no-mapping ${noMap.length}`);
  }

  const out = "docs/pmcg56-mismatch.md";
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, lines.join("\n") + "\n");
  console.log(`\nReport: ${out}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
