// card-check 스킬 — 로케일 보존(conservation) 검사: "한 팩을 채우다 다른 팩을 비우지 않았나"
//
// 왜: CardLocale 에는 unique 제약이 없다(schema 824행). 그래서 merge-en-identity --apply 나
//   audit-kr-trainers --apply 가 EN/KR 로케일의 logicalCardId 를 재배정하면 그건 복사가 아니라
//   "이동"이다. 형제 팩이 같은 EN 세트를 공유하거나(하위세트 분산: s11a↔s11/s12), 가나다 블록이
//   어긋나 있으면, 이쪽 앵커에 붙이는 순간 저쪽 앵커가 그 로케일을 통째로 빼앗긴다 = 다른 팩이
//   다시 비어버린다. 빌드 JSON만 보면 작업 대상 팩은 채워져 보여서 이 손실이 안 보인다.
//
// 방법: DB 변경 직전에 전역 스냅샷(모든 CardLocale 의 소유 LC + 각 LC 의 setGroup)을 저장하고,
//   변경 직후 다시 떠서 비교한다. 소유주가 바뀐 로케일(=이동), 그 결과 한 지역 로케일을 전부 잃은
//   LC(=비어버린 카드), 그룹별 EN/KR 커버리지 증감을 보고한다. 그룹을 가로지르는 이동이 위험신호다.
//
// 사용 (레포 루트에서):
//   변경 전:  npx tsx .claude/skills/card-check/scripts/check-locale-conservation.ts --save
//   변경 후:  npx tsx .claude/skills/card-check/scripts/check-locale-conservation.ts --compare [--target <setGroupId>]
//   (스냅샷 경로 기본값 .card-check-locale-snapshot.json — 다른 경로는 --path <file>)
//
// 판정: 이동이 0건이면 DB 소유관계 불변 = 안전. 이동이 있으면 "대상 그룹 안에서의 정당한 재배치"인지
//   "다른 그룹에서 빼앗아온 도둑질"인지 사람이 판단한다 (미연결>오연결 원칙). 크로스그룹(enNative:null)
//   처럼 DB를 안 바꾸는 빌드시점 매칭은 비파괴라 여기 안 잡힌다 — 그 경우 이동 0건이 정상.

import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import * as fs from "fs";

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const val = (f: string, d?: string) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const PATH = val("--path", ".card-check-locale-snapshot.json")!;
const TARGET = val("--target"); // 의도한 작업 대상 그룹(있으면 "예상" vs "부수피해" 라벨링)

type Snapshot = {
  takenAt: string;
  locales: Record<string, string>; // cardLocaleId -> "REGION|logicalCardId"
  lcGroup: Record<string, string>; // logicalCardId -> setGroupId ("" = null)
};

async function takeSnapshot(): Promise<Snapshot> {
  const locales: Record<string, string> = {};
  const lcIds = new Set<string>();
  let cursor: string | undefined;
  const BATCH = 5000;
  for (;;) {
    const rows = await prisma.regionCard.findMany({
      select: { id: true, cardId: true, region: true },
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (!rows.length) break;
    for (const r of rows) { locales[r.id] = `${r.region}|${r.cardId}`; lcIds.add(r.cardId); }
    if (rows.length < BATCH) break;
    cursor = rows[rows.length - 1].id;
  }
  const lcGroup: Record<string, string> = {};
  const ids = [...lcIds];
  for (let i = 0; i < ids.length; i += 5000) {
    const lcs = await prisma.card.findMany({
      where: { id: { in: ids.slice(i, i + 5000) } },
      select: { id: true, cardPackId: true },
    });
    for (const lc of lcs) lcGroup[lc.id] = lc.cardPackId ?? "";
  }
  return { takenAt: new Date().toISOString(), locales, lcGroup };
}

// LC별 보유 지역 집합
function presence(s: Snapshot): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const v of Object.values(s.locales)) {
    const [r, lc] = v.split("|");
    (m.get(lc) ?? m.set(lc, new Set()).get(lc)!).add(r);
  }
  return m;
}

// 그룹별 (지역→해당 지역 로케일을 1개 이상 가진 LC 수)
function groupCoverage(s: Snapshot): Map<string, Record<string, Set<string>>> {
  const m = new Map<string, Record<string, Set<string>>>();
  for (const v of Object.values(s.locales)) {
    const [r, lc] = v.split("|");
    const g = s.lcGroup[lc] ?? "";
    if (!m.has(g)) m.set(g, { EN: new Set(), JP: new Set(), KR: new Set() });
    m.get(g)![r]?.add(lc);
  }
  return m;
}

async function save() {
  const snap = await takeSnapshot();
  fs.writeFileSync(PATH, JSON.stringify(snap));
  const localeN = Object.keys(snap.locales).length;
  const lcN = Object.keys(snap.lcGroup).length;
  console.log(`[snapshot] 저장 → ${PATH}`);
  console.log(`  CardLocale ${localeN}행 · LogicalCard ${lcN}개 · ${snap.takenAt}`);
  console.log(`  이제 DB 변경(merge-en-identity --apply / audit-kr-trainers --apply / 수동 재링크)을 수행한 뒤`);
  console.log(`  --compare 로 다시 실행해 다른 팩이 비지 않았는지 확인한다.`);
}

async function compare() {
  if (!fs.existsSync(PATH)) {
    console.error(`[compare] 스냅샷 없음: ${PATH} — 먼저 변경 전에 --save 를 실행했어야 한다.`);
    process.exitCode = 1; return;
  }
  const before: Snapshot = JSON.parse(fs.readFileSync(PATH, "utf8"));
  const after = await takeSnapshot();

  // 1) 소유주가 바뀐 로케일(=이동). 같은 region 인데 logicalCardId 가 달라진 행.
  type Move = { id: string; region: string; fromLc: string; toLc: string; fromG: string; toG: string };
  const moves: Move[] = [];
  for (const [id, bv] of Object.entries(before.locales)) {
    const av = after.locales[id];
    if (!av) continue; // 삭제는 따로 집계
    const [br, blc] = bv.split("|");
    const [ar, alc] = av.split("|");
    if (blc !== alc) {
      moves.push({ id, region: ar, fromLc: blc, toLc: alc,
        fromG: before.lcGroup[blc] ?? "", toG: after.lcGroup[alc] ?? after.lcGroup[alc] ?? "" });
    }
    void br;
  }

  // 2) 사라진/새로 생긴 로케일 행
  const removed = Object.keys(before.locales).filter((id) => !after.locales[id]);
  const added = Object.keys(after.locales).filter((id) => !before.locales[id]);

  // 3) 한 지역 로케일을 전부 잃은 LC(=비어버린 카드)
  const bp = presence(before), ap = presence(after);
  type Emptied = { lc: string; region: string; group: string };
  const emptied: Emptied[] = [];
  for (const [lc, regs] of bp) {
    const now = ap.get(lc) ?? new Set();
    for (const r of regs) if (!now.has(r)) emptied.push({ lc, region: r, group: before.lcGroup[lc] ?? "" });
  }

  // 4) 그룹별 EN/KR 커버리지 증감
  const bc = groupCoverage(before), ac = groupCoverage(after);
  const groups = new Set<string>([...bc.keys(), ...ac.keys()]);
  type GDelta = { group: string; enB: number; enA: number; krB: number; krA: number };
  const deltas: GDelta[] = [];
  for (const g of groups) {
    const b = bc.get(g) ?? { EN: new Set(), JP: new Set(), KR: new Set() };
    const a = ac.get(g) ?? { EN: new Set(), JP: new Set(), KR: new Set() };
    deltas.push({ group: g || "(null)", enB: b.EN.size, enA: a.EN.size, krB: b.KR.size, krA: a.KR.size });
  }

  // ── 보고 ──
  console.log(`\n=== 로케일 보존 검사 (변경 전 ${before.takenAt} → 후 ${after.takenAt}) ===`);

  if (moves.length === 0 && removed.length === 0) {
    console.log(`\n✅ 소유관계 이동 0건 · 로케일 삭제 0건 — DB는 변하지 않았다(안전).`);
    console.log(`   (크로스그룹 등 비파괴 빌드시점 매칭은 여기 안 잡힌다 — 이 경우 0건이 정상.)`);
  }

  // 그룹 커버리지 손실 — 핵심 헤드라인. 음수 변화 우선, 0 변화는 생략.
  const lost = deltas
    .map((d) => ({ ...d, enD: d.enA - d.enB, krD: d.krA - d.krB }))
    .filter((d) => d.enD < 0 || d.krD < 0)
    .sort((a, b) => (a.enD + a.krD) - (b.enD + b.krD));
  if (lost.length) {
    console.log(`\n🔴 커버리지가 줄어든 그룹 ${lost.length}개 (다른 팩이 비었을 수 있음):`);
    for (const d of lost) {
      const tag = TARGET && d.group === TARGET ? " ← 작업 대상(예상된 변화)" : "";
      const en = d.enD < 0 ? `EN ${d.enB}→${d.enA}(${d.enD})` : "";
      const kr = d.krD < 0 ? `KR ${d.krB}→${d.krA}(${d.krD})` : "";
      console.log(`  ${d.group}: ${[en, kr].filter(Boolean).join(" · ")}${tag}`);
    }
  }

  // 그룹을 가로지르는 이동 = 도둑질 후보. 같은 그룹 내 이동과 분리.
  const xGroup = moves.filter((m) => m.fromG !== m.toG);
  const inGroup = moves.filter((m) => m.fromG === m.toG);
  if (xGroup.length) {
    // emptied 와 교차: 빼앗긴 결과 fromLc 가 그 지역을 완전히 잃었는지
    const emptiedKey = new Set(emptied.map((e) => `${e.lc}|${e.region}`));
    console.log(`\n⚠ 그룹을 가로지른 로케일 이동 ${xGroup.length}건 (★ = 원래 LC가 그 지역을 완전히 잃음):`);
    const enr = await enrich([...new Set(xGroup.flatMap((m) => [m.fromLc, m.toLc]))]);
    for (const m of xGroup.slice(0, 60)) {
      const star = emptiedKey.has(`${m.fromLc}|${m.region}`) ? "★" : " ";
      console.log(`  ${star} [${m.region}] ${fmt(m.fromLc, m.fromG, enr)}  ──→  ${fmt(m.toLc, m.toG, enr)}`);
    }
    if (xGroup.length > 60) console.log(`  …외 ${xGroup.length - 60}건`);
  }
  if (inGroup.length) console.log(`\nℹ 같은 그룹 안에서의 이동 ${inGroup.length}건 (그룹 커버리지 불변 — 보통 정상).`);

  // 완전히 비어버린 카드 상세(그룹 가로지르지 않은 손실 포함)
  if (emptied.length) {
    const enr = await enrich(emptied.map((e) => e.lc));
    console.log(`\n🔻 한 지역 로케일을 전부 잃은 LC ${emptied.length}건:`);
    for (const e of emptied.slice(0, 60)) console.log(`  [${e.region}] ${fmt(e.lc, e.group, enr)}`);
    if (emptied.length > 60) console.log(`  …외 ${emptied.length - 60}건`);
  }

  if (removed.length) console.log(`\n🗑 사라진 CardLocale 행 ${removed.length}건 (삭제/cleanup).`);
  if (added.length) console.log(`\n➕ 새로 생긴 CardLocale 행 ${added.length}건 (신규 수집).`);

  console.log(`\n판정 가이드: ★ 또는 🔴(작업 대상 외 그룹)이 있으면 그 LC들을 search-card 로 재조회해`);
  console.log(`  정말 빼앗아온 것인지, 아니면 오연결을 바로잡아 정당히 떼어낸 것인지 이미지로 확인할 것.`);
}

// LC 라벨용 부가정보(nameKo + JP 로케일 세트/번호) 일괄 조회
async function enrich(lcIds: string[]): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  const uniq = [...new Set(lcIds)];
  for (let i = 0; i < uniq.length; i += 1000) {
    const lcs = await prisma.card.findMany({
      where: { id: { in: uniq.slice(i, i + 1000) } },
      select: { id: true, nameKo: true, primaryNumber: true,
        locales: { where: { region: "JP" }, select: { setId: true, number: true, name: true }, take: 1 } },
    });
    for (const lc of lcs) {
      const jp = lc.locales[0];
      const label = jp ? `${jp.setId}#${jp.number} ${lc.nameKo ?? jp.name ?? ""}` : (lc.nameKo ?? lc.id);
      m.set(lc.id, label.trim());
    }
  }
  return m;
}
function fmt(lc: string, group: string, enr: Map<string, string>): string {
  return `${enr.get(lc) ?? lc} {${group || "null"}}`;
}

// 스냅샷 시점의 소유관계로 되돌린다 — 오병합을 통째로 무를 때.
// 스냅샷에 있던 모든 CardLocale 의 logicalCardId 를 그때 값으로 복원한다(이동만 되돌림;
// 병합이 새로 만든 빈 orphan LC 는 이후 cleanup-empty-lc 로 정리). --apply 없으면 dry.
async function revert() {
  if (!fs.existsSync(PATH)) {
    console.error(`[revert] 스냅샷 없음: ${PATH}`); process.exitCode = 1; return;
  }
  const before: Snapshot = JSON.parse(fs.readFileSync(PATH, "utf8"));
  const DO = has("--apply");
  // 현재 상태에서 스냅샷과 owner 가 달라진 로케일만 추림
  const cur: Record<string, string> = {};
  let cursor: string | undefined; const BATCH = 5000;
  for (;;) {
    const rows = await prisma.regionCard.findMany({
      select: { id: true, cardId: true }, orderBy: { id: "asc" },
      take: BATCH, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (!rows.length) break;
    for (const r of rows) cur[r.id] = r.cardId;
    if (rows.length < BATCH) break;
    cursor = rows[rows.length - 1].id;
  }
  const fixes: { id: string; to: string }[] = [];
  for (const [id, bv] of Object.entries(before.locales)) {
    const toLc = bv.split("|").slice(1).join("|"); // logicalCardId (cuid 엔 | 없음)
    if (cur[id] !== undefined && cur[id] !== toLc) fixes.push({ id, to: toLc });
  }
  console.log(`[revert] 스냅샷 대비 소유주 바뀐 로케일 ${fixes.length}건 ${DO ? "→ 복원 실행" : "(dry — --apply 필요)"}`);
  if (!DO) { for (const f of fixes.slice(0, 20)) console.log(`  ${f.id} → ${f.to}`); if (fixes.length > 20) console.log(`  …외 ${fixes.length - 20}건`); return; }
  let n = 0;
  for (const f of fixes) { await prisma.regionCard.update({ where: { id: f.id }, data: { cardId: f.to } }); if (++n % 50 === 0) console.log(`  …${n}/${fixes.length}`); }
  console.log(`[revert] ${n}건 복원 완료. 이제 --compare 로 이동 0건을 확인하고, cleanup-empty-lc 로 빈 orphan 을 정리한다.`);
}

async function main() {
  try {
    if (has("--save")) await save();
    else if (has("--compare")) await compare();
    else if (has("--revert")) await revert();
    else {
      console.log("사용법:");
      console.log("  변경 전:  npx tsx .claude/skills/card-check/scripts/check-locale-conservation.ts --save");
      console.log("  변경 후:  npx tsx .claude/skills/card-check/scripts/check-locale-conservation.ts --compare [--target <setGroupId>]");
      console.log("  롤백:     npx tsx .claude/skills/card-check/scripts/check-locale-conservation.ts --revert [--apply]");
    }
  } finally {
    await prisma.$disconnect();
  }
}
main();
