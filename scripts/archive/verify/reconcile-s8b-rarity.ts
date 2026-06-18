/**
 * S8b(VMAX 클라이맥스) 희귀도 reconcile — Bulbapedia(트래커와 히트카운트 일치) 카드별 레어도 vs DB.
 * 번호정렬 검증용 dry-run: 번호별 (bulba rarity vs db rarity) 불일치 출력 + 이름 병기(EN vs JP).
 * 적용은 별도(번호정렬 확인 후). 실행: npx tsx scripts/reconcile-s8b-rarity.ts
 */
import "dotenv/config";
import { prisma } from "../../../src/lib/prisma";
import { readFileSync } from "node:fs";

const ABBR2CODE: Record<string, string> = {
  CSR: "Character Super Rare", CHR: "Character Rare", RR: "Double Rare",
  SR: "Super Rare", RRR: "Triple Rare", UR: "Ultra Rare",
};

function parseBulba(): Map<number, { name: string; rar: string }> {
  const t = readFileSync("/tmp/bulba_s8b.html", "utf8");
  const rows = t.split(/<tr[ >]/).slice(1);
  const m = new Map<number, { name: string; rar: string }>();
  for (const r of rows) {
    const nm = r.match(/title="([^"]+) \(VMAX Climax (\d+)\)"/);
    if (!nm) continue;
    const n = parseInt(nm[2], 10);
    const rar = r.match(/Rarity_([A-Za-z0-9]+)\.png/);
    const code = rar ? (ABBR2CODE[rar[1]] ?? rar[1]) : "Common"; // 무표기 = Common(base)
    if (!m.has(n)) m.set(n, { name: nm[1], rar: code });
  }
  return m;
}

async function main() {
  const bulba = parseBulba();
  console.log(`Bulbapedia 파싱: ${bulba.size}장 (max ${Math.max(...bulba.keys())})`);
  const rows = await prisma.regionCard.findMany({ where: { setId: "jp-tcg-S8b" }, include: { rarity: true }, orderBy: { numberInt: "asc" } });
  const dbCode = (c: string | null | undefined, name: string) =>
    c === "None" ? "None" : (c ?? (/エネルギー/.test(name) ? "(energy)" : "(null)"));

  let mism = 0, aligned = 0;
  const lines: string[] = [];
  for (const rc of rows) {
    const n = rc.numberInt; if (n == null) continue;
    const b = bulba.get(n);
    const db = dbCode(rc.rarity?.code, rc.name);
    if (!b) { if (db !== "(energy)" && db !== "Common") lines.push(`  #${n} ${rc.name}: DB=${db} | Bulba=(없음)`); continue; }
    if (b.rar === db) { aligned++; continue; }
    // Common 무표기 base는 DB Common 과 맞으면 통과(위에서). 불일치만:
    mism++;
    lines.push(`  #${n} DB="${rc.name}"(${db}) ↔ Bulba="${b.name}"(${b.rar})`);
  }
  console.log(`정렬일치 ${aligned} | 불일치 ${mism}\n`);
  lines.slice(0, 60).forEach((l) => console.log(l));
  if (lines.length > 60) console.log(`  ... +${lines.length - 60} more`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
