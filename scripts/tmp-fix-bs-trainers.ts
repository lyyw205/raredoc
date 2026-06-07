// kr-bs1~10 비포켓몬(트레이너/에너지) 재연결 — apply 합본 폴백 오연결 교정 (2026-06-07)
//   KR명→JP명 수동 사전(직역·인물 전건 확정) + 일러 일치 우선 + 후보 다수 시 (세트,번호) 정렬 첫째(분할판 일관 정책)
//   JP 풀 부재 3장(엄마의 배려=Mom's Kindness·부활초·버블코트 — EN Majestic Dawn 계열)은 KR-only LC로 분리.
//   사용: npx tsx scripts/tmp-fix-bs-trainers.ts [--apply]
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const POKE = ["Pokémon", "Pokemon"];
const APPLY = process.argv.includes("--apply");
const JP_SETS = ["jp-tcg-DP1P","jp-tcg-DP1D","jp-tcg-DP2","jp-tcg-DP3","jp-tcg-DP4M","jp-tcg-DP4D","jp-tcg-DP5H","jp-tcg-DP5A","jp-tcg-DP6","jp-tcg-PT1","jp-tcg-PT2","jp-tcg-PT3","jp-tcg-PT4"];

// KR명 → JP명 (전건 직역/인물 확정 — registry §23 근거)
const KO2JA: Record<string, string> = {
  "만병통치제W": "なんでもなおしW",
  "몬스터볼": "モンスターボール",
  "상처약": "きずぐすり",
  "에너지 재생": "エネルギー再生",
  "에너지 전송": "エネルギー転送",
  "포켓몬 교체": "ポケモンいれかえ",
  "에너지 갈아 달기": "エネルギーつけかえ",
  "플러스파워": "プラスパワー",
  "마박사": "ナナカマドはかせ", // 마가목=ナナカマド (Prof. Rowan)
  "스피드 스타디움": "スピードスタジアム",
  "다크볼": "ダークボール",
  "포켓몬 도감 HANDY910is": "ポケモン図鑑HANDY910is",
  "오박사의 방문": "オーキドはかせの訪問",
  "특수 악 에너지": "特殊悪エネルギー",
  "기본 강철 에너지": "基本鋼エネルギー",
  "퀵볼": "クイックボール",
  "라이벌": "ライバル",
  "이수진의 검색": "ミズキの検索", // Bebe's Search
  "월광의 스타디움": "月光のスタジアム",
  "멀티 에너지": "マルチエネルギー",
  "먹다남은음식": "たべのこし",
  "부적금화": "おまもりこばん",
  "포켓트레": "ポケトレ",
  "갤럭시단의 내기": "ギンガ団の賭け",
  "새벽의 스타디움": "夜明けのスタジアム",
  "워프포인트": "ワープポイント",
  "이상한사탕": "ふしぎなアメ",
  "포켓몬레스큐": "ポケモンレスキュー",
  "수희의 제비뽑기": "スージーの抽選",
  "사이클론 에너지": "サイクロンエネルギー",
  "워프 에너지": "ワープエネルギー",
  "에너지 패치": "エネルギーパッチ",
  "프레미어볼": "プレミアボール",
  "종수의 공헌": "クロツグの貢献", // Palmer's Contribution
  "해당의 리서치": "ハマナのリサーチ", // Bebe? → ハマナ=Felicity? (リサーチ 일치·유일쌍)
  "밤의 포켓몬센터": "夜のポケモンセンター",
  "추억의 열매": "思い出のみ",
  "미정이의 부탁": "マイのおねがい", // Marley's Request
  "지하탐험대": "地底探険隊",
  "리커버 에너지": "リカバー・エネルギー",
  "힐러 에너지": "ヒーラー・エネルギー",
  "밤의 메인터넌스": "夜のメンテナンス",
  "수퍼 포켓몬 회수": "スーパーポケモン回収",
  "포케힐러+": "ポケヒーラー",
  "갤럭시단의 마스": "ギンガ団のマーズ",
  "호수의 결계": "湖の結界",
  "럭셔리볼": "ゴージャスボール",
  "포케드로어+": "ポケドロアー",
  "난천의 생각": "シロナの想い", // Cynthia
  "선단신전": "キッサキしんでん", // Snowpoint Temple
  "하드마운틴": "ハードマウンテン",
};
// JP 풀 부재 → EN Majestic Dawn 계열(별도 EN 연결 단계) — KR-only LC 분리
const EN_ONLY = new Set(["엄마의 배려", "부활초", "버블코트"]);

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/[\s　]+/g, " ");

async function main() {
  const sets = Array.from({ length: 10 }, (_, i) => `kr-bs${i + 1}`);
  const kr = await prisma.cardLocale.findMany({
    where: { setId: { in: sets } },
    select: { id: true, setId: true, number: true, name: true, logicalCardId: true,
      logicalCard: { select: { supertype: true, locales: { where: { region: "JP" }, select: { id: true } } } } },
  });
  // 대상: 비포켓몬 (KR-only tail로 만들어진 것 제외 — JP 연결이 있는 것 + EN_ONLY 처리 대상)
  const targets = kr.filter((k) => !POKE.includes(k.logicalCard?.supertype ?? "") && (k.logicalCard?.locales.length || EN_ONLY.has(k.name)));

  const jp = await prisma.cardLocale.findMany({
    where: { setId: { in: JP_SETS }, logicalCard: { NOT: { supertype: { in: POKE } } } },
    select: { id: true, setId: true, number: true, numberInt: true, name: true, logicalCardId: true, logicalCard: { select: { illustrator: true } } },
  });
  const jpByName = new Map<string, typeof jp>();
  for (const j of jp) (jpByName.get(j.name) ?? jpByName.set(j.name, []).get(j.name))!.push(j);

  // KR 수집 JSON의 일러 (DB LC에는 JP 일러가 있으므로 KR측 일러는 JSON에서)
  const { readFileSync } = await import("node:fs");
  const krIllus = new Map<string, string | null>();
  for (let n = 1; n <= 10; n++) {
    const arr = JSON.parse(readFileSync(`data/kr-official/kr-official-bs${n}.json`, "utf8"));
    for (const c of arr) krIllus.set(`kr-bs${n}|${parseInt(c.number, 10)}`, c.illustrator ?? null);
  }

  let fixed = 0, kept = 0, enOnly = 0, fail = 0;
  const touchedLcids = new Set<string>(); // nameKo 재계산 대상 (이탈 LC)
  for (const k of targets.sort((a, b) => (a.setId + a.number.padStart(3, "0")).localeCompare(b.setId + b.number.padStart(3, "0")))) {
    if (EN_ONLY.has(k.name)) {
      // KR-only LC로 분리 (apply --keep-unmatched 패턴)
      const lcId = `lc-${k.setId}-${k.number}`;
      console.log(`EN-only 분리: ${k.setId}#${k.number} ${k.name} → ${lcId} (구 ${k.logicalCardId})`);
      if (APPLY) {
        if (k.logicalCardId) touchedLcids.add(k.logicalCardId);
        await prisma.logicalCard.upsert({ where: { id: lcId }, update: { nameKo: k.name }, create: { id: lcId, supertype: "Trainer", nameKo: k.name, illustrator: krIllus.get(`${k.setId}|${parseInt(k.number, 10)}`) ?? undefined, primarySetId: k.setId, primaryNumber: k.number, primaryNumberInt: parseInt(k.number, 10) } });
        await prisma.cardLocale.update({ where: { id: k.id }, data: { logicalCardId: lcId } });
      }
      enOnly++;
      continue;
    }
    const ja = KO2JA[k.name];
    if (!ja) { console.log(`⚠ 사전 미등록: ${k.setId}#${k.number} ${k.name}`); fail++; continue; }
    let cands = jpByName.get(ja) ?? [];
    if (!cands.length) { console.log(`⚠ JP 후보 0: ${k.setId}#${k.number} ${k.name} → ${ja}`); fail++; continue; }
    // 일러 일치 우선
    const kil = norm(krIllus.get(`${k.setId}|${parseInt(k.number, 10)}`));
    const ilMatch = kil ? cands.filter((c) => norm(c.logicalCard?.illustrator) === kil) : [];
    if (ilMatch.length) cands = ilMatch;
    // (세트, 번호) 정렬 첫째 — 분할판/재록 일관 정책
    cands = cands.slice().sort((a, b) => a.setId.localeCompare(b.setId) || (a.numberInt ?? 0) - (b.numberInt ?? 0));
    const pick = cands[0];
    const already = k.logicalCardId === pick.logicalCardId;
    console.log(`${already ? "유지" : "교정"}: ${k.setId}#${k.number} ${k.name} → ${pick.setId.replace("jp-tcg-", "")}#${pick.number} ${pick.name}${ilMatch.length ? " [일러✓]" : ""}${cands.length > 1 ? ` (후보${cands.length}·첫째)` : ""}`);
    if (already) { kept++; continue; }
    if (APPLY) {
      if (k.logicalCardId) touchedLcids.add(k.logicalCardId);
      await prisma.cardLocale.update({ where: { id: k.id }, data: { logicalCardId: pick.logicalCardId } });
      await prisma.logicalCard.update({ where: { id: pick.logicalCardId }, data: { nameKo: k.name } });
    }
    fixed++;
  }
  console.log(`\n교정 ${fixed} · 유지 ${kept} · EN-only 분리 ${enOnly} · 실패 ${fail}`);

  if (APPLY) {
    // 이탈 LC nameKo 재계산: 남은 KR locale 있으면 그 이름, 없으면 null (오염 원복)
    let reset = 0;
    for (const lcid of touchedLcids) {
      const krLeft = await prisma.cardLocale.findFirst({ where: { logicalCardId: lcid, region: "KR" }, select: { name: true } });
      await prisma.logicalCard.update({ where: { id: lcid }, data: { nameKo: krLeft?.name ?? null } });
      reset++;
    }
    console.log(`이탈 LC nameKo 재계산: ${reset}`);
  } else console.log("(dry — --apply 로 적용)");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
