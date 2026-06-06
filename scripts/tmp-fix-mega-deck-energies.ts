/**
 * [임시·MEGA 덱상품] JP 수집 JSON 기본에너지 정리.
 *   JP 사이트는 덱상품 기본에너지를 무번호 ENE 공용 엔트리로 게재 — KR 공식은 세트 말미 번호 부여
 *   (MBD/MBG: 023, MA: 044~051, MC: 767~774, 타입 순서 草炎水雷超闘悪鋼 양국 동일).
 *   → JP 측에 KR 미러 번호를 부여하고, MC 의 번호판/ENE판 중복은 무번호판 제거.
 * 실행: npx tsx scripts/tmp-fix-mega-deck-energies.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

// JP 기본에너지명 → 타입 순서 인덱스 (KR 부여 순서와 동일)
const ENERGY_ORDER = ["基本草エネルギー", "基本炎エネルギー", "基本水エネルギー", "基本雷エネルギー", "基本超エネルギー", "基本闘エネルギー", "基本悪エネルギー", "基本鋼エネルギー"];

// 세트별: 기본에너지 시작 번호 (KR 공식 부여 미러)
const PLAN: Record<string, { path: string; start: number; only?: string[] }> = {
  MBD: { path: "data/jp-official/jp-mbd.json", start: 23, only: ["基本超エネルギー"] },
  MBG: { path: "data/jp-official/jp-mbg.json", start: 23, only: ["基本悪エネルギー"] },
  MA: { path: "data/jp-official/jp-ma.json", start: 44 },
  MC: { path: "data/jp-official/jp-mc.json", start: 767 },
};

for (const [code, cfg] of Object.entries(PLAN)) {
  let cards: any[];
  try { cards = JSON.parse(readFileSync(cfg.path, "utf8")); } catch { console.log(`${code}: 파일 없음 — 스킵`); continue; }
  const before = cards.length;

  // 1) 무번호 기본에너지 동명 중복(세트전용판 + ENE 공용판 이중 게재) → 세트 디렉터리판 우선 1벌만
  //    (MC: /large/MC/판 vs /large/ENE/판 — 둘 다 무번호. 세트판 유지)
  const setDirRe = new RegExp(`/large/${code}/`);
  const pickPerName = new Map<string, any>();
  for (const c of cards) {
    if (!ENERGY_ORDER.includes(c.jaName) || c.number) continue;
    const cur = pickPerName.get(c.jaName);
    if (!cur || (setDirRe.test(c.image ?? "") && !setDirRe.test(cur.image ?? ""))) pickPerName.set(c.jaName, c);
  }

  // 2) 무번호 기본에너지: 채택본에 KR 미러 번호 부여, 나머지(중복/구성외) 제거
  const kept: any[] = [];
  let assigned = 0, dropped = 0;
  for (const c of cards) {
    const idx = ENERGY_ORDER.indexOf(c.jaName);
    if (idx >= 0 && !c.number) {
      if (pickPerName.get(c.jaName) !== c) { dropped++; continue; } // 동명 중복판 제거
      if (cfg.only && !cfg.only.includes(c.jaName)) { dropped++; continue; } // 세트 구성 외 에너지 제거
      const n = cfg.only ? cfg.start : cfg.start + idx;
      c.number = String(n).padStart(3, "0");
      c.numberFull = null; // 실물 분모 미표기(KR numberFull=타입코드) — number 만 부여
      assigned++;
    }
    kept.push(c);
  }

  kept.sort((a, b) => (parseInt(a.number, 10) || 9999) - (parseInt(b.number, 10) || 9999));
  writeFileSync(cfg.path, JSON.stringify(kept, null, 2) + "\n", "utf8");
  const stillMissing = kept.filter((c) => !c.number).length;
  console.log(`${code}: ${before} → ${kept.length} (번호부여 ${assigned} · 중복제거 ${dropped} · 잔여 무번호 ${stillMissing})`);
}
