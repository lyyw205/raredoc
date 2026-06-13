// BW 무이미지 시크릿 JP↔EN 통합 — 사용자 승인(통합).
//   collect-bw-noimg-secrets 가 만든 JP 전용 LC 중, 같은 팩에 EN 시크릿 LC(쌍둥이)가 있는 49장을:
//     1) JP RegionCard 를 EN 시크릿 LC 로 재부모(reparent)
//     2) EN LC 의 nameKo 가 비어있으면 JP LC 의 nameKo 이관(한국어명 보존)
//     3) 비워진 JP 전용 LC 삭제
//   → 한 카드 = JP+EN(+KR) 변형. 기존 EN LC(관계 보유 가능) 보존, 방금 만든 JP LC만 삭제 = 저위험.
//   EN이 다른 팩인 16장은 건드리지 않음(별도 JP 엔트리 유지).
// 비동결. dry-run 기본, --apply. 단일 $transaction. 멱등(이미 통합된 건 skip).
import "dotenv/config";
import * as fs from "node:fs";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const RESEARCH = "/tmp/claude-1000/-home-youngwoo-repos-raredoc/19b0702f-0064-4bc7-a2ef-c46d0207c733/tasks/wzbo9yd8a.output";
const PACKMAP: Record<string,string> = {
  "jp-tcg-BW1W":"og-bw1w","jp-tcg-BW3P":"og-bw3","jp-tcg-BW3H":"og-bw3h","jp-tcg-bw4":"og-bw4",
  "jp-tcg-BW5B":"og-bw5","jp-tcg-BW5D":"og-bw5d","jp-tcg-BW6F":"og-bw6","jp-tcg-BW6C":"og-bw6c",
  "jp-tcg-BW7":"og-bw7","jp-tcg-BW8S":"og-bw8","jp-tcg-BW8T":"og-bw8t",
};
const pad = (n:number)=>String(n).padStart(3,"0");

async function main() {
  const research = JSON.parse(fs.readFileSync(RESEARCH,"utf8")).result as any[];
  const affected = [...new Set(research.map(p=>PACKMAP[p.jpSet]).filter(Boolean))];
  assertWritable(affected, { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "unify-bw-jp-en-secrets" });

  const merges:any[] = [];
  const skips:string[] = [];
  for (const p of research) {
    const jp = p.jpSet, pack = PACKMAP[jp];
    for (const c of p.cards) {
      const jpRcId = `${jp}-${pad(c.number)}`, jpLcId = `lc-orphan-${jp}-${pad(c.number)}`;
      const enRc = c.enRegionCardId ? await prisma.regionCard.findUnique({ where:{id:c.enRegionCardId}, select:{cardId:true} }) : null;
      const enLcId = enRc?.cardId ?? null;
      if (!enLcId) { skips.push(`${jpRcId}: EN LC 없음`); continue; }
      if (enLcId === jpLcId) { skips.push(`${jpRcId}: 이미 통합됨`); continue; }
      const enLc = await prisma.card.findUnique({ where:{id:enLcId}, select:{cardPackId:true, nameKo:true, locales:{select:{region:true}}} });
      if (!enLc) { skips.push(`${jpRcId}: EN LC ${enLcId} 없음`); continue; }
      if (enLc.cardPackId !== pack) { skips.push(`${jpRcId}: EN ${enLcId} 다른팩(${enLc.cardPackId}) — 유지`); continue; }
      const jpRc = await prisma.regionCard.findUnique({ where:{id:jpRcId}, select:{cardId:true} });
      if (!jpRc) { skips.push(`${jpRcId}: JP RC 없음`); continue; }
      const jpLc = await prisma.card.findUnique({ where:{id:jpLcId}, select:{nameKo:true, _count:{select:{locales:true}}} });
      const alreadyJP = enLc.locales.some(l=>l.region==="JP");
      merges.push({ jpRcId, jpLcId, enLcId, pack, jpRcParent: jpRc.cardId,
        enHasJP: alreadyJP, enLocales: enLc.locales.map(l=>l.region).join("+"),
        enNameKo: enLc.nameKo, jpNameKo: jpLc?.nameKo ?? null, jpLcLocales: jpLc?._count.locales ?? 0 });
    }
  }

  console.log(`\n=== BW JP↔EN 시크릿 통합 (${APPLY?"APPLY":"DRY-RUN"}) | 병합 ${merges.length} / skip ${skips.length} ===`);
  for (const m of merges) {
    const koXfer = (!m.enNameKo && m.jpNameKo) ? ` +nameKo='${m.jpNameKo}'` : "";
    const warn = m.enHasJP ? " ⚠EN LC가 이미 JP보유!" : "";
    console.log(`  ${m.jpRcId} → ${m.enLcId} (EN로케일:${m.enLocales}${koXfer})${warn}`);
  }
  console.log(`\n--- skip (${skips.length}) ---`); for (const s of skips) console.log("  ·",s);
  const dupParent = merges.filter(m=>m.jpRcParent!==m.jpLcId);
  if (dupParent.length) console.log(`\n⚠ 예상외 부모 ${dupParent.length}건: ${dupParent.map(m=>m.jpRcId).join(", ")}`);
  const enHasJp = merges.filter(m=>m.enHasJP);
  if (enHasJp.length) console.log(`\n⚠ EN LC가 이미 JP 로케일 보유 ${enHasJp.length}건 — 검토 필요`);

  if (!APPLY) { console.log("\n(dry-run — --apply 로 기록)"); await prisma.$disconnect(); return; }
  if (enHasJp.length || dupParent.length) { console.log("\n❌ 경보 존재 — 중단."); await prisma.$disconnect(); process.exit(1); }

  let reparented=0, koXferred=0, deleted=0;
  await prisma.$transaction(async (tx) => {
    for (const m of merges) {
      await tx.regionCard.update({ where:{id:m.jpRcId}, data:{ cardId:m.enLcId } }); reparented++;
      if (!m.enNameKo && m.jpNameKo) { await tx.card.update({ where:{id:m.enLcId}, data:{ nameKo:m.jpNameKo } }); koXferred++; }
      // 비워진 orphan JP LC 삭제 (로케일 0 확인)
      const rem = await tx.regionCard.count({ where:{cardId:m.jpLcId} });
      if (rem === 0) { await tx.card.delete({ where:{id:m.jpLcId} }); deleted++; }
    }
  });
  console.log(`\n✅ 통합 완료: reparent ${reparented}, nameKo이관 ${koXferred}, orphanLC삭제 ${deleted}`);
  await prisma.$disconnect();
}
main().catch((e)=>{console.error(e);process.exit(1);});
