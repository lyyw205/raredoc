// MEGA EN 세트 일러 전수 감사·재배정 — ptcg.io artist(원본) vs 연결 LC illustrator 대조 (2026-06-07)
//   rankZip 동점(같은 레어도 다판) 교차 오배정 검출: 본문판↔AR판 스왑 등.
//   재배정: (dex | 정규화일러) 정확 일치 JP LC 유일 후보로만. 트레이너는 동명 JP 후보 중 일러 일치.
//   사용: npx tsx scripts/tmp-audit-me-illus.ts <enSetId> [--apply]
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const ex = promisify(execFile);

const APPLY = process.argv.includes("--apply");
const enSet = process.argv[2];
if (!enSet) { console.error("usage: tmp-audit-me-illus.ts <enSetId> [--apply]"); process.exit(1); }
const ptcgSet = enSet.replace(/^en-tcg-/, "");
// MEGA 시대 JP 풀 (분산 출처 전체)
const JP_POOL = ["jp-mega-dream-ex", "jp-mega-infernox", "jp-mega-munikisuzero", "jp-mega-ninja-spinner", "jp-tcg-M1L", "jp-tcg-M1S", "jp-tcg-MC", "jp-tcg-MBD", "jp-tcg-MBG", "jp-tcg-MA", "jp-tcg-M-P"];
const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/[\s　]+/g, " ");

async function main() {
  // 1) ptcg.io artist 맵
  const meta = new Map<string, { artist: string; dex: number | null; name: string }>();
  for (let pg = 1; pg <= 3; pg++) {
    const { stdout } = await ex("curl", ["-s", "--max-time", "30", `https://api.pokemontcg.io/v2/cards?q=set.id:${ptcgSet}&pageSize=250&page=${pg}&select=number,name,artist,nationalPokedexNumbers`]);
    const data = JSON.parse(stdout).data ?? [];
    for (const c of data) meta.set(String(c.number), { artist: c.artist ?? "", dex: c.nationalPokedexNumbers?.[0] ?? null, name: c.name });
    if (data.length < 250) break;
  }
  console.log(`■ ${enSet} (ptcg.io ${ptcgSet}: ${meta.size}장) ${APPLY ? "★적용" : "(dry)"}`);

  // 2) JP 풀 로드
  const pool = await prisma.cardLocale.findMany({ where: { setId: { in: JP_POOL } },
    select: { setId: true, number: true, name: true, logicalCardId: true, logicalCard: { select: { illustrator: true, pokedexNumbers: true } } } });

  // 3) 대조·재배정
  const rows = await prisma.cardLocale.findMany({ where: { setId: enSet },
    select: { id: true, number: true, name: true, logicalCardId: true, logicalCard: { select: { illustrator: true, locales: { where: { region: "JP" }, select: { setId: true, number: true } } } } } });
  let ok = 0, fixed = 0, noCand = 0, multi = 0, orphanSkip = 0;
  // 판정 확정 스킵: me2pt5#125 겐가(=MBG#003 재록판 — me2 EN#56이 정짝, 잔류 유지 §21)
  const SKIP = new Set(["en-tcg-me2pt5-125"]);
  for (const r of rows.sort((a, b) => parseInt(a.number) - parseInt(b.number))) {
    if (SKIP.has(r.id)) continue;
    const m = meta.get(r.number);
    if (!m?.artist) continue;
    const isOrphan = !r.logicalCard?.locales.length;
    const la = norm(r.logicalCard?.illustrator);
    if (!isOrphan && norm(m.artist) === la) { ok++; continue; }
    // 트레이너(dex 없음)는 일러만으론 후보가 전 풀로 번짐 → 보고만(수동)
    if (m.dex == null) { if (!isOrphan) { console.log(`수동필요(트레이너) EN#${r.number} ${r.name} [${m.artist}] (현재 LC일러 ${r.logicalCard?.illustrator})`); multi++; } else orphanSkip++; continue; }
    // 재배정 후보: dex+일러 정확 일치 (orphan 포함 — JP 후보 유일하면 회수)
    let cands = pool.filter((p) => norm(p.logicalCard?.illustrator) === norm(m.artist) && p.logicalCard?.pokedexNumbers?.includes(m.dex!));
    let dedup = [...new Map(cands.map((c) => [c.logicalCardId, c])).values()];
    // 다후보면 주귀속(jp-mega-dream-ex 등 enSet 본팩) 우선 — 동일인쇄 재록이므로 본팩 선택이 안전
    if (dedup.length > 1) {
      const PRIMARY: Record<string, string> = { "en-tcg-me2pt5": "jp-mega-dream-ex", "en-tcg-me2": "jp-mega-infernox", "en-tcg-me3": "jp-mega-munikisuzero", "en-tcg-me4": "jp-mega-ninja-spinner" };
      const prim = dedup.filter((c) => c.setId === PRIMARY[enSet]);
      if (prim.length === 1) dedup = prim;
    }
    const cur = r.logicalCard?.locales[0];
    const curLabel = cur ? `${cur.setId.replace(/^jp-(tcg-)?/, "")}#${cur.number}` : "orphan";
    if (dedup.length === 1) {
      const pick = dedup[0];
      if (pick.logicalCardId === r.logicalCardId) { ok++; continue; }
      console.log(`교정 EN#${r.number} ${r.name} [${m.artist}]: ${curLabel} → ${pick.setId.replace(/^jp-(tcg-)?/, "")}#${pick.number}`);
      if (APPLY) {
        const old = r.logicalCardId!;
        await prisma.cardLocale.update({ where: { id: r.id }, data: { logicalCardId: pick.logicalCardId! } });
        if (old.startsWith(`lc-orphan-${enSet}`)) { // 비워진 자기 orphan 정리
          const left = await prisma.cardLocale.count({ where: { logicalCardId: old } });
          if (left === 0) await prisma.logicalCard.delete({ where: { id: old } });
        }
      }
      fixed++;
    } else if (dedup.length === 0) { noCand++; console.log(`무후보 EN#${r.number} ${r.name} [${m.artist}] (현재 ${curLabel}, LC일러 ${r.logicalCard?.illustrator})${m.dex == null ? " [트레이너]" : ""}`); }
    else { multi++; console.log(`다후보 EN#${r.number} ${r.name} [${m.artist}]: ${dedup.map((c) => `${c.setId.replace(/^jp-(tcg-)?/, "")}#${c.number}`).join(", ")} (현재 ${curLabel})`); }
  }
  console.log(`\n정상 ${ok} · 교정 ${fixed} · 무후보 ${noCand} · 다후보 ${multi} · orphan정합 ${orphanSkip}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
