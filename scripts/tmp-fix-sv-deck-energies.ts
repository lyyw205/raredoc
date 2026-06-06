/**
 * [임시·SV 덱상품] JP 수집 JSON 기본에너지 번호 부여 — KR 공식 번호 미러(자동).
 *   JP 사이트는 덱상품 기본에너지를 무번호 ENE 공용 엔트리로 게재. KR 공식은 세트 말미 번호 부여.
 *   각 세트의 KR 수집 JSON에서 (기본에너지 koName → number) 를 읽어 JP 동명 무번호 카드에 부여.
 *   동명 중복(세트dir판 + ENE 공용판 이중 게재) 시 세트 디렉터리판 우선 1벌만 유지.
 * 실행: npx tsx scripts/tmp-fix-sv-deck-energies.ts
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const KO2JA: Record<string, string> = {
  "기본 풀 에너지": "基本草エネルギー",
  "기본 불꽃 에너지": "基本炎エネルギー",
  "기본 물 에너지": "基本水エネルギー",
  "기본 번개 에너지": "基本雷エネルギー",
  "기본 초 에너지": "基本超エネルギー",
  "기본 격투 에너지": "基本闘エネルギー",
  "기본 악 에너지": "基本悪エネルギー",
  "기본 강철 에너지": "基本鋼エネルギー",
  "기본 페어리 에너지": "基本フェアリーエネルギー", // SWSH 시대 9종
};

// [jpJsonPath, krJsonPath, 세트dir코드]
const PAIRS: [string, string, string][] = [
  // ── SM 덱/굿즈 (2026-06-06) ──
  ["jp-sm-sma.json", "kr-official-sma.json", "SMA"],
  ["jp-sm-smc.json", "kr-official-smc.json", "SMC"],
  ["jp-sm-smd.json", "kr-official-smd.json", "SMD"],
  ["jp-sm-smi.json", "kr-official-smi.json", "SMI"],
  ["jp-sm-smk.json", "kr-official-smk.json", "SMK"],
  ["jp-sm-smm.json", "kr-official-smm.json", "SMM"],
  ["jp-sm-smn.json", "kr-official-smn.json", "SMN"],
  ["jp-sm-sml.json", "kr-official-sml_.json", "SML"],
  ["jp-sm-sm30a.json", "kr-official-sm30a.json", "SM30A"],
  // ── SWSH 덱/굿즈 (2026-06-06) ──
  ["jp-s-sa.json", "kr-official-sa.json", "SA"],
  ["jp-s-se.json", "kr-official-se.json", "SEF"],
  ["jp-s-seb.json", "kr-official-seb.json", "SEK"],
  ["jp-s-sgi.json", "kr-official-sg.json", "SGI"],
  ["jp-s-sgg.json", "kr-official-sg-gengar.json", "SGG"],
  ["jp-s-sj.json", "kr-official-sj.json", "SJ"],
  ["jp-s-so.json", "kr-official-so.json", "SO"],
  ["jp-s-sll.json", "kr-official-sl.json", "SLL"],
  ["jp-s-sld.json", "kr-official-sl-darkrai.json", "SLD"],
  ["jp-s-sd.json", "kr-official-sd.json", "SD"],
  ["jp-s-sb.json", "kr-official-sb.json", "SB"],
  ["jp-s-sp2.json", "kr-official-sp2.json", "SP2"],
  ["jp-s-sp4.json", "kr-official-sp4.json", "SP4"],
  ["jp-s-sh.json", "kr-official-sh.json", "SH"],
  ["jp-s-spz.json", "kr-official-sp-zeraora.json", "SPZ"],
  ["jp-s-spd.json", "kr-official-sp-deoxys.json", "SPD"],
  ["jp-s-sn.json", "kr-official-sn.json", "SN"],
  ["jp-s-si.json", "kr-official-si.json", "SI"],
  ["jp-svam.json", null as any, "SVAM"], // KR 미러 없음(SVI 통합판) — JP 자체 순번 부여 폴백
  ["jp-sval.json", "kr-official-sval.json", "SVAL"],
  ["jp-svaw.json", "kr-official-sva.json", "SVAW"],
  ["jp-svc.json", "kr-official-svc.json", "SVC"],
  ["jp-svd.json", "kr-official-svd.json", "SVD"],
  ["jp-svf.json", "kr-official-svf.json", "SVF"],
  ["jp-svi.json", "kr-official-svi.json", "SVI"], // 배틀 아카데미 (JP·KR 동코드)
  ["jp-svem.json", "kr-official-svem.json", "SVEM"],
  ["jp-svel.json", "kr-official-svel.json", "SVEL"],
  ["jp-svg.json", "kr-official-svg.json", "SVG"],
  ["jp-svhk.json", "kr-official-svhk.json", "SVHK"],
  ["jp-svhm.json", "kr-official-svhm.json", "SVHM"],
  ["jp-svjl.json", "kr-official-svjl.json", "SVJL"],
  ["jp-svjp.json", "kr-official-svjp.json", "SVJP"],
  ["jp-svk.json", "kr-official-svk.json", "SVK"],
  ["jp-svls.json", "kr-official-svls.json", "SVLS"],
  ["jp-svln.json", "kr-official-svln.json", "SVLN"],
  ["jp-svm.json", "kr-official-svm.json", "SVM"],
  ["jp-svn.json", "kr-official-svn.json", "SVN"],
  ["jp-svom.json", "kr-official-svom.json", "SVOM"],
  ["jp-svod.json", "kr-official-svod.json", "SVOD"],
  ["jp-svb.json", "kr-official-svb.json", "SVB"],
  ["jp-svp1.json", "kr-official-svp1.json", "SVP1"],
];

const ENERGY_JA = new Set(Object.values(KO2JA));

for (const [jpFile, krFile, code] of PAIRS) {
  const jpPath = `data/jp-official/${jpFile}`;
  if (!existsSync(jpPath)) { console.log(`${code}: JP 파일 없음 — 스킵`); continue; }
  const jp: any[] = JSON.parse(readFileSync(jpPath, "utf8"));

  // KR 에너지 번호 맵 (ja명 → KR 번호)
  const ja2num = new Map<string, string>();
  if (krFile && existsSync(`data/kr-official/${krFile}`)) {
    const kr: any[] = JSON.parse(readFileSync(`data/kr-official/${krFile}`, "utf8"));
    for (const c of kr) {
      const ja = KO2JA[(c.koName ?? "").trim()];
      if (ja) ja2num.set(ja, String(parseInt(c.number, 10)).padStart(3, "0"));
    }
  }

  // 무번호 기본에너지: 동명 중복 시 세트dir판 우선
  const setDirRe = new RegExp(`/large/${code}/`);
  const pick = new Map<string, any>();
  for (const c of jp) {
    if (!ENERGY_JA.has(c.jaName) || c.number) continue;
    const cur = pick.get(c.jaName);
    if (!cur || (setDirRe.test(c.image ?? "") && !setDirRe.test(cur.image ?? ""))) pick.set(c.jaName, c);
  }

  // KR 미러 번호 부여 (KR 미러 없으면 본문 max+표준순 폴백)
  const maxNum = Math.max(0, ...jp.map((c) => parseInt(c.number, 10) || 0));
  const ORDER = Object.values(KO2JA);
  let fallbackIdx = 0;
  const kept: any[] = [];
  let assigned = 0, dropped = 0;
  for (const c of jp) {
    if (ENERGY_JA.has(c.jaName) && !c.number) {
      if (pick.get(c.jaName) !== c) { dropped++; continue; }
      const krNum = ja2num.get(c.jaName);
      if (krNum) c.number = krNum;
      else { // 폴백: 본문 뒤 표준 타입순
        const present = [...pick.keys()].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
        c.number = String(maxNum + 1 + present.indexOf(c.jaName)).padStart(3, "0");
        fallbackIdx++;
      }
      c.numberFull = null;
      assigned++;
    }
    kept.push(c);
  }
  kept.sort((a, b) => (parseInt(a.number, 10) || 9999) - (parseInt(b.number, 10) || 9999));
  writeFileSync(jpPath, JSON.stringify(kept, null, 2) + "\n", "utf8");
  const still = kept.filter((c) => !c.number).length;
  console.log(`${code}: ${jp.length} → ${kept.length} (부여 ${assigned}${fallbackIdx ? `·폴백 ${fallbackIdx}` : ""} · 중복제거 ${dropped} · 잔여 무번호 ${still})`);
}
