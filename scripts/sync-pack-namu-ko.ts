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
  C: "Common", U: "Uncommon", R: "Rare", RR: "Double Rare", RRR: "Triple Rare", AR: "Art Rare",
  SR: "Super Rare", SAR: "Special Art Rare", UR: "Ultra Rare", HR: "Hyper Rare",
  MUR: "Mega Ultra Rare", CHR: "Character Rare", CSR: "Character Super Rare", ACE: "ACE SPEC Rare", BWR: "Black White Rare",
  K: "Radiant Rare", // 나무위키 K = かがやく(Radiant) 포켓몬 (SWSH era)
  ASR: "Super Rare", AHR: "Hyper Rare", // A 접두 = 알터아트 SR/HR (SWSH era, 마스터에 알터아트 구분 없어 SR/HR로 매핑)
  A: "Amazing Rare", S: "Shiny Rare", SSR: "Shiny Secret Rare", // SWSH era: A=어메이징, S=샤이니, SSR=샤이니 시크릿 (샤이니스타V 기존 데이터로 확정)
};

async function fetchNamuRows(title: string): Promise<{ num: number; name: string; rarity: string }[]> {
  const url = `https://namu.wiki/w/${encodeURIComponent(title)}`;
  const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "30", "-A", UA, "-H", "Accept-Language: ko", url], { maxBuffer: 32 * 1024 * 1024 });
  const rows: { num: number; name: string; rarity: string }[] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").trim();
  const NUM_RE = /^(\d{1,3})\s*\/\s*(\d{1,3})/; // "001/095" 또는 "001 / 095"(공백 허용)
  // 표 레이아웃이 페이지마다 다름(컬럼 순서·이름 위치). 헤더행(카드명/레어도)을 읽어 컬럼 인덱스를 매핑.
  // 헤더가 없으면 폴백(번호 다음 셀=이름, 마지막 셀=레어도). 여러 표는 분모 최대값(=본세트)만 채택해 서브표 오염 방지.
  let nameIdx = -1, rarIdx = -1, numIdx = -1; // 현재 표의 컬럼 맵(헤더마다 갱신)
  const raw: { num: number; den: number; name: string; rarity: string }[] = [];
  while ((m = trRe.exec(stdout)) !== null) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => strip(c[1]));
    if (!cells.length) continue;
    // 헤더행 감지 → 컬럼 인덱스 설정
    const hName = cells.findIndex((c) => /카드\s*명|카드이름|^이름$/.test(c));
    if (hName >= 0) {
      nameIdx = hName;
      rarIdx = cells.findIndex((c) => /레어도|레어리티|희귀도|등급/.test(c));
      numIdx = cells.findIndex((c) => /컬렉션|넘버|번호|No\.?/.test(c));
      continue;
    }
    // 데이터행: 번호 셀 찾기(헤더가 지정한 numIdx 우선, 없으면 패턴 검색)
    let nIdx = numIdx >= 0 && NUM_RE.test(cells[numIdx] ?? "") ? numIdx : cells.findIndex((c) => NUM_RE.test(c));
    if (nIdx < 0) continue;
    const mm = NUM_RE.exec(cells[nIdx])!;
    const num = parseInt(mm[1], 10), den = parseInt(mm[2], 10);
    const name = (nameIdx >= 0 ? cells[nameIdx] : cells[nIdx + 1]) ?? "";
    const rarity = (rarIdx >= 0 ? cells[rarIdx] : cells[cells.length - 1]) ?? "";
    if (name && !NUM_RE.test(name)) raw.push({ num, den, name, rarity });
  }
  if (!raw.length) return rows;
  const maxDen = Math.max(...raw.map((r) => r.den));
  for (const r of raw) if (r.den === maxDen) rows.push({ num: r.num, name: r.name, rarity: r.rarity });
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
  const cards = await prisma.regionCard.findMany({ where: { setId: SET }, select: { numberInt: true, logicalCardId: true } });
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
