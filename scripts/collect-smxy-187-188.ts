/**
 * pack-list-check 후속(사용자 명시 수집 요청) — THE BEST OF XY (jp-tcg-SMXY) 시크릿 풀아트 2장 수집.
 *   #187 イベルタルEX (Yveltal-EX FA, illu Hasuno) · #188 シェイミEX (Shaymin-EX FA, illu TOKIYA).
 *   둘 다 본탄 카드(#079/#106)의 "다른 인쇄본"이다 → 기존 시크릿(#172↔#013)과 동일하게
 *   base LC 게임필드를 그대로 복제하고 gameCardId 를 base 와 공유한다. illustrator/번호/이미지만 교체.
 *   레어도는 set 관례대로 무레어도(null). JP 로케일만 수집(KR 공식 CDN 은 최상위 시크릿 누락 → 별도 보고).
 *   이미지: tcgcollector(시각검증 완료: #187 이벨타르EX FA / #188 쉐이미EX FA, 핫링크 보호 없음).
 *
 * 실행: npx tsx scripts/collect-smxy-187-188.ts [--apply]
 *   (cardPack sm-best-of-xy 는 비동결 — assertWritable 통과. 가드는 규칙상 포함.)
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const SET_ID = "jp-tcg-SMXY";
const PACK = "sm-best-of-xy";

const CARDS = [
  {
    num: 187, baseLc: "lc-jp-tcg-SMXY-079", illustrator: "Hasuno", speciesId: 717,
    jpName: "イベルタルEX", nameKo: "이벨타르 EX",
    image: "https://static.tcgcollector.com/content/images/c6/63/f5/c663f55b89e75f2003708b20252013d32b16dbe7a7f009cfe7eaef73a4995f92.jpg",
  },
  {
    num: 188, baseLc: "lc-jp-tcg-SMXY-106", illustrator: "TOKIYA", speciesId: 492,
    jpName: "シェイミEX", nameKo: "쉐이미 EX",
    image: "https://static.tcgcollector.com/content/images/95/c0/44/95c0448531c09125035df692bb297a7516a8836bc27300d98c7852da95a76249.jpg",
  },
];

async function main() {
  const apply = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  assertWritable([PACK], { allow, dryRun: !apply, tool: "collect-smxy-187-188" });

  for (const c of CARDS) {
    const newLc = `lc-jp-tcg-SMXY-${c.num}`;
    const newRc = `jp-tcg-SMXY-${c.num}`;
    const base = await prisma.card.findUnique({ where: { id: c.baseLc } });
    if (!base) throw new Error(`base LC 없음: ${c.baseLc}`);

    const lcExists = await prisma.card.findUnique({ where: { id: newLc }, select: { id: true } });
    const rcExists = await prisma.regionCard.findUnique({ where: { id: newRc }, select: { id: true } });

    console.log(`${apply ? "[APPLY]" : "[DRY]"} #${c.num} ${c.jpName} / ${c.nameKo}  (illu ${c.illustrator})`);
    console.log(`   LC ${newLc} ${lcExists ? "이미존재" : "신규"} · RC ${newRc} ${rcExists ? "이미존재" : "신규"}`);
    console.log(`   gameCard ${base.gameCardId} (base ${c.baseLc} 와 공유) · species ${c.speciesId} · types ${JSON.stringify(base.types)} · hp ${base.hp} · subtypes ${JSON.stringify(base.subtypes)} · rarity ${base.rarityId ?? "null(무레어도)"}`);
    console.log(`   img ${c.image.split("/").pop()}`);

    if (!apply) continue;
    if (rcExists) { console.log("   skip — RC 이미 존재"); continue; }

    await prisma.$transaction(async (tx) => {
      if (!lcExists) {
        await tx.card.create({ data: {
          id: newLc,
          primarySetId: SET_ID,
          primaryNumber: String(c.num),
          primaryNumberInt: c.num,
          pokedexNumbers: base.pokedexNumbers,
          supertype: base.supertype, subtypes: base.subtypes, types: base.types,
          hp: base.hp, retreatCost: base.retreatCost, weakness: base.weakness, resistance: base.resistance,
          regulationMark: base.regulationMark, illustrator: c.illustrator,
          evolvesFrom: base.evolvesFrom, evolvesTo: base.evolvesTo,
          abilities: base.abilities ?? undefined, attacks: base.attacks ?? undefined,
          legalities: base.legalities ?? undefined, rules: base.rules,
          flavorText: base.flavorText, rarityId: base.rarityId,
          nameKo: base.nameKo,
          gameCardId: base.gameCardId,
        } });
        await tx.cardSpecies.create({ data: { cardId: newLc, speciesId: c.speciesId } });
        await tx.cardText.create({ data: { cardId: newLc, language: "ko", name: c.nameKo, source: "lc_nameko" } });
      }
      await tx.regionCard.create({ data: {
        id: newRc, cardId: newLc, language: "ja", region: "JP",
        setId: SET_ID, number: String(c.num), numberInt: c.num,
        name: c.jpName, imageSmall: c.image, imageLarge: c.image,
        rarityId: null, regulationMark: null,
      } });
    });
    console.log("   ✅ 생성완료");
  }

  const jpCount = await prisma.regionCard.count({ where: { setId: SET_ID } });
  console.log(`\njp-tcg-SMXY RegionCard 수: ${jpCount} (현 Set.cardCount 갱신 대상)`);
  if (apply) {
    await prisma.set.update({ where: { id: SET_ID }, data: { cardCount: jpCount } });
    console.log(`Set.cardCount → ${jpCount}`);
  } else {
    console.log("(dry-run — --apply 로 적용)");
  }
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e instanceof Error ? e.message : e); prisma.$disconnect(); process.exit(1); });
