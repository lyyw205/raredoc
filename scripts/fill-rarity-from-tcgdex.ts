/**
 * rarityId=NULL 인 Card 중 JP-only 카드(EN locale 없음)를 tcgdex JP/EN 로 보강.
 *
 * 실행: npx tsx scripts/fill-rarity-from-tcgdex.ts
 *
 * 전략:
 *   1) JP RegionCard.id (예: jp-tcg-SM8b-001) → tcgdex /v2/ja/cards/{id} 또는 /v2/en/cards/{id}
 *   2) card.rarity 텍스트 → Rarity.nameEn / nameJa ILIKE 매칭 → rarityId update
 *   3) 실패 → followup-plans.md append
 *   4) imageSmall/imageLarge 절대 건드리지 않음
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
const BATCH = 15;
const DELAY = 200;

// tcgdex card id 형식 예시:
//   jp-tcg-SM8b-001 → setId=SM8b, num=001
//   jp-tcg-XY1a-012 → setId=XY1a, num=012
// 비 jp-tcg- 형식(jp-mega-dream-ex-1 등)은 tcgdex 미수록 → null 반환
function toTcgdexId(regionCardId: string): { setId: string; num: string } | null {
  // jp-tcg- 접두사가 없으면 tcgdex 미수록 세트
  if (!regionCardId.startsWith("jp-tcg-")) return null;
  const rest = regionCardId.replace(/^jp-tcg-/, "");
  // 마지막 -숫자[알파] 세그먼트를 num으로, 나머지를 setId로
  const m = rest.match(/^(.+)-(\d+[A-Za-z]?)$/);
  if (!m) return null;
  return { setId: m[1], num: m[2] };
}

async function fetchTcgdex(setId: string, num: string): Promise<{ rarity?: string } | null> {
  for (const locale of ["ja", "en"]) {
    const url = `https://api.tcgdex.net/v2/${locale}/cards/${setId}-${num}`;
    try {
      const { stdout } = await execFileAsync("curl", ["-s", "-f", "-m", "10", url], { timeout: 15000 });
      const json = JSON.parse(stdout);
      if (json?.rarity) return json;
    } catch {
      // try next locale
    }
  }
  return null;
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

## rarityId 미보강 잔여 — tcgdex JP-only (fill-rarity-from-tcgdex.ts, ${new Date().toISOString().slice(0, 10)})

tcgdex 에서 rarity 텍스트를 가져왔으나 Rarity 마스터 매칭 실패 또는 API 응답 없음.

| Card ID | JP RegionCard | era | rarity 텍스트 |
|---|---|---|---|
${lines.join("\n")}

`;
  fs.writeFileSync(fpath, existing + section, "utf-8");
  console.log(`followup-plans.md에 미보강 ${lines.length}건 기록 완료.`);
}

async function main() {
  // Before 통계
  const beforeTotal = await prisma.card.count({
    where: {
      rarityId: null,
      cardPackId: { not: null },
      locales: { none: { region: "EN" } },
    },
  });
  console.log(`시작: JP-only rarityId NULL = ${beforeTotal}`);

  // 대상: rarityId NULL && EN locale 없고 JP locale 있는 Card
  const targets = await prisma.card.findMany({
    where: {
      rarityId: null,
      cardPackId: { not: null },
      locales: { none: { region: "EN" }, some: { region: "JP" } },
    },
    select: {
      id: true,
      cardPack: { select: { era: true } },
      locales: {
        where: { region: "JP" },
        select: { id: true },
        take: 1,
      },
    },
  });

  console.log(`대상: JP-only + rarityId NULL = ${targets.length}건`);

  // Rarity 마스터 로드
  const rarities = await prisma.rarity.findMany({ select: { id: true, code: true, nameEn: true, nameJa: true } });
  const nameEnMap = new Map<string, string>();
  const nameJaMap = new Map<string, string>();
  const codeMap = new Map<string, string>();
  for (const r of rarities) {
    if (r.nameEn) nameEnMap.set(r.nameEn.toLowerCase(), r.id);
    if (r.nameJa) nameJaMap.set(r.nameJa.toLowerCase(), r.id);
    codeMap.set(r.code.toLowerCase(), r.id);
  }

  // tcgdex JP rarity 텍스트 → Rarity 매핑 (알려진 변환)
  const TCGDEX_RARITY_MAP: Record<string, string> = {
    "c": "Common",
    "u": "Uncommon",
    "r": "Rare",
    "rr": "Double Rare",
    "sr": "Super Rare",
    "hr": "Hyper Rare",
    "ar": "Art Rare",
    "sar": "Special Art Rare",
    "ur": "Ultra Rare",
    "promo": "Promo",
    "common": "Common",
    "uncommon": "Uncommon",
    "rare": "Rare",
    // JP 표기
    "キラ": "Holo Rare",
    "コモン": "Common",
    "アンコモン": "Uncommon",
    "レア": "Rare",
  };

  let updated = 0;
  let notFound = 0;
  let apiError = 0;
  let skippedNonTcg = 0; // jp-tcg- 접두사 아닌 세트 (MEGA era 등) — tcgdex 미수록
  const followupLines: string[] = [];

  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);

    await Promise.all(
      batch.map(async (lc) => {
        const jpLocaleId = lc.locales[0]?.id;
        if (!jpLocaleId) return;

        const parsed = toTcgdexId(jpLocaleId);
        if (!parsed) {
          skippedNonTcg++;
          return;
        }

        const card = await fetchTcgdex(parsed.setId, parsed.num);
        if (!card) {
          apiError++;
          return;
        }

        const rarityText = card.rarity;
        if (!rarityText) {
          followupLines.push(`| ${lc.id} | ${jpLocaleId} | ${lc.cardPack?.era ?? "-"} | (없음) |`);
          notFound++;
          return;
        }

        const rarityLc = rarityText.toLowerCase();
        // 1) 알려진 매핑 변환
        const mapped = TCGDEX_RARITY_MAP[rarityText] ?? TCGDEX_RARITY_MAP[rarityLc];
        const lookupKey = mapped ? mapped.toLowerCase() : rarityLc;

        let rarityId = nameEnMap.get(lookupKey) ?? nameJaMap.get(lookupKey) ?? codeMap.get(lookupKey);

        if (rarityId) {
          await prisma.card.update({ where: { id: lc.id }, data: { rarityId } });
          updated++;
        } else {
          followupLines.push(`| ${lc.id} | ${jpLocaleId} | ${lc.cardPack?.era ?? "-"} | ${rarityText} |`);
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
  const afterTotal = await prisma.card.count({
    where: {
      rarityId: null,
      cardPackId: { not: null },
      locales: { none: { region: "EN" } },
    },
  });
  const afterEra = await prisma.$queryRaw<{ era: string; cnt: bigint }[]>`
    SELECT sg.era, COUNT(*) as cnt
    FROM "LogicalCard" lc
    JOIN "SetGroup" sg ON sg.id = lc."setGroupId"
    WHERE lc."rarityId" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "CardLocale" cl WHERE cl."logicalCardId" = lc.id AND cl.region = 'EN')
    GROUP BY sg.era ORDER BY cnt DESC
  `;

  await appendFollowup(followupLines);

  console.log("─".repeat(50));
  console.log(`결과: JP-only rarityId NULL before=${beforeTotal} → after=${afterTotal}`);
  console.log(`  업데이트: ${updated}건`);
  console.log(`  매칭 실패(followup): ${notFound}건`);
  console.log(`  API 오류: ${apiError}건`);
  console.log(`  tcgdex 미수록 세트(MEGA 등) 스킵: ${skippedNonTcg}건`);
  console.log("era별 잔여 JP-only NULL:");
  afterEra.forEach((r) => console.log(`  ${r.era}: ${r.cnt}`));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
