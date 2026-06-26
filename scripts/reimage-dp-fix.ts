/**
 * DP 재번호 세트 이미지 키-손상 수정 — renumber가 imageLarge 키를 옛 번호로 남겨,
 * 채운 이미지가 stale 키를 덮어 기존 카드 이미지가 깨진 문제 전면 수정.
 * 전 카드를 현재번호 키로 재이미지: 비기본=tcgc 현재번호(imgmap), 기본=현 R2 회수(선버퍼).
 * 실행: npx tsx scripts/reimage-dp-fix.ts [--set=DP5A] [--apply]
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "@/lib/r2";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import sharp from "sharp";

const SP = "/tmp/claude-1000/-home-lyyw205-repos-raredoc/351871d5-fe23-4a04-b450-81a162627087/scratchpad";
const APPLY = process.argv.includes("--apply");
const ONLY = process.argv.find((a) => a.startsWith("--set="))?.split("=")[1];
const SETS = [
  { key:"DP2",  set:"jp-tcg-DP2",  pack:"og-dp2",  map:"11210" },
  { key:"DP3",  set:"jp-tcg-DP3",  pack:"og-dp3",  map:"11231" },
  { key:"DP5H", set:"jp-tcg-DP5H", pack:"og-dp5",  map:"11255" },
  { key:"DP5A", set:"jp-tcg-DP5A", pack:"og-dp5a", map:"11200" },
  { key:"DP1D", set:"jp-tcg-DP1D", pack:"og-dp1",  map:"11244" },
  { key:"DP1P", set:"jp-tcg-DP1P", pack:"og-dp1",  map:"11244" },
  { key:"DP4M", set:"jp-tcg-DP4M", pack:"og-dp4",  map:"12145" },
  { key:"DP4D", set:"jp-tcg-DP4D", pack:"og-dp4",  map:"12146" },
].filter((s) => !ONLY || s.key === ONLY);

const isBasic = (n: string) => n.includes("基本") && n.includes("エネルギー");
async function dl(url: string): Promise<Buffer> {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

async function run(s: typeof SETS[number]) {
  const imgmap: Record<string,{name:string,url:string}> = JSON.parse(readFileSync(`${SP}/imgmap-${s.map}.json`,"utf-8"));
  const rcs = await prisma.regionCard.findMany({ where:{ setId:s.set }, orderBy:{numberInt:"asc"}, select:{ id:true, number:true, name:true, imageLarge:true } });
  console.log(`\n### ${s.key} (${s.set}) — ${rcs.length}장 재이미지 ${APPLY?"★APPLY":"(dry)"}`);
  // 1) 전 소스 버퍼 선확보 (기본=현 R2 먼저 회수)
  const bufs = new Map<string, Buffer>(); const errs: string[] = [];
  for (const r of rcs) {
    try {
      if (isBasic(r.name)) {
        if (!r.imageLarge) { errs.push(`#${r.number} ${r.name}: 기본E 이미지없음(skip)`); continue; }
        bufs.set(r.id, await dl(r.imageLarge)); // 현 R2 회수
      } else {
        const m = imgmap[r.number];
        if (!m) { errs.push(`#${r.number} ${r.name}: imgmap 없음`); continue; }
        bufs.set(r.id, await dl(m.url)); // tcgc 현재번호
      }
    } catch (e: any) { errs.push(`#${r.number} ${r.name}: ${e.message}`); }
  }
  console.log(`   버퍼확보 ${bufs.size}/${rcs.length}${errs.length?` | 오류 ${errs.length}: ${errs.slice(0,5).join(" / ")}`:""}`);
  // 2) md5 중복 사전체크(소스단)
  const md5s = new Map<string,string[]>();
  for (const r of rcs) { const b=bufs.get(r.id); if(!b)continue; const h=createHash("md5").update(b).digest("hex"); (md5s.get(h)??md5s.set(h,[]).get(h)!).push(`#${r.number}`); }
  const dups=[...md5s.values()].filter(v=>v.length>1);
  if (dups.length) console.log(`   ⚠ 소스 중복 ${dups.length}: ${dups.slice(0,6).map(v=>v.join("=")).join(", ")}`);
  else console.log(`   ✓ 소스 전부 고유(중복 0)`);
  // 3) 업로드 + DB갱신
  if (APPLY) {
    let ok=0;
    for (const r of rcs) {
      const b = bufs.get(r.id); if (!b) continue;
      const largeKey = r2KeyFor(s.pack, "ja", "large", s.set, r.number, "jpg");
      const smallKey = r2KeyFor(s.pack, "ja", "small", s.set, r.number, "webp");
      const large = await sharp(b).jpeg({ quality: 90 }).toBuffer();
      const small = await sharp(b).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      await uploadBuffer(largeKey, large, "image/jpeg");
      await uploadBuffer(smallKey, small, "image/webp");
      if (!(await headExists(largeKey))) { console.log(`   ✗ #${r.number} head실패`); continue; }
      await prisma.regionCard.update({ where:{ id:r.id }, data:{ imageLarge: r2PublicUrl(largeKey), imageSmall: r2PublicUrl(smallKey) } });
      ok++;
    }
    console.log(`   ✅ 재이미지 ${ok}/${rcs.length}`);
  }
}
async function main() {
  console.log(`=== DP 이미지 키-손상 수정 ${APPLY?"★APPLY":"(dry-run)"} ===`);
  for (const s of SETS) await run(s);
}
main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>prisma.$disconnect());
