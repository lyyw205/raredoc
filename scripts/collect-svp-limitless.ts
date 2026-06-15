/**
 * SVP(Scarlet & Violet Black Star Promos, EN 단독 orphan) 누락 카드 보강 수집.
 * 배경: 우리 200장 = pokemontcg.io(원본)과 동일. pokemon.com 공식은 Incapsula 차단.
 *   → 풀데이터+이미지가 있는 유일 소스 조합 사용:
 *     · 게임데이터: TCGdex (api.tcgdex.net) — 구조화 JSON
 *     · 이미지: Limitless TCG CDN (limitlesstcg.nyc3.cdn.digitaloceanspaces.com)
 * 대상 18장(둘 다 보유): 175,176,204,205,208,209,210,211,212,216~224
 *   (#190~192,213~215,225,500,#226~303 은 두 소스에도 없어 제외 — pokemon.com 만 보유)
 * 적재: prisma.card(LogicalCard) → prisma.regionCard(CardLocale), rarity=Promo. svp 는 비동결.
 * 실행: npx tsx scripts/collect-svp-limitless.ts            (dry-run)
 *       npx tsx scripts/collect-svp-limitless.ts --apply    (R2 업로드 + DB upsert)
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { uploadBuffer, r2PublicUrl } from "../src/lib/r2";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const TARGET = [175, 176, 204, 205, 208, 209, 210, 211, 212, 216, 217, 218, 219, 220, 221, 222, 223, 224];
const PROMO_RARITY = "cmpp4wyvw001hyjurzznnvic7"; // Rarity.code = "Promo"
const SET_ID = "svp";

async function curlText(url: string, ua = false): Promise<string> {
  const args = ["-sSL", "--max-time", "30", ...(ua ? ["-A", "Mozilla/5.0"] : []), url];
  const { stdout } = await execFileP("curl", args, { maxBuffer: 32 * 1024 * 1024 });
  return stdout;
}
async function curlBuf(url: string): Promise<Buffer> {
  const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "40", "-A", "Mozilla/5.0", url, "--output", "-"], { encoding: "buffer", maxBuffer: 32 * 1024 * 1024 });
  return Buffer.from(stdout as unknown as Buffer);
}

const STAGE: Record<string, string> = { Basic: "Basic", Stage1: "Stage 1", Stage2: "Stage 2" };
const digits = (s: string) => (s || "").replace(/[^0-9]/g, "");

function mapCard(t: any) {
  const cat = t.category as string;
  const supertype = cat === "Pokemon" ? "Pokémon" : cat; // Trainer/Energy 그대로
  let subtypes: string[] = [];
  if (cat === "Pokemon") {
    subtypes = [STAGE[t.stage] ?? t.stage].filter(Boolean);
    if (t.suffix && /ex/i.test(t.suffix)) subtypes.push("ex");
  } else if (cat === "Trainer") {
    subtypes = [t.trainerType].filter(Boolean);
  } else if (cat === "Energy") {
    subtypes = [t.energyType].filter(Boolean);
  }
  const weakness = t.weaknesses?.[0] ? `${t.weaknesses[0].type}×${digits(t.weaknesses[0].value)}` : null;
  const resistance = t.resistances?.[0] ? `${t.resistances[0].type}${t.resistances[0].value}` : null;
  const attacks = Array.isArray(t.attacks) && t.attacks.length
    ? t.attacks.map((a: any) => ({ cost: a.cost ?? [], name: a.name, text: a.effect ?? "", damage: a.damage != null ? String(a.damage) : "" }))
    : null;
  const abilities = Array.isArray(t.abilities) && t.abilities.length
    ? t.abilities.map((a: any) => ({ type: a.type ?? "Ability", name: a.name, text: a.effect ?? "" }))
    : null;
  const rules: string[] = cat === "Trainer" && t.effect ? [t.effect] : [];
  return {
    supertype, subtypes,
    types: Array.isArray(t.types) ? t.types : [],
    hp: t.hp ?? null,
    retreatCost: t.retreat ?? null,
    weakness, resistance,
    regulationMark: t.regulationMark ?? null,
    illustrator: t.illustrator ?? null,
    evolvesFrom: t.evolveFrom ?? null,
    evolvesTo: [] as string[],
    abilities, attacks,
    rules,
    flavorText: t.description ?? null,
    pokedexNumbers: Array.isArray(t.dexId) ? t.dexId : [],
    name: t.name as string,
  };
}

function limitlessImg(html: string, n: number): { lg: string | null; sm: string | null } {
  const grab = (suffix: string) => {
    const m = html.match(new RegExp(`https://limitlesstcg[^"' ]+SVP_${n}_[^"' ]*?${suffix}\\.png`));
    return m ? m[0] : null;
  };
  const base = `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/SVP/SVP_${n}_R_EN`;
  return { lg: grab("_LG") ?? `${base}_LG.png`, sm: grab("_SM") ?? `${base}_SM.png` };
}

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ SVP 보강 수집 | 대상 ${TARGET.length}장 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  // 안전: 이미 존재하는 번호는 건너뜀(중복 방지)
  const existing = new Set((await prisma.regionCard.findMany({ where: { setId: SET_ID, numberInt: { in: TARGET } }, select: { numberInt: true } })).map((r) => r.numberInt));

  let done = 0;
  for (const n of TARGET) {
    if (existing.has(n)) { console.log(`  #${n}: 이미 존재 → 건너뜀`); continue; }
    const t = JSON.parse(await curlText(`https://api.tcgdex.net/v2/en/cards/svp-${n}`));
    const m = mapCard(t);
    const html = await curlText(`https://limitlesstcg.com/cards/SVP/${n}`, true);
    const img = limitlessImg(html, n);

    const lcId = `lc-orphan-svp-${n}`;
    const rcId = `svp-${n}`;
    const smallKey = `svp/en/small/svp/${n}.png`;
    const largeKey = `svp/en/large/svp/${n}.png`;
    const imageSmall = r2PublicUrl(smallKey);
    const imageLarge = r2PublicUrl(largeKey);

    console.log(`  #${n} ${m.name} [${m.supertype}/${m.subtypes.join(",")}]${m.hp ? ` HP${m.hp}` : ""}${m.weakness ? ` W:${m.weakness}` : ""} atk:${m.attacks?.length ?? 0} img:${img.lg ? "ok" : "MISS"}`);

    if (!APPLY) continue;
    if (!img.lg || !img.sm) throw new Error(`#${n} 이미지 URL 추출 실패`);

    // 이미지 → R2
    const [lgBuf, smBuf] = await Promise.all([curlBuf(img.lg), curlBuf(img.sm)]);
    if (lgBuf.length < 1000 || smBuf.length < 500) throw new Error(`#${n} 이미지 다운로드 실패 (lg=${lgBuf.length} sm=${smBuf.length})`);
    await Promise.all([uploadBuffer(largeKey, lgBuf, "image/png"), uploadBuffer(smallKey, smBuf, "image/png")]);

    // LogicalCard(prisma.card) upsert
    const lcData = {
      primarySetId: SET_ID, primaryNumber: String(n), primaryNumberInt: n,
      supertype: m.supertype, subtypes: m.subtypes, types: m.types,
      hp: m.hp, retreatCost: m.retreatCost, weakness: m.weakness, resistance: m.resistance,
      regulationMark: m.regulationMark, illustrator: m.illustrator,
      evolvesFrom: m.evolvesFrom, evolvesTo: m.evolvesTo,
      abilities: m.abilities ?? undefined, attacks: m.attacks ?? undefined,
      rules: m.rules, flavorText: m.flavorText, pokedexNumbers: m.pokedexNumbers,
      rarityId: PROMO_RARITY,
    };
    await prisma.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });

    // CardLocale(prisma.regionCard) upsert
    const rcData = {
      cardId: lcId, language: "en", region: "EN", setId: SET_ID,
      number: String(n), numberInt: n, name: m.name,
      flavorText: m.flavorText, imageSmall, imageLarge,
      rarityId: PROMO_RARITY, regulationMark: m.regulationMark,
    };
    await prisma.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rcData }, update: rcData });
    done++;
  }

  console.log(`\n${APPLY ? `✅ 적재 ${done}장` : "(dry-run) 적용: --apply"}`);
  if (APPLY) {
    const cnt = await prisma.regionCard.count({ where: { setId: SET_ID } });
    console.log(`  svp 총 CardLocale: ${cnt}장`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
