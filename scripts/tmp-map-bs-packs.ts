/**
 * [임시·DP] KR BS1~BS10 ↔ JP DP/Pt 팩 매핑 프로파일 (읽기전용).
 *   각 BS팩 포켓몬을 koName→dex 해석 후, JP 공식 세트들(DP1D~DP6, PT1~4)에서
 *   dex+일러 정확일치 / dex만 일치 분포를 집계 → 출처 팩 구성 도출.
 * 실행: npx tsx scripts/tmp-map-bs-packs.ts
 */
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { resolveCardDexes } from "./lib/pokeapi-names";

const JP_SETS = [
  "jp-tcg-DP1D", "jp-tcg-DP1P", "jp-tcg-DP2", "jp-tcg-DP3",
  "jp-tcg-DP4M", "jp-tcg-DP4D", "jp-tcg-DP5H", "jp-tcg-DP5A", "jp-tcg-DP6",
  "jp-tcg-PT1", "jp-tcg-PT2", "jp-tcg-PT3", "jp-tcg-PT4",
];
const LABEL: Record<string, string> = {
  "jp-tcg-DP1D": "時空の創造·다이아", "jp-tcg-DP1P": "時空の創造·펄", "jp-tcg-DP2": "湖の秘密",
  "jp-tcg-DP3": "ひかる闇", "jp-tcg-DP4M": "月光の追跡", "jp-tcg-DP4D": "夜明けの疾走",
  "jp-tcg-DP5H": "秘境の叫び", "jp-tcg-DP5A": "怒りの神殿", "jp-tcg-DP6": "破空の激闘",
  "jp-tcg-PT1": "ギンガの覇道(Pt1)", "jp-tcg-PT2": "時の果ての絆(Pt2)", "jp-tcg-PT3": "フロンティアの鼓動(Pt3)", "jp-tcg-PT4": "アルセウス光臨(Pt4)",
};

// KR명 → dex (DP/Pt 접미 태그 제거: LV.X, G/GL/C/E4/FB)
function koDex(raw: string): number | null {
  let n = raw.trim();
  for (const pat of [/\s*LV\.?X$/i, /\s*(GL|G|C|E4|FB|\[.*?\])$/, /\s*LV\.?X$/i]) {
    const d = resolveCardDexes(n, "ko");
    if (d.length) return d[0];
    n = n.replace(pat, "").trim();
  }
  const d = resolveCardDexes(n, "ko");
  return d.length ? d[0] : null;
}

async function main() {
  // JP 측 인덱스: setId → (dex|illust 집합, dex 집합)
  const jpRows = await prisma.regionCard.findMany({
    where: { setId: { in: JP_SETS } },
    select: { setId: true, logicalCard: { select: { pokedexNumbers: true, illustrator: true, supertype: true } } },
  });
  const jpDexIll = new Map<string, Set<string>>();
  const jpDex = new Map<string, Set<number>>();
  for (const s of JP_SETS) { jpDexIll.set(s, new Set()); jpDex.set(s, new Set()); }
  for (const r of jpRows) {
    const d = r.logicalCard.pokedexNumbers?.[0];
    if (d == null) continue;
    jpDex.get(r.setId)!.add(d);
    if (r.logicalCard.illustrator) jpDexIll.get(r.setId)!.add(`${d}|${r.logicalCard.illustrator}`);
  }

  for (let i = 1; i <= 10; i++) {
    const p = `data/kr-official/kr-official-bs${i}.json`;
    if (!existsSync(p)) { console.log(`BS${i}: JSON 없음(수집 미완)`); continue; }
    const cards: any[] = JSON.parse(readFileSync(p, "utf8"));
    const exact = new Map<string, number>(); // dex+일러 일치
    const dexOnly = new Map<string, number>();
    let pk = 0, unresolved = 0;
    for (const c of cards) {
      const d = koDex(c.koName);
      if (d == null) { unresolved++; continue; }
      pk++;
      const key = `${d}|${c.illustrator ?? ""}`;
      let hitExact = false;
      for (const s of JP_SETS) if (jpDexIll.get(s)!.has(key)) { exact.set(s, (exact.get(s) ?? 0) + 1); hitExact = true; }
      if (!hitExact) for (const s of JP_SETS) if (jpDex.get(s)!.has(d)) dexOnly.set(s, (dexOnly.get(s) ?? 0) + 1);
    }
    const fmt = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${LABEL[s]}:${n}`).join(" · ");
    console.log(`\n■ BS${i} (${cards.length}장, 포켓몬 해석 ${pk}·미해석 ${unresolved})`);
    console.log(`  [dex+일러 정확일치] ${fmt(exact) || "—"}`);
    console.log(`  [dex만 일치(보조)]  ${fmt(dexOnly) || "—"}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
