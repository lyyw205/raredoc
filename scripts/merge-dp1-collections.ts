/**
 * DP1 다이아몬드/펄 컬렉션 합본 — jp-tcg-DP1D(125) + jp-tcg-DP1P(126, 공유121) → 단일 jp-tcg-DP1 "時空の創造"(130).
 *   tcgc/EN은 DP1을 단일 "Space-Time Creation"으로 봄. 공유121 dedupe(D측 유지), 전용(D4+P5) 보존. Card 정체성 손실 0.
 *   RegionCard.id 유지(setId만 변경)→PrintVariant FK 안전. DP는 비잠금. dry: (무인자)  적용: --apply
 */
import "dotenv/config"; import {prisma} from "../src/lib/prisma";
const APPLY=process.argv.includes("--apply");
const P_ONLY=["036","051","072","105","106"]; // 펄 전용 번호
async function main(){
 console.log(`${APPLY?"APPLY":"DRY"} merge-dp1`);
 const d=await prisma.set.findUnique({where:{id:"jp-tcg-DP1D"},select:{logoUrl:true,symbolUrl:true,releaseDate:true}});
 if(!d) throw new Error("DP1D 없음(이미 합본?)");
 const dCount=await prisma.regionCard.count({where:{setId:"jp-tcg-DP1D"}});
 const pOnlyCount=await prisma.regionCard.count({where:{setId:"jp-tcg-DP1P",number:{in:P_ONLY}}});
 const pDupCount=await prisma.regionCard.count({where:{setId:"jp-tcg-DP1P",number:{notIn:P_ONLY}}});
 console.log(`이동: DP1D ${dCount} + DP1P전용 ${pOnlyCount} → jp-tcg-DP1 | 삭제: DP1P중복 ${pDupCount}`);
 console.log(`예상 합본 카드수: ${dCount+pOnlyCount}`);
 if(!APPLY){ console.log("--apply 로 실행"); await prisma.$disconnect(); return; }

 // 1. 합본 세트 생성
 await prisma.set.create({data:{id:"jp-tcg-DP1",name:"時空の創造",nameKo:"시공의 창조",code:"DP1",series:"DP",region:"JP",packType:"expansion",cardPackId:"og-dp1",releaseDate:d.releaseDate,cardCount:dCount+pOnlyCount,logoUrl:d.logoUrl,symbolUrl:d.symbolUrl}});
 // 2. DP1D RegionCard 전부 이동
 const m1=await prisma.regionCard.updateMany({where:{setId:"jp-tcg-DP1D"},data:{setId:"jp-tcg-DP1"}});
 // 3. DP1P 전용 이동
 const m2=await prisma.regionCard.updateMany({where:{setId:"jp-tcg-DP1P",number:{in:P_ONLY}},data:{setId:"jp-tcg-DP1"}});
 // 4. Card.primarySetId 재지정
 const c1=await prisma.card.updateMany({where:{primarySetId:{in:["jp-tcg-DP1D","jp-tcg-DP1P"]}},data:{primarySetId:"jp-tcg-DP1"}});
 // 5. CardPackLink 앵커 재지정 (DP1D→DP1)
 const cpl=await prisma.cardPackLink.updateMany({where:{setId:"jp-tcg-DP1D"},data:{setId:"jp-tcg-DP1"}});
 // 6. DP1P 잔여(중복121) 삭제 — PrintVariant cascade
 const del=await prisma.regionCard.deleteMany({where:{setId:"jp-tcg-DP1P"}});
 // 7. 빈 세트 삭제
 await prisma.set.delete({where:{id:"jp-tcg-DP1D"}});
 await prisma.set.delete({where:{id:"jp-tcg-DP1P"}});
 const final=await prisma.regionCard.count({where:{setId:"jp-tcg-DP1"}});
 await prisma.set.update({where:{id:"jp-tcg-DP1"},data:{cardCount:final}});
 console.log(`✓ 이동 DP1D ${m1.count}+전용 ${m2.count} | primarySet재지정 ${c1.count} | CPL ${cpl.count} | DP1P삭제 ${del.count} | 최종 jp-tcg-DP1 = ${final}장`);
}
main().then(()=>prisma.$disconnect()).catch(e=>{console.error("FAIL:",e);prisma.$disconnect();process.exit(1)});
