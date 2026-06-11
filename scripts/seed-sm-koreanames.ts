/**
 * SM era CardPack + Set 한글명 입력.
 *
 * - KR set 있는 25개: KR set.nameKo → CardPack.nameKo 복사
 * - JP-only 12개: 음역/직역 하드코딩
 *
 * Run: npx tsx scripts/seed-sm-koreanames.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

interface SMEntry {
  groupId: string;
  nameKo: string;
  enSetIds: string[];
  jpSetIds: string[];
  krSetIds: string[];
}

// KR set 있는 25개: nameKo는 KR set에서 복사 (자동)
// JP-only 12개: 하드코딩
const SM: SMEntry[] = [
  // ── KR 발매분 (25개) ── nameKo = KR set.nameKo 자동복사
  { groupId: "og-sm1s",  nameKo: "",  enSetIds: ["en-tcg-sm1"],   jpSetIds: ["jp-tcg-SM1s"],  krSetIds: ["kr-sm1s"]  },
  { groupId: "og-sm1m",  nameKo: "",  enSetIds: [],                jpSetIds: ["jp-tcg-SM1m"],  krSetIds: ["kr-sm1m"]  },
  { groupId: "og-sm1+",  nameKo: "",  enSetIds: [],                jpSetIds: ["jp-tcg-SM1+"],  krSetIds: ["kr-sm1+"]  },
  { groupId: "og-sm2k",  nameKo: "",  enSetIds: ["en-tcg-sm2"],   jpSetIds: ["jp-tcg-SM2K"],  krSetIds: ["kr-sm2k"]  },
  { groupId: "og-sm2l",  nameKo: "",  enSetIds: [],                jpSetIds: ["jp-tcg-SM2L"],  krSetIds: ["kr-sm2l"]  },
  { groupId: "og-sm3h",  nameKo: "",  enSetIds: ["en-tcg-sm3"],   jpSetIds: ["jp-tcg-SM3H"],  krSetIds: ["kr-sm3h"]  },
  { groupId: "og-sm3n",  nameKo: "",  enSetIds: [],                jpSetIds: ["jp-tcg-SM3N"],  krSetIds: ["kr-sm3n"]  },
  { groupId: "og-sm3+",  nameKo: "",  enSetIds: ["en-tcg-sm35"],  jpSetIds: ["jp-tcg-SM3+"],  krSetIds: ["kr-sm3+"]  },
  { groupId: "og-sm4s",  nameKo: "",  enSetIds: ["en-tcg-sm4"],   jpSetIds: ["jp-tcg-SM4S"],  krSetIds: ["kr-sm4s"]  },
  { groupId: "og-sm4a",  nameKo: "",  enSetIds: [],                jpSetIds: ["jp-tcg-SM4A"],  krSetIds: ["kr-sm4a"]  },
  { groupId: "og-sm4+",  nameKo: "",  enSetIds: [],                jpSetIds: ["jp-tcg-SM4+"],  krSetIds: ["kr-sm4+"]  },
  { groupId: "og-sm5s",  nameKo: "",  enSetIds: ["en-tcg-sm5"],   jpSetIds: ["jp-tcg-SM5S"],  krSetIds: ["kr-sm5s"]  },
  { groupId: "og-sm5m",  nameKo: "",  enSetIds: [],                jpSetIds: ["jp-tcg-SM5M"],  krSetIds: ["kr-sm5m"]  },
  { groupId: "og-sm5+",  nameKo: "",  enSetIds: [],                jpSetIds: ["jp-tcg-SM5+"],  krSetIds: ["kr-sm5+"]  },
  { groupId: "og-sm6",   nameKo: "",  enSetIds: ["en-tcg-sm6"],   jpSetIds: ["jp-tcg-SM6"],   krSetIds: ["kr-sm6"]   },
  { groupId: "og-sm7",   nameKo: "",  enSetIds: ["en-tcg-sm7"],   jpSetIds: ["jp-tcg-SM7"],   krSetIds: ["kr-sm7"]   },
  { groupId: "og-sm8",   nameKo: "",  enSetIds: ["en-tcg-sm8"],   jpSetIds: ["jp-tcg-SM8"],   krSetIds: ["kr-sm8"]   },
  { groupId: "og-sm9",   nameKo: "",  enSetIds: ["en-tcg-sm9"],   jpSetIds: ["jp-tcg-SM9"],   krSetIds: ["kr-sm9"]   },
  { groupId: "og-sm10",  nameKo: "",  enSetIds: ["en-tcg-sm10"],  jpSetIds: ["jp-tcg-SM10"],  krSetIds: ["kr-sm10"]  },
  { groupId: "og-sm10b", nameKo: "",  enSetIds: [],                jpSetIds: ["jp-tcg-SM10b"], krSetIds: ["kr-sm10b"] },
  { groupId: "og-sm11a", nameKo: "",  enSetIds: ["en-tcg-sm11"],  jpSetIds: ["jp-tcg-SM11a"], krSetIds: ["kr-sm11a"] },
  { groupId: "og-sm11b", nameKo: "",  enSetIds: [],                jpSetIds: ["jp-tcg-SM11b"], krSetIds: ["kr-sm11b"] },
  { groupId: "og-sm12",  nameKo: "",  enSetIds: ["en-tcg-sm12"],  jpSetIds: ["jp-tcg-SM12"],  krSetIds: ["kr-sm12"]  },
  { groupId: "og-sm12a", nameKo: "",  enSetIds: [],                jpSetIds: ["jp-tcg-SM12a"], krSetIds: ["kr-sm12a"] },
  { groupId: "og-smp2",  nameKo: "",  enSetIds: ["en-tcg-det1"],  jpSetIds: ["jp-tcg-SMP2"],  krSetIds: ["kr-smp2"]  },

  // ── JP-only (12개) ── 음역/직역 하드코딩
  { groupId: "og-sm0",   nameKo: "피카츄와 새로운 친구들",        enSetIds: [], jpSetIds: ["jp-tcg-SM0"],   krSetIds: [] },
  { groupId: "og-sm2+",  nameKo: "새로운 시련에 직면",           enSetIds: [], jpSetIds: ["jp-tcg-sm2+"],  krSetIds: [] },
  { groupId: "og-sm6a",  nameKo: "드래곤 스톰",                  enSetIds: ["en-tcg-sm75"], jpSetIds: ["jp-tcg-SM6a"], krSetIds: [] },
  { groupId: "og-sm6b",  nameKo: "챔피언 로드",                  enSetIds: [], jpSetIds: ["jp-tcg-SM6b"],  krSetIds: [] },
  { groupId: "og-sm7a",  nameKo: "번개 스파크",                  enSetIds: [], jpSetIds: ["jp-tcg-SM7a"],  krSetIds: [] },
  { groupId: "og-sm7b",  nameKo: "페어리 라이즈",                enSetIds: [], jpSetIds: ["jp-tcg-SM7b"],  krSetIds: [] },
  { groupId: "og-sm8a",  nameKo: "다크 오더",                    enSetIds: [], jpSetIds: ["jp-tcg-SM8a"],  krSetIds: [] },
  { groupId: "og-sm8b",  nameKo: "GX 울트라 샤이니",             enSetIds: ["en-tcg-sm115"], jpSetIds: ["jp-tcg-SM8b"], krSetIds: [] },
  { groupId: "og-sm9a",  nameKo: "나이트 유니즌",                enSetIds: [], jpSetIds: ["jp-tcg-SM9a"],  krSetIds: [] },
  { groupId: "og-sm9b",  nameKo: "풀 메탈 월",                   enSetIds: [], jpSetIds: ["jp-tcg-SM9b"],  krSetIds: [] },
  { groupId: "og-sn10a", nameKo: "GG 엔드",                      enSetIds: [], jpSetIds: ["jp-tcg-sn10a"], krSetIds: [] },
  { groupId: "og-sn11",  nameKo: "미라클 트윈",                  enSetIds: [], jpSetIds: ["jp-tcg-sn11"],  krSetIds: [] },
  // EN-only new groups (created by sync-sm-pokemontcgio)
  { groupId: "og-smp",   nameKo: "SM 블랙스타 프로모",            enSetIds: ["en-tcg-smp"],  jpSetIds: [], krSetIds: [] },
  { groupId: "og-sma",   nameKo: "히든 페이츠: 샤이니 볼트",     enSetIds: ["en-tcg-sma"],  jpSetIds: [], krSetIds: [] },
];

async function main() {
  let updated = 0, skipped = 0;

  for (const n of SM) {
    const grp = await prisma.cardPack.findUnique({ where: { id: n.groupId } });
    if (!grp) { console.log(`  ⚠ CardPack ${n.groupId} 없음 — skip`); skipped++; continue; }

    // Determine nameKo: if KR set exists, copy from KR set; else use hardcoded
    let nameKo = n.nameKo;
    if (!nameKo && n.krSetIds.length > 0) {
      const krSet = await prisma.set.findFirst({
        where: { id: { in: n.krSetIds } },
        select: { nameKo: true },
      });
      if (krSet?.nameKo) nameKo = krSet.nameKo;
    }

    if (!nameKo) {
      console.log(`  ⚠ ${n.groupId}: nameKo 결정 불가 — skip`);
      skipped++;
      continue;
    }

    await prisma.cardPack.update({ where: { id: n.groupId }, data: { nameKo } });

    for (const enId of n.enSetIds) {
      await prisma.set.update({ where: { id: enId }, data: { nameKo } }).catch(() => {});
    }
    for (const jpId of n.jpSetIds) {
      await prisma.set.update({ where: { id: jpId }, data: { nameKo } }).catch(() => {});
    }
    for (const krId of n.krSetIds) {
      // KR set nameKo is already set; only update if it was missing
      await prisma.set.update({ where: { id: krId }, data: { nameKo } }).catch(() => {});
    }

    console.log(`  ✓ ${n.groupId}: nameKo="${nameKo}"`);
    updated++;
  }

  console.log(`\n결과: ${updated} 업데이트, ${skipped} 스킵`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
