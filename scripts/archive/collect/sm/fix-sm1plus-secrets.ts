// SM1+ (썬&문 강화확장팩) 교정 + 시크릿 수집 — SM2+ 와 동일 패턴.
//   문제: 기본에너지 5장이 #059~063 에 잘못. 실제 #059~065 는 GX 무지개. + LC nameKo 가 트레이너명으로 스크램블됨.
//   교정: 에너지 5장 → #069~073 (가격 re-point, KR 보존, nameKo 정정). 추가: #059~068 (GX HR 7 + 이상한사탕 + 더블무색 + 골드기본草).
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const HR = "cmpp4wysu0016yjurcnv0ys4l", UR = "cmpp4wyzt001wyjuriy5esk1h";
const SET = "jp-tcg-SM1+";
const IMG = (h: string, ext: string) => `https://static.tcgcollector.com/content/images/${h.slice(0,2)}/${h.slice(2,4)}/${h.slice(4,6)}/${h}.${ext}`;

// 에너지 재번호 (기존 #059~063 → #069~073) — 타입 순서 草炎超鋼페어리 동일
const RENUM = [
  { oldNum: 59, newNum: 69, img: IMG("03b2ad23fd64c610e058c8ecc578ec4afe815439e5d9b030cab4897f90d56433","webp"), ko: "기본 풀 에너지" },
  { oldNum: 60, newNum: 70, img: IMG("95bae74cce869644c23fb5a9a5da32a2e36fd9e0c172d4fb8bd34b4a1a88e8fc","webp"), ko: "기본 불꽃 에너지" },
  { oldNum: 61, newNum: 71, img: IMG("718954b51bf659cde52e7a8f1a92d002bf94aa27ebfae126941f7fb3b04b687d","webp"), ko: "기본 초 에너지" },
  { oldNum: 62, newNum: 72, img: IMG("cde13e7a68dca874b640ab8072e9e6306997743b0ec27b38d148933fef9e4ca4","webp"), ko: "기본 강철 에너지" },
  { oldNum: 63, newNum: 73, img: IMG("871a1821b48875c948d1cf6d755abb8bd59e4de27876efcecab007510178b438","webp"), ko: "기본 페어리 에너지" },
];
type Add = { num: number; rarity: string; img: string; baseSet: string; baseNum: number; koOverride?: string; energyClone?: number };
const ADDS: Add[] = [
  { num: 59, rarity: HR, img: IMG("632fb9538a8bcb287880ec51541a5a0e72370bc3bccc4a3837cad2162552b30e","jpg"), baseSet: SET, baseNum: 3 },  // ジュナイパーGX
  { num: 60, rarity: HR, img: IMG("443d0ea76da324887054b96e1e0abdc131462acd3dbc4bdbd76e316a7a51e9e8","jpg"), baseSet: SET, baseNum: 9 },  // ガオガエンGX
  { num: 61, rarity: HR, img: IMG("9c153c9e47cb31da9df1d56d920b38ef97db75bb78aa85e0910a8aa8c38267b0","jpg"), baseSet: SET, baseNum: 16 }, // アシレーヌGX
  { num: 62, rarity: HR, img: IMG("69ff96190dd06f59901ecb36db2afd6d03a03bc88319bba91dffd1610f0846f3","jpg"), baseSet: SET, baseNum: 21 }, // クワガノンGX
  { num: 63, rarity: HR, img: IMG("f7ebc2ef44efe1e9748ae3813daef05f0053027be3e5886fb4dce6af33532a35","jpg"), baseSet: SET, baseNum: 26 }, // ドヒドイデGX
  { num: 64, rarity: HR, img: IMG("12292c894f8c58eb80e53d5c94c0b8e0dbdbfaeece6fb21143db038bb066a187","jpg"), baseSet: SET, baseNum: 40 }, // ニンフィアGX
  { num: 65, rarity: HR, img: IMG("b37916ef56d94ce34c9b176937bfd326c17bdbbae02a13fb6eb497f9ae144f9b","jpg"), baseSet: SET, baseNum: 42 }, // ジジーロンGX
  { num: 66, rarity: UR, img: IMG("7c09cdfc1b226c52002c5aec145130605b5ac175b34439dc84689b00fb1acbb5","jpg"), baseSet: "jp-tcg-SBD", baseNum: 11 }, // ふしぎなアメ
  { num: 67, rarity: UR, img: IMG("d275d16e81553007ac535b183b94fcbdf36344611fe9dd3899ea9748a3acd74f","jpg"), baseSet: "jp-tcg-XYE", baseNum: 22 }, // ダブル無色エネルギー
  { num: 68, rarity: UR, img: IMG("b854c49033f9c3f1733588bfd23ead09ad9cbe39a597452156d074484c3ef629","jpg"), energyClone: 59, koOverride: "기본 풀 에너지" }, // 골드 기본草
];
const GAME = { supertype:true,subtypes:true,types:true,hp:true,retreatCost:true,weakness:true,resistance:true,regulationMark:true,pokedexNumbers:true,rules:true,flavorText:true,abilities:true,attacks:true,legalities:true,evolvesFrom:true,evolvesTo:true,gameCardId:true,nameKo:true } as const;
const pad = (n:number)=>String(n).padStart(3,"0");

async function main() {
  assertWritable(["og-sm1+"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-sm1plus-secrets" });
  // 에너지 RC 읽기
  const oldEn = await prisma.regionCard.findMany({ where:{setId:SET, numberInt:{gte:59,lte:63}}, select:{id:true,numberInt:true,name:true,cardId:true,language:true,rarityId:true} });
  const enByNum = new Map(oldEn.map(r=>[r.numberInt!,r]));
  // ADD base 게임데이터
  const addPlan:any[]=[];
  for (const a of ADDS) {
    let game:any, jaName:string;
    if (a.energyClone) {
      const src = enByNum.get(a.energyClone)!;
      const lc = await prisma.card.findUnique({ where:{id:src.cardId}, select:GAME });
      game=lc; jaName=src.name;
    } else {
      const rc = await prisma.regionCard.findFirst({ where:{setId:a.baseSet, numberInt:a.baseNum, region:"JP"}, select:{name:true, card:{select:GAME}} });
      if(!rc) throw new Error(`base ${a.baseSet}#${a.baseNum} 없음`);
      game=rc.card; jaName=rc.name;
    }
    addPlan.push({ ...a, jaName, game:{...game, nameKo: a.koOverride ?? game.nameKo} });
  }
  console.log(`\n=== SM1+ 교정 (${APPLY?"APPLY":"DRY-RUN"}) ===`);
  console.log("[재번호] 에너지 5장:");
  for (const r of RENUM){ const o=enByNum.get(r.oldNum)!; console.log(`  ${o.id} (${o.name}) → #${pad(r.newNum)} nameKo '${r.ko}'`); }
  console.log("[신규] 10장:");
  for (const p of addPlan) console.log(`  #${pad(p.num)} ${p.jaName} [${p.game.supertype}] ${p.rarity===UR?"UR":"HR"} ko=${p.game.nameKo}`);
  if (!APPLY){ console.log("\n(dry-run)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx)=>{
    for (const r of RENUM) {
      const o=enByNum.get(r.oldNum)!; const newId=`${SET}-${pad(r.newNum)}`;
      await tx.regionCard.create({ data:{ id:newId, cardId:o.cardId, language:o.language, region:"JP", setId:SET, number:pad(r.newNum), numberInt:r.newNum, name:o.name, imageSmall:r.img, imageLarge:r.img, rarityId:o.rarityId } });
      await tx.price.updateMany({ where:{ regionCardId:o.id }, data:{ regionCardId:newId } });
      await tx.regionCard.delete({ where:{ id:o.id } });
      await tx.card.update({ where:{ id:o.cardId }, data:{ primaryNumber:pad(r.newNum), primaryNumberInt:r.newNum, nameKo:r.ko } });
    }
    for (const p of addPlan) {
      const lcId=`lc-orphan-${SET}-${pad(p.num)}`; const g=p.game;
      await tx.card.create({ data:{ id:lcId, cardPackId:"og-sm1+", primarySetId:SET, primaryNumber:pad(p.num), primaryNumberInt:p.num,
        supertype:g.supertype, subtypes:g.subtypes, types:g.types, hp:g.hp, retreatCost:g.retreatCost, weakness:g.weakness, resistance:g.resistance,
        regulationMark:g.regulationMark, pokedexNumbers:g.pokedexNumbers, rules:g.rules, flavorText:g.flavorText,
        abilities:g.abilities??undefined, attacks:g.attacks??undefined, legalities:g.legalities??undefined, evolvesFrom:g.evolvesFrom, evolvesTo:g.evolvesTo,
        gameCardId:g.gameCardId, nameKo:g.nameKo, rarityId:p.rarity, illustrator:null } });
      await tx.regionCard.create({ data:{ id:`${SET}-${pad(p.num)}`, cardId:lcId, language:"ja", region:"JP", setId:SET, number:pad(p.num), numberInt:p.num, name:p.jaName, imageSmall:p.img, imageLarge:p.img, rarityId:p.rarity } });
    }
  });
  console.log("\n✅ 기록 완료."); await prisma.$disconnect();
}
main().catch((e)=>{console.error(e);process.exit(1);});
