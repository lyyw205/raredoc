/**
 * KR 공식 매핑 정합성 전수 검증 (읽기전용). apply-kr-official 결과가 옳은지 독립 신호로 교차검증.
 *   - 포켓몬: KR koName→dex(PokeAPI ko) 가 붙은 JP 앵커 LC 의 dex 와 일치하는가 (매칭키와 독립)
 *   - 전체: KR 공식 일러스트레이터 == JP 앵커 LC 일러스트레이터
 * 불일치 = 오매핑 의심 → 출력.
 *
 * 실행: npx tsx scripts/verify-kr-mapping.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync } from "node:fs";
import { resolveCardDexes } from "./lib/pokeapi-names";
import { POKE, isPokemonSupertype } from "./lib/supertype";
import { normLower as norm } from "./lib/text-norm";
const SETS: [string, string][] = [
  ["kr-sv2p", "sv2p"], ["kr-sv2d", "sv2d"], ["kr-sv4k", "sv4k"], ["kr-sv4m", "sv4m"], ["kr-sv-151", "sv2a"], ["kr-sv3", "sv3"], ["kr-sv3a", "sv3a"], ["kr-sv4a", "sv4a"], ["kr-sv5k", "sv5k"], ["kr-sv5m", "sv5m"], ["kr-sv5a", "sv5a"], ["kr-sv6", "sv6"], ["kr-sv6a", "sv6a"], ["kr-sv7", "sv7"], ["kr-sv7a", "sv7a"], ["kr-sv8", "sv8"], ["kr-sv8a", "sv8a"], ["kr-sv9", "sv9"], ["kr-sv9a", "sv9a"], ["kr-sv10", "sv10"], ["kr-sv11b", "sv11b"], ["kr-sv11w", "sv11w"],
  ["kr-m1l", "m1l"], ["kr-m1s", "m1s"], ["kr-m2", "m2"], ["kr-m2a", "m2a"], ["kr-m3", "m3"], ["kr-m4", "m4"],
  ["kr-mc", "mc"], ["kr-mbd", "mbd"], ["kr-mbg", "mbg"], ["kr-ma", "ma"], // MEGA 구축덱/강화상품
  ["kr-fs", "fs"], ["kr-bg_virizion", "bg-virizion"], ["kr-bg_terrakion", "bg-terrakion"], ["kr-bg_cobalon", "bg-cobalon"], ["kr-bgrex", "bgrex"], ["kr-bgz", "bgz"], ["kr-td", "td"], ["kr-bd", "bd"], ["kr-sbd", "sbd"], ["kr-gbd", "gbd"], ["kr-kd", "kd"], ["kr-pd", "pd"], ["kr-bgb", "bgb"], ["kr-bgw", "bgw"], ["kr-pss", "pss"], ["kr-g+k", "gk"], ["kr-mg", "mg"], // BW 덱
  ["kr-fxy", "fxy"], ["kr-xy30", "xy30"], ["kr-xy30b", "xy30b"], ["kr-xya", "xya"], ["kr-xyb", "xyb"], ["kr-xyc", "xyc"], ["kr-xyd", "xyd"], ["kr-xye", "xye"], ["kr-rbd", "rbd"], ["kr-ubd", "ubd"], ["kr-xyf", "xyf"], ["kr-xyg", "xyg"], ["kr-xyh", "xyh"], // XY 덱
  ["kr-sa", "sa"], ["kr-se", "se"], ["kr-seb", "seb"], ["kr-sg", "sg"], ["kr-sgg", "sg-gengar"], ["kr-sd", "sd"], ["kr-sh", "sh"], ["kr-sj", "sj"], ["kr-sl", "sl"], ["kr-sld", "sl-darkrai"], ["kr-spz", "sp-zeraora"], ["kr-spd", "sp-deoxys"], ["kr-so", "so"], ["kr-si", "si"], ["kr-sn", "sn"], // SWSH 덱
  ["kr-sb", "sb"], ["kr-sp1", "sp1"], ["kr-sp2", "sp2"], ["kr-sp3", "sp3"], ["kr-sp4", "sp4"], ["kr-sp5", "sp5"], ["kr-sp6", "sp6"], // SWSH 굿즈
  ["kr-svi", "svi"], ["kr-sva", "sva"], ["kr-sval", "sval"], ["kr-svc", "svc"], ["kr-svd", "svd"], ["kr-svel", "svel"], ["kr-svem", "svem"], ["kr-svg", "svg"], ["kr-svhk", "svhk"], ["kr-svhm", "svhm"], ["kr-svjl", "svjl"], ["kr-svjp", "svjp"], ["kr-svln", "svln"], ["kr-svls", "svls"], ["kr-svm", "svm"], ["kr-svod", "svod"], ["kr-svom", "svom"], // SV 구축덱
  ["kr-svb", "svb"], ["kr-svf", "svf"], ["kr-svk", "svk"], ["kr-svn", "svn"], ["kr-svp1", "svp1"], // SV 강화상품
  ["kr-s12a", "s12a"], ["kr-s12", "s12"], ["kr-s11a", "s11a"], ["kr-s11", "s11"], ["kr-s10b", "s10b"], ["kr-s10a", "s10a"], ["kr-s10", "s10d"], ["kr-s10p", "s10p"], ["kr-s9a", "s9a"], ["kr-s9", "s9"], ["kr-s8b", "s8b"], ["kr-s8", "s8"], ["kr-s7", "s7d"], ["kr-s7r", "s7r"], ["kr-s6", "s6h"], ["kr-s6k", "s6k"], ["kr-s5", "s5i"], ["kr-s5r", "s5r"], ["kr-s4", "s4"], ["kr-s3a", "s3a"], ["kr-s3", "s3"], ["kr-s2a", "s2a"], ["kr-s2", "s2"], ["kr-s1h", "s1h"], ["kr-s1w", "s1w"], ["kr-s1a", "s1a"], ["kr-s4a", "s4a"],
  ["kr-sm1s", "sm1s"], ["kr-sm1m", "sm1m"], ["kr-sm1+", "sm1plus"], ["kr-sm2k", "sm2k"], ["kr-sm2l", "sm2l"],
  ["kr-sm2+", "sm2plus"], ["kr-sm3n", "sm3n"], ["kr-sm3h", "sm3h"], ["kr-sm3+", "sm3plus"],
  ["kr-sm4s", "sm4s"], ["kr-sm4a", "sm4a"], ["kr-sm4+", "sm4plus"],
  ["kr-sm5s", "sm5s"], ["kr-sm5m", "sm5m"], ["kr-sm5+", "sm5plus"], ["kr-sm6", "sm6"], ["kr-sm6a", "sm6a"], ["kr-sm6b", "sm6b"], ["kr-sm7", "sm7"], ["kr-sm7a", "sm7a"], ["kr-sm7b", "sm7b"],
  ["kr-sm8", "sm8"], ["kr-sm8a", "sm8a"], ["kr-sm8b", "sm8b"],
  ["kr-sm9", "sm9"], ["kr-sm9a", "sm9a"], ["kr-sm9b", "sm9b"],
  ["kr-sm10", "sm10"], ["kr-sm10a", "sm10a"], ["kr-sm10b", "sm10b"],
  ["kr-sm11", "sm11"], ["kr-sm11a", "sm11a"], ["kr-sm11b", "sm11b"],
  ["kr-sm12", "sm12"], ["kr-sm12a", "sm12a"], ["kr-smp2", "smp2"],
  ["kr-smxy", "smxy"], ["kr-cp6", "cp6"], ["kr-cp5", "cp5"], // XY 컨셉팩·하이클래스(정석 재수집)
  ["kr-xy9", "xy9"], ["kr-xy10", "xy10"], ["kr-xy11", "xy11"], ["kr-xy11r", "xy11r"], // XY9~11(정석 재수집)
  ["kr-xy6", "xy6"], ["kr-xy7", "xy7"], ["kr-xy8", "xy8"], ["kr-xy8b", "xy8b"], // XY6~8(정석 재수집)
  ["kr-xy1", "xy1"], ["kr-xy1b", "xy1b"], ["kr-xy2", "xy2"], ["kr-xy3", "xy3"], ["kr-xy4", "xy4"], ["kr-xy5g", "xy5g"], ["kr-xy5", "xy5"], // XY1~5(배치12, 검증 소급)
  ["kr-cp1", "cp1"], ["kr-cp2", "cp2"], ["kr-cp3", "cp3"], ["kr-cp4", "cp4"], // CP1~4(정석 재수집)
  ["kr-bw1b", "bw1b"], ["kr-bw1", "bw1"], ["kr-bw2", "bw2"], // BW1~2(정석 재수집)
  ["kr-bgr", "bgr"], ["kr-dc", "dc"], // BW 다크러시·드래곤컬렉션
  ["kr-bw5", "bw5"], ["kr-bw5d", "bw5d"], ["kr-bw6", "bw6"], ["kr-bw6c", "bw6c"], // BW5~6 분할(정석 재수집)
  ["kr-bw7", "bw7"], ["kr-bw8", "bw8"], ["kr-bw9", "bw9"], ["kr-ebb", "ebb"], ["kr-sc", "sc"], // BW7~9·EBB·샤이니(BW배치4)
  ["kr-bw3p", "bw3p"], ["kr-bw3h", "bw3h"], // BW 제3탄(2026-06-06 발견)
];

async function main() {
  let totDexBad = 0, totIllusBad = 0, totPoke = 0, totChk = 0;
  for (const [krSet, code] of SETS) {
    const off = JSON.parse(readFileSync(`data/kr-official/kr-official-${code}.json`, "utf8"));
    const offByNum = new Map<number, any>(off.map((c: any) => [parseInt(c.number, 10), c]));
    const kr = await prisma.regionCard.findMany({ where: { setId: krSet },
      select: { number: true, numberInt: true, name: true, card: { select: { pokedexNumbers: true, illustrator: true, supertype: true } } } });

    const dexBad: string[] = [], illusBad: string[] = [];
    let poke = 0;
    for (const r of kr) {
      const o = offByNum.get(r.numberInt!);
      if (!o) { illusBad.push(`#${r.number} ${r.name} (공식 번호없음)`); continue; }
      const lc = r.card;
      // 일러 검증 (공식 일러 존재 시)
      if (o.illustrator && lc.illustrator && norm(o.illustrator) !== norm(lc.illustrator))
        illusBad.push(`#${r.number} ${r.name}: 공식일러"${o.illustrator}" ≠ 앵커"${lc.illustrator}"`);
      // dex 검증 (포켓몬: KR 한글명→dex 가 앵커 dex 와 일치?)
      if (isPokemonSupertype(lc.supertype)) {
        poke++;
        const koDexes = resolveCardDexes(r.name, "ko");
        const anchorDex = lc.pokedexNumbers ?? [];
        const ok = koDexes.length === 0 ? null : koDexes.some((d) => anchorDex.includes(d));
        if (ok === false) dexBad.push(`#${r.number} ${r.name}: 이름→dex[${koDexes}] ≠ 앵커dex[${anchorDex}]`);
      }
    }
    totDexBad += dexBad.length; totIllusBad += illusBad.length; totPoke += poke; totChk += kr.length;
    console.log(`\n■ ${krSet} (n${kr.length}, 포켓몬 ${poke})`);
    console.log(`  dex 불일치 ${dexBad.length} · 일러 불일치 ${illusBad.length}`);
    for (const x of dexBad.slice(0, 12)) console.log(`   ✗dex ${x}`);
    for (const x of illusBad.slice(0, 12)) console.log(`   ✗illus ${x}`);
  }
  console.log(`\n═══ 합계: 검증 ${totChk}장(포켓몬 ${totPoke}) · dex불일치 ${totDexBad} · 일러불일치 ${totIllusBad} ═══`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
