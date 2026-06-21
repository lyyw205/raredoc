/**
 * EN Set.code 백필/교정 — tcgcollector 코드(사용자 제공 리스트) 기준. 메타데이터만.
 *   null 채움(DP/Pt/HGSS/BW/XY/SM/SWSH 다수) + 교정(PR-SV→SVP, PR-DPP→DPP, PR-NP→NP, me1 슬러그→MEG 등).
 *   dry-run 에서 이름↔코드 대조 출력으로 검증 후 적용.
 *
 * 실행: npx tsx scripts/backfill-en-set-codes.ts            (dry-run)
 *       npx tsx scripts/backfill-en-set-codes.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

// id → tcgcollector 코드
const CODE: Record<string, string> = {
  // Mega Evolution (슬러그/누락 교정)
  "en-tcg-me1": "MEG", "en-tcg-me2": "PFL", "en-tcg-me2pt5": "ASC", "en-tcg-me3": "POR",
  "en-tcg-me4": "CRI", "en-tcg-mee": "MEE", "en-tcg-mep": "MEP",
  // Scarlet & Violet 프로모 교정
  "svp": "SVP",
  // Sword & Shield
  "en-tcg-swsh12pt5": "CRZ", "en-tcg-swsh12pt5gg": "CRZ", "en-tcg-swsh12": "SIT", "en-tcg-swsh12tg": "SIT",
  "en-tcg-swsh11": "LOR", "en-tcg-swsh11tg": "LOR", "en-tcg-pgo": "PGO", "en-tcg-swsh10": "ASR",
  "en-tcg-swsh10tg": "ASR", "en-tcg-swsh9": "BRS", "en-tcg-swsh8": "FST", "en-tcg-cel25": "CEL",
  "en-tcg-cel25c": "CEL", "en-tcg-swsh7": "EVS", "en-tcg-swsh6": "CRE", "en-tcg-swsh5": "BST",
  "en-tcg-swsh45": "SHF", "en-tcg-swsh45sv": "SHF", "en-tcg-swsh4": "VIV", "en-tcg-swsh35": "CPA",
  "en-tcg-swsh3": "DAA", "en-tcg-swsh2": "RCL", "en-tcg-swsh1": "SSH", "en-tcg-swshp": "SSP",
  // Sun & Moon
  "en-tcg-sm12": "CEC", "en-tcg-sm115": "HIF", "en-tcg-sma": "HIF", "en-tcg-sm11": "UNM",
  "en-tcg-sm10": "UNB", "en-tcg-det1": "DET", "en-tcg-sm9": "TEU", "en-tcg-sm8": "LOT",
  "en-tcg-sm75": "DRM", "en-tcg-sm7": "CES", "en-tcg-sm6": "FLI", "en-tcg-sm5": "UPR",
  "en-tcg-sm4": "CIN", "en-tcg-sm35": "SLG", "en-tcg-sm3": "BUS", "en-tcg-sm2": "GRI",
  "en-tcg-sm1": "SUM", "en-tcg-smp": "SMP",
  // XY
  "en-tcg-xy12": "EVO", "en-tcg-xy11": "STS", "en-tcg-xy10": "FCO", "en-tcg-g1": "GEN",
  "en-tcg-xy9": "BKP", "en-tcg-xy8": "BKT", "en-tcg-xy7": "AOR", "en-tcg-xy6": "ROS",
  "en-tcg-dc1": "DCR", "en-tcg-xy5": "PRC", "en-tcg-xy4": "PHF", "en-tcg-xy3": "FFI",
  "en-tcg-xy2": "FLF", "en-tcg-xy1": "XY", "en-tcg-xy0": "KSS", "en-tcg-xyp": "XYP",
  // Black & White
  "en-tcg-bw11": "LTR", "en-tcg-bw10": "PLB", "en-tcg-bw9": "PLF", "en-tcg-bw8": "PLS",
  "en-tcg-bw7": "BCR", "en-tcg-dv1": "DRV", "en-tcg-bw6": "DRX", "en-tcg-bw5": "DEX",
  "en-tcg-bw4": "NXD", "en-tcg-bw3": "NVI", "en-tcg-bw2": "EPO", "en-tcg-bw1": "BLW",
  "en-tcg-bwp": "BWP",
  // HeartGold & SoulSilver (+ Call of Legends)
  "en-tcg-hgss4": "TM", "en-tcg-hgss3": "UD", "en-tcg-hgss2": "UL", "en-tcg-hgss1": "HS",
  "en-tcg-hsp": "HSP", "en-tcg-col1": "CL",
  // Platinum
  "en-tcg-pl4": "AR", "en-tcg-pl3": "SV", "en-tcg-pl2": "RR", "en-tcg-pl1": "PL",
  // Diamond & Pearl
  "en-tcg-dp7": "SF", "en-tcg-dp6": "LA", "en-tcg-dp5": "MD", "en-tcg-dp4": "GE",
  "en-tcg-dp3": "SW", "en-tcg-dp2": "MT", "en-tcg-dp1": "DP", "en-tcg-dpp": "DPP",
  // EX 프로모 교정
  "np": "NP",
};

async function main() {
  const apply = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const ids = Object.keys(CODE);
  const sets = await prisma.set.findMany({ where: { id: { in: ids }, region: "EN" }, select: { id: true, name: true, code: true, cardPackId: true } });
  const byId = new Map(sets.map((s) => [s.id, s]));
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !apply, tool: "backfill-en-set-codes" });

  let changed = 0, same = 0; const missing: string[] = [];
  for (const id of ids) {
    const s = byId.get(id);
    if (!s) { missing.push(id); continue; }
    const target = CODE[id];
    if (s.code === target) { same++; continue; }
    console.log(`${apply ? "[APPLY]" : "[DRY]"} ${id.padEnd(20)} "${s.name}"  code: ${s.code ?? "null"} → ${target}`);
    changed++;
    if (apply) await prisma.set.update({ where: { id }, data: { code: target } });
  }
  if (missing.length) console.warn(`\n⚠ 못 찾은 id(${missing.length}): ${missing.join(", ")}`);
  console.log(`\n${apply ? "완료" : "dry-run"} — 변경 ${changed} · 이미일치 ${same} · 누락 ${missing.length}`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
