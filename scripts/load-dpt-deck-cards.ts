/**
 * DPt 덱 카드 수집 완료 (멱등, dry-run 우선) — data/collect/dpt/*.json(Bulbapedia 권위) 기준.
 *
 * 두 가지를 한다:
 *  (A) 기존 카드의 영문명 → 일문명 교정 (이미지/dex 보존). region=JP인데 영문명으로 들어간 오염 수리.
 *      안전장치: 포켓몬=dex 일치, 트레이너/에너지=정규화 영문명 일치일 때만 교정. 불일치는 CONFLICT(미적용).
 *      이미 일문명인 카드는 skip.
 *  (B) 누락 카드 추가 (이미지 null). Card(lc-{set}-{NNN}) + RegionCard({set}-{NNN}) 생성.
 *  (C) Set.cardCount = 권위 totalNumberedCards 로 교정.
 *
 * 실행: npx tsx scripts/load-dpt-deck-cards.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { readdirSync, readFileSync } from "node:fs";
import { buildNameIndex } from "./lib/pokeapi-names";

const APPLY = process.argv.includes("--apply");
const DIR = "data/collect/dpt";
const pad3 = (n: number | string) => String(parseInt(String(n), 10)).padStart(3, "0");
const normEn = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const isJa = (s: string) => /[぀-ヿ一-龯]/.test(s) && !/[A-Za-z]/.test(s);

// SP접미어(C/G/GL/FB/M/四) + LV.X + 후리가나 브래킷 제거 → 종족 base 이름
const baseSpecies = (nameJa: string) =>
  nameJa.replace(/LV\.X/g, "").replace(/\[[^\]]*\]/g, "").replace(/(?:GL|FB|G|C|M|四)$/u, "").trim();
const jaIdx = buildNameIndex("ja");
// 일본어명 base 가 PokeAPI ja 인덱스에서 다른 dex 로 풀리면 내부모순(에이전트 kana 오류 등)
const dexMismatch = (nameJa: string, dex: number | null): number | null => {
  if (dex == null) return null;
  const d = jaIdx.get(baseSpecies(nameJa));
  return d != null && d !== dex ? d : null;
};

const mapSubtype = (s: string) =>
  ({ "LV.X": "LV.X", "Level-Up": "LV.X", Tool: "Pokémon Tool", "Pokémon Tool": "Pokémon Tool" } as Record<string, string>)[s] ?? s;

type JCard = { number: number; nameJa: string; nameEn: string; supertype: string; subtypes: string[]; dex: number | null; rarity: string | null };

async function main() {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
  const rarities = await prisma.rarity.findMany({ select: { id: true, nameEn: true } });
  const rarIdx = new Map<string, string>();
  for (const r of rarities) if (r.nameEn) rarIdx.set(r.nameEn.trim().toLowerCase(), r.id);

  let patched = 0, added = 0, skippedJa = 0;
  const conflicts: string[] = [];
  const dataIssues: string[] = [];
  const countFix: string[] = [];

  for (const f of files) {
    const j = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8")) as {
      setId: string; totalNumberedCards: number; cards: JCard[];
    };
    const setId = j.setId;
    const existing = await prisma.regionCard.findMany({
      where: { setId },
      select: { id: true, number: true, name: true, card: { select: { id: true, pokedexNumbers: true } } },
    });
    const byNum = new Map(existing.map((c) => [pad3(c.number), c]));

    for (const c of j.cards) {
      const num3 = pad3(c.number);
      const rcId = `${setId}-${num3}`;
      const lcId = `lc-${setId}-${num3}`;
      const ex = byNum.get(num3);
      const isPoke = c.supertype === "Pokémon";

      // 내부모순 가드(양 경로): 일본어명 base 가 다른 dex 로 풀리면 적용/추가 보류
      if (isPoke) {
        const m = dexMismatch(c.nameJa, c.dex);
        if (m != null) {
          dataIssues.push(`  ✗ ${setId} #${num3}: nameJa="${c.nameJa}"→dex ${m} ≠ JSON dex=${c.dex} (nameEn="${c.nameEn}")`);
          continue;
        }
      }

      if (ex) {
        // (A) 교정 경로
        if (isJa(ex.name)) { skippedJa++; continue; } // 이미 일문 → 보존
        // 안전장치
        let safe = false;
        if (isPoke) safe = c.dex != null && ex.card.pokedexNumbers.includes(c.dex);
        else safe = normEn(ex.name) === normEn(c.nameEn);
        if (!safe) {
          conflicts.push(`  ✗ ${setId} #${num3}: DB="${ex.name}"(dex ${ex.card.pokedexNumbers}) ↔ JSON nameEn="${c.nameEn}" nameJa="${c.nameJa}" dex=${c.dex}`);
          continue;
        }
        if (APPLY) await prisma.regionCard.update({ where: { id: ex.id }, data: { name: c.nameJa } });
        patched++;
      } else {
        // (B) 추가 경로 (이미지 null)
        const rarId = c.rarity ? rarIdx.get(c.rarity.trim().toLowerCase()) : undefined;
        const subs = (c.subtypes ?? []).map(mapSubtype);
        const dexArr = c.dex != null ? [c.dex] : [];
        if (APPLY) {
          await prisma.card.upsert({
            where: { id: lcId },
            create: {
              id: lcId, supertype: c.supertype, subtypes: subs, pokedexNumbers: dexArr,
              primarySetId: setId, primaryNumber: num3, primaryNumberInt: parseInt(num3, 10),
              rarityId: rarId ?? null,
            },
            update: {},
          });
          await prisma.regionCard.upsert({
            where: { id: rcId },
            create: {
              id: rcId, cardId: lcId, language: "ja", region: "JP", setId,
              number: num3, numberInt: parseInt(num3, 10), name: c.nameJa,
              imageLarge: null, imageSmall: null, rarityId: rarId ?? null,
            },
            update: {},
          });
        }
        added++;
      }
    }

    // (C) cardCount 교정
    const setRow = await prisma.set.findUnique({ where: { id: setId }, select: { cardCount: true } });
    if (setRow && setRow.cardCount !== j.totalNumberedCards) {
      countFix.push(`  ${setId}: ${setRow.cardCount} → ${j.totalNumberedCards}`);
      if (APPLY) await prisma.set.update({ where: { id: setId }, data: { cardCount: j.totalNumberedCards } });
    }
  }

  console.log(`\n=== DPt 덱 수집 완료 ${APPLY ? "★APPLY" : "(dry-run)"} ===`);
  console.log(`  교정(영→일): ${patched}  추가(null img): ${added}  이미 일문 skip: ${skippedJa}`);
  console.log(`\n--- cardCount 교정 ${countFix.length} ---`); countFix.forEach((s) => console.log(s));
  console.log(`\n--- ⚠ 내부모순 dex↔이름(미적용) ${dataIssues.length} ---`); dataIssues.forEach((s) => console.log(s));
  console.log(`\n--- ⚠ CONFLICT 번호/영문명 불일치(미적용) ${conflicts.length} ---`); conflicts.forEach((s) => console.log(s));
}

main().finally(() => prisma.$disconnect());
