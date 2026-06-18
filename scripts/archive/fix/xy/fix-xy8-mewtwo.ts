import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";
const APPLY = process.argv.includes("--apply");
const UR = "cmpp4wyzt001wyjuriy5esk1h";
const IMG_8a = "https://static.tcgcollector.com/content/images/01/34/f5/0134f5645dcba8a371429faee6b92eb2c1a3be0a3ab1d7ca2f14b971125e086d.jpg"; // フォトンウェーブ → XY8a
const IMG_8b = "https://static.tcgcollector.com/content/images/c5/db/5a/c5db5acbd0576b0b4da02b6e1b4306f58542917e789e021264cea2b90af48ba9.jpg"; // バーストボール → XY8b
const GAME = {supertype:true,subtypes:true,types:true,hp:true,retreatCost:true,weakness:true,resistance:true,regulationMark:true,pokedexNumbers:true,rules:true,flavorText:true,abilities:true,attacks:true,legalities:true,evolvesFrom:true,evolvesTo:true,gameCardId:true,nameKo:true} as const;
(async () => {
  assertWritable(["og-xy8a","og-xy8b"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool:"fix-xy8-mewtwo" });
  // base XY8a Mewtwo (#062, gc_321af78)
  const base = await prisma.regionCard.findFirst({ where:{setId:"jp-tcg-XY8a", numberInt:62, name:"ミュウツーEX"}, select:{name:true,card:{select:GAME}} });
  if (!base) throw new Error("XY8a #062 base 없음");
  const num8a = await prisma.regionCard.findFirst({ where:{setId:"jp-tcg-XY8a", numberInt:62}, select:{number:true} });
  const cur8b = await prisma.regionCard.findUnique({ where:{id:"jp-tcg-XY8b-065"}, select:{imageSmall:true} });
  console.log(`(${APPLY?"APPLY":"DRY"}) XY8b-065 이미지 교정: ${cur8b?.imageSmall?.slice(-16)} → ${IMG_8b.slice(-16)}`);
  console.log(`         XY8a-065 신규: ミュウツーEX (gc=${base.card?.gameCardId}, フォトンウェーブ) img=${IMG_8a.slice(-16)} UR`);
  if (!APPLY) { console.log("(dry-run)"); await prisma.$disconnect(); return; }
  await prisma.$transaction(async (tx)=>{
    // 1) XY8b #065 이미지 교정 (게임데이터는 이미 맞음)
    await tx.regionCard.update({ where:{id:"jp-tcg-XY8b-065"}, data:{ imageSmall:IMG_8b, imageLarge:IMG_8b } });
    // 2) XY8a #065 신규 추가
    const g = base.card!;
    await tx.card.upsert({ where:{id:"lc-orphan-jp-tcg-XY8a-065"}, update:{}, create:{ id:"lc-orphan-jp-tcg-XY8a-065", cardPackId:"og-xy8a", primarySetId:"jp-tcg-XY8a", primaryNumber:"065", primaryNumberInt:65,
      supertype:g.supertype, subtypes:g.subtypes, types:g.types, hp:g.hp, retreatCost:g.retreatCost, weakness:g.weakness, resistance:g.resistance, regulationMark:g.regulationMark, pokedexNumbers:g.pokedexNumbers, rules:g.rules, flavorText:g.flavorText, abilities:g.abilities??undefined, attacks:g.attacks??undefined, legalities:g.legalities??undefined, evolvesFrom:g.evolvesFrom, evolvesTo:g.evolvesTo, gameCardId:g.gameCardId, nameKo:g.nameKo, rarityId:UR, illustrator:null } });
    await tx.regionCard.upsert({ where:{id:"jp-tcg-XY8a-065"}, update:{ imageSmall:IMG_8a, imageLarge:IMG_8a }, create:{ id:"jp-tcg-XY8a-065", cardId:"lc-orphan-jp-tcg-XY8a-065", language:"ja", region:"JP", setId:"jp-tcg-XY8a", number:"065", numberInt:65, name:base.name, imageSmall:IMG_8a, imageLarge:IMG_8a, rarityId:UR } });
  });
  console.log("✅ 완료."); await prisma.$disconnect();
})().catch(e=>{console.error(e);process.exit(1)});
