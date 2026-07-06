/**
 * ⚠️ 사후정정(scripts/fix-mmb-era-date.ts): 아래 cardPack=mega-decks·release=2025-08-07·series=메가신포니아 는 오분류.
 *   실제 = XY 시대(xy-decks/XY-SP), 2015-08-07 (XY M마스터덱빌드BOX, "M"=XY 시대 메가진화·2025 MEGA 블록 아님). DB 교정 완료.
 *   ※ 존재시 스킵 가드라 재실행해도 DB 안 되돌림. 이미지 R2 경로는 mega-decks/ 그대로 유지.
 *
 * マスターデッキビルドBOX MEGA (MMBp パワースタイル / MMBs スピードスタイル) 신규 수집.
 *   메가신화 시대 구축덱 박스 2종(각 49장) — 우리 DB 미수집. cardPack = mega-decks(MEGA-SP).
 *
 * 출처: Limitless JP DB(/cards/jp/{CODE}) 스크레이프 매니페스트(data/collect/jp-mmb{p,s}.json).
 *   각 카드: name(ja)·supertype·type·hp·stage·artist·이미지CDN URL 파싱 완료(누락 0).
 *   이미지: Limitless CDN PNG → webp large(q90)+245 small(q80) → R2 mega-decks/ja/{size}/{setId}/{NNN}.webp.
 *
 * 정체성 규칙(기존 mega-decks=MBG/MBD 컨벤션 매칭):
 *   - supertype/types([type])/hp/illustrator 채움. rarity=null(덱 제품 컨벤션).
 *   - subtypes: 트레이너=Supporter/Item/Stadium, 에너지=Special/Basic Energy,
 *     포켓몬=stage(Basic/Stage1/Stage2) + EX/ex/V류 접미 + 특수진화.
 *   - 특수진화(stage=null & 이름 …EX): ゲンシ(원시)면 이름유지, 아니면 메가→이름 "M" 접두 + subtype MEGA.
 *   - dex: 이름에서 resolveCardDexes(ja) (M·메가·ゲンシ·폼접두·EX/ex/V 접미 strip).
 *   - LC id=lc-orphan-{setId}-{NNN}, RC id={setId}-{NNN}, number 3자리 패딩.
 *
 * ※ releaseDate 2025-08-07 은 근사치(Limitless 연도 렌더버그로 정확일자 미확정) — MEGA 시대 내 정렬에만 영향.
 *
 * dry: npx tsx scripts/collect-mmb-decks.ts
 * 적용: npx tsx scripts/collect-mmb-decks.ts --apply
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { r2KeyFor, uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";
import { resolveCardDexes } from "./lib/pokeapi-names";

const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const PACK = "mega-decks";

type Raw = { number: string; numberInt: number; name: string; supertype: string | null; type: string | null; hp: number | null; stage: string | null; artist: string | null; img: string | null };
const SETS = [
  { code: "MMBp", setId: "jp-tcg-MMBp", file: "data/collect/jp-mmbp.json", nameJa: "マスターデッキビルドBOX MEGA パワースタイル", nameKo: "마스터 덱 빌드 BOX MEGA 파워 스타일" },
  { code: "MMBs", setId: "jp-tcg-MMBs", file: "data/collect/jp-mmbs.json", nameJa: "マスターデッキビルドBOX MEGA スピードスタイル", nameKo: "마스터 덱 빌드 BOX MEGA 스피드 스타일" },
];
const RELEASE = "2025-08-07";

const STAGE: Record<string, string> = {
  "Basic": "Basic", "Stage 1": "Stage 1", "Stage 2": "Stage 2", "V": "V", "VMAX": "VMAX", "VSTAR": "VSTAR",
  "Supporter": "Supporter", "Item": "Item", "Stadium": "Stadium", "Pokémon Tool": "Pokémon Tool", "Tool": "Pokémon Tool",
};

function isMega(c: Raw) { return c.supertype === "Pokémon" && !c.stage && /EX$/.test(c.name) && !/^ゲンシ/.test(c.name); }
function displayName(c: Raw) { return isMega(c) ? "M" + c.name : c.name; }

function subtypesFor(c: Raw, name: string): string[] {
  if (c.supertype === "Trainer") return c.stage && STAGE[c.stage] ? [STAGE[c.stage]] : [];
  if (c.supertype === "Energy") return [c.stage === "Basic Energy" ? "Basic Energy" : "Special"];
  // Pokémon
  const subs: string[] = [];
  if (c.stage && STAGE[c.stage]) subs.push(STAGE[c.stage]);
  if (isMega(c)) subs.push("MEGA");
  if (/ex$/.test(name)) subs.push("ex");
  else if (/EX$/.test(name)) subs.push("EX");
  if (/VMAX$/.test(name)) subs.push("VMAX");
  else if (/VSTAR$/.test(name)) subs.push("VSTAR");
  return [...new Set(subs)];
}
function dexFromName(name: string): number | null {
  if (!name) return null;
  const nm = name.replace(/^M(?=[ァ-ヿ])/, "").replace(/^(ゲンシ|かがやく|ヒスイ|ガラル|アローラ|パルデア)\s*/, "").replace(/(VMAX|VSTAR|V|EX|ex)$/i, "").trim();
  let d = resolveCardDexes(nm, "ja"); if (!d.length) d = resolveCardDexes(name, "ja");
  return d.length ? d[0] : null;
}

async function dl(url: string): Promise<Buffer> {
  const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { maxBuffer: 30 * 1024 * 1024, encoding: "buffer" } as any);
  const b = stdout as unknown as Buffer; if (b.length < 4000) throw new Error(`small ${b.length}`); return b;
}

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-mmb-decks" });
  for (const S of SETS) {
    const raws: Raw[] = JSON.parse(readFileSync(S.file, "utf8"));
    const exists = await prisma.set.findUnique({ where: { id: S.setId }, select: { id: true } });
    console.log(`\n### ${S.code} → ${S.setId} | ${raws.length}장 | Set ${exists ? "★이미존재(중단대상)" : "신규"}`);
    if (exists) { console.error(`  ⚠️ ${S.setId} 이미 존재 — 덮어쓰기 방지로 이 세트 건너뜀`); continue; }

    const ops = raws.map((c) => {
      const NNN = c.number.padStart(3, "0");
      const name = displayName(c);
      const subs = subtypesFor(c, name);
      const dex = c.supertype === "Pokémon" ? dexFromName(name) : null;
      return { NNN, numInt: c.numberInt, raw: c, name, subs, dex, types: c.type ? [c.type] : [] };
    });
    const noDex = ops.filter((o) => o.raw.supertype === "Pokémon" && o.dex == null);
    const noImg = ops.filter((o) => !o.raw.img);
    console.log(`  파생: dex미해결 ${noDex.length}${noDex.length ? " (" + noDex.map((o) => "#" + o.NNN + o.name).join(",") + ")" : ""} | img없음 ${noImg.length}`);
    console.log(`  샘플:`, ops.slice(0, 3).map((o) => `#${o.NNN} ${o.name}[${o.raw.supertype}/${o.subs.join(",")}/dex${o.dex}/${o.types.join("")}/${o.raw.hp ?? "-"}HP]`).join(" | "));
    const megas = ops.filter((o) => o.subs.includes("MEGA") || /^M/.test(o.name) && o.raw.supertype === "Pokémon");
    console.log(`  메가/특수:`, ops.filter((o) => !o.raw.stage && o.raw.supertype === "Pokémon").map((o) => `#${o.NNN} ${o.name}[${o.subs.join(",")}]`).join(", "));

    if (!APPLY) continue;
    await prisma.set.create({ data: { id: S.setId, name: S.nameJa, nameJa: S.nameJa, nameKo: S.nameKo, series: "メガシンフォニア", releaseDate: new Date(RELEASE + "T00:00:00.000Z"), cardCount: ops.length, region: "JP", code: S.code, cardPackId: PACK } as any });
    let done = 0;
    for (const o of ops) {
      const lcId = `lc-orphan-${S.setId}-${o.NNN}`, rcId = `${S.setId}-${o.NNN}`;
      const largeKey = r2KeyFor(PACK, "ja", "large", S.setId, o.NNN, "webp");
      const smallKey = r2KeyFor(PACK, "ja", "small", S.setId, o.NNN, "webp");
      let imgLarge: string | null = null, imgSmall: string | null = null;
      if (o.raw.img) {
        const buf = await dl(o.raw.img);
        if ((await sharp(buf).metadata()).width! < 200) throw new Error(`#${o.NNN} 이미지 의심`);
        await uploadBuffer(largeKey, await sharp(buf).webp({ quality: 90 }).toBuffer(), "image/webp");
        await uploadBuffer(smallKey, await sharp(buf).resize({ width: 245, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), "image/webp");
        if (!(await headExists(largeKey)) || !(await headExists(smallKey))) throw new Error(`#${o.NNN} R2 verify 실패`);
        imgLarge = r2PublicUrl(largeKey); imgSmall = r2PublicUrl(smallKey);
      }
      await prisma.card.create({ data: { id: lcId, primarySetId: S.setId, primaryNumber: o.NNN, primaryNumberInt: o.numInt, supertype: o.raw.supertype ?? "Pokémon", subtypes: o.subs, types: o.types, hp: o.raw.hp, pokedexNumbers: o.dex != null ? [o.dex] : [], illustrator: o.raw.artist ?? null, rarityId: null } });
      await prisma.regionCard.create({ data: { id: rcId, cardId: lcId, setId: S.setId, region: "JP", language: "ja", number: o.NNN, numberInt: o.numInt, name: o.name, imageLarge: imgLarge, imageSmall: imgSmall, rarityId: null } });
      done++; if (done % 12 === 0) console.log(`    …${done}/${ops.length}`);
    }
    console.log(`  ✅ ${S.setId}: Set + ${done} LC + ${done} RegionCard 생성`);
  }
  if (!APPLY) console.log("\n적용: --apply");
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
