/**
 * LimitlessTCG 수집 JSON 으로 JP 세트를 신규 생성 — tcgdex·pokemon-card.com 둘 다 없는 구 SWSH 본세트용
 *   (예 로스트어비스 jp-tcg-S11). Set + RegionCard(JP) + Card(orphan) 생성.
 *   기존 jp-tcg-* 규칙: RegionCard id=`{setId}-{NNN}`, LC id=`lc-orphan-{setId}-{NNN}`, primarySetId=setId.
 *   supertype/subtypes(stage)/dex(jaName)/illustrator/rarity/image 채움. dex 폼접두어(かがやく/ヒスイ/ガラル/アローラ/パルデア) strip.
 *   rarity: limitless 영문명=Rarity.code 직매핑, "Secret Rare"는 null(KR backfill 로 정밀화).
 *
 * 실행: npx tsx scripts/create-jp-set-limitless.ts --file=data/jp-official/jp-s11.json --set=jp-tcg-S11 --group=og-s11 \
 *         --name=ロストアビス --code=S11 --nameKo=로스트어비스 --release=2022-07-15 [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync } from "node:fs";
import { resolveCardDexes } from "./lib/pokeapi-names";

const STAGE: Record<string, string> = {
  "Basic": "Basic", "Stage 1": "Stage 1", "Stage 2": "Stage 2", "V": "V", "VMAX": "VMAX", "VSTAR": "VSTAR",
  "Supporter": "Supporter", "Item": "Item", "Stadium": "Stadium", "Tool": "Pokémon Tool", "Pokémon Tool": "Pokémon Tool",
  "Special Energy": "Special", "Basic Energy": "Basic Energy",
};
const POKE_STAGE = new Set(["Basic", "Stage 1", "Stage 2", "V", "VMAX", "VSTAR"]);
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const dexFromName = (ja: string): number | null => {
  const nm = ja.replace(/^かがやく/, "").replace(/^(ヒスイ|ガラル|アローラ|パルデア)\s*/, "").replace(/V(MAX|STAR)?$|ex$/i, "").trim();
  let d = resolveCardDexes(nm, "ja" as "ko"); if (!d.length) d = resolveCardDexes(ja, "ja" as "ko"); return d.length ? d[0] : null;
};

async function main() {
  const APPLY = process.argv.includes("--apply");
  const file = arg("file"), setId = arg("set"), group = arg("group"), name = arg("name"), code = arg("code"), nameKo = arg("nameKo"), release = arg("release");
  if (!file || !setId || !group || !name) { console.error("필수: --file --set --group --name [--code --nameKo --release --apply]"); process.exit(1); }

  const cards = JSON.parse(readFileSync(file, "utf8")) as { number: string; jaName: string; supertype: string; stage: string; illustrator: string | null; rarity: string | null; image: string | null }[];
  const exists = await prisma.set.findUnique({ where: { id: setId } });
  if (exists) { console.error(`⚠️ ${setId} 이미 존재 — 중단(덮어쓰기 방지)`); process.exit(1); }
  const rars = await prisma.rarity.findMany({ select: { id: true, code: true } });
  const rid = new Map(rars.map((r) => [r.code, r.id]));

  let dexNone = 0, rarNull = 0; const noDex: string[] = []; const sample: string[] = [];
  const ops: any[] = [];
  for (const c of cards) {
    const NNN = c.number.padStart(3, "0"); const numInt = parseInt(c.number, 10);
    const lcId = `lc-orphan-${setId}-${NNN}`, locId = `${setId}-${NNN}`;
    const base = c.stage ? STAGE[c.stage] : null; const subtypes: string[] = base ? [base] : [];
    if (c.supertype === "Pokémon") { if (/VMAX$/.test(c.jaName) && !subtypes.includes("VMAX")) subtypes.push("VMAX"); if (/ex$/i.test(c.jaName)) subtypes.push("ex"); }
    const dex = c.supertype === "Pokémon" ? dexFromName(c.jaName) : null;
    if (c.supertype === "Pokémon" && dex == null) { dexNone++; if (noDex.length < 8) noDex.push(`#${c.number} ${c.jaName}`); }
    const rarCode = c.rarity && c.rarity !== "Secret Rare" ? (rid.has(c.rarity) ? c.rarity : null) : null;
    if (!rarCode) rarNull++;
    if (sample.length < 4) sample.push(`#${NNN} ${c.jaName} [${c.supertype}/${subtypes.join(",")}/dex${dex}/${rarCode}]`);
    ops.push({ lcId, locId, NNN, numInt, c, subtypes, dex, rarId: rarCode ? rid.get(rarCode) : null });
  }
  console.log(`■ ${setId} 생성: ${cards.length}장 ${APPLY ? "★적용" : "(dry)"} | dex미해결 ${dexNone} · rarity null(시크릿/미매핑) ${rarNull}`);
  console.log("  예:", sample.join(" | "));
  if (noDex.length) console.log("  dex미해결:", noDex.join(", "));

  if (APPLY) {
    await prisma.set.create({ data: { id: setId, name, nameKo: nameKo ?? null, nameJa: name, series: "剣と盾", ...(release ? { releaseDate: new Date(release + "T00:00:00.000Z") } : {}), cardCount: cards.length, region: "JP", code: code ?? null, cardPackId: group } as any });
    for (const o of ops) {
      await prisma.card.create({ data: { id: o.lcId, primarySetId: setId, primaryNumber: o.NNN, supertype: o.c.supertype, subtypes: o.subtypes, pokedexNumbers: o.dex != null ? [o.dex] : [], illustrator: o.c.illustrator ?? null, rarityId: o.rarId } });
      await prisma.regionCard.create({ data: { id: o.locId, setId, region: "JP", language: "ja", number: o.NNN, numberInt: o.numInt, name: o.c.jaName, imageSmall: o.c.image ?? null, imageLarge: o.c.image ?? null, cardId: o.lcId } });
    }
    console.log(`  ✅ Set + ${ops.length} LC + ${ops.length} RegionCard 생성`);
  } else console.log("(dry) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
