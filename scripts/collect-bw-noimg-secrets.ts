// BW 무이미지 11팩 시크릿 수집 — 리서치 워크플로(wzbo9yd8a) 결과 기반.
//   JP공식은 BW 시크릿 미등재 → 식별·EN매칭은 리서치 산출물 사용. 이미지는 EN 동일카드(우리 DB en-tcg-bw*)에서 폴백.
//   각 카드: 새 LogicalCard(lc-orphan-{jpSet}-{num3}) + JP RegionCard, 게임데이터는 JP본문(baseLcId) 우선·없으면 EN동일카드 LC 복제.
//   이미지 우선순위: enRegionCardId 의 우리 DB imageSmall/Large → 없으면 리서치 enImageUrl(외부) → 없으면 null(보고).
// 비동결 11팩. dry-run 기본(검증+리포트), --apply 로 기록. 단일 $transaction. 멱등 upsert.
import "dotenv/config";
import * as fs from "node:fs";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const RESEARCH = "/tmp/claude-1000/-home-youngwoo-repos-raredoc/19b0702f-0064-4bc7-a2ef-c46d0207c733/tasks/wzbo9yd8a.output";
const RARITY: Record<string,string> = { SR: "cmpp4wyyk001ryjurevrx3dq0", UR: "cmpp4wyzt001wyjuriy5esk1h" };
const PACKMAP: Record<string,string> = {
  "jp-tcg-BW1W":"og-bw1w","jp-tcg-BW3P":"og-bw3","jp-tcg-BW3H":"og-bw3h","jp-tcg-bw4":"og-bw4",
  "jp-tcg-BW5B":"og-bw5","jp-tcg-BW5D":"og-bw5d","jp-tcg-BW6F":"og-bw6","jp-tcg-BW6C":"og-bw6c",
  "jp-tcg-BW7":"og-bw7","jp-tcg-BW8S":"og-bw8","jp-tcg-BW8T":"og-bw8t",
};
const GAME = { supertype:true, subtypes:true, types:true, hp:true, retreatCost:true, weakness:true, resistance:true,
  regulationMark:true, pokedexNumbers:true, rules:true, flavorText:true, abilities:true, attacks:true, legalities:true,
  evolvesFrom:true, evolvesTo:true, gameCardId:true, nameKo:true } as const;
const pad = (n:number)=>String(n).padStart(3,"0");

async function main() {
  // 레어도 id 확인
  for (const [k,id] of Object.entries(RARITY)) {
    const r = await prisma.rarity.findUnique({ where:{id}, select:{code:true} });
    if (!r) throw new Error(`rarity ${k}=${id} DB 없음`);
  }
  const research = JSON.parse(fs.readFileSync(RESEARCH,"utf8")).result as any[];
  const packs = research.map(p => ({ jp:p.jpSet, pack:PACKMAP[p.jpSet], cards:p.cards as any[] }));
  const affected = [...new Set(packs.map(p=>p.pack))];
  assertWritable(affected, { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-bw-noimg-secrets" });

  const plan:any[] = [];
  const problems:string[] = [];
  for (const { jp, pack, cards } of packs) {
    if (!pack) { problems.push(`${jp}: PACKMAP 없음`); continue; }
    for (const c of cards) {
      const rcId = `${jp}-${pad(c.number)}`, lcId = `lc-orphan-${jp}-${pad(c.number)}`;
      // EN 매칭 카드 (우리 DB 우선)
      const en = c.enRegionCardId ? await prisma.regionCard.findUnique({ where:{id:c.enRegionCardId}, select:{imageSmall:true,imageLarge:true,cardId:true} }) : null;
      let imgS = en?.imageSmall ?? null, imgL = en?.imageLarge ?? en?.imageSmall ?? null, imgSrc = en?.imageSmall ? "DB(EN)" : "";
      if (!imgS && c.enImageUrl) { imgS = c.enImageUrl; imgL = c.enImageUrl; imgSrc = "리서치URL"; }
      if (!imgS) problems.push(`${rcId} ${c.jaName}: EN이미지 없음(enRegionCardId=${c.enRegionCardId})`);
      // 게임데이터 복제원: JP본문 baseLcId 우선 → 없으면 EN동일카드 LC
      let cloneFrom = "", cloneKind = "";
      if (c.baseLcId) {
        const b = await prisma.card.findUnique({ where:{id:c.baseLcId}, select:{id:true} });
        if (b) { cloneFrom=c.baseLcId; cloneKind="JP본문"; } else problems.push(`${rcId}: baseLcId ${c.baseLcId} 없음`);
      }
      if (!cloneFrom && en?.cardId) { const e=await prisma.card.findUnique({where:{id:en.cardId},select:{id:true}}); if(e){cloneFrom=en.cardId;cloneKind="EN-LC";} }
      if (!cloneFrom) { problems.push(`${rcId} ${c.jaName}: 게임데이터 복제원 없음`); continue; }
      const src = await prisma.card.findUnique({ where:{id:cloneFrom}, select:GAME });
      // nameKo: 복제원에 있으면 사용, 없으면 동일 gameCardId 의 다른 카드에서 보강
      let nameKo = src?.nameKo ?? null;
      if (!nameKo && src?.gameCardId) {
        const alt = await prisma.card.findFirst({ where:{ gameCardId:src.gameCardId, nameKo:{not:null} }, select:{nameKo:true} });
        nameKo = alt?.nameKo ?? null;
      }
      const rarityId = RARITY[c.rarity as string];
      if (!rarityId) problems.push(`${rcId}: 레어도 '${c.rarity}' 매핑 없음`);
      plan.push({ jp, pack, rcId, lcId, num:c.number, jaName:c.jaName, enName:c.enName, rarity:c.rarity, rarityId,
        cloneFrom, cloneKind, game:src, nameKo, imgS, imgL, imgSrc });
    }
  }

  console.log(`\n=== BW 무이미지 시크릿 수집 (${APPLY?"APPLY":"DRY-RUN"}) | ${plan.length}장 / ${affected.length}팩 ===`);
  let curPack = "";
  for (const p of plan) {
    if (p.jp !== curPack) { curPack = p.jp; console.log(`\n[${p.pack} / ${p.jp}]`); }
    console.log(`  #${pad(p.num)} ${p.rarity} ${p.jaName}/${p.enName} | clone=${p.cloneKind}(${p.game?.supertype}) gc=${p.game?.gameCardId??"null"} ko=${p.nameKo??"∅"} img=${p.imgSrc}`);
  }
  console.log(`\n복제: JP본문 ${plan.filter(p=>p.cloneKind==="JP본문").length} · EN-LC ${plan.filter(p=>p.cloneKind==="EN-LC").length} | 이미지: DB ${plan.filter(p=>p.imgSrc==="DB(EN)").length} · 리서치URL ${plan.filter(p=>p.imgSrc==="리서치URL").length}`);
  console.log(`\n=== PROBLEMS (${problems.length}) ===`); for (const p of problems) console.log("  ⚠",p);

  if (!APPLY) { console.log("\n(dry-run — --apply 로 기록)"); await prisma.$disconnect(); return; }
  if (problems.length) { console.log("\n❌ PROBLEMS 존재 — 기록 중단(먼저 해결)."); await prisma.$disconnect(); process.exit(1); }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const g = p.game;
      const lcData = {
        cardPackId: p.pack, primarySetId: p.jp, primaryNumber: pad(p.num), primaryNumberInt: p.num,
        supertype:g.supertype, subtypes:g.subtypes, types:g.types, hp:g.hp, retreatCost:g.retreatCost, weakness:g.weakness,
        resistance:g.resistance, regulationMark:g.regulationMark, pokedexNumbers:g.pokedexNumbers, rules:g.rules, flavorText:g.flavorText,
        abilities:g.abilities??undefined, attacks:g.attacks??undefined, legalities:g.legalities??undefined,
        evolvesFrom:g.evolvesFrom, evolvesTo:g.evolvesTo, gameCardId:g.gameCardId, nameKo:p.nameKo, rarityId:p.rarityId, illustrator:null,
      };
      await tx.card.upsert({ where:{id:p.lcId}, create:{ id:p.lcId, ...lcData }, update:lcData });
      const rcData = { cardId:p.lcId, language:"ja", region:"JP", setId:p.jp, number:pad(p.num), numberInt:p.num,
        name:p.jaName, imageSmall:p.imgS, imageLarge:p.imgL, rarityId:p.rarityId };
      await tx.regionCard.upsert({ where:{id:p.rcId}, create:{ id:p.rcId, ...rcData }, update:rcData });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e)=>{console.error(e);process.exit(1);});
