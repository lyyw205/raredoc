// 공유 EN 세트의 "미연결 orphan" EN 카드를 특정 cardPack 의 JP 앵커에 dex+일러(아트 단위)로
// 정밀 연결한다. merge-en-identity 가 공유 EN 세트를 단일 JP 전용으로 착각해 형제 팩을 비우는
// 사고(다크판타스마 s10a→swsh11 311건 스크램블)를 피하기 위한 외과적 대안:
//   - 대상은 logicalCardId 가 lc-orphan* 인 EN 로케일뿐 → 형제 소유 카드는 구조적으로 못 건드림.
//   - 매칭 키는 dex + 정규화 일러(+ 충돌 시 subtypes) → 같은 그림만 붙어 오매칭 방지(레어도/번호 무관).
// 사용: npx tsx scripts/link-en-orphans-by-art.ts <cardPackId> <enSet1,enSet2,...> [--apply]
import "dotenv/config"; import { prisma } from "../src/lib/prisma";

const [groupId, enSetsArg] = process.argv.slice(2);
const APPLY = process.argv.includes("--apply");
const norm = (s: string | null) => (s || "").toLowerCase().replace(/\s+/g, "").trim();
const subKey = (a: string[]) => [...a].sort().join(",");

async function main() {
  if (!groupId || !enSetsArg) { console.error("사용: <cardPackId> <enSet1,enSet2> [--apply]"); return; }
  const enSets = enSetsArg.split(",");

  // dex|illust 버킷 키들 — 한 카드가 복수 dex(태그팀)면 첫 dex 로 단순화
  const bk = (dex: number[], ill: string | null) => (dex.length ? dex[0] : 0) + "|" + norm(ill);

  // JP 앵커 버킷 — EN 로케일이 아직 없는 앵커만(orphan→미매칭 앵커 입양; 이미 매칭된 앵커에
  // 2번째 EN을 더하지 않음. Dark Phantasma 처럼 전부 EN-less면 영향 없고, og-s10d 처럼
  // 일부만 비었으면 그 빈 칸만 채워 알트아트 과잉연결을 막는다.)
  const anchors = await prisma.logicalCard.findMany({
    where: { cardPackId: groupId, supertype: "Pokémon", locales: { none: { region: "EN" } } },
    select: { id: true, illustrator: true, pokedexNumbers: true, subtypes: true, nameKo: true,
      locales: { where: { region: "JP" }, select: { number: true, numberInt: true, name: true }, take: 1 } },
  });
  const aBuckets = new Map<string, typeof anchors>();
  for (const a of anchors) { const k = bk(a.pokedexNumbers, a.illustrator); (aBuckets.get(k) ?? aBuckets.set(k, []).get(k)!).push(a); }
  for (const arr of aBuckets.values()) arr.sort((x, y) => (x.locales[0]?.numberInt ?? 0) - (y.locales[0]?.numberInt ?? 0));

  // orphan EN 버킷 — "진짜 미연결"만: logicalCardId 접두사(lc-orphan)로는 부족하다.
  // 합본 그룹(og-s10p/s10d 등)은 *병합된* 카드도 lc-orphan-jp-tcg-* 네이밍을 써서, 접두사만
  // 보면 base카드 EN을 orphan으로 착각해 시크릿 앵커로 도둑질한다(§59 실측: S10P#22 펄기아V·
  // S10D#52 이브이 등 4장 EN 강탈→보존가드 적발·롤백). 그래서 **그 LC 에 JP 로케일이 없는
  // 진짜 EN-only orphan** 으로 한정한다(JP 보유 = 이미 어떤 JP카드의 EN이므로 건드리면 안 됨).
  const orphans = await prisma.cardLocale.findMany({
    where: { region: "EN", setId: { in: enSets },
      logicalCard: { supertype: "Pokémon", locales: { none: { region: "JP" } } } },
    select: { id: true, setId: true, number: true, numberInt: true, name: true,
      logicalCard: { select: { illustrator: true, pokedexNumbers: true, subtypes: true } } },
  });
  const oBuckets = new Map<string, typeof orphans>();
  for (const o of orphans) { const k = bk(o.logicalCard.pokedexNumbers, o.logicalCard.illustrator); (oBuckets.get(k) ?? oBuckets.set(k, []).get(k)!).push(o); }
  for (const arr of oBuckets.values()) arr.sort((x, y) => (x.numberInt ?? 0) - (y.numberInt ?? 0));

  const links: { id: string; to: string; why: string }[] = [];
  const skips: string[] = [];
  const anchorHits = new Map<string, number>();
  for (const [k, os] of oBuckets) {
    const as = aBuckets.get(k);
    if (!as || !as.length) continue; // s10a 카드 아님 → skip
    // subtypes 로 1차 분리 시도(예: V vs VSTAR 가 같은 dex|일러일 때) — 그래도 남으면 번호순 zip
    const used = new Set<number>();
    for (const o of os) {
      // 같은 subtypes 앵커 우선, 없으면 미사용 앵커 중 번호순 다음
      let ai = as.findIndex((a, i) => !used.has(i) && subKey(a.subtypes) === subKey(o.logicalCard.subtypes));
      if (ai < 0) ai = as.findIndex((_, i) => !used.has(i));
      if (ai < 0) { skips.push(`잉여 ${o.setId.replace("en-tcg-","")}#${o.number} ${o.name} (버킷 ${k} 앵커 소진)`); continue; }
      used.add(ai); const a = as[ai];
      links.push({ id: o.id, to: a.id, why: `${o.setId.replace("en-tcg-","")}#${o.number} ${o.name} → JP#${a.locales[0]?.number} ${a.nameKo ?? a.locales[0]?.name} [${k}]` });
      anchorHits.set(a.id, (anchorHits.get(a.id) || 0) + 1);
    }
  }

  console.log(`[link] 그룹 ${groupId} · EN ${enSets.join(",")} · orphan포켓몬 ${orphans.length}`);
  console.log(`  연결가능 ${links.length}건 · 모호(다앵커) ${skips.length}건`);
  for (const s of skips) console.log("  ⚠ " + s);
  const multi = [...anchorHits].filter(([, n]) => n > 1);
  if (multi.length) console.log(`  ℹ 한 앵커에 2장+ 붙는 경우 ${multi.length}건(베이스+시크릿 정상 가능):`, multi.map(([id, n]) => `${id}×${n}`).join(", "));
  console.log("  ── 연결 예시(앞 40) ──");
  for (const l of links.slice(0, 40)) console.log("   " + l.why);
  if (links.length > 40) console.log(`   …외 ${links.length - 40}건`);

  if (APPLY) {
    let n = 0;
    for (const l of links) { await prisma.cardLocale.update({ where: { id: l.id }, data: { logicalCardId: l.to } }); if (++n % 25 === 0) console.log(`  …${n}/${links.length}`); }
    console.log(`★ ${n}건 연결 적용 완료.`);
  } else console.log("(dry — --apply 로 적용)");
  await prisma.$disconnect();
}
main();
