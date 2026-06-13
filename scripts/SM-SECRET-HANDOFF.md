# SM-era 시크릿 일러 수집 — 세션 핸드오프

다른 세션(로컬/Claude Code Web/예약 원격 에이전트)에서 이 작업을 이어가기 위한 단일 참조 문서.
**진행상태의 단일 출처는 DB** — 어느 세션이든 아래 갭 쿼리로 "어디까지 됐는지" 자동 판정. 별도 상태파일 불필요.

## 작업 정의
각 SM-era 팩의 **현재 max 번호를 초과하는 시크릿(HR 무지개 / UR 골드 / SR)** 을 수집한다.
이 시크릿들은 **본문 카드의 alt-art 재록** → 게임데이터는 본문과 동일, **번호·레어도·일러스트만 다름**.

## 파이프라인 (팩당, 순서)
1. **누락확인**: jpSet 의 현재 max 번호 확인. 채울 카드 = max 초과 시크릿(= 제공된 일러 URL 수).
2. **식별**: 일러 URL을 도감순으로 각각 다운로드+**Read(눈으로)** → 카드에 인쇄된 번호(예 "SM12 109/095")·JP명·레어도(HR/UR/SR) 직독.
3. **일러제외 수집**: 각 카드의 JP명으로 jpSet 내 본문 카드 매칭 → 게임필드 복제(supertype/subtypes/types/hp/retreatCost/weakness/resistance/regulationMark/pokedexNumbers/rules/flavorText/abilities/attacks/legalities/evolvesFrom/evolvesTo/gameCardId/nameKo). LogicalCard `lc-orphan-{jpSet}-{num}` + JP RegionCard `{jpSet}-{num}` 생성(illustrator=null, 이미지 null 단계).
4. **일러연결**: 위에서 본 URL을 imageSmall=imageLarge 로 채움.
5. **EN/KR 매핑**: 이 하이클래스팩 시크릿은 거의 JP 단독(EN/KR엔 동일 alt-art 프린트 없음). 본문 카드의 EN/KR은 *별개 물리 프린트*라 시크릿 LC에 붙이지 않는다. 우리 DB에 동일 시크릿 프린트가 실재할 때만 연결.

## 공통 가드 (매 변경)
- `assertWritable([cardPackId], {allow: hasAllowProtectedFlag()})` — SM팩은 비동결이라 플래그 없이 통과.
- dry-run → --apply, 멱등 upsert, `$transaction`.
- 검증: jpSet 카운트 +N, 신규 번호 전수 존재(이미지·레어도 일치), **다른 팩 행 손실 0**(PK 기준 — 공유 Supabase라 전역 카운트는 동시쓰기로 변동하니 per-pack/PK로 검증).

## 레퍼런스 스크립트 (그대로 복제)
- `scripts/collect-sm12a-secrets.ts` (본문 게임데이터 복제 패턴)
- `scripts/fill-sm12a-secret-images.ts` (이미지 채우기 패턴)
- 웨이브1 산출물: `scripts/collect-sm11b-secrets.ts`, `scripts/collect-sm10b-secrets.ts` 등

## 레어도 ID
- HR (Hyper Rare): `cmpp4wysu0016yjurcnv0ys4l`
- UR (Ultra Rare): `cmpp4wyzt001wyjuriy5esk1h`
- SR (Super Rare): `cmpp4wyyk001ryjurevrx3dq0`
- 그 외: `prisma.rarity` 에서 code 로 조회.

## 팩 목록 / 상태 (cardPackId | jpSet | 현재max)
### ✅ 완료 (웨이브1)
- 얼터제네시스 `og-sm12` `jp-tcg-SM12` 108→117 (+9)
- 드림리그 `og-sm11b` `jp-tcg-SM11b` 68→75 (+7)
- 리믹스바우트 `og-sm11a` `jp-tcg-SM11a` 73→80 (+7)
- 스카이레전드 `og-sm10b` `jp-tcg-SM10b` 62→69 (+7)
- 더블블레이즈 `og-sm10` `jp-tcg-SM10` 107→116 (+9)
- 풀메탈월 `og-sm9b` `jp-tcg-SM9b` 62→69 (+7)

### ⬜ 남음 (웨이브2+) — 일러 URL은 사용자가 팩별로 제공
- 미라클트윈 `og-sn11` `jp-tcg-sn11` max106  ※ID가 sn(=sm 오타). KR=kr-sm11
- GG엔드 `og-sn10a` `jp-tcg-sn10a` max62  ※ID가 sn. KR=kr-sm10a
- 나이트유니즌 `og-sm9a` `jp-tcg-SM9a` max63
- 태그볼트 `og-sm9` `jp-tcg-SM9` max109
- 울트라샤이니 `og-sm8b` `jp-tcg-SM8b` max243
- 버스트임팩트 `og-sm8` `jp-tcg-SM8` max103
- 번개스파크 `og-sm7a` `jp-tcg-SM7a` max66
- 페어리라이즈 `og-sm7b` `jp-tcg-SM7b` max56
- 창공의카리스마 `og-sm7` `jp-tcg-SM7` max104
- 챔피언로드 `og-sm6b` `jp-tcg-SM6b` max77
- 드래곤스톰 `og-sm6a` `jp-tcg-SM6a` max59
- 금단의빛 `og-sm6` `jp-tcg-SM6` max102
- 울트라포스 `og-sm5+` `jp-tcg-SM5+` max56
- 울트라문 `og-sm5m` `jp-tcg-SM5M` max72
- 울트라썬 `og-sm5s` `jp-tcg-SM5S` max72
- GX배틀부스트 `og-sm4+` `jp-tcg-SM4+` max120
- 각성의용사 `og-sm4s` `jp-tcg-SM4S` max55
- 초차원의침략자 `og-sm4a` `jp-tcg-SM4A` max55
- 빛나는전설 `og-sm3+` `jp-tcg-SM3+` max77
- 어둠을밝힌무지개 `og-sm3h` `jp-tcg-SM3H` max57
- 빛을삼킨어둠 `og-sm3n` `jp-tcg-SM3N` max57
- 알로라의햇빛 `og-sm2k` `jp-tcg-SM2K` max55
- 알로라의달빛 `og-sm2l` `jp-tcg-SM2L` max55
- 썬&문 `og-sm1+` `jp-tcg-SM1+` max63  ※URL 15장(10jpg+5webp, webp=기본에너지 가능)
- 문컬렉션 `og-sm1m` `jp-tcg-SM1M` max66
- 썬컬렉션 `og-sm1s` `jp-tcg-SM1S` max66

### ⚠️ 특수 — 별도 처리
- 새로운시련 `og-sm2+` `jp-tcg-sm2+` max61 — **기존 에너지(#058~061) 도감번호 불일치**. 단순 시크릿 추가 아님 → 번호 정합 작업 필요.

## 웨이브1에서 발견된 후속 처리거리 (별건)
1. **스카이레전드 #68 トキワの森(UR Stadium)**: 게임필드 비어있음(supertype/subtypes만). SM9 #91 또는 SM12a #165 トキワの森(동일 게임카드)에서 백필 필요.
2. **SM11a #59/#60 에너지 선재버그**: ドローエネルギー↔ウィークガードエネルギー 의 gameCardId+nameKo 가 swap됨(본문). 별도 교정 권장.
3. **SM10 #83 炎の結晶 본문 LC nameKo='자박자박피켈'(오류, 불꽃결정이어야)**: 선재 버그. 별도 교정 권장.
4. 스타디움 시크릿 다수는 in-pack 본문이 없어 동일 gameCardId의 타세트에서 복제함(#117/#75/#79/#115/#69 등) — 정본이지만 차후 일러감사 시 재확인 권장.

## 남은 작업 자동 탐지 (새 세션에서)
각 jpSet 의 RegionCard max numberInt 가 위 "현재max" 와 같으면 미수집(시크릿 0), 크면 일부/전부 완료.
정확히는 해당 팩 일러 URL 개수 vs (현재 jpSet max − 원래 max) 로 판정.

## 새 세션에서 이어가기
1. 이 문서를 읽는다.
2. 사용자에게서 다음 팩(들)의 일러 URL을 받는다(또는 사용자가 붙여넣음).
3. 위 파이프라인대로 팩별 병렬 처리(워크플로 또는 개별 에이전트). 비동결이라 --allow-protected 불필요.
4. 검증 후 보고. DB가 진행상태를 보유하므로 중복 안전(멱등).
