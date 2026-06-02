# 팩 점검 · 출처 기록 — KR 소드&실드 프로모 (kr-s-p)

> 점검 깊이: **감사 + 이슈로그**. **KR 프로모 그랩백** — 정본화 보류. SWSH #39 (마지막).

- **setGroup**: `og-kr-swsh-promo` · era S (소드·실드) · 프로모

## 점검 결과
| region | setId | loaded | cardCount |
|---|---|---:|---:|
| KR | `kr-s-p` | 182 | 182 ✓ |

- **placeholder名(ASCII) + 게임데이터 전무**(hp 0·rarity 0·illustrator 0·flavor 0·attacks scalar) · ko 0.
- **번호 비연속**(1~202208, 날짜코드형 202208 등 혼재) → 단일 세트 번호체계 아님.

## 남은 이슈 — **정본화 불가(전용 재수집 필요)**
- 나무위키에 KR SWSH 프로모 **단일 수록표 부재**(프로모는 흩어져 있음) → `sync-pack-namu-ko.ts` 번호 매칭 비적용.
- [P9] **pokemoncard.co.kr 개별 프로모 재수집** 필요(이름·이미지·레어도) → 전용 프로모 수집 패스 대상.
- [P15/P5/P6] 게임데이터·provenance 전무.

## 출처
| 데이터 | 출처 | 상태 |
|---|---|---|
| KR 프로모 정본 | pokemoncard.co.kr 개별 (전용 패스) | ⏳ 미수집 |
