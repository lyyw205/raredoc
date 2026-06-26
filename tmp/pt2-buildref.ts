import { execFile } from "node:child_process"; import { promisify } from "node:util"; import { readFileSync, writeFileSync } from "node:fs";
const ex=promisify(execFile); const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function detail(id:number){ try{ const {stdout}=await ex("curl",["-sSL","--max-time","25","-A","Mozilla/5.0",`https://www.pokemon-card.com/card-search/details.php/card/${id}/regu/all`],{maxBuffer:16*1024*1024}); return stdout as string; }catch{ return ""; } }
const ROMAJI=(p:string)=> (p.match(/\/0?\d+_[A-Z]_([A-Z0-9]+)\.(?:jpg|gif)$/)?.[1] ?? "?");
async function main(){
  // cardID 밴드 22065~22175 열거, DPt2-B 이미지만 keep
  const found:any[]=[];
  for(let id=22065; id<=22300; id++){
    const html=await detail(id);
    const m=html.match(/\/assets\/images\/card_images\/large\/DPt2-B\/[^"'\s]+\.(?:jpg|gif)/);
    if(m) found.push({cardID:id, path:m[0], romaji:ROMAJI(m[0])});
    if((id-22064)%20===0) console.log(`  ...${id} (수집 ${found.length})`);
    await sleep(300);
  }
  found.sort((a,b)=>a.cardID-b.cardID);
  console.log(`DPt2-B 수집 ${found.length}장 (cardID ${found[0]?.cardID}~${found[found.length-1]?.cardID})`);
  const db=JSON.parse(readFileSync("tmp/pt2-all.json","utf8")); // 90, 번호순
  console.log(`db ${db.length} vs official ${found.length}`);
  // 매핑: cardID 정렬 ↔ db 번호순
  const KMAP:Record<string,string>={ア:"A",イ:"I",ウ:"U",エ:"E",オ:"O",カ:"K",キ:"K",ク:"K",ケ:"K",コ:"K",ガ:"G",ギ:"G",グ:"G",ゲ:"G",ゴ:"G",サ:"S",シ:"S",ス:"S",セ:"S",ソ:"S",ザ:"Z",ジ:"J",ズ:"Z",ゼ:"Z",ゾ:"Z",タ:"T",チ:"C",ツ:"T",テ:"T",ト:"T",ダ:"D",デ:"D",ド:"D",ナ:"N",ニ:"N",ヌ:"N",ネ:"N",ノ:"N",ハ:"H",ヒ:"H",フ:"F",ヘ:"H",ホ:"H",バ:"B",ビ:"B",ブ:"B",ベ:"B",ボ:"B",パ:"P",ピ:"P",プ:"P",ペ:"P",ポ:"P",マ:"M",ミ:"M",ム:"M",メ:"M",モ:"M",ヤ:"Y",ユ:"Y",ヨ:"Y",ラ:"R",リ:"R",ル:"R",レ:"R",ロ:"R",ワ:"W",ン:"N"};
  let warn=0; const ref:any[]=[]; const n=Math.min(found.length,db.length);
  for(let i=0;i<n;i++){ const o=found[i],d=db[i]; const exp=KMAP[d.name[0]],got=o.romaji[0]; const ok=!exp||exp===got||o.romaji==="?"||/^[A-Z]/.test(d.name); if(!ok){warn++; if(warn<=15)console.log(`  ⚠ #${d.number} ${d.name} romaji=${o.romaji}`);} ref.push({number:d.number,name:d.name,imageUrl:"https://www.pokemon-card.com"+o.path,cardID:String(o.cardID),romaji:o.romaji}); }
  console.log(`romaji 휴리스틱 경고 ${warn}/${n}`);
  writeFileSync("data/collect/jp-pt2-images.json", JSON.stringify(ref,null,1)); // 전체 레퍼런스(90)
  // 누락 26 추출
  const missNums=new Set(JSON.parse(readFileSync("tmp/pt2-missing.json","utf8")).map((x:any)=>x.number));
  writeFileSync("tmp/pt2-ref-missing.json", JSON.stringify(ref.filter(r=>missNums.has(r.number)),null,1));
  console.log(`레퍼런스 ${ref.length} → data/collect/jp-pt2-images.json | 누락 ${ref.filter(r=>missNums.has(r.number)).length} → tmp/pt2-ref-missing.json`);
}
main().catch(e=>{console.error("FAIL:",e);process.exit(1);});
