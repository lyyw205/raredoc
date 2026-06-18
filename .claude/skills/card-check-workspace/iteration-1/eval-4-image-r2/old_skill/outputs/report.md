# card-check 진단 — 스칼렛ex 도감 클레스퍼트라 KR 이미지 깨짐

## 한 줄 결론 (4분면)

⚠️ DB 있음 / 실존함 — 데이터(이미지 자산) 의심. 카드 행과 KR 이미지 URL은 정상이고 R2 객체도 HTTP 200으로 존재하지만, 클레스퍼트라(kr-sv1s #037)의 KR R2 이미지만 최적화 안 된 원본 마스터(868×1212 인터레이스 PNG, 1.91 MB)로 올라가 있다. 같은 세트의 다른 카드는 전부 400×558 비인터레이스(~380~430 KB)로 리사이즈돼 있다. 이 단일 객체가 도감 그리드(lazy-load <img>)에서 디코드 실패/지연으로 "깨져서 안 뜨는" 증상을 낸다.

## 대상 카드 식별

- logicalCardId: lc-orphan-jp-tcg-SV1S-037
- setGroup: sv-base (스칼렛 ex), primaryNumber 037, dex 956 (Espathra)
- 로케일:
  - KR: kr-sv1s-37 / set kr-sv1s / number 037 / 클레스퍼트라
  - JP: jp-tcg-SV1S-037 / クエスパトラ (정상, .webp)
  - EN: sv1-103 / Espathra (정상)

스칼렛ex(sv-base) setGroup 안에 클레스퍼트라는 이 한 장뿐이라 변형/중복 혼동은 아니다.

## 진단 (근본 원인)

1. DB에 저장된 KR 이미지 URL 자체는 정상이고 R2 객체도 존재(200)한다. → URL 오타·404·패딩 불일치가 아니다.
2. 같은 세트(kr-sv1s) 1~90번 전수 스캔 결과 #037만 유일하게 >700 KB 아웃라이어(1.91 MB). 나머지는 전부 ~380~430 KB.
3. 객체 바이트 검증: #037 R2 객체 = 868×1212, 8-bit RGBA, 인터레이스 PNG. 이웃(#038) R2 객체 = 400×558, 비인터레이스. → #037만 리사이즈/최적화 단계를 안 거친 원본.
4. 한국 공식 원본(cards.image.pokemonkorea.co.kr/.../SV1S/SV1S_037.png)과 비교: md5 완전 일치(8bf8978f...). 즉 #037의 R2 객체는 공식 원본 마스터(868×1212, 1.91 MB)를 그대로 미러한 것. 손상·잘못된 카드 그림이 아니라 "최적화 안 된 원본"이 올라간 것.
5. 대조적으로 #038은 공식 원본이 868×1212(1.98 MB)인데 R2에는 400×558(388 KB)로 들어가 있다 → 세트는 한때 400×558로 일괄 최적화됐고, #037만 이후에 원본에서 다시 백필되며 최적화본을 1.9 MB 인터레이스 마스터로 덮어썼다.
6. 메커니즘 정황: scripts/backfill-kr-images-r2.ts는 404/NULL 객체를 공식 원본에서 받아 리사이즈 없이 raw buffer 그대로 small/large 양쪽에 업로드한다(주석에 "과거 R2 백필이 일부 카드를 깨뜨림" 명시). #037이 과거 어느 시점에 404였다가 이런 raw 재업로드로 복구되면서 최적화본이 사라진 것으로 보인다.

왜 "안 뜨나": 객체는 유효 PNG라 직접 열면 디코드는 되지만, 도감은 Next/Image가 아닌 순수 <img loading="lazy" decoding="async">(DexCatalog.tsx)로 렌더한다. 그리드에서 1.9 MB 인터레이스(Adam7) PNG는 디코드 비용이 크고 lazy 디코드 예산을 초과해 깨진 이미지 상태로 표시되기 쉽다(다른 카드 대비 ~5배 바이트 + 인터레이스).

## 실행한 명령 / 확인 내용

스킬 번들 스크립트는 스냅샷 경로가 원본보다 2단계 깊어 ../../../../src/lib/prisma import가 깨졌다. DB 소스 파일을 수정하지 않기 위해 임시 심볼릭 링크 .claude/skills/src -> ../../src 만 만들어 모듈 해석을 맞추고, 작업 후 제거했다(레포 추적 파일 무변경, git status 확인).

```
# 1) DB 1차 검색 (스냅샷 스크립트)
npx tsx .claude/skills/card-check-workspace/skill-snapshot/card-check/scripts/search-card.ts "클레스퍼트라" --limit 30
#  → sv-base #037 (kr-sv1s-37) 외 8행, 종 dex 956

# 2) 해당 카드 전 로케일 이미지 URL 조회 (스냅샷 scripts 디렉터리에 임시 _tmp_img.ts 두고 실행 후 삭제)
#  KR imageSmall/Large = .../kr-sv1s/ko/{small,large}/kr-sv1s/37.png  (언패딩 37.png)

# 3) R2 객체 존재/헤더 확인 (read-only HEAD)
curl -I .../kr-sv1s/ko/small/kr-sv1s/37.png      # 200, image/png, 1,910,516B
curl -I .../kr-sv1s/ko/small/kr-sv1s/037.png     # 404 (패딩본은 없음 — 저장 URL이 정답)
curl -I .../jp-tcg-SV1S/ja/small/jp-tcg-SV1S/037.webp  # 200 (대조군, 15KB)

# 4) 이웃 카드 34~40 small vs large 헤더 비교
#  → 세트 전체 small==large(동일 ETag)가 정상 규약, 이웃은 380~435KB

# 5) kr-sv1s large 1~90 크기 아웃라이어 스캔
#  → #037만 1.91MB 아웃라이어, 누락(non-200) 없음

# 6) 바이트 검증 (다운로드 후 file/PNG IHDR)
file kr37.png  # 868x1212 RGBA interlaced
file kr38.png  # 400x558 RGBA non-interlaced

# 7) 공식 한국 원본과 대조
curl -s https://cards.image.pokemonkorea.co.kr/data/wmimages/SV/SV1S/SV1S_037.png -o src37.png
md5sum kr37.png src37.png   # 동일 → R2 객체 = 공식 원본 마스터 그대로
# #036 R2=400x558(410KB)/원본 868x1212, #037 R2=868x1212(1.91MB)=원본, #038 R2=400x558(388KB)/원본 868x1212
```

확인된 자산 사실:
- KR #037 R2 객체: image/png, 1,910,516 B, ETag 8bf8978f8aa9b6cf028019990053363a, small/large 동일 객체.
- 한국 공식 원본 #037과 md5 동일 → 손상·오등록 아님, 미최적화 원본.
- 세트 내 유일 아웃라이어. 패딩 mismatch 아님(저장 URL 37.png가 실제 존재하는 키).
- 렌더 경로: src/lib/cards/dex-catalog.ts가 DB imageSmall/imageLarge를 그대로 전달, src/components/dex/DexCatalog.tsx가 순수 <img>로 출력(URL 재구성·패딩 없음).

## 권장 수정 (READ-ONLY 평가라 미실행 — 했어야 할 일)

DB는 손댈 필요 없다(URL 정확). R2 객체만 정상 카드들과 동일 규격으로 교체하면 된다.

1. 공식 원본 SV1S_037.png를 받아 다른 카드와 동일하게 400×558 비인터레이스 PNG로 리사이즈/최적화(sharp resize(400,558), interlace 끄기)한 뒤,
2. 같은 두 키에 덮어쓰기 업로드(small=large 규약 유지):
   - kr-sv1s/ko/small/kr-sv1s/37.png
   - kr-sv1s/ko/large/kr-sv1s/37.png
   - content-type image/png.
3. 교체 후 curl -I로 두 키가 200 + 크기 ~400 KB대(인터레이스 해제)인지, file로 400×558 non-interlaced인지 재검증.

주의: 기존 scripts/backfill-kr-images-r2.ts는 (a) 404/NULL만 대상이라 200인 #037을 건드리지 않고, (b) 리사이즈 없이 raw 업로드라 그대로 쓰면 또 1.9 MB 인터레이스 마스터를 올린다. 따라서 이 케이스는 그 스크립트로 고치면 안 되고, 리사이즈 단계를 포함한 교체가 필요하다(또는 그 스크립트에 sharp 리사이즈를 추가). 동일 패턴(과거 404→raw 백필로 복구된 카드)이 다른 KR 세트에도 있을 수 있으니, 세트별 large 객체 크기 아웃라이어(>700 KB) 스캔으로 동종 케이스를 함께 점검할 것을 권장.

## 비고 — 스킬 운영 메모

- 스냅샷 번들의 search-card.ts는 import 경로(../../../../src/lib/prisma)가 원본 스킬 위치 기준이라, 더 깊은 스냅샷 경로에서 그대로 실행하면 MODULE_NOT_FOUND가 난다. 임시 심링크로 우회했고 작업 후 제거함.
- 이번 제보는 "존재 확인"이 아니라 "KR 이미지 깨짐"이라, 스킬의 표준 4분면 워크플로에 더해 R2 객체 자산 자체(HTTP 상태·바이트·치수·공식 원본 대조)를 검증하는 단계가 핵심이었다.
