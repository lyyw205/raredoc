// SM2+ (새로운 시련) 교정 + 시크릿 수집.
//   문제: 기본에너지 4장이 #058~061 에 잘못 들어가 있음(실제 #058~063 은 GX 무지개 자리). + 그 LC nameKo 도 스크램블됨.
//   교정: 에너지 4장을 #067~070 으로 이동(가격행 re-point 후 RC 재생성, KR 로케일·LC 보존, nameKo 정정).
//   추가: #058~066 시크릿 9장(GX HR 6 + 고집의머리띠 + 멀티갈아달기 + 골드 기본悪에너지).
// og-sm2+ 비동결. dry-run 기본, --apply 로 기록. 단일 $transaction.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const HR = "cmpp4wysu0016yjurcnv0ys4l";
const UR = "cmpp4wyzt001wyjuriy5esk1h";
const SET = "jp-tcg-sm2+";
const I = (h: string) => `https://static.tcgcollector.com/content/images/${h.slice(0,2)}/${h.slice(2,4)}/${h.slice(4,6)}/${h}.jpg`;

// 에너지 재번호: 기존RC id → {새번호, 이미지, 정정 nameKo}
const RENUM = [
  { oldId: `${SET}-058`, oldLc: `lc-jp-tcg-sm2+-058`, newNum: 67, img: I("854afe47be21d9e27937b1e3be95a22e4c9ccd441505aa245934ef4c472ca118"), ko: "기본 물 에너지" },   // 水
  { oldId: `${SET}-059`, oldLc: `lc-jp-tcg-sm2+-059`, newNum: 68, img: I("bcb4826b75ca8f405c5212c8a4b73d13600d200c7c0d7a188dd9f80f497dc613"), ko: "기본 번개 에너지" }, // 雷
  { oldId: `${SET}-060`, oldLc: `lc-jp-tcg-sm2+-060`, newNum: 69, img: I("4bd7dc63929fd8e96d3a6a744aeac3e2b5770af44956b735062d40c7e115c7dd"), ko: "기본 격투 에너지" }, // 闘
  { oldId: `${SET}-061`, oldLc: `lc-jp-tcg-sm2+-061`, newNum: 70, img: I("b98df5d08c493cf324fe110b43612bb69cbe93cc20685c120ea43e9637c447a1"), ko: "기본 악 에너지" },   // 悪
];

// 신규 시크릿 #058~066
type Add = { num: number; rarity: string; img: string; baseSet: string; baseNum: number; koOverride?: string; energyClone?: string };
const ADDS: Add[] = [
  { num: 58, rarity: HR, img: I("e9ce21e5017bae5161836834a7979336471ae22e7825cbe09910c136a19a9aa6"), baseSet: SET, baseNum: 50 }, // カプ・ブルルGX
  { num: 59, rarity: HR, img: I("d470fcac0b29479bbe47156bf90a32cff268149adc6369542c537691540976d7"), baseSet: SET, baseNum: 51 }, // エンニュートGX
  { num: 60, rarity: HR, img: I("eac25ddef6bd7fc578612152fbfb431d0241f9966ca738b6f429ccb5f868306f"), baseSet: SET, baseNum: 52 }, // カプ・レヒレGX
  { num: 61, rarity: HR, img: I("d1ee07cc032f74f45e882ad92022cfe51f011df2358fa1915aa44c82769658d8"), baseSet: SET, baseNum: 53 }, // カイリキーGX
  { num: 62, rarity: HR, img: I("57a323a306e1ff37b38b969bd83a4bb74151872f0fd2d4a38a2b11455c572ff9"), baseSet: SET, baseNum: 54 }, // ルガルガンGX
  { num: 63, rarity: HR, img: I("88b66635dba5f088284c623cd2e8e24316d74b43b20efbabb8e7e55c623d6cca"), baseSet: SET, baseNum: 55 }, // ダークライGX
  { num: 64, rarity: UR, img: I("3c652bf83d4a1e58e115baf56cfc2ba1dda8679ebe8cf200efec99906eac5c74"), baseSet: "jp-tcg-SM1+", baseNum: 49 }, // こだわりハチマキ
  { num: 65, rarity: UR, img: I("c596207961ac922f84881a4f38e9e0b3100694debbe36553bd44b744fd2e94f1"), baseSet: "jp-tcg-SM1+", baseNum: 47, koOverride: "멀티 갈아 달기" }, // マルチつけかえ
  { num: 66, rarity: UR, img: I("1bf784a7ea540e3349a42daa5cac326e89588fdafe9137ec6e1de7c038d1e9dd"), energyClone: "lc-jp-tcg-sm2+-061", koOverride: "기본 악 에너지" }, // 골드 기본悪
];

const GAME = { supertype:true, subtypes:true, types:true, hp:true, retreatCost:true, weakness:true, resistance:true,
  regulationMark:true, pokedexNumbers:true, rules:true, flavorText:true, abilities:true, attacks:true, legalities:true,
  evolvesFrom:true, evolvesTo:true, gameCardId:true, nameKo:true } as const;

async function main() {
  assertWritable(["og-sm2+"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-sm2plus-secrets" });

  // 기존 에너지 RC(이름·레어도) 읽기
  const oldRCs = await prisma.regionCard.findMany({ where:{ id:{ in: RENUM.map(r=>r.oldId) } },
    select:{ id:true, name:true, language:true, rarityId:true, _count:{select:{prices:true}} } });
  const rcMap = new Map(oldRCs.map(r=>[r.id,r]));

  // ADD 들의 base 게임데이터 읽기
  const addPlan: any[] = [];
  for (const a of ADDS) {
    let game:any, jaName:string;
    if (a.energyClone) {
      const lc = await prisma.card.findUnique({ where:{id:a.energyClone}, select:{...GAME} });
      const rc = await prisma.regionCard.findFirst({ where:{cardId:a.energyClone, region:"JP"}, select:{name:true} });
      game = lc; jaName = rc!.name;
    } else {
      const rc = await prisma.regionCard.findFirst({ where:{ setId:a.baseSet, numberInt:a.baseNum, region:"JP" }, select:{ name:true, card:{select:GAME} } });
      if (!rc) throw new Error(`base ${a.baseSet}#${a.baseNum} 없음 (#${a.num})`);
      game = rc.card; jaName = rc.name;
    }
    addPlan.push({ ...a, jaName, game: { ...game, nameKo: a.koOverride ?? game.nameKo } });
  }

  console.log(`\n=== SM2+ 교정 (${APPLY?"APPLY":"DRY-RUN"}) ===`);
  console.log("[재번호] 에너지 4장 (가격행 re-point + RC 재생성 + nameKo 정정):");
  for (const r of RENUM) { const o=rcMap.get(r.oldId)!; console.log(`  ${r.oldId} (${o?.name}) #058x → #${String(r.newNum).padStart(3,"0")}  prices=${o?._count.prices} → nameKo '${r.ko}'`); }
  console.log("[신규] 시크릿 9장:");
  for (const p of addPlan) console.log(`  #${String(p.num).padStart(3,"0")} ${p.jaName} [${p.game.supertype}] ${p.rarity===UR?"UR":"HR"} ko=${p.game.nameKo}`);

  if (!APPLY) { console.log("\n(dry-run — --apply 로 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    // 1) 에너지 재번호
    for (const r of RENUM) {
      const o = rcMap.get(r.oldId)!;
      const newId = `${SET}-${String(r.newNum).padStart(3,"0")}`;
      await tx.regionCard.create({ data: { id:newId, cardId:r.oldLc, language:o.language, region:"JP", setId:SET,
        number:String(r.newNum).padStart(3,"0"), numberInt:r.newNum, name:o.name, imageSmall:r.img, imageLarge:r.img, rarityId:o.rarityId } });
      await tx.price.updateMany({ where:{ regionCardId:r.oldId }, data:{ regionCardId:newId } });
      await tx.regionCard.delete({ where:{ id:r.oldId } });
      await tx.card.update({ where:{ id:r.oldLc }, data:{ primaryNumber:String(r.newNum).padStart(3,"0"), primaryNumberInt:r.newNum, nameKo:r.ko } });
    }
    // 2) 신규 9장
    for (const p of addPlan) {
      const lcId = `lc-orphan-${SET}-${String(p.num).padStart(3,"0")}`;
      const g = p.game;
      await tx.card.create({ data: { id:lcId, cardPackId:"og-sm2+", primarySetId:SET, primaryNumber:String(p.num).padStart(3,"0"), primaryNumberInt:p.num,
        supertype:g.supertype, subtypes:g.subtypes, types:g.types, hp:g.hp, retreatCost:g.retreatCost, weakness:g.weakness, resistance:g.resistance,
        regulationMark:g.regulationMark, pokedexNumbers:g.pokedexNumbers, rules:g.rules, flavorText:g.flavorText,
        abilities:g.abilities ?? undefined, attacks:g.attacks ?? undefined, legalities:g.legalities ?? undefined,
        evolvesFrom:g.evolvesFrom, evolvesTo:g.evolvesTo, gameCardId:g.gameCardId, nameKo:g.nameKo, rarityId:p.rarity, illustrator:null } });
      await tx.regionCard.create({ data: { id:`${SET}-${String(p.num).padStart(3,"0")}`, cardId:lcId, language:"ja", region:"JP", setId:SET,
        number:String(p.num).padStart(3,"0"), numberInt:p.num, name:p.jaName, imageSmall:p.img, imageLarge:p.img, rarityId:p.rarity } });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e)=>{ console.error(e); process.exit(1); });
