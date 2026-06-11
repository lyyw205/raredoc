// 샤이니트레저(sv4a)/Paldean Fates(sv4pt5) 교차 연결 (2026-06-07)
//   A) EN PAF base 잔여 26 → JP 원판(레이징서프/고대의포효/미래의일섬/SVEL/SVEM) + 박사연구 2(세트 내, 이미지 페어링)
//   B) EN svp 프로모 23 → sv4a (svp#6~37 = 2023 프로모, svp#69~84 = PAF 프리미엄/틴 — 샤이니 동일 인쇄, DB 유일쌍)
//   C) EN sv2(PAL) 잔여 2 → sv4a (Shinx/Tinkatuff — 이미지 판정, SV2D판과 별개 아트)
//   D) 리오르 오연결 교정: sv1#112(Naoyo Kimura 실물)를 SV1S#040(chibi)에서 SVAM#008로, sv1#113(chibi)을 SV1S#040으로
//   전수 근거: registry §35 (dex+일러 양방향 유일쌍 + 이미지 스팟 판정)
//   사용: npx tsx scripts/tmp-link-sv4a-cross.ts [--apply]
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

// [JP setId, JP number, EN setId, EN number, 메모]
const PAIRS: [string, string, string, string, string][] = [
  // A) EN PAF → JP 원판 (dex+일러 유일쌍 26)
  ["jp-tcg-SV4K", "003", "sv4pt5", "3", "Maractus Masako Tomii"],
  ["jp-tcg-SVEL", "001", "sv4pt5", "9", "Magmar miki kudo (이미지 판정)"],
  ["jp-tcg-SVEL", "002", "sv4pt5", "10", "Magmortar Hasuno"],
  ["jp-tcg-SV4K", "011", "sv4pt5", "11", "Numel Mina Nakai"],
  ["jp-tcg-SV4K", "012", "sv4pt5", "12", "Camerupt satoma"],
  ["jp-tcg-SVEL", "003", "sv4pt5", "13", "Heat Rotom Scav"],
  ["jp-sv-raging-surf", "002", "sv4pt5", "16", "Lapras Gemi"],
  ["jp-sv-raging-surf", "012", "sv4pt5", "20", "Chinchou yuu"],
  ["jp-sv-raging-surf", "013", "sv4pt5", "21", "Lanturn aspara"],
  ["jp-tcg-SVEM", "002", "sv4pt5", "23", "Exeggcute Kariya"],
  ["jp-tcg-SVEM", "003", "sv4pt5", "24", "Exeggutor Yoriyuki Ikegami"],
  ["jp-tcg-SV4M", "028", "sv4pt5", "30", "Chimecho sui"],
  ["jp-tcg-SV4K", "028", "sv4pt5", "32", "Woobat Kagemaru Himeno (이미지 판정)"],
  ["jp-tcg-SV4K", "029", "sv4pt5", "33", "Swoobat Narumi Sato"],
  ["jp-tcg-SVEM", "007", "sv4pt5", "34", "Cottonee kurumitsu"],
  ["jp-tcg-SVEM", "008", "sv4pt5", "35", "Whimsicott KYUPIYAMA"],
  ["jp-tcg-SVEM", "009", "sv4pt5", "36", "Dedenne Tika Matsuno"],
  ["jp-sv-raging-surf", "024", "sv4pt5", "48", "Phanpy Atsuko Nishida"],
  ["jp-sv-raging-surf", "025", "sv4pt5", "49", "Donphan Shin Nagasawa"],
  ["jp-tcg-SV4K", "035", "sv4pt5", "51", "Clobbopus Kedamahadaitai Yawarakai"],
  ["jp-tcg-SV4K", "036", "sv4pt5", "52", "Grapploct Sanosuke Sakuma"],
  ["jp-sv-raging-surf", "033", "sv4pt5", "55", "Gastly Nobuhiro Imagawa"],
  ["jp-sv-raging-surf", "034", "sv4pt5", "56", "Haunter DOM"],
  ["jp-sv-raging-surf", "035", "sv4pt5", "57", "Gengar Nelnal"],
  ["jp-sv-raging-surf", "037", "sv4pt5", "60", "Scraggy sowsow"],
  ["jp-sv-raging-surf", "038", "sv4pt5", "61", "Scrafty Mousho"],
  // A') 박사연구 — 세트 내 미병합, 이미지로 사다/투로 페어링 확정
  ["jp-sv-paldean-fates", "176", "sv4pt5", "87", "博士の研究(オーリム=Sada) kirisAki (이미지 판정)"],
  ["jp-sv-paldean-fates", "177", "sv4pt5", "88", "博士の研究(フトゥー=Turo) kirisAki (이미지 판정)"],
  // B) svp 프로모 → sv4a (2023 프로모 7 + PAF 프리미엄/틴 16)
  ["jp-sv-paldean-fates", "068", "svp", "6", "Pawmot GIDORA"],
  ["jp-sv-paldean-fates", "106", "svp", "7", "Hawlucha Yuya Oka (이미지 판정)"],
  ["jp-sv-paldean-fates", "053", "svp", "19", "Baxcalibur Oswaldo KATO"],
  ["jp-sv-paldean-fates", "096", "svp", "20", "Tinkaton Anesaki Dynamic"],
  ["jp-sv-paldean-fates", "118", "svp", "21", "Murkrow Shiburingaru"],
  ["jp-sv-paldean-fates", "147", "svp", "22", "Pelipper Nisota Niso"],
  ["jp-sv-paldean-fates", "077", "svp", "37", "Cleffa Mina Nakai"],
  ["jp-sv-paldean-fates", "266", "svp", "69", "Fidough sowsow"],
  ["jp-sv-paldean-fates", "274", "svp", "70", "Greavard Nisota Niso"],
  ["jp-sv-paldean-fates", "295", "svp", "71", "Maschiff Kagemaru Himeno"],
  ["jp-sv-paldean-fates", "330", "svp", "72", "Shiny Great Tusk ex 5ban (이미지 판정)"],
  ["jp-sv-paldean-fates", "333", "svp", "73", "Shiny Iron Treads ex 5ban"],
  ["jp-sv-paldean-fates", "331", "svp", "74", "Shiny Charizard ex 5ban (이미지 판정 — svp#196은 2025 별개)"],
  ["jp-sv-paldean-fates", "341", "svp", "75", "Shiny Mimikyu Mitsuhiro Arita"],
  ["jp-sv-paldean-fates", "201", "svp", "76", "Shiny Sprigatito kurumitsu (이미지 판정)"],
  ["jp-sv-paldean-fates", "202", "svp", "77", "Shiny Floragato GIDORA"],
  ["jp-sv-paldean-fates", "321", "svp", "78", "Shiny Meowscarada ex 5ban"],
  ["jp-sv-paldean-fates", "215", "svp", "79", "Shiny Fuecoco OKACHEKE"],
  ["jp-sv-paldean-fates", "216", "svp", "80", "Shiny Crocalor Hideki Ishikawa"],
  ["jp-sv-paldean-fates", "324", "svp", "81", "Shiny Skeledirge ex 5ban"],
  ["jp-sv-paldean-fates", "224", "svp", "82", "Shiny Quaxly GIDORA"],
  ["jp-sv-paldean-fates", "225", "svp", "83", "Shiny Quaxwell Atsushi Furusawa"],
  ["jp-sv-paldean-fates", "325", "svp", "84", "Shiny Quaquaval ex 5ban"],
  // C) EN sv2(PAL) 잔여 → sv4a (이미지 판정: SV2D판과 별개 아트, sv4a가 DB 유일 짝)
  ["jp-sv-paldean-fates", "059", "sv2", "69", "Shinx Oswaldo KATO (이미지 판정 — SV2D#019=sv2#68과 별개)"],
  ["jp-sv-paldean-fates", "095", "sv2", "104", "Tinkatuff sowsow (이미지 판정 — SV2D#034=sv2#103과 별개)"],
];

async function main() {
  console.log(`■ sv4a/PAF 교차 연결 ${PAIRS.length}쌍 + 리오르 교정 ${APPLY ? "★적용" : "(dry)"}`);
  let ok = 0, skip = 0;
  for (const [jpSet, jpNum, enSet, enNum, memo] of PAIRS) {
    const jp = await prisma.regionCard.findFirst({ where: { setId: jpSet, number: jpNum },
      select: { name: true, cardId: true, card: { select: { illustrator: true, locales: { where: { region: "EN" }, select: { id: true } } } } } });
    const en = await prisma.regionCard.findFirst({ where: { setId: enSet, number: enNum },
      select: { id: true, name: true, cardId: true, card: { select: { illustrator: true, locales: { select: { region: true } } } } } });
    if (!jp || !en) { console.log(`❌ 누락: ${jpSet}#${jpNum} / ${enSet}#${enNum}`); skip++; continue; }
    if (jp.card?.locales.length) { console.log(`⚠ JP 기연결 스킵: ${jpSet}#${jpNum} ${jp.name}`); skip++; continue; }
    if (!en.card?.locales.every((l) => l.region === "EN")) { console.log(`⚠ EN 비orphan 스킵: ${enSet}#${enNum} ${en.name}`); skip++; continue; }
    console.log(`연결 ${jpSet.replace("jp-tcg-", "").replace("jp-sv-", "")}#${jpNum} ${jp.name} [${jp.card?.illustrator}] ← ${enSet}#${enNum} ${en.name} [${en.card?.illustrator}] (${memo})`);
    if (APPLY) {
      const oldLc = en.cardId!;
      await prisma.regionCard.update({ where: { id: en.id }, data: { cardId: jp.cardId! } });
      await migrateAndDelete(oldLc, jp.cardId!);
    }
    ok++;
  }
  // D) 리오르 오연결 교정 (registry §35 — sv1#112 실물=Naoyo Kimura, ptcg.io 일러 오기로 chibi LC에 오연결)
  console.log(`\n■ 리오르 교정: sv1#112 → SVAM#008 / sv1#113 → SV1S#040`);
  const r112 = await prisma.regionCard.findFirst({ where: { setId: "sv1", number: "112" }, select: { id: true, cardId: true } });
  const r113 = await prisma.regionCard.findFirst({ where: { setId: "sv1", number: "113" }, select: { id: true, cardId: true } });
  const svam = await prisma.card.findUnique({ where: { id: "lc-jp-tcg-SVAM-008" }, select: { id: true, locales: { select: { region: true } } } });
  if (r112?.cardId === "lc-orphan-jp-tcg-SV1S-040" && r113?.cardId === "lc-orphan-sv1-113" && svam && !svam.locales.some(l => l.region === "EN")) {
    console.log(`  sv1#112 (${r112.cardId} → lc-jp-tcg-SVAM-008)`);
    console.log(`  sv1#113 (${r113.cardId} → lc-orphan-jp-tcg-SV1S-040)`);
    if (APPLY) {
      await prisma.regionCard.update({ where: { id: r112.id }, data: { cardId: "lc-jp-tcg-SVAM-008" } });
      await prisma.regionCard.update({ where: { id: r113.id }, data: { cardId: "lc-orphan-jp-tcg-SV1S-040" } });
      await migrateAndDelete("lc-orphan-sv1-113", "lc-orphan-jp-tcg-SV1S-040");
      console.log("  ✓ 적용");
    }
    ok += 2;
  } else {
    console.log(`  ⚠ 전제 불일치 스킵: 112=${r112?.cardId} 113=${r113?.cardId} svamEN=${svam?.locales.some(l => l.region === "EN")}`);
    skip += 2;
  }
  console.log(`\n연결 ${ok} · 스킵 ${skip}`);
}

// orphan LC 삭제 전 사용자 데이터(Trade/CollectionItem/덱/티어/룰링/외부ID) 참조를 새 LC로 이관.
async function migrateAndDelete(oldLc: string, newLc: string) {
  const left = await prisma.regionCard.count({ where: { cardId: oldLc } });
  if (left > 0) return;
  for (const model of ["trade", "collectionItem", "deckRecipeCard", "ruling", "externalIdMapping"] as const) {
    // @ts-expect-error 동적 모델 접근
    const r = await prisma[model].updateMany({ where: { cardId: oldLc }, data: { cardId: newLc } });
    if (r.count) console.log(`  참조 이관 ${model}: ${r.count} (${oldLc} → ${newLc})`);
  }
  const texts = await prisma.cardText.findMany({ where: { cardId: oldLc }, select: { id: true, language: true } });
  for (const tx of texts) {
    const dup = await prisma.cardText.findFirst({ where: { cardId: newLc, language: tx.language }, select: { id: true } });
    if (!dup) { await prisma.cardText.update({ where: { id: tx.id }, data: { cardId: newLc } }); console.log(`  CardText(${tx.language}) 이관`); }
  }
  await prisma.card.delete({ where: { id: oldLc } });
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
