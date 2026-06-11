/**
 * 시대별 CardPack + Set 공식 한글/일본어명 통합 시드.
 *
 * 기존 13개 시대별 스크립트(seed-{adv,bw,dp,ecard,hgss,l,neo,pcg,pl,pmcg,sm,swsh,xy}-koreanames.ts)를
 * 한 파일로 통합. 실행 시 13개를 순서대로 다 돌린 것과 동일한 DB 결과가 나온다.
 *
 * 시대마다 update 대상·필드가 다르므로 섹션별 로직을 그대로 보존했다:
 *   - PMCG/NEO/ecard/ADV/PCG: CardPack {nameKo,nameJa} + Set {nameKo,nameJa,name=nameJa}
 *     (Set.update 는 catch 없음 — id 없으면 throw 하는 기존 동작 유지)
 *   - L:                     CardPack {nameKo,nameJa} + JP Set {nameKo,nameJa} (catch)
 *   - DP/PL/HGSS/BW:         CardPack {nameKo} + EN/JP Set {nameKo} (catch)
 *   - XY:                    findUnique 가드 + CardPack {nameKo} + EN/JP/KR Set {nameKo} (catch)
 *   - SM/SwSh:               findUnique 가드 + KR set nameKo 자동복사 + CardPack {nameKo} + 전 Set {nameKo} (catch)
 *
 * Run: npx tsx scripts/seed-koreanames.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// ── PMCG ──────────────────────────────────────────────────────────────────
// PMCG1~6 CardPack + Set 의 한글/일본어 공식명 입력.
// (한국 미발매라 raredoc 표준)
const PMCG = [
  { groupId: "og-pmcg1", setId: "jp-tcg-PMCG1", nameKo: "확장팩 제1탄", nameJa: "拡張パック" },
  { groupId: "og-pmcg2", setId: "jp-tcg-PMCG2", nameKo: "확장팩 제2탄 포켓몬 정글", nameJa: "ポケモンジャングル" },
  { groupId: "og-pmcg3", setId: "jp-tcg-PMCG3", nameKo: "확장팩 제3탄 화석의 비밀", nameJa: "化石の秘密" },
  { groupId: "og-pmcg4", setId: "jp-tcg-PMCG4", nameKo: "확장팩 제4탄 로켓단", nameJa: "ロケット団" },
  { groupId: "og-pmcg5", setId: "jp-tcg-PMCG5", nameKo: "짐 확장 제1탄 리더스 스타디움", nameJa: "リーダーズスタジアム" },
  { groupId: "og-pmcg6", setId: "jp-tcg-PMCG6", nameKo: "짐 확장 제2탄 어둠에서의 도전", nameJa: "闇からの挑戦" },
];

// ── NEO ───────────────────────────────────────────────────────────────────
// NEO1~4 CardPack + Set 의 한글/일본어 공식명 입력.
const NEO = [
  { groupId: "og-neo1", setId: "jp-tcg-neo1", nameKo: "금, 은 신세계로", nameJa: "金、銀、新世界へ..." },
  { groupId: "og-neo2", setId: "jp-tcg-neo2", nameKo: "유적을 넘어서", nameJa: "遺跡をこえて..." },
  { groupId: "og-neo3", setId: "jp-tcg-neo3", nameKo: "각성하는 전설", nameJa: "めざめる伝説" },
  { groupId: "og-neo4", setId: "jp-tcg-neo4", nameKo: "어둠, 그리고 빛으로", nameJa: "闇、そして光へ..." },
];

// ── ECARD ─────────────────────────────────────────────────────────────────
// E1~5 + VS1 + web1 (e-Card era + 그 전후, 2001~2002) CardPack + Set 한글/일본어 공식명 입력.
const ECARD = [
  { groupId: "og-e1",   setId: "jp-tcg-E1",   nameKo: "기본 확장팩",     nameJa: "基本拡張パック" },
  { groupId: "og-e2",   setId: "jp-tcg-E2",   nameKo: "지도에 없는 마을", nameJa: "地図にない町" },
  { groupId: "og-e3",   setId: "jp-tcg-E3",   nameKo: "바다에서의 바람", nameJa: "海からの風" },
  { groupId: "og-e4",   setId: "jp-tcg-E4",   nameKo: "갈라진 대지",     nameJa: "裂けた大地" },
  { groupId: "og-e5",   setId: "jp-tcg-E5",   nameKo: "신비한 산",       nameJa: "神秘なる山" },
  { groupId: "og-vs1",  setId: "jp-tcg-VS1",  nameKo: "포켓몬카드 VS",   nameJa: "ポケモンカード★VS" },
  { groupId: "og-web1", setId: "jp-tcg-web1", nameKo: "포켓몬카드 web",  nameJa: "ポケモンカード★web" },
];

// ── ADV ───────────────────────────────────────────────────────────────────
// ADV1~5 (2003) CardPack + Set 한글/일본어 공식명 입력.
const ADV = [
  { groupId: "og-adv1", setId: "jp-tcg-ADV1", nameKo: "ADV 확장팩",                      nameJa: "拡張パック" },
  { groupId: "og-adv2", setId: "jp-tcg-ADV2", nameKo: "사막의 기적",                      nameJa: "砂漠のきせき" },
  { groupId: "og-adv3", setId: "jp-tcg-ADV3", nameKo: "천공의 패자",                      nameJa: "天空の覇者" },
  { groupId: "og-adv4", setId: "jp-tcg-ADV4", nameKo: "마그마 VS 아쿠아 두 개의 야망",   nameJa: "強化拡張パックex1マグマVSアクア ふたつの野望" },
  { groupId: "og-adv5", setId: "jp-tcg-ADV5", nameKo: "풀린 봉인",                        nameJa: "とかれた封印" },
];

// ── PCG ───────────────────────────────────────────────────────────────────
// PCG1~9 (2004~2006) CardPack + Set 한글/일본어 공식명 입력.
const PCG = [
  { groupId: "og-pcg1", setId: "jp-tcg-PCG1", nameKo: "전설의 비상",      nameJa: "伝説の飛翔" },
  { groupId: "og-pcg2", setId: "jp-tcg-PCG2", nameKo: "창공의 격돌",      nameJa: "蒼空の激突" },
  { groupId: "og-pcg3", setId: "jp-tcg-PCG3", nameKo: "로켓단의 역습",    nameJa: "ロケット団の逆襲" },
  { groupId: "og-pcg4", setId: "jp-tcg-PCG4", nameKo: "금빛 하늘, 은빛 바다", nameJa: "金の空、銀の海" },
  { groupId: "og-pcg5", setId: "jp-tcg-PCG5", nameKo: "환상의 숲",        nameJa: "まぼろしの森" },
  { groupId: "og-pcg6", setId: "jp-tcg-PCG6", nameKo: "호론의 연구탑",    nameJa: "ホロンの研究塔" },
  { groupId: "og-pcg7", setId: "jp-tcg-PCG7", nameKo: "호론의 환영",      nameJa: "ホロンの幻影" },
  { groupId: "og-pcg8", setId: "jp-tcg-PCG8", nameKo: "기적의 결정",      nameJa: "きせきの結晶" },
  { groupId: "og-pcg9", setId: "jp-tcg-PCG9", nameKo: "끝없는 공방",      nameJa: "さいはての攻防" },
];

// ── DP ────────────────────────────────────────────────────────────────────
// DP1~7 CardPack + Set 의 한글명 입력.
const DP = [
  { groupId: "og-dp1", enSetId: "en-tcg-dp1", jpSetId: "jp-tcg-dp1", nameKo: "다이아몬드 & 펄" },
  { groupId: "og-dp2", enSetId: "en-tcg-dp2", jpSetId: "jp-tcg-dp2", nameKo: "신비한 보물" },
  { groupId: "og-dp3", enSetId: "en-tcg-dp3", jpSetId: "jp-tcg-dp3", nameKo: "비밀의 경이" },
  { groupId: "og-dp4", enSetId: "en-tcg-dp4", jpSetId: "jp-tcg-dp4", nameKo: "위대한 만남" },
  { groupId: "og-dp5", enSetId: "en-tcg-dp5", jpSetId: "jp-tcg-dp5", nameKo: "장엄한 새벽" },
  { groupId: "og-dp6", enSetId: "en-tcg-dp6", jpSetId: "jp-tcg-dp6", nameKo: "각성한 전설" },
  { groupId: "og-dp7", enSetId: "en-tcg-dp7", jpSetId: "jp-tcg-dp7", nameKo: "폭풍전선" },
];

// ── PL ────────────────────────────────────────────────────────────────────
// PL1~4 CardPack + Set 의 한글명 입력.
const PL = [
  { groupId: "og-pl1", enSetId: "en-tcg-pl1", jpSetId: "jp-tcg-pl1", nameKo: "플래티넘" },
  { groupId: "og-pl2", enSetId: "en-tcg-pl2", jpSetId: "jp-tcg-pl2", nameKo: "라이벌의 등장" },
  { groupId: "og-pl3", enSetId: "en-tcg-pl3", jpSetId: "jp-tcg-pl3", nameKo: "최고의 승자" },
  { groupId: "og-pl4", enSetId: "en-tcg-pl4", jpSetId: "jp-tcg-pl4", nameKo: "아르세우스" },
];

// ── L ─────────────────────────────────────────────────────────────────────
// L (HGSS era JP) CardPack + Set 의 한글명/일본명 입력.
const L_SETS = [
  { groupId: "og-l1a", jpSetId: "jp-tcg-L1a", nameKo: "하트골드 컬렉션",   nameJa: "ハートゴールドコレクション" },
  { groupId: "og-l1b", jpSetId: "jp-tcg-L1b", nameKo: "소울실버 컬렉션",   nameJa: "ソウルシルバーコレクション" },
  { groupId: "og-l2",  jpSetId: "jp-tcg-L2",  nameKo: "되살아나는 전설",   nameJa: "よみがえる伝説" },
  { groupId: "og-ll",  jpSetId: "jp-tcg-LL",  nameKo: "강화팩 로스트링크", nameJa: "強化パック ロストリンク" },
  { groupId: "og-l3",  jpSetId: "jp-tcg-L3",  nameKo: "정상대격돌",        nameJa: "頂上大激突" },
];

// ── HGSS ──────────────────────────────────────────────────────────────────
// HGSS CardPack + EN/JP Set 의 한글명 입력.
const HGSS = [
  { groupId: "og-hgss1", enSetId: "en-tcg-hgss1", jpSetId: "jp-tcg-hgss1", nameKo: "하트골드 & 소울실버" },
  { groupId: "og-hsp",   enSetId: "en-tcg-hsp",   jpSetId: "jp-tcg-hsp",   nameKo: "HGSS 블랙스타 프로모" },
  { groupId: "og-hgss2", enSetId: "en-tcg-hgss2", jpSetId: "jp-tcg-hgss2", nameKo: "HS 언리시드" },
  { groupId: "og-hgss3", enSetId: "en-tcg-hgss3", jpSetId: "jp-tcg-hgss3", nameKo: "HS 언도티드" },
  { groupId: "og-hgss4", enSetId: "en-tcg-hgss4", jpSetId: "jp-tcg-hgss4", nameKo: "HS 트라이엄펀트" },
  { groupId: "og-col1",  enSetId: "en-tcg-col1",  jpSetId: "jp-tcg-col1",  nameKo: "전설의 부름" },
];

// ── BW ────────────────────────────────────────────────────────────────────
// BW CardPack + EN Set + JP Set 의 한글명 입력.
const BW = [
  { groupId: "og-bwp",  enSetId: "en-tcg-bwp",  jpSetId: "jp-tcg-bwp",  nameKo: "BW 블랙스타 프로모" },
  { groupId: "og-bw1",  enSetId: "en-tcg-bw1",  jpSetId: "jp-tcg-bw1",  nameKo: "블랙 & 화이트" },
  { groupId: "og-bw2",  enSetId: "en-tcg-bw2",  jpSetId: "jp-tcg-bw2",  nameKo: "떠오르는 힘" },
  { groupId: "og-bw3",  enSetId: "en-tcg-bw3",  jpSetId: "jp-tcg-bw3",  nameKo: "고결한 승리" },
  { groupId: "og-bw4",  enSetId: "en-tcg-bw4",  jpSetId: "jp-tcg-bw4",  nameKo: "다음 운명" },
  { groupId: "og-bw5",  enSetId: "en-tcg-bw5",  jpSetId: "jp-tcg-bw5",  nameKo: "다크 익스플로러" },
  { groupId: "og-bw6",  enSetId: "en-tcg-bw6",  jpSetId: "jp-tcg-bw6",  nameKo: "위대한 용" },
  { groupId: "og-dv1",  enSetId: "en-tcg-dv1",  jpSetId: "jp-tcg-dv1",  nameKo: "드래곤 볼트" },
  { groupId: "og-bw7",  enSetId: "en-tcg-bw7",  jpSetId: "jp-tcg-bw7",  nameKo: "경계 너머" },
  { groupId: "og-bw8",  enSetId: "en-tcg-bw8",  jpSetId: "jp-tcg-bw8",  nameKo: "플라즈마 스톰" },
  { groupId: "og-bw9",  enSetId: "en-tcg-bw9",  jpSetId: "jp-tcg-bw9",  nameKo: "플라즈마 프리즈" },
  { groupId: "og-bw10", enSetId: "en-tcg-bw10", jpSetId: "jp-tcg-bw10", nameKo: "플라즈마 블래스트" },
  { groupId: "og-bw11", enSetId: "en-tcg-bw11", jpSetId: "jp-tcg-bw11", nameKo: "전설의 보물" },
];

// ── XY ────────────────────────────────────────────────────────────────────
// XY era CardPack + EN Set + JP Set + KR Set 의 한글명 입력.
const XY: { groupId: string; nameKo: string; enSetIds: string[]; jpSetIds: string[]; krSetIds: string[] }[] = [
  // JP-only (no EN counterpart in same group)
  { groupId: "og-xy1a",  nameKo: "콜렉션 X",                         enSetIds: ["en-tcg-xy1"],  jpSetIds: ["jp-tcg-XY1a"], krSetIds: ["kr-xy1"] },
  { groupId: "og-xy1b",  nameKo: "콜렉션 Y",                         enSetIds: [],             jpSetIds: ["jp-tcg-XY1b"], krSetIds: [] },
  { groupId: "og-xy2",   nameKo: "와일드 블레이즈",                    enSetIds: ["en-tcg-xy2"],  jpSetIds: ["jp-tcg-XY2"],  krSetIds: ["kr-xy2"] },
  { groupId: "og-xy3",   nameKo: "라이징 피스트",                      enSetIds: ["en-tcg-xy3"],  jpSetIds: ["jp-tcg-XY3"],  krSetIds: ["kr-xy3"] },
  { groupId: "og-xy4",   nameKo: "팬텀 게이트",                        enSetIds: ["en-tcg-xy4"],  jpSetIds: ["jp-tcg-XY4"],  krSetIds: ["kr-xy4"] },
  { groupId: "og-xy5a",  nameKo: "타이달 스톰",                        enSetIds: ["en-tcg-xy5"],  jpSetIds: ["jp-tcg-XY5a"], krSetIds: ["kr-xy5"] },
  { groupId: "og-cp1",   nameKo: "마그마단 VS 아쿠아단 더블 크라이시스", enSetIds: ["en-tcg-dc1"],  jpSetIds: ["jp-tcg-CP1"],  krSetIds: ["kr-cp1"] },
  { groupId: "og-xy6",   nameKo: "에메랄드 브레이크",                   enSetIds: ["en-tcg-xy6"],  jpSetIds: ["jp-tcg-XY6"],  krSetIds: [] },
  { groupId: "og-xy7",   nameKo: "반딧 링",                            enSetIds: ["en-tcg-xy7"],  jpSetIds: ["jp-tcg-XY7"],  krSetIds: ["kr-xy7"] },
  { groupId: "og-cp2",   nameKo: "전설 키라 컬렉션",                    enSetIds: [],             jpSetIds: ["jp-tcg-CP2"],  krSetIds: ["kr-cp2"] },
  { groupId: "og-xy8a",  nameKo: "붉은 섬광",                          enSetIds: ["en-tcg-xy8"],  jpSetIds: ["jp-tcg-XY8a"], krSetIds: ["kr-xy8"] },
  { groupId: "og-xy8b",  nameKo: "푸른 충격",                          enSetIds: [],             jpSetIds: ["jp-tcg-XY8b"], krSetIds: [] },
  { groupId: "og-xy9",   nameKo: "파천의 분노",                         enSetIds: ["en-tcg-xy9"],  jpSetIds: ["jp-tcg-XY9"],  krSetIds: ["kr-xy9"] },
  { groupId: "og-cp3",   nameKo: "포케쿈 컬렉션",                       enSetIds: [],             jpSetIds: ["jp-tcg-CP3"],  krSetIds: ["kr-cp3"] },
  { groupId: "og-xy10",  nameKo: "각성하는 초왕",                       enSetIds: ["en-tcg-xy10"], jpSetIds: ["jp-tcg-XY10"], krSetIds: ["kr-xy10"] },
  { groupId: "og-cp4",   nameKo: "프리미엄 챔피언팩 EX×M×BREAK",        enSetIds: [],             jpSetIds: ["jp-tcg-CP4"],  krSetIds: ["kr-cp4"] },
  { groupId: "og-xy11a", nameKo: "냉혹한 반역자",                       enSetIds: ["en-tcg-xy11"], jpSetIds: ["jp-tcg-XY11a"],krSetIds: ["kr-xy11"] },
  { groupId: "og-cp5",   nameKo: "냉혹한 반역자",                       enSetIds: [],             jpSetIds: ["jp-tcg-CP5"],  krSetIds: ["kr-cp5"] },
  { groupId: "og-cp6",   nameKo: "확장팩 20주년 기념",                   enSetIds: ["en-tcg-xy12"], jpSetIds: ["jp-tcg-CP6"],  krSetIds: [] },
  // New EN-only groups (created by sync-xy-pokemontcgio)
  { groupId: "og-xyp",   nameKo: "XY 블랙스타 프로모",                  enSetIds: ["en-tcg-xyp"],  jpSetIds: [],              krSetIds: [] },
  { groupId: "og-xy0",   nameKo: "Kalos 스타터 세트",                   enSetIds: ["en-tcg-xy0"],  jpSetIds: [],              krSetIds: [] },
  { groupId: "og-g1",    nameKo: "제너레이션즈",                        enSetIds: ["en-tcg-g1"],   jpSetIds: [],              krSetIds: [] },
];

// ── SM ────────────────────────────────────────────────────────────────────
// SM era CardPack + Set 한글명 입력.
//   - KR set 있는 25개: KR set.nameKo → CardPack.nameKo 복사 (자동)
//   - JP-only 12개 + EN-only 2개: 음역/직역 하드코딩
interface SMSwShEntry {
  groupId: string;
  nameKo: string;
  enSetIds: string[];
  jpSetIds: string[];
  krSetIds: string[];
}

const SM: SMSwShEntry[] = [
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

// ── SWSH ──────────────────────────────────────────────────────────────────
// SwSh era CardPack + Set 한글명 입력.
//   - KR set 있는 그룹: KR set.nameKo → CardPack.nameKo 복사 (자동)
//   - JP-only / EN-only: 음역/직역 하드코딩
const SWSH: SMSwShEntry[] = [
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

/**
 * 공유 헬퍼: ADV/NEO/ECARD/PCG/PMCG 처럼
 * CardPack {nameKo,nameJa} + Set {nameKo,nameJa,name=nameJa} 를 입력한다.
 * 원본대로 Set.update 는 catch 없음 — id 없으면 throw.
 */
async function seedSetWithName(
  era: string,
  rows: { groupId: string; setId: string; nameKo: string; nameJa: string }[],
) {
  console.log(`\n── ${era} ──`);
  for (const s of rows) {
    const sg = await prisma.cardPack.update({
      where: { id: s.groupId },
      data: { nameKo: s.nameKo, nameJa: s.nameJa },
    });
    const st = await prisma.set.update({
      where: { id: s.setId },
      data: { nameKo: s.nameKo, nameJa: s.nameJa, name: s.nameJa },
    });
    console.log(`✓ ${s.groupId}: SG="${sg.nameKo}" / Set="${st.nameKo}"`);
  }
}

/**
 * 공유 헬퍼: DP/PL/HGSS/BW 처럼
 * CardPack {nameKo} (nameJa 없음) + EN/JP Set {nameKo} (둘 다 catch).
 */
async function seedEnJpNameKo(
  era: string,
  rows: { groupId: string; enSetId: string; jpSetId: string; nameKo: string }[],
) {
  console.log(`\n── ${era} ──`);
  for (const n of rows) {
    const sg = await prisma.cardPack.update({
      where: { id: n.groupId },
      data: { nameKo: n.nameKo },
    });
    await prisma.set.update({ where: { id: n.enSetId }, data: { nameKo: n.nameKo } })
      .catch(() => { /* EN set may not exist yet */ });
    await prisma.set.update({ where: { id: n.jpSetId }, data: { nameKo: n.nameKo } })
      .catch(() => { /* JP set may not exist yet */ });
    console.log(`✓ ${n.groupId}: nameKo="${sg.nameKo}"`);
  }
}

/**
 * 공유 헬퍼: SM/SwSh 처럼
 * findUnique 가드 + (KR set nameKo 자동복사) + CardPack {nameKo} + 전 Set {nameKo} (catch).
 */
async function seedSmSwShEra(era: string, rows: SMSwShEntry[]) {
  console.log(`\n── ${era} ──`);
  let updated = 0, skipped = 0;

  for (const n of rows) {
    const grp = await prisma.cardPack.findUnique({ where: { id: n.groupId } });
    if (!grp) { console.log(`  ⚠ CardPack ${n.groupId} 없음 — skip`); skipped++; continue; }

    // Determine nameKo: if KR set exists, copy from KR set; else use hardcoded
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

    await prisma.cardPack.update({ where: { id: n.groupId }, data: { nameKo } });

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

  console.log(`결과: ${updated} 업데이트, ${skipped} 스킵`);
}

async function main() {
  // 시대순. 각 시대의 id 집합은 서로 겹치지 않으므로 순서대로 실행하면
  // 기존 13개 스크립트를 각각 돌린 것과 동일한 DB 결과가 된다.

  // CardPack {nameKo,nameJa} + Set {nameKo,nameJa,name=nameJa} (Set.update catch 없음)
  await seedSetWithName("PMCG", PMCG);
  await seedSetWithName("NEO", NEO);
  await seedSetWithName("ECARD", ECARD);
  await seedSetWithName("ADV", ADV);
  await seedSetWithName("PCG", PCG);

  // DP/PL: CardPack {nameKo} + EN/JP Set {nameKo} (catch)
  await seedEnJpNameKo("DP", DP);
  await seedEnJpNameKo("PL", PL);

  // L: CardPack {nameKo,nameJa} + JP Set {nameKo,nameJa} (catch)
  console.log("\n── L ──");
  for (const n of L_SETS) {
    const sg = await prisma.cardPack.update({
      where: { id: n.groupId },
      data: { nameKo: n.nameKo, nameJa: n.nameJa },
    });
    await prisma.set.update({
      where: { id: n.jpSetId },
      data: { nameKo: n.nameKo, nameJa: n.nameJa },
    }).catch(() => { /* skip if not found */ });
    console.log(`✓ ${n.groupId}: nameKo="${sg.nameKo}" nameJa="${n.nameJa}"`);
  }

  // HGSS/BW: CardPack {nameKo} + EN/JP Set {nameKo} (catch)
  await seedEnJpNameKo("HGSS", HGSS);
  await seedEnJpNameKo("BW", BW);

  // XY: findUnique 가드 + CardPack {nameKo} + EN/JP/KR Set {nameKo} (catch)
  console.log("\n── XY ──");
  {
    let updated = 0, skipped = 0;
    for (const n of XY) {
      const grp = await prisma.cardPack.findUnique({ where: { id: n.groupId } });
      if (!grp) { console.log(`  ⚠ CardPack ${n.groupId} 없음 — skip`); skipped++; continue; }
      await prisma.cardPack.update({ where: { id: n.groupId }, data: { nameKo: n.nameKo } });

      for (const enId of n.enSetIds) {
        await prisma.set.update({ where: { id: enId }, data: { nameKo: n.nameKo } }).catch(() => {/* set may not exist yet */});
      }
      for (const jpId of n.jpSetIds) {
        await prisma.set.update({ where: { id: jpId }, data: { nameKo: n.nameKo } }).catch(() => {});
      }
      for (const krId of n.krSetIds) {
        await prisma.set.update({ where: { id: krId }, data: { nameKo: n.nameKo } }).catch(() => {});
      }

      console.log(`  ✓ ${n.groupId}: nameKo="${n.nameKo}"`);
      updated++;
    }
    console.log(`결과: ${updated} 업데이트, ${skipped} 스킵`);
  }

  // SM/SwSh: findUnique 가드 + KR set nameKo 자동복사 + CardPack {nameKo} + 전 Set {nameKo} (catch)
  await seedSmSwShEra("SM", SM);
  await seedSmSwShEra("SWSH", SWSH);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
