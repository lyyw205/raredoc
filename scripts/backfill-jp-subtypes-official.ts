/**
 * JP subtypes·illustrator 백필 — tcgdex 가 없는 세트(하이클래스팩 M2a 등)용.
 *   pokemon-card.com 수집 JSON(jp-m2a.json: number/stageRaw/illustrator/jaName)에서
 *   포켓몬 stageRaw → subtypes 매핑(たね=Basic / 1進化=Stage 1 / 2進化=Stage 2, 이름 끝 ex 면 +ex).
 *   트레이너/에너지(stageRaw null)는 subtypes 건드리지 않음(소스 없음). illustrator 는 비어있을 때만 채움.
 *   기존 subtypes 가 있으면 보존(--overwrite 시 덮어씀).
 *
 * 실행: npx tsx scripts/backfill-jp-subtypes-official.ts --set=jp-mega-dream-ex --file=data/jp-official/jp-m2a.json [--apply] [--overwrite]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync } from "node:fs";

const STAGE: Record<string, string> = {
  "たね": "Basic", "1進化": "Stage 1", "2進化": "Stage 2",
  "サポート": "Supporter", "グッズ": "Item", "スタジアム": "Stadium", "ポケモンのどうぐ": "Pokémon Tool",
  "基本エネルギー": "Basic Energy", "特殊エネルギー": "Special",
};
const POKE_STAGE = new Set(["たね", "1進化", "2進化"]);

async function main() {
  const APPLY = process.argv.includes("--apply");
  const OW = process.argv.includes("--overwrite");
  const setId = process.argv.find((a) => a.startsWith("--set="))?.slice("--set=".length);
  const file = process.argv.find((a) => a.startsWith("--file="))?.slice("--file=".length);
  if (!setId || !file) { console.error("usage: --set= --file= [--apply] [--overwrite]"); process.exit(1); }

  const off = JSON.parse(readFileSync(file, "utf8")) as { number: string; stageRaw: string | null; illustrator: string | null; jaName: string }[];
  const byNum = new Map<number, typeof off[number]>(off.map((c) => [parseInt(c.number, 10), c]));

  const rows = await prisma.regionCard.findMany({ where: { setId }, orderBy: { numberInt: "asc" },
    select: { numberInt: true, number: true, name: true, logicalCardId: true, logicalCard: { select: { supertype: true, subtypes: true, illustrator: true } } } });

  let subFilled = 0, illusFilled = 0, noStage = 0; const sample: string[] = [];
  for (const r of rows) {
    const o = byNum.get(r.numberInt!); if (!o) continue;
    const data: Record<string, unknown> = {};
    // subtypes (포켓몬 stage 기반)
    if (OW || !(r.logicalCard.subtypes?.length)) {
      const base = o.stageRaw ? STAGE[o.stageRaw] : null;
      if (base) {
        const st = [base];
        if (POKE_STAGE.has(o.stageRaw!) && /ex$/i.test(o.jaName)) st.push("ex");
        data.subtypes = st;
      } else noStage++;
    }
    // illustrator
    if (o.illustrator && (OW || !r.logicalCard.illustrator)) data.illustrator = o.illustrator;

    if (Object.keys(data).length) {
      if (data.subtypes) subFilled++;
      if (data.illustrator) illusFilled++;
      if (sample.length < 5) sample.push(`#${r.number} ${r.name} ${JSON.stringify(data)}`);
      if (APPLY) await prisma.logicalCard.update({ where: { id: r.logicalCardId }, data });
    }
  }
  console.log(`■ ${setId} ← ${file}: subtypes채움 ${subFilled} · illus채움 ${illusFilled} · stage없음(트레이너/에너지) ${noStage} ${APPLY ? "★적용" : "(dry)"}`);
  if (sample.length) console.log("  예:", sample.join(" | "));
  await prisma.$disconnect();
  if (!APPLY) console.log("(dry) 적용: --apply");
}
main().catch((e) => { console.error(e); process.exit(1); });
