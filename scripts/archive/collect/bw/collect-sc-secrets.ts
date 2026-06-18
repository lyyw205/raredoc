// シャイニーコレクション (og-bw-shiny / jp-tcg-SC) JP 누락 시크릿 #21~25 수집 — 사용자 제공 tcgcollector 이미지.
//
// 배경: jp-tcg-SC 본문은 #1~20 까지만 DB 존재(currentMax=20). BW시대라 JP공식이 시크릿(#21~25)을 미등재.
//   사용자가 tcgcollector 일러 URL 5장 제공. 이미지에서 인쇄번호·이름·레어도 직접 확인:
//     #021 シェイミEX SR / #022 レシラム SR / #023 エモンガ SR / #024 ミュウEX SR / #025 メロエッタEX SR
//   (모두 021/020~025/020 = 분모초과 BW 시크릿, 우하단 SR 표기)
//
// ⚠ 중요(STEP6): EN(Legendary Treasures: Radiant Collection RC21~RC25 = en-tcg-bw11)·KR(kr-sc #21~25)에
//   이 동일 시크릿 프린트가 이미 DB에 실재하며, LogicalCard 들(lc-orphan-en-tcg-bw11-RC2X)이 이미
//   cardPackId=og-bw-shiny 로 우리 팩에 묶여 EN+KR 로케일을 보유(rarity=SR)하고 있다.
//   따라서 새 lc-orphan-jp-tcg-SC-0XX 를 만들지 않고, 기존 LC 에 JP 로케일을 추가(붙임)한다.
//   그 LC 들은 게임필드(hp/attacks 등)가 비어 있어(hp=null) JP 본문/타세트의 동일 gameCardId 카드에서
//   게임필드를 복제해 함께 채운다(EN/KR 표시도 같이 개선 — 동일 물리카드라 일관).
//
// 시크릿→게임필드 소스(이름·HP·기술 육안 대조로 확정):
//   #21 シェイミEX  ← jp-tcg-BW3P#005 (こうごうせい/リベンジバースト, HP110 Basic+EX)
//   #22 レシラム    ← jp-tcg-BW1B#013 (げきりん/あおいほのお, HP130 Basic)
//   #23 エモンガ    ← jp-tcg-BW5D#017 (なかまをよぶ/バチバチ, HP70 Basic)
//   #24 ミュウEX    ← jp-tcg-BW5B#022 (リプレイス, HP120 Basic+EX)  ※특성 オールマイティー 가 base 게임필드에 누락 — issues FLAG(base 카드 데이터 갭, 본 작업이 만든 것 아님)
//   #25 メロエッタEX ← jp-tcg-SC#011  (シャイニーボイス/りんしょう, HP110 Basic+EX, 본문)
//
// 영향 cardPackId: og-bw-shiny(JP/KR 팩) + og-ebb(EN bw11 set 의 팩). 둘 다 비동결.
// 기본 dry-run, --apply 로 기록. 단일 $transaction. 멱등 upsert/update.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-SC";
const PACK = "og-bw-shiny";
const SR = "cmpp4wyyk001ryjurevrx3dq0"; // Super Rare (abbr SR, tier 7) — 이미지 우하단 표기와 일치
const pad = (n: number) => String(n).padStart(3, "0");

// 시크릿 → { 기존 LC id(EN/KR 연결), JP이름, 게임필드 소스(setId,number), tcgcollector 이미지 idx }
const MAP = [
  { num: 21, lcId: "lc-orphan-en-tcg-bw11-RC21", ja: "シェイミEX",   src: { setId: "jp-tcg-BW3P", number: "005" }, imgIdx: 0 },
  { num: 22, lcId: "lc-orphan-en-tcg-bw11-RC22", ja: "レシラム",     src: { setId: "jp-tcg-BW1B", number: "013" }, imgIdx: 1 },
  { num: 23, lcId: "lc-orphan-en-tcg-bw11-RC23", ja: "エモンガ",     src: { setId: "jp-tcg-BW5D", number: "017" }, imgIdx: 2 },
  { num: 24, lcId: "lc-orphan-en-tcg-bw11-RC24", ja: "ミュウEX",     src: { setId: "jp-tcg-BW5B", number: "022" }, imgIdx: 3 },
  { num: 25, lcId: "lc-orphan-en-tcg-bw11-RC25", ja: "メロエッタEX", src: { setId: "jp-tcg-SC",   number: "011" }, imgIdx: 4 },
];

const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

async function main() {
  // 영향 팩: og-bw-shiny(JP RC + 공유 LC) + og-ebb(EN bw11 set). 둘 다 비동결.
  assertWritable([PACK, "og-ebb"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-sc-secrets" });

  // 매니페스트에서 이미지 URL 로드 (도감순 = imgIdx)
  const manifest = JSON.parse(require("fs").readFileSync("/tmp/bw_illust_manifest.json", "utf8"));
  const urls: string[] = manifest["샤이니컬렉션"].urls;

  type Plan = { num: number; lcId: string; ja: string; rarityId: string; url: string; game: any; lcExists: boolean; rcExists: boolean };
  const plan: Plan[] = [];
  for (const m of MAP) {
    const src = await prisma.regionCard.findFirst({ where: { setId: m.src.setId, number: m.src.number }, select: { name: true, card: { select: GAME } } });
    if (!src?.card) throw new Error(`게임필드 소스 ${m.src.setId}#${m.src.number} (#${m.num} ${m.ja}) 없음`);
    if (src.name !== m.ja) console.warn(`  ⚠ 소스 이름 불일치: ${m.src.setId}#${m.src.number} name='${src.name}' ≠ '${m.ja}'`);
    const lc = await prisma.card.findUnique({ where: { id: m.lcId }, select: { id: true, hp: true } });
    if (!lc) throw new Error(`기존 LC ${m.lcId} (#${m.num}) 없음 — EN/KR 연결 전제가 깨짐`);
    const rc = await prisma.regionCard.findUnique({ where: { id: `${SET}-${pad(m.num)}` }, select: { id: true } });
    plan.push({ num: m.num, lcId: m.lcId, ja: m.ja, rarityId: SR, url: urls[m.imgIdx], game: src.card, lcExists: !!lc, rcExists: !!rc });
  }

  console.log(`\n=== シャイニーコレクション 시크릿 수집 (${APPLY ? "APPLY" : "DRY-RUN"}) — ${plan.length}장 ===`);
  console.log(`방식: 기존 EN/KR LC 에 JP 로케일 추가 + LC 게임필드 복제(현재 hp=null) · rarity=SR`);
  for (const p of plan) {
    const atk = Array.isArray(p.game.attacks) ? (p.game.attacks as any[]).map((a: any) => a.name).join("/") : "(none)";
    console.log(`  jp-tcg-SC-${pad(p.num)} ${p.ja} → LC ${p.lcId}  [${p.game.supertype} ${JSON.stringify(p.game.subtypes)} HP${p.game.hp} gc=${p.game.gameCardId} atk=${atk}] SR`);
    console.log(`        rcExists=${p.rcExists ? "있음(update)" : "신규"}  img=${p.url.slice(-24)}`);
  }

  if (!APPLY) { console.log("\n(dry-run — --apply 로 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const g = p.game;
      // 1) 기존 공유 LC 의 게임필드를 JP 본문에서 복제(현재 비어 있음 → 채움). cardPackId/primarySet/primaryNumber 는 건드리지 않음(EN 원조 보존).
      await tx.card.update({
        where: { id: p.lcId },
        data: {
          supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
          weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
          rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
          legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
          gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId,
        },
      });
      // 2) JP RegionCard 추가(멱등 upsert) — 같은 공유 LC 에 붙임.
      const rcId = `${SET}-${pad(p.num)}`;
      const rcData = {
        cardId: p.lcId, language: "ja", region: "JP", setId: SET,
        number: pad(p.num), numberInt: p.num, name: p.ja,
        imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rcData }, update: rcData });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
