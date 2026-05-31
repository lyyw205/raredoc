/**
 * SwSh era SetGroup + Set 한글명 입력.
 *
 * - KR set 있는 그룹: KR set.nameKo → SetGroup.nameKo 복사 (자동)
 * - JP-only / EN-only: 음역/직역 하드코딩
 *
 * Run: npx tsx scripts/seed-swsh-koreanames.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

interface Entry {
  groupId: string;
  nameKo: string;       // 하드코딩 (KR set 있으면 자동으로 덮어씀)
  enSetIds: string[];
  jpSetIds: string[];
  krSetIds: string[];
}

const SWSH: Entry[] = [
  // ── KR 발매분 ── nameKo는 KR set에서 자동복사 (nameKo="" 로 두면 KR set 참조)
  { groupId: "og-s1w",  nameKo: "소드",           enSetIds: ["en-tcg-swsh1"],      jpSetIds: ["jp-tcg-S1W"],  krSetIds: ["kr-s1w"]  },
  { groupId: "og-s1h",  nameKo: "실드",           enSetIds: [],                     jpSetIds: ["jp-tcg-S1H"],  krSetIds: ["kr-s1h"]  },
  { groupId: "og-s1a",  nameKo: "VMAX 라이징",    enSetIds: [],                     jpSetIds: ["jp-tcg-S1a"],  krSetIds: ["kr-s1a"]  },
  { groupId: "og-s2",   nameKo: "반역 클래시",    enSetIds: ["en-tcg-swsh2"],      jpSetIds: ["jp-tcg-S2"],   krSetIds: ["kr-s2"]   },
  { groupId: "og-s2a",  nameKo: "폭염 워커",      enSetIds: ["en-tcg-swsh3"],      jpSetIds: ["jp-tcg-S2a"],  krSetIds: ["kr-s2a"]  },
  { groupId: "og-s3",   nameKo: "무한 존",        enSetIds: [],                     jpSetIds: ["jp-tcg-S3"],   krSetIds: ["kr-s3"]   },
  { groupId: "og-s3a",  nameKo: "전설의 고동",    enSetIds: ["en-tcg-swsh4"],      jpSetIds: ["jp-tcg-S3a"],  krSetIds: ["kr-s3a"]  },
  { groupId: "og-s4",   nameKo: "경천의 볼테커",  enSetIds: [],                     jpSetIds: ["jp-tcg-S4"],   krSetIds: ["kr-s4"]   },
  { groupId: "og-s4a",  nameKo: "샤이니 스타 V",  enSetIds: ["en-tcg-swsh45"],     jpSetIds: ["jp-tcg-S4a"],  krSetIds: ["kr-s4a"]  },
  { groupId: "og-s5i",  nameKo: "일격 마스터",    enSetIds: ["en-tcg-swsh5"],      jpSetIds: ["jp-tcg-S5I"],  krSetIds: ["kr-s5i"]  },
  { groupId: "og-s5r",  nameKo: "연격 마스터",    enSetIds: [],                     jpSetIds: ["jp-tcg-S5R"],  krSetIds: ["kr-s5r"]  },
  { groupId: "og-s5a",  nameKo: "쌍벽의 파이터",  enSetIds: [],                     jpSetIds: ["jp-tcg-S5a"],  krSetIds: ["kr-s5a"]  },
  { groupId: "og-s6k",  nameKo: "칠흑의 가이스트",enSetIds: ["en-tcg-swsh6"],      jpSetIds: ["jp-tcg-S6K"],  krSetIds: ["kr-s6k"]  },
  { groupId: "og-s6h",  nameKo: "백은의 랜스",    enSetIds: [],                     jpSetIds: ["jp-tcg-S6H"],  krSetIds: ["kr-s6h"]  },
  { groupId: "og-s6a",  nameKo: "이브이 히어로즈",enSetIds: [],                     jpSetIds: ["jp-tcg-S6a"],  krSetIds: ["kr-s6a"]  },
  { groupId: "og-s7r",  nameKo: "창공 스트림",    enSetIds: ["en-tcg-swsh7"],      jpSetIds: ["jp-tcg-S7R"],  krSetIds: ["kr-s7r"]  },
  { groupId: "og-s7d",  nameKo: "마천 퍼펙트",    enSetIds: [],                     jpSetIds: ["jp-tcg-S7D"],  krSetIds: ["kr-s7d"]  },
  { groupId: "og-s8",   nameKo: "퓨전 아츠",      enSetIds: ["en-tcg-swsh8"],      jpSetIds: ["jp-tcg-S8"],   krSetIds: ["kr-s8"]   },
  { groupId: "og-s8a",  nameKo: "25th 애니버서리 컬렉션", enSetIds: ["en-tcg-cel25"], jpSetIds: ["jp-tcg-S8a"], krSetIds: ["kr-s8a"] },
  { groupId: "og-s8b",  nameKo: "VMAX 클라이맥스",enSetIds: [],                     jpSetIds: ["jp-tcg-S8b"],  krSetIds: ["kr-s8b"]  },
  { groupId: "og-s9",   nameKo: "스타버스",       enSetIds: ["en-tcg-swsh9"],      jpSetIds: ["jp-tcg-S9"],   krSetIds: ["kr-s9"]   },
  { groupId: "og-s9a",  nameKo: "배틀 리전",      enSetIds: [],                     jpSetIds: ["jp-tcg-S9a"],  krSetIds: ["kr-s9a"]  },
  { groupId: "og-s10b", nameKo: "Pokémon GO",     enSetIds: ["en-tcg-pgo"],        jpSetIds: ["jp-tcg-S10b"], krSetIds: ["kr-s10b"] },
  { groupId: "og-s10d", nameKo: "타임게이저",     enSetIds: ["en-tcg-swsh10"],     jpSetIds: ["jp-tcg-S10D"], krSetIds: ["kr-s10d"] },
  { groupId: "og-s10p", nameKo: "스페이스저글러", enSetIds: [],                     jpSetIds: ["jp-tcg-S10P"], krSetIds: ["kr-s10p"] },
  { groupId: "og-s10a", nameKo: "다크 판타즈마",  enSetIds: ["en-tcg-swsh11"],     jpSetIds: ["jp-tcg-S10a"], krSetIds: ["kr-s10a"] },
  { groupId: "og-s11a", nameKo: "백열의 아르카나",enSetIds: ["en-tcg-swsh12"],     jpSetIds: ["jp-tcg-S11a"], krSetIds: ["kr-s11a"] },
  { groupId: "og-s12",  nameKo: "패러다임 트리거",enSetIds: [],                     jpSetIds: ["jp-tcg-S12"],  krSetIds: ["kr-s12"]  },
  { groupId: "og-s12a", nameKo: "VSTAR 유니버스", enSetIds: ["en-tcg-swsh12pt5"],  jpSetIds: ["jp-tcg-S12a"], krSetIds: ["kr-s12a"] },

  // ── EN-only 신규 SetGroups ──
  { groupId: "og-swshp",       nameKo: "SWSH 블랙스타 프로모",            enSetIds: ["en-tcg-swshp"],       jpSetIds: [], krSetIds: [] },
  { groupId: "og-swsh35",      nameKo: "챔피언즈 패스",                   enSetIds: ["en-tcg-swsh35"],      jpSetIds: [], krSetIds: [] },
  { groupId: "og-swsh45sv",    nameKo: "샤이닝 페이츠: 샤이니 볼트",      enSetIds: ["en-tcg-swsh45sv"],    jpSetIds: [], krSetIds: [] },
  { groupId: "og-cel25c",      nameKo: "셀레브레이션: 클래식 컬렉션",     enSetIds: ["en-tcg-cel25c"],      jpSetIds: [], krSetIds: [] },
  { groupId: "og-swsh9tg",     nameKo: "브릴리언트 스타즈 트레이너 갤러리",enSetIds: ["en-tcg-swsh9tg"],     jpSetIds: [], krSetIds: [] },
  { groupId: "og-swsh10tg",    nameKo: "아스트럴 래디언스 트레이너 갤러리",enSetIds: ["en-tcg-swsh10tg"],    jpSetIds: [], krSetIds: [] },
  { groupId: "og-swsh11tg",    nameKo: "로스트 오리진 트레이너 갤러리",   enSetIds: ["en-tcg-swsh11tg"],    jpSetIds: [], krSetIds: [] },
  { groupId: "og-swsh12tg",    nameKo: "실버 템페스트 트레이너 갤러리",   enSetIds: ["en-tcg-swsh12tg"],    jpSetIds: [], krSetIds: [] },
  { groupId: "og-swsh12pt5gg", nameKo: "크라운 제니스 갈라리안 갤러리",   enSetIds: ["en-tcg-swsh12pt5gg"], jpSetIds: [], krSetIds: [] },
];

async function main() {
  let updated = 0, skipped = 0;

  for (const n of SWSH) {
    const grp = await prisma.setGroup.findUnique({ where: { id: n.groupId } });
    if (!grp) { console.log(`  ⚠ SetGroup ${n.groupId} 없음 — skip`); skipped++; continue; }

    // Determine nameKo: KR set first, then hardcoded
    let nameKo = n.nameKo;
    if (n.krSetIds.length > 0) {
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

    await prisma.setGroup.update({ where: { id: n.groupId }, data: { nameKo } });

    for (const enId of n.enSetIds) {
      await prisma.set.update({ where: { id: enId }, data: { nameKo } }).catch(() => {});
    }
    for (const jpId of n.jpSetIds) {
      await prisma.set.update({ where: { id: jpId }, data: { nameKo } }).catch(() => {});
    }
    for (const krId of n.krSetIds) {
      await prisma.set.update({ where: { id: krId }, data: { nameKo } }).catch(() => {});
    }

    console.log(`  ✓ ${n.groupId}: nameKo="${nameKo}"`);
    updated++;
  }

  console.log(`\n결과: ${updated} 업데이트, ${skipped} 스킵`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
