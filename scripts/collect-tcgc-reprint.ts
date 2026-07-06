/**
 * 재판(reprint) 세트 수집 — tcgcollector 리스트의 원본귀속을 우리 DB 기존 Card 에 연결.
 *
 * 배경: Trick or Trade 등은 기존 카드를 특수 홀로로 재판한 것. 새 Card(정체성)를 만들지 않고,
 *       각 재판 카드를 **원본 Card 에 연결한 얇은 RegionCard 1행**으로 적재(게임데이터는 원본에서 상속).
 *
 * 입력: --cards-json=<path> — patchright 렌더 파싱 산출물 [{name,origSet,origNum,image,tcgcId}].
 *       origSet/origNum(원본세트명·번호)로 SETMAP 을 거쳐 우리 RegionCard→cardId 해석.
 *
 * 정체성: 새 RegionCard 만 생성(cardId=기존 Card). region=EN 신규세트 = mapping-lock FREE
 *         (EN RegionCard 생성 자유, 공유 Card 의 dex/species 는 안 건드림).
 * 안전: 30장 전부 (a) 원본 RegionCard 존재 (b) 이름 일치 여야 적재. 하나라도 실패 시 전체 abort.
 *       dry-run 기본, --apply.
 *
 * 실행:
 *   npx tsx scripts/collect-tcgc-reprint.ts --set=tt2023 --cards-json=/…/tt2023-cards.json
 *   npx tsx scripts/collect-tcgc-reprint.ts --set=tt2023 --cards-json=… --apply
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { Logger } from "./lib/price-sync-lib";

const log = new Logger("collect-reprint");

type SetCfg = { setId: string; name: string; series: string; code: string | null; release: string; packType: string };
const SETS: SetCfg[] = [
  { setId: "tt2023", name: "Trick or Trade 2023", series: "Sword & Shield", code: "TTBB23", release: "2023-09-01", packType: "box_set" },
];

// 원본 세트명 → 우리 DB Set id (본세트 우선, TG/프로모 아님). TT 는 원본세트 번호(NN/총장수)를 그대로 씀.
const SETMAP: Record<string, string> = {
  "Paldea Evolved": "sv2",
  "Scarlet & Violet": "sv1",
  "Silver Tempest": "en-tcg-swsh12",
  "Lost Origin": "en-tcg-swsh11",
  "Evolving Skies": "en-tcg-swsh7",
  "Vivid Voltage": "en-tcg-swsh4",
  "Rebel Clash": "en-tcg-swsh2",
  "Sword & Shield": "en-tcg-swsh1",
};

type RC = { name: string; origSet: string; origNum: string; image: string; tcgcId?: string };
const bare = (n: string) => n.split("/")[0].replace(/^0+(?=\d)/, "");
const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function collectSet(cfg: SetCfg, cardsJson: string, apply: boolean, force: boolean) {
  log.info(`── ${cfg.setId} (${cfg.name}) ──`);
  const existing = await prisma.set.findUnique({ where: { id: cfg.setId }, select: { id: true } });
  if (existing && !force) { log.warn(`${cfg.setId} 이미 존재 → 스킵 (--force)`); return; }

  const cards: RC[] = JSON.parse(readFileSync(cardsJson, "utf-8"));
  log.info(`tcgcollector 리스트: ${cards.length}장 (재판)`);

  // 해석 + 검증 (전건 통과해야 적재)
  const resolved: { c: RC; cardId: string; origName: string }[] = [];
  for (const c of cards) {
    const setId = SETMAP[c.origSet];
    if (!setId) throw new Error(`${cfg.setId}: "${c.name}" origSet "${c.origSet}" SETMAP 미정의`);
    const rc = await prisma.regionCard.findFirst({
      where: { setId, region: "EN", numberInt: parseInt(bare(c.origNum), 10) },
      select: { name: true, cardId: true },
    });
    if (!rc) throw new Error(`${cfg.setId}: "${c.name}" ← ${c.origSet} ${c.origNum} 원본 RegionCard 없음(set=${setId})`);
    if (!(norm(rc.name) === norm(c.name) || norm(rc.name).includes(norm(c.name)) || norm(c.name).includes(norm(rc.name))))
      throw new Error(`${cfg.setId}: 이름 불일치 ABORT — "${c.name}" ← ${c.origSet} ${c.origNum} vs DB "${rc.name}"`);
    resolved.push({ c, cardId: rc.cardId, origName: rc.name });
  }
  log.info(`✓ 30장 전부 기존 Card 해석·이름검증 통과`);

  // dry-run 표
  for (const r of resolved) console.log(`  ${r.c.name.padEnd(20)} ← ${r.c.origSet} ${r.c.origNum} → Card ${r.cardId}`);
  if (!apply) { log.info(`(dry-run) --apply 로 적재.`); return; }

  await prisma.set.upsert({
    where: { id: cfg.setId },
    create: {
      id: cfg.setId, name: cfg.name, series: cfg.series, releaseDate: new Date(`${cfg.release}T00:00:00Z`),
      cardCount: cards.length, region: "EN", code: cfg.code, packType: cfg.packType, titleCleanEn: cfg.name,
      logoUrl: null, symbolUrl: null, cardPackId: null,
    },
    update: { name: cfg.name, cardCount: cards.length, code: cfg.code, titleCleanEn: cfg.name },
  });

  let n = 0;
  for (const r of resolved) {
    // id/number: 원본 full 번호로 유니크 보장(예 089/198 vs 089/202 는 denominator 로 구분).
    const full = r.c.origNum; // "062/193"
    const rcId = `${cfg.setId}-${full.replace(/\//g, "-")}`;
    await prisma.regionCard.upsert({
      where: { id: rcId },
      create: {
        id: rcId, cardId: r.cardId, language: "en", region: "EN", setId: cfg.setId,
        number: full, numberInt: parseInt(bare(full), 10), name: r.c.name,
        imageSmall: r.c.image, imageLarge: r.c.image, rarityId: null, regulationMark: null, legalities: undefined,
      },
      update: { cardId: r.cardId, name: r.c.name, imageSmall: r.c.image, imageLarge: r.c.image },
    });
    n++;
  }
  log.info(`✓ ${cfg.setId}: Set + ${n} RegionCard(기존 Card 연결) 적재 완료`);
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const force = args.includes("--force");
  const only = args.find((a) => a.startsWith("--set="))?.split("=")[1];
  const cardsJson = args.find((a) => a.startsWith("--cards-json="))?.split("=")[1];
  if (!only || !cardsJson) throw new Error("--set=<id> --cards-json=<path> 필요");
  const cfg = SETS.find((s) => s.setId === only);
  if (!cfg) throw new Error(`--set='${only}' 미정의`);
  log.info(`${apply ? "APPLY" : "DRY-RUN"} — ${cfg.setId}`);
  await collectSet(cfg, cardsJson, apply, force);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
