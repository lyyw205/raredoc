/**
 * 카드팩 단위 표준 점검 (읽기 전용, DB 변경 없음).
 *
 * 사용: npx tsx scripts/inspect-pack.ts <cardPackId | setId>
 *   예:  npx tsx scripts/inspect-pack.ts mega-abyss-eye
 *        npx tsx scripts/inspect-pack.ts jp-mega-abyss-eye
 *
 * 점검 항목(표준):
 *   1. 지역 구성(JP/EN/KR) + primarySetId 분포
 *   2. 카드수 ↔ Set.cardCount, 번호 무결성(누락/중복)
 *   3. 언어 ↔ region 정합성 (이름/flavor 실제 언어가 region과 맞는지)
 *   4. 게임데이터(hp/rarity/attacks/abilities/pokedexNumbers)
 *   5. attacks/abilities JSON 구조 품질(구조화 여부)
 *   6. 일러스트레이터 / flavorText
 *   7. CardText(ko/ja) 연결
 *   8. 이미지 호스팅
 *   9. supertype 오분류 (Pokémon인데 hp없음 / Trainer·Energy인데 hp있음)
 *   10. provenance (ExternalIdMapping 출처 기록)
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const ARG = process.argv[2];
if (!ARG) { console.error("usage: inspect-pack.ts <cardPackId | setId>"); process.exit(1); }

const q = <T = any>(sql: string, ...p: any[]) => prisma.$queryRawUnsafe<T[]>(sql, ...p);
const n = (v: any) => Number(v);

async function inspectSet(setId: string, region: string) {
  console.log(`\n──────── [${region}] ${setId} ────────`);
  const cardCount = (await q(`SELECT "cardCount" c FROM "Set" WHERE id=$1`, setId))[0]?.c ?? 0;

  const agg = (await q(`
    SELECT count(*)::int total,
      count(cl."numberInt")::int dexnum,
      count(*) FILTER (WHERE cl."imageSmall" IS NOT NULL)::int img,
      count(lc.hp)::int hp, count(lc."rarityId")::int rarity,
      count(lc.illustrator)::int illus,
      count(*) FILTER (WHERE lc."pokedexNumbers" IS NOT NULL AND array_length(lc."pokedexNumbers",1)>0)::int pdex,
      count(*) FILTER (WHERE cl."flavorText" IS NOT NULL)::int flavor,
      count(*) FILTER (WHERE jsonb_typeof(lc.attacks)='array' AND lc.attacks->0 ? 'cost')::int atk_struct,
      count(*) FILTER (WHERE jsonb_typeof(lc.attacks)='array' AND NOT (lc.attacks->0 ? 'cost'))::int atk_poor,
      count(*) FILTER (WHERE lc.attacks IS NOT NULL AND jsonb_typeof(lc.attacks)<>'array')::int atk_scalar,
      count(*) FILTER (WHERE jsonb_typeof(lc.abilities)='array')::int abi
    FROM "CardLocale" cl JOIN "LogicalCard" lc ON lc.id=cl."logicalCardId" WHERE cl."setId"=$1`, setId))[0];
  console.log(`  카드수 ${agg.total} (Set.cardCount=${cardCount}${n(agg.total)===n(cardCount)?" ✓":" ⚠불일치"})`);
  console.log(`  번호 ${agg.dexnum}/${agg.total} · 이미지 ${agg.img}/${agg.total} · hp ${agg.hp} · rarity ${agg.rarity} · pokedexNumbers ${agg.pdex} · illustrator ${agg.illus} · flavor ${agg.flavor}`);
  console.log(`  attacks: 구조화 ${agg.atk_struct} / 빈약(분리안됨) ${agg.atk_poor} / scalar ${agg.atk_scalar} · abilities(array) ${agg.abi}`);

  // CardText
  const ct = (await q(`
    SELECT count(DISTINCT ct.id) FILTER (WHERE ct.language='ko')::int ko,
           count(DISTINCT ct.id) FILTER (WHERE ct.language='ja')::int ja
    FROM "CardLocale" cl LEFT JOIN "CardText" ct ON ct."logicalCardId"=cl."logicalCardId" WHERE cl."setId"=$1`, setId))[0];
  console.log(`  CardText: ko ${ct.ko} · ja ${ct.ja}`);

  // region/language 정합성
  const lang = (await q(`
    SELECT count(*) FILTER (WHERE name ~ '[ぁ-んァ-ヶ一-龯]')::int jp,
           count(*) FILTER (WHERE name ~ '[가-힣]')::int kr,
           count(*) FILTER (WHERE name ~ '^[\\x00-\\x7F]+$')::int ascii
    FROM "CardLocale" WHERE "setId"=$1`, setId))[0];
  const expect = region === "JP" ? "jp" : region === "KR" ? "kr" : "ascii";
  const bad = region === "JP" ? n(lang.ascii) : region === "KR" ? (n(lang.jp)+n(lang.ascii)) : (n(lang.jp)+n(lang.kr));
  console.log(`  언어↔region: 이름 JP=${lang.jp} KR=${lang.kr} ASCII=${lang.ascii} (region=${region} 기대=${expect}) ${bad>0?`⚠ 불일치 의심 ${bad}장`:"✓"}`);

  // 이미지 호스트
  const hosts = await q(`SELECT split_part(regexp_replace("imageSmall",'^https?://',''),'/',1) host, count(*)::int c
    FROM "CardLocale" WHERE "setId"=$1 AND "imageSmall" IS NOT NULL GROUP BY 1 ORDER BY c DESC`, setId);
  console.log(`  이미지 호스트: ${hosts.map((h:any)=>`${h.host}(${h.c})`).join(", ") || "없음"}`);

  // supertype 오분류
  const mis = await q(`
    SELECT cl."numberInt" num, cl.name, lc.supertype, lc.hp
    FROM "CardLocale" cl JOIN "LogicalCard" lc ON lc.id=cl."logicalCardId"
    WHERE cl."setId"=$1 AND (
      (lc.supertype ILIKE 'Pok%mon' AND lc.hp IS NULL) OR
      (lc.supertype IN ('Trainer','Energy') AND lc.hp IS NOT NULL))
    ORDER BY cl."numberInt"`, setId);
  console.log(`  supertype 오분류: ${mis.length}장${mis.length?" ⚠ "+mis.slice(0,12).map((m:any)=>`#${m.num}(${m.supertype}/hp${m.hp??"-"})`).join(" "):" ✓"}`);

  // 번호 무결성: 누락
  const nums = (await q(`SELECT array_agg(DISTINCT "numberInt" ORDER BY "numberInt") a FROM "CardLocale" WHERE "setId"=$1 AND "numberInt" IS NOT NULL`, setId))[0].a as number[] | null;
  if (nums && nums.length) {
    const miss: number[] = [];
    for (let i = nums[0]; i <= nums[nums.length-1]; i++) if (!nums.includes(i)) miss.push(i);
    console.log(`  번호범위 ${nums[0]}~${nums[nums.length-1]} · 누락 ${miss.length}${miss.length?` [${miss.slice(0,20).join(",")}]`:" ✓"}`);
  }

  // provenance
  const prov = await q(`
    SELECT es.code, es.kind, count(*)::int c FROM "ExternalIdMapping" m JOIN "ExternalSource" es ON es.id=m."sourceId"
    WHERE m."cardLocaleId" IN (SELECT id FROM "CardLocale" WHERE "setId"=$1)
       OR m."logicalCardId" IN (SELECT "logicalCardId" FROM "CardLocale" WHERE "setId"=$1)
    GROUP BY 1,2`, setId);
  console.log(`  provenance(ExternalIdMapping): ${prov.length?prov.map((p:any)=>`${p.code}/${p.kind}(${p.c})`).join(", "):"없음 ⚠"}`);
}

async function main() {
  const sg = await prisma.cardPack.findUnique({ where: { id: ARG }, select: { id: true, era: true, nameJa: true, nameEn: true, nameKo: true } });
  let sets: { id: string; region: string }[];
  if (sg) {
    console.log(`\n======== PACK: ${sg.id} [${sg.era}] ${sg.nameJa ?? ""} / ${sg.nameEn ?? ""} / ${sg.nameKo ?? ""} ========`);
    sets = await prisma.set.findMany({ where: { cardPackId: sg.id }, select: { id: true, region: true }, orderBy: { region: "asc" } });
  } else {
    const s = await prisma.set.findUnique({ where: { id: ARG }, select: { id: true, region: true } });
    if (!s) { console.error(`'${ARG}' 는 CardPack/Set 어느쪽도 아님`); process.exit(1); }
    sets = [s];
  }

  console.log(`지역 구성: ${sets.map((s) => `${s.region}(${s.id})`).join(" / ")}`);
  // primarySetId 분포
  const ps = await q(`
    SELECT lc."primarySetId", count(*)::int c FROM "LogicalCard" lc
    WHERE lc.id IN (SELECT "logicalCardId" FROM "CardLocale" WHERE "setId" = ANY($1::text[]))
    GROUP BY 1 ORDER BY c DESC`, sets.map((s) => s.id));
  console.log(`primarySetId 분포: ${ps.map((p: any) => `${p.primarySetId ?? "null"}(${p.c})`).join(", ")}`);

  for (const s of sets) await inspectSet(s.id, s.region);

  console.log("\n(읽기 전용 · DB 변경 없음)");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
