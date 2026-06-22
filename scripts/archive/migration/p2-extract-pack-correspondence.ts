// ── P2(Stage4 ident): 팩 대응표 CardPackLink + Era 추출 (additive) ──────────
// build-group.ts CONFIG(206키 = CardPack.id) → CardPackLink rows 로 DB 1급화.
//   jp[] → region=JP/role=ANCHOR  · kr[] → region=KR/role=MIRROR|NATIVE(+mirrorOfSetId/numberMirrors)
//   enNative 배열 → region=EN/role=NATIVE(enAnchor 면 EN_ONLY) · null → CROSS 마커 · [] → JP_ONLY 마커
// Era: ERA_ORDER 17 → Era row + CardPack.eraKey 백필(canonEra).
// 29 CONFIG부재 CardPack 은 그 Set 들을 직접 도출(og-sma 는 Set 0 → 마커 1행).
// ★왕복 동등성 검증(하드 게이트): rows → {jp,kr,enNative,krMirror,krMirrorAll} 재구성 deep-equal.
//   note 의 "ord=N" 토큰으로 원본 배열 순서 보존(알파정렬 불일치 케이스 존재).
// 기본 dry-run. 적용 --apply. 실행: npx tsx scripts/migration/p2-extract-pack-correspondence.ts [--apply]
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
import { CONFIG, type Cfg } from "../build-group";
import { ERA_ORDER, ERA_LABEL, canonEra } from "../../src/lib/cards/eras";

const APPLY = process.argv.includes("--apply");

type LinkRow = {
  waveId: string;
  region: string;
  setId: string | null;
  role: string;
  relationType: string;
  mirrorOfSetId: string | null;
  numberMirrors: boolean;
  note: string | null;
};

const ordTok = (i: number, rest?: string) => `ord=${i}${rest ? `;${rest}` : ""}`;
const parseOrd = (note: string | null): number => {
  if (!note) return 0;
  const m = /(?:^|;)ord=(\d+)/.exec(note);
  return m ? parseInt(m[1], 10) : 0;
};

// ── CONFIG 키 → CardPackLink rows 인코딩 ──────────────────────────────────
// numberMirrors(=krMirrorAll)는 wave 레벨 플래그. KR 행에 싣되, KR 이 빈 경우(2키:
// mega-abyss-eye/og-sm0, kr=[])도 왕복 보존되도록 모든 행에 동일 값으로 전파.
function encodeWave(waveId: string, c: Cfg): LinkRow[] {
  const rows: LinkRow[] = [];
  const nm = !!c.krMirrorAll;
  // JP 앵커
  const jpRel = c.jp.length > 1 ? "MERGE_N_TO_1" : "ONE_TO_ONE";
  c.jp.forEach((setId, i) => {
    rows.push({ waveId, region: "JP", setId, role: "ANCHOR", relationType: jpRel, mirrorOfSetId: null, numberMirrors: nm, note: ordTok(i) });
  });
  // KR
  c.kr.forEach((setId, i) => {
    const mir = c.krMirror[setId] ?? null;
    rows.push({
      waveId, region: "KR", setId,
      role: mir ? "MIRROR" : "NATIVE",
      relationType: "ONE_TO_ONE",
      mirrorOfSetId: mir, numberMirrors: nm, note: ordTok(i),
    });
  });
  // EN
  if (c.enNative === null) {
    rows.push({ waveId, region: "EN", setId: null, role: "CROSS", relationType: "CROSS", mirrorOfSetId: null, numberMirrors: nm, note: "enNative=null(교차그룹)" });
  } else if (c.enNative.length === 0) {
    rows.push({ waveId, region: "EN", setId: null, role: "JP_ONLY", relationType: "JP_ONLY", mirrorOfSetId: null, numberMirrors: nm, note: "enNative=[](영판 미수록)" });
  } else {
    const enRole = c.enAnchor ? "EN_ONLY" : "NATIVE";
    const enRel = c.enNative.length > 1 ? "SPLIT_1_TO_N" : c.enAnchor ? "EN_ONLY" : "ONE_TO_ONE";
    c.enNative.forEach((setId, i) => {
      rows.push({ waveId, region: "EN", setId, role: enRole, relationType: enRel, mirrorOfSetId: null, numberMirrors: nm, note: ordTok(i, c.enAnchor ? "enAnchor" : undefined) });
    });
  }
  return rows;
}

// ── rows → {jp,kr,enNative,krMirror,krMirrorAll,enAnchor} 재구성 (왕복) ──────
type Recon = { jp: string[]; kr: string[]; enNative: string[] | null; krMirror: Record<string, string>; krMirrorAll: boolean; enAnchor: boolean };
function reconstruct(rows: LinkRow[]): Recon {
  const jpRows = rows.filter((r) => r.region === "JP" && r.setId).sort((a, b) => parseOrd(a.note) - parseOrd(b.note));
  const krRows = rows.filter((r) => r.region === "KR" && r.setId).sort((a, b) => parseOrd(a.note) - parseOrd(b.note));
  const enRows = rows.filter((r) => r.region === "EN");
  const enSetRows = enRows.filter((r) => r.setId).sort((a, b) => parseOrd(a.note) - parseOrd(b.note));
  const crossMarker = enRows.find((r) => r.setId === null && r.role === "CROSS");
  const jpOnlyMarker = enRows.find((r) => r.setId === null && r.role === "JP_ONLY");

  let enNative: string[] | null;
  if (crossMarker) enNative = null;
  else if (jpOnlyMarker) enNative = [];
  else enNative = enSetRows.map((r) => r.setId!);

  const krMirror: Record<string, string> = {};
  for (const r of krRows) if (r.mirrorOfSetId) krMirror[r.setId!] = r.mirrorOfSetId;

  return {
    jp: jpRows.map((r) => r.setId!),
    kr: krRows.map((r) => r.setId!),
    enNative,
    krMirror,
    // wave 레벨 플래그 — 모든 행에 전파되므로 아무 행에서나 읽음(빈 kr 케이스 보존)
    krMirrorAll: rows.some((r) => r.numberMirrors),
    enAnchor: enSetRows.some((r) => r.role === "EN_ONLY"),
  };
}

function deepEqArr(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x === b[i]);
}
function deepEqRecord(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a).sort(), bk = Object.keys(b).sort();
  if (!deepEqArr(ak, bk)) return false;
  return ak.every((k) => a[k] === b[k]);
}
// CONFIG[key] 와 재구성 비교 (nameKo/nameEn/enMerged/krMerged/enCrossFallback 제외)
function roundTripEqual(c: Cfg, r: Recon): { ok: boolean; diff: string[] } {
  const diff: string[] = [];
  if (!deepEqArr(c.jp, r.jp)) diff.push(`jp: ${JSON.stringify(c.jp)} != ${JSON.stringify(r.jp)}`);
  if (!deepEqArr(c.kr, r.kr)) diff.push(`kr: ${JSON.stringify(c.kr)} != ${JSON.stringify(r.kr)}`);
  const cEn = c.enNative, rEn = r.enNative;
  if (cEn === null || rEn === null) {
    if (cEn !== rEn) diff.push(`enNative null-mismatch: ${JSON.stringify(cEn)} != ${JSON.stringify(rEn)}`);
  } else if (!deepEqArr(cEn, rEn)) diff.push(`enNative: ${JSON.stringify(cEn)} != ${JSON.stringify(rEn)}`);
  if (!deepEqRecord(c.krMirror, r.krMirror)) diff.push(`krMirror: ${JSON.stringify(c.krMirror)} != ${JSON.stringify(r.krMirror)}`);
  if (!!c.krMirrorAll !== r.krMirrorAll) diff.push(`krMirrorAll: ${!!c.krMirrorAll} != ${r.krMirrorAll}`);
  if (!!c.enAnchor !== r.enAnchor) diff.push(`enAnchor: ${!!c.enAnchor} != ${r.enAnchor}`);
  return { ok: diff.length === 0, diff };
}

async function main() {
  console.log(`【P2 CardPackLink+Era】${APPLY ? " ★APPLY" : " (dry-run)"}`);

  // ── Era 시드 + eraKey 백필 ──────────────────────────────────────────────
  const eraRows = ERA_ORDER.map((key, i) => ({ key, order: i, labelKo: ERA_LABEL[key] ?? key }));
  console.log(`\n[Era] 시드 ${eraRows.length}개: ${eraRows.map((e) => e.key).join(", ")}`);

  const packs = await prisma.cardPack.findMany({ select: { id: true, era: true } });
  const packIdSet = new Set(packs.map((p) => p.id));
  const eraKeySet = new Set<string>(ERA_ORDER as readonly string[]);
  const eraBackfill: { id: string; eraKey: string }[] = [];
  let eraNull = 0;
  for (const p of packs) {
    const ck = canonEra(p.era);
    if (eraKeySet.has(ck)) eraBackfill.push({ id: p.id, eraKey: ck });
    else { eraNull++; console.log(`  ⚠ eraKey 미등록(NULL 유지): CardPack ${p.id} era=${JSON.stringify(p.era)} -> canon=${JSON.stringify(ck)}`); }
  }
  console.log(`[Era] eraKey 백필 ${eraBackfill.length}/${packs.length} (NULL ${eraNull})`);

  // ── CONFIG 206키 → rows ────────────────────────────────────────────────
  const cfgKeys = Object.keys(CONFIG);
  let allRows: LinkRow[] = [];
  for (const k of cfgKeys) allRows.push(...encodeWave(k, CONFIG[k]));
  console.log(`\n[CONFIG] ${cfgKeys.length}키 → ${allRows.length} rows`);

  // ── 29 갭 CardPack: Set 직접 도출 ───────────────────────────────────────
  const cfgKeySet = new Set(cfgKeys);
  const gapIds = packs.map((p) => p.id).filter((id) => !cfgKeySet.has(id)).sort();
  const gapSets = await prisma.set.findMany({ where: { cardPackId: { in: gapIds } }, select: { id: true, region: true, cardPackId: true } });
  const gapByPack = new Map<string, { id: string; region: string }[]>();
  for (const s of gapSets) {
    const arr = gapByPack.get(s.cardPackId!) ?? [];
    arr.push({ id: s.id, region: s.region });
    gapByPack.set(s.cardPackId!, arr);
  }
  const gapRows: LinkRow[] = [];
  let gapZero = 0;
  for (const gid of gapIds) {
    const sets = gapByPack.get(gid) ?? [];
    if (sets.length === 0) {
      // og-sma 류: Set 0(껍데기 CardPack). 마커 1행으로 ≥1 보장.
      gapZero++;
      gapRows.push({ waveId: gid, region: "NONE", setId: null, role: "EMPTY", relationType: "EMPTY", mirrorOfSetId: null, numberMirrors: false, note: "gap: no CONFIG, no Sets (empty shell)" });
      continue;
    }
    const regions = [...new Set(sets.map((s) => s.region))];
    const multi = regions.length > 1;
    sets.forEach((s, i) => {
      const role = multi ? "NATIVE" : `${s.region}_ONLY`;
      gapRows.push({ waveId: gid, region: s.region, setId: s.id, role, relationType: multi ? "ONE_TO_ONE" : `${s.region}_ONLY`, mirrorOfSetId: null, numberMirrors: false, note: ordTok(i, "gap: derived from Sets") });
    });
  }
  console.log(`[gap] CardPack ${gapIds.length} → ${gapRows.length} rows (Set 0 껍데기 ${gapZero}: 마커행)`);
  allRows.push(...gapRows);

  // ── ★왕복 동등성 검증 (하드 게이트) ─────────────────────────────────────
  console.log(`\n[★round-trip] CONFIG ${cfgKeys.length}키 재구성 deep-equal 검사…`);
  let mismatch = 0;
  for (const k of cfgKeys) {
    const waveRows = allRows.filter((r) => r.waveId === k);
    const recon = reconstruct(waveRows);
    const { ok, diff } = roundTripEqual(CONFIG[k], recon);
    if (!ok) {
      mismatch++;
      console.log(`  ✗ ${k}:`);
      for (const d of diff) console.log(`      ${d}`);
    }
  }
  console.log(`[★round-trip] 불일치 ${mismatch}/${cfgKeys.length}키`);

  // ── 불변식 ──────────────────────────────────────────────────────────────
  console.log(`\n[불변식]`);
  // 1) 모든 waveId 가 CardPack 에 실재
  const badWave = [...new Set(allRows.map((r) => r.waveId))].filter((w) => !packIdSet.has(w));
  console.log(`  waveId 고아(CardPack 부재): ${badWave.length} ${badWave.slice(0, 10).join(",")}`);
  // 2) 모든 non-null setId/mirrorOfSetId 가 Set 에 실재
  const refSetIds = new Set<string>();
  for (const r of allRows) { if (r.setId) refSetIds.add(r.setId); if (r.mirrorOfSetId) refSetIds.add(r.mirrorOfSetId); }
  const existSets = await prisma.set.findMany({ where: { id: { in: [...refSetIds] } }, select: { id: true } });
  const existSetIds = new Set(existSets.map((s) => s.id));
  const badSet = [...refSetIds].filter((s) => !existSetIds.has(s));
  console.log(`  setId/mirrorOfSetId 고아(Set 부재): ${badSet.length} ${badSet.slice(0, 10).join(",")}`);
  // 3) CONFIG 206키 전부 ≥1 row
  const cfgNoRow = cfgKeys.filter((k) => !allRows.some((r) => r.waveId === k));
  console.log(`  CONFIG 키 0-row: ${cfgNoRow.length} ${cfgNoRow.slice(0, 10).join(",")}`);
  // 4) 29 갭 CardPack 전부 ≥1 row
  const gapNoRow = gapIds.filter((g) => !allRows.some((r) => r.waveId === g));
  console.log(`  gap CardPack 0-row: ${gapNoRow.length} ${gapNoRow.slice(0, 10).join(",")}`);
  // 5) waveId distinct == 235
  const distinctWaves = new Set(allRows.map((r) => r.waveId)).size;
  console.log(`  waveId distinct: ${distinctWaves} (기대 235=206+29)`);
  // 6) @@unique(waveId,region,setId) 충돌 사전탐지 (setId null 은 PG 에서 distinct 라 무해)
  const uniqSeen = new Map<string, number>();
  let dupNonNull = 0;
  for (const r of allRows) {
    if (r.setId === null) continue;
    const key = `${r.waveId}|${r.region}|${r.setId}`;
    uniqSeen.set(key, (uniqSeen.get(key) ?? 0) + 1);
    if (uniqSeen.get(key)! > 1) { dupNonNull++; console.log(`    dup unique: ${key}`); }
  }
  console.log(`  @@unique 충돌(non-null setId): ${dupNonNull}`);

  const gatePass = mismatch === 0 && badWave.length === 0 && badSet.length === 0 && cfgNoRow.length === 0 && gapNoRow.length === 0 && distinctWaves === 235 && dupNonNull === 0;
  console.log(`\n[GATE] ${gatePass ? "✅ PASS" : "❌ FAIL"} (round-trip ${mismatch===0?"ok":"FAIL"}, 고아 ${badWave.length+badSet.length}, 0-row ${cfgNoRow.length+gapNoRow.length}, distinct ${distinctWaves}, dup ${dupNonNull})`);

  // region 분포 미리보기
  const byRegion = new Map<string, number>();
  for (const r of allRows) byRegion.set(r.region, (byRegion.get(r.region) ?? 0) + 1);
  console.log(`[분포] total ${allRows.length} | ${[...byRegion.entries()].map(([k, v]) => `${k}:${v}`).join(" ")}`);

  if (!APPLY) { console.log("\n(dry-run — 변경 0. 게이트 통과 시 --apply 로 적용)"); await prisma.$disconnect(); return; }

  if (!gatePass) { console.error("\n❌ 게이트 미통과 — --apply 중단. 위 불일치/고아 교정 후 재시도."); await prisma.$disconnect(); process.exit(1); }

  // ── 적용 ────────────────────────────────────────────────────────────────
  const e = await prisma.era.createMany({ data: eraRows, skipDuplicates: true });
  console.log(`\n  ✅ Era 삽입 ${e.count}`);
  let bf = 0;
  for (const b of eraBackfill) { await prisma.cardPack.update({ where: { id: b.id }, data: { eraKey: b.eraKey } }); bf++; }
  console.log(`  ✅ eraKey 백필 ${bf}`);
  let ins = 0;
  for (let i = 0; i < allRows.length; i += 1000) {
    const r = await prisma.cardPackLink.createMany({ data: allRows.slice(i, i + 1000), skipDuplicates: true });
    ins += r.count;
  }
  console.log(`  ✅ CardPackLink 삽입 ${ins}`);

  // ── 적용 후 DB 검증 ──────────────────────────────────────────────────────
  const cplCount = await prisma.cardPackLink.count();
  const eraCount = await prisma.era.count();
  const dbByRegion: any[] = await prisma.$queryRawUnsafe(`SELECT region, count(*)::int c FROM "CardPackLink" GROUP BY region ORDER BY region`);
  const distinctDb: any[] = await prisma.$queryRawUnsafe(`SELECT count(DISTINCT "waveId")::int c FROM "CardPackLink"`);
  const orphanSet: any[] = await prisma.$queryRawUnsafe(`SELECT count(*)::int c FROM "CardPackLink" l WHERE l."setId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Set" s WHERE s.id=l."setId")`);
  const orphanWave: any[] = await prisma.$queryRawUnsafe(`SELECT count(*)::int c FROM "CardPackLink" l WHERE NOT EXISTS (SELECT 1 FROM "SetGroup" g WHERE g.id=l."waveId")`);
  console.log(`\n  [DB검증] Era ${eraCount} · CardPackLink ${cplCount} · waveId distinct ${distinctDb[0].c}`);
  console.log(`  [DB검증] region: ${dbByRegion.map((x) => `${x.region}:${x.c}`).join(" ")}`);
  console.log(`  [DB검증] 고아 setId ${orphanSet[0].c} · 고아 waveId ${orphanWave[0].c}`);

  // 적용 후 DB 기준 왕복 재검증 (DB rows 로 재구성)
  const dbRows = await prisma.cardPackLink.findMany({ select: { waveId: true, region: true, setId: true, role: true, relationType: true, mirrorOfSetId: true, numberMirrors: true, note: true } });
  let dbMismatch = 0;
  for (const k of cfgKeys) {
    const wr = dbRows.filter((r) => r.waveId === k) as LinkRow[];
    const { ok } = roundTripEqual(CONFIG[k], reconstruct(wr));
    if (!ok) dbMismatch++;
  }
  console.log(`  [DB검증] DB-rows 왕복 불일치 ${dbMismatch}/${cfgKeys.length}`);

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
