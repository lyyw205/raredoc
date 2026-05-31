/**
 * rarityId=NULL 인 LogicalCard 중 EN CardLocale 보유 카드를 pokemontcg.io API 로 보강.
 *
 * 실행: npx tsx scripts/fill-rarity-from-pokemontcg.ts
 *
 * 전략:
 *   1) EN CardLocale.id → pokemontcg.io GET /v2/cards/{id}
 *   2) card.rarity 텍스트 → Rarity.nameEn ILIKE 매칭 → rarityId update
 *   3) 실패 시 Rarity.code ILIKE 매칭 재시도
 *   4) 둘 다 실패 → followup-plans.md append (신규 Rarity 생성 금지)
 *   5) imageSmall/imageLarge 절대 건드리지 않음
 */
import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execFileAsync = promisify(execFile);

const API_KEY = process.env.POKEMONTCG_API_KEY ?? "";
const BATCH = 20;   // pokemontcg.io rate-limit 대비 배치 크기
const DELAY = 300;  // ms between batches

// en-tcg-xy0-001 → xy0-1 (pokemontcg.io 형식)
function toApiId(cardLocaleId: string): string {
  // 접두사 en-tcg- 제거
  let id = cardLocaleId.replace(/^en-tcg-/, "");
  // 마지막 숫자 세그먼트의 leading zero 제거: xy0-001 → xy0-1
  id = id.replace(/-0*(\d+[A-Za-z]?)$/, (_, n) => `-${n}`);
  return id;
}

async function fetchCard(cardLocaleId: string): Promise<{ rarity?: string } | null> {
  const apiId = toApiId(cardLocaleId);
  const args = [
    "-s", "-m", "10",
    ...(API_KEY ? ["-H", `X-Api-Key: ${API_KEY}`] : []),
    `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(apiId)}`,
  ];
  try {
    const { stdout } = await execFileAsync("curl", args, { timeout: 15000 });
    const json = JSON.parse(stdout);
    if (!json?.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function appendFollowup(lines: string[]) {
  if (lines.length === 0) return;
  const fpath = path.join(process.cwd(), "docs/followup-plans.md");
  const existing = fs.readFileSync(fpath, "utf-8");
  const section = `
---

## rarityId 미보강 잔여 — pokemontcg.io (fill-rarity-from-pokemontcg.ts, ${new Date().toISOString().slice(0, 10)})

pokemontcg.io 에서 rarity 텍스트를 가져왔으나 Rarity 마스터 매칭 실패 (신규 row 생성 금지 정책).
수동 검토 후 Rarity 마스터에 row 추가하거나 코드 매핑에 추가 필요.

| LogicalCard ID | EN CardLocale | era | rarity 텍스트 |
|---|---|---|---|
${lines.join("\n")}

`;
  fs.writeFileSync(fpath, existing + section, "utf-8");
  console.log(`followup-plans.md에 미보강 ${lines.length}건 기록 완료.`);
}

async function main() {
  // Before 통계
  const beforeTotal = await prisma.logicalCard.count({ where: { rarityId: null, setGroupId: { not: null } } });
  const beforeEra = await prisma.$queryRaw<{ era: string; cnt: bigint }[]>`
    SELECT sg.era, COUNT(*) as cnt
    FROM "LogicalCard" lc
    JOIN "SetGroup" sg ON sg.id = lc."setGroupId"
    WHERE lc."rarityId" IS NULL
    GROUP BY sg.era ORDER BY cnt DESC
  `;
  console.log(`시작: rarityId NULL (era 있는 것) = ${beforeTotal}`);
  beforeEra.forEach((r) => console.log(`  ${r.era}: ${r.cnt}`));

  // 대상: rarityId NULL && EN locale 있는 LogicalCard
  const targets = await prisma.logicalCard.findMany({
    where: {
      rarityId: null,
      setGroupId: { not: null },
      locales: { some: { region: "EN" } },
    },
    select: {
      id: true,
      setGroup: { select: { era: true } },
      locales: {
        where: { region: "EN" },
        select: { id: true },
        take: 1,
      },
    },
  });

  console.log(`\n대상: EN locale 보유 + rarityId NULL = ${targets.length}건`);

  // Rarity 마스터 로드 (nameEn lowercase → id)
  const rarities = await prisma.rarity.findMany({ select: { id: true, code: true, nameEn: true } });
  const nameEnMap = new Map<string, string>(); // lowercase nameEn → id
  const codeMap = new Map<string, string>();   // lowercase code → id
  for (const r of rarities) {
    if (r.nameEn) nameEnMap.set(r.nameEn.toLowerCase(), r.id);
    codeMap.set(r.code.toLowerCase(), r.id);
  }

  let updated = 0;
  let notFound = 0;
  let apiError = 0;
  const followupLines: string[] = [];

  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);

    await Promise.all(
      batch.map(async (lc) => {
        const enLocaleId = lc.locales[0]?.id;
        if (!enLocaleId) return;

        const card = await fetchCard(enLocaleId);
        if (!card) {
          apiError++;
          return;
        }

        const rarityText = card.rarity;
        if (!rarityText) {
          // API 응답에 rarity 없음 → followup
          followupLines.push(
            `| ${lc.id} | ${enLocaleId} | ${lc.setGroup?.era ?? "-"} | (없음) |`,
          );
          notFound++;
          return;
        }

        const rarityLc = rarityText.toLowerCase();
        let rarityId = nameEnMap.get(rarityLc);
        if (!rarityId) {
          // code 직접 매칭
          rarityId = codeMap.get(rarityLc);
        }

        if (rarityId) {
          await prisma.logicalCard.update({ where: { id: lc.id }, data: { rarityId } });
          updated++;
        } else {
          followupLines.push(
            `| ${lc.id} | ${enLocaleId} | ${lc.setGroup?.era ?? "-"} | ${rarityText} |`,
          );
          notFound++;
        }
      }),
    );

    if (i + BATCH < targets.length) await sleep(DELAY);
    if ((i / BATCH) % 10 === 0) {
      console.log(`  진행: ${i + batch.length}/${targets.length} (updated=${updated})`);
    }
  }

  // After 통계
  const afterTotal = await prisma.logicalCard.count({ where: { rarityId: null, setGroupId: { not: null } } });
  const afterEra = await prisma.$queryRaw<{ era: string; cnt: bigint }[]>`
    SELECT sg.era, COUNT(*) as cnt
    FROM "LogicalCard" lc
    JOIN "SetGroup" sg ON sg.id = lc."setGroupId"
    WHERE lc."rarityId" IS NULL
    GROUP BY sg.era ORDER BY cnt DESC
  `;

  await appendFollowup(followupLines);

  console.log("─".repeat(50));
  console.log(`결과: rarityId NULL before=${beforeTotal} → after=${afterTotal}`);
  console.log(`  업데이트: ${updated}건`);
  console.log(`  매칭 실패(followup): ${notFound}건`);
  console.log(`  API 오류: ${apiError}건`);
  console.log("era별 잔여 NULL:");
  afterEra.forEach((r) => console.log(`  ${r.era}: ${r.cnt}`));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
