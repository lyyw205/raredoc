/**
 * XY-P プロモーションカード(jp-tcg-XYP) 미수집분 적재 — 사용자 승인 수집.
 *   소스: Limitless JP DB 스크랩(data/collect/jp-xyp.json, collect-jp-limitless --code=XYP).
 *   기존 31장은 보존(스킵) — 큐레이션된 데이터(일러스트레이터·LC레벨 레어도) 안 건드림.
 *   신규만 생성: LC(lc-jp-tcg-XYP-NNN) + JP RegionCard(jp-tcg-XYP-NNN). JP 단독(EN/KR 연결 안 만듦).
 *   기본 수집(SM-P 405장 선례와 동일): JP명 + 공식이미지 + supertype(Limitless 추정). 레어도 null=JP프로모 관례.
 *   타입/단계/도감은 후속 enrich 패스(미수집 아님, sparse). 비동결 og-kr-xy-promo.
 * Run: npx tsx scripts/load-xyp-promos.ts [--apply]
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const SET_ID = "jp-tcg-XYP";
const GROUP = "og-kr-xy-promo";
const SRC = "data/collect/jp-xyp.json";
const isJa = (s: string) => /[ぁ-ゟァ-ヿ一-鿿]/.test(s);
const pad3 = (n: number) => String(n).padStart(3, "0");

type Card = { number: string; numberInt: number | null; name: string; supertype: string | null; imageLarge: string | null };

async function main() {
  const apply = process.argv.includes("--apply");
  assertWritable([GROUP], { allow: hasAllowProtectedFlag(), dryRun: !apply, tool: "load-xyp-promos" });

  const cards: Card[] = JSON.parse(readFileSync(SRC, "utf8"));
  const existing = new Set(
    (await prisma.regionCard.findMany({ where: { setId: SET_ID, region: "JP" }, select: { number: true } })).map((r) => r.number),
  );

  const toCreate: Card[] = [];
  let skip = 0, noImg = 0, badName = 0;
  for (const c of cards) {
    const key = c.numberInt != null ? pad3(c.numberInt) : String(c.number);
    if (existing.has(key)) { skip++; continue; }
    if (!isJa(c.name)) badName++;
    if (!c.imageLarge) noImg++;
    toCreate.push({ ...c, number: key });
  }

  console.log(`${apply ? "[APPLY]" : "[DRY]"} XY-P 수집 — Limitless ${cards.length}장 · 기존 ${skip} 스킵 · 신규 ${toCreate.length}`);
  console.log(`  품질: 이미지없음 ${noImg} · 비일본어명 ${badName}`);
  console.log(`  샘플 신규: ${toCreate.slice(0, 6).map((c) => `#${c.number} ${c.name}${c.imageLarge ? "" : "(img X)"}`).join(" / ")}`);
  if (badName) console.log(`  ⚠ 비일본어명: ${toCreate.filter((c) => !isJa(c.name)).slice(0, 8).map((c) => `#${c.number} ${c.name}`).join(", ")}`);

  if (!apply) { console.log("\n(dry-run — --apply 로 적용)"); return; }

  let created = 0;
  for (const c of toCreate) {
    const key = c.number;
    const rcId = `${SET_ID}-${key}`;
    const lcId = `lc-${SET_ID}-${key}`;
    await prisma.card.upsert({
      where: { id: lcId },
      create: {
        id: lcId, cardPackId: GROUP, primarySetId: SET_ID,
        primaryNumber: key, primaryNumberInt: c.numberInt,
        supertype: c.supertype ?? null,
        pokedexNumbers: [], subtypes: [], types: [], evolvesTo: [], rules: [],
      },
      update: { supertype: c.supertype ?? null },
    });
    await prisma.regionCard.upsert({
      where: { id: rcId },
      create: {
        id: rcId, cardId: lcId, language: "ja", region: "JP", setId: SET_ID,
        number: key, numberInt: c.numberInt, name: c.name,
        imageLarge: c.imageLarge, imageSmall: c.imageLarge, rarityId: null, regulationMark: null,
      },
      update: { name: c.name, imageLarge: c.imageLarge, imageSmall: c.imageLarge, numberInt: c.numberInt },
    });
    created++;
    if (created % 50 === 0) console.log(`  …${created}/${toCreate.length}`);
  }
  const cnt = await prisma.regionCard.count({ where: { setId: SET_ID, region: "JP" } });
  await prisma.set.update({ where: { id: SET_ID }, data: { cardCount: cnt } });
  console.log(`✅ 신규 생성 ${created} · Set.cardCount → ${cnt} (기존 ${skip} 보존)`);
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e instanceof Error ? e.message : e); prisma.$disconnect(); process.exit(1); });
