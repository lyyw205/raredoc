# 리스트 ↔ DB 대조 로그 (list match log)

> tcgcollector 등에서 받은 팩 카드 리스트를 DB(기본 JP 기준)와 대조한 결과를 누적 기록.
> 대조 필드: **카드명 / 카드번호·총장수 / 진화단계 / 타입 / 레어도**(리스트에 있을 때). 시세는 dex 미적재라 제외.
> **이름 대조법(표준)**: ① EN RegionCard 링크(1차) → ② 없으면 **포켓몬은 `Card.pokedexNumbers`→`data/pokeapi/pokemon_species_names.csv`**(lang `1`=ja-hrkt·`9`=en·`3`=ko, species_id=도감번호)로 JP/EN/KR 종명 폴백 검증 → ③ 트레이너/에너지(종표 밖)만 잔여(EN링크/트레이너사전 필요). 종-ja명이 카드 ja명에 포함되는지로 자기검증. **★전각/반각 정규화 필수**(ポリゴン２/Ｚ 전각 vs DB 반각 = 오탐).
> **CSV 소급검증(2026-06-17)**: SV 15팩(SV6a~SV11W + SVN/SVM/SVLS/SVJL/SVOM/SVOD) **포켓몬 1277장 전부 도감번호 보유**, CSV 자기검증 **이름 오류 0**(Porygon2/Z 2건은 전각/반각 오탐). 초기 스폿체크가 놓친 이름 오류 없음 확인.
> 정책: **감사 + 안전 in-DB 수정(메타데이터, 연결 불변) + 로그**. 대량 신규 수집·구조변경은 모아서 전담 패스.
> 동결팩(`scripts/lib/protected-groups.ts`)은 읽기 전용 대조만.
> ⚠️ **동결 범위 정정(2026-06-17)**: 2026-06-16 "MEGA·SV·SM 세 시대 카드팩 **전부** 동결" 반영으로, 이 세션에서 처리한 팩(MEGA 전체·SV 전체·MP1/MC/SVOD/SVOM/SVN·MA·M-P 등)은 **모두 동결**. AGENTS.md "SV 18팩" 발췌는 구버전 — 단일 출처는 `protected-groups.ts`. 이번 세션의 in-DB 수정은 전부 **메타데이터(subtypes/types/supertype/rarity)로 EN/KR 연결 불변 + 사용자 승인** 하에 적용됨(동결 핵심 취지=연결 보존은 미침범).

---

## 요약표

| 날짜 | 팩 (코드) | DB setId | region | 장수 | 결과 |
|---|---|---|---|---|---|
| 06-17 | 니힐제로 (M3 / ニヒルゼロ) | `jp-mega-munikisuzero` | JP | 117/117 | ✅ 완전 일치. EN링크 갭 1(#89 Tyrunt AR) |
| 06-17 | 스타트덱100 코로챠오 (MP1) | `jp-tcg-MP1` | JP | 23/23 | 🔧 게임메타 백필. 트레이너 세부 subtype 미완 |
| 06-17 | 스타터세트 메가디안시ex (MBD) | `jp-tcg-MBD` | JP | 22/22 | ✅ 일치 + EX→ex 1 |
| 06-17 | 스타터세트 메가겐가ex (MBG) | `jp-tcg-MBG` | JP | 22/22 | ✅ 일치 + EX→ex 1 |
| 06-17 | 메가브레이브 (M1L) | `jp-tcg-M1L` | JP | 92/92 | ✅ 레어도(MUR)까지 일치(동결·읽기전용). EN링크 갭 1(#68 Riolu AR) |
| 06-17 | 메가 프로모 (M-P) | `jp-tcg-M-P` | JP | 70/123 | ⚠️ 있는 70 정확, **53장 미수집** |
| 06-17 | 프리미엄 트레이너 박스 MEGA (MA) | `jp-tcg-MA` | JP | 43/43(+8) | ✅ #1–43 일치 + EX→ex 4. DB에 기본E 8장(#44–51) 초과 |
| 06-17 | 메가심포니아 (M1S) | `jp-tcg-M1S` | JP | 92/92 | 🔧 Shedinja #43·#72 단계 `Basic→Stage1` 교정완료(이미지검증). 리스트 단계 오타 3(Kadabra·Alakazam)=DB정상 |
| 06-17 | 인페르노X (M2 / インフェルノX) | `jp-mega-infernox` | JP | 116/116 | ✅ 레어도(C/U/R…MUR)까지 완전 일치(동결·읽기전용) |
| 06-17 | MEGA 드림 ex (M2a / ドリームex) | `jp-mega-dream-ex` | JP | 250/250 | 🔧 본탄 37장 레어도→무레어도(하이클래스=무레어도). 동결·승인수정 |
| 06-17 | 닌자스피너 (M4 / ニンジャスピナー) | `jp-mega-ninja-spinner` | JP | 120/120 | ✅ 6필드 완전 일치(동결·읽기전용) |
| 06-17 | 어비스아이 (M5 / アビスアイ) | `jp-mega-abyss-eye` | JP | 118/118 | 🔧 시크릿 포켓몬 25장 `types` 백필(동결·승인수정). 그외 일치 |
| 06-17 | 스타트덱100 배틀컬렉션 (MC) | `jp-tcg-MC` | JP | 774/774 | 🔧 `EX→ex` 115장(동결·승인수정). 무레어도 세트, 그외 일치 |
| 06-17 | 블랙볼트 (SV11B / ブラックボルト) | `jp-tcg-SV11B` | JP | 174/174 | ✅ 명·번호·단계·타입·분류 일치(동결). 🔧 **#159–166 JP RegionCard `UR→SR` 교정완료**(공식=SR 리서치검증, 8장). #174 BWR 보류(유지) |
| 06-17 | 화이트플레어 (SV11W / ホワイトフレア) | `jp-tcg-SV11W` | JP | 174/174 | ✅ 명·번호·단계·타입 완전 일치(동결·읽기전용). **#159–166 SR 정상**(트윈 SV11B의 UR오류 없음). ⚠️ #174 BWR이 DB `R/Holo Rare`로 적재(cosmetic, SV11B보다 부정확) |
| 06-17 | 로켓단의 영광 (SV10 / ロケット団の栄光) | `jp-sv-destined-rivals` | JP | 132/132 | ✅ **6필드 완전 일치(0 불일치)**, 동결·읽기전용. UR 3장 포함 레어도 전부 일치(SV11B와 달리 UR이 실제 사용 세트) |
| 06-17 | 열풍의 아레나 (SV9a / 熱風のアリーナ) | `jp-sv-heatwave-arena` | JP | 92/92 | ✅ **5필드 완전 일치(0 불일치)**, **동결**(읽기전용, 변경 0). SR(#76–84)·UR(#90–92) 둘 다 정상 적재 — DB가 이 세트는 정확(SV11B 오류와 대조) |
| 06-17 | 스타터세트ex 다이고 (SVOD) | `jp-tcg-SVOD` | JP | 19/19(+2) | ✅ #1–19 일치(**동결 sv-decks**). 🔧 #7 메타그로스ex `EX→ex`(메타데이터, 연결불변). DB에 기본E 2장(#20–21 超·鋼) 초과(MA식 동봉E) |
| 06-17 | 스타터세트ex 마리 (SVOM) | `jp-tcg-SVOM` | JP | 20/20(+1) | ✅ #1–20 일치(동결 sv-decks·승인수정). 🔧 #7 마리의오롱털ex `EX→ex`. DB에 기본E 1장(#21 悪) 초과(MA식 동봉E). 트윈 SVOD 동일 패턴 |
| 06-17 | 강화박스 배틀파트너즈 (SVN) | `jp-tcg-SVN` | JP | 45/45(+8) | ✅ #1–45 일치(동결 sv-goods·승인수정). 🔧 ex 4장(#1·2·6·9) `EX→ex`. DB에 기본E 8장(#46–53) 초과(MA식 동봉E) |
| 06-17 | 배틀파트너즈 (SV9 / バトルパートナーズ) | `jp-sv-journey-together` | JP | 132/132 | ✅ **5필드 완전 일치(0 불일치)**, **동결·읽기전용**. SR·SAR·UR(#130–132) 전부 정상 적재 |
| 06-17 | 랜덤 스타트 덱 Generations (SVM) | `jp-tcg-SVM` | JP | 175/175(+8) | ✅ **5필드 완전 일치(0 불일치)**, 동결·읽기전용. **ex 전부 소문자 정상(EX→ex 불필요)**. DB에 기본E 8장(#176–183) 초과(MA식 동봉E) |
| 06-17 | 테라스탈페스ex (SV8a / テラスタルフェスex) | `jp-sv-prismatic-evolutions` | JP | 237/237 | ✅ **5필드 완전 일치(0 불일치)**, 동결·읽기전용. **하이클래스 본탄 144장 "None"(무레어도) 정상**(M2a식 가짜레어도 없음)·RR/ACE/SR/SAR/UR 정상. EN링크갭 101 중 포켓몬 80장 **종CSV로 이름검증 완료(80/80)**, 트레이너 21만 미검증 |
| 06-17 | 초전브레이커 (SV8 / 超電ブレイカー) | `jp-sv-surging-sparks` | JP | 138/138 | ✅ **5필드 완전 일치(0 불일치)**, 동결·읽기전용. ACE SPEC(#95·97·98)·UR(#136–138) 포함 레어도 전부 정상. ex 소문자 정상 |
| 06-17 | 스타터세트 파라블레이즈ex (SVLS) | `jp-tcg-SVLS` | JP | 22/22(+3) | ✅ #1–22 일치(동결 sv-decks·승인수정). 🔧 #6 파라블레이즈(소우브레이즈)ex `EX→ex`. DB에 기본E 3장(#23–25 炎·超·鋼) 초과(MA식 동봉E). SVOD/SVOM 동일 패턴 |
| 06-17 | 스텔라미라클 (SV7 / ステラミラクル) | `jp-sv-stellar-crown` | JP | 135/135 | ✅ **5필드 완전 일치(0 불일치)**, 동결·읽기전용. ACE SPEC(#94·96·101)·UR(#133–135) 포함 레어도 전부 정상. ex 소문자 정상 |
| 06-17 | 나이트원더러 (SV6a / ナイトワンダラー) | `jp-sv-shrouded-fable` | JP | 94/94 | ✅ 명·번호·단계·타입 일치(동결). 🔧 **#55 Poké Vital A ↔ #56 Night Stretcher 레어도 스왑 교정**(ACE↔U). 나머지 정상 |
| 06-17 | 배틀마스터덱 테라스탈리자몽ex (SVJL) | `jp-tcg-SVJL` | JP | 21/21(+1) | ✅ #1–21 일치(동결 sv-decks·승인수정). 🔧 #6 리자몽ex `EX→ex`. DB에 기본E 1장(#22 炎) 초과(MA식 동봉E). V/VSTAR 단계 정상 |
| 06-17 | 크림슨헤이즈 (SV5a / クリムゾンヘイズ) | `jp-sv-crimson-haze` | JP | 96/96 | ✅ 명·번호·단계·타입 일치(동결). 🔧 **ACE SPEC 오배정 4건 3국 일괄 교정**: #53 언페어스탬프·#59 서바이브깁스 `U→ACE`, #58 러브볼·#60 럭키멧 `ACE→U`. 포켓몬 종CSV 양방향 검증 통과 |
| 06-17 | 스타터덱&빌드세트 미래의미라이돈ex (SVHM) | `jp-tcg-SVHM` | JP | 53/53(+8) | ✅ #1–53 일치(**동결 sv-decks**, 덱=무레어도). 🔧 #11 미라이돈ex·#14 피죤ex `EX→ex`. DB에 기본E 8장(#54–61 草炎水雷超闘悪鋼) 초과(MA식 동봉E). 포켓몬 종CSV 양방향 통과 |
| 06-21 | THE BEST OF XY (SMXY) | `jp-tcg-SMXY` | JP | 188/188 | ✅ 6필드 완전 일치(무레어도 하이클래스). #187 Yveltal-EX·#188 Shaymin-EX 시크릿 풀아트 2장 **JP 수집완료**(사용자 요청·tcgcollector). KR 로케일 보류(공식 CDN 최상위 시크릿 누락) |
| 06-21 | 20th Anniversary (CP6) | `jp-tcg-CP6` | JP | 103/103 | ✅ **6필드 완전 일치(0 불일치)**, 비동결·읽기전용. C/U/R/RR(EX·MEGA·BREAK 14)/SR(#88–100, 13) 레어도 전부 정상. XY시대 대문자 `EX` 정상(EX→ex 0). DB 변경 없음. (KR `kr-cp6`=113장, JP보다 10장 多 — 별건) |
| 06-21 | 幻·伝説ドリームキラコレクション (CP5) | `jp-tcg-CP5` | JP | 38/38 | 🔧 **레어도 정정**: 본탄 #1–36 가짜 C/U/R(tcgdex 백필) → null. 검증=공식 "そのすべてがキラ"+yuyu-tei(전부 K/キラ 단일·시크릿 #37/38=シークレット). 시스템에 K티어 無→null(시크릿 기존 null과 일관). 공유LC라 JP+KR 동시. 명·번호·단계·타입 38장 일치(완전수집) |
| 06-21 | 冷酷の反逆者 (XY11a) ⚠️라벨정정 | `jp-tcg-XY11a` | JP | 59/59 | ✅ **6필드 완전 일치(0 불일치)**, 비동결·읽기전용. C26/U16/R6/RR6/SR4(#55–58)/UR1(#59) 레어도 정상. BREAK·Restored·복합타입 정상. XY시대 `EX` 정상(EX→ex 0). DB 변경 없음. ★사용자 "XY11-Br" 라벨은 오기 — Br=爆熱=XY11b(볼케니온/하가네르). 리스트 내용=XY11a 「냉혹한 반역자」(JP명덤프 확정) |
| 06-21 | 爆熱の闘士 (XY11b) | `jp-tcg-XY11b` | JP | 58/59 | ✅ 수집된 58장 **6필드 완전 일치**, 비동결·읽기전용. C26/U16/R6/RR6/SR4(#55–58) 레어도 정상. BREAK(피로어/클라위처/제르네아스)·Restored(실드돈)·복합타입 정상. XY시대 `EX` 정상(EX→ex 0). ⚠️ **#059 ボルケニオンEX UR(ハイパーレア) 미수집**(로그만, 🚫#7) — DB max #58. XY11a #59 UR은 수집됐는데 XY11b는 누락. DB 변경 없음 |
| 06-21 | プレミアムチャンピオンパック EX×M×BREAK (CP4) | `jp-tcg-CP4` | JP | 140/140 | ✅ **6필드 완전 일치(0)**, 비동결. 본탄 131 + 기본에너지 9(#132–140) 全수록, 빈번호·중복 0. XY시대 `EX` 정상(EX→ex 0). **레어도 null 유지가 정답**(시크릿 無). 워크플로 4출처 교차검증=무레어도(공식 "すべてがキラカード"·Bulba "no printed rarities"·yuyu-tei 140장 전부 (キラ)·tcgdex 레어도 미제공)→ CP5와 달리 가짜 백필 자체가 없어 정정 불필요. DB 변경 없음 |
| 06-21 | めざめる超王 (XY10) | `jp-tcg-XY10` | JP | 88/88 | ✅ **6필드 완전 일치(0)**, 비동결. C36/U23/R7/RR12/SR9(#79–87)/UR1(#88) 레어도 정상. ★ミノマダム(Wormadam) 3폼 타입 정확(#3 Grass·#37 Fighting·#46 Metal, 同dex413)·지가르데 #40U/#41R·BREAK·Restored(오뮤나이트/카부토/프테라) 정상. XY시대 `EX` 정상(EX→ex 0). DB 변경 없음. ℹ️ KR `kr-xy10`=87(JP−1) — #88 후딘EX UR만 미보유(최상위 UR 시크릿, 별건) |
| 06-21 | BREAKメガバトルデッキ60「メガタブンネEX」 (XYH) | `jp-tcg-XYH` | JP | 27/27 | ✅ **6필드 완전 일치(0)**, 비동결(덱제품 `xy-decks`). 본탄 26 + 기본페어리E(#27) 全수록, 빈번호·중복 0, KR도 27. XY시대 `EX` 정상(EX→ex 0). **레어도 null 유지가 정답** — 덱제품(yuyu-tei TD/S-TD=상점 덱태그, 인쇄 레어도 아님)·Rarity 테이블에 TD티어 無·전 덱셋(mega/sm/xy-decks 30+개) 전부 무레어도 관례 일치. DB 변경 없음 |
| 06-21 | メガバトルデッキ60「ルカリオ」 (XYG) | `jp-tcg-XYG` | JP | 20/20 | ✅ **6필드 완전 일치(0)**, 비동결(덱제품 `xy-decks`). 본탄 19 + 기본闘E(#20) 全수록, 빈번호·중복 0, KR도 20. BREAK(메레시) 정상. XY시대 `EX`(레지록/지가르데) 정상(EX→ex 0). 레어도 null=정답(덱 관례, XYH서 확정). DB 변경 없음 |
| 06-21 | スターターパック20th (20th Anniversary Starter Pack) | **(DB 미수록)** | JP | 0/84 | 🔴 **DB 미수집(수집 누락)** — 대조 불가. 실존 확정(공식 20주년 사이트·torecacamp, 2016 CP6 동시발매, "20th NNN/072" 번호). 시그니처카드 4종(カメックスEX·イマクニ?·77/79장세트·cp6그룹) 전수검색 모두 부재 확인. 구성=본탄72 + 카메 라인 #73–77(5) + 기본E No.78–84(7)=84. 무레어도(스타터). 수집은 별도 패스(사용자 확인 대기). |
| 06-21 | ポケキュンコレクション (CP3) | `jp-tcg-CP3` | JP | 32/32 | ✅ **6필드 완전 일치(0)**, 비동결. C13/U12/RR7 레어도 정상(=리스트 일치). ★CP3는 CP5(전부K)·CP4(무레어도)와 달리 **표준 레어도 보유**(CP6형). 부스터EX·님피아EX 各2장(#6/7·#25/26) 별LC 정상·피카츄#10 RR·M가브GX 정상. XY시대 `EX` 정상(EX→ex 0). JP·KR 32/32. DB 변경 없음 |
| 06-21 | 破天の怒り (XY9) | `jp-tcg-XY9` | JP | 89/89 | ✅ **6필드 완전 일치(0)**, 비동결. C37/U24/R8/RR11/SR8(#81–88)/UR1(#89) 레어도 정상(=리스트). BREAK 3종(닌자령/오롯트/라타령)·★ギャラドスEX 3프린트(#18 RR·#81 SR·#89 UR) 정상. XY시대 `EX` 정상(EX→ex 0). DB 변경 없음. ℹ️ KR `kr-xy9`=88 — #89 갸라도스EX UR만 미보유(최상위 UR, 별건) |
| 06-21 | メガバトルデッキ60「パルキアEX」 (XYF) | `jp-tcg-XYF` | JP | 17/17 | ✅ JP **6필드 완전 일치(0)**, 비동결(덱제품 `xy-decks`). 본탄 16 + 기본水E(#17) 全수록, 빈번호·중복 0. BREAK(골덕) 정상. 레어도 null=정답(덱 관례). 🔧 **KR `kr-xyf` #006 ラプラス(라프라스) 수집완료**(JP 앵커 lc-jp-tcg-XYF-006 부착·공식CDN XYF_006.jpg 시각검증·LC nameKo+CardText 백필, kr 16→17). 이제 KR도 17/17 |
| 06-21 | 青い衝撃 (XY8a) ⚠️라벨"Bb"=青(Blue) | `jp-tcg-XY8a` | JP | 65/65 | ✅ **6필드 완전 일치(0)**, 비동결. C27/U18/R8/RR6/SR5(#60–64)/UR1(#65) 레어도 정상(=리스트). ★ミュウツーEX 3프린트(#25 RR·#62 SR·#65 UR)·オニゴーリEX(#14 RR·#60 SR)·BREAK(조로아크/플라제스) 정상. XY시대 `EX` 정상(EX→ex 0). 사용자 "XY8-Bb"=내용상 XY8a(青い衝撃, JP명덤프 확정; XY8b=赤い閃光는 파라스/브리가론). DB 변경 없음. ℹ️ KR `kr-xy8`=64 — #65 뮤츠EX UR만 미보유 |
| 06-21 | オンバーンBREAKデッキ (SNPo) | `jp-tcg-UBD` | JP | 10/10 | ✅ **6필드 완전 일치(0)**, 비동결(덱제품 `xy-decks`). 名 #1 オンバーン~#10 フウロ 일치, 빈번호 0, 레어도 null=정답(덱). DB 변경 없음. ℹ️ 사용자라벨 "SNPo"=내용상 UBD. KR `kr-ubd`=19장(JP 10장 미니덱과 다른 더 큰 KR 배틀덱 제품: 고오스·조로아·기본E 추가 — 별제품, 갭 아님) |
| 06-21 | ライチュウBREAKデッキ (SNPr) | `jp-tcg-RBD` | JP | 10/10 | ✅ **6필드 완전 일치(0)**, 비동결(덱제품 `xy-decks`). 名 #1 ピカチュウ~#10 フウロ 일치, 빈번호 0, 레어도 null=정답(덱). DB 변경 없음. ℹ️ "SNPr"=내용상 RBD. KR `kr-rbd`=19장(탕구리라인·기본E 추가된 별 KR 제품, 갭 아님) |
| 06-21 | 赤い閃光 (XY8b) ⚠️라벨"Br"=赤(Red) | `jp-tcg-XY8b` | JP | 65/65 | ✅ 63장 6필드 일치+레어도 정상(C27/U18/R8/RR6/SR5/UR1), ★뮤츠EX 3프린트(#27 RR·#62 SR·#65 UR) 정상. **🔍 #16 スターミー·#52 ムクバード 레어도 충돌=리스트 측 C↔U 스왑 오타(DB 정상)**. 워크플로 3출처 검증: **공식 pokemon-card.com 인쇄심볼이 결정적**(Starmie card/31384=ic_rare_c_c=C·Staravia card/31420=ic_rare_u_c=U) → DB(C/U)와 일치, 리스트(U/C)가 반대. 추정원인=진화형 ムクホーク#53가 U라 tcgcollector가 라벨 전치. **DB 변경 없음**(리스트 오타). 사용자 "XY8-Br"=XY8b(赤い閃光). KR `kr-xy8b`=64(#65 UR 미보유) |
| 06-21 | M Master Deck Build Box·Power (MMB-P) | **(DB 미수록)** | JP | 0/49 | 🔴 **DB 미수집(수집 누락)** — 대조 불가. 정체=메가 마스터덱빌드BOX 파워덱(2015, eBay/PriceCharting "Primal Groudon EX 017/049 … MMB" 확정). DB 부재 전수확인: MMB코드·49장세트·47–51장·메가겐가EX(CP4/XY4뿐)·리자몽EX#1(XYA뿐)·박스그룹 모두 음성. 구성=리자몽/겐가/그란돈/루카리오/제르네아스/캥카EX 等 49장 무레어도(빌드박스). 수집은 별도(사용자 확인). ※짝 MMB-S(스피드덱) 있을 수 있음 |
| 06-21 | M Master Deck Build Box·Speed (MMB-S) | **(DB 미수록)** | JP | 0/49 | 🔴 **DB 미수집(수집 누락)** — 대조 불가. MMB-P의 짝 스피드덱(같은 빌드박스 제품). DB 부재 확인: MMB코드·ゲンシカイオーガEX(XY5a/XY7뿐)·ディアルガEX(BW9/XYB뿐)·ジュカイン#3 49장세트 모두 음성. 구성=쥬카인/겐시카이오가/메가라이볼트/이벨타르/디아루가/오롯트EX 等 49장 무레어도. ⇒ **MMB 박스 = P+S 합 98장 전체 미수집**. 수집은 별도(사용자 확인) |
| 06-21 | Emboar-EX vs Togekiss-EX Battle Starter (XYE) | `jp-tcg-XYE` | JP | 26/26 | ✅ 본탄+트레이너 22장 **6필드 완전 일치(0)**, 비동결(덱제품 `xy-decks`). 기본E 4장(#23–26) 全수록, 빈번호 0, KR도 26. 레어도 null=정답(덱). XY시대 `EX`(엔브오/토게키스) 정상(EX→ex 0). DB 변경 없음. ℹ️ 기본에너지 #24/#25 순서만 리스트(Psychic/Lightning)≠DB(雷/超) — DB가 정전(正典) JP 에너지순+덱 포켓몬순 일치=정답, 리스트 표시순 변형(최저우선·무조치) |
| 06-21 | ガイアボルケーノ (XY5/Gaia) | `jp-tcg-XY5` | JP | 80/80 | ✅ **6필드 완전 일치(0)**, 비동결. C32/U23/R9/RR6/SR8(#71–78)/UR2(#79–80) 레어도 정상(=리스트). 겐시그란돈EX(#40/#74)·M보스고도라EX·중복종 다수(쥬카인/마그카르고/토오치 等)·시크릿 정상. XY시대 `EX`(EX→ex 0). 사용자 "XY5-Bg"=ガイアボルケーノ(Gaia). DB 변경 없음(JP). 🔧 **KR XY5 메타 정정완**(아래 XY5a행 참조) |
| 06-21 | タイダルストーム (XY5a/Tidal) | `jp-tcg-XY5a` | JP | 80/80 | ✅ **6필드 완전 일치(0)**, 비동결. C32/U23/R9/RR6/SR8(#71–78)/UR2(#79–80) 레어도 정상(=리스트). 겐시카이오가EX(#32/#73)·M사나이트EX·아오기리의 비장의카드·중복종 다수 정상. XY시대 `EX`(EX→ex 0). 사용자 "XY5-Bt"=タイダルストーム(Tidal). DB 변경 없음(JP). 🔧 **KR XY5 세트 메타 정정**: `kr-xy5g`(가이아) cardCount 0→78·code NULL→XY5; `kr-xy5`(실내용 타이달) 오명 "가이아 볼케이노"→「타이달 스톰」·code XY5→XY5a·releaseDate 1970epoch→2014-12-13. 카드/연결 불변(메타만) |
| 06-21 | ハイパーメタルチェーンデッキ「ディアルガEX+ギルガルドEX」(XYB) | `jp-tcg-XYB` | JP | 20/20 | 🔧 **DB 결함 교정완료**(리스트가 정답이었음). 실제 XYB=20장: 본탄18 + 홀로(キ라)ディアルガEX #19/018 + 기본鋼E #20. 검증=駿河屋·hareruya2·cardrush·tradecard "019/018 디아루가EX[XYB]" 실존 + tradecard 스캔 시각검증(홀로 디아루가 確認). **조치**: ①기본鋼E #19→#20 리넘버(RC/LC id 정합), ②홀로 디아루가EX #19 신규수집(base #4 복제·gameCard gc_76063 공유[refcount2]·이미지 R2재호스팅·레어도 null=덱·리스트와 일치)·species483·CardText(ko), ③cardCount 19→20. 비동결 xy-decks. (별건: jp-tcg-XYB.nameKo "도치마론의 진화" 오기 잔존) |
| 06-21 | ライジングフィスト (XY3) | `jp-tcg-XY3` | JP | 105/105 | ✅ 103장 6필드 일치+레어도 정상(C48/U31/R11/RR6/SR7/UR2). 메가EX 3쌍(헤라크로스/루카리오)·Restored(아마루르가#25·티고라스#58)·중복종·UR 시크릿(#104·#105) 정상. **🔍 #85 アゴの化石(Jaw)·#86 ヒレの化石(Sail) 레어도=리스트 오타(list U vs DB C)**: Amazon SKU PMXY3-085/086-**C**·yuyu-tei "C"·JP/EN(ptcgio)/KR 전부 C 확정 → DB 정답. **DB 변경 없음**. EX→ex 0. KR `kr-xy3`=103(UR #104–105 미보유). (XY8b·XY7·XY4 이은 4번째 리스트 오타) 🔧 **KR 화석 교차배선 교정완**(아래): KR은 화석을 JP/EN과 반대 넘버링(KR#85=지느러미/Fin·#86=턱/Jaw, 정답) — DB가 KR로케일을 JP앵커 LC에 교차로 붙여놨던 것. 이미지(공식KR CDN 효과텍스트 アマルス/チゴラス)+pokemoncard.co.kr로 100%확정 후 LC 재매핑(이름은 KR 정답이라 불변) |
| 06-21 | ファントムゲート (XY4) | `jp-tcg-XY4` | JP | 97/97 | ✅ 96장 6필드 일치+레어도 정상(C40/U30/R12/RR6/SR7/UR2). 메가EX 3쌍(망크릭/겐가/팡파)·말라마EX·플라제스EX·중복종·UR 시크릿(M망크릭#96·M겐가#97) 정상. **🔍 #14 キングラー 레어도=리스트 오타(list U vs DB C)**: 공식 pokemon-card.com card/30485 `ic_rare_c_c`=Common 확정 → DB(JP+EN+KR 전부 C) 정답. **DB 변경 없음**. XY시대 `EX`(EX→ex 0). KR `kr-xy4`=95(UR #96–97 미보유). (XY8b·XY7에 이어 3번째 리스트 오타) |
| 06-21 | メガバトルデッキ60「メガリザードンEX」 (XYA) | `jp-tcg-XYA` | JP | 23/23 | ✅ 본탄+트레이너 21장 **6필드 완전 일치(0)**, 비동결(덱제품 `xy-decks`). 기본E 2장(#22 炎·#23 悪) 리스트와 일치, 빈번호 0, KR도 23. 레어도 null=정답(덱). XY시대 `EX`(리자몽) 정상(EX→ex 0). ★XYB식 홀로 체이스 점검=음성(XYA는 メガバトルデッキ60, XYB의 ハイパーメタルチェーン과 달라 #21초과 홀로 無). DB 변경 없음 |
| 06-21 | イベルタルEX vs ゼルネアスEXデッキ (XYC) | `jp-tcg-XYC` | JP | 25/25 | ✅ 본탄+트레이너 23장 **6필드 완전 일치(0)**, 비동결(덱제품 `xy-decks`). 기본E 2장(#24 悪·#25 フェア리) 리스트와 일치(순서 정상), 빈번호 0, KR도 25. 이벨타르EX(#5/6)·제르네아스EX(#11/12) 別LC 정상. 레어도 null=정답(덱). XY시대 `EX`(EX→ex 0). DB 변경 없음 |
| 06-21 | マグマ団VSアクア団 ダブルクライシス (CP1) | `jp-tcg-CP1` | JP | 34/34 | ✅ **6필드 완전 일치(0)**, 비동결. C14/U12/R6/RR2(#6 아쿠아카이오가EX·#15 마그마그란돈EX) 레어도 정상(=리스트). 마그마단/아쿠아단 전용 포켓몬·트레이너·더블에너지 정상. XY시대 `EX` 정상(EX→ex 0). JP·KR 34/34. DB 변경 없음 |
| 06-21 | 伝説キラコレクション (CP2) | `jp-tcg-CP2` | JP | 27/27 | ✅ **6필드 완전 일치(0)**, 비동결. C12/U3/R10/RR2(#8 피카츄EX·#12 후파EX) 레어도 정상(=리스트). ★CP2는 이름에 "キラ" 있어도 **표준 레어도**(CP3/CP6형) — 자매팩 CP5(ドリームキラ=전부K)와 대조. XY시대 `EX` 정상(EX→ex 0). JP·KR 27/27. DB 변경 없음 |
| 06-21 | バンデットリング (XY7) | `jp-tcg-XY7` | JP | 97/97 | ✅ 96장 6필드 일치+레어도 정상(C37/U24/R9/RR11/SR11/UR5). ★ゴルーグ #35 Psychic·#41 Fighting 타입 정확·중복종(베스파/엔테이/메타그로스 等)·EX 3프린트(RR/SR)·UR 시크릿(겐시카이오가#93·겐시그란돈#94·M레쿠쟈#95) 정상. **🔍 #62 ペルシアン 레어도=리스트 오타(list U vs DB C)**: 공식 pokemon-card.com card/31035 `ic_rare_c_c`=Common 확정 → DB(JP+EN+KR+Card 전부 C) 정답, 리스트 U가 오기. **DB 변경 없음**. XY시대 `EX`(EX→ex 0). KR `kr-xy7`=92(UR 시크릿 #93–97 5장 미보유) |
| 06-21 | エメラルドブレイク (XY6) | `jp-tcg-XY6` | JP | 91/91 | ✅ **6필드 완전 일치(0)**, 비동결. C36/U24/R9/RR9/SR11(#79–89)/UR2(#90–91) 레어도 정상(=리스트). ★チルタリス(Altaria) 2폼 타입 정확(#44 Dragon·#60 Colorless)·중복종 다수(독케일/프리져/네이티/주뱃 等)·M레쿠쟈/M라티오스 等 RR본탄+SR 정상. XY시대 `EX` 정상(EX→ex 0). DB 변경 없음. ℹ️ KR `kr-xy6`=89(UR 시크릿 #90–91 2장 미보유) |
| 06-21 | メガバトルデッキ60「レックウザEX」 (XYD) | `jp-tcg-XYD` | JP | 20/20 | ✅ 본탄+트레이너 18장 **6필드 완전 일치(0)**, 비동결(덱제품 `xy-decks`). 기본E 2장(#19–20) 全수록, 빈번호 0, KR도 20. 레어도 null=정답(덱). XY시대 `EX`(레쿠쟈) 정상(EX→ex 0). 🔍 **기본에너지 #19/#20=리스트 측 스왑 오타(DB 정답)**: 공식 KR이미지 XYD_019.jpg=번개·XYD_020.jpg=불꽃(시각검증)+JP파일명(KAMINARI=#19·HONOO=#20) 모두 **#19 Lightning·#20 Fire=DB와 일치**. 정전/내부ID 휴리스틱(Fire 먼저)은 오판이었고 이미지가 결정적 → **DB 변경 없음**(처음에 "DB 스왑된 듯"이라 했으나 검증 결과 DB 정답·리스트가 오기). 본탄 영향 0 |
| 06-22 | ゼルネアスデッキ30 (X30/Xerneas Deck 30) | `jp-tcg-XY30` | JP | 15/15 | ✅ **6필드 완전 일치(0)**, 비동결(덱제품 `xy-decks`). 본탄 7(プリン~ゼルネアス) + 트레이너 7(きずぐすり~フェアリーガーデン) + 기본フェアリーE(#15) 全수록, 빈번호·중복 0, KR 14/14(에너지 KR無=기본E 정상). 레어도 null=정답(덱). XY시대 EX 없음(EX→ex 0). DB 변경 없음 |
| 06-22 | イベルタルデッキ30 (Y30/Yveltal Deck 30) | `jp-tcg-XY30B` | JP | 15/15 | ✅ **6필드 완전 일치(0)**, 비동결(덱제품 `xy-decks`). 본탄 7(ニューラ~イベルタル) + 트레이너 7(クラッシュハンマー~シャドーサークル) + 기본悪E(#15) 全수록, 빈번호·중복 0, KR 14/14. 레어도 null=정답(덱). ℹ️ #008 크래시해머/#009 슈퍼볼: JP=리스트 일치, KR만 008↔009 번호스왑(정체성 정상=KR 트레이너 재넘버링). DB 변경 없음 |
| 06-22 | コレクションX (XY1a/XY1-Bx) | `jp-tcg-XY1a` | JP | 63/63 | ✅ 62장 6필드 일치, 비동결. C/U/R/RR(EX·MEGA)/SR(#61–63 후시기바나/에어무드/제르네아스EX) 레어도 정상(=리스트). 그리닌자/델케오 진화·복합타입 정상. XY시대 `EX` 정상(EX→ex 0). **🔍 #60 レインボーエネルギー 분류=리스트 오타(list "Trainer" vs DB "Energy")**: 레인보우에너지=특수에너지(supertype Energy) 자명 → DB 정답, 리스트 오기. DB 변경 없음. ℹ️ KR `kr-xy1a`=62 — **#8 ビビヨン(Vivillon) 미수집**(SR 아닌 본탄 Rare 中간갭·별건·수집 보류). 사용자 "XY1-Bx"=コレクションX(XY1a, JP명덤프 확정; XY1b=コレクションY는 비드루/이벨타르 측) |
| 06-22 | コレクションY (XY1b/XY1-By) | `jp-tcg-XY1b` | JP | 63/63 | ✅ **6필드 완전 일치(0)**, 비동결. C/U/R/RR(EX·MEGA)/SR(#61–63 카메/에모/이벨타르EX) 레어도 정상(=리스트). ★ギルガルド(Aegislash) 2프린트(#40 U·#41 R)·진화라인·복합타입 정상. #60 ダブル無色エネルギー 분류=Energy 정상(리스트와 일치, XY1a 레인보우 오타와 대조). XY시대 `EX` 정상(EX→ex 0). JP·KR **63/63 완전수집**(XY1a와 달리 KR 갭 0). DB 변경 없음 |
| 06-22 | XY はじめてセット (HXY/XY0) | `jp-tcg-XY0` | JP | 45/45 | ✅ 본탄 39장 **6필드 완전 일치(0)**, 비동결(덱제품 `xy-decks`). 기본에너지 6종(#40–45) 포함 45 全수록. 진화라인(브리가론/델케오/그리닌자)·#32/#33 トリミアン(Furfrou) 2프린트 정상. 레어도 null=정답(입문세트). EX 없음(EX→ex 0). ℹ️ **기본E 번호=리스트≠DB**(list 040草/041페/042炎/043악/044水/045강 vs DB 040草/041炎/042水/043악/044강/045페): **DB가 정전 타입순(草炎水悪鋼フェア리)=정답**, 리스트 표시순 변형(기본E·파서 스킵·최저우선·무조치). ℹ️ KR `kr-xy0`=본탄 36/39 — **#27 ミルタンク·#28 エネコ·#33 トリミアン(2번째 패턴) 미수집**(별건·수집 보류). DB 변경 없음 |
| 06-22 | XY-P プロモーションカード (XYP/XY프로모) | `jp-tcg-XYP` | JP | **298(하이브리드)** | 🔧 **하이브리드 수집완료(사용자 승인)**: 1차 Limitless 298이 병렬 공식수집(delete-reload)에 덮어써진 뒤, 공식 49 안정화 확인하고 **공식 49 base(불훼손)+Limitless 갭필 249** = **298/298**. enrich: card-text-type→supertype/단계, card-text-title→타입/HP(EX/MEGA/BREAK/Restored 매핑) → **subtype 298/298·type 249(포켓몬 전수)**, **공식 49는 제외**(illustrator·메타 완비, 공식 우선). ★durability: 공식 로더 delete-reload라 XY-P 공식 재수집시 갭필 소멸→`load-xyp-promos.ts`+`load-xyp-meta.ts` 재실행(멱등)으로 복구. 레어도 null=JP프로모 관례. 비동결 og-kr-xy-promo |

**적용한 DB 변경(전부 미커밋):**
- MP1 백필 — 포켓몬 10장(분류+타입+단계) · 트레이너 11장(분류) · Pikachu ex `EX→ex`
- EX→ex subtypes 교정 — MBD #5 메가디안시ex · MBG #3 메가겐가ex · MA #2 Mew ex·#3 Fezandipiti ex·#7 Pidgeot ex·#10 Squawkabilly ex · **SVOD #7 메타그로스ex** · **SVOM #7 마리의오롱털ex** · **SVN #1·2·6·9 ex 4장** · **SVLS #6 파라블레이즈ex** · **SVJL #6 리자몽ex** · **SVHM #11 미라이돈ex·#14 피죤ex**(동결 sv-decks, EX→ex 자동승인) (누계 **10팩 17장**, MC 115장 별도)
- **abyss-eye(M5)** — 시크릿 포켓몬 25장 `types` 백필(본탄 타입 복제: AR 12·SR ex 8·SAR 4·MUR 1)
- **SD100(MC)** — modern ex `EX→ex` **115장** 정규화(EX 0·ex 117)
- **CP5(幻·伝説ドリームキラコレクション)** — 본탄 #1–36 LogicalCard.rarityId C/U/R→**null 정정 36장**(공유LC=JP+KR 동시). 가짜 tcgdex 백필 제거; 실제=K(キラ) 단일이나 시스템 K티어 부재로 null. 시크릿 #37/38은 기존 null 유지(실제 シークレット=Secret Rare — 미반영, 별건). 비동결 og-cp5
- **XYF(파르키아 덱)** — KR `kr-xyf-006 ラプラス(라프라스)` 신규 수집(JP 앵커 lc-jp-tcg-XYF-006 부착·공식CDN XYF_006.jpg·LC nameKo+CardText(ko) 백필·kr-xyf cardCount 16→17). `scripts/collect-kr-xyf-lapras.ts`. 비동결 xy-decks
- **XYB(메탈체인덱) 결함교정** — ①기본鋼エネルギー #19→#20 정합 리넘버(lc-019→lc-020·RC id·번호); ②**홀로 ディアルガEX #19/018 신규수집**(jp-tcg-XYB-019, base #4 lc-004 게임필드 복제·gameCardId gc_76063 공유·species483·CardText(ko)디아루가EX·이미지=tradecard 스캔→R2 `xy-decks/ja/large/jp-tcg-XYB/019.webp`·레어도 null); ③Set.cardCount 19→20. `scripts/fix-xyb-dialga-holo.ts`. 리스트가 정답·DB 결함이었던 첫 사례. 비동결 xy-decks
- **XY3 화석 KR 교차배선 교정** — KR은 두 화석을 JP/EN과 **반대 넘버링**(KR#85=지느러미화석/Fin→아마루스, KR#86=턱화석/Jaw→티고라스; JP는 #85 アゴ/Jaw·#86 ヒレ/Fin). DB가 KR 로케일을 JP앵커 LC에 교차로 붙여 LC가 혼합정체성이었음. **스왑**: `kr-xy3-085`(Fin) cardId lc-085→**lc-086**, `kr-xy3-086`(Jaw) cardId lc-086→**lc-085**; LC nameKo/CardText(ko) 스왑(lc-085→턱화석·lc-086→지느러미화석). 결과 각 LC가 JP/EN/KR 단일정체성. **검증=공식 KR CDN 카드이미지 효과텍스트(アマルス/チゴラス)+pokemoncard.co.kr(BS2014003085)로 100%확정**. 카드명/이미지/KR번호 불변(매핑만). 비동결 og-xy3. (1회용 스크립트 삭제)
- **KR XY5 세트 메타 정정** — `kr-xy5g`(가이아) `cardCount 0→78`·`code NULL→XY5`; `kr-xy5`(실내용=타이달) `name/nameKo 「가이아 볼케이노」→「타이달 스톰」`·`titleCleanKo→타이달 스톰`·`code XY5→XY5a`·`releaseDate 1970epoch→2014-12-13`. Set 메타데이터만(카드·연결 불변). 비동결 og-xy5/og-xy5a. (1회용 fix 스크립트 삭제)
- **M2a(드림ex)** — 본탄 37장 레어도 제거(무레어도화): `Card.rarity` 37 + JP `RegionCard.rarity` 29. EN me2pt5(공유 LC 22)·KR 표시 불변(자체 RC.rarity 보유)
- **M1S** — Shedinja #43·#72 단계 `Basic→Stage 1` 교정(이미지검증 후 승인수정)
- **SV11B(블랙볼트)** — #159–166 **JP `RegionCard.rarityId` `UR(tier8)→SR(tier7)` 교정 8장**(공식=SR 리서치검증). `Card.rarityId`·EN·KR 미변경(EN은 "Ultra Rare"가 정상이라 공유 LC 보존). BWR(#174)은 사용자 지시로 보류.
- **SV6a(나이트원더러)** — #55 Poké Vital A(ポケバイタルA) ↔ #56 Night Stretcher(夜のタンカ) **JP `RegionCard.rarityId` 스왑 교정**(공식: 전자=ACE SPEC·후자=Uncommon인데 DB가 뒤바꿔 적재). 카드명·EN·KR·Card 미변경.
- **SV5a(크림슨헤이즈)** — ACE SPEC/Uncommon 오배정 4 LC를 **`Card.rarity` + JP/EN/KR `RegionCard.rarity` 전 계층 일괄 교정**(3국 동일오류·동일정답): n53 언페어스탬프 `U→ACE` · n59 서바이브깁스 `U→ACE` · n58 러브볼 `ACE→U` · n60 럭키멧 `ACE→U`(n55 하이퍼아로마는 ACE 정상). 실제 SV5a ACE SPEC=언페어스탬프·하이퍼아로마·서바이브깁스 3장. EN(sv6 `sv-twilight-masquerade`)도 동일오류라 함께 교정(두 동결팩 `--allow-protected`). EN/KR 연결·번호·이름 불변. SV11B(JP만)·SV6a(JP만)와 달리 **3국 전부 틀려** 전 계층 교정.

---

## 팩별 상세

### 니힐제로 — `jp-mega-munikisuzero` (M3, JP 117장) ✅
- 5필드 0 불일치. 117/117, 누락·잉여 없음.
- ⚠️ EN링크 갭: #89 Tyrunt(AR, ja=チゴラス). base 정상, AR 1장만 미연결.
- ※ 첫 대조 때 EN(`en-tcg-me3` "Perfect Order" 124장)에 잘못 맞댄 "대량 어긋남"은 region 착오 → **철회**. EN판은 구성·번호 다른 정상 재편성.

### 스타트덱100 코로챠오 — `jp-tcg-MP1` (JP 23장) 🔧
- 이름·번호 23/23 일치. 세트 메타(코드·발매일 2025-12-19·무레어도)도 tcgcollector와 일치.
- 백필 완료: #6 Pikachu ex·#12 Snorlax 외 21장 게임데이터 비어 있던 것 채움(포켓몬 10=분류+타입+단계, 트레이너 11=분류). Pikachu ex `EX→ex`.
- ⚠️ 미완: 트레이너 세부 subtype(Item/Supporter) — 리스트에 구분 없어 보류.
- ℹ️ #21 ガイ ↔ Urbain(현지화명, EN링크 없어 자동확인 불가).

### 스타터세트 메가디안시ex — `jp-tcg-MBD` (JP 22장) ✅
- 5필드 일치, 게임데이터 완비. 🔧 #5 Mega Diancie ex `EX→ex`.

### 스타터세트 메가겐가ex — `jp-tcg-MBG` (JP 22장) ✅
- 5필드 일치, 게임데이터 완비. 🔧 #3 Mega Gengar ex `EX→ex`.

### 메가브레이브 — `jp-tcg-M1L` (M1L, JP 92장, 동결 `mega-brave-symphonia`) ✅
- 5필드 0 불일치 — 레어도 C/U/R/RR·AR·SR·SAR·**MUR**(#92 Mega Lucario ex)까지. 옛 EX 0건. 읽기 전용.
- ⚠️ EN링크 갭: #68 Riolu(AR, ja=リオル). base #28 정상.

### 메가 프로모 — `jp-tcg-M-P` (M-P, JP, 그룹 `og-jp-mega-promo` **동결**) ⚠️
- DB 70 / 리스트 123. 매칭 70장 구조필드(분류·타입·단계) 0 불일치 · 정체성 스폿체크 통과 · 옛 EX 0. DB-only 0.
- ⚠️ **53장 미수집**(아래 부록). dex 미렌더 + `kr-m-p` 재연결 이력 민감구역 → 수집 시 타깃 LC 충돌 선점검.

### 프리미엄 트레이너 박스 MEGA — `jp-tcg-MA` (MA, JP 51장, 그룹 `mega-goods` **동결**) ✅
- DB 51 = 리스트 43장(#1–43) + 기본에너지 8장(#44–51).
- #1–43 이름·번호·단계·타입 전부 일치. **TM 에볼루션(#33)/디볼루션(#34) 순서 JP 정상**(KR `fix-ma-kr-tm-swap`와 별개).
- 🔧 EX→ex 4장: #2 Mew ex · #3 Fezandipiti ex · #7 Pidgeot ex · #10 Squawkabilly ex.
- ⚠️ **DB 초과 8장(#44–51)**: 基本草~鋼 기본에너지. 공식 리스트(/043)엔 없는 박스 동봉 기본E를 우리 소스가 번호 부여한 것. "기본에너지 차이"(우선순위 낮음) — 유지/삭제 결정 대기.

### 메가심포니아 — `jp-tcg-M1S` (M1S, JP 92장, 동결 `mega-symphonia`) ⚠️
- 번호 92/92, 이름·분류·타입·레어도(MUR까지) 전부 일치. EN링크 갭 1(#71 Alakazam, ja=フーディン). 읽기 전용.
- **단계(진화) 충돌 5건 → 실제 카드 이미지로 검증:**
  - #37 Kadabra(ユンゲラー)=`1進化`, #38 Alakazam(フーディン)=`2進化`, #71 Alakazam(AR)=2進化 → **DB 맞음**, **리스트 단계값이 오타**(Basic로 잘못 표시). DB 조치 없음.
  - #43 Shedinja(ヌケニン)=`1進化`(ツチニンから進化), #72 Shedinja(AR)=1進化 → **DB 오류**(subtypes=["Basic"]). 리스트가 맞음. → 🔧 **`["Basic"]→["Stage 1"]` 교정완료**(승인 후).

### 인페르노X — `jp-mega-infernox` (M2, JP 116장, 동결 `mega-infernox`) ✅
- 6필드 0 불일치(읽기 전용). 116(본탄 80 + 시크릿 36) · 1–116 연속 · 누락·중복 0.
- 레어도 `{C 38·U 26·R 8·RR 8·AR 12·SR 17·SAR 6·MUR 1}` — Bulbapedia·리스트와 **완전 동일**. 타입 9구간 일치(Dragon 없음 정상). 옛 EX 0.
- ℹ️ 일부 ex subtypes 순서 `ex|Stage 2`↔`Stage 2|ex` 혼재 — 표시 무영향, 미수정.

### MEGA 드림 ex — `jp-mega-dream-ex` (M2a, JP 250장, 동결 `mega-dream-ex`) 🔧
- 5필드(명·번호·총장수 250·단계·타입) 일치. MA(메가어택레어)=DB `MAR` 10장 일치.
- 🔧 **레어도 — 하이클래스팩 본탄은 무레어도가 정답.** (Bulbapedia가 InfernoX엔 C/U/R 채우는데 M2a 본탄은 전부 `-` → 무레어도 진짜. 리스트 "—"와 일치. ※ Bulba는 출처 신뢰성 교차검증용, 리스트가 비어 어느 쪽인지 못 가릴 때만 사용.)
  - DB가 본탄 37장에 가짜 레어도 부여:
    - **8장** 시크릿 쌍둥이 레어도가 `Card.rarity`에 오적재 — #6/8/11/35/108/132 AR · #150 SAR · #173 SR. (#150 せいなるはい=Sacred Ash 는 쌍둥이도 없는 순수 버그.)
    - **29장** `RegionCard.rarity=C` 오적재(하이클래스 본탄엔 C 없음).
  - → 37 LC `Card.rarity=NULL` + 29 JP `RegionCard.rarity=NULL`. 검증: Bulbapedia 불일치 0(#101 Crobat ex 는 Bulba 누락·DB RR 이 정답). EN me2pt5(공유 LC 22)·KR 표시 불변.

### 닌자스피너 — `jp-mega-ninja-spinner` (M4, JP 120장, 동결 `mega-ninja-spinner`) ✅
- 6필드 0 불일치(읽기 전용). 120(본탄 83 + 시크릿 37) · 1–120 연속. #31–34 Deoxys 4폼 정상.
- 시크릿 84–120 타입까지 채워져 있음(어비스아이 같은 결측 없음). 옛 EX 0.

### 어비스아이 — `jp-mega-abyss-eye` (M5, JP 118장, 동결 `mega-abyss-eye`) 🔧
- 총장수 118 · 1–118 연속 · 카드명(JP↔EN 종 정합) · 진화단계 · 레어도(C/U/R/RR·AR·SR·SAR·MUR) 일치.
- ⚠️→🔧 **타입 결측**: 시크릿 포켓몬 25장(AR #82–93 · SR ex #94–101 · SAR #112–115 · MUR #118)의 `Card.types` 빈 배열 → 같은 이름 본탄에서 복제 백필. 검증: 포켓몬 타입 빈칸 0 · 시크릿=본탄 100% 일치.

### 스타트덱100 배틀컬렉션 — `jp-tcg-MC` (MC, JP 774장, 동결 `mega-start-deck-100`) 🔧
- 총장수 774 = 본탄 742 + 시크릿 743–766 + 기본E 767–774(리스트 No.1000–1007) · 누락·중복 0.
- supertype 653/106/15(Pokémon/Trainer/Energy) = 리스트 일치 · 전 카드 **무레어도**(스타트덱)=리스트 "—"와 일치 · 타입 10구간 일치 · 포켓몬 타입 빈칸 0.
- 🔧 **`EX`(대문자)→`ex` 115장**: modern ex 가 옛 XY 메커니즘 표기 `EX`로 적재(소문자 정상은 2장뿐). 정규화 후 ex 117·EX 0.

### 블랙볼트 — `jp-tcg-SV11B` (SV11B, JP 174장, 동결 `sv-black-bolt-white-flare`) ✅
- 번호 174/174 · 카드명 · 분류 · 타입 · 진화단계 전부 0 불일치(읽기 전용). EN링크 갭 3(JP단독 프린트).
- 레어도 분포 DB `{C 39·U 31·R 10·RR 6·AR(Illustration Rare) 72·UR(Ultra Rare) 8·SAR(Special Illustration Rare) 7·Black White Rare 1}`.
- ⚠️→🔧 **레어도 오류 — 리서치 검증 후 교정완료(공식=SR)**:
  - #159–166(8): DB `Ultra Rare(UR, tier8)`였던 것 = 오류. **공식 = SR(Super Rare)** 확정 → 🔧 **JP `RegionCard.rarityId` `UR→SR` 교정완료**(M1L과 동일 SR 엔티티).
    - 근거: ① snkrdunk(발매정보) "Zekrom ex [SV11B 161/086] **SR**", #169=SAR 명시 ② tcgcollector 리스트 SR·UR 0장 ③ 시크릿 구성 AR72+SR8+SAR7+BWR1=88(UR 자리 없음) ④ 내부정합: M1L·트윈 SV11W 동일등급은 이미 SR.
    - ★`Card.rarityId`·EN/KR RegionCard은 **미변경** — EN판은 같은 풀아트 ex를 "Ultra Rare"로 부르는 게 정상이라 공유 LC 보존(지역별 레어도 체계 차이).
  - #174 Zekrom ex: 리스트 `BWR` ↔ DB `nameEn="Black White Rare"`(정확) + abbr `R`(cosmetic). **사용자 지시로 보류(유지).**

### 화이트플레어 — `jp-tcg-SV11W` (SV11W, JP 174장, 동결 `sv-white-flare`) ✅
- SV11B(블랙볼트)의 트윈 세트. 번호 174/174 · 카드명(JP 스폿검증: #1 クルミル=Sewaddle·#16 クイタラン=Heatmor·#17 レシラムex=Reshiram ex·#62 サザンドラex=Hydreigon ex…) · 단계 · 타입 전부 **0 불일치**(읽기 전용).
- 레어도 분포 DB `{C 38·U 32·R 11·RR 6·AR 72·SR 8·SAR 7}`. 리스트와 173/174 일치.
  - ✅ **#159–166 SR 정상**(DB=SR=리스트=공식). **트윈 SV11B의 UR 오적재(M11)가 여기엔 없음** — 쌍둥이 세트가 서로 다르게 수집됨(SV11B만 UR 오류).
  - ⚠️ **#174 Reshiram ex(BWR)**: 리스트 `Black White Rare` ↔ DB abbr `R`·category `Holo Rare`. **SV11B #174보다 부정확**(SV11B는 nameEn="Black White Rare" 보유, SV11W는 BWR 정체성 자체가 없음). cosmetic·1장·동결 → 보류(BWR 손볼 때 SV11B와 함께).
- ℹ️ EN(`rsv10pt5` 173장)은 **번호 체계가 JP와 다름**(#16–18에 Litwick→Lampent→Chandelure 라인 삽입 등, 173≠174) → EN-번호 직접대조는 무의미(region 착오, **철회**). 동결 EN/KR 연결이 매핑 담당, JP 앵커 기준 정합.

### 로켓단의 영광 — `jp-sv-destined-rivals` (SV10, JP 132장, 동결 `sv-destined-rivals`) ✅
- **★ JP 전용 대조(사용자 지시) — EN 세트 미조회.** 6필드 전부 **0 불일치**(읽기 전용).
- 132/132 · 1–132 연속 · 누락·중복 0. 단계 0·타입 0·레어도 0 불일치.
- 카드명 JP 스폿검증: #1 クヌギダマ=Pineco · #15 ロケット団のファイヤーex=Team Rocket's Moltres ex · #39 ロケット団のミュウツーex=Team Rocket's Mewtwo ex · #55 レジロックex=Regirock ex · #75 ザマゼンタ=Zamazenta · #132 ジャミングタワー=Jamming Tower.
- 레어도 분포 DB `{C 47·U 33·R 10·RR 8·AR 12·SR 13·SAR 6·UR 3}` = 리스트와 완전 동일.
  - ✅ **#130–132 UR 정상**(DB=UR=리스트). **SV10은 UR 실제 사용 세트** — SV11B의 "UR 오적재"와 달리 여기 UR은 진짜. (M11: 세트별 UR 사용여부가 실제 다르다는 증거.)

### 열풍의 아레나 — `jp-sv-heatwave-arena` (SV9a, JP 92장, **동결**) ✅
- **★ JP 전용 대조(사용자 지시).** 5필드(명·번호·단계·타입·레어도) 전부 **0 불일치**(92/92, 1–92 연속, 누락·중복 0). EN링크 갭 2(JP단독).
- 레어도 분포 DB abbr `{C·U·R·RR·AR·SR·SAR·UR}` = 리스트와 완전 동일.
  - ✅ **#76–84 SR · #85–89 SAR · #90–92 UR 전부 정상**(DB=리스트). **SV9a는 SR·UR 둘 다 쓰는 정상 SV 체계** — DB가 이 세트는 SR/UR을 올바로 구분해 적재(SV11B의 UR 오적재와 대조 → M11 "세트별 개별 검증" 근거 보강).
- 트레이너 관(Ethan's/Cynthia's/Misty's/Arven's …) 카드명·Ogerpon 4가면폼 전부 정합.

### 스타터세트ex 다이고 — `jp-tcg-SVOD` (SVOD, JP, **동결 sv-decks**) ✅
- **★ JP 전용 대조.** DB 21 = 리스트 19장(#1–19) + 기본에너지 2장(#20–21: 基本超·基本鋼).
- #1–19 이름(JP↔EN: ダイゴ=Steven)·번호·단계·타입 전부 **0 불일치**. #19 시크릿 Steven's Beldum 포함.
- 🔧 #7 ダイゴのメタグロスex(Steven's Metagross ex) subtypes `["Stage 2","EX"]→["Stage 2","ex"]`.
- ⚠️ **DB 초과 2장(#20–21)**: 덱 동봉 기본E(초·강철). 공식 /018엔 없음 — "기본에너지 차이"(MA #44–51과 동일, 우선순위 낮음, 유지/삭제 결정 대기).

### 스타터세트ex 마리 — `jp-tcg-SVOM` (SVOM, JP, 동결 `sv-decks`) ✅
- **★ JP 전용 대조(EN 미조회).** DB 21 = 리스트 20장(#1–20) + 기본에너지 1장(#21: 基本悪).
- #1–20 이름(JP↔EN: マリィ=Marnie·オーロンゲ=Grimmsnarl·モルペコ=Morpeko·チョロネコ=Purrloin)·번호·단계·타입·레어도(전부 무레어도) **0 불일치**. #20 시크릿 マリィのモルペコ 포함.
- 🔧 #7 マリィのオーロンゲex(Marnie's Grimmsnarl ex) subtypes `["Stage 2","EX"]→["Stage 2","ex"]` 교정(동결 sv-decks 승인수정).
- ⚠️ **DB 초과 1장(#21)**: 덱 동봉 기본E(悪/Darkness). 공식 /019엔 없음 — "기본에너지 차이"(MA #44–51·SVOD #20–21과 동일, 우선순위 낮음, 유지/삭제 결정 대기).
- ※ 트윈 SVOD(다이고 메타그로스ex 스타터)와 완전 동일 패턴(#7 EX→ex + 동봉 기본E 초과).

### 강화박스 배틀파트너즈 — `jp-tcg-SVN` (SVN, JP, 동결 `sv-goods`) ✅
- **★ JP 전용 대조(EN 미조회).** "배틀 강화 BOX 「배틀파트너즈」". DB 53 = 리스트 45장(#1–45) + 기본에너지 8장(#46–53: 基本草~鋼).
- #1–45 이름(JP↔EN: ミュウ=Mew·キチキギス=Fezandipiti·ピジョット=Pidgeot·イキリンコ=Squawkabilly·ワザマシン=Technical Machine)·번호·단계·타입·레어도(전부 무레어도) **0 불일치**.
- 🔧 ex 4장 `EX→ex`: #1 ミュウex · #2 キチキギスex · #6 ピジョットex · #9 イキリンコex (동결 sv-goods 승인수정).
- ⚠️ **DB 초과 8장(#46–53)**: 덱 동봉 기본E(草~鋼). 공식 /045엔 없음 — "기본에너지 차이"(MA #44–51·SVOD·SVOM과 동일, 우선순위 낮음, 유지/삭제 결정 대기).

### 배틀파트너즈 — `jp-sv-journey-together` (SV9, JP 132장, **동결** `sv-journey-together`) ✅
- **★ JP 전용 대조.** 5필드(명·번호·단계·타입·레어도) 전부 **0 불일치**(132/132, 1–132 연속, 누락·중복 0). EN링크 갭 1(JP단독). **읽기 전용(변경 0).**
- 레어도 분포 abbr `{C·U·R·RR·AR·SR·SAR·UR}` = 리스트 완전 동일. **#113–123 SR · #124–129 SAR · #130–132 UR 전부 정상** — SV9도 SR·UR 둘 다 쓰는 정상 세트(DB 정확).
- 트레이너 관(N's·Iono's·Lillie's·Hop's·Brock's·Iris's) 카드명·Ogerpon 없음·#34 Mr. Mime 등 전부 정합. 옛 EX 0.

### 랜덤 스타트 덱 Generations — `jp-tcg-SVM` (SVM, JP, 동결 `sv-start-deck-generations`) ✅
- **★ JP 전용 대조(EN 미조회).** DB 183 = 리스트 175장(#1–175) + 기본에너지 8장(#176–183: 基本草~鋼).
- #1–175 이름(JP 스폿: ナゾノクサ=Oddish·バシャーモex=Blaziken ex·ザシアンex=Zacian ex·ルギアex=Lugia ex·からておうの稽古=Black Belt's Training·セラピーエネルギー=Therapeutic Energy)·번호·단계·타입·레어도(전부 무레어도) **0 불일치**. 중복카드(Black Belt's Training #143–151 ×9·Professor's Research #162–170 ×9)도 번호별 정합.
- ✅ **ex 전부 소문자 `ex` 정상 — EX→ex 불필요**(SVOD/SVOM/SVN과 달리 이 세트는 올바르게 수집됨). **읽기 전용(변경 0).**
- ⚠️ **DB 초과 8장(#176–183)**: 덱 동봉 기본E(草~鋼). 공식 /175엔 없음 — "기본에너지 차이"(MA·SVN·SVOD·SVOM과 동일, 우선순위 낮음, 유지/삭제 결정 대기).

### 테라스탈페스ex — `jp-sv-prismatic-evolutions` (SV8a, JP 237장, **동결** `sv-prismatic-evolutions`) ✅
- **★ JP 전용 대조. 하이클래스팩.** 5필드 전부 **0 불일치**(237/237, 1–237 연속, 누락·중복 0). **읽기 전용(변경 0).**
- 🔑 **레어도 — 본탄 비-ex 144장 = `None`(무레어도) 엔티티로 올바르게 적재**(M2a 드림ex식 가짜 C/U/R 버그 **없음**). 분포 `{None 144·RR 35·SAR 33·SR 12·ACE 8·UR 5}` = 리스트 "—"/RR/ACE/SR/SAR/UR 카운트 완전 동일.
- **이름검증 강화(종 CSV 폴백)**: EN링크 갭 101장 = 포켓몬 80 + 트레이너/E 21. 포켓몬 80장은 `pokedexNumbers`→`data/pokeapi/pokemon_species_names.csv`(lang1 ja-hrkt·9 en·3 ko)로 **EN명 80/80 해결 + 종-ja명⊆카드ja 자기검증 80/80 통과** → 이름 확정. 잔여 미검증은 **트레이너 21장**(종표 밖, Crispin·Janine's Secret Art 등 SR/SAR)뿐, 번호·등급 정합해 구조적 정상.
- ℹ️ EN RegionCard 링크 자체는 여전히 101장 비어 있음(영문명 폴백용) → 링크 보강은 별도 과제(M2). 단 **대조 검증은 종CSV로 충족**.

### 초전브레이커 — `jp-sv-surging-sparks` (SV8, JP 138장, 동결 `sv-surging-sparks`) ✅
- **★ JP 전용 대조(EN 미조회).** 5필드(명·번호·단계·타입·레어도) 전부 **0 불일치**(138/138, 1–138 연속, 누락·중복 0). **읽기 전용(변경 0).**
- 레어도 분포 DB `{C 52·U 34·R 9·RR 8·ACE 3·AR 12·SR 11·SAR 6·UR 3}` = 리스트 완전 동일. **ACE SPEC(#95·97·98)·UR(#136–138) 정상 적재**(SV11B식 UR 오류 없음).
- ex 전부 소문자 `ex` 정상(EX→ex 불필요). JP명 스폿: タマタマ=Exeggcute·ピカチュウex(RR/SR/SAR/UR 4종)·スクランブルスイッチ=Scramble Switch.

### 스타터세트 파라블레이즈ex — `jp-tcg-SVLS` (SVLS, JP, 동결 `sv-decks`) ✅
- **★ JP 전용 대조(EN 미조회).** "스타터 세트 테라스탈타입:스텔라 「파라블레이즈 ex」". DB 25 = 리스트 22장(#1–22) + 기본에너지 3장(#23–25: 基本炎·超·鋼).
- #1–22 이름(JP↔EN: ロコン=Vulpix·ソウブレイズ=Ceruledge·シンボラー=Sigilyph·パーフェクトミキサー=Brilliant Blender·アカマツ=Crispin)·번호·단계·타입·레어도(전부 무레어도) **0 불일치**.
- 🔧 #6 ソウブレイズex(Ceruledge ex) subtypes `["Stage 1","EX"]→["Stage 1","ex"]` 교정(동결 sv-decks 승인수정).
- ⚠️ **DB 초과 3장(#23–25)**: 덱 동봉 기본E(炎·超·鋼 = 덱 타입 3종). 공식 /022엔 없음 — "기본에너지 차이"(MA·SVN·SVOD·SVOM과 동일, 우선순위 낮음, 유지/삭제 결정 대기).
- ※ 스타터세트ex 계열(SVOD·SVOM)과 동일 패턴(#대표ex EX→ex + 동봉 기본E 초과).

### 스텔라미라클 — `jp-sv-stellar-crown` (SV7, JP 135장, 동결 `sv-stellar-crown`) ✅
- **★ JP 전용 대조(EN 미조회).** 5필드(명·번호·단계·타입·레어도) 전부 **0 불일치**(135/135, 1–135 연속, 누락·중복 0). **읽기 전용(변경 0).**
- 레어도 분포 DB `{C 48·U 34·R 9·RR 8·ACE 3·AR 12·SR 12·SAR 6·UR 3}` = 리스트 완전 동일. **ACE SPEC(#94·96·101)·UR(#133–135) 정상 적재**(SV11B식 UR 오류 없음).
- ex 전부 소문자 `ex` 정상(EX→ex 불필요). JP명 스폿: レディバ=Ledyba·テラパゴスex(RR/SR/SAR/UR 4종)·きらめく結晶=Sparkling Crystal.

### 나이트원더러 — `jp-sv-shrouded-fable` (SV6a, JP 94장, 동결 `sv-shrouded-fable`) 🔧
- **★ JP 전용 대조(EN 미조회).** 명·번호·단계·타입 **0 불일치**(94/94, 1–94 연속, 누락·중복 0). EX(대문자) 0. JP명 스폿: バチュル=Joltik·モモワロウex=Pecharunt ex(RR/SR/SAR/UR 4종).
- 🔧 **레어도 스왑 2장 교정**: #55 ポケバイタルA(Poké Vital A)=공식 **ACE SPEC**인데 DB가 `U`, #56 夜のタンカ(Night Stretcher)=공식 **Uncommon**인데 DB가 `ACE` → **둘이 뒤바뀜**. 카드명·위치는 정상, JP `RegionCard.rarityId`만 서로 스왑돼 있던 것 → 교정(승인수정). 나머지 ACE(#54·63)·UR(#92–94) 정상.
- ℹ️ DB의 ACE SPEC 레어도 엔티티(`yeo2gb`)는 code="ACE SPEC Rare"인데 category가 "Ultra Rare"(ultra_rare)로 묶임 — 전 ACE 카드 공통(전역 택소노미), 이 버그와 무관·미변경.

### 배틀마스터덱 테라스탈리자몽ex — `jp-tcg-SVJL` (SVJL, JP, 동결 `sv-decks`) ✅
- **★ JP 전용 대조(EN 미조회).** "배틀 마스터 덱 「테라스탈 리자몽 ex」". DB 22 = 리스트 21장(#1–21) + 기본에너지 1장(#22: 基本炎).
- #1–21 이름(JP↔EN: ヒトカゲ=Charmander·かがやくリザードン=Radiant Charizard·リザードンex=Charizard ex·アルセウスVSTAR=Arceus VSTAR)·번호·**단계(Arceus V=`Basic|V`·VSTAR 정상)**·타입·레어도(전부 무레어도) **0 불일치**.
- 🔧 #6 リザードンex(Charizard ex) subtypes `["Stage 2","EX"]→["Stage 2","ex"]` 교정(EX→ex 자동승인).
- ⚠️ **DB 초과 1장(#22)**: 덱 동봉 기본E(炎). 공식 /021엔 없음 — "기본에너지 차이"(MA·SVN·SVOD·SVOM·SVLS와 동일, 우선순위 낮음).

### 크림슨헤이즈 — `jp-sv-crimson-haze` (SV5a, JP 96장, 동결 `sv-crimson-haze`) 🔧
- **★ JP 전용 대조(EN 미조회).** "스칼렛&바이올렛 강화확장팩 「크림슨헤이즈」". 본탄 66 + 시크릿 30 = 96/96. JP명 확인(モンジャラ=Tangela·カイロス=Pinsir·ガチグマ アカツキex=Bloodmoon Ursaluna ex).
- 카드명(포켓몬 종CSV 양방향: EN리스트↔dex·dex↔JP자기검증 전부 통과)·번호·총장수·진화단계·타입 **0 불일치**. ex 표기도 전부 소문자 정상(EX→ex 불필요).
- 🔧 **ACE SPEC/Uncommon 오배정 4 LC 전 계층 교정**(M11): 실제 SV5a ACE SPEC은 #53 언페어스탬프·#55 하이퍼아로마·#59 서바이브깁스 3장. DB는 #53·#59를 U로, #58 러브볼·#60 럭키멧을 ACE로 뒤바꿔 적재 → `Card.rarity`+JP/EN/KR `RegionCard.rarity` 전부 교정. #55는 ACE 정상.
  - **3국 동일 오류**: EN(sv6 Twilight Masquerade)·KR도 같은 값이 틀려, SV11B/SV6a(JP만 오류)와 달리 전 계층 일괄. 두 동결팩(`sv-crimson-haze`+`sv-twilight-masquerade`) `--allow-protected`. 연결·번호·이름 불변, rarityId만.
  - KR(`kr-sv5a`)은 트레이너 번호가 가나다 재배열(KR#53=Enhanced Hammer=JP#54 등)이나 **LC 연결은 정체성 정확** — 번호 재배열은 정상.

### 스타터덱&빌드세트 미래의 미라이돈ex — `jp-tcg-SVHM` (SVHM, JP, 동결 `sv-decks`) 🔧
- **★ JP 전용 대조(EN 미조회), pack-list-check 스킬 첫 적용.** "スターターデッキ＆ビルドセット「未来のミライドンex」". DB 61 = 리스트 53(#1–53) + 동봉 기본E 8장(#54–61: 草炎水雷超闘悪鋼). JP명 확인(ネオラントV=Lumineon V·マナフィ=Manaphy·テツノカイナ=Iron Hands·ミライドンex).
- 카드명(포켓몬 종CSV 양방향)·번호·총장수·진화단계·타입 **0 불일치**. **덱 제품이라 전 카드 무레어도**(리스트 `—`=DB null, 일치).
- 🔧 #11 ミライドンex(Miraidon ex)·#14 ピジョットex(Pidgeot ex) subtypes `EX→ex`(자동승인).
- ⚠️ **DB 초과 8장(#54–61)**: 덱 동봉 기본E. "기본에너지 차이"(MA·SVN·SVOD·SVOM·SVLS·SVJL 동일, 우선순위 낮음).
- ℹ️ **엔진 보강**: 덱 리스트 전체 `—`(무레어도)에 대해 리스트 `—`/빈값 ↔ DB 양 계층 null을 "무레어도 일치"로 정규화하도록 `compare-list.ts` 갱신(허위 53건 방지). sv5a 회귀검증 0.

### THE BEST OF XY — `jp-tcg-SMXY` (SMXY, JP 186장) ✅
- **타깃 확정**: 그룹 `sm-best-of-xy` — JP `jp-tcg-SMXY`(186)·KR `kr-smxy`(186)·EN 없음(아시아 한정, 정상). JP명 앞8(ナゾノクサ~ミツハニー)·뒤8(ギルガルドEX~フレア団のしたっぱ) 리스트와 정렬 확인.
- **6필드 대조(compare-list.ts)**: 리스트 188행 ↔ JP 186장 → **이슈 0**. 카드명(종CSV 양방향)·번호·총장수(171)·진화단계·타입·레어도 전부 일치. **본탄 전체 무레어도**(리스트 `—`=DB 186장 전부 null, 하이클래스팩 관례, M2a/MC 동형).
- **EX 표기**: XY 시대라 대문자 `EX`가 정답(modern ex 아님) → EX→ex 0.
- ✅ **시크릿 2장 수집완료(06-21, 사용자 명시 요청 — 🚫#7 별도 패스)**: #187 イベルタルEX(Hasuno)·#188 シェイミEX(TOKIYA). `scripts/collect-smxy-187-188.ts`로 base 본탄(#079/#106)의 게임필드 복제 + gameCardId 공유(#172↔#013 동형) + species/CardText(ko)/이미지(tcgcollector, 시각검증). 무레어도(set 관례). JP만; KR 로케일은 공식 CDN(pokemonkorea)이 최상위 시크릿(SMXY_187/188.png) 누락(415)이라 이미지 미확보 → 보류(미발매 판정 단독근거 아님). Set.cardCount JP 186→188.
- **DB 변경**: jp-tcg-SMXY 에 LogicalCard/CardLocale 2쌍 신규 생성(비동결 `sm-best-of-xy`). 본탄·기존 시크릿 매핑 불변.

### 20th Anniversary — `jp-tcg-CP6` (CP6, JP 103장) ✅
- **타깃 확정**: 그룹 `og-cp6`(비동결) — JP `jp-tcg-CP6`(103)·KR `kr-cp6`(113). JP명 앞8(フシギバナEX~モンジャラ)·뒤8(ピジョットEX~ロケット団参上!) 리스트와 정렬 확인.
- **6필드 대조(compare-list.ts)**: 리스트 103행 ↔ JP 103장 → **이슈 0**. 카드명(종CSV 양방향)·번호·총장수(87)·진화단계·타입·레어도 전부 일치.
- **레어도 분포(SQL 재검)**: Common 30·Uncommon 32·Rare 14·Double Rare 14(EX/MEGA/BREAK)·Super Rare 13(#88–100) = 103. 무레어도 마스킹 없음(0 이슈 진성).
- **EX 표기**: XY 시대 대문자 `EX` 정답 → EX→ex 0. BREAK는 JP RR(Double Rare) 정상.
- **DB 변경 없음**(0 이슈). 미수집 0 — 시크릿 SR·특수카드(#101 ナッシー·#102 イマクニ?のドードー·#103 ロケット団参上!)까지 전부 수집됨.
- ℹ️ KR `kr-cp6`=113장(JP보다 +10) — KR 전용 추가분 추정. 본 점검(JP 기준) 범위 밖, 별건 관찰만.

| # | 패턴 | 관측 | 해결방향 |
|---|---|---|---|
| M1 | **modern ex 가 옛 `EX` 로 라벨** | MP1·MBD·MBG·MA·SVOD·SVOM·SVN·SVLS·SVJL 15장 + **MC(SD100) 115장** = **10팩 130장**(전부 교정함, EX→ex는 자동승인) | 전 세트 일괄 스윕: SV/메가 + 이름 소문자 "ex"로 끝나는 카드 `EX→ex`(옛 진짜 EX 시대 제외) |
| M2 | **AR 시크릿 EN 정체성 링크 누락** | me3 #89 Tyrunt · M1L #68 Riolu | EN 페어 LC 연결(영문명 폴백 복구) |
| M3 | **JP 스타트덱/프로모 게임데이터 결측** | MP1(21/23 비었던 상태, 백필함) | 리스트/공식 기준 백필 |
| M4 | **프로모 그랩백 미수집** | M-P 70/123 | Limitless JP 수집 패스 |
| M5 | **덱/박스 동봉 기본에너지 초과수집** | MA #44–51 · SVN #46–53 · SVOD #20–21 · SVOM #21 · SVLS #23–25 · SVJL #22 · **SVHM #54–61** · SVM #176–183 | tcgcollector 미표시 동봉 기본E — 유지/삭제 정책 결정(우선순위 낮음) |
| M6 | **DB 진화단계(subtypes) 오류** | M1S Shedinja #43·#72 (Basic→Stage1, 이미지검증) | 개별 교정(동결이라 승인 후) |
| M7 | **리스트(tcgcollector JP) 단계값 오타** | M1S Kadabra·Alakazam(#37·#38·#71) Basic 오표시 | 리스트 측 오류 — DB 조치 없음, 대조 시 주의 |
| M8 | **시크릿 포켓몬 `types` 결측** | M5 어비스아이 25장(AR/SR ex/SAR/MUR) | 본탄에서 복제 백필(교정함). 닌자스피너(M4)는 정상 |
| M9 | **하이클래스팩 본탄에 가짜 레어도** | M2a 37장(`Card.rarity` 8 + `RegionCard.rarity=C` 29) | 무레어도화(교정함). **다른 MEGA 하이클래스팩 전반 의심** |
| M10 | **레어도는 RegionCard.rarity ?? Card.rarity 폴백** | M2a — RC=NULL이면 LC값이 표시(공유 LC라 지역별 다른 레어도 함정) | 인쇄본별은 RC.rarity, 수정 시 EN/KR RC.rarity 채워졌는지 확인 후 LC 손댐 |
| M11 | **레어도 오적재(세트 수집 오류)** | ① SV11B #159–166: 공식 SR인데 DB가 UR로 적재(리서치 검증완·교정, **JP만**). **트윈 SV11W는 SR 정상**. #174 BWR cosmetic. ② **SV6a #55↔#56 레어도 스왑**(Poké Vital A=ACE↔Night Stretcher=U 뒤바뀜·교정, **JP만**). ③ **SV5a ACE SPEC 4건 오배정**(#53·59 U→ACE, #58·60 ACE→U): **JP/EN/KR+Card 전부 동일오류** → 전 계층 교정. | 리스트+공식 대조로 건건 검증 후 교정. 오류 범위가 **JP만**(SV11B·SV6a)일 수도 **3국 전부**(SV5a)일 수도 있으니 RC 전 계층 확인. **SV 레어도 오류는 SV11B·SV6a·SV5a 3건**(나머지 SV7·SV8·SV8a·SV9·SV9a·SV10·SV11W 정상) |

---

## 부록: M-P 미수집 53장

> 리스트 자체도 052·077~084·128~130 결번. 목표 총량 123장.

- **#53–65 (13)** 트레이너/GX/특수E: Arven · Dedenne-GX · Spiritomb · Bunnelby · Special Charge · Trainers' Mail · Battle Compressor · VS Seeker · Field Blower · Float Stone · Plumeria · Parallel City · Double Dragon Energy
- **#87–94 (8)** 기본에너지 블록 (풀~강철) *(우선순위 낮음)*
- **#101–127 (27)** 스타터 포켓몬 프로모(1~9세대): Bulbasaur · Charmander · Squirtle · Chikorita · Cyndaquil · Totodile · Treecko · Torchic · Mudkip · Turtwig · Chimchar · Piplup · Snivy · Tepig · Oshawott · Chespin · Fennekin · Froakie · Rowlet · Litten · Popplio · Grookey · Scorbunny · Sobble · Sprigatito · Fuecoco · Quaxly
- **#131–132 (2)** Pikachu ex ×2
- **#500–502 (3)** Victory Symbol (No.500~502)

---

## 사용자 결정 대기
1. **M-P 53장 수집** 여부(또는 핵심 45만 / 워크리스트만).
2. **[M1] EX→ex 전수 스윕** 실행 여부(현재는 점검한 팩만 개별 교정).
3. **MP1 트레이너 세부 subtype** 채우기.
4. **[M2] AR EN링크 갭** 일괄 점검.
5. **[M5] MA 기본에너지 8장(#44–51)** 유지 vs 삭제.
6. ~~[M6] M1S Shedinja #43·#72 단계 교정~~ → ✅ 완료(이번 세션).
7. **[M9] 다른 MEGA 하이클래스팩 무레어도 점검** — M2a 같은 가짜 레어도(`Card.rarity`/`RegionCard.rarity=C`) 적재 여부 전수 확인.
8. **[M1] EX→ex 전수 스윕에 MC 포함** — SD100에서 115장 추가 확인됨(이미 교정). 잔여 세트 일괄 스윕 검토.
9. ~~[M11] SV11B #159–166 UR→SR 교정~~ → ✅ 완료(이번 세션, JP RegionCard 8장).
10. **[M11-BWR] BWR cosmetic 보류 중** — 사용자 지시로 미교정. 나중에 일괄: SV11B #174 abbr `R`→`BWR`, **SV11W #174는 category까지 `Holo Rare`→`Black White Rare`로 더 손봐야 함**.
