// en-binding-check 스킬 — 고아(미묶임) EN 카드를 기존 JP 앵커 Card 로 외과적 repoint.
//
//   방향은 "붙이기" 한 가지뿐. 떼어내기/그룹에서 빼기 없음.
//   기존 JP-앵커 EN/KR 묶음(검증·동결 완료)은 절대 건드리지 않는다 — 그래서 입력 EN 이
//   *이미 JP 형제를 가지면 거부*하고, 타깃 Card 가 *이미 EN 로케일을 가지면 거부*한다(오매칭 신호).
//
//   동작(apply 시): EN RegionCard.cardId = <타깃 Card.id> 로 재지정 → 옛 고아 Card 가 비면 정리(삭제).
//   기본은 dry-run. --apply 로 실제 적용. 동결팩이 영향권이면 --allow-protected 필요.
//
// 사용(레포 루트에서):
//   npx tsx .claude/skills/en-binding-check/scripts/bind-en-orphan.ts --en <enRegionCardId> --to <targetCardId> [--apply] [--allow-protected]
//   npx tsx .claude/skills/en-binding-check/scripts/bind-en-orphan.ts --pairs "<enId>=<lcid>,<enId>=<lcid>" [--apply] [--allow-protected]
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../../scripts/lib/protected-groups";

function parseArgs(argv: string[]) {
  const out: { en?: string; to?: string; pairs?: string; apply: boolean } = { apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--en") out.en = argv[++i];
    else if (a === "--to") out.to = argv[++i];
    else if (a === "--pairs") out.pairs = argv[++i];
    else if (a === "--apply") out.apply = true;
  }
  return out;
}

function buildPairs(args: ReturnType<typeof parseArgs>): { en: string; to: string }[] {
  if (args.pairs) {
    return args.pairs.split(",").map((p) => p.trim()).filter(Boolean).map((p) => {
      const [en, to] = p.split("=").map((s) => s.trim());
      if (!en || !to) throw new Error(`--pairs 항목 형식 오류: '${p}' (enId=lcid 형태여야 함)`);
      return { en, to };
    });
  }
  if (args.en && args.to) return [{ en: args.en, to: args.to }];
  throw new Error("--en <enRegionCardId> --to <targetCardId> 또는 --pairs \"<enId>=<lcid>,...\" 필요");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const APPLY = args.apply;
  const pairs = buildPairs(args);

  type Plan = { en: string; to: string; ok: boolean; reason?: string; oldCardId?: string; affected: (string | null)[]; enLabel?: string; toLabel?: string };
  const plans: Plan[] = [];

  for (const { en: enId, to: lcid } of pairs) {
    const en = await prisma.regionCard.findUnique({
      where: { id: enId },
      select: {
        id: true, region: true, name: true, number: true, setId: true, cardId: true,
        set: { select: { cardPackId: true } },
        card: { select: { id: true, cardPackId: true, locales: { select: { region: true } } } },
      },
    });
    if (!en) { plans.push({ en: enId, to: lcid, ok: false, reason: "EN RegionCard 없음", affected: [] }); continue; }
    if (en.region !== "EN") { plans.push({ en: enId, to: lcid, ok: false, reason: `region=EN 아님(${en.region})`, affected: [] }); continue; }

    const enRegions = [...new Set(en.card.locales.map((l) => l.region))];
    if (enRegions.includes("JP")) {
      plans.push({ en: enId, to: lcid, ok: false, reason: `이 EN 은 이미 JP 형제가 있음(동결 묶음) — 대상 아님. 기존 묶음 보호.`, affected: [] });
      continue;
    }

    const target = await prisma.card.findUnique({
      where: { id: lcid },
      select: { id: true, cardPackId: true, locales: { select: { region: true, number: true, name: true } } },
    });
    if (!target) { plans.push({ en: enId, to: lcid, ok: false, reason: "타깃 Card 없음", affected: [] }); continue; }
    const tRegions = [...new Set(target.locales.map((l) => l.region))];
    if (!tRegions.includes("JP")) {
      plans.push({ en: enId, to: lcid, ok: false, reason: `타깃에 JP 로케일 없음(현재: ${tRegions.join("/") || "없음"}) — JP 앵커가 아님. KR-only/EN-only 대상은 보류.`, affected: [] });
      continue;
    }
    if (tRegions.includes("EN")) {
      plans.push({ en: enId, to: lcid, ok: false, reason: `타깃이 이미 EN 로케일 보유 — 한 JP 에 EN 2장 = 오매칭 의심. 매칭 재검토.`, affected: [] });
      continue;
    }

    const affected = [en.card.cardPackId, target.cardPackId, en.set?.cardPackId ?? null];
    plans.push({
      en: enId, to: lcid, ok: true, oldCardId: en.cardId, affected,
      enLabel: `EN#${en.number} ${en.name}`,
      toLabel: `${lcid} (JP/KR: ${tRegions.join("/")})`,
    });
  }

  // 동결 가드 — 유효 플랜의 영향 cardPack 전체로 한 번에 검사(dry-run=경고, apply=allow 없으면 차단)
  const affectedAll = plans.filter((p) => p.ok).flatMap((p) => p.affected);
  assertWritable(affectedAll, { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "bind-en-orphan" });

  let applied = 0, cleaned = 0;
  for (const p of plans) {
    if (!p.ok) { console.log(`  ✗ ${p.en} → ${p.to} | 거부: ${p.reason}`); continue; }
    if (!APPLY) { console.log(`  ◌ (dry) ${p.enLabel} → ${p.toLabel} | repoint 예정${p.oldCardId?.startsWith("lc-orphan-") ? " + 옛 orphan LC 정리" : ""}`); continue; }

    await prisma.regionCard.update({ where: { id: p.en }, data: { cardId: p.to } });
    applied++;
    // 옛 Card 가 비면(다른 로케일 없음) 정리 — CardText 는 onDelete:Cascade. 실패하면 경고만.
    const remaining = await prisma.regionCard.count({ where: { cardId: p.oldCardId! } });
    let cleanNote = "";
    if (remaining === 0 && p.oldCardId !== p.to) {
      try { await prisma.card.delete({ where: { id: p.oldCardId! } }); cleaned++; cleanNote = " · 옛 LC 삭제"; }
      catch (e) { cleanNote = ` · ⚠옛 LC(${p.oldCardId}) 삭제 실패(참조 잔존?): ${e instanceof Error ? e.message : e}`; }
    }
    console.log(`  ✓ ${p.enLabel} → ${p.to}${cleanNote}`);
  }

  const okCount = plans.filter((p) => p.ok).length, rej = plans.length - okCount;
  console.log(`■ bind-en-orphan ${APPLY ? "★적용" : "(dry)"} | 대상 ${plans.length} · 유효 ${okCount} · 거부 ${rej}${APPLY ? ` · 적용 ${applied} · 옛LC정리 ${cleaned}` : ""}`);
  if (!APPLY && okCount) console.log(`  → 실제 적용: 위 명령에 --apply 추가${affectedAll.some(Boolean) ? " (동결 영향 시 --allow-protected)" : ""}`);
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); })
  .finally(() => prisma.$disconnect());
