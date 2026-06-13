// LEGEND 시대 아르후의 석판(アルフの石版) 시크릿 3장 수집.
//   3장 모두 グッズ(Trainer-Item) 시크릿. EN 카운터파트(Alph Lithograph)가 우리 DB에 있고 동일 gameCardId(gc_2ed58f).
//   L3 #81 → en hgss4#FOUR(pack og-l3, 동일팩) 통합 / L2 #81 → en hgss3#THREE(og-l2, 동일팩) 통합
//   L1b #71(소울실버) → EN ONE은 다른팩(og-l1a)이라 JP 단독 신규 LC.
//   레어도: EN 형제 카드 모두 null → JP도 null. 이미지: 사용자 제공 tcgcollector webp.
// 비동결. dry-run 기본, --apply. 단일 $transaction. 멱등.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const I = (h:string)=>`https://static.tcgcollector.com/content/images/${h.slice(0,2)}/${h.slice(2,4)}/${h.slice(4,6)}/${h}.webp`;
const JA = "アルフの石版";
const GAME = { supertype:true,subtypes:true,types:true,hp:true,retreatCost:true,weakness:true,resistance:true,regulationMark:true,pokedexNumbers:true,rules:true,flavorText:true,abilities:true,attacks:true,legalities:true,evolvesFrom:true,evolvesTo:true,gameCardId:true,nameKo:true } as const;

// 통합 대상(동일팩 EN LC에 JP 로케일 추가)
const UNIFY = [
  { pack:"og-l3", jpSet:"jp-tcg-L3", num:"081", enLc:"lc-orphan-en-tcg-hgss4-FOUR",  hash:"22b1ba2c1131f977b192d670dbd839349e70ed924296c1771832f76043fb3f55" },
  { pack:"og-l2", jpSet:"jp-tcg-L2", num:"081", enLc:"lc-orphan-en-tcg-hgss3-THREE", hash:"1006b7fc054ed931e481df610fb0f63be0a3e19fcacc3768355d7266dccb72c7" },
];
// 단독 신규(EN이 다른팩)
const STANDALONE = [
  { pack:"og-l1b", jpSet:"jp-tcg-L1b", num:"071", cloneFrom:"lc-orphan-en-tcg-hgss1-ONE", hash:"88b5641910dbfae10d9bba1274909f1181a6712cf93f71f58b743506e5108321" },
];

async function main() {
  assertWritable(["og-l3","og-l2","og-l1b"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-legend-alph" });
  console.log(`\n=== LEGEND アルフの石版 수집 (${APPLY?"APPLY":"DRY-RUN"}) ===`);

  // 통합 계획 검증
  for (const u of UNIFY) {
    const en = await prisma.card.findUnique({ where:{id:u.enLc}, select:{cardPackId:true, locales:{select:{region:true,setId:true,number:true}}} });
    const rcId = `${u.jpSet}-${u.num}`;
    const exists = await prisma.regionCard.findUnique({ where:{id:rcId}, select:{cardId:true} });
    const hasJP = en?.locales.some(l=>l.region==="JP");
    console.log(`[통합] ${rcId} → ${u.enLc} | EN팩=${en?.cardPackId}(기대 ${u.pack}) 로케일=${en?.locales.map(l=>l.region).join("+")} ${hasJP?"⚠이미JP":""} ${exists?`(RC 존재 parent=${exists.cardId})`:""}`);
    if (en?.cardPackId !== u.pack) console.log(`   ❌ EN팩 불일치`);
  }
  // 단독 계획 검증
  for (const s of STANDALONE) {
    const src = await prisma.card.findUnique({ where:{id:s.cloneFrom}, select:GAME });
    const lcId = `lc-orphan-${s.jpSet}-${s.num}`, rcId = `${s.jpSet}-${s.num}`;
    const clash = await prisma.card.findUnique({ where:{id:lcId}, select:{id:true} });
    console.log(`[단독] ${rcId} 신규LC=${lcId} clone=${s.cloneFrom}(super=${src?.supertype} sub=${JSON.stringify(src?.subtypes)} gc=${src?.gameCardId}) ${clash?"(LC존재)":""}`);
  }

  if (!APPLY) { console.log("\n(dry-run — --apply 로 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    // 통합: EN LC에 JP RegionCard 추가
    for (const u of UNIFY) {
      const rcId = `${u.jpSet}-${u.num}`;
      const data = { cardId:u.enLc, language:"ja", region:"JP", setId:u.jpSet, number:u.num, numberInt:parseInt(u.num,10), name:JA, imageSmall:I(u.hash), imageLarge:I(u.hash), rarityId:null };
      await tx.regionCard.upsert({ where:{id:rcId}, create:{ id:rcId, ...data }, update:data });
    }
    // 단독: 신규 LC + JP RegionCard
    for (const s of STANDALONE) {
      const g = await tx.card.findUnique({ where:{id:s.cloneFrom}, select:GAME });
      const lcId = `lc-orphan-${s.jpSet}-${s.num}`, rcId = `${s.jpSet}-${s.num}`;
      const lcData = { cardPackId:s.pack, primarySetId:s.jpSet, primaryNumber:s.num, primaryNumberInt:parseInt(s.num,10),
        supertype:g!.supertype, subtypes:g!.subtypes, types:g!.types, hp:g!.hp, retreatCost:g!.retreatCost, weakness:g!.weakness,
        resistance:g!.resistance, regulationMark:g!.regulationMark, pokedexNumbers:g!.pokedexNumbers, rules:g!.rules, flavorText:g!.flavorText,
        abilities:g!.abilities??undefined, attacks:g!.attacks??undefined, legalities:g!.legalities??undefined,
        evolvesFrom:g!.evolvesFrom, evolvesTo:g!.evolvesTo, gameCardId:g!.gameCardId, nameKo:g!.nameKo, rarityId:null, illustrator:null };
      await tx.card.upsert({ where:{id:lcId}, create:{ id:lcId, ...lcData }, update:lcData });
      const rcData = { cardId:lcId, language:"ja", region:"JP", setId:s.jpSet, number:s.num, numberInt:parseInt(s.num,10), name:JA, imageSmall:I(s.hash), imageLarge:I(s.hash), rarityId:null };
      await tx.regionCard.upsert({ where:{id:rcId}, create:{ id:rcId, ...rcData }, update:rcData });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e)=>{console.error(e);process.exit(1);});
