# 팩 점검 — SM 프로모·특수 (sm0 / smp / sma / kr-sm-promo)

> 감사 + 안전수정 + 이슈로그. 점검 2026-06-01.

| setGroup | setId(region) | loaded | 상태 |
|---|---|---:|---|
| og-sm0 | jp-tcg-SM0(JP) | 4 | 피카츄와 새로운 친구들. JP 4장 단독, KR 없음 → namu 비대상. ko 미충전(JP명) |
| og-smp | en-tcg-smp(EN) | 251 | SM Black Star Promos(EN전용). ko 247(기존, pokeapi) — 건강. cardCount 250 vs 251 경미 |
| og-sma | en-tcg-sma(EN) | 94 | Hidden Fates: Shiny Vault(EN전용). ko 84(기존) |
| **sm-best-of-xy**(신설) | **kr-smxy(KR)** | 186 | **「THE BEST OF XY」** — ✅ og-sma에서 **분리 완료**(P8 해결). namu 정본화(ko 186/186, rarity 0) |
| og-kr-sm-promo | kr-promo(KR) | 258 | KR SM 프로모(번호 1~336, 78 누락). 프로모는 namu 단일표 부재 → **ko 보류**(PokeAPI 폴백 후보) |

## 주요 이슈
1. **[P8] kr-smxy(THE BEST OF XY) 오그룹** — XY-era 컴필레이션이 SM 히든페이츠 그룹에 들어있음. 별도 setGroup(또는 XY)으로 분리 검토. ko는 namu「THE BEST OF XY」(188행)로 정본화 완료(#1 뚜벅쵸/#186 플레어단의 조무래기). rarity 0(namu 표 레어도 없음).
2. **og-kr-sm-promo ko 보류** — KR 프로모 258장, namu 카드목록 페이지 부재. PokeAPI 종족명 폴백 or pokemoncard.co.kr 필요.
3. **og-sm0 JP 단독** — KR 미발매, namu 비대상.

## 출처
- kr-smxy: 나무위키「THE BEST OF XY」(2026-06-01).
- smp/sma(EN): pokemontcg.io(기존).
