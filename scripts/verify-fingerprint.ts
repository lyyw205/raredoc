/**
 * 정체성-지문 검증기 (읽기전용) — 그룹 JSON의 JP↔EN 매칭이 *진짜 같은 카드*인지
 * dex 너머의 강한 신호로 교차검증. dex+일러 충돌(같은 일러가 시대·폼 가로질러 그림)을 잡는다.
 *   신호: ① 이름 폼토큰(파르데아/Paldean 등) 일치 ② 타입 교집합 ③ HP 일치 ④ 발매 era 근접
 *   (HP/타입은 DB 적재분; EN attacks 미적재라 데미지 지문은 후속.)
 *
 * 실행: npx tsx scripts/verify-fingerprint.ts <groupId>
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const FORM: [RegExp, string][] = [
  [/パルデア|paldean/i, "paldean"], [/ガラル|galarian/i, "galarian"],
  [/アローラ|alolan/i, "alolan"], [/ヒスイ|hisuian/i, "hisuian"], [/ガラルの|galar/i, "galarian"],
];
const formKey = (name: string) => { for (const [re, k] of FORM) if (re.test(name)) return k; return "—"; };
const days = (a?: Date | null, b?: Date | null) => (a && b ? Math.abs(a.getTime() - b.getTime()) / 86400000 : null);

async function main() {
  const gid = process.argv[2];
  if (!gid) { console.error("usage: verify-fingerprint.ts <groupId>"); process.exit(1); }
  const p = join(process.cwd(), "src", "data", `group-${gid}.json`);
  if (!existsSync(p)) { console.error(`no json: group-${gid}.json`); process.exit(1); }
  const d = JSON.parse(readFileSync(p, "utf8"));
  const anchors = d.anchors.filter((a: any) => a.en); // EN 붙은 앵커만 검증

  const ids = [...new Set(anchors.flatMap((a: any) => [a.jp.id, a.en.id]))] as string[];
  const locs = await prisma.cardLocale.findMany({ where: { id: { in: ids } },
    select: { id: true, region: true, setId: true, name: true, number: true, logicalCard: { select: { hp: true, types: true, retreatCost: true, supertype: true } } } });
  const byId = new Map(locs.map((l) => [l.id, l]));
  const setIds = [...new Set(locs.map((l) => l.setId))];
  const rel = new Map((await prisma.set.findMany({ where: { id: { in: setIds } }, select: { id: true, releaseDate: true } })).map((s) => [s.id, s.releaseDate]));

  const ERA_CUTOFF = 1460; // 4년 — TCG 시대 구분(이보다 멀면 '딴 시대 카드' 의심; 미세조정은 폼/타입/HP가 담당)
  let chk = 0; const suspects: string[] = []; const eraFar: string[] = [];
  for (const a of anchors) {
    const jp = byId.get(a.jp.id), en = byId.get(a.en.id);
    if (!jp || !en) continue;
    chk++;
    const reasons: string[] = [];
    // ① 폼토큰
    const fj = formKey(jp.name), fe = formKey(en.name);
    if (fj !== fe) reasons.push(`폼 [${jp.name}=${fj} ≠ ${en.name}=${fe}]`);
    // ② 타입 교집합
    const tj = jp.logicalCard.types ?? [], te = en.logicalCard.types ?? [];
    if (tj.length && te.length && !tj.some((t) => te.includes(t))) reasons.push(`타입 [JP ${tj} ≠ EN ${te}]`);
    // ③ HP
    const hj = jp.logicalCard.hp, he = en.logicalCard.hp;
    if (hj != null && he != null && hj !== he) reasons.push(`HP [JP ${hj} ≠ EN ${he}]`);
    // ④ era 근접
    const dd = days(rel.get(jp.setId), rel.get(en.setId));
    if (dd != null && dd > ERA_CUTOFF) eraFar.push(`  JP#${a.jp.number} ${jp.name} ↔ EN ${en.setId}#${en.number} ${en.name} (Δ${Math.round(dd / 30)}개월)`);
    if (reasons.length) suspects.push(`  ✗ JP#${a.jp.number} ${jp.name} ↔ EN ${en.setId}#${en.number} ${en.name}: ${reasons.join(" · ")}`);
  }
  console.log(`■ ${gid} 지문검증 — EN매칭 ${chk}장`);
  console.log(`  강한신호 불일치(폼/타입/HP) ${suspects.length}${suspects.length ? ":" : " ✔"}`);
  suspects.forEach((s) => console.log(s));
  console.log(`  발매 era ${ERA_CUTOFF}일↑ 이격(딴 시대 의심) ${eraFar.length}${eraFar.length ? ":" : " ✔"}`);
  eraFar.forEach((s) => console.log(s));
  await prisma.$disconnect();
}
main().catch((e) => { console.error("ERR", e?.message ?? e); process.exit(1); });
