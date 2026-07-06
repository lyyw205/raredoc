/**
 * PCG 시대 덱/킷/기프트박스/프로모 33개 수집 — tcgcollector 기반(LEGEND/Pt/DP 동일 파이프라인).
 *   - 32개 덱(구축스탠다드/스타터·클위크구축팩·홀론연구탑 쿼터덱·마스터킷·기프트박스·덱킷) + PCG-P 프로모(154장).
 *   - 포켓몬 재판=기존 Card 연결(이미지검증 20건: VenCharBlast랜덤스타터→PCG1 18·Gardevoirδ덱→ADV4 2).
 *     그 외 덱카드는 전용 프린트(부스터판과 다른 아트)라 전부 덱 자체 Card 신규(서브에이전트 32덱 전수 검증).
 *   - 트레이너/에너지=덱 자체 Card. JP명=Species.nameJa(특수명 오버라이드)·trainer-jp(이미지판독).
 *   - PCG/ADV 미잠금 → 매핑가드 불필요. era=PCG(사용자 분류).
 * dry: npx tsx scripts/collect-pcg-decks.ts   적용: --apply
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { uploadBuffer, r2PublicUrl, headExists } from "../src/lib/r2";
const exec = promisify(execFile);
const APPLY = process.argv.includes("--apply");
const SC = "/tmp/claude-1000/-home-lyyw205-repos-raredoc/60e9a6a7-1ee9-432f-a989-3be3e5e4c704/scratchpad";
const enriched = JSON.parse(readFileSync(`${SC}/pcg-enriched.json`, "utf8")) as Record<string, any>;
const matches = JSON.parse(readFileSync(`${SC}/matches-pcg.json`, "utf8")) as Record<string, Record<string, string>>;
const trainerJp = JSON.parse(readFileSync(`${SC}/trainer-jp.json`, "utf8")) as Record<string, string>;
const specialJp = JSON.parse(readFileSync(`${SC}/special-jp.json`, "utf8")) as Record<string, string>;
const grid = JSON.parse(readFileSync(`${SC}/grid-items.json`, "utf8")) as any[];
const gridById = new Map(grid.map((g) => [g.id, g]));

// per-deck metadata: tcgcId -> { setId, code, cp, nameJa, rel, packType }
const NEWSETS: Record<string, { setId: string; code: string; cp: string; nameJa: string; rel: string; pt: string }> = {
  "11194": { setId: "jp-tcg-PCG-P", code: "PCG-P", cp: "og-pcg-p", nameJa: "ポケモンカードゲーム プロモーションカード", rel: "2004-02-01", pt: "promo" },
  "11559": { setId: "jp-tcg-GVcsd", code: "GVcsd", cp: "og-jp-gvcsd", nameJa: "サーナイトex 構築スタンダードデッキ", rel: "2006-06-29", pt: "deck" },
  "11558": { setId: "jp-tcg-TYcsd", code: "TYcsd", cp: "og-jp-tycsd", nameJa: "バンギラスex 構築スタンダードデッキ", rel: "2006-06-29", pt: "deck" },
  "11556": { setId: "jp-tcg-GDcsd", code: "GDcsd", cp: "og-jp-gdcsd", nameJa: "グラードンex 構築スターターデッキ", rel: "2006-03-03", pt: "starter" },
  "11557": { setId: "jp-tcg-KYcsd", code: "KYcsd", cp: "og-jp-kycsd", nameJa: "カイオーガex 構築スターターデッキ", rel: "2006-03-03", pt: "starter" },
  "11553": { setId: "jp-tcg-MLgb-C", code: "MLgb-C", cp: "og-jp-mlgbc", nameJa: "ミュウ・ルカリオギフトボックス（シザリガー）", rel: "2005-11-16", pt: "box_set" },
  "11552": { setId: "jp-tcg-MLgb-L", code: "MLgb-L", cp: "og-jp-mlgbl", nameJa: "ミュウ・ルカリオギフトボックス（ルカリオ）", rel: "2005-11-16", pt: "box_set" },
  "11551": { setId: "jp-tcg-MLgb-M", code: "MLgb-M", cp: "og-jp-mlgbm", nameJa: "ミュウ・ルカリオギフトボックス（ミュウ）", rel: "2005-11-16", pt: "box_set" },
  "11554": { setId: "jp-tcg-MLgb-G", code: "MLgb-G", cp: "og-jp-mlgbg", nameJa: "ミュウ・ルカリオギフトボックス（グラエナ）", rel: "2005-11-16", pt: "box_set" },
  "11555": { setId: "jp-tcg-MLgb-S", code: "MLgb-S", cp: "og-jp-mlgbs", nameJa: "ミュウ・ルカリオギフトボックス（ポケモン☆）", rel: "2005-11-16", pt: "box_set" },
  "11433": { setId: "jp-tcg-HRTqd-F", code: "HRTqd-F", cp: "og-jp-hrtqdf", nameJa: "ホロンの研究塔 クォーターデッキ（炎）", rel: "2005-09-30", pt: "deck" },
  "11550": { setId: "jp-tcg-HRTqd-L", code: "HRTqd-L", cp: "og-jp-hrtqdl", nameJa: "ホロンの研究塔 クォーターデッキ（雷）", rel: "2005-09-30", pt: "deck" },
  "11549": { setId: "jp-tcg-HRTqd-W", code: "HRTqd-W", cp: "og-jp-hrtqdw", nameJa: "ホロンの研究塔 クォーターデッキ（水）", rel: "2005-09-30", pt: "deck" },
  "11546": { setId: "jp-tcg-MKit-B", code: "MKit-B", cp: "og-jp-mkitb", nameJa: "マスターキット（フシギダネ）", rel: "2005-07-15", pt: "deck" },
  "11548": { setId: "jp-tcg-MKit-S", code: "MKit-S", cp: "og-jp-mkits", nameJa: "マスターキット（サイドデッキ）", rel: "2005-07-15", pt: "deck" },
  "11547": { setId: "jp-tcg-MKit-T", code: "MKit-T", cp: "og-jp-mkitt", nameJa: "マスターキット（アチャモ）", rel: "2005-07-15", pt: "deck" },
  "11418": { setId: "jp-tcg-MMcsd", code: "MMcsd", cp: "og-jp-mmcsd", nameJa: "まぼろしのミュウ 構築スターターデッキ", rel: "2005-06-30", pt: "starter" },
  "11545": { setId: "jp-tcg-FEcsd", code: "FEcsd", cp: "og-jp-fecsd", nameJa: "オーダイル 構築スターターデッキ", rel: "2005-03-05", pt: "starter" },
  "11543": { setId: "jp-tcg-MEcsd", code: "MEcsd", cp: "og-jp-mecsd", nameJa: "メガニウム 構築スターターデッキ", rel: "2005-03-05", pt: "starter" },
  "11544": { setId: "jp-tcg-TYPcsd", code: "TYPcsd", cp: "og-jp-typcsd", nameJa: "バクフーン 構築スターターデッキ", rel: "2005-03-05", pt: "starter" },
  "11542": { setId: "jp-tcg-QCP-Fi", code: "QCP-Fi", cp: "og-jp-qcpfi", nameJa: "クイック構築パック（闘）", rel: "2005-01-16", pt: "deck" },
  "11538": { setId: "jp-tcg-QCP-Fr", code: "QCP-Fr", cp: "og-jp-qcpfr", nameJa: "クイック構築パック（炎）", rel: "2005-01-16", pt: "deck" },
  "11537": { setId: "jp-tcg-QCP-Gr", code: "QCP-Gr", cp: "og-jp-qcpgr", nameJa: "クイック構築パック（草）", rel: "2005-01-16", pt: "deck" },
  "11540": { setId: "jp-tcg-QCP-Li", code: "QCP-Li", cp: "og-jp-qcpli", nameJa: "クイック構築パック（雷）", rel: "2005-01-16", pt: "deck" },
  "11541": { setId: "jp-tcg-QCP-Ps", code: "QCP-Ps", cp: "og-jp-qcpps", nameJa: "クイック構築パック（超）", rel: "2005-01-16", pt: "deck" },
  "11539": { setId: "jp-tcg-QCP-Wa", code: "QCP-Wa", cp: "og-jp-qcpwa", nameJa: "クイック構築パック（水）", rel: "2005-01-16", pt: "deck" },
  "11536": { setId: "jp-tcg-EGB-D", code: "EGB-D", cp: "og-jp-egbd", nameJa: "エメラルドギフトボックス（デオキシス）", rel: "2004-11-19", pt: "box_set" },
  "11535": { setId: "jp-tcg-EGB-R", code: "EGB-R", cp: "og-jp-egbr", nameJa: "エメラルドギフトボックス（レックウザ）", rel: "2004-11-19", pt: "box_set" },
  "11438": { setId: "jp-tcg-BDK", code: "BDK", cp: "og-jp-bdk", nameJa: "ブラックデッキキット", rel: "2004-10-15", pt: "deck" },
  "11534": { setId: "jp-tcg-SDK", code: "SDK", cp: "og-jp-sdk", nameJa: "シルバーデッキキット", rel: "2004-10-15", pt: "deck" },
  "11532": { setId: "jp-tcg-DXcsd", code: "DXcsd", cp: "og-jp-dxcsd", nameJa: "デオキシス 構築スターターデッキ", rel: "2004-07-01", pt: "starter" },
  "11533": { setId: "jp-tcg-RZcsd", code: "RZcsd", cp: "og-jp-rzcsd", nameJa: "レックウザ 構築スターターデッキ", rel: "2004-07-01", pt: "starter" },
  "11531": { setId: "jp-tcg-VCBrcsd", code: "VCBrcsd", cp: "og-jp-vcbrcsd", nameJa: "フシギバナ・リザードン・カメックス ランダム構築スターターデッキ", rel: "2004-03-19", pt: "starter" },
};

async function dl(url: string): Promise<Buffer> { const { stdout } = await exec("curl", ["-sSL", "--fail", "--max-time", "40", "-A", "Mozilla/5.0", url], { encoding: "buffer", maxBuffer: 30 * 1024 * 1024 } as any); const b = stdout as unknown as Buffer; if (b.length < 300) throw new Error("small"); return b; }
async function mirror(url: string, key: string): Promise<string> { const buf = await sharp(await dl(url)).webp({ quality: 92 }).toBuffer(); await uploadBuffer(key, buf, "image/webp"); if (!(await headExists(key))) throw new Error(`verify ${key}`); return r2PublicUrl(key); }

async function main() {
  console.log(`${APPLY ? "APPLY" : "DRY"} collect-pcg-decks`);
  // preload species nameJa for all Pokémon
  const spIds = new Set<number>();
  for (const id in enriched) for (const c of enriched[id].cards) if (c.spId) spIds.add(c.spId);
  const species = await prisma.species.findMany({ where: { id: { in: [...spIds] } }, select: { id: true, nameJa: true } });
  const spJa = new Map(species.map((s) => [s.id, s.nameJa]));

  let setsCreated = 0, rcCreated = 0, cardsCreated = 0, linked = 0, skipped = 0, noImg = 0;
  for (const tid of Object.keys(NEWSETS)) {
    const ns = NEWSETS[tid]; const setId = ns.setId, cp = ns.cp;
    const set = enriched[tid]; if (!set) { console.log(`⚠ ${tid} no data`); continue; }
    const g = gridById.get(tid);
    console.log(`\n■ ${setId} (${ns.nameJa}) cards=${set.cards.length} pt=${ns.pt}`);
    if (APPLY) {
      await prisma.cardPack.upsert({ where: { id: cp }, update: {}, create: { id: cp, era: "PCG", eraKey: "PCG", nameJa: ns.nameJa, order: 0, releaseDate: new Date(ns.rel) } });
      let logoUrl: string | null = null, symUrl: string | null = null;
      if (g?.logo) logoUrl = await mirror(g.logo, `set-assets/logo/${setId}.webp`);
      if (g?.symbol) symUrl = await mirror(g.symbol, `set-assets/symbol/${setId}.webp`);
      await prisma.set.upsert({
        where: { id: setId },
        update: { logoUrl: logoUrl ?? undefined, symbolUrl: symUrl ?? undefined },
        create: { id: setId, name: ns.nameJa, series: "PCG", region: "JP", packType: ns.pt, code: ns.code, cardPackId: cp, releaseDate: new Date(ns.rel), cardCount: set.cards.length, logoUrl, symbolUrl: symUrl },
      });
      setsCreated++;
    }
    const linkMap = matches[tid] || {};
    for (const c of set.cards) {
      const rcId = `${setId}-${c.num}`;
      if (await prisma.regionCard.findUnique({ where: { id: rcId }, select: { id: true } })) { skipped++; continue; }
      const isPoke = c.supertype === "Pokémon";
      // JP name
      let jpName: string;
      if (specialJp[c.name]) jpName = specialJp[c.name];
      else if (isPoke && c.spId && spJa.get(c.spId)) jpName = spJa.get(c.spId)!;
      else if (!isPoke && trainerJp[c.name]) jpName = trainerJp[c.name];
      else jpName = c.name;
      // card identity
      let cardId: string;
      const linkTo = linkMap[c.num];
      if (linkTo && linkTo !== "new") { cardId = linkTo; linked++; }
      else {
        cardId = `lc-${setId}-${c.num}`;
        if (APPLY) {
          await prisma.card.upsert({ where: { id: cardId }, update: {}, create: { id: cardId, supertype: c.supertype, pokedexNumbers: isPoke && c.spId ? [c.spId] : [] } });
          if (isPoke && c.spId) await prisma.cardSpecies.upsert({ where: { cardId_speciesId: { cardId, speciesId: c.spId } }, update: {}, create: { cardId, speciesId: c.spId } });
        }
        cardsCreated++;
      }
      // image
      let imgUrl: string | null = null;
      if (APPLY && c.img) { try { imgUrl = await mirror(c.img, `${cp}/ja/large/${setId}/${c.num}.webp`); } catch (e) { console.log(`   img fail #${c.num}: ${(e as Error).message}`); } }
      if (!c.img) noImg++;
      if (APPLY) await prisma.regionCard.create({ data: { id: rcId, cardId, language: "ja", region: "JP", setId, number: c.num, name: jpName, imageLarge: imgUrl, imageSmall: imgUrl } });
      rcCreated++;
    }
    if (APPLY) { const cnt = await prisma.regionCard.count({ where: { setId } }); await prisma.set.update({ where: { id: setId }, data: { cardCount: cnt } }); }
    console.log(`   done (linked so far=${linked})`);
  }
  console.log(`\n${APPLY ? "완료" : "dry"} — sets+${setsCreated} newCards+${cardsCreated} linked=${linked} regionCards+${rcCreated} skipped=${skipped} noImg=${noImg}`);
  if (!APPLY) console.log("적용: --apply");
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error("FAIL:", e); prisma.$disconnect(); process.exit(1); });
