// en-metadata-check 스킬 — EN 카드 메타데이터 완전성+정확성 감사 (읽기 전용)
//   권위 소스 = pokemontcg.io(EN). 각 EN 카드의 필드를 DB 와 대조해:
//     ① EMPTY  : DB 비어있고 권위엔 값 있음 → 수집(채움) 후보
//     ② MISMATCH: 둘 다 있는데 다름 → 정확성 점검(확인 후 교정)
//   계층 인지: 게임스탯=Card / EN표시(name·이미지·rarity)=RegionCard / 기술텍스트=orphan만 Card.
//   ⚠ bound(JP 형제 있음) 카드의 Card.attacks/abilities 는 JP 오라클 텍스트라 비교/덮어쓰기 안 함
//      → EN 기술텍스트는 CardText(en) 백필 여부만 리포트.
//
// 사용(레포 루트):
//   npx tsx .claude/skills/en-metadata-check/scripts/audit-en-metadata.ts --set <enSetId> [--emit-plan /tmp/<set>-meta-plan.json]
//   (--emit-plan: 완전성 EMPTY 채움 액션만 plan 으로 출력. MISMATCH 는 확인 대상이라 plan 에 자동 포함 안 함.)
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { protectedTouched } from "../../../../scripts/lib/protected-groups";
import { writeFileSync } from "node:fs";

function parseArgs(argv: string[]) {
  const out: { set?: string; emitPlan?: string; emitRarityPlan?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--set") out.set = argv[++i];
    else if (a === "--emit-plan") out.emitPlan = argv[++i];
    else if (a === "--emit-rarity-plan") out.emitRarityPlan = argv[++i];
  }
  return out;
}

const numKey = (n: string) => String(n).replace(/^0+(?=\d)/, "");
const lc = (s: any) => String(s ?? "").trim().toLowerCase();
const normName = (s: any) => lc(s).replace(/[’']/g, "'").replace(/\s+/g, " ");
const arrSet = (a?: any[] | null) => [...new Set((a ?? []).map((x) => lc(x)))].sort();
const arrEq = (a?: any[] | null, b?: any[] | null) => arrSet(a).join("|") === arrSet(b).join("|");
const normMul = (s: any) => String(s ?? "").replace(/×/g, "x").replace(/\s+/g, "").toLowerCase();

// DB weakness/resistance 는 String(JSON 텍스트) — 관용적 파서. attacks/abilities 는 Json(파싱됨).
function asArr(v: any): any[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string") { const t = v.trim(); if (!t) return []; try { const j = JSON.parse(t); return Array.isArray(j) ? j : [j]; } catch { return [{ type: t }]; } }
  if (typeof v === "object") return [v];
  return [];
}
// type 토큰만 추출 — DB weakness/resistance 가 JSON([{type,value}]) 또는 평문("Fire×2"·"Fighting-30")으로
// 섞여 저장됨. 평문은 배수/값 접미(×2·x2·-30·+20)를 떼어 type 만 남긴다(포맷차 오탐 방지).
const typeSet = (arr: any[]) => [...new Set(arr.map((x) => lc(x?.type ?? x).replace(/\s*[×x]\s*\d+$/, "").replace(/\s*[-+]\s*\d+$/, "").trim()))].filter(Boolean).sort();

async function fetchPtcg(code: string) {
  const out: any[] = [];
  for (let pg = 1; pg <= 6; pg++) {
    const r = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${code}&pageSize=250&page=${pg}`);
    if (!r.ok) break;
    const j: any = await r.json();
    if (!j.data?.length) break;
    out.push(...j.data);
    if (j.data.length < 250) break;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.set) throw new Error("--set <enSetId> 필요");
  const set = await prisma.set.findUnique({ where: { id: args.set }, select: { id: true, name: true, region: true, code: true, cardCount: true, cardPackId: true } });
  if (!set) throw new Error(`Set 없음: ${args.set}`);
  if (set.region !== "EN") throw new Error(`region=EN 세트가 아님: ${args.set} (${set.region})`);

  // ptcg.io set.id 후보: set.id(en-tcg- 제거)가 보통 ptcg id 와 일치(me1·zsv10pt5 등). set.code(BLK 등 마케팅코드)는 폴백.
  const idCode = set.id.replace(/^en-tcg-/, "").toLowerCase();
  const codeCode = (set.code || "").toLowerCase();
  let ptcgCode = idCode;
  let auth = await fetchPtcg(ptcgCode);
  if (!auth.length && codeCode && codeCode !== idCode) { ptcgCode = codeCode; auth = await fetchPtcg(ptcgCode); }
  if (!auth.length) throw new Error(`pokemontcg.io 에서 set.id:${idCode}${codeCode && codeCode !== idCode ? `/${codeCode}` : ""} 카드 0건 — tcgdex 폴백 필요(프로모/신팩, references/metadata-sources.md).`);
  // ⚠ ptcg 가 같은 번호에 여러 카드를 둘 수 있다(예 zsv10pt5 #60 = Escavalier + Antique Cover Fossil).
  //   번호→카드[] 멀티맵으로 담고, 조회 시 *이름이 일치하는* 카드를 고른다(없으면 첫 카드). 중복번호 오비교 방지.
  const byNum = new Map<string, any[]>();
  for (const c of auth) { const k = numKey(String(c.number)); (byNum.get(k) ?? byNum.set(k, []).get(k))!.push(c); }

  const rcs = await prisma.regionCard.findMany({
    where: { setId: set.id, region: "EN" },
    select: {
      id: true, number: true, numberInt: true, name: true, flavorText: true, imageSmall: true, imageLarge: true,
      rarity: { select: { code: true, nameEn: true } },
      card: {
        select: {
          id: true, cardPackId: true, supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
          weakness: true, resistance: true, evolvesFrom: true, illustrator: true, flavorText: true, pokedexNumbers: true,
          attacks: true, abilities: true, rarity: { select: { code: true, nameEn: true } },
          locales: { select: { region: true } },
          texts: { select: { language: true, name: true, attacks: true, abilities: true } },
        },
      },
    },
    orderBy: [{ numberInt: "asc" }, { number: "asc" }],
  });

  const POKE = (st?: string | null) => st === "Pokémon" || st === "Pokemon";
  type Issue = { field: string; kind: "empty" | "mismatch"; db: any; authority: any; layer: "Card" | "RegionCard" | "CardText"; fillable: boolean };
  type Plan = { regionCardId: string; cardId: string; layer: "Card" | "RegionCard"; field: string; value: any; kind: "fill"; note: string };

  const report: any[] = [];
  const plan: Plan[] = [];
  const rarityFixes: any[] = []; // rarity MISMATCH 교정(EN RegionCard.rarity ← ptcg.io EN 용어) — --emit-rarity-plan
  let noAuth = 0;

  for (const rc of rcs) {
    const c = rc.card;
    const cands = byNum.get(numKey(rc.number)) ?? [];
    const a = cands.find((x: any) => normName(x.name) === normName(rc.name)) ?? cands[0]; // 중복번호면 이름일치 우선
    const bound = c.locales.some((l) => l.region === "JP"); // JP 형제 있음 = 공유 Card
    if (!a) { noAuth++; report.push({ number: rc.number, name: rc.name, status: "권위없음", note: `pokemontcg.io 에 #${rc.number} 없음(시크릿 지연/EN단독)` }); continue; }

    const issues: Issue[] = [];
    const push = (field: string, kind: "empty" | "mismatch", db: any, authority: any, layer: Issue["layer"], fillable: boolean) => issues.push({ field, kind, db, authority, layer, fillable });
    const wantFill = (field: string, layer: "Card" | "RegionCard", value: any, note: string) => plan.push({ regionCardId: rc.id, cardId: c.id, layer, field, value, kind: "fill", note });

    // name (EN 표시 — RegionCard)
    if (a.name && normName(rc.name) !== normName(a.name)) push("name", "mismatch", rc.name, a.name, "RegionCard", false);

    // hp (Card, 게임스탯)
    if (POKE(c.supertype)) {
      if (c.hp == null && a.hp != null) { push("hp", "empty", null, a.hp, "Card", true); wantFill("hp", "Card", parseInt(a.hp, 10), "ptcg.io"); }
      else if (c.hp != null && a.hp != null && c.hp !== parseInt(a.hp, 10)) push("hp", "mismatch", c.hp, a.hp, "Card", false);

      // types
      if ((c.types ?? []).length === 0 && (a.types ?? []).length) { push("types", "empty", c.types, a.types, "Card", true); wantFill("types", "Card", a.types, "ptcg.io"); }
      else if ((c.types ?? []).length && (a.types ?? []).length && !arrEq(c.types, a.types)) push("types", "mismatch", c.types, a.types, "Card", false);

      // retreatCost (DB Int vs authority array length)
      const aRetreat = Array.isArray(a.retreatCost) ? a.retreatCost.length : (a.convertedRetreatCost ?? null);
      if (c.retreatCost == null && aRetreat != null) { push("retreatCost", "empty", null, aRetreat, "Card", true); wantFill("retreatCost", "Card", aRetreat, "ptcg.io"); }
      else if (c.retreatCost != null && aRetreat != null && c.retreatCost !== aRetreat) push("retreatCost", "mismatch", c.retreatCost, aRetreat, "Card", false);

      // weakness / resistance (type 비교, 값 ×/x 정규화)
      const dbWeak = typeSet(asArr(c.weakness)), aWeak = typeSet(a.weaknesses ?? []);
      if (!dbWeak.length && aWeak.length) { push("weakness", "empty", c.weakness, a.weaknesses, "Card", true); wantFill("weakness", "Card", JSON.stringify((a.weaknesses ?? []).map((w: any) => ({ type: w.type, value: normMul(w.value) }))), "ptcg.io"); }
      else if (dbWeak.length && aWeak.length && dbWeak.join("|") !== aWeak.join("|")) push("weakness", "mismatch", dbWeak, aWeak, "Card", false);
      const dbRes = typeSet(asArr(c.resistance)), aRes = typeSet(a.resistances ?? []);
      if (!dbRes.length && aRes.length) { push("resistance", "empty", c.resistance, a.resistances, "Card", true); wantFill("resistance", "Card", JSON.stringify((a.resistances ?? []).map((w: any) => ({ type: w.type, value: normMul(w.value) }))), "ptcg.io"); }
      else if (dbRes.length && aRes.length && dbRes.join("|") !== aRes.join("|")) push("resistance", "mismatch", dbRes, aRes, "Card", false);

      // evolvesFrom (언어 의존: bound 는 공유 Card 에 JP 진화명 저장 → EN 권위와 비교/채움하면 오탐. orphan 만)
      if (!bound) {
        if (!c.evolvesFrom && a.evolvesFrom) { push("evolvesFrom", "empty", null, a.evolvesFrom, "Card", true); wantFill("evolvesFrom", "Card", a.evolvesFrom, "ptcg.io"); }
        else if (c.evolvesFrom && a.evolvesFrom && lc(c.evolvesFrom) !== lc(a.evolvesFrom)) push("evolvesFrom", "mismatch", c.evolvesFrom, a.evolvesFrom, "Card", false);
      }

      // pokedexNumbers
      if ((c.pokedexNumbers ?? []).length === 0 && (a.nationalPokedexNumbers ?? []).length) { push("pokedexNumbers", "empty", c.pokedexNumbers, a.nationalPokedexNumbers, "Card", true); wantFill("pokedexNumbers", "Card", a.nationalPokedexNumbers, "ptcg.io"); }
    }

    // subtypes (저신뢰: bound 은 JP 정규화로 EN 메커니즘 누락 가능 — 리포트만)
    if ((c.subtypes ?? []).length === 0 && (a.subtypes ?? []).length) {
      push("subtypes", "empty", c.subtypes, a.subtypes, "Card", !bound); // orphan 만 채움 후보
      if (!bound) wantFill("subtypes", "Card", a.subtypes, "ptcg.io");
    } else if ((c.subtypes ?? []).length && (a.subtypes ?? []).length && !arrEq(c.subtypes, a.subtypes)) {
      push("subtypes", "mismatch", c.subtypes, a.subtypes, "Card", false);
    }

    // illustrator (ptcg.io 가 줄 때만)
    if (a.artist) {
      if (!c.illustrator) { push("illustrator", "empty", null, a.artist, "Card", true); wantFill("illustrator", "Card", a.artist, "ptcg.io"); }
      else if (lc(c.illustrator) !== lc(a.artist)) push("illustrator", "mismatch", c.illustrator, a.artist, "Card", false);
    }

    // rarity — EN 표시는 nameEn(없으면 code). RegionCard.rarity(EN 인쇄본) 우선, 없으면 Card.rarity(공유=JP 폴백).
    //   ⚠ code 가 아니라 nameEn 으로 비교(U↔Uncommon·R↔Rare 약어를 오탐 처리하지 않기 위함). Art Rare(nameEn="Art Rare")↔Illustration Rare 는 진짜 차이로 잡힌다.
    const dbRarObj = rc.rarity ?? c.rarity ?? null;
    const dbRarLabel = dbRarObj ? (dbRarObj.nameEn ?? dbRarObj.code) : null;
    const rarFromLocale = !!rc.rarity; // EN 인쇄본별 값 보유 여부(false=공유 Card 폴백=EN 표시버그 소지)
    if (!dbRarLabel && a.rarity) { push("rarity", "empty", null, a.rarity, "RegionCard", true); wantFill("rarity", "RegionCard", a.rarity, "ptcg.io(코드→Rarity 조회)"); }
    else if (dbRarLabel && a.rarity && lc(dbRarLabel) !== lc(a.rarity)) {
      push("rarity", "mismatch", `${dbRarLabel}${rarFromLocale ? "(RC)" : "(Card폴백)"}`, a.rarity, "RegionCard", false);
      // EN 표시 교정: EN 인쇄본 rarity 를 ptcg.io EN 용어로(공유 Card·JP/KR 미변경). 번호 #N 으로 EN 카드만 대상.
      rarityFixes.push({ regionCardId: rc.id, cardId: c.id, layer: "RegionCard", field: "rarity", value: a.rarity, kind: "overwrite", note: `EN rarity ${dbRarLabel}→${a.rarity}` });
    }

    // images (RegionCard)
    if (!rc.imageSmall && a.images?.small) { push("imageSmall", "empty", null, a.images.small, "RegionCard", true); wantFill("imageSmall", "RegionCard", a.images.small, "ptcg.io"); }
    if (!rc.imageLarge && a.images?.large) { push("imageLarge", "empty", null, a.images.large, "RegionCard", true); wantFill("imageLarge", "RegionCard", a.images.large, "ptcg.io"); }

    // attacks / abilities
    const dbAtk = asArr(c.attacks), dbAbi = asArr(c.abilities);
    const aAtk = a.attacks ?? [], aAbi = a.abilities ?? [];
    if (!bound) {
      // orphan: Card 가 EN 권위와 같아야 — 비면 채움, 이름 다르면 mismatch
      if (dbAtk.length === 0 && aAtk.length) { push("attacks", "empty", null, aAtk.map((x: any) => x.name), "Card", true); wantFill("attacks", "Card", aAtk.map((x: any) => ({ cost: x.cost ?? [], name: x.name, damage: x.damage ?? null, effect: x.text ?? null })), "ptcg.io(EN)"); }
      else if (dbAtk.length && aAtk.length && arrSet(dbAtk.map((x) => x?.name)).join("|") !== arrSet(aAtk.map((x: any) => x.name)).join("|")) push("attacks", "mismatch", dbAtk.map((x) => x?.name), aAtk.map((x: any) => x.name), "Card", false);
      if (dbAbi.length === 0 && aAbi.length) { push("abilities", "empty", null, aAbi.map((x: any) => x.name), "Card", true); wantFill("abilities", "Card", aAbi.map((x: any) => ({ name: x.name, text: x.text ?? null, type: x.type ?? null })), "ptcg.io(EN)"); }
    } else {
      // bound: Card.attacks 는 JP 오라클 → 비교/덮어쓰기 금지. EN 기술텍스트(CardText en) 백필 여부만 리포트.
      const enText = c.texts.find((t) => t.language === "en");
      if (aAtk.length && !(enText && asArr(enText.attacks).length)) push("attacks(EN텍스트)", "empty", "CardText(en) 없음", aAtk.map((x: any) => x.name), "CardText", false);
      if (aAbi.length && !(enText && asArr(enText.abilities).length)) push("abilities(EN텍스트)", "empty", "CardText(en) 없음", aAbi.map((x: any) => x.name), "CardText", false);
    }

    if (issues.length) report.push({ number: rc.number, name: rc.name, regionCardId: rc.id, cardId: c.id, supertype: c.supertype, bound, isOrphanLc: c.id.startsWith("lc-orphan-"), issues });
  }

  const empties = report.flatMap((r) => r.issues ?? []).filter((i: Issue) => i.kind === "empty");
  const mismatches = report.flatMap((r) => r.issues ?? []).filter((i: Issue) => i.kind === "mismatch");
  const frozen = protectedTouched([set.cardPackId, ...rcs.map((r) => r.card.cardPackId)]);

  const summary = {
    enSet: { id: set.id, name: set.name, code: set.code, cardCount: set.cardCount, cardPackId: set.cardPackId },
    authority: { source: "pokemontcg.io", setQuery: `set.id:${ptcgCode}`, fetched: auth.length, noAuthCards: noAuth },
    frozenGroupsTouched: frozen,
    counts: { cardsWithIssues: report.filter((r) => r.issues).length, empty: empties.length, mismatch: mismatches.length, planFills: plan.length, rarityFixes: rarityFixes.length },
    note: "empty=수집(채움) 후보(plan) · mismatch=정확성 점검(전건 확인 후 교정) · CardText 항목은 마이그레이션 의존 리포트(자동수정 안 함)",
  };

  if (args.emitPlan) { writeFileSync(args.emitPlan, JSON.stringify({ set: set.id, generated: "audit-en-metadata", actions: plan }, null, 1)); summary.note += ` · plan 저장: ${args.emitPlan} (${plan.length}건)`; }
  if (args.emitRarityPlan) { writeFileSync(args.emitRarityPlan, JSON.stringify({ set: set.id, generated: "audit-en-metadata-rarity", actions: rarityFixes }, null, 1)); summary.note += ` · rarity-plan 저장: ${args.emitRarityPlan} (${rarityFixes.length}건, EN RegionCard.rarity←ptcg.io)`; }
  console.log(JSON.stringify({ summary, report }, null, 1));
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); })
  .finally(() => prisma.$disconnect());
