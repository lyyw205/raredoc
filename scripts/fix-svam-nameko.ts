/**
 * SVAM(스타터세트ex 나오하&루카리오 / Sprigatito & Lucario) nameKo 오염 교정.
 * 버그: jp-tcg-SVAM.nameKo 에 "꾸왁스&따라큐 ex"(Quaxly&Mimikyu, 다른 제품)가 잘못 들어감.
 *   - 검증: jp-tcg-SVAM 카드 #4 ニャオハ(Sprigatito)·#9 ルカリオex(Lucario) → 종 확정.
 *   - 공식 KR 제품명(pokemoncard.co.kr/card/517) = "스칼렛&바이올렛 스타터 세트 ex 「나오하&루카리오 ex」".
 *     (한국 Sprigatito = 나오하, 냐오하 아님)
 * sv-decks 는 비동결. nameKo 는 세트 메타데이터(카드연결 무관).
 * 실행: npx tsx scripts/fix-svam-nameko.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const KO = "스칼렛&바이올렛 스타터 세트 ex 「나오하&루카리오 ex」";
const ID = "jp-tcg-SVAM";
const GUARD = "꾸왁스"; // 오염값(Quaxly)일 때만 교정

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ SVAM nameKo 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  const cur = await prisma.set.findUnique({ where: { id: ID }, select: { id: true, name: true, nameKo: true } });
  if (!cur) { console.log(`  ${ID}: (없음)`); await prisma.$disconnect(); return; }
  if (!(cur.nameKo ?? "").includes(GUARD)) {
    console.log(`  ${ID}: 가드 불일치(현재 nameKo="${cur.nameKo}") → 건너뜀`);
  } else {
    console.log(`  ${ID}: nameKo "${cur.nameKo}" → "${KO}"`);
    if (APPLY) await prisma.set.update({ where: { id: ID }, data: { nameKo: KO } });
  }
  if (APPLY) {
    const r = await prisma.set.findUnique({ where: { id: ID }, select: { nameKo: true } });
    console.log(`\n=== 검증 ===\n  ${ID}: ${r?.nameKo}`);
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
