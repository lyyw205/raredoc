/**
 * 미연결 일본판 구시대 세트(jp-tcg-*, setGroupId=null)를 SetGroup 에 연결 (멱등).
 *
 * 실행: npm run link:jp:setgroups
 *
 * 무엇을 하나:
 *   1) region="JP" & id startsWith "jp-tcg-" & setGroupId=null 인 Set 로드 (이미 연결된 건 건드리지 않음).
 *   2) 세트당 1:1 로 JP 단독 SetGroup upsert (구시대는 합칠 EN/KR 짝이 없음).
 *      - id: `jp-tcg-{CODE}` → `og-{code소문자}` (old-group, 결정적·충돌 없는 접두사)
 *      - nameJa = Set.name(일본어), nameEn/nameKo = null (추측 금지)
 *      - releaseDate = Set.releaseDate
 *      - era = 세트 코드 접두사 → 사람이 읽을 라벨 (아래 ERA_RULES)
 *      - order = 기존 그룹 max(order) 뒤에 붙임. releaseDate 내림차순(최신 구시대 먼저, PMCG 마지막).
 *   3) 각 Set 의 setGroupId 를 새 그룹으로 update.
 *
 * 기존 SV/MEGA 그룹의 order 는 변경하지 않는다.
 */
import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";

// ── era 분류 규칙 (위에서부터 첫 매칭. 더 구체적인 접두사를 먼저 둔다) ──────────────
// code 는 `jp-tcg-` 를 뗀 원본(대소문자 유지). 접두사 매칭은 대소문자 무시.
type EraRule = { prefixes: string[]; label: string };
const ERA_RULES: EraRule[] = [
  { prefixes: ["PMCG"], label: "구판" },
  { prefixes: ["neo"], label: "네오" },
  { prefixes: ["VS"], label: "VS" },
  { prefixes: ["web"], label: "web" },
  { prefixes: ["ADV"], label: "ADV (루비·사파이어)" },
  { prefixes: ["PCG"], label: "PCG" },
  { prefixes: ["DP"], label: "DP (다이아몬드·펄)" },
  // CP1~6 은 XY 시대 컨셉팩(XY 보다 먼저 둬 'C'가 아닌 정확 매칭).
  { prefixes: ["CP"], label: "XY (컨셉팩)" },
  { prefixes: ["XY"], label: "XY" },
  // SM 계열: SMP/SM/sn 모두 썬·문 (smP/smM/smL 대비 대소문자 무시 매칭)
  { prefixes: ["SMP", "SM", "sn"], label: "SM (썬·문)" },
  // L (레전드): LL 을 L 보다 먼저 둘 필요는 없으나 명시.
  { prefixes: ["LL", "L"], label: "L (레전드)" },
  // e카드: E1..E5 (E 접두). XY 의 'E' 와 충돌하지 않음(XY 가 위에서 먼저 매칭).
  { prefixes: ["E"], label: "e카드" },
  // SV/M: 스펙 era 맵에 없음 → 코드 접두 그대로(S 규칙에 먹히지 않게 먼저 둔다).
  { prefixes: ["SV"], label: "SV" },
  { prefixes: ["M"], label: "M" },
  // S (소드·실드): SV/SM 등은 위에서 이미 걸러짐. 여기 도달하는 S* 는 소드·실드.
  { prefixes: ["S"], label: "S (소드·실드)" },
];

function classifyEra(code: string): string {
  const lc = code.toLowerCase();
  for (const rule of ERA_RULES) {
    for (const p of rule.prefixes) {
      if (lc.startsWith(p.toLowerCase())) return rule.label;
    }
  }
  // 매칭 안 되면 코드의 알파벳 접두 그대로 (예: "CP", "SV", "M")
  const m = code.match(/^[A-Za-z]+/);
  return m ? m[0] : code;
}

// 기존 합본(EN기준) 큐레이트 그룹과 중복되는 modern 분할 세트 코드 — JP 단독 og 그룹을 만들지 않는다.
// (하이브리드 정책: modern SV/MEGA 는 합본 그룹 유지, 분할 중복 제외)
const EXCLUDE_CODES = new Set(
  ["SV1S", "SV1V", "SV2D", "SV2P", "SV4K", "SV4M", "SV5K", "SV5M", "SV11B", "SV11W", "M1L", "M1S"].map((c) =>
    c.toLowerCase(),
  ),
);

async function main() {
  // 1) 대상 로드 (합본 중복 코드는 제외)
  const allSets = await prisma.set.findMany({
    where: { region: "JP", id: { startsWith: "jp-tcg-" }, setGroupId: null },
    select: { id: true, name: true, releaseDate: true },
  });
  const sets = allSets.filter(
    (s) => !EXCLUDE_CODES.has(s.id.replace(/^jp-tcg-/, "").toLowerCase()),
  );

  if (sets.length === 0) {
    console.log("대상 없음 (이미 모두 연결됨). 종료.");
    await prisma.$disconnect();
    return;
  }

  // 기존 그룹 max(order) — SV/MEGA 순서는 건드리지 않는다.
  const agg = await prisma.setGroup.aggregate({ _max: { order: true } });
  const baseOrder = (agg._max.order ?? -1) + 1;

  // releaseDate 내림차순 정렬(최신 구시대 먼저). 동일자는 id 로 안정 정렬.
  const sorted = [...sets].sort((a, b) => {
    const da = a.releaseDate?.getTime() ?? 0;
    const db = b.releaseDate?.getTime() ?? 0;
    if (db !== da) return db - da;
    return a.id.localeCompare(b.id);
  });

  let groupCount = 0;
  let linkCount = 0;
  const eraDist: Record<string, number> = {};

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const code = s.id.replace(/^jp-tcg-/, "");
    const groupId = `og-${code.toLowerCase()}`;
    const era = classifyEra(code);
    eraDist[era] = (eraDist[era] ?? 0) + 1;

    const groupData = {
      era,
      nameEn: null,
      nameJa: s.name,
      nameKo: null,
      releaseDate: s.releaseDate,
      order: baseOrder + i,
    };

    await prisma.setGroup.upsert({
      where: { id: groupId },
      create: { id: groupId, ...groupData },
      update: groupData,
    });
    groupCount++;

    await prisma.set.update({ where: { id: s.id }, data: { setGroupId: groupId } });
    linkCount++;
  }

  console.log("─".repeat(50));
  console.log(`SetGroup upsert: ${groupCount}`);
  console.log(`Set 연결: ${linkCount}`);
  console.log("era별 분포:");
  for (const [era, n] of Object.entries(eraDist).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${era}: ${n}`);
  }

  const totalGroups = await prisma.setGroup.count();
  const linkedSets = await prisma.set.count({ where: { setGroupId: { not: null } } });
  console.log(`전체 SetGroup: ${totalGroups}, setGroupId 연결된 Set: ${linkedSets}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
