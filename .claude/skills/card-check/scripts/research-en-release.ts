// card-check 스킬 — "EN無 → 미발매?" 발매여부 리서치 (ptcg.io 기반).
// 원칙: DB·매처가 EN을 못 찾았다고 "미발매"로 단정 금지. ptcg.io(EN DB)에서 *동일 정체성*
//       (포켓몬=동일 dex集合+동일 일러 / 트레이너=동일 EN이름+동일 일러)으로 EN 프린트 실존을 조회해
//       [발매-수집누락] vs [JP단독 후보] vs [불명] 으로 분류한다.
// ※ pokemon.com 공식은 봇차단이라 자동조회 불가(2026-06-10) → ptcg.io 가 실용 권위.
//   단 *동명·동일러인데 아트만 다른* 케이스(글라디오류)나 artist 오기가 의심되면 카드 스캔 이미지로 최종 확정(SKILL §5-③·§6.3).
// 사용:  npx tsx .claude/skills/card-check/scripts/research-en-release.ts --jp <jpSetId> [--num N] [--all]
//        --all 없으면 *우리 DB에서 EN 미연결*인 JP 카드만 조회(기본). --num 으로 단건.
// 주의:  레포 루트에서 실행(dotenv). ptcg.io 무키 호출이라 카드당 ~350ms 지연.
//   ⚠ 일러만으로는 부족(같은 작가가 다른 카드도 그림) — 반드시 dex集合/EN이름까지 일치해야 "그 카드"의 발매다.
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { TR_JP2EN as TR_SM } from "../../../../scripts/lib/trainer-names-sm";
import { TR_JP2EN as TR_SV } from "../../../../scripts/lib/trainer-names-sv";
import { TR_JP2EN as TR_SWSH } from "../../../../scripts/lib/trainer-names-swsh";
import { TR_JP2EN as TR_XY } from "../../../../scripts/lib/trainer-names-xy";

const POKE = ["Pokémon", "Pokemon"];
const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const dexKey = (a: number[]) => [...a].sort((x, y) => x - y).join("&");

function pickTR(jpSet: string): Record<string, string> {
  if (/sm|det/i.test(jpSet)) return TR_SM;
  if (/swsh|^jp-tcg-s\d/i.test(jpSet)) return TR_SWSH;
  if (/xy|^jp-tcg-(dc|g\d)/i.test(jpSet)) return TR_XY;
  return TR_SV;
}

async function ptcgByArtist(artist: string): Promise<any[] | null> {
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(`artist:"${artist}"`)}&select=id,name,set,number,rarity,artist,nationalPokedexNumbers,supertype&pageSize=250`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url);
      if (!r.ok) { await new Promise((x) => setTimeout(x, 1500)); continue; }
      const j = await r.json();
      return Array.isArray(j.data) ? j.data : [];
    } catch { await new Promise((x) => setTimeout(x, 1500)); }
  }
  return null;
}

async function main() {
  const argv = process.argv.slice(2);
  const jpSet = argv[argv.indexOf("--jp") + 1];
  const num = argv.includes("--num") ? argv[argv.indexOf("--num") + 1] : null;
  const all = argv.includes("--all");
  if (!jpSet || argv.indexOf("--jp") < 0) { console.error("usage: --jp <jpSetId> [--num N] [--all]"); process.exit(1); }
  const TR = pickTR(jpSet);

  const where: any = { setId: jpSet };
  if (num) where.number = num;
  const jp = await prisma.cardLocale.findMany({
    where,
    select: { number: true, name: true, logicalCardId: true, logicalCard: { select: { supertype: true, pokedexNumbers: true, illustrator: true } } },
    orderBy: { numberInt: "asc" },
  });

  let released = 0, jpOnly = 0, unknown = 0, skipped = 0;
  for (const j of jp) {
    const enCount = await prisma.cardLocale.count({ where: { region: "EN", logicalCardId: j.logicalCardId } });
    if (enCount > 0 && !all) { skipped++; continue; }
    const rawName = j.name || "";
    const name = rawName.replace(/&amp;/g, "&");
    const illus = j.logicalCard.illustrator;
    const isPoke = POKE.includes(j.logicalCard.supertype ?? "");
    const dex = j.logicalCard.pokedexNumbers ?? [];
    const enName = TR[rawName]; // 트레이너 EN 정식명(있으면)

    // 리서치 가능 조건: 일러 필수(reprint 다리). 트레이너인데 EN사전명 없으면 dex도 없어 식별 불가.
    if (!illus) { unknown++; console.log(`  ? #${j.number} ${name} → 불명 (일러 부재)`); continue; }
    if (!isPoke && !enName) { unknown++; console.log(`  ? #${j.number} ${name} → 불명 (트레이너 EN사전명 미등록 — 사전 보강 후 재조회)`); continue; }
    if (isPoke && !dex.length) { unknown++; console.log(`  ? #${j.number} ${name} → 불명 (dex 없음)`); continue; }

    const cards = await ptcgByArtist(illus);
    await new Promise((x) => setTimeout(x, 350));
    if (cards == null) { unknown++; console.log(`  ? #${j.number} ${name} (${illus}) → 불명 (ptcg.io 조회 실패)`); continue; }

    // 동일 정체성 + 동일 일러만 인정: 포켓몬=dex集合 일치, 트레이너=EN이름 일치
    const hits = cards.filter((c: any) => {
      if (norm(c.artist) !== norm(illus)) return false;
      if (isPoke) return Array.isArray(c.nationalPokedexNumbers) && dexKey(c.nationalPokedexNumbers) === dexKey(dex);
      return norm(c.name) === norm(enName);
    });
    if (hits.length) {
      released++;
      const list = hits.slice(0, 4).map((c: any) => `${c.set.id}#${c.number}[${c.rarity ?? "?"}]`).join(", ");
      console.log(`  ✅ #${j.number} ${name} (${illus}) → EN 발매됨: ${list}${hits.length > 4 ? ` 외 ${hits.length - 4}` : ""}  ⇒ 우리 DB 미연결 = 🔴수집 누락 (미발매 아님)`);
    } else {
      jpOnly++;
      const why = isPoke ? `동일러 dex集합 ${dexKey(dex)} EN 없음` : `동일러 "${enName}" EN 없음`;
      console.log(`  ⚠ #${j.number} ${name} (${illus}) → JP단독 후보 (${why}) — 애매하면 *다른 아트* EN까지 이미지로 확인`);
    }
  }
  console.log(`\n■ ${jpSet}: EN발매-수집누락 ${released} · JP단독후보 ${jpOnly} · 불명 ${unknown}${all ? "" : ` · (EN기연결 ${skipped} 제외)`}`);
  console.log(`  ⇒ "JP단독후보"만 미발매 후보(이미지로 최종 확정). "수집누락"은 발매 확정이니 미발매로 적지 말 것.`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e?.message ?? e); process.exit(1); });
