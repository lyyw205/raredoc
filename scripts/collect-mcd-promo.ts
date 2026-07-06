/**
 * McDonald's Collection 2023/2024 신규 수집 (EN 단독 프로모 세트).
 *
 * 배경: pokemontcg.io 에 2023/2024 가 없어(2022까지만) 기존 EN 수집 파이프라인이 못 채우던 세트.
 *       게임데이터는 tcgdex(2023sv/2024sv), 이미지·번호는 tcgcsv(tcgplayer CDN)에서 병합해 적재.
 *       기존 형제 세트 mcd11~mcd22 구조를 그대로 미러링 — Set + orphan Card + RegionCard(region=EN).
 *
 * 정체성: 신규 EN 세트라 mapping-lock FREE(PROTECTED_GROUPS 무관, cardPackId=null). 가드 불필요.
 *         Card 는 자기참조 orphan(lc-orphan-{setId}-{num}) — JP 앵커 병합은 후속(over-merge 금지).
 * SKU:    PrintVariant 는 만들지 않음 — 시세 최초 기록 시 upsertDailyPrice 가 standard 자동 생성.
 *
 * 안전: 번호별 tcgdex 이름 ↔ tcgcsv 이름 대조 실패 시 그 세트 전체 abort(정체성 오매칭 차단).
 *       기본 dry-run(표만 출력). 실제 적재는 --apply. 이미 존재하는 Set 은 스킵(--force 로 재적재).
 *
 * 실행:
 *   npx tsx scripts/collect-mcd-promo.ts            # dry-run (전 세트 표 출력)
 *   npx tsx scripts/collect-mcd-promo.ts --apply    # 적재
 *   npx tsx scripts/collect-mcd-promo.ts --set=mcd23 --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "@/lib/prisma";
import { supertypeOf } from "./lib/supertype";
import { fetchJsonWithRetry, Logger } from "./lib/price-sync-lib";

const execFileP = promisify(execFile);
const log = new Logger("collect-mcd");

// tcgdex 는 node fetch 가 막혀 curl 로만 접근(enrich-era-meta-tcgdex.ts 패턴).
async function tcgdexJson<T>(url: string): Promise<T | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", url], { maxBuffer: 16 * 1024 * 1024 });
    return stdout ? (JSON.parse(stdout) as T) : null;
  } catch {
    return null;
  }
}

const TCGDEX = "https://api.tcgdex.net/v2/en";
const TCGCSV = "https://tcgcsv.com/tcgplayer";
const CDN = (pid: number, size: string) => `https://tcgplayer-cdn.tcgplayer.com/product/${pid}_${size}.jpg`;

type SetCfg = {
  setId: string;
  tcgdexSetId: string;
  tcgcsvGroup: number;
  name: string;
  code: string;
  release: string; // YYYY-MM-DD (tcgdex releaseDate)
  sealedProductId: number; // Match & Battle Pack (카드 아님, 참고용)
};

const SETS: SetCfg[] = [
  { setId: "mcd23", tcgdexSetId: "2023sv", tcgcsvGroup: 23306, name: "McDonald's Collection 2023", code: "M23", release: "2023-08-01", sealedProductId: 516527 },
  { setId: "mcd24", tcgdexSetId: "2024sv", tcgcsvGroup: 24163, name: "McDonald's Collection 2024", code: "M24", release: "2024-12-04", sealedProductId: 615609 },
];

// ── tcgdex 카드 상세 형태(필요 필드만) ──
type TdCard = {
  localId: string | number;
  name: string;
  category?: string; // Pokemon|Trainer|Energy
  hp?: number;
  types?: string[];
  stage?: string; // Basic|Stage1|Stage2
  retreat?: number;
  weaknesses?: { type: string; value: string }[];
  resistances?: { type: string; value: string }[];
  illustrator?: string;
  rarity?: string; // "None" 등
  dexId?: number[];
  evolveFrom?: string;
  abilities?: { type?: string; name: string; effect?: string }[];
  attacks?: { cost?: string[]; name?: string; effect?: string; damage?: number | string | null }[];
};
type TdSet = { cards: { localId: string | number; id: string }[] };
type TcgProduct = { productId: number; name: string; extendedData?: { name: string; value: string }[] };

// tcgdex stage → 우리 subtypes
function subtypesOf(stage?: string): string[] {
  if (!stage) return [];
  const s = stage.replace(/\s+/g, "").toLowerCase();
  if (s === "basic") return ["Basic"];
  if (s === "stage1") return ["Stage 1"];
  if (s === "stage2") return ["Stage 2"];
  return [stage]; // 그 외는 원본 보존
}

// tcgdex [{type,value:"×2"}] → "Fire×2" (orphan 컨벤션: 무공백 ×). 없으면 null.
function typeValue(rows?: { type: string; value: string }[]): string | null {
  if (!rows || !rows.length) return null;
  const r = rows[0];
  return `${r.type}${r.value}`;
}

// tcgdex attacks → 우리 {cost,name,text,damage}. text=effect??"", damage 문자열화|null.
function normAttacks(atks?: TdCard["attacks"]) {
  if (!atks || !atks.length) return null;
  return atks.map((a) => ({
    cost: Array.isArray(a.cost) ? a.cost : [],
    name: a.name ?? "",
    text: a.effect ?? "",
    damage: a.damage != null && a.damage !== "" ? String(a.damage) : null,
  }));
}
function normAbilities(abis?: TdCard["abilities"]) {
  if (!abis || !abis.length) return null;
  return abis.map((a) => ({ type: a.type ?? "Ability", name: a.name ?? "", text: a.effect ?? "" }));
}

// tcgcsv "001/015" → "1"
const bareNum = (n: string) => n.split("/")[0].replace(/^0+(?=\d)/, "");

async function collectSet(cfg: SetCfg, apply: boolean, force: boolean) {
  log.info(`── ${cfg.setId} (${cfg.name}) ──`);

  const existing = await prisma.set.findUnique({ where: { id: cfg.setId }, select: { id: true } });
  if (existing && !force) {
    log.warn(`${cfg.setId} 이미 존재 → 스킵 (재적재하려면 --force)`);
    return;
  }

  // 1) tcgdex 카드 목록 + 상세
  const tdSet = await tcgdexJson<TdSet>(`${TCGDEX}/sets/${cfg.tcgdexSetId}`);
  if (!tdSet?.cards?.length) throw new Error(`tcgdex ${cfg.tcgdexSetId} 카드목록 실패`);
  const details = new Map<number, TdCard>();
  for (const c of tdSet.cards) {
    const d = await tcgdexJson<TdCard>(`${TCGDEX}/cards/${c.id}`);
    if (!d) throw new Error(`tcgdex 카드 ${c.id} 상세 실패`);
    details.set(Number(c.localId), d);
  }

  // 2) tcgcsv 상품 → 번호별 {productId, name} (sealed=Number 없음 → 제외)
  const prodResp = await fetchJsonWithRetry<{ results: TcgProduct[] }>(`${TCGCSV}/3/${cfg.tcgcsvGroup}/products`, { log });
  const byNum = new Map<number, { productId: number; name: string }>();
  for (const p of prodResp?.results ?? []) {
    const numRaw = p.extendedData?.find((e) => e.name === "Number")?.value;
    if (!numRaw) continue; // sealed
    byNum.set(Number(bareNum(numRaw)), { productId: p.productId, name: p.name });
  }

  // 3) 병합 + 이름 대조 (실패 시 전체 abort)
  const normName = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const records: {
    number: string; numInt: number; name: string; card: TdCard; productId: number;
  }[] = [];
  for (let i = 1; i <= tdSet.cards.length; i++) {
    const td = details.get(i);
    const cs = byNum.get(i);
    if (!td) throw new Error(`${cfg.setId} #${i}: tcgdex 상세 없음`);
    if (!cs) throw new Error(`${cfg.setId} #${i}: tcgcsv 상품 없음(이미지 소스 결손)`);
    const a = normName(td.name), b = normName(cs.name);
    if (!(a === b || (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))))) {
      throw new Error(`${cfg.setId} #${i} 이름 불일치 ABORT: tcgdex"${td.name}" ≠ tcgcsv"${cs.name}"`);
    }
    records.push({ number: String(i), numInt: i, name: td.name, card: td, productId: cs.productId });
  }
  log.info(`병합 완료: ${records.length}장 (이름 대조 전부 통과)`);

  // 4) dry-run 표
  for (const r of records) {
    const c = r.card;
    console.log(
      `  #${r.number.padStart(2)} ${r.name.padEnd(18)} ${supertypeOf(c.category) ?? "?"} hp=${c.hp ?? "-"} ` +
      `type=${(c.types ?? []).join("/")} sub=${subtypesOf(c.stage).join(",")} rt=${c.retreat ?? "-"} ` +
      `weak=${typeValue(c.weaknesses) ?? "-"} dex=${(c.dexId ?? []).join(",")} atk=${(c.attacks ?? []).length} illus=${c.illustrator ?? "-"}`
    );
  }

  if (!apply) {
    log.info(`(dry-run) --apply 로 적재. sealed productId=${cfg.sealedProductId}(카드 아님)`);
    return;
  }

  // 5) 적재: Set → (카드마다) Card(orphan) → RegionCard
  await prisma.set.upsert({
    where: { id: cfg.setId },
    create: {
      id: cfg.setId, name: cfg.name, series: "McDonald's",
      releaseDate: new Date(`${cfg.release}T00:00:00Z`), cardCount: records.length,
      region: "EN", code: cfg.code, packType: "box_set", titleCleanEn: cfg.name,
      logoUrl: null, symbolUrl: null, cardPackId: null,
    },
    update: { name: cfg.name, cardCount: records.length, code: cfg.code, titleCleanEn: cfg.name },
  });

  let created = 0;
  for (const r of records) {
    const c = r.card;
    const cardId = `lc-orphan-${cfg.setId}-${r.number}`;
    const rcId = `${cfg.setId}-${r.number}`;
    const dex = (c.dexId ?? []).filter((n) => Number.isFinite(n));
    await prisma.card.upsert({
      where: { id: cardId },
      create: {
        id: cardId, primarySetId: cfg.setId, primaryNumber: r.number, primaryNumberInt: r.numInt,
        supertype: supertypeOf(c.category), subtypes: subtypesOf(c.stage), types: c.types ?? [],
        hp: c.hp ?? null, retreatCost: c.retreat ?? null,
        weakness: typeValue(c.weaknesses), resistance: typeValue(c.resistances),
        illustrator: c.illustrator ?? null, evolvesFrom: c.evolveFrom ?? null, evolvesTo: [],
        attacks: normAttacks(c.attacks) ?? undefined, abilities: normAbilities(c.abilities) ?? undefined,
        pokedexNumbers: dex, rarityId: null, rules: [],
      },
      update: {
        supertype: supertypeOf(c.category), subtypes: subtypesOf(c.stage), types: c.types ?? [],
        hp: c.hp ?? null, retreatCost: c.retreat ?? null,
        weakness: typeValue(c.weaknesses), resistance: typeValue(c.resistances),
        illustrator: c.illustrator ?? null, attacks: normAttacks(c.attacks) ?? undefined,
        abilities: normAbilities(c.abilities) ?? undefined, pokedexNumbers: dex,
      },
    });
    await prisma.regionCard.upsert({
      where: { id: rcId },
      create: {
        id: rcId, cardId, language: "en", region: "EN", setId: cfg.setId,
        number: r.number, numberInt: r.numInt, name: r.name,
        imageSmall: CDN(r.productId, "200w"), imageLarge: CDN(r.productId, "in_1000x1000"),
        rarityId: null, regulationMark: null, legalities: undefined,
      },
      update: { name: r.name, imageSmall: CDN(r.productId, "200w"), imageLarge: CDN(r.productId, "in_1000x1000") },
    });
    created++;
  }
  log.info(`✓ ${cfg.setId}: Set + ${created} Card/RegionCard 적재 완료`);
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const force = args.includes("--force");
  const only = args.find((a) => a.startsWith("--set="))?.split("=")[1];
  const targets = only ? SETS.filter((s) => s.setId === only) : SETS;
  if (!targets.length) throw new Error(`--set='${only}' 매칭 없음 (${SETS.map((s) => s.setId).join(", ")})`);

  log.info(`${apply ? "APPLY" : "DRY-RUN"} — 대상 ${targets.map((s) => s.setId).join(", ")}`);
  for (const cfg of targets) await collectSet(cfg, apply, force);

  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
