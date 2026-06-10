// ── P3 선결: GameCard 묶음키 검증 (읽기전용) ──────────────────────────────────
// 3키[supertype,name,regMark] vs effectSig키[supertype,name,effectSig] 비교.
// 검증 2축: (a)오병합(같은이름 다른효과)이 줄었나 (b)진짜 재수록(cross-pack)을 안 쪼갰나.
// effectSig = hp + 공격damage집합 + 공격수 + 특성수 (언어무관 숫자만 → 다국어 재수록 견딤).
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";

const norm = (s: any) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
const isPk = (st: string | null) => st === "Pokémon" || st === "Pokemon";

async function main() {
  const lcs = await prisma.logicalCard.findMany({
    where: { supertype: "Pokémon" },
    select: { id: true, regulationMark: true, hp: true, attacks: true, abilities: true, subtypes: true, setGroupId: true,
      locales: { select: { region: true, name: true } } },
  });
  const name = (lc: typeof lcs[0]) => {
    const by = (r: string) => lc.locales.find((l) => l.region === r)?.name;
    return norm(by("EN") || by("JP") || by("KR") || "");
  };
  const effectSig = (lc: typeof lcs[0]) => {
    let dmg: string[] = [], natk = 0;
    try { const a: any = lc.attacks; if (Array.isArray(a)) { natk = a.length; dmg = a.map((x) => String(x?.damage ?? "")).sort(); } } catch {}
    let nab = 0; try { const b: any = lc.abilities; if (Array.isArray(b)) nab = b.length; } catch {}
    return `${lc.hp ?? "?"}|${dmg.join(",")}|${natk}|${nab}`;
  };

  function analyze(keyer: (lc: typeof lcs[0]) => string, label: string) {
    const groups = new Map<string, typeof lcs>();
    for (const lc of lcs) { const k = keyer(lc); (groups.get(k) ?? groups.set(k, []).get(k)!).push(lc); }
    let multi = 0, crossPack = 0, mixed = 0;
    for (const [, ms] of groups) {
      if (ms.length < 2) continue; multi++;
      if (new Set(ms.map((m) => m.setGroupId)).size > 1) crossPack++;
      if (new Set(ms.map(effectSig)).size > 1) mixed++;
    }
    console.log(`\n[${label}] 그룹 ${groups.size} (복수멤버 ${multi})`);
    console.log(`  cross-pack 통합 그룹(재수록 묶임): ${crossPack}`);
    console.log(`  효과불일치 그룹(오병합): ${mixed} (${multi ? (mixed / multi * 100).toFixed(1) : 0}%)`);
    return groups;
  }

  const key3 = (lc: typeof lcs[0]) => `${lc.supertype}|${name(lc)}|${lc.regulationMark ?? "∅"}`;
  const keyE = (lc: typeof lcs[0]) => `${lc.supertype}|${name(lc)}|${effectSig(lc)}`;

  console.log(`포켓몬 LC ${lcs.length}장으로 두 키 비교`);
  const g3 = analyze(key3, "3키 name+regMark (현행 P-1)");
  const gE = analyze(keyE, "effectSig 키 (U3 변경안)");

  // (b) 재수록 보존 검증: 3키에서 cross-pack 통합됐던 그룹이 effectSig에서도 유지되나?
  //     같은 이름의 cross-pack LC 쌍이 effectSig 키도 같은지 = 재수록 보존, 다르면 = 과분할
  const byName = new Map<string, typeof lcs>();
  for (const lc of lcs) { const k = `${lc.supertype}|${name(lc)}`; (byName.get(k) ?? byName.set(k, []).get(k)!).push(lc); }
  let reprintNames = 0, preserved = 0, splitNames = 0; const splitEx: string[] = [];
  for (const [k, ms] of byName) {
    const packs = new Set(ms.map((m) => m.setGroupId));
    if (ms.length < 2 || packs.size < 2) continue; // cross-pack 동명 그룹만
    reprintNames++;
    // 이 동명 cross-pack 그룹이 effectSig로 몇 조각 나는가
    const sigs = new Set(ms.map((m) => effectSig(m)));
    if (sigs.size === 1) preserved++;
    else { splitNames++; if (splitEx.length < 10) splitEx.push(`    "${k.split("|")[1]}": ${ms.length}장/${packs.size}팩 → 효과 ${sigs.size}조각`); }
  }
  console.log(`\n── 재수록 보존 검증 (동명 cross-pack 그룹 ${reprintNames}개) ──`);
  console.log(`  effectSig로도 1조각 유지(=진짜 재수록 보존): ${preserved} (${reprintNames ? (preserved / reprintNames * 100).toFixed(1) : 0}%)`);
  console.log(`  effectSig로 여러조각 분할(=동명이지만 효과 다름): ${splitNames}`);
  console.log(`  ※ 분할은 "오병합 해소"(좋음)일 수도, "재수록 과분할"(나쁨)일 수도 — 표본 점검:`);
  splitEx.forEach((e) => console.log(e));

  console.log("\n  (읽기전용 — DB 변경 0)");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
