/**
 * Extra Regulation Box (エクストラレギュレーションBOX, 2019-10-04) 적재 — 전량 BW/XY 재판(신규 0).
 * 외부 일본어 소스 부재 → 박스번호(001/048~048/048) → 원본 JP세트+번호 매핑(data/collect/extra-reg-mapping.json)으로
 * 우리 DB의 원본 일본어 카드명+이미지를 "복제"해 채운다. 원본 jaName 과 매핑 jaName 일치 검증.
 * 그룹 sm-decks(동결, --allow-protected 필요). JP 지역·일본어 전용. ★EN/KR 연결 안 만듦.
 * Run: npx tsx scripts/load-jp-extra-reg.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-extra-reg";
const GROUP = "sm-decks";

type Map = { boxNumber: string; boxNumberFull: string; jaName: string; enName: string; origSetCode: string; origNumber: string; supertype: string; notes: string };

const pad3 = (s: string) => String(s).replace(/[^0-9]/g, "").padStart(3, "0");
const norm = (s: string) => (s || "").replace(/\s|　|・|＆|&/g, "").normalize("NFKC");

async function main() {
  assertWritable([GROUP], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "load-jp-extra-reg" });

  const raw = JSON.parse(readFileSync("data/collect/extra-reg-mapping.json", "utf8"));
  const maps = (Array.isArray(raw) ? raw : raw.cards ?? []) as Map[];

  // jp-tcg-* 세트 id 해석 테이블(코드 대소문자 무시, id 기준)
  const jpSets = await prisma.set.findMany({ where: { region: "JP", id: { startsWith: "jp-tcg-" } }, select: { id: true } });
  const byCode = new Map<string, string>();
  for (const s of jpSets) byCode.set(s.id.replace(/^jp-tcg-/, "").toLowerCase(), s.id);
  const resolve = (code: string) => byCode.get(code.toLowerCase());

  type Row = Map & { setId?: string; dbName?: string | null; imageLarge?: string | null; imageSmall?: string | null; status: string };
  const rows: Row[] = [];
  for (const m of maps) {
    if (!m.origSetCode) { rows.push({ ...m, status: "no-orig(이름만)" }); continue; }
    const setId = resolve(m.origSetCode);
    if (!setId) { rows.push({ ...m, status: `❌세트미해결(${m.origSetCode})` }); continue; }
    const rc = await prisma.regionCard.findFirst({ where: { setId, number: pad3(m.origNumber) }, select: { name: true, imageLarge: true, imageSmall: true } });
    if (!rc) { rows.push({ ...m, setId, status: `❌원본없음(${setId}#${pad3(m.origNumber)})` }); continue; }
    const match = norm(rc.name ?? "") === norm(m.jaName);
    rows.push({ ...m, setId, dbName: rc.name, imageLarge: rc.imageLarge, imageSmall: rc.imageSmall,
      status: (rc.imageLarge ? "✓복제" : "△이미지없음") + (match ? "" : `⚠이름불일치(DB:${rc.name})`) });
  }

  console.log(`${APPLY ? "✅ APPLY" : "🔍 DRY-RUN"} Extra Reg 48장 복제`);
  for (const r of rows) console.log(`  ${r.boxNumberFull} ${r.jaName.padEnd(16)} ← ${r.origSetCode || "?"}#${r.origNumber || "?"}  ${r.status}`);
  const ok = rows.filter((r) => r.imageLarge).length;
  const warn = rows.filter((r) => /⚠|❌/.test(r.status));
  console.log(`\n복제가능(이미지) ${ok} / 이름만 ${rows.filter((r) => !r.origSetCode).length} / 경고 ${warn.length}`);
  if (warn.length) console.log("경고:", warn.map((r) => `${r.boxNumberFull}:${r.status}`).join(" | "));

  if (!APPLY) { console.log("\n적용: --apply --allow-protected"); return; }

  await prisma.set.upsert({
    where: { id: SET },
    create: { id: SET, name: "エクストラレギュレーションBOX", nameJa: "エクストラレギュレーションBOX", nameKo: "엑스트라 레귤레이션 BOX",
      series: "Sun & Moon", releaseDate: new Date("2019-10-04T00:00:00Z"), cardCount: rows.length, region: "JP", code: "ERB",
      cardPackId: GROUP, packType: "box_set", titleCleanJa: "エクストラレギュレーションBOX", titleCleanKo: "엑스트라 레귤레이션 BOX" },
    update: { cardCount: rows.length, cardPackId: GROUP, packType: "box_set", nameJa: "エクストラレギュレーションBOX", nameKo: "엑스트라 레귤레이션 BOX", titleCleanJa: "エクストラレギュレーションBOX", titleCleanKo: "엑스트라 레귤레이션 BOX" },
  });
  for (const r of rows) {
    const num = pad3(r.boxNumber);
    const cid = `${SET}-${num}`;
    const finalName = r.dbName ?? r.jaName; // DB 원본명 우선(메가 등 정확) → 없으면 매핑명
    await prisma.card.upsert({ where: { id: cid },
      create: { id: cid, cardPackId: GROUP, primarySetId: SET, primaryNumber: num, primaryNumberInt: parseInt(num, 10), supertype: r.supertype || null, pokedexNumbers: [], subtypes: [], types: [], evolvesTo: [], rules: [] },
      update: { supertype: r.supertype || null } });
    await prisma.regionCard.upsert({ where: { id: cid },
      create: { id: cid, cardId: cid, language: "ja", region: "JP", setId: SET, number: num, numberInt: parseInt(num, 10), name: finalName, imageLarge: r.imageLarge ?? null, imageSmall: r.imageSmall ?? r.imageLarge ?? null },
      update: { name: finalName, imageLarge: r.imageLarge ?? null, imageSmall: r.imageSmall ?? r.imageLarge ?? null } });
  }
  const total = await prisma.regionCard.count({ where: { setId: SET } });
  console.log(`\n적용완료 → ${SET} 총 ${total}장 (이미지 ${ok})`);
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); }).finally(() => prisma.$disconnect());
