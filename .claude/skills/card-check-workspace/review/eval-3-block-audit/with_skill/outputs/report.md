# card-check 보고 — 메가드림ex 「유리나팔」 KR 연결 점검

## 한 줄 결론

**유리나팔(Glass Trumpet / ガラスのラッパ)은 메가드림ex(jp-mega-dream-ex / kr-m2a)에서 올바르게 연결돼 있다.** 두 장 모두 JP↔EN↔KR 정체성이 일치하고, KR 공식·KR 이미지까지 교차 검증해 어긋난 곳이 없다. → **4분면: ✅ 정상 (DB 있음 · 실존함)**. 교정/--apply 불필요.

단, 같은 블록에서 **사전(`TR_JA2KO`) 미등록 2건**(`Ｎのポイントアップ` 전각 Ｎ)이 감사 사각지대로 남아 있다 — 이번 카드와는 무관하나 재발 방지 차원의 사전 보강을 권장(아래 "권장 후속" 참조, READ-ONLY라 미적용).

## 진단 분기 판정 (kr-trainer-alignment.md 1단계)

트레이너/아이템 KR 정합 제보이므로 일반 워크플로가 아닌 `references/kr-trainer-alignment.md` 절차를 따랐다. 세 갈래를 모두 배제:

| 갈래 | 증상 | 이번 케이스 |
|---|---|---|
| ① lcid 오연결(블록 스크램블) | JP 옆에 다른 정체성 KR이 붙음 | ❌ 해당 없음 — lcid 안에서 JP/EN/KR 동일 카드 |
| ② build-group 페이지 교차 (krMirrorAll 누락) | lcid는 맞는데 페이지에서만 KR 교차 | ❌ 해당 없음 — config에 `krMirrorAll: true` 존재(build-group.ts:171), 빌드 JSON도 정합 |
| ③ KR 이미지 깨짐(R2/원본 부재) | 빈칸/엑박 | ❌ 해당 없음 — KR 이미지 둘 다 HTTP 200 |

## 증거

### 유리나팔 두 장 (모두 정상)

| | JP | EN(다리) | KR | 비고 |
|---|---|---|---|---|
| 일반 | jp-mega-dream-ex #149 ガラスのラッパ | me2pt5 #189 Glass Trumpet | kr-m2a **#154** 유리나팔 | lcid `lc-orphan-jp-mega-dream-ex-149` |
| SR | jp-mega-dream-ex #215 ガラスのラッパ (SR) | me2pt5 #260 Glass Trumpet (SR) | kr-m2a **#216** 유리나팔 (슈퍼 레어) | lcid `lc-orphan-jp-mega-dream-ex-215` |

- EN 다리(전역 고정·최고 신뢰)가 두 장 모두 "Glass Trumpet"으로, KR "유리나팔"·JP "ガラスのラッパ"와 동일 정체성을 확증.
- KR 공식(pokemoncard.co.kr) 검색에서 유리나팔이 M2a에 정확히 **#154, #216** 으로 수록 확인 → DB 저장 번호·이름과 100% 일치 (번호 스왑/순환 함정 없음).

### 블록 전단사 감사 (오링크 0)

`audit-kr-trainers.ts --jp jp-mega-dream-ex --kr kr-m2a` (dry-run):
```
### jp-mega-dream-ex / kr-m2a  JP트레이너·E 60 · KR 60 · 오링크 0
  [JP 사전미등록 2] JP#146 Ｎのポイントアップ(EN:N's PP Up) · JP#214 Ｎのポイントアップ(EN:N's PP Up)
총 오링크 0 · 사전갭 2 (dry-run)
```
- 오링크 0 → 사전으로 환산 가능한 모든 트레이너/에너지는 전단사 정합.
- 사전갭 2건은 **유리나팔이 아니라 「N의 포인트업」**(전각 Ｎ가 `TR_JA2KO`에 미등록). 이 갭이 "오링크 0"의 신뢰도를 떨어뜨리므로, 사전 폴백 스크램블이 숨어있지 않은지 **EN 다리로 블록 전체를 직접 교차검증**해 확정함(아래).

### EN 다리 전수 교차검증 (43장, 미스매치 0)

EN 로케일이 있는 트레이너/아이템 43장에 대해 EN명→기대 KR명을 대조 → **미스매치 0**. 「N의 포인트업」 두 장(JP#146→KR#146, JP#214→KR#214)도 EN-bridged로 정합이라, 사전갭은 순수 사전 커버리지 문제이며 실제 오연결은 아님을 확인.

### build-group 페이지 레벨 (group-mega-dream-ex.json)

빌드된 그룹 JSON에서 유리나팔 2엔트리 모두 jp/en/kr이 같은 카드로 묶임:
- `jp-mega-dream-ex-149` + `en-tcg-me2pt5-189` + `kr-m2a-154` (이미지 `MEGA/M2a/M2a_154.png`)
- `jp-mega-dream-ex-215`(SR) + `en-tcg-me2pt5-260` + `kr-m2a-216`(슈퍼 레어) (이미지 `MEGA/M2a/M2a_216.png`)

## 실행한 명령 (전부 READ-ONLY · --apply 없음)

```bash
# 1. DB 1차 검색
npx tsx .claude/skills/card-check/scripts/search-card.ts "유리나팔" --limit 30

# 2. 블록 전단사 감사 (dry-run)
npx tsx .claude/skills/card-check/scripts/audit-kr-trainers.ts --jp jp-mega-dream-ex --kr kr-m2a

# 3. 블록 JP↔EN↔KR lcid 덤프 + 4. EN 다리 전수 교차검증
#    (레포 루트에 임시 진단 .ts 작성→실행→삭제. DB 무변경, 조회 전용. 작업 후 rm 으로 정리)

# 5. build-group config 확인 (krMirrorAll 존재 여부)
grep -n "mega-dream-ex\|krMirrorAll" scripts/build-group.ts

# 6. 빌드된 그룹 JSON에서 유리나팔 엔트리 확인
node -e '... src/data/group-mega-dream-ex.json 에서 Glass Trumpet/유리나팔 추출 ...'

# 7. KR 이미지 존재 확인
curl -sI MEGA/M2a/M2a_154.png  -> HTTP 200
curl -sI MEGA/M2a/M2a_216.png  -> HTTP 200

# 8. KR 공식 교차검증 (pokemoncard.co.kr AJAX)
curl -s -X POST "https://pokemoncard.co.kr/v2/ajax2_dev2" \
  -H "X-Requested-With: XMLHttpRequest" -H "Referer: https://pokemoncard.co.kr/cards" \
  -H "Origin: https://pokemoncard.co.kr" -H "User-Agent: Mozilla/5.0" \
  -F "action=search_text_cards" -F "search_text=유리나팔" \
  -F "search_params=all" -F "limit=0"
#  -> M2a #154, M2a #216 으로 유리나팔 수록 확인 (DB와 일치)
```

## 권장 후속 (이번엔 미적용 — READ-ONLY)

유리나팔 자체는 교정 불필요. 다만 블록 위생을 위해 (다른 작업에서) 다음을 권장:

1. `scripts/lib/trainer-names-jako.ts`(`TR_JA2KO`)에 **`Ｎのポイントアップ`(전각 Ｎ) -> `N의 포인트업`** 추가. EN 다리 `N's PP Up`로 짝이 확정됨. (※ `Ｎの城`은 이미 환산됨 — 미등록인 것은 「포인트업」뿐.) 전각/반각 Ｎ 주의.
2. 보강 후 `audit-kr-trainers.ts --jp jp-mega-dream-ex --kr kr-m2a` 재실행 -> **사전미등록 0 · 오링크 0** 멱등 확인.
3. 커밋 대상은 사전 파일 + (영향 시) 재빌드 group JSON. DB 재배정은 이번 케이스에 없음(오링크 0).

이 보강은 유리나팔과 무관하며, "오링크 0"의 사각지대를 없애 향후 블록 감사의 신뢰도를 높이기 위한 것이다.

## 제보에 대한 답

"유리나팔이 엉뚱한 카드에 연결된 것 같다" — **확인 결과 오연결 아님.** 메가드림ex의 유리나팔 일반(#149/JP, #154/KR)·SR(#215/JP, #216/KR) 두 장 모두 JP·EN·KR이 동일 카드로 올바르게 묶여 있고, KR 공식 수록 번호·이미지까지 DB와 일치한다. 같은 팩 트레이너 블록 전체(60장)도 전단사 정합(오링크 0)이라 인접 카드 스크램블도 없다.
