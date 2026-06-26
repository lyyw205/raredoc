/**
 * DP1/DP4 합본 재번호 — 병합 완료 후. DP1=tcgc 합본 001-122(합본: 한 키→tcgc 1장, 양 세트 RegionCard 같은번호),
 *   DP4=반쪽별 tcgc뷰(DP4-M→Moonlit, DP4-D→Dawn). 기본E는 최대번호 뒤로 append.
 * 실행: npx tsx scripts/renumber-dp1-dp4-merge.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { readFileSync, writeFileSync } from "node:fs";
import { resolveCardDexes } from "./lib/pokeapi-names";
const SP = "/tmp/claude-1000/-home-lyyw205-repos-raredoc/351871d5-fe23-4a04-b450-81a162627087/scratchpad";
const APPLY = process.argv.includes("--apply");
type Tc = { number: string; name: string; rarity: string | null };
const norm = (s: string) => s.toLowerCase().replace(/♀/g,"f").replace(/♂/g,"m").replace(/lv\.?\s*x/g,"lvx").replace(/[^a-z0-9]/g,"");
const lvxN = (s?: string|null) => !!s && /lv\.?\s*x/i.test(s);
const enForm=(n:string):string|null=>{ if(/West Sea/i.test(n))return"west"; if(/East Sea/i.test(n))return"east"; if(/Plant Cloak/i.test(n))return"plant"; if(/Sandy Cloak/i.test(n))return"sandy"; if(/Trash Cloak/i.test(n))return"trash"; if(/Sunny/i.test(n))return"sunny"; if(/Rain Form/i.test(n))return"rain"; if(/Snow/i.test(n))return"snow"; const u=n.match(/Unown\s*\[?([A-Za-z?!])\]?/i); return u?"u:"+u[1].toUpperCase():null; };
const jpForm=(n:string):string|null=>{ if(/にしのうみ/.test(n))return"west"; if(/ひがしのうみ/.test(n))return"east"; if(/くさき/.test(n))return"plant"; if(/すなち/.test(n))return"sandy"; if(/ゴミ/.test(n))return"trash"; if(/太陽/.test(n))return"sunny"; if(/雨水/.test(n))return"rain"; if(/雪雲/.test(n))return"snow"; const u=n.match(/[\[［]([A-Za-z?!])[\]］]/); return u?"u:"+u[1].toUpperCase():null; };
const loadTc=(f:string):Tc[]=>JSON.parse(readFileSync(`${SP}/${f}.json`,"utf-8"));

async function renumberSet(setIds: string[], tcFile: string, label: string, perSet?: Record<string,string>) {
  const rcs = await prisma.regionCard.findMany({ where:{ setId:{in:setIds} }, select:{ id:true, setId:true, number:true, name:true,
    card:{ select:{ subtypes:true, pokedexNumbers:true, locales:{where:{region:"EN"},select:{name:true},take:1} } } } });
  type R = typeof rcs[number];
  const isBasic=(r:R)=>r.name.includes("基本")&&r.name.includes("エネルギー");
  const lvxR=(r:R)=>!!r.card?.subtypes?.includes("Level-Up")||lvxN(r.card?.locales?.[0]?.name);
  const dbForm=(r:R)=>jpForm(r.name)??(r.card?.locales?.[0]?.name?enForm(r.card.locales[0].name):null);
  const dbKey=(r:R)=>{ const d=(r.card?.pokedexNumbers??[]).slice().sort((x,y)=>x-y); return d.length?`${d.join("/")}|${lvxR(r)?"X":""}|${dbForm(r)??""}`:`T:${norm(r.card?.locales?.[0]?.name??r.name)}`; };
  const tcKey=(c:Tc)=>{ const d=resolveCardDexes(c.name,"en"); return d.length?`${d.slice().sort((x,y)=>x-y).join("/")}|${lvxN(c.name)?"X":""}|${enForm(c.name)??""}`:`T:${norm(c.name)}`; };
  const assign=new Map<string,string>();
  const bySet: Record<string,R[]> = {}; for(const r of rcs)(bySet[r.setId]??=[]).push(r);
  let unresolved=0, unmatched=0, tcMaxAll=0;
  if(perSet){
    for(const sid of setIds){
      const tc=loadTc(perSet[sid]); tcMaxAll=Math.max(tcMaxAll, ...tc.map(c=>parseInt(c.number,10)));
      const main=bySet[sid].filter(r=>!isBasic(r)); const byKey=new Map<string,R[]>(); for(const r of main)(byKey.get(dbKey(r))??byKey.set(dbKey(r),[]).get(dbKey(r))!).push(r);
      const used=new Set<string>();
      for(const c of tc){ const q=byKey.get(tcKey(c))?.filter(r=>!used.has(r.id)); if(q&&q.length){used.add(q[0].id);assign.set(q[0].id,c.number);} else {unresolved++;console.log(`   ⚠ ${sid} tcgc미매칭 #${c.number} ${c.name}`);} }
      const um=main.filter(r=>!used.has(r.id)); unmatched+=um.length; if(um.length)console.log(`   ⚠ ${sid} UNMATCHED: ${um.map(r=>r.number+":"+r.name).join(", ")}`);
    }
  } else {
    const tc=loadTc(tcFile); tcMaxAll=Math.max(...tc.map(c=>parseInt(c.number,10)));
    const main=setIds.flatMap(s=>bySet[s]??[]).filter(r=>!isBasic(r));
    const byKey=new Map<string,R[]>(); for(const r of main)(byKey.get(dbKey(r))??byKey.set(dbKey(r),[]).get(dbKey(r))!).push(r);
    const consumed=new Set<string>();
    for(const c of tc){ const k=tcKey(c); const g=byKey.get(k); if(g&&!consumed.has(k)){consumed.add(k);for(const r of g)assign.set(r.id,c.number);} else {unresolved++;console.log(`   ⚠ tcgc미매칭 #${c.number} ${c.name} key=${k}`);} }
    const um=main.filter(r=>!assign.has(r.id)); unmatched+=um.length; if(um.length)console.log(`   ⚠ UNMATCHED: ${um.map(r=>r.setId.slice(-4)+"#"+r.number+":"+r.name).join(", ")}`);
  }
  for(const sid of setIds){ const basics=(bySet[sid]??[]).filter(isBasic).sort((a,b)=>parseInt(a.number,10)-parseInt(b.number,10)); basics.forEach((r,i)=>assign.set(r.id,String(tcMaxAll+1+i).padStart(3,"0"))); }
  const changes=rcs.filter(r=>assign.get(r.id)&&assign.get(r.id)!==r.number).length;
  console.log(`### ${label}: RegionCard ${rcs.length} | assigned ${assign.size} | changes ${changes} | unresolved ${unresolved} unmatched ${unmatched}`);
  const ok=unresolved===0&&unmatched===0;
  if(APPLY&&ok){
    const backup=rcs.map(r=>({id:r.id,old:r.number,new:assign.get(r.id)})).filter(x=>x.new&&x.new!==x.old);
    writeFileSync(`${SP}/renumber-backup-merge-${label}.json`,JSON.stringify(backup));
    for(const r of rcs){ const nn=assign.get(r.id); if(!nn||nn===r.number)continue; await prisma.regionCard.update({where:{id:r.id},data:{number:nn,numberInt:parseInt(nn,10)}}); }
    console.log(`   ✅ applied (backup ${backup.length})`);
  } else if(APPLY) console.log(`   ⛔ skip`);
  return ok;
}
async function main(){
  console.log(`=== DP1/DP4 merge renumber ${APPLY?"★APPLY":"(dry)"} ===`);
  const a=await renumberSet(["jp-tcg-DP1D","jp-tcg-DP1P"],"p-11244","DP1");
  const b=await renumberSet(["jp-tcg-DP4M","jp-tcg-DP4D"],"","DP4",{"jp-tcg-DP4M":"p-12145","jp-tcg-DP4D":"p-12146"});
  console.log(`\n${a&&b?"✓ ok":"✗ fix"}`);
}
main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>prisma.$disconnect());
