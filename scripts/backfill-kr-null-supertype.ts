/**
 * KR 단독 수집에서 supertype·pokedexNumbers·CardSpecies 가 비어버린 카드 백필.
 *   배경: 일부 KR 프로모/스타터(kr-promo·kr-s-p·kr-xy-p·kr-sm30a·kr-st1 …)가 이름만 들어오고
 *         supertype/dex/종링크가 비어, /test·/dex 도감번호 뷰에서 포켓몬이 누락됐다(예 "이상해씨" kr-s-p#161).
 *
 *   대상: supertype IS NULL 이고 KR locale 을 가진 Card.
 *   해석: KR 이름 → resolveCardDexes(name,"ko")(접미사 ex/GX/V…·지역폼·태그팀 처리, 정확매칭=보수적).
 *     - ≥1 유효 종(Species 시드 내) → 포켓몬 확정 → supertype="Pokémon" + pokedexNumbers + CardSpecies 링크.
 *     - 0 종 → 트레이너/아이템/에너지/플레이스홀더("PROMO 47","SV-P 12") → 건드리지 않음(supertype null 유지).
 *   ※ 도감 누락 해결이 목적이라 "포켓몬"만 백필한다. 비포켓몬 supertype 추정은 별건.
 *
 *   동결가드: 영향 cardPackId 로 assertWritable. (이 KR 팩들은 PROTECTED 아님 → 통과)
 *   실행: dry-run(기본) → 플랜 감사 → npx tsx scripts/backfill-kr-null-supertype.ts --apply
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { resolveCardDexes } from "./lib/pokeapi-names";
import { assertWritable, PROTECTED_GROUPS } from "./lib/protected-groups";

const DRY = !process.argv.includes("--apply");
const ALLOW = process.argv.includes("--allow-protected");

type Plan = { id: string; name: string; setId: string; dexes: number[]; packIds: string[]; frozen: boolean };

// 공유 ko 리졸버가 못 벗기는 한국판 연결-표기 보강(메가 "M○○"·블랙/울트라·로토무폼·지우개굴닌자).
//   base 가 0종으로 떨어질 때만 시도하는 폴백 → 오탐 위험 낮음.
const KO_FORM_ALIAS: Record<string, string> = {
  "블랙큐레무": "큐레무", "화이트큐레무": "큐레무", "울트라네크로즈마": "네크로즈마", "지우개굴닌자": "개굴닌자",
  "워시로토무": "로토무", "히트로토무": "로토무", "프로스트로토무": "로토무", "스핀로토무": "로토무", "마중로토무": "로토무", "펌프로토무": "로토무",
};
function resolveKoWithForms(name: string, valid: Set<number>): number[] {
  let dx = resolveCardDexes(name, "ko").filter((d) => valid.has(d));
  if (dx.length) return [...new Set(dx)];
  // 접미사(ex/EX 등) 떼고 base 만 추출
  const base = name.replace(/\s*\b(ex|gx|v|vmax|vstar|break)\b\s*$/i, "").trim();
  // 메가: "M○○"(M + 한글 종명) → ○○
  const mega = base.match(/^M\s*([가-힣].*)$/);
  if (mega) { dx = resolveCardDexes(mega[1].trim(), "ko").filter((d) => valid.has(d)); if (dx.length) return [...new Set(dx)]; }
  // 연결-폼 별칭
  if (KO_FORM_ALIAS[base]) { dx = resolveCardDexes(KO_FORM_ALIAS[base], "ko").filter((d) => valid.has(d)); if (dx.length) return [...new Set(dx)]; }
  return [];
}

async function main() {
  const validSpecies = new Set((await prisma.species.findMany({ select: { id: true } })).map((s) => s.id));

  const cards = await prisma.card.findMany({
    where: { supertype: null, locales: { some: { region: "KR" } } },
    select: {
      id: true,
      locales: { select: { region: true, name: true, setId: true, set: { select: { cardPackId: true } } } },
    },
  });

  const resolved: Plan[] = [];
  const unresolved: { id: string; name: string; setId: string }[] = [];

  for (const c of cards) {
    const kr = c.locales.find((l) => l.region === "KR") ?? c.locales[0];
    const name = kr?.name ?? "";
    const dexes = resolveKoWithForms(name, validSpecies);
    const packIds = [...new Set(c.locales.map((l) => l.set.cardPackId).filter(Boolean) as string[])];
    const frozen = packIds.some((p) => PROTECTED_GROUPS.has(p));
    if (dexes.length > 0) resolved.push({ id: c.id, name, setId: kr?.setId ?? "?", dexes, packIds, frozen });
    else unresolved.push({ id: c.id, name, setId: kr?.setId ?? "?" });
  }

  // 동결/비동결 분리 — 비동결은 자동, 동결은 --allow-protected 필요
  const free = resolved.filter((r) => !r.frozen);
  const frozen = resolved.filter((r) => r.frozen);
  const applyable = ALLOW ? resolved : free; // --allow-protected 없으면 동결 제외(차단 대신 스킵)
  // 실제 쓸 카드들의 팩으로만 가드 — 스킵하는 동결팩까지 넣으면 차단(exit)되므로 applyable 기준.
  assertWritable([...new Set(applyable.flatMap((r) => r.packIds))], { allow: ALLOW, dryRun: DRY, tool: "backfill-kr-null-supertype" });

  // 종 이름 맵(감사 출력용)
  const dexName = new Map(
    (await prisma.species.findMany({
      where: { id: { in: [...new Set(resolved.flatMap((r) => r.dexes))] } },
      select: { id: true, nameKo: true },
    })).map((s) => [s.id, s.nameKo ?? "?"])
  );

  // ── 리포트 ──
  console.log(`\n총 null-supertype+KR 카드: ${cards.length}`);
  console.log(`  ✅ 해석됨(포켓몬): ${resolved.length}  (태그팀 다중dex: ${resolved.filter((r) => r.dexes.length > 1).length})`);
  console.log(`     ├ 비동결(자동적용): ${free.length}`);
  console.log(`     └ 동결(${[...new Set(frozen.flatMap((r) => r.packIds))].filter((p) => PROTECTED_GROUPS.has(p)).join(",")}): ${frozen.length} ${ALLOW ? "← --allow-protected 적용" : "← 스킵(--allow-protected 필요)"}`);
  console.log(`  ⏭  미해석(트레이너/아이템/플레이스홀더): ${unresolved.length}`);
  if (frozen.length) {
    console.log(`\n── 동결팩 해석분 (확인용) ──`);
    for (const r of frozen) console.log(`  [${r.setId}] ${r.name}  →  ${r.dexes.map((d) => `${d}:${dexName.get(d) ?? "?"}`).join(", ")}`);
  }

  // ★오탐 자동검출: 해석된 종 한글명이 카드 이름에 (정규화 후) 포함되지 않으면 의심 — 우연 매칭/별칭 오류 잡기.
  const norm = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
  const suspicious = resolved.filter((r) => r.dexes.some((d) => { const nk = dexName.get(d); return !nk || !norm(r.name).includes(norm(nk)); }));
  console.log(`\n── ⚠ 의심(종명이 카드명에 없음) ${suspicious.length}건 ── [수동 확인 필요]`);
  for (const r of suspicious) console.log(`  [${r.setId}] ${r.name}  →  ${r.dexes.map((d) => `${d}:${dexName.get(d) ?? "?"}`).join(", ")}`);

  console.log(`\n── 해석 플랜 전체(name → dex:종) ── [감사용]`);
  for (const r of resolved) {
    console.log(`  [${r.setId}] ${r.name}  →  ${r.dexes.map((d) => `${d}:${dexName.get(d) ?? "?"}`).join(", ")}`);
  }

  console.log(`\n── 미해석 이름 전체 ── [빠진 포켓몬 점검용]`);
  const byPack = new Map<string, string[]>();
  for (const u of unresolved) (byPack.get(u.setId) ?? byPack.set(u.setId, []).get(u.setId)!).push(u.name);
  for (const [sid, names] of [...byPack.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  [${sid}] (${names.length}): ${names.sort().join(" | ")}`);
  }

  if (DRY) {
    console.log(`\n(dry-run) --apply 로 ${applyable.length}장 적용 예정(supertype="Pokémon" + pokedexNumbers + CardSpecies). 동결 포함하려면 --allow-protected.`);
    await prisma.$disconnect();
    return;
  }

  let updated = 0, links = 0;
  for (const r of applyable) {
    await prisma.$transaction(async (tx) => {
      await tx.card.update({ where: { id: r.id }, data: { supertype: "Pokémon", pokedexNumbers: r.dexes } });
      const res = await tx.cardSpecies.createMany({
        data: r.dexes.map((d) => ({ cardId: r.id, speciesId: d })),
        skipDuplicates: true,
      });
      links += res.count;
    });
    updated++;
  }
  console.log(`\n✅ 적용완료: ${updated}장 supertype/dex 갱신 · CardSpecies ${links}건 생성.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
