/**
 * KR Set → CardPack 연결 (cardPackId=null 인 KR Set 전부 처리, 멱등).
 *
 * 실행: npx tsx scripts/link-kr-setgroups.ts
 *
 * 전략:
 *   1) code 기반 규칙 매핑: kr-sv4a(SV4a) → sv-paldean-fates 등 명시 테이블
 *   2) 자동 매칭 실패 → followup-plans.md 에 append (추측 금지)
 *   3) imageSmall/imageLarge 컬럼 건드리지 않음
 */
import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";
import * as fs from "fs";
import * as path from "path";

// ── 명시적 KR set code → CardPack id 매핑 ────────────────────────────────────
// code 는 Set.code 필드(대소문자 그대로) 또는 kr-{suffix} 형식 중 하나
// 키: Set.id (kr-xxx)  값: CardPack.id
const EXPLICIT_MAP: Record<string, string> = {
  // ── SV era ──
  "kr-sv1s": "sv-base",        // SV1S 스칼렛 ex → sv-base (스칼렛ex+바이올렛ex)
  "kr-sv1v": "sv-base",        // SV1V 바이올렛 ex → sv-base
  "kr-sv1a": "sv-triplet-beat",// SV1a 트리플렛비트
  "kr-sv2d": "sv-paldea-evolved",  // SV2D 클레이버스트
  "kr-sv2p": "sv-paldea-evolved",  // SV2P 스노해저드
  "kr-sv3":  "sv-obsidian-flames", // SV3 흑염의 지배자
  "kr-sv3a": "sv-raging-surf",
  "kr-sv4k": "sv-paradox-rift",
  "kr-sv4m": "sv-paradox-rift",
  "kr-sv4a": "sv-paldean-fates",   // SV4a 샤이니트레저 ex
  "kr-sv5a": "sv-crimson-haze",
  "kr-sv5k": "sv-temporal-forces",
  "kr-sv5m": "sv-temporal-forces",
  "kr-sv6":  "sv-twilight-masquerade",
  "kr-sv6a": "sv-shrouded-fable",
  "kr-sv7":  "sv-stellar-crown",
  "kr-sv7a": "sv-paradise-dragona",
  "kr-sv8":  "sv-surging-sparks",
  "kr-sv8a": "sv-prismatic-evolutions",
  "kr-sv9":  "sv-journey-together",
  "kr-sv9a": "sv-heatwave-arena",
  "kr-sv10": "sv-destined-rivals",
  "kr-sv11b":"sv-black-bolt-white-flare",
  "kr-sv11w":"sv-black-bolt-white-flare",

  // ── MEGA era ──
  "kr-m1l":  "mega-brave-symphonia",
  "kr-m1s":  "mega-brave-symphonia",
  "kr-m2":   "mega-infernox",
  "kr-m2a":  "mega-dream-ex",
  "kr-m3":   "mega-munikisuzero",
  "kr-m4":   "mega-ninja-spinner",
  "kr-mc":   "mega-dream-ex",        // 스타트덱100 배틀컬렉션 — MEGA era 합본 그룹

  // ── S (소드&실드) era ──
  // kr-si 스타트덱100 — og-si 없음, 소드&실드 기본 그룹
  "kr-si":   "og-s1w",  // 소드&실드 스타트덱100 → og-s1w (ソード)에 합류
  "kr-s5":   "og-s5i",  // 연격마스터 → og-s5i (一撃マスター/連撃マスター 합본)
  "kr-s6":   "og-s6h",  // 백은의 랜스 → og-s6h
  "kr-s7":   "og-s7d",  // 마천퍼펙트 → og-s7d
  "kr-s10":  "og-s10d", // 타임게이저 → og-s10d
  "kr-s11":  "og-s11a", // 로스트어비스 → og-s11a (白熱のアルカナ — 실제로는 en-tcg-swsh12 기준)
  "kr-sa":   "og-s1w",  // 스타터세트 V → og-s1w
  "kr-sb":   "og-s1w",  // 프리미엄 트레이너박스 소드&실드 → og-s1w
  "kr-sc":   "og-s4a",  // 샤이니컬렉션 → og-s4a (シャイニースターV)
  "kr-sd":   "og-s1w",  // 세트V → og-s1w
  "kr-se":   "og-s2a",  // VMAX 이상해꽃 → og-s2a (폭염워커 era)
  "kr-sg":   "og-s9",   // 인텔리레온VMAX 하이클래스덱 → og-s9 (스타버스)
  "kr-sj":   "og-s10d", // 자시안·자마젠타vs무한다이노 스페셜덱 → og-s10d
  "kr-sl":   "og-s9",   // 스타터 VSTAR 루카리오 → og-s9
  "kr-sn":   "og-s1w",  // 스타트덱100 피카츄V&이브이V → og-s1w
  "kr-so":   "og-s12",  // 리자몽VSTAR vs 레쿠쟈VMAX → og-s12
  "kr-sp1":  "og-s1w",
  "kr-sp2":  "og-s2",
  "kr-sp3":  "og-s6h",
  "kr-sp4":  "og-s6a",
  "kr-sp5":  "og-s8",
  "kr-sp6":  "og-s9",
  "kr-s8a-g":"og-s8a",  // 25th ANNIVERSARY GOLDEN BOX → og-s8a
  "kr-svm":  "og-s1w",  // 랜덤스타트덱 Generations → og-s1w 그룹(소드&실드 기반)

  // ── SM (썬&문) era ──
  "kr-sm6a": "og-sm6a",
  "kr-sm6b": "og-sm6b",
  "kr-sm7a": "og-sm7a",
  "kr-sm7b": "og-sm7b",
  "kr-sm8a": "og-sm8a",
  "kr-sm8b": "og-sm8b",
  "kr-sm9a": "og-sm9a",
  "kr-sm9b": "og-sm9b",
  "kr-sm10a":"og-sn10a",
  "kr-sm11": "og-sn11",
  "kr-sm2+": "og-sm2+",
  "kr-smxy": "og-sma",  // THE BEST OF XY → og-sma (Hidden Fates Shiny Vault 수준 하이클래스팩)
  // SM starter/special — SM 기본 그룹
  "kr-sma":  "og-sm1s",
  "kr-smc":  "og-sm3h",
  "kr-smd":  "og-sm9",
  "kr-sme":  "og-sm1s",
  "kr-smi":  "og-sm3h",
  "kr-smk":  "og-sm7",
  "kr-sml_": "og-sm9",
  "kr-smm":  "og-sm11a",
  "kr-smn":  "og-sm11b",
  "kr-sm30a":"og-sm1s",
  "kr-sm60a":"og-sm3h",
  "kr-sm60b":"og-sm4s",

  // ── XY era ──
  "kr-xy1":  "og-xy1a",
  "kr-xy5":  "og-xy5a",
  "kr-xy8":  "og-xy8a",
  "kr-xy11": "og-xy11a",
  "kr-fxy":  "og-xy0",   // XY 퍼스트세트 도치마론 → og-xy0 (Kalos Starter Set)
  "kr-xya":  "og-xy4",   // M리자몽 배틀덱 → XY 4탄 팬텀게이트 era
  "kr-xyb":  "og-xy6",
  "kr-xyc":  "og-xy7",
  "kr-xyd":  "og-xy9",
  "kr-xye":  "og-xy6",
  "kr-xyf":  "og-xy10",
  "kr-xyg":  "og-xy10",
  "kr-xyh":  "og-xy11a",
  "kr-rbd":  "og-xy11a", // 라이츄BREAK 덱 → XY BREAK era
  "kr-ubd":  "og-xy11a", // 음번BREAK 덱 → XY BREAK era
  "kr-xy30": "og-xy1a",  // 제르네아스덱 → XY1

  // ── SV starter/special ──
  "kr-sva":  "sv-base",
  "kr-svb":  "sv-base",
  "kr-svc":  "sv-base",
  "kr-svd":  "sv-base",
  "kr-svel": "sv-stellar-crown",
  "kr-svem": "sv-base",
  "kr-svf":  "sv-obsidian-flames",
  "kr-svg":  "sv-base",
  "kr-svhk": "sv-paradox-rift",
  "kr-svhm": "sv-paradox-rift",
  "kr-svjl": "sv-stellar-crown",
  "kr-svjp": "sv-shrouded-fable",
  "kr-svn":  "sv-journey-together",
  "kr-svod": "sv-journey-together",
  "kr-svom": "sv-journey-together",
  "kr-svp1": "sv-base",
  "kr-svp2": "sv-paldea-evolved",

  // ── MEGA starter/special ──
  "kr-ma":   "mega-dream-ex",  // 프리미엄 트레이너박스 MEGA
  "kr-mbd":  "mega-brave-symphonia",
  "kr-mbg":  "mega-brave-symphonia",
  "kr-m-p":  "og-jp-mega-promo", // MEGA 스페셜 카드 세트 「메가엘레이드 ex」 = JP MEGA 프로모(jp-tcg-M-P) 의 KR판. 번호 不일치라 정체성(dex+이름)으로 매칭 — 번호 미러 금지. (이전 mega-ninja-spinner 오매핑 2026-06-12 교정)
};

// ── PROMO 그룹: CardPack이 없으면 신규 생성 ────────────────────────────────────
// promo set 들은 era-specific promo CardPack으로 묶음
const PROMO_SETS: Record<string, string> = {
  "kr-promo":  "og-kr-sm-promo",   // 썬&문 강화확장팩/프로모 계열 모음
  "kr-sv-p":   "og-kr-sv-promo",   // SV 프로모
  "kr-s-p":    "og-kr-swsh-promo", // 소드&실드 프로모
};

const PROMO_GROUP_DEFS: Record<string, { era: string; nameKo: string }> = {
  "og-kr-sm-promo":   { era: "SM (썬·문)",   nameKo: "KR SM 프로모" },
  "og-kr-sv-promo":   { era: "SV",            nameKo: "KR SV 프로모" },
  "og-kr-swsh-promo": { era: "S (소드·실드)", nameKo: "KR 소드&실드 프로모" },
};

async function appendFollowup(lines: string[]) {
  if (lines.length === 0) return;
  const fpath = path.join(process.cwd(), "docs/followup-plans.md");
  const existing = fs.readFileSync(fpath, "utf-8");
  const section = `
---

## KR CardPack 미매핑 잔여 (link-kr-setgroups.ts, ${new Date().toISOString().slice(0, 10)})

다음 KR Set 들은 자동 매핑 실패. 사람이 검토 후 EXPLICIT_MAP에 추가 필요.

| Set ID | code | 카드수 | 이름 | 매핑 후보 |
|---|---|---|---|---|
${lines.join("\n")}

`;
  fs.writeFileSync(fpath, existing + section, "utf-8");
  console.log(`followup-plans.md에 미매핑 ${lines.length}건 기록 완료.`);
}

async function main() {
  const before = await prisma.set.count({ where: { region: "KR", cardPackId: null } });
  console.log(`시작: KR orphan set 수 = ${before}`);

  const allOrphan = await prisma.set.findMany({
    where: { region: "KR", cardPackId: null },
    select: { id: true, name: true, code: true, releaseDate: true, _count: { select: { localeCards: true } } },
  });

  // 기존 max(order) 확인 (프로모 그룹 생성 시 order 붙이기 위해)
  const agg = await prisma.cardPack.aggregate({ _max: { order: true } });
  let nextOrder = (agg._max.order ?? -1) + 1;

  const stats = { mapped: 0, promo: 0, unmapped: 0 };
  const unmappedLines: string[] = [];

  // --- 1) 프로모 CardPack 미리 upsert ---
  for (const [groupId, def] of Object.entries(PROMO_GROUP_DEFS)) {
    const exists = await prisma.cardPack.findUnique({ where: { id: groupId } });
    if (!exists) {
      await prisma.cardPack.create({
        data: { id: groupId, era: def.era, nameKo: def.nameKo, order: nextOrder++ },
      });
      console.log(`  [신규] CardPack 생성: ${groupId} (${def.nameKo})`);
    }
  }

  // --- 2) 각 KR set 처리 ---
  for (const s of allOrphan) {
    const explicit = EXPLICIT_MAP[s.id];
    const promo = PROMO_SETS[s.id];
    const targetGroupId = explicit ?? promo ?? null;

    if (targetGroupId) {
      // CardPack 존재 확인
      const grp = await prisma.cardPack.findUnique({ where: { id: targetGroupId } });
      if (!grp) {
        console.warn(`  [경고] CardPack 없음: ${targetGroupId} (for ${s.id}) — followup 처리`);
        unmappedLines.push(`| ${s.id} | ${s.code} | ${s._count.localeCards} | ${s.name} | ${targetGroupId} (없음) |`);
        stats.unmapped++;
        continue;
      }
      await prisma.set.update({ where: { id: s.id }, data: { cardPackId: targetGroupId } });
      if (promo && !explicit) stats.promo++;
      else stats.mapped++;
      console.log(`  [OK] ${s.id} → ${targetGroupId}`);
    } else {
      // 자동 매칭 실패: 후보 로그
      // 이름 기반 후보 탐색
      const kw = s.name.replace(/[「」『』\[\]【】]/g, "").slice(0, 10);
      const candidates = await prisma.cardPack.findMany({
        where: { OR: [{ nameKo: { contains: kw } }, { nameJa: { contains: kw } }] },
        select: { id: true, nameKo: true },
        take: 3,
      });
      const candidateStr = candidates.map((c) => `${c.id}(${c.nameKo})`).join(", ") || "없음";
      unmappedLines.push(`| ${s.id} | ${s.code} | ${s._count.localeCards} | ${s.name} | ${candidateStr} |`);
      stats.unmapped++;
      console.log(`  [SKIP] ${s.id} — 후보: ${candidateStr}`);
    }
  }

  // --- 3) 미매핑 followup 기록 ---
  await appendFollowup(unmappedLines);

  // --- 4) 결과 통계 ---
  const after = await prisma.set.count({ where: { region: "KR", cardPackId: null } });
  console.log("─".repeat(50));
  console.log(`KR orphan before: ${before} → after: ${after}`);
  console.log(`  명시 매핑: ${stats.mapped}건`);
  console.log(`  프로모 매핑: ${stats.promo}건`);
  console.log(`  미매핑(followup): ${stats.unmapped}건`);

  // era별 분포
  const eraDist = await prisma.$queryRaw<{ era: string; cnt: bigint }[]>`
    SELECT sg.era, COUNT(*) as cnt
    FROM "Set" s
    JOIN "SetGroup" sg ON sg.id = s."setGroupId"
    WHERE s.region = 'KR'
    GROUP BY sg.era
    ORDER BY cnt DESC
  `;
  console.log("KR set era별 분포 (연결 후):");
  eraDist.forEach((r) => console.log(`  ${r.era}: ${r.cnt}`));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
