// en-binding-check 스킬 — EN 카드팩 감사 (읽기 전용, DB 변경 없음)
//   ① 번호 완전성: 1..cardCount 중 빠진 번호(미수집 의심) + 초과/비수치 번호 분리
//   ② 묶임 상태: 각 EN 카드의 JP/KR 형제 유무 → bound(JP있음) / krOnly / orphan 분류
//   ③ 팩 관계 후보: CardPackLink(팩 대응표) + 같은 cardPack 의 JP/KR 형제 세트 + cardPack 메타
//      → "이 EN 팩과 관계있는 JP/KR 팩" 확정의 1차 DB 소스(없으면 리서치로 보강 — references/pack-relationship.md)
//
// 사용(레포 루트에서):
//   npx tsx .claude/skills/en-binding-check/scripts/audit-en-pack.ts --set <enSetId>
//   npx tsx .claude/skills/en-binding-check/scripts/audit-en-pack.ts --pack <cardPackId>
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { protectedTouched } from "../../../../scripts/lib/protected-groups";

function parseArgs(argv: string[]) {
  const out: { set?: string; pack?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--set") out.set = argv[++i];
    else if (a === "--pack") out.pack = argv[++i];
  }
  return out;
}

const sub = (a?: string[] | null) => [...(a ?? [])].sort().join(",");

async function resolveEnSetIds(args: { set?: string; pack?: string }): Promise<string[]> {
  if (args.set) {
    const s = await prisma.set.findUnique({ where: { id: args.set }, select: { id: true, region: true } });
    if (!s) throw new Error(`Set 없음: ${args.set}`);
    if (s.region !== "EN") throw new Error(`region=EN 세트가 아님: ${args.set} (region=${s.region}). 이 스킬은 EN 팩만 대상.`);
    return [s.id];
  }
  if (args.pack) {
    const sets = await prisma.set.findMany({ where: { cardPackId: args.pack, region: "EN" }, select: { id: true } });
    if (!sets.length) throw new Error(`cardPack '${args.pack}' 에 EN(region=EN) 세트가 없음.`);
    return sets.map((s) => s.id);
  }
  throw new Error("--set <enSetId> 또는 --pack <cardPackId> 가 필요합니다.");
}

async function auditOneSet(enSetId: string) {
  const set = await prisma.set.findUnique({
    where: { id: enSetId },
    select: { id: true, name: true, nameJa: true, region: true, cardCount: true, releaseDate: true, cardPackId: true, code: true, packType: true },
  });
  if (!set) throw new Error(`Set 없음: ${enSetId}`);

  // ── EN 카드 + 각 카드의 논리정체성(Card)·형제 로케일 ──
  const rcs = await prisma.regionCard.findMany({
    where: { setId: enSetId, region: "EN" },
    select: {
      id: true, number: true, numberInt: true, name: true, cardId: true,
      rarity: { select: { code: true } },
      card: {
        select: {
          id: true, cardPackId: true, primarySetId: true, supertype: true, subtypes: true, types: true,
          pokedexNumbers: true, illustrator: true, rarity: { select: { code: true } },
          locales: { select: { region: true, number: true, name: true, setId: true } },
        },
      },
    },
    orderBy: [{ numberInt: "asc" }, { number: "asc" }],
  });

  // ── ① 번호 완전성 ──
  const numericInts = rcs.map((r) => r.numberInt).filter((n): n is number => n != null);
  const present = new Set(numericInts);
  const missing: number[] = [];
  for (let n = 1; n <= set.cardCount; n++) if (!present.has(n)) missing.push(n);
  const extras = [...new Set(numericInts.filter((n) => n > set.cardCount))].sort((a, b) => a - b);
  const nonNumeric = rcs.filter((r) => r.numberInt == null).map((r) => ({ number: r.number, name: r.name }));
  // 같은 numberInt 가 여러 행(평행팩/레터 서브셋) — 참고용
  const dupCounts = new Map<number, number>();
  for (const n of numericInts) dupCounts.set(n, (dupCounts.get(n) ?? 0) + 1);
  const duplicates = [...dupCounts].filter(([, c]) => c > 1).map(([n, c]) => ({ numberInt: n, rows: c }));

  // ── ② 묶임 상태 ──
  const classify = (regions: string[]) => {
    const hasJp = regions.includes("JP");
    const hasKr = regions.includes("KR");
    if (hasJp) return "bound"; // JP 앵커 형제 있음 — 동결 대상, 건드리지 않음
    if (hasKr) return "krOnly"; // KR 형제만 — 보류+리포트(JP 없이 KR 직접묶기 금지)
    return "orphan"; // JP·KR 둘 다 없음 — 리서치 대상
  };
  const rows = rcs.map((r) => {
    const regions = [...new Set(r.card.locales.map((l) => l.region))];
    const dexKey = (r.card.pokedexNumbers ?? []).length >= 2
      ? [...r.card.pokedexNumbers].sort((a, b) => a - b).join("&")
      : (r.card.pokedexNumbers?.[0] != null ? String(r.card.pokedexNumbers[0]) : null);
    return {
      enRegionCardId: r.id,
      number: r.number,
      numberInt: r.numberInt,
      name: r.name,
      supertype: r.card.supertype,
      rarity: r.rarity?.code ?? r.card.rarity?.code ?? null,
      pokedexNumbers: r.card.pokedexNumbers,
      bucketKey: dexKey ? `${dexKey}|${sub(r.card.subtypes)}` : null,
      illustrator: r.card.illustrator,
      status: classify(regions),
      cardId: r.card.id,
      isOrphanLc: r.card.id.startsWith("lc-orphan-"),
      cardPackId: r.card.cardPackId,
      siblingRegions: regions,
    };
  });
  const counts = {
    total: rows.length,
    bound: rows.filter((x) => x.status === "bound").length,
    krOnly: rows.filter((x) => x.status === "krOnly").length,
    orphan: rows.filter((x) => x.status === "orphan").length,
  };
  const orphans = rows.filter((x) => x.status === "orphan");
  const krOnly = rows.filter((x) => x.status === "krOnly");

  // ── ③ 팩 관계 후보 ──
  const cardPack = set.cardPackId
    ? await prisma.cardPack.findUnique({ where: { id: set.cardPackId }, select: { id: true, era: true, nameEn: true, nameJa: true, nameKo: true, releaseDate: true } })
    : null;
  const siblingSets = set.cardPackId
    ? await prisma.set.findMany({
        where: { cardPackId: set.cardPackId },
        select: { id: true, region: true, name: true, nameJa: true, nameKo: true, cardCount: true, releaseDate: true, code: true },
        orderBy: [{ region: "asc" }, { releaseDate: "asc" }],
      })
    : [];
  const links = set.cardPackId
    ? await prisma.cardPackLink.findMany({
        where: { waveId: set.cardPackId },
        select: { region: true, setId: true, role: true, relationType: true, mirrorOfSetId: true, numberMirrors: true, note: true },
        orderBy: [{ region: "asc" }],
      })
    : [];
  // orphan 들이 실제로 어느 cardPack 에 매달려 있는지 분포(빌드/머지 흔적)
  const orphanPackDist = new Map<string, number>();
  for (const o of orphans) orphanPackDist.set(o.cardPackId ?? "(null)", (orphanPackDist.get(o.cardPackId ?? "(null)") ?? 0) + 1);

  // 동결 여부(이 팩 / orphan 들이 매달린 팩)
  const frozenTouched = protectedTouched([set.cardPackId, ...orphans.map((o) => o.cardPackId)]);

  return {
    enSet: { id: set.id, name: set.name, nameJa: set.nameJa, code: set.code, packType: set.packType, cardCount: set.cardCount, releaseDate: set.releaseDate, cardPackId: set.cardPackId },
    numberCompleteness: {
      cardCount: set.cardCount,
      collectedNumeric: present.size,
      missing,                 // 1..cardCount 중 빠진 번호 = 미수집 의심(EN 완전성 보강 대상)
      extrasAboveCount: extras, // cardCount 초과 번호(시크릿 등) — 정상일 수 있음
      nonNumeric,              // TG/GG/프로모 등 비수치 번호
      duplicates,              // 같은 numberInt 다중행(평행팩/레터 서브셋)
    },
    bindingCounts: counts,
    packRelationship: {
      cardPack,
      siblingSetsInSameCardPack: siblingSets, // DB 상 같은 그룹으로 이미 묶인 JP/KR 세트(있으면 1차 후보)
      cardPackLinks: links,                   // 팩 대응표(ANCHOR/MIRROR/CROSS/JP_ONLY 등 관계 인코딩)
      orphanCardPackDistribution: [...orphanPackDist].map(([id, n]) => ({ cardPackId: id, count: n })),
      frozenGroupsTouched: frozenTouched,     // 비어있지 않으면 bind 시 --allow-protected 체크포인트 필요
    },
    orphans,   // JP·KR 둘 다 없는 EN 카드 — references/pack-relationship.md 절차로 매칭 리서치
    krOnly,    // KR 형제만 있는 EN 카드 — 보류+리포트(직접 묶지 않음)
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const enSetIds = await resolveEnSetIds(args);
  const result = [];
  for (const id of enSetIds) result.push(await auditOneSet(id));
  console.log(JSON.stringify(result, null, 1));
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); })
  .finally(() => prisma.$disconnect());
