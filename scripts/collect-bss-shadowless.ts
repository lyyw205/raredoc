/**
 * Base Set (Shadowless) 수집 — 신규 세트가 아니라 en-tcg-base1(Base Set Unlimited)의 ★섀도우리스 변형★.
 *
 * 모델(taxonomy §0·§2): 그림·번호·세트 같고 마감만 다름 → 새 RegionCard 아님, RegionCard 밑 **PrintVariant(kind=shadowless)**.
 *   각 BSS 카드(#N/102)를 base1 #N RegionCard 에 해석하고, 그 밑에 shadowless PrintVariant 를 만든 뒤
 *   ExternalIdMapping(tcgcsv, productId→regionCard + printVariantId) 로 연결한다. 시세는 sync-prices-tcgcsv 가
 *   그 shadowless PrintVariant 에 적재 → 시세모달에 "일반판 vs 섀도우리스"가 갈라져 노출된다.
 *
 * 정체성/잠금: PrintVariant·ExternalIdMapping 은 FREE 테이블(mapping-lock 무관). base1 의 cardId/name/image/species
 *   는 안 건드림 → --allow-protected 불필요.
 * 안전: 102장 전부 (a) base1 #N 존재 (b) 이름 일치 여야 적재. 하나라도 실패 시 abort. dry-run 기본, --apply.
 *
 * 실행:
 *   curl -s -H "User-Agent: Mozilla/5.0" "https://tcgcsv.com/tcgplayer/3/1663/products" -o <scratchpad>/bss-tcgcsv.json
 *   npx tsx scripts/collect-bss-shadowless.ts            # dry-run
 *   npx tsx scripts/collect-bss-shadowless.ts --apply
 *   그 뒤: npx tsx scripts/sync-prices-tcgcsv.ts --cat=3 --group=1663
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { Logger } from "./lib/price-sync-lib";

const log = new Logger("collect-bss");
const SP = "/tmp/claude-1000/-home-lyyw205-repos-raredoc/e99f8394-a0d1-4723-8caf-5e59e34dd937/scratchpad";
const BASE_SET = "en-tcg-base1";

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

type Prod = { productId: number; name: string; extendedData?: { name: string; value: string }[] };

async function main() {
  const apply = process.argv.includes("--apply");
  const d = JSON.parse(readFileSync(`${SP}/bss-tcgcsv.json`, "utf-8"));
  const prods: Prod[] = (d.results ?? d).filter((p: Prod) =>
    p.extendedData?.some((e) => e.name === "Number" && e.value),
  );
  log.info(`${apply ? "APPLY" : "DRY-RUN"} — BSS 카드상품 ${prods.length}장`);

  // 해석 + 검증(전건 통과해야 적재). "(Red Cheeks)" 같은 후행 괄호 = shadowless 내 하위구분(slug).
  const resolved: { productId: number; numStr: string; rcId: string; name: string; slug: string; label: string }[] = [];
  for (const p of prods) {
    const numStr = p.extendedData!.find((e) => e.name === "Number")!.value; // "004/102"
    const numInt = parseInt(numStr.split("/")[0], 10);
    const dm = p.name.match(/^(.*?)\s*\(([^)]+)\)\s*$/); // 후행 "(descriptor)"
    const baseName = dm ? dm[1].trim() : p.name.trim();
    const descriptor = dm ? dm[2].trim() : null; // "Red Cheeks"
    const rc = await prisma.regionCard.findFirst({
      where: { setId: BASE_SET, numberInt: numInt },
      select: { id: true, name: true },
    });
    if (!rc) throw new Error(`BSS "${p.name}" #${numStr} → ${BASE_SET} #${numInt} 없음`);
    const a = norm(rc.name), b = norm(baseName);
    if (!(a === b || a.includes(b) || b.includes(a)))
      throw new Error(`이름 불일치 ABORT — BSS "${baseName}" #${numStr} vs base1 "${rc.name}"`);
    // 하위구분 있으면 slug=descriptor, 아니면 shadowless(기본)
    resolved.push({
      productId: p.productId, numStr, rcId: rc.id, name: rc.name,
      slug: descriptor ? slugify(descriptor) : "shadowless",
      label: descriptor ?? "Shadowless", // 하위변형은 descriptor 만(variantLabel 이 "섀도우리스 · Red Cheeks" 로 조합)
    });
  }
  const subs = resolved.filter((r) => r.slug !== "shadowless");
  log.info(`✓ ${resolved.length}장 전부 base1 해석·이름검증 통과 (하위변형 ${subs.length}: ${subs.map((s) => `${s.name}/${s.slug}`).join(", ") || "없음"})`);
  for (const r of resolved.slice(0, 6)) console.log(`  ${r.name.padEnd(16)} #${r.numStr} → ${r.rcId} (shadowless/${r.slug})`);
  if (!apply) {
    log.info("(dry-run) --apply 로 shadowless PrintVariant + 매핑 적재.");
    await prisma.$disconnect();
    return;
  }

  const src = await prisma.externalSource.findUnique({ where: { code: "tcgcsv" }, select: { id: true } });
  if (!src) throw new Error("ExternalSource 'tcgcsv' 미시드");

  let nPV = 0, nMap = 0;
  for (const r of resolved) {
    // 기본 shadowless 는 pv-{rc}-shadowless, 하위변형은 pv-{rc}-shadowless-{slug}.
    const pvId = r.slug === "shadowless" ? `pv-${r.rcId}-shadowless` : `pv-${r.rcId}-shadowless-${r.slug}`;
    await prisma.printVariant.upsert({
      where: { regionCardId_kind_slug: { regionCardId: r.rcId, kind: "shadowless", slug: r.slug } },
      create: { id: pvId, regionCardId: r.rcId, kind: "shadowless", slug: r.slug, label: r.label },
      update: { label: r.label },
    });
    nPV++;
    await prisma.externalIdMapping.upsert({
      where: { sourceId_externalId: { sourceId: src.id, externalId: String(r.productId) } },
      create: {
        sourceId: src.id, externalId: String(r.productId), regionCardId: r.rcId, printVariantId: pvId,
        url: `https://www.tcgplayer.com/product/${r.productId}`, verifiedBy: "auto:collect-bss-shadowless",
        confidence: 1.0, verifiedAt: new Date(),
      },
      update: { regionCardId: r.rcId, printVariantId: pvId },
    });
    nMap++;
  }
  log.info(`✓ shadowless PrintVariant ${nPV} + ExternalIdMapping ${nMap} 적재 완료. → sync-prices-tcgcsv --group=1663`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
