// card-check 스킬 — KR 트레이너/아이템 블록 정합 감사 + 재링크
//
// 왜: krMirrorAll 세트의 KR 카드는 가나다순으로 재정렬되는데, apply-kr-official 이
//   TR_JA2KO(JA→KO 사전)에 없는 이름을 만나면 번호 폴백으로 매핑한다. 사전에 한 팩의
//   이름이 여러 개 빠져 있으면 가나다 블록 전체가 통째로 어긋난다(§49/§50). 단일 카드
//   제보가 사실은 수십 장 스크램블의 빙산의 일각인 경우가 많아, 블록 전체를 전단사로 봐야 한다.
//
// 방법: JP 트레이너/에너지를 JP명으로, KR을 TR_JA2KO 역참조로 환산한 JP명으로 묶고,
//   같은 JP명끼리 번호순 zip 한다(중복명 SAR 도 regular<SAR 번호순이라 정확히 짝지어짐).
//   EN 로케일이 있으면 다리로 표시해 검증을 돕는다. 사전 미등록(JP/KR)도 함께 보고한다.
//
// 사용 (레포 루트에서):
//   npx tsx .claude/skills/card-check/scripts/audit-kr-trainers.ts --jp <jpSetId> --kr <krSetId> [--apply]
//   여러 팩 한 번에:  --pairs "jp-tcg-SVN:kr-svn,jp-sv-destined-rivals:kr-sv10"
//
// --apply: 오링크를 교정(KR locale.logicalCardId 재배정 + 해당 JP의 nameKo=KR명).
//   기본은 dry-run(보고만). EN無 불확실 쌍은 적용 전에 반드시 이미지로 직접 판정할 것(아래 ⚠).
//
// ⚠ EN 다리가 없는 캐릭터/스타디움 쌍은 사전이 틀려도 전단사가 "성공"한다(이름→이름 매핑이라).
//   적용 전, EN無 변경 쌍은 JP/KR 카드 이미지를 받아 같은 카드인지 눈으로 확인한다.
//   (references/kr-trainer-alignment.md 의 이미지 검증·webp 변환 절차 참고)

import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { TR_JA2KO } from "../../../../scripts/lib/trainer-names-jako";

const argv = process.argv.slice(2);
const flag = (name: string) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const APPLY = argv.includes("--apply");
const nrm = (s: string) => s.normalize("NFC").replace(/\s+/g, "").trim();
const KO2JA = new Map<string, string>();
for (const [ja, ko] of Object.entries(TR_JA2KO)) KO2JA.set(nrm(ko), ja);

function parsePairs(): [string, string][] {
  const p = flag("--pairs");
  if (p) return p.split(",").map((x) => x.split(":") as [string, string]);
  const jp = flag("--jp"), kr = flag("--kr");
  if (!jp || !kr) { console.error("사용: --jp <jpSet> --kr <krSet> [--apply]  또는  --pairs jp1:kr1,jp2:kr2"); process.exit(1); }
  return [[jp, kr]];
}

async function auditPair(jpSet: string, krSet: string) {
  const POKE_EXCLUDE = { supertype: { in: ["Trainer", "Energy"] } };
  const jp = await prisma.cardLocale.findMany({ where: { setId: jpSet, logicalCard: POKE_EXCLUDE }, select: { number: true, numberInt: true, name: true, logicalCardId: true }, orderBy: { numberInt: "asc" } });
  const kr = await prisma.cardLocale.findMany({ where: { setId: krSet, logicalCard: POKE_EXCLUDE }, select: { id: true, number: true, numberInt: true, name: true, logicalCardId: true }, orderBy: { numberInt: "asc" } });
  const en = await prisma.cardLocale.findMany({ where: { region: "EN", logicalCardId: { in: jp.map((j) => j.logicalCardId) } }, select: { logicalCardId: true, name: true } });
  const enBy = new Map(en.map((e) => [e.logicalCardId, e.name]));

  const jpByJa = new Map<string, typeof jp>();
  for (const j of jp) { const a = jpByJa.get(j.name) ?? []; a.push(j); jpByJa.set(j.name, a); }
  const krByJa = new Map<string, typeof kr>(); const krUnmapped: string[] = [];
  for (const k of kr) { const ja = KO2JA.get(nrm(k.name)); if (!ja) { krUnmapped.push(`KR#${k.number} ${k.name}`); continue; } const a = krByJa.get(ja) ?? []; a.push(k); krByJa.set(ja, a); }
  const jpUnmapped = jp.filter((j) => !TR_JA2KO[j.name]).map((j) => `JP#${j.number} ${j.name}(EN:${enBy.get(j.logicalCardId) ?? "—"})`);

  const mismatches: { krId: string; jpLcid: string; line: string; enBridged: boolean }[] = [];
  const nameKoFix: { lcid: string; ko: string }[] = [];
  for (const [ja, jl] of jpByJa) {
    const js = jl.slice().sort((a, b) => a.numberInt! - b.numberInt!);
    const kl = (krByJa.get(ja) ?? []).slice().sort((a, b) => a.numberInt! - b.numberInt!);
    const n = Math.min(js.length, kl.length);
    for (let i = 0; i < n; i++) {
      nameKoFix.push({ lcid: js[i].logicalCardId, ko: kl[i].name });
      if (kl[i].logicalCardId !== js[i].logicalCardId) {
        const enName = enBy.get(js[i].logicalCardId);
        mismatches.push({ krId: kl[i].id, jpLcid: js[i].logicalCardId, enBridged: !!enName,
          line: `  ✗ JP#${js[i].number} ${js[i].name}${enName ? `(EN:${enName})` : " (EN無 — 이미지 확인 필요)"}  ← 정답 KR#${kl[i].number} ${kl[i].name}` });
      }
    }
    // KR 없는 JP 잉여(SAR 등)는 사전명으로 nameKo 백필
    for (let i = n; i < js.length; i++) { const ko = TR_JA2KO[js[i].name]; if (ko) nameKoFix.push({ lcid: js[i].logicalCardId, ko }); }
  }

  console.log(`\n### ${jpSet} / ${krSet}  JP트레이너·E ${jp.length} · KR ${kr.length} · 오링크 ${mismatches.length}`);
  if (jpUnmapped.length) console.log(`  [JP 사전미등록 ${jpUnmapped.length}] ${jpUnmapped.join(" · ")}`);
  if (krUnmapped.length) console.log(`  [KR 미환산 ${krUnmapped.length}] ${krUnmapped.join(" · ")}`);
  for (const m of mismatches) console.log(m.line);
  if (!mismatches.length && !jpUnmapped.length && !krUnmapped.length) console.log("  ✓ 정상");

  const enLessChanges = mismatches.filter((m) => !m.enBridged).length;
  if (APPLY) {
    if (jpUnmapped.length || krUnmapped.length) { console.log("  ⚠ 사전 미등록이 남아 있음 — 먼저 trainer-names-jako.ts 보강 후 재실행(미등록 카드는 누락될 수 있음)."); }
    if (enLessChanges) console.log(`  ⚠ EN無 변경 ${enLessChanges}건 — 이미지로 직접 판정했는지 확인하고 적용하세요.`);
    for (const m of mismatches) await prisma.cardLocale.update({ where: { id: m.krId }, data: { logicalCardId: m.jpLcid } });
    for (const f of nameKoFix) await prisma.logicalCard.update({ where: { id: f.lcid }, data: { nameKo: f.ko } });
    console.log(`  → 적용: locale 재배정 ${mismatches.length} · nameKo ${nameKoFix.length}`);
  }
  return { mismatches: mismatches.length, dictGaps: jpUnmapped.length + krUnmapped.length };
}

(async () => {
  const pairs = parsePairs();
  let totalMm = 0, totalGap = 0;
  for (const [jp, kr] of pairs) { const r = await auditPair(jp, kr); totalMm += r.mismatches; totalGap += r.dictGaps; }
  console.log(`\n총 오링크 ${totalMm} · 사전갭 ${totalGap}${APPLY ? " (적용됨)" : " (dry-run — --apply 로 교정)"}`);
  if (totalGap && !APPLY) console.log("사전갭이 있으면 그 카드들은 감사 사각지대 — references/kr-trainer-alignment.md 절차로 보강 후 재감사.");
})().finally(() => prisma.$disconnect());
