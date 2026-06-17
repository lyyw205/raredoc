/**
 * KR 분할세트를 pokemoncard.co.kr 공식 데이터로 재구축. (번호가 JP와 달라도 OK — 카드 정체성으로 매핑)
 *
 * 사용자 방침: "한국판은 공식 데이터로 넣고, 매핑 번호는 달라도 됨 — 데이터는 각 언어 버전에 맞게,
 *   매핑은 카드 정체성(일러/도감)으로 신경 써서" (sv-base 식). KR 공식 번호는 JP 와 스왑/증감 가능.
 *
 * 매칭(official KR → JP 앵커 Card):
 *   - 포켓몬: koName→dex(PokeAPI ko) 버킷 + 일러스트레이터 → 동일 dex 내 일러/번호순 페어
 *   - 트레이너: 일러스트레이터 버킷 → 번호순 페어
 *   - 에너지/잔여: 번호 근접 폴백
 * 적용: 기존 KR locale(참조 0 확인) 통삭제 후 official 로 재생성, 각자 JP 앵커 LC 에 연결. LC.nameKo 갱신.
 *
 * 실행: npx tsx scripts/apply-kr-official.ts [--set=kr-sv2p] [--apply]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readFileSync } from "node:fs";
import { resolveCardDexes } from "./lib/pokeapi-names";
import { TR_JA2KO } from "./lib/trainer-names-jako";
import { POKE, isPokemonSupertype } from "./lib/supertype";
import { normLower as norm } from "./lib/text-norm";
const DIR = "data/kr-official";
// maxNum: 번호 상한(이하만 처리). 샤이니 헤비 팩에서 base 섹션만 먼저 매핑할 때(샤이니 중복 회피).
const CFG: Record<string, { jp: string; json: string; maxNum?: number }> = {
  "kr-sv2p": { jp: "jp-tcg-SV2P", json: `${DIR}/kr-official-sv2p.json` },
  // ── XY (정석 재수집, 배치12) ──
  "kr-xy1": { jp: "jp-tcg-XY1a", json: `${DIR}/kr-official-xy1.json` },   // 콜렉션X
  "kr-xy1b": { jp: "jp-tcg-XY1b", json: `${DIR}/kr-official-xy1b.json` }, // 콜렉션Y(신설)
  "kr-xy2": { jp: "jp-tcg-XY2", json: `${DIR}/kr-official-xy2.json` },    // 와일드 블레이즈
  "kr-xy3": { jp: "jp-tcg-XY3", json: `${DIR}/kr-official-xy3.json` },    // 라이징 피스트
  "kr-xy4": { jp: "jp-tcg-XY4", json: `${DIR}/kr-official-xy4.json` },    // 팬텀 게이트
  "kr-xy5g": { jp: "jp-tcg-XY5", json: `${DIR}/kr-official-xy5g.json` },  // 가이아 볼케이노(신설)
  "kr-xy5": { jp: "jp-tcg-XY5a", json: `${DIR}/kr-official-xy5.json` },   // 타이달 스톰
  "kr-xy6": { jp: "jp-tcg-XY6", json: `${DIR}/kr-official-xy6.json` },     // 에메랄드 브레이크
  "kr-xy7": { jp: "jp-tcg-XY7", json: `${DIR}/kr-official-xy7.json` },     // 밴디트링
  "kr-xy8": { jp: "jp-tcg-XY8a", json: `${DIR}/kr-official-xy8.json` },    // 푸른 충격(=青い衝撃=XY8a)
  "kr-xy8b": { jp: "jp-tcg-XY8b", json: `${DIR}/kr-official-xy8b.json` },  // 붉은 섬광(=赤い閃光=XY8b, 신설)
  "kr-xy9": { jp: "jp-tcg-XY9", json: `${DIR}/kr-official-xy9.json` },     // 천공의 분노
  "kr-xy10": { jp: "jp-tcg-XY10", json: `${DIR}/kr-official-xy10.json` },  // 초능력의 제왕
  "kr-xy11": { jp: "jp-tcg-XY11b", json: `${DIR}/kr-official-xy11.json` }, // 타오르는 투사(=爆熱の闘士=XY11b)
  "kr-xy11r": { jp: "jp-tcg-XY11a", json: `${DIR}/kr-official-xy11r.json` }, // 냉혹한 반역자(=冷酷の反逆者=XY11a, 신설)
  "kr-bgr": { jp: "jp-tcg-bw4", json: `${DIR}/kr-official-bgr.json` },    // 다크러시
  "kr-dc": { jp: "jp-tcg-DC", json: `${DIR}/kr-official-dc.json` },       // 드래곤 컬렉션
  "kr-bw1b": { jp: "jp-tcg-BW1B", json: `${DIR}/kr-official-bw1b.json` }, // 블랙 컬렉션(신설)
  "kr-bw1": { jp: "jp-tcg-BW1W", json: `${DIR}/kr-official-bw1.json` },   // 화이트 컬렉션
  "kr-bw2": { jp: "jp-tcg-bw2", json: `${DIR}/kr-official-bw2.json` },    // 레드 컬렉션
  "kr-bw5": { jp: "jp-tcg-BW5B", json: `${DIR}/kr-official-bw5.json` },   // 드래곤 블라스트(=リューズブラスト, KR 53 > JP 50: SR 3 tail)
  "kr-bw5d": { jp: "jp-tcg-BW5D", json: `${DIR}/kr-official-bw5d.json` }, // 드래곤 블레이드(=リューノブレード, 신설)
  "kr-bw6": { jp: "jp-tcg-BW6F", json: `${DIR}/kr-official-bw6.json` },   // 프리즈볼트(KR 63 > JP 59: SR tail)
  "kr-bw6c": { jp: "jp-tcg-BW6C", json: `${DIR}/kr-official-bw6c.json` }, // 콜드플레어(신설·KR 발매 확인시)
  "kr-bw3p": { jp: "jp-tcg-BW3P", json: `${DIR}/kr-official-bw3p.json` }, // 제3탄 사이코 드라이브(2026-06-06 발견 — 이전 미발매 오판은 띄어쓰기 검색 미스, KR 55=52+SR3)
  "kr-bw3h": { jp: "jp-tcg-BW3H", json: `${DIR}/kr-official-bw3h.json` }, // 제3탄 헤일 블리자드(KR 55=52+SR3)
  "kr-bw7": { jp: "jp-tcg-BW7", json: `${DIR}/kr-official-bw7.json` },    // 플라스마게일(KR 76 > JP 70: SR tail 6)
  "kr-bw8": { jp: "jp-tcg-BW8S,jp-tcg-BW8T", json: `${DIR}/kr-official-bw8.json` }, // 볼트너클 = JP 라센포스+라이덴너클 합본 선별 55장(데오키시스EX=S·볼트로스EX=T 양측 확인)
  "kr-bw9": { jp: "jp-tcg-BW9", json: `${DIR}/kr-official-bw9.json` },    // 메갈로캐논(KR 82 > JP 76)
  "kr-ebb": { jp: "jp-tcg-EBB", json: `${DIR}/kr-official-ebb.json` },    // EX 배틀 부스트(KR 93 < JP 97)
  "kr-sc": { jp: "jp-tcg-SC", json: `${DIR}/kr-official-sc.json` },       // 샤이니 컬렉션(KR 25 > JP 20: EN RC 대응 tail 5)
  "kr-cp1": { jp: "jp-tcg-CP1", json: `${DIR}/kr-official-cp1.json` },    // 더블크라이시스
  "kr-cp2": { jp: "jp-tcg-CP2", json: `${DIR}/kr-official-cp2.json` },    // 레전드 컬렉션
  "kr-cp3": { jp: "jp-tcg-CP3", json: `${DIR}/kr-official-cp3.json` },    // 포켓심쿵 컬렉션
  "kr-cp4": { jp: "jp-tcg-CP4", json: `${DIR}/kr-official-cp4.json` },    // 프리미엄 챔피언팩 EX×M×BREAK
  "kr-smxy": { jp: "jp-tcg-SMXY", json: `${DIR}/kr-official-smxy.json` }, // THE BEST OF XY (JP·KR 1:1, 186)
  "kr-cp6": { jp: "jp-tcg-CP6", json: `${DIR}/kr-official-cp6.json` },    // BASE PACK 20th (KR 100+13=113 > JP 87+16=103, --keep-unmatched)
  "kr-cp5": { jp: "jp-tcg-CP5", json: `${DIR}/kr-official-cp5.json` },    // 환상·전설 드림 컬렉션 (KR 36, JP 시크릿 2 JP단독)
  "kr-sv2d": { jp: "jp-tcg-SV2D", json: `${DIR}/kr-official-sv2d.json` },
  "kr-sv4k": { jp: "jp-tcg-SV4K", json: `${DIR}/kr-official-sv4k.json` },
  "kr-sv4m": { jp: "jp-tcg-SV4M", json: `${DIR}/kr-official-sv4m.json` },
  "kr-sv-151": { jp: "jp-sv-151", json: `${DIR}/kr-official-sv2a.json` },
  "kr-sv3": { jp: "jp-sv-obsidian-flames", json: `${DIR}/kr-official-sv3.json` },
  "kr-sv3a": { jp: "jp-sv-raging-surf", json: `${DIR}/kr-official-sv3a.json` },
  "kr-sv4a": { jp: "jp-sv-paldean-fates", json: `${DIR}/kr-official-sv4a.json` }, // JP 일본공식 360 완전적재 → 전체 매핑
  "kr-sv5k": { jp: "jp-tcg-SV5K", json: `${DIR}/kr-official-sv5k.json` },
  "kr-sv5m": { jp: "jp-tcg-SV5M", json: `${DIR}/kr-official-sv5m.json` },
  "kr-sv5a": { jp: "jp-sv-crimson-haze", json: `${DIR}/kr-official-sv5a.json` },
  "kr-sv6": { jp: "jp-sv-twilight-masquerade", json: `${DIR}/kr-official-sv6.json` },
  "kr-sv6a": { jp: "jp-sv-shrouded-fable", json: `${DIR}/kr-official-sv6a.json` },
  "kr-sv7": { jp: "jp-sv-stellar-crown", json: `${DIR}/kr-official-sv7.json` },
  "kr-sv7a": { jp: "jp-sv-paradise-dragona", json: `${DIR}/kr-official-sv7a.json` },
  "kr-sv8": { jp: "jp-sv-surging-sparks", json: `${DIR}/kr-official-sv8.json` },
  "kr-sv8a": { jp: "jp-sv-prismatic-evolutions", json: `${DIR}/kr-official-sv8a.json` },
  "kr-sv9": { jp: "jp-sv-journey-together", json: `${DIR}/kr-official-sv9.json` },
  "kr-sv9a": { jp: "jp-sv-heatwave-arena", json: `${DIR}/kr-official-sv9a.json` },
  "kr-sv10": { jp: "jp-sv-destined-rivals", json: `${DIR}/kr-official-sv10.json` },
  "kr-sv11b": { jp: "jp-tcg-SV11B", json: `${DIR}/kr-official-sv11b.json` },
  "kr-sv11w": { jp: "jp-tcg-SV11W", json: `${DIR}/kr-official-sv11w.json` },
  // ── MEGA ──
  "kr-m1l": { jp: "jp-tcg-M1L", json: `${DIR}/kr-official-m1l.json` },
  "kr-m1s": { jp: "jp-tcg-M1S", json: `${DIR}/kr-official-m1s.json` },
  "kr-m2": { jp: "jp-mega-infernox", json: `${DIR}/kr-official-m2.json` },
  "kr-m2a": { jp: "jp-mega-dream-ex", json: `${DIR}/kr-official-m2a.json` },
  "kr-m3": { jp: "jp-mega-munikisuzero", json: `${DIR}/kr-official-m3.json` },
  "kr-m4": { jp: "jp-mega-ninja-spinner", json: `${DIR}/kr-official-m4.json` },
  // ── DP 구축덱 (2026-06-07 정본화) ──
  // (kr-st1 랜덤구축덱: JP 풀 매칭 시도했으나 verify 일러 불일치 22 → KR 독자 재구성 판정(BS 패턴), KR 전용 재구축 완료 — 재apply 금지)
  // (kr-st2 펄기아덱·kr-st3 크레세리아덱 = JP 미게재 KR 전용 페어 — 자체 재구축)
  // ── BW 구축덱 (2026-06-07 정본화) ──
  "kr-fs": { jp: "jp-tcg-BWFS", json: `${DIR}/kr-official-fs.json` },
  "kr-bg_virizion": { jp: "jp-tcg-BGV", json: `${DIR}/kr-official-bg-virizion.json` },
  "kr-bg_terrakion": { jp: "jp-tcg-BGT", json: `${DIR}/kr-official-bg-terrakion.json` },
  "kr-bg_cobalon": { jp: "jp-tcg-BGC", json: `${DIR}/kr-official-bg-cobalon.json` },
  "kr-bgrex": { jp: "jp-tcg-BGREX", json: `${DIR}/kr-official-bgrex.json` },
  "kr-bgz": { jp: "jp-tcg-BGZ2", json: `${DIR}/kr-official-bgz.json` },
  "kr-td": { jp: "jp-tcg-TD2", json: `${DIR}/kr-official-td.json` },
  "kr-bd": { jp: "jp-tcg-BD2", json: `${DIR}/kr-official-bd.json` },
  "kr-sbd": { jp: "jp-tcg-SBD", json: `${DIR}/kr-official-sbd.json` },
  "kr-gbd": { jp: "jp-tcg-GBD", json: `${DIR}/kr-official-gbd.json` },
  "kr-kd": { jp: "jp-tcg-KD2", json: `${DIR}/kr-official-kd.json` },
  "kr-pd": { jp: "jp-tcg-PD2", json: `${DIR}/kr-official-pd.json` },
  "kr-bgb": { jp: "jp-tcg-BGB2", json: `${DIR}/kr-official-bgb.json` },
  "kr-bgw": { jp: "jp-tcg-BGW2", json: `${DIR}/kr-official-bgw.json` },
  "kr-pss": { jp: "jp-tcg-PSS2", json: `${DIR}/kr-official-pss.json` },
  "kr-g+k": { jp: "jp-tcg-GK", json: `${DIR}/kr-official-gk.json` },
  "kr-mg": { jp: "jp-tcg-MG", json: `${DIR}/kr-official-mg.json` }, // 공유 6장 — keep-unmatched
  // ── XY 구축덱 (2026-06-07 정본화) ──
  "kr-fxy": { jp: "jp-tcg-XY0", json: `${DIR}/kr-official-fxy.json` },   // 퍼스트세트 3덱 합본(42)
  "kr-xy30": { jp: "jp-tcg-XY30", json: `${DIR}/kr-official-xy30.json` },
  "kr-xy30b": { jp: "jp-tcg-XY30B", json: `${DIR}/kr-official-xy30b.json` },
  "kr-xya": { jp: "jp-tcg-XYA", json: `${DIR}/kr-official-xya.json` },
  "kr-xyb": { jp: "jp-tcg-XYB", json: `${DIR}/kr-official-xyb.json` },
  "kr-xyc": { jp: "jp-tcg-XYC", json: `${DIR}/kr-official-xyc.json` },
  "kr-xyd": { jp: "jp-tcg-XYD", json: `${DIR}/kr-official-xyd.json` },
  "kr-xye": { jp: "jp-tcg-XYE", json: `${DIR}/kr-official-xye.json` },
  "kr-rbd": { jp: "jp-tcg-RBD", json: `${DIR}/kr-official-rbd.json` },   // KR 30장덱(19) ⊃ JP 진화팩(10) — keep-unmatched
  "kr-ubd": { jp: "jp-tcg-UBD", json: `${DIR}/kr-official-ubd.json` },   // 동상
  "kr-xyf": { jp: "jp-tcg-XYF", json: `${DIR}/kr-official-xyf.json` },
  "kr-xyg": { jp: "jp-tcg-XYG", json: `${DIR}/kr-official-xyg.json` },
  "kr-xyh": { jp: "jp-tcg-XYH", json: `${DIR}/kr-official-xyh.json` },
  // ── SM 구축덱 (2026-06-06 정본화) ──
  "kr-sma": { jp: "jp-tcg-SMA", json: `${DIR}/kr-official-sma.json` },
  "kr-smc": { jp: "jp-tcg-SMC", json: `${DIR}/kr-official-smc.json` },
  "kr-smd": { jp: "jp-tcg-SMD", json: `${DIR}/kr-official-smd.json` },
  "kr-sme": { jp: "jp-tcg-SME", json: `${DIR}/kr-official-sme.json` },
  "kr-smi": { jp: "jp-tcg-SMI", json: `${DIR}/kr-official-smi.json` },
  "kr-smk": { jp: "jp-tcg-SMK", json: `${DIR}/kr-official-smk.json` },
  "kr-sml_": { jp: "jp-tcg-SML", json: `${DIR}/kr-official-sml_.json` },
  "kr-smm": { jp: "jp-tcg-SMM", json: `${DIR}/kr-official-smm.json` },
  "kr-smn": { jp: "jp-tcg-SMN,jp-tcg-SMNP", json: `${DIR}/kr-official-smn.json` }, // KR 파워업덱 = DBB+PTB 듀얼 풀
  "kr-sm30a": { jp: "jp-tcg-SM30A", json: `${DIR}/kr-official-sm30a.json` }, // KR 랜덤30장덱(80) = GX스타트덱(131) 풀 재구성
  // (kr-sm60a/sm60b = JP 부재 KR 전용 — 별도 재구축 / kr-promo = 95~336 실명 갱신)
  // ── SWSH 구축덱/강화상품/스타트덱100 (2026-06-06 정본화) ──
  "kr-sa": { jp: "jp-tcg-SA", json: `${DIR}/kr-official-sa.json` },
  "kr-se": { jp: "jp-tcg-SEF", json: `${DIR}/kr-official-se.json` },
  "kr-seb": { jp: "jp-tcg-SEK", json: `${DIR}/kr-official-seb.json` },
  "kr-sg": { jp: "jp-tcg-SGI", json: `${DIR}/kr-official-sg.json` },
  "kr-sgg": { jp: "jp-tcg-SGG", json: `${DIR}/kr-official-sg-gengar.json` },
  "kr-sd": { jp: "jp-tcg-SD", json: `${DIR}/kr-official-sd.json` },
  "kr-sh": { jp: "jp-tcg-SH", json: `${DIR}/kr-official-sh.json` },
  "kr-sj": { jp: "jp-tcg-SJ", json: `${DIR}/kr-official-sj.json` },
  "kr-sl": { jp: "jp-tcg-SLL", json: `${DIR}/kr-official-sl.json` },
  "kr-sld": { jp: "jp-tcg-SLD", json: `${DIR}/kr-official-sl-darkrai.json` },
  "kr-spz": { jp: "jp-tcg-SPZ", json: `${DIR}/kr-official-sp-zeraora.json` },
  "kr-spd": { jp: "jp-tcg-SPD", json: `${DIR}/kr-official-sp-deoxys.json` },
  "kr-so": { jp: "jp-tcg-SO", json: `${DIR}/kr-official-so.json` },
  "kr-si": { jp: "jp-tcg-SI", json: `${DIR}/kr-official-si.json` },
  "kr-sn": { jp: "jp-tcg-SN", json: `${DIR}/kr-official-sn.json` },
  "kr-sb": { jp: "jp-tcg-SB", json: `${DIR}/kr-official-sb.json` },
  "kr-sp1": { jp: "jp-tcg-SP1", json: `${DIR}/kr-official-sp1.json` },  // KR 에너지 +1 → keep-unmatched
  "kr-sp2": { jp: "jp-tcg-SP2", json: `${DIR}/kr-official-sp2.json` },
  "kr-sp3": { jp: "jp-tcg-SP3", json: `${DIR}/kr-official-sp3.json` },
  "kr-sp4": { jp: "jp-tcg-SP4", json: `${DIR}/kr-official-sp4.json` },
  "kr-sp5": { jp: "jp-tcg-SP5", json: `${DIR}/kr-official-sp5.json` },
  "kr-sp6": { jp: "jp-tcg-SP6", json: `${DIR}/kr-official-sp6.json` },
  // ── SV 구축덱/강화상품 (2026-06-06 정본화; 트레이너 KR 가나다 재정렬 — 사전 직매칭 의존) ──
  "kr-sva": { jp: "jp-tcg-SVAW", json: `${DIR}/kr-official-sva.json` },    // 스타터ex 꾸왁스&따라큐
  "kr-sval": { jp: "jp-tcg-SVAL", json: `${DIR}/kr-official-sval.json` },  // 스타터ex 뜨아거&전룡 (SVA 폴더 공유)
  "kr-svc": { jp: "jp-tcg-SVC", json: `${DIR}/kr-official-svc.json` },     // 스타터ex 피카츄
  "kr-svd": { jp: "jp-tcg-SVD", json: `${DIR}/kr-official-svd.json` },     // ex 스타트 덱 (10덱)
  "kr-svel": { jp: "jp-tcg-SVEL", json: `${DIR}/kr-official-svel.json` },  // 스타터 테라스탈 라우드본
  "kr-svem": { jp: "jp-tcg-SVEM", json: `${DIR}/kr-official-svem.json` },  // 스타터 테라스탈 뮤츠
  "kr-svg": { jp: "jp-tcg-SVG", json: `${DIR}/kr-official-svg.json` },     // 스페셜 덱 세트 ex 御三家
  "kr-svhk": { jp: "jp-tcg-SVHK", json: `${DIR}/kr-official-svhk.json` },  // 스타터덱&빌드 고대 코라이돈
  "kr-svhm": { jp: "jp-tcg-SVHM", json: `${DIR}/kr-official-svhm.json` },  // 스타터덱&빌드 미래 미라이돈
  "kr-svjl": { jp: "jp-tcg-SVJL", json: `${DIR}/kr-official-svjl.json` },  // 배틀마스터덱 리자몽
  "kr-svjp": { jp: "jp-tcg-SVJP", json: `${DIR}/kr-official-svjp.json` },  // 배틀마스터덱 파오젠
  "kr-svln": { jp: "jp-tcg-SVLN", json: `${DIR}/kr-official-svln.json` },  // 스타터 스텔라 님피아
  "kr-svls": { jp: "jp-tcg-SVLS", json: `${DIR}/kr-official-svls.json` },  // 스타터 스텔라 파라블레이즈
  "kr-svm": { jp: "jp-tcg-SVM", json: `${DIR}/kr-official-svm.json` },     // 랜덤 스타트 덱 Generations (9덱)
  "kr-svod": { jp: "jp-tcg-SVOD", json: `${DIR}/kr-official-svod.json` },  // 스타터ex 성호의 메탕
  "kr-svom": { jp: "jp-tcg-SVOM", json: `${DIR}/kr-official-svom.json` },  // 스타터ex 마리의 모르페코
  "kr-svb": { jp: "jp-tcg-SVB", json: `${DIR}/kr-official-svb.json` },     // 프리미엄 트레이너 박스 ex
  "kr-svf": { jp: "jp-tcg-SVF", json: `${DIR}/kr-official-svf.json` },     // 덱빌드BOX 흑염의 지배자
  "kr-svk": { jp: "jp-tcg-SVK", json: `${DIR}/kr-official-svk.json` },     // 덱빌드BOX 스텔라미라클
  "kr-svn": { jp: "jp-tcg-SVN", json: `${DIR}/kr-official-svn.json` },     // 덱빌드BOX 배틀파트너즈
  "kr-svp1": { jp: "jp-tcg-SVP1", json: `${DIR}/kr-official-svp1.json` },  // ex 스페셜 세트
  "kr-svi": { jp: "jp-tcg-SVI", json: `${DIR}/kr-official-svi.json` }, // 배틀 아카데미 (JP·KR 동코드 SVI, 66+에너지8)
  // (kr-svp2 = JP 부재 KR 전용 — apply 불가, 별도 이름백필)
  // ── MEGA 구축덱/강화상품 (JP·KR 번호 1:1 스왑) ──
  "kr-mc": { jp: "jp-tcg-MC", json: `${DIR}/kr-official-mc.json` },     // 스타트 덱 100 배틀컬렉션
  "kr-mbd": { jp: "jp-tcg-MBD", json: `${DIR}/kr-official-mbd.json` },  // 스타터 세트 MEGA 메가디안시 ex
  "kr-mbg": { jp: "jp-tcg-MBG", json: `${DIR}/kr-official-mbg.json` },  // 스타터 세트 MEGA 메가팬텀 ex
  "kr-ma": { jp: "jp-tcg-MA", json: `${DIR}/kr-official-ma.json` },     // MEGA 프리미엄 트레이너 박스
  // ── SWSH ──
  "kr-s12a": { jp: "jp-tcg-S12a", json: `${DIR}/kr-official-s12a.json` },
  "kr-s12": { jp: "jp-tcg-S12", json: `${DIR}/kr-official-s12.json` },
  "kr-s11a": { jp: "jp-tcg-S11a", json: `${DIR}/kr-official-s11a.json` },
  "kr-s11": { jp: "jp-tcg-S11", json: `${DIR}/kr-official-s11.json` },
  "kr-s10b": { jp: "jp-tcg-S10b", json: `${DIR}/kr-official-s10b.json` },
  "kr-s10a": { jp: "jp-tcg-S10a", json: `${DIR}/kr-official-s10a.json` },
  "kr-s10": { jp: "jp-tcg-S10D", json: `${DIR}/kr-official-s10d.json` },
  "kr-s10p": { jp: "jp-tcg-S10P", json: `${DIR}/kr-official-s10p.json` },
  "kr-s9a": { jp: "jp-tcg-S9a", json: `${DIR}/kr-official-s9a.json` },
  "kr-s9": { jp: "jp-tcg-S9", json: `${DIR}/kr-official-s9.json` },
  "kr-s8b": { jp: "jp-tcg-S8b", json: `${DIR}/kr-official-s8b.json` },
  "kr-s8": { jp: "jp-tcg-S8", json: `${DIR}/kr-official-s8.json` },
  "kr-s7": { jp: "jp-tcg-S7D", json: `${DIR}/kr-official-s7d.json` },
  "kr-s7r": { jp: "jp-tcg-S7R", json: `${DIR}/kr-official-s7r.json` },
  "kr-s6": { jp: "jp-tcg-S6H", json: `${DIR}/kr-official-s6h.json` },
  "kr-s6k": { jp: "jp-tcg-S6K", json: `${DIR}/kr-official-s6k.json` },
  "kr-s5": { jp: "jp-tcg-S5I", json: `${DIR}/kr-official-s5i.json` },
  "kr-s5r": { jp: "jp-tcg-S5R", json: `${DIR}/kr-official-s5r.json` },
  "kr-s4": { jp: "jp-tcg-S4", json: `${DIR}/kr-official-s4.json` },
  "kr-s3a": { jp: "jp-tcg-S3a", json: `${DIR}/kr-official-s3a.json` },
  "kr-s3": { jp: "jp-tcg-S3", json: `${DIR}/kr-official-s3.json` },
  "kr-s2a": { jp: "jp-tcg-S2a", json: `${DIR}/kr-official-s2a.json` },
  "kr-s2": { jp: "jp-tcg-S2", json: `${DIR}/kr-official-s2.json` },
  "kr-s1h": { jp: "jp-tcg-S1H", json: `${DIR}/kr-official-s1h.json` },
  "kr-s1w": { jp: "jp-tcg-S1W", json: `${DIR}/kr-official-s1w.json` },
  "kr-s1a": { jp: "jp-tcg-S1a", json: `${DIR}/kr-official-s1a.json` },
  "kr-s4a": { jp: "jp-tcg-S4a", json: `${DIR}/kr-official-s4a.json` },
  // ── SM (썬·문) ──
  "kr-sm1s": { jp: "jp-tcg-SM1S", json: `${DIR}/kr-official-sm1s.json` },
  "kr-sm1m": { jp: "jp-tcg-SM1M", json: `${DIR}/kr-official-sm1m.json` },
  "kr-sm1+": { jp: "jp-tcg-SM1+", json: `${DIR}/kr-official-sm1plus.json` },
  "kr-sm2k": { jp: "jp-tcg-SM2K", json: `${DIR}/kr-official-sm2k.json` },
  "kr-sm2l": { jp: "jp-tcg-SM2L", json: `${DIR}/kr-official-sm2l.json` },
  "kr-sm2+": { jp: "jp-tcg-sm2+", json: `${DIR}/kr-official-sm2plus.json` },
  "kr-sm3n": { jp: "jp-tcg-SM3N", json: `${DIR}/kr-official-sm3n.json` },
  "kr-sm3h": { jp: "jp-tcg-SM3H", json: `${DIR}/kr-official-sm3h.json` },
  "kr-sm3+": { jp: "jp-tcg-SM3+", json: `${DIR}/kr-official-sm3plus.json` },
  "kr-sm4s": { jp: "jp-tcg-SM4S", json: `${DIR}/kr-official-sm4s.json` },
  "kr-sm4a": { jp: "jp-tcg-SM4A", json: `${DIR}/kr-official-sm4a.json` },
  "kr-sm4+": { jp: "jp-tcg-SM4+", json: `${DIR}/kr-official-sm4plus.json` },
  "kr-sm5s": { jp: "jp-tcg-SM5S", json: `${DIR}/kr-official-sm5s.json` },
  "kr-sm5m": { jp: "jp-tcg-SM5M", json: `${DIR}/kr-official-sm5m.json` },
  "kr-sm5+": { jp: "jp-tcg-SM5+", json: `${DIR}/kr-official-sm5plus.json` },
  "kr-sm6": { jp: "jp-tcg-SM6", json: `${DIR}/kr-official-sm6.json` },
  "kr-sm6a": { jp: "jp-tcg-SM6a", json: `${DIR}/kr-official-sm6a.json` },
  "kr-sm6b": { jp: "jp-tcg-SM6b", json: `${DIR}/kr-official-sm6b.json` },
  "kr-sm7": { jp: "jp-tcg-SM7", json: `${DIR}/kr-official-sm7.json` },
  "kr-sm7a": { jp: "jp-tcg-SM7a", json: `${DIR}/kr-official-sm7a.json` },
  "kr-sm7b": { jp: "jp-tcg-SM7b", json: `${DIR}/kr-official-sm7b.json` },
  "kr-sm8": { jp: "jp-tcg-SM8", json: `${DIR}/kr-official-sm8.json` },
  "kr-sm8a": { jp: "jp-tcg-SM8a", json: `${DIR}/kr-official-sm8a.json` },
  "kr-sm8b": { jp: "jp-tcg-SM8b", json: `${DIR}/kr-official-sm8b.json` },
  "kr-sm9": { jp: "jp-tcg-SM9", json: `${DIR}/kr-official-sm9.json` },
  // SM9a 나이트유니슨: pokemoncard.co.kr 가 정규 #1-63 위에 일반판 #64-103 을 동일 인쇄번호(001/055..)로 중복등록 → maxNum 63 으로 중복블록 드롭
  "kr-sm9a": { jp: "jp-tcg-SM9a", json: `${DIR}/kr-official-sm9a.json`, maxNum: 63 },
  "kr-sm9b": { jp: "jp-tcg-SM9b", json: `${DIR}/kr-official-sm9b.json` },
  "kr-sm10": { jp: "jp-tcg-SM10", json: `${DIR}/kr-official-sm10.json` },
  "kr-sm10a": { jp: "jp-tcg-sn10a", json: `${DIR}/kr-official-sm10a.json` }, // GG엔드 JP세트는 jp-tcg-sn10a(이름 오타이나 일관)
  "kr-sm10b": { jp: "jp-tcg-SM10b", json: `${DIR}/kr-official-sm10b.json` },
  "kr-sm11": { jp: "jp-tcg-sn11", json: `${DIR}/kr-official-sm11.json` }, // 미라클트윈 JP세트=jp-tcg-sn11
  "kr-sm11a": { jp: "jp-tcg-SM11a", json: `${DIR}/kr-official-sm11a.json` },
  "kr-sm11b": { jp: "jp-tcg-SM11b", json: `${DIR}/kr-official-sm11b.json` },
  "kr-sm12": { jp: "jp-tcg-SM12", json: `${DIR}/kr-official-sm12.json` },
  "kr-sm12a": { jp: "jp-tcg-SM12a", json: `${DIR}/kr-official-sm12a.json` }, // Tag All Stars 컴필(210)
  "kr-smp2": { jp: "jp-tcg-SMP2", json: `${DIR}/kr-official-smp2.json` }, // 명탐정 피카츄(영화 스페셜)
  // ── DP 한국판 확장팩 (2010-05~2011-03 한국 전용 재편집 합본 — DP+Pt 전역 발췌 크로스그룹, 2026-06-07) ──
  //    JP 스코프 = DP/Pt 확장 13세트 합본. 미매칭(JP 미발매·EN Majestic Dawn 계열 ~38장)은 --keep-unmatched 보존 후 EN 앵커 별도 연결.
  "kr-bs1": { jp: "jp-tcg-DP1P,jp-tcg-DP1D,jp-tcg-DP2,jp-tcg-DP3,jp-tcg-DP4M,jp-tcg-DP4D,jp-tcg-DP5H,jp-tcg-DP5A,jp-tcg-DP6,jp-tcg-PT1,jp-tcg-PT2,jp-tcg-PT3,jp-tcg-PT4", json: `${DIR}/kr-official-bs1.json` },   // 모험의 시작 (2010-05-13)
  "kr-bs2": { jp: "jp-tcg-DP1P,jp-tcg-DP1D,jp-tcg-DP2,jp-tcg-DP3,jp-tcg-DP4M,jp-tcg-DP4D,jp-tcg-DP5H,jp-tcg-DP5A,jp-tcg-DP6,jp-tcg-PT1,jp-tcg-PT2,jp-tcg-PT3,jp-tcg-PT4", json: `${DIR}/kr-official-bs2.json` },   // 불꽃 튀는 대결
  "kr-bs3": { jp: "jp-tcg-DP1P,jp-tcg-DP1D,jp-tcg-DP2,jp-tcg-DP3,jp-tcg-DP4M,jp-tcg-DP4D,jp-tcg-DP5H,jp-tcg-DP5A,jp-tcg-DP6,jp-tcg-PT1,jp-tcg-PT2,jp-tcg-PT3,jp-tcg-PT4", json: `${DIR}/kr-official-bs3.json` },   // 시공의 격돌 (2010-08-26)
  "kr-bs4": { jp: "jp-tcg-DP1P,jp-tcg-DP1D,jp-tcg-DP2,jp-tcg-DP3,jp-tcg-DP4M,jp-tcg-DP4D,jp-tcg-DP5H,jp-tcg-DP5A,jp-tcg-DP6,jp-tcg-PT1,jp-tcg-PT2,jp-tcg-PT3,jp-tcg-PT4", json: `${DIR}/kr-official-bs4.json` },   // 또 다른 세계
  "kr-bs5": { jp: "jp-tcg-DP1P,jp-tcg-DP1D,jp-tcg-DP2,jp-tcg-DP3,jp-tcg-DP4M,jp-tcg-DP4D,jp-tcg-DP5H,jp-tcg-DP5A,jp-tcg-DP6,jp-tcg-PT1,jp-tcg-PT2,jp-tcg-PT3,jp-tcg-PT4", json: `${DIR}/kr-official-bs5.json` },   // 7개의 신비
  "kr-bs6": { jp: "jp-tcg-DP1P,jp-tcg-DP1D,jp-tcg-DP2,jp-tcg-DP3,jp-tcg-DP4M,jp-tcg-DP4D,jp-tcg-DP5H,jp-tcg-DP5A,jp-tcg-DP6,jp-tcg-PT1,jp-tcg-PT2,jp-tcg-PT3,jp-tcg-PT4", json: `${DIR}/kr-official-bs6.json` },   // 암흑의 초승달
  "kr-bs7": { jp: "jp-tcg-DP1P,jp-tcg-DP1D,jp-tcg-DP2,jp-tcg-DP3,jp-tcg-DP4M,jp-tcg-DP4D,jp-tcg-DP5H,jp-tcg-DP5A,jp-tcg-DP6,jp-tcg-PT1,jp-tcg-PT2,jp-tcg-PT3,jp-tcg-PT4", json: `${DIR}/kr-official-bs7.json` },   // 보이지 않는 힘
  "kr-bs8": { jp: "jp-tcg-DP1P,jp-tcg-DP1D,jp-tcg-DP2,jp-tcg-DP3,jp-tcg-DP4M,jp-tcg-DP4D,jp-tcg-DP5H,jp-tcg-DP5A,jp-tcg-DP6,jp-tcg-PT1,jp-tcg-PT2,jp-tcg-PT3,jp-tcg-PT4", json: `${DIR}/kr-official-bs8.json` },   // 화려한 전설
  "kr-bs9": { jp: "jp-tcg-DP1P,jp-tcg-DP1D,jp-tcg-DP2,jp-tcg-DP3,jp-tcg-DP4M,jp-tcg-DP4D,jp-tcg-DP5H,jp-tcg-DP5A,jp-tcg-DP6,jp-tcg-PT1,jp-tcg-PT2,jp-tcg-PT3,jp-tcg-PT4", json: `${DIR}/kr-official-bs9.json` },   // 호수의 기적
  "kr-bs10": { jp: "jp-tcg-DP1P,jp-tcg-DP1D,jp-tcg-DP2,jp-tcg-DP3,jp-tcg-DP4M,jp-tcg-DP4D,jp-tcg-DP5H,jp-tcg-DP5A,jp-tcg-DP6,jp-tcg-PT1,jp-tcg-PT2,jp-tcg-PT3,jp-tcg-PT4", json: `${DIR}/kr-official-bs10.json` }, // 고대의 수호자 (2011-03-03)
};
type Off = { number: string; koName: string; illustrator: string | null; image: string | null; numInt: number };
type Jp = { numInt: number; name: string; lcid: string; illus: string | null; dex: number | null; supertype: string | null };

// 이름 비교키: 공백·전각괄호 정규화 (ja↔ko 사전 매칭용)
const kkey = (s: string | null) => (s ?? "").replace(/[\s　]/g, "").replace(/（/g, "(").replace(/）/g, ")").toLowerCase();
// DB 전체에서 (JP,KR) locale 동시보유 트레이너/에너지 LC = 이미 정합화된 검증 ja↔ko 번역쌍 → ko키→ja키 사전.
// 언어별 가나다/五十音 정렬 팩(THE BEST OF XY 등)에서 일러버킷 번호순 zip 의 연쇄 오페어 방지.
async function buildJaKoDict(): Promise<Map<string, Set<string>>> {
  const rows = await prisma.card.findMany({
    where: { supertype: { in: ["Trainer", "Energy"] }, locales: { some: { region: "KR" } } },
    select: { locales: { select: { region: true, name: true, numberInt: true } } },
  });
  const dict = new Map<string, Set<string>>();
  for (const r of rows) {
    const jp = r.locales.filter((l) => l.region === "JP");
    const kr = r.locales.filter((l) => l.region === "KR");
    for (const k of kr) for (const j of jp) {
      // 번호동일(미러) 쌍만 신뢰 — 과거 일러버킷 zip 오페어(번호상이)가 DB에 잔존하므로 오염 차단
      if (k.numberInt == null || j.numberInt == null || k.numberInt !== j.numberInt) continue;
      const kk = kkey(k.name); if (!kk || kk === kkey(j.name)) continue; // KR명이 일본어인 오염쌍 제외
      const s = dict.get(kk) ?? new Set<string>(); s.add(kkey(j.name)); dict.set(kk, s);
    }
  }
  // 수동검증 정적 테이블(trainer-names-jako)이 최우선 — 해당 ko키는 배타 덮어쓰기
  for (const [ja, ko] of Object.entries(TR_JA2KO)) dict.set(kkey(ko), new Set([kkey(ja)]));
  return dict;
}
// 한글 폼명 → dex (ja인덱스/resolveCardDexes 가 못 푸는 SV 테라/폼 카드). 우선 적용.
const KO_FORM: [RegExp, number][] = [
  [/오거폰/, 1017], [/다투곰/, 901],
  [/(커트|스핀|프로스트|워시|히트)\s*로토무|로토무(?!도감)/, 479], [/캐스퐁/, 351],
  [/카푸꼬꼬꼭/, 785], [/카푸나비나/, 786], [/카푸브루루/, 787], [/카푸느지느/, 788], // SM 카푸(Tapu) — koDex 미해결 폼명
  [/네크로즈마/, 800], [/큐레무/, 646], // SM5-7 네크로즈마(황혼/새벽/울트라)·큐레무(화이트) 폼명
];
const koDex = (name: string) => {
  // 트레이너인데 포켓몬명 접두/접미인 카드 제외(오분류 방지): "{포켓몬} 소울링크"=스피릿링크(도구), XY 메가시대
  if (/소울\s*링크/.test(name)) return null;
  // 화석 아이템("조개화석 암나이트"·"비밀의호박 프테라" 등 종명 접미) — XY BREAK 화석=Item
  if (/화석|비밀의\s*호박/.test(name)) return null;
  // 에너지 카드("더블 마그마 에너지" 등) — '마그마'(Slugma) 류 종명 부분일치 오인 방지
  if (/에너지$/.test(name)) return null;
  for (const [re, dex] of KO_FORM) if (re.test(name)) return dex;
  // 타그팀 GX(「&」/「＆」 복합명): 첫 성분 dex 로 버킷 (JP 앵커도 pokedexNumbers[0]=첫 성분; 종 순서 JP/KR 동일)
  if (/[&＆]/.test(name)) {
    const first = name.split(/[&＆]/)[0].replace(/\s*GX\s*$/i, "").trim();
    const dd = resolveCardDexes(first, "ko"); return dd.length ? dd[0] : null;
  }
  // 메가진화 라틴"M"접두어·접미어(EX/GX/V…) 제거 후 해석 — "M이상해꽃 EX"(XY 메가EX) dex 미해결 방지.
  // ⚠ 한글 "메가"는 제거 금지(종족명 메가자리=Yanmega·메가니움 등의 일부) — 라틴 M(메가진화)만.
  const base = name.replace(/^M(?=[가-힣])/, "").replace(/\s*(EX|GX|V|VMAX|VSTAR|ex)\s*$/i, "").trim();
  const d = resolveCardDexes(base, "ko"); return d.length ? d[0] : null;
};

// 팀 접두(마그마단의/아쿠아단의 등) — 같은 종이라도 팀이 다르면 다른 카드(CP1 더블크라이시스).
const teamKo = (s: string) => /^마그마단의/.test(s) ? "magma" : /^아쿠아단의/.test(s) ? "aqua" : /^로켓단의/.test(s) ? "rocket" : /^플라스마단의/.test(s) ? "plasma" : null;
const teamJa = (s: string) => /^マグマ団の/.test(s) ? "magma" : /^アクア団の/.test(s) ? "aqua" : /^ロケット団の/.test(s) ? "rocket" : /^プラズマ団の/.test(s) ? "plasma" : null;
const teamOk = (ko: string, ja: string) => teamKo(ko) === teamJa(ja);

// official → jp 매칭 (버킷 페어). 반환: Map<officialNum, Jp>
function match(offs: Off[], jps: Jp[], jaKoDict?: Map<string, Set<string>>) {
  const out = new Map<number, Jp>();
  const usedJp = new Set<number>();
  const push = (m: Map<string, any[]>, k: string, v: any) => { const a = m.get(k) ?? []; a.push(v); m.set(k, a); };

  // 1) 포켓몬: dex 버킷 → 일러/번호순 페어
  const offPoke = offs.map((o) => ({ o, dex: koDex(o.koName) })).filter((x) => x.dex != null);
  const jpPoke = jps.filter((j) => isPokemonSupertype(j.supertype) && j.dex != null);
  const ojb = new Map<string, any[]>(), jjb = new Map<string, any[]>();
  for (const x of offPoke) push(ojb, String(x.dex), x);
  for (const j of jpPoke) push(jjb, String(j.dex), j);
  for (const [k, ol] of ojb) {
    const jlAll = (jjb.get(k) ?? []).filter((j) => !usedJp.has(j.numInt));
    // (a) 동일 번호 우선 페어 — 같은 종(dex버킷)+같은 인쇄번호 = 같은 프린트. 타그팀 SR/HR 의 KR 일러 오신용(예 KR#97 세레비를 5ban 으로 오기재, JP=Shin Nagasawa)으로 인한 일러정렬 스크램블 방지.
    //     ⚠ 팀 접두 일치 필수 — CP1 더블크라이시스는 동종(포챠나×2)이 마그마/아쿠아 팀만 다르고 JP·KR 번호 교차.
    const olRem: any[] = [];
    for (const x of ol) {
      const same = jlAll.find((j) => !usedJp.has(j.numInt) && j.numInt === x.o.numInt && teamOk(x.o.koName, j.name));
      if (same) { out.set(x.o.numInt, same); usedJp.add(same.numInt); }
      else olRem.push(x);
    }
    // (b) 일러 정확일치(유일후보) 우선 — 비대칭 버킷(KR 1장 vs JP 복각+조크카드 등)에서
    //     일러정렬 zip 이 다른 일러끼리 오페어하는 것 방지(CP6 두두↔イマクニ?のドードー).
    const olRem2: any[] = [];
    for (const x of olRem) {
      const cand = jlAll.filter((j) => !usedJp.has(j.numInt) && norm(j.illus) === norm(x.o.illustrator) && teamOk(x.o.koName, j.name));
      if (cand.length === 1 && norm(x.o.illustrator)) { out.set(x.o.numInt, cand[0]); usedJp.add(cand[0].numInt); }
      else olRem2.push(x);
    }
    // (c) 나머지: 팀별 분할 후 일러/번호순 zip
    const jl = jlAll.filter((j) => !usedJp.has(j.numInt));
    const teams = new Set([...olRem2.map((x: any) => teamKo(x.o.koName) ?? "none"), ...jl.map((j: any) => teamJa(j.name) ?? "none")]);
    for (const t of teams) {
      const os = olRem2.filter((x: any) => (teamKo(x.o.koName) ?? "none") === t).sort((a: any, b: any) => norm(a.o.illustrator).localeCompare(norm(b.o.illustrator)) || a.o.numInt - b.o.numInt);
      const js = jl.filter((j: any) => !usedJp.has(j.numInt) && (teamJa(j.name) ?? "none") === t).sort((a: any, b: any) => norm(a.illus).localeCompare(norm(b.illus)) || a.numInt - b.numInt);
      for (let i = 0; i < Math.min(os.length, js.length); i++) { out.set(os[i].o.numInt, js[i]); usedJp.add(js[i].numInt); }
    }
  }
  // 2) 트레이너/잔여 포켓몬: 일러 버킷 → 번호순
  // ⚠️ 포켓몬은 phase 1(dex)에서만 매칭. phase 2/3 은 트레이너/에너지 전용(포켓몬 번호/일러 폴백은
  //    다른 종/카드에 오매핑되므로 금지 — 샤이니 헤비 팩에서 포켓몬↔에너지 쓰레기 방지).
  const isPokeOff = (o: Off) => koDex(o.koName) != null;
  const isPokeJp = (j: Jp) => isPokemonSupertype(j.supertype);
  // 1.5) 트레이너/에너지: DB검증 ja↔ko 사전 직매칭(이름 정체성) — 일러버킷보다 우선
  if (jaKoDict) {
    const dOff = offs.filter((o) => !out.has(o.numInt) && !isPokeOff(o));
    const dJp = jps.filter((j) => !usedJp.has(j.numInt) && !isPokeJp(j));
    const byKo = new Map<string, Off[]>(), byJa = new Map<string, Jp[]>();
    for (const o of dOff) push(byKo, kkey(o.koName), o);
    for (const j of dJp) push(byJa, kkey(j.name), j);
    for (const [ko, ol] of byKo) {
      const jaSet = jaKoDict.get(ko); if (!jaSet) continue;
      const jl: Jp[] = [];
      for (const ja of jaSet) for (const j of byJa.get(ja) ?? []) if (!usedJp.has(j.numInt)) jl.push(j);
      const os = (ol as Off[]).slice().sort((a, b) => a.numInt - b.numInt);
      const js = jl.sort((a, b) => a.numInt - b.numInt);
      for (let i = 0; i < Math.min(os.length, js.length); i++) { out.set(os[i].numInt, js[i]); usedJp.add(js[i].numInt); }
    }
  }
  const remOff = offs.filter((o) => !out.has(o.numInt) && !isPokeOff(o));
  const remJp = jps.filter((j) => !usedJp.has(j.numInt) && !isPokeJp(j));
  const oib = new Map<string, Off[]>(), jib = new Map<string, Jp[]>();
  for (const o of remOff) if (o.illustrator) push(oib, norm(o.illustrator), o);
  for (const j of remJp) if (j.illus) push(jib, norm(j.illus), j);
  for (const [k, ol] of oib) {
    const jl = (jib.get(k) ?? []).filter((j) => !usedJp.has(j.numInt)).sort((a, b) => a.numInt - b.numInt);
    const os = ol.slice().sort((a, b) => a.numInt - b.numInt);
    for (let i = 0; i < Math.min(os.length, jl.length); i++) { out.set(os[i].numInt, jl[i]); usedJp.add(jl[i].numInt); }
  }
  // 3) 잔여 트레이너/에너지: 번호 근접 폴백 (포켓몬 제외)
  const rem2Off = offs.filter((o) => !out.has(o.numInt) && !isPokeOff(o)).sort((a, b) => a.numInt - b.numInt);
  const rem2Jp = jps.filter((j) => !usedJp.has(j.numInt) && !isPokeJp(j)).sort((a, b) => a.numInt - b.numInt);
  for (const o of rem2Off) {
    let best: Jp | null = null, bd = 1e9;
    for (const j of rem2Jp) { if (usedJp.has(j.numInt)) continue; const d = Math.abs(j.numInt - o.numInt); if (d < bd) { bd = d; best = j; } }
    if (best) { out.set(o.numInt, best); usedJp.add(best.numInt); }
  }
  return out;
}

async function main() {
  const APPLY = process.argv.includes("--apply");
  const KEEP = process.argv.includes("--keep-unmatched"); // 미매칭 official → KR-only LC(한국판 전용 tail) 보존(KR>JP 초과팩)
  const setArg = process.argv.find((a) => a.startsWith("--set="))?.slice("--set=".length);
  const targets = setArg ? [setArg] : Object.keys(CFG);
  const jaKoDict = await buildJaKoDict();
  console.log(`ja↔ko 트레이너/에너지 DB사전: ${jaKoDict.size} ko키`);

  for (const krSet of targets) {
    const cfg = CFG[krSet]; if (!cfg) { console.error(`unknown ${krSet}`); continue; }
    const offs: Off[] = JSON.parse(readFileSync(cfg.json, "utf8")).map((c: any) => ({ number: c.number, koName: c.koName, illustrator: c.illustrator ?? null, image: c.image ?? null, numInt: parseInt(c.number, 10) }));
    const jpRows = await prisma.regionCard.findMany({ where: { setId: { in: cfg.jp.split(",") } }, select: { numberInt: true, name: true, cardId: true, card: { select: { illustrator: true, pokedexNumbers: true, supertype: true } } } });
    let jps: Jp[] = jpRows.map((r) => ({ numInt: r.numberInt ?? 0, name: r.name, lcid: r.cardId, illus: r.card.illustrator, dex: r.card.pokedexNumbers?.[0] ?? null, supertype: r.card.supertype }));
    let offsF = offs;
    if (cfg.maxNum) { offsF = offs.filter((o) => o.numInt <= cfg.maxNum!); jps = jps.filter((j) => j.numInt <= cfg.maxNum!); console.log(`  (maxNum ${cfg.maxNum}: base만 — official ${offsF.length}/${offs.length}, JP앵커 ${jps.length})`); }

    const m = match(offsF, jps, jaKoDict);
    // 기존 KR locale (앵커별 1장) — lcid 로 인덱스
    const krExisting = await prisma.regionCard.findMany({ where: { setId: krSet }, select: { id: true, cardId: true } });
    const krByLcid = new Map(krExisting.map((k) => [k.cardId, k]));

    let swaps = 0, creates = 0, updates = 0, unmatched = 0; const unm: string[] = [], swapEx: string[] = [];
    for (const o of offsF) {
      const j = m.get(o.numInt);
      if (!j) { unmatched++; unm.push(`#${o.number} ${o.koName}`); continue; }
      const onAnchor = krByLcid.get(j.lcid);
      if (j.numInt !== o.numInt && swapEx.length < 8) swapEx.push(`KR#${o.number} ${o.koName} ↔ JP#${j.numInt} ${j.name}`);
      if (j.numInt !== o.numInt) swaps++;
      if (onAnchor) updates++; else creates++;
    }
    console.log(`\n■ ${krSet} ← ${cfg.json} | official ${offsF.length} · JP앵커 ${jps.length}`);
    console.log(`  매칭 ${offsF.length - unmatched}/${offsF.length} · 번호상이(스왑/증감) ${swaps} · 기존갱신 ${updates} · 신규생성 ${creates} · 미매칭 ${unmatched}`);
    if (swapEx.length) console.log(`  번호상이 예: ${swapEx.join(" | ")}`);
    if (unm.length) console.log(`  ⚠️ 미매칭 official: ${unm.join(", ")}`);

    if (!APPLY) continue;
    // 적용: 참조(컬렉션/거래)는 같은 numberInt 로 임시 JP 재지정 → KR 통삭제 → official 재생성 → 새 KR 로 복원
    const krIds = krExisting.map((k) => k.id);
    const krNum = new Map((await prisma.regionCard.findMany({ where: { setId: krSet }, select: { id: true, numberInt: true } })).map((l) => [l.id, l.numberInt]));
    const colls = await prisma.collectionItem.findMany({ where: { regionCardId: { in: krIds } }, select: { id: true, regionCardId: true } });
    const trades = await prisma.trade.findMany({ where: { regionCardId: { in: krIds } }, select: { id: true, regionCardId: true } });
    const jpLoc = await prisma.regionCard.findMany({ where: { setId: { in: cfg.jp.split(",") } }, select: { id: true, numberInt: true, cardId: true } });
    const jpByNum = new Map(jpLoc.map((l) => [l.numberInt, l]));
    for (const c of colls) { const n = krNum.get(c.regionCardId); const j = n != null ? jpByNum.get(n) : null; if (j) await prisma.collectionItem.update({ where: { id: c.id }, data: { regionCardId: j.id, cardId: j.cardId } }); }
    for (const t of trades) { const n = krNum.get(t.regionCardId); const j = n != null ? jpByNum.get(n) : null; if (j) await prisma.trade.update({ where: { id: t.id }, data: { regionCardId: j.id, cardId: j.cardId } }); }
    if (colls.length + trades.length) console.log(`  참조 ${colls.length + trades.length}건 임시 JP 재지정`);
    await prisma.regionCard.deleteMany({ where: { setId: krSet } });
    let made = 0; const newKrByNum = new Map<number, { id: string; lcid: string }>();
    const idSeen = new Map<string, number>(); // 동번호 이명(덱 인터리브) id 충돌 방지 — 2장째부터 -b/-c 서픽스
    for (const o of offsF) {
      const j = m.get(o.numInt); if (!j) continue;
      const base = `${krSet}-${o.number}`;
      const dup = idSeen.get(base) ?? 0; idSeen.set(base, dup + 1);
      const id = dup === 0 ? base : `${base}-${String.fromCharCode(97 + dup)}`;
      await prisma.regionCard.create({ data: {
        id, setId: krSet, region: "KR", language: "ko", number: o.number, numberInt: o.numInt,
        name: o.koName, imageSmall: o.image, imageLarge: o.image, cardId: j.lcid,
      } });
      await prisma.card.update({ where: { id: j.lcid }, data: { nameKo: o.koName } });
      newKrByNum.set(o.numInt, { id, lcid: j.lcid });
      made++;
    }
    let restored = 0;
    for (const c of colls) { const n = krNum.get(c.regionCardId); const nk = n != null ? newKrByNum.get(n) : null; if (nk) { await prisma.collectionItem.update({ where: { id: c.id }, data: { regionCardId: nk.id, cardId: nk.lcid } }); restored++; } }
    for (const t of trades) { const n = krNum.get(t.regionCardId); const nk = n != null ? newKrByNum.get(n) : null; if (nk) { await prisma.trade.update({ where: { id: t.id }, data: { regionCardId: nk.id, cardId: nk.lcid } }); restored++; } }
    console.log(`  ★적용: KR locale ${made} 재생성${restored ? ` · 참조 ${restored}건 복원` : ""}`);

    if (KEEP) {
      const sg = (await prisma.set.findUnique({ where: { id: krSet }, select: { cardPackId: true } }))?.cardPackId ?? null;
      let tail = 0;
      for (const o of offsF) {
        if (m.get(o.numInt)) continue; // 매칭된 건 위에서 처리됨
        const d = koDex(o.koName);
        const lcId = `lc-${krSet}-${o.number}`;
        await prisma.card.upsert({
          where: { id: lcId },
          update: { nameKo: o.koName, illustrator: o.illustrator ?? undefined },
          create: { id: lcId, cardPackId: sg ?? undefined, supertype: d != null ? "Pokémon" : undefined, pokedexNumbers: d != null ? [d] : [], illustrator: o.illustrator ?? undefined, nameKo: o.koName, primarySetId: krSet, primaryNumber: o.number, primaryNumberInt: o.numInt },
        });
        await prisma.regionCard.create({ data: { id: `${krSet}-${o.number}`, setId: krSet, region: "KR", language: "ko", number: o.number, numberInt: o.numInt, name: o.koName, imageSmall: o.image, imageLarge: o.image, cardId: lcId } });
        tail++;
      }
      if (tail) console.log(`  ★KR-only tail(미매칭 보존): ${tail}장`);
    }
  }
  await prisma.$disconnect();
  if (!APPLY) console.log(`\n(dry) 적용: --apply`);
}
main().catch((e) => { console.error(e); process.exit(1); });
