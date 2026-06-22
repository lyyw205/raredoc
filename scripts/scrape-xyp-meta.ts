/**
 * XY-P 타입/단계 enrich용 메타 스크랩 — Limitless JP 상세페이지에서 구조화 추출 → data/collect/jp-xyp-meta.json.
 *   card-text-type → supertype + stage("Pokémon - Basic" / "Mega Evolution" / "BREAK Evolution" / "Restored" / "Trainer - Supporter" / "Energy - Special Energy")
 *   card-text-title → "{name} - {Type} - {HP} HP" (포켓몬 타입·HP)
 *   이름이 EX로 끝나면 subtype "EX" 추가(DB 관례: Basic+EX / MEGA+EX). BREAK=["BREAK"] 단독.
 * 수집과 동일 소스(번호정렬 보장). 전사 위험 0. JSON 생성만(적재는 load-xyp-meta.ts).
 * Run: npx tsx scripts/scrape-xyp-meta.ts
 */
import { writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);
const CODE = "XYP", OUT = "data/collect/jp-xyp-meta.json", DELAY = 250;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TYPES = ["Grass","Fire","Water","Lightning","Psychic","Fighting","Darkness","Metal","Fairy","Dragon","Colorless"];

async function curlText(url: string): Promise<string> {
  const { stdout } = await execFileP("curl", ["-sSL","--max-time","30","-A","Mozilla/5.0", url], { maxBuffer: 32*1024*1024 });
  return stdout;
}
const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();

function block(html: string, cls: string): string | null {
  const m = html.match(new RegExp(`<p class="${cls}">([\\s\\S]*?)</p>`, "i"));
  return m ? strip(m[1]) : null;
}
const STAGE: Record<string,string> = {
  "Basic":"Basic","Stage 1":"Stage 1","Stage 2":"Stage 2",
  "Mega Evolution":"MEGA","BREAK Evolution":"BREAK","Restored":"Restored",
  "Supporter":"Supporter","Item":"Item","Stadium":"Stadium","Pokémon Tool":"Pokémon Tool","Tool":"Pokémon Tool",
  "Special Energy":"Special","Basic Energy":"",
};

type Meta = { number: string; numberInt: number; name: string; supertype: string|null; subtypes: string[]; types: string[]; hp: number|null; raw: string };

function parse(html: string, n: number): Meta | null {
  const typeBlk = block(html, "card-text-type");           // "Pokémon - Basic" 등
  const titleBlk = block(html, "card-text-title");         // "リーフィアEX - Grass - 170 HP"
  if (!typeBlk) return null;
  const segs = typeBlk.split(" - ").map((s) => s.trim());
  let supertype: string|null = null;
  if (/^Pok/i.test(segs[0])) supertype = "Pokémon";
  else if (/^Trainer/i.test(segs[0])) supertype = "Trainer";
  else if (/^Energy/i.test(segs[0])) supertype = "Energy";
  const stageRaw = segs[1] ?? "";
  const stage = STAGE[stageRaw] ?? (STAGE[stageRaw.replace(/ Evolution$/,"")] ?? "");
  const name = titleBlk ? titleBlk.split(" - ")[0].trim() : "";

  const subtypes: string[] = [];
  if (stage) subtypes.push(stage);
  if (supertype === "Pokémon" && /EX$/.test(name) && stage !== "BREAK") subtypes.push("EX");

  let types: string[] = [], hp: number|null = null;
  if (supertype === "Pokémon" && titleBlk) {
    const tm = titleBlk.match(new RegExp(`-\\s*(${TYPES.join("|")})\\s*-\\s*(\\d+)\\s*HP`));
    if (tm) { types = [tm[1]]; hp = parseInt(tm[2],10); }
    else { // HP 없는 변형: 타입만
      const t2 = titleBlk.match(new RegExp(`-\\s*(${TYPES.join("|")})(\\s|$)`));
      if (t2) types = [t2[1]];
      const h2 = titleBlk.match(/(\d+)\s*HP/); if (h2) hp = parseInt(h2[1],10);
    }
  }
  return { number: String(n).padStart(3,"0"), numberInt: n, name, supertype, subtypes, types, hp, raw: typeBlk };
}

async function main() {
  console.log(`■ XY-P 메타 스크랩 (Limitless JP 상세) → ${OUT}`);
  const listHtml = await curlText(`https://limitlesstcg.com/cards/jp/${CODE}`);
  const nums = [...new Set([...listHtml.matchAll(new RegExp(`href="/cards/jp/${CODE}/(\\d+)"`,"g"))].map((m)=>parseInt(m[1],10)))].sort((a,b)=>a-b);
  console.log(`  ${nums.length}장`);
  const out: Meta[] = [];
  let noType=0, noSuper=0;
  for (let i=0;i<nums.length;i++){
    const n=nums[i];
    let html:string; try{ html=await curlText(`https://limitlesstcg.com/cards/jp/${CODE}/${n}`); }catch{ console.warn(`⚠ #${n} fetch fail`); continue; }
    const m=parse(html,n);
    if(!m){ noType++; console.warn(`⚠ #${n} type-block 없음`); continue; }
    if(!m.supertype) noSuper++;
    out.push(m);
    if((i+1)%50===0) console.log(`  …${i+1}/${nums.length} (예: #${n} ${m.supertype}/${m.subtypes.join("+")||"-"}/${m.types.join("")||"-"}${m.hp?` HP${m.hp}`:""})`);
    await sleep(DELAY);
  }
  writeFileSync(OUT, JSON.stringify(out,null,1));
  const byST: Record<string,number> = {}; out.forEach((m)=>byST[m.supertype||"null"]=(byST[m.supertype||"null"]||0)+1);
  console.log(`✅ ${out.length}장 | supertype ${JSON.stringify(byST)} | type-block실패 ${noType} | supertype실패 ${noSuper}`);
  console.log(`   포켓몬 타입有 ${out.filter((m)=>m.types.length).length} · subtype有 ${out.filter((m)=>m.subtypes.length).length} · HP有 ${out.filter((m)=>m.hp).length}`);
}
main().catch((e)=>{ console.error("FAIL:",e?.message??e); process.exit(1); });
