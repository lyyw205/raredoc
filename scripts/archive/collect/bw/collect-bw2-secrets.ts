// 레드컬렉션 (og-bw2 / jp-tcg-bw2) JP 누락 시크릿 #67~72 수집 — 사용자 제공 tcgcollector 일러 URL.
//   BW시대 시크릿은 JP공식(pokemon-card.com)이 미등재 → 우리 DB 가 currentMax=66 에서 끊김.
//   tcgcollector 는 이 6장을 EN '떠오르는힘(Emerging Powers)' 아래 뒀지만, 우리 DB 의 og-bw2 JP세트=レッドコレクション
//   이 정본 — 카드에 인쇄된 번호가 067~072/066(분모초과 시크릿)임을 이미지로 직접 확인해 og-bw2 에 수집.
//   매핑·번호·레어도: /tmp/레드컬렉션/{1..6}.webp 를 Read 로 육안 확인(인쇄번호·JP명·레어도 우하단).
//     67 ビリジオン SR · 68 テラキオン SR · 69 コバルオン SR · 70 ビクティニ SR · 71 N(Supporter) SR · 72 ニャース UR(골드)
//   게임데이터는 본문 카드(같은 이름·낮은 번호) 복제. #72 ニャース 는 본문 매칭 실패(jpSet 에 ニャース 본문 없음,
//     동일 게임트윈도 부재 — 최근접 DP5A-018 은 HP50) → 이미지에서 읽은 정보로 최소 채움, gameCardId=null. (issues FLAG)
//   imageSmall=imageLarge=해당 tcgcollector url. EN/KR 대응 없음(JP 단독, STEP6 결과 참조).
// og-bw2 비동결. 기본 dry-run, --apply 로 기록. 단일 $transaction. 멱등 upsert.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const SET = "jp-tcg-bw2";
const PACK = "og-bw2";
const pad = (n: number) => String(n).padStart(3, "0");

const SR = "cmpp4wyyk001ryjurevrx3dq0"; // Super Rare (tier 7)
const UR = "cmpp4wyzt001wyjuriy5esk1h"; // Ultra Rare (tier 8)

// 본문에서 복제할 게임 필드(인쇄본 무관 = 동일)
const GAME = {
  supertype: true, subtypes: true, types: true, hp: true, retreatCost: true,
  weakness: true, resistance: true, regulationMark: true, pokedexNumbers: true,
  rules: true, flavorText: true, abilities: true, attacks: true, gameCardId: true,
  legalities: true, evolvesFrom: true, evolvesTo: true, nameKo: true,
} as const;

// 시크릿 → (인쇄JP명, 레어도, 본문이름[복제소스], img URL)
const SECRETS: { num: number; ja: string; rarityId: string; baseName: string | null; url: string }[] = [
  { num: 67, ja: "ビリジオン", rarityId: SR, baseName: "ビリジオン", url: "https://static.tcgcollector.com/content/images/99/13/e5/9913e52de87abc9c54dc0a6e00d172cae7a735ff63628d226bb4e95d71d05dea.webp" },
  { num: 68, ja: "テラキオン", rarityId: SR, baseName: "テラキオン", url: "https://static.tcgcollector.com/content/images/90/41/ed/9041ed2732c5f48ba150524474975b7955d0f077876162f79486bc4b176e2fe9.webp" },
  { num: 69, ja: "コバルオン", rarityId: SR, baseName: "コバルオン", url: "https://static.tcgcollector.com/content/images/49/ae/28/49ae28129438585e6730eaaff249db6d3ef9364d761b59a3fa537a20d54d38c4.webp" },
  { num: 70, ja: "ビクティニ", rarityId: SR, baseName: "ビクティニ", url: "https://static.tcgcollector.com/content/images/0e/bc/63/0ebc638e2f3ce492acd3cc864df125d0ad87416606d9bb8575d500c5af495483.webp" },
  { num: 71, ja: "N",         rarityId: SR, baseName: "N",         url: "https://static.tcgcollector.com/content/images/88/81/b5/8881b5f174ecc669ca6f6cbd48d4aa003a737ad80b1da91e5db74dc1607c6ff8.webp" },
  { num: 72, ja: "ニャース", rarityId: UR, baseName: null,        url: "https://static.tcgcollector.com/content/images/c4/ce/b3/c4ceb3c1645890b28ed89b109558a9a7f5d467042b545dd5d25bc94401bd0c32.webp" },
];

// #72 ニャース UR — 본문/게임트윈 부재 → 이미지에서 읽은 최소 게임필드(육안 확인):
//   たね(Basic)/HP60/무색/도감52/후퇴1/약점x2/저항-20, 기술: みだれひっかき(無,10x flip3) · ネコにこばん(無無,20 draw1)
// JSON shape 는 DB 내 BW2 본문 카드와 동일하게 맞춤(weakness/resistance/retreatCost=null 관례, attack={cost,name,text,damage}).
const MEOWTH_FALLBACK = {
  supertype: "Pokémon",
  subtypes: ["Basic"] as string[],
  types: ["Colorless"] as string[],
  hp: 60,
  retreatCost: null as any,
  weakness: null as any,
  resistance: null as any,
  regulationMark: null as string | null,
  pokedexNumbers: [52] as number[],
  rules: [] as any,
  flavorText: null as string | null,
  abilities: undefined as any,
  attacks: [
    { cost: ["Colorless"], name: "みだれひっかき", text: "コインを3回投げ、オモテの数×10ダメージ。", damage: "10×" },
    { cost: ["Colorless", "Colorless"], name: "ネコにこばん", text: "自分の山札を1枚引く。", damage: "20" },
  ] as any,
  legalities: undefined as any,
  evolvesFrom: null as string | null,
  evolvesTo: [] as any,
  gameCardId: null as string | null, // 게임트윈 미확정 — 임의 링크 회피
  nameKo: "나옹",
};

async function main() {
  assertWritable([PACK], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "collect-bw2-secrets" });

  // 현황: max 번호 + 타깃 id 충돌
  const existing = await prisma.regionCard.findMany({ where: { setId: SET }, select: { numberInt: true } });
  const maxNum = Math.max(...existing.map((r) => r.numberInt ?? 0));
  const targetRcIds = SECRETS.map((s) => `${SET}-${pad(s.num)}`);
  const targetLcIds = SECRETS.map((s) => `lc-orphan-${SET}-${pad(s.num)}`);
  const rcClash = await prisma.regionCard.findMany({ where: { id: { in: targetRcIds } }, select: { id: true } });
  const lcClash = await prisma.card.findMany({ where: { id: { in: targetLcIds } }, select: { id: true } });

  // 본문 매칭(67~71) — 같은 세트, 같은 이름, numberInt<=66
  const plan: any[] = [];
  for (const s of SECRETS) {
    if (s.baseName) {
      const base = await prisma.regionCard.findFirst({
        where: { setId: SET, name: s.baseName, numberInt: { lte: 66 } },
        select: { numberInt: true, name: true, card: { select: GAME } },
        orderBy: { numberInt: "asc" },
      });
      if (!base || !base.card) throw new Error(`본문 '${s.baseName}' (#${s.num}) DB 없음 — 복제 불가`);
      plan.push({ ...s, baseNumber: base.numberInt, game: base.card });
    } else {
      // #72 ニャース — 폴백 최소 채움
      plan.push({ ...s, baseNumber: null, game: MEOWTH_FALLBACK });
    }
  }

  console.log(`\n=== 레드컬렉션 시크릿 수집 (${APPLY ? "APPLY" : "DRY-RUN"}) — ${plan.length}장 ===`);
  console.log(`현재 ${SET} max 번호: ${maxNum} (→ #67~72 추가, 갭=66↔67 연속)`);
  console.log(`id 충돌: RC ${rcClash.length}건, LC ${lcClash.length}건`);
  for (const p of plan) {
    const rar = p.rarityId === UR ? "UR" : "SR";
    const baseTag = p.baseNumber == null ? "본문매칭실패→이미지폴백(gameCardId=null) ⚠" : `← 본문 #${p.baseNumber}`;
    console.log(`  #${pad(p.num)} ${p.ja} [${p.game.supertype} ${JSON.stringify(p.game.subtypes)}] HP${p.game.hp} ${rar} gc=${p.game.gameCardId} ko='${p.game.nameKo}'  ${baseTag}`);
    console.log(`        img=${p.url}`);
  }

  if (rcClash.length || lcClash.length) console.log("\n⚠️ id 충돌 존재 — 멱등 upsert 로 갱신됨(create→update). 검토 요망.");
  if (!APPLY) { console.log("\n(dry-run — --apply 로 기록)"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const lcId = `lc-orphan-${SET}-${pad(p.num)}`;
      const rcId = `${SET}-${pad(p.num)}`;
      const g = p.game;
      const lcData = {
        cardPackId: PACK, primarySetId: SET, primaryNumber: pad(p.num), primaryNumberInt: p.num,
        supertype: g.supertype, subtypes: g.subtypes, types: g.types, hp: g.hp, retreatCost: g.retreatCost,
        weakness: g.weakness, resistance: g.resistance, regulationMark: g.regulationMark, pokedexNumbers: g.pokedexNumbers,
        rules: g.rules, flavorText: g.flavorText, abilities: g.abilities ?? undefined, attacks: g.attacks ?? undefined,
        legalities: g.legalities ?? undefined, evolvesFrom: g.evolvesFrom, evolvesTo: g.evolvesTo,
        gameCardId: g.gameCardId, nameKo: g.nameKo, rarityId: p.rarityId, illustrator: null as string | null,
      };
      await tx.card.upsert({ where: { id: lcId }, create: { id: lcId, ...lcData }, update: lcData });
      const rcData = {
        cardId: lcId, language: "ja", region: "JP", setId: SET, number: pad(p.num), numberInt: p.num,
        name: p.ja, imageSmall: p.url, imageLarge: p.url, rarityId: p.rarityId,
      };
      await tx.regionCard.upsert({ where: { id: rcId }, create: { id: rcId, ...rcData }, update: rcData });
    }
  });
  console.log("\n✅ 기록 완료.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
