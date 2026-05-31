/**
 * 한국 발매팩 한글명·레어도 정본화 — 나무위키 수록표 기준.
 *
 * 나무위키가 한국 공식 카드명(메가/ex 포함)·레어도를 정확히 정리하므로, 한국 발매팩은
 * 이걸 1차 출처로 CardText(ko).name·nameKo·rarity 를 정정한다(덮어쓰기).
 *
 * - 카드명: 표의 카드명 셀 (메가지가르데 ex 등 정식 카드명) → CardText(ko)+nameKo
 * - 레어도: 표의 레어도 코드(C/U/R/RR/AR/SR/SAR/UR/HR/MUR) → 우리 Rarity.code 매핑 → LogicalCard.rarityId
 * - 매칭: Namu 컬렉션넘버 → setId 의 numberInt (한국=일본 번호체계 동일). 공유 LogicalCard 갱신 → KR/JP 동시 반영.
 * - supertype/분류는 표 셀구조 불안정으로 다루지 않음.
 *
 * 실행: npx tsx scripts/sync-pack-namu-ko.ts <setId> <namuTitle> [--dry-run]
 *   예: npx tsx scripts/sync-pack-namu-ko.ts jp-mega-munikisuzero 니힐제로 --dry-run
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const SET = process.argv[2];
const TITLE = process.argv[3];
const DRY = process.argv.includes("--dry-run");
if (!SET || !TITLE || SET.startsWith("--")) { console.error("usage: <setId> <namuTitle> [--dry-run]"); process.exit(1); }

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
// Namu 레어도 코드 → 우리 Rarity.code
const RMAP: Record<string, string> = {
  C: "Common", U: "Uncommon", R: "Rare", RR: "Double Rare", AR: "Art Rare",
  SR: "Super Rare", SAR: "Special Art Rare", UR: "Ultra Rare", HR: "Hyper Rare",
  MUR: "Mega Ultra Rare", CHR: "Character Rare", ACE: "ACE SPEC Rare", BWR: "Black White Rare",
};

async function fetchNamuRows(title: string): Promise<{ num: number; name: string; rarity: string }[]> {
  const url = `https://namu.wiki/w/${encodeURIComponent(title)}`;
  const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "30", "-A", UA, "-H", "Accept-Language: ko", url], { maxBuffer: 32 * 1024 * 1024 });
  const rows: { num: number; name: string; rarity: string }[] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").trim();
  while ((m = trRe.exec(stdout)) !== null) {
    const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => strip(c[1]));
    if (cells.length >= 3 && /^\d{1,3}\//.test(cells[0])) {
      rows.push({ num: parseInt(cells[0].split("/")[0], 10), name: cells[2], rarity: cells[cells.length - 1] });
    }
  }
  return rows;
}

async function main() {
  const rows = await fetchNamuRows(TITLE);
  console.log(`[init] Namu "${TITLE}" 카드행: ${rows.length}`);
  if (!rows.length) { console.error("표 추출 실패 — 제목/구조 확인"); process.exit(1); }

  // Rarity.code → id 캐시
  const rarities = await prisma.rarity.findMany({ select: { id: true, code: true } });
  const rarById = new Map(rarities.map((r) => [r.code, r.id]));

  // setId 의 numberInt → logicalCardId
  const cards = await prisma.cardLocale.findMany({ where: { setId: SET }, select: { numberInt: true, logicalCardId: true } });
  const lcByNum = new Map(cards.map((c) => [c.numberInt, c.logicalCardId]));

  let nameUpd = 0, rarUpd = 0, noCard = 0; const unmappedRar = new Set<string>(); const samples: string[] = [];
  for (const r of rows) {
    const lcId = lcByNum.get(r.num);
    if (!lcId) { noCard++; continue; }
    const rarCode = RMAP[r.rarity];
    const rarId = rarCode ? rarById.get(rarCode) : undefined;
    if (r.rarity && !rarCode) unmappedRar.add(r.rarity);
    if (samples.length < 10) samples.push(`#${r.num} "${r.name}" [${r.rarity}→${rarCode ?? "?"}]`);
    if (DRY) continue;
    if (r.name) {
      await prisma.cardText.upsert({
        where: { logicalCardId_language: { logicalCardId: lcId, language: "ko" } },
        update: { name: r.name, source: "namuwiki" },
        create: { logicalCardId: lcId, language: "ko", name: r.name, source: "namuwiki", confidence: 1.0 },
      });
      await prisma.logicalCard.update({ where: { id: lcId }, data: { nameKo: r.name } });
      nameUpd++;
    }
    if (rarId) { await prisma.logicalCard.update({ where: { id: lcId }, data: { rarityId: rarId } }); rarUpd++; }
  }

  console.log("\n=== NAMU KO SYNC SUMMARY ===");
  console.log({ set: SET, namuRows: rows.length, nameUpdated: nameUpd, rarityUpdated: rarUpd, noMatchingCard: noCard });
  if (unmappedRar.size) console.log("⚠ 미매핑 레어도코드:", [...unmappedRar]);
  console.log("샘플:"); samples.forEach((s) => console.log("  " + s));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
