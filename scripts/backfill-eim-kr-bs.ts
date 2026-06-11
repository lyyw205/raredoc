/**
 * P3: KR BS코드 → ExternalIdMapping(pokemoncard_kr) 백필 — docs/meta-pipeline-multisource.md §3 선행 백필 3
 *
 * 실행: npx tsx scripts/backfill-eim-kr-bs.ts [--dry-run]
 *
 * 원천: data/kr-official/*.json 의 (detailId=BS코드, image, setCode, number)
 *   — apply-kr-official.ts 가 detailId 를 버리고 적재했던 것을 EIM 으로 복원.
 * 조인: KR RegionCard.imageSmall == record.image (apply 가 image 를 그대로 저장 — 정확 키)
 *   폴백: 이미지 파일명(소문자, 확장자 제외) 매칭.
 * 결과: resolver 경로④(BS코드→logicalCardId) 가동 — KR 덱코드 해석의 기반.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

const dryRun = process.argv.includes("--dry-run");

type Rec = { detailId: string; image: string; setCode: string; number: string; koName: string; file: string };

function basenameKey(url: string): string {
  const b = url.split("/").pop() ?? "";
  return b.replace(/\.[a-z]+$/i, "").toLowerCase();
}

async function main() {
  // 1. JSON 레코드 수집 (detailId 중복은 첫 항목 우선)
  const dir = path.join(process.cwd(), "data", "kr-official");
  const byBs = new Map<string, Rec>();
  let raw = 0;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    let data: unknown;
    try {
      data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    } catch {
      console.warn(`[eim-kr] 파싱 실패 skip: ${f}`);
      continue;
    }
    const recs = Array.isArray(data) ? data : [];
    for (const r of recs as Array<Record<string, string>>) {
      if (!r?.detailId || !r?.image) continue;
      raw++;
      if (!byBs.has(r.detailId)) {
        byBs.set(r.detailId, { detailId: r.detailId, image: r.image, setCode: r.setCode, number: r.number, koName: r.koName, file: f });
      }
    }
  }
  console.log(`[eim-kr] JSON 레코드 ${raw} → distinct BS코드 ${byBs.size}`);

  // 2. KR RegionCard 인덱스
  const locales = await prisma.regionCard.findMany({
    where: { region: "KR" },
    select: { id: true, imageSmall: true, logicalCardId: true },
  });
  const byImage = new Map<string, (typeof locales)[number]>();
  const byBasename = new Map<string, (typeof locales)[number]>();
  for (const l of locales) {
    if (!l.imageSmall) continue;
    byImage.set(l.imageSmall, l);
    byBasename.set(basenameKey(l.imageSmall), l);
  }
  console.log(`[eim-kr] KR RegionCard ${locales.length} (이미지 보유 ${byImage.size})`);

  // 3. ExternalSource id
  const src = await prisma.externalSource.findUnique({ where: { code: "pokemoncard_kr" }, select: { id: true } });
  if (!src) throw new Error("ExternalSource code=pokemoncard_kr 없음");

  // 4. 매칭 + upsert
  let exact = 0;
  let byName = 0;
  let conflict = 0;
  const missByFile = new Map<string, number>();
  let upserts = 0;
  for (const rec of byBs.values()) {
    const l = byImage.get(rec.image) ?? byBasename.get(basenameKey(rec.image));
    if (!l) {
      missByFile.set(rec.file, (missByFile.get(rec.file) ?? 0) + 1);
      continue;
    }
    if (byImage.get(rec.image)) exact++;
    else byName++;

    if (dryRun) {
      upserts++;
      continue;
    }
    // 충돌 검사: 같은 BS코드가 다른 locale 에 이미 매핑돼 있으면 로그만 (덮지 않음)
    const existing = await prisma.externalIdMapping.findUnique({
      where: { sourceId_externalId: { sourceId: src.id, externalId: rec.detailId } },
      select: { regionCardId: true },
    });
    if (existing && existing.regionCardId && existing.regionCardId !== l.id) {
      conflict++;
      console.warn(`[eim-kr] 충돌(미변경) ${rec.detailId}: 기존 ${existing.regionCardId} vs ${l.id}`);
      continue;
    }
    await prisma.externalIdMapping.upsert({
      where: { sourceId_externalId: { sourceId: src.id, externalId: rec.detailId } },
      create: {
        sourceId: src.id,
        externalId: rec.detailId,
        regionCardId: l.id,
        logicalCardId: l.logicalCardId,
        url: `https://pokemoncard.co.kr/cards/detail/${rec.detailId}`,
        verifiedBy: "auto:backfill-eim-kr-bs",
      },
      update: { regionCardId: l.id, logicalCardId: l.logicalCardId, verifiedBy: "auto:backfill-eim-kr-bs" },
    });
    upserts++;
  }

  const missTotal = [...missByFile.values()].reduce((a, b) => a + b, 0);
  console.log(
    `[eim-kr] 매칭 ${exact + byName}/${byBs.size} (정확 ${exact} + 파일명 ${byName}) · 미매칭 ${missTotal} · 충돌 ${conflict} · upsert ${upserts}${dryRun ? " (dry)" : ""}`,
  );
  if (missByFile.size) {
    const top = [...missByFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log(`[eim-kr] 미매칭 상위 파일: ${top.map(([f, n]) => `${f}(${n})`).join(", ")}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
