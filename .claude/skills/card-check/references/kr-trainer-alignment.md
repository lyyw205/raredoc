# KR 트레이너/아이템 정합 감사 (트레이너·도구·스타디움·에너지 오연결 진단·교정)

트레이너/아이템 카드의 KR 표기가 "이상하다/바뀐 것 같다"는 제보를 받았을 때의 전용 플레이북.
2026-06 한 세션에서 같은 버그 패밀리로 6개 세트 80여 장을 교정하며 정립한 절차다.

## 핵심 통찰 — 한 장 제보는 보통 블록 전체 스크램블의 빙산의 일각

KR 한국판은 트레이너/도구를 **한글 가나다순**으로 재정렬해 번호를 매긴다(JP 五十音 순서와 무관).
DB 연결은 `apply-kr-official` 이 만드는데, 이건 비포켓몬 카드를 **JA→KO 이름 사전(`scripts/lib/trainer-names-jako.ts`의 `TR_JA2KO`)** 으로 정체성 매칭한다.
사전에 그 세트 이름이 **하나라도 빠져 있으면** 번호 폴백으로 떨어지고, 가나다 블록이 연쇄로 어긋나
**트레이너/도구 블록 전체가 통째로 스크램블**된다. 그래서 사용자가 1장(예: "낚싯대MAX")을 제보해도
실제로는 34~50장이 어긋나 있을 수 있다. **절대 제보된 한 장만 고치지 말고 블록 전체를 전단사로 감사하라.**

## 1단계 — 진단 분기: "KR이 이상하다"의 세 갈래

먼저 무엇이 잘못됐는지 분류한다. 셋은 고치는 곳이 다르다.

| 증상 | 원인 | 고치는 곳 |
|---|---|---|
| JP 옆에 **다른 정체성**의 KR 이름/일러가 붙음 | DB lcid 오연결(스크램블) | 이 문서 — 블록 전단사 재링크 |
| DB lcid 는 맞는데 **페이지에서만** KR이 교차 | build-group 번호-zip 버그 | `scripts/build-group.ts` 의 `krMirrorAll` 누락(§46) |
| KR 이미지가 **깨짐(빈칸/엑박)** | R2 객체 부재(정체성 정상) | R2 백필 — 아래 "R2 이미지" 절 |

구분법: `search-card.ts` 로 그 카드의 lcid 를 읽어 JP/EN/KR 로케일을 같이 본다.
- lcid 안에서 JP명·EN명·KR명이 **다른 카드**면 → lcid 오연결(1번).
- lcid 는 동명끼리 맞는데 도감페이지(group JSON)에서만 어긋나면 → build-group(2번). 이때 `scripts/build-group.ts`에서 그 그룹에 `krMirrorAll: true`가 있는지 확인(없으면 추가가 해법 — kr 카드 전수가 JP lcid 공유인지 먼저 검증).
- 이미지만 안 뜨면 → R2.

## 2단계 — 블록 전단사 감사 (오연결 의심 시)

번들 스크립트로 그 세트의 트레이너/에너지 전체를 한 번에 본다. **레포 루트에서:**

```bash
npx tsx .claude/skills/card-check/scripts/audit-kr-trainers.ts --jp <jpSetId> --kr <krSetId>
# 여러 팩: --pairs "jp-tcg-SVN:kr-svn,jp-sv-destined-rivals:kr-sv10"
```

출력 해석:
- `✗ JP#... ← 정답 KR#...` = 오연결. EN 다리가 있으면 (EN:이름)으로 표시돼 그 자리에서 정체성이 확증된다.
- `[JP 사전미등록]` / `[KR 미환산]` = `TR_JA2KO` 에 없는 이름. **이게 남아 있으면 그 카드들은 감사 사각지대** —
  사전 폴백 스크램블의 원흉이자, 감사가 그 쌍을 못 보는 맹점. 반드시 3단계로 보강 후 재감사.
- `오링크 0` + 미등록 0 = 그 블록 정상.

세트 ID 를 모르면 `scripts/build-group.ts` 의 config(그룹키 → `jp:[...]` / `kr:[...]`)에서 찾는다.

## 3단계 — 사전 보강 (미등록이 있으면)

미등록 이름마다 JP↔KR 짝을 만들어 `TR_JA2KO` 에 추가한다. 짝 짓는 권위 순서:

1. **EN 다리** — 감사 출력의 `(EN:...)` 또는 `search-card`/ptcg.io 의 EN명. EN명은 전역 고정이라 가장 신뢰도 높다.
   (예: JP `つりざおMAX` → EN `Max Rod` → KR `낚싯대MAX`.)
2. **캐릭터 한일 대응** — 서포트는 캐릭터 KR 정식명(예 ミツル=Wally=민진, ホミカ=Roxie=보미카, アンズ=Janine=도희).
3. **리터럴/음차** — 스타디움·도구는 직역(N의 성, 그래비티 마운틴 등).

추가 후 **반드시 재감사**해서 `미등록 0` + 완전 전단사(JP n/n · KR n/n)인지 확인한다. 사전이 완성되면
오연결이 전부 드러난다. ⚠ **`Ｎ`(전각) vs `N`(반각) 처럼 같아 보이는 글자가 세트마다 다를 수 있다** — 미환산이 안 풀리면 의심.

## 4단계 — EN無 쌍은 이미지로 직접 판정 (적용 전 필수)

전단사는 이름→이름 매핑이라, **사전 짝이 틀려도 "성공"한다.** EN 다리가 없는 캐릭터/스타디움 변경 쌍은
적용 전에 JP/KR 카드 이미지를 받아 **같은 카드(같은 일러·효과)인지 눈으로** 확인한다. 이게 최종 권위다.

```bash
# JP 이미지는 webp 인 경우가 있어 Pillow 로 변환 후 Read
python3 -c "from PIL import Image; Image.open('jp.webp').convert('RGB').save('jp.png')"
```

동명+동일일러 함정(§47): 같은 이름·같은 일러스트레이터의 카드 2장(예: 博士の研究 ×2 = Sada/Turo)은
이름·일러·nameKo·번호감사 **전부 무력** — 오직 카드 이미지의 **부제/교수명**(올림박사/투로박사)으로만 가른다.

## 5단계 — 교정·검증·커밋

```bash
# 적용(오연결만 재배정 + 해당 JP의 nameKo=KR명). 사전·이미지 검증을 끝낸 뒤에만.
npx tsx .claude/skills/card-check/scripts/audit-kr-trainers.ts --jp <jp> --kr <kr> --apply
npx tsx scripts/build-group.ts <groupId>           # 영향 그룹 재빌드
npx tsx .claude/skills/card-check/scripts/audit-kr-trainers.ts --jp <jp> --kr <kr>   # 멱등 재감사 → 오링크 0
```

커밋 대상: `scripts/lib/trainer-names-jako.ts`(사전, **재발 방지의 핵심**) + 재빌드된 `src/data/group-*.json` +
`docs/verification/source-registry.md` 기록. DB 변경(locale 재배정)은 repo 산출물이 없으니 사전·빌드JSON·레지스트리로 남긴다.

## 운영 함정·메모

- **동명 세트 주의**: 「배틀파트너즈」가 SVN 덱박스(`jp-tcg-SVN`)와 SV9 본탄(`jp-sv-journey-together`) 둘 다 존재.
  제보 세트를 set ID 까지 특정하라. 둘 다 점검이 안전.
- **Prisma**: 인라인 쿼리는 `import { prisma } from "<레포루트>/src/lib/prisma"` (Prisma 7.x — `@prisma/client` 직접 import 는 `.prisma/client/default` 못 찾음). **레포 루트에서 실행**.
- **필드명**: 이미지 컬럼은 `imageSmall`/`imageLarge`(`image` 아님). KR region 값은 **`"KR"`**(`"KO"` 아님).
- **연결풀**: 쿼리를 빠르게 연달아 돌리면 `max clients reached`(pool 15). 잠시 후 재시도.
- **R2 이미지(깨짐)**: KR 이미지는 pokemonkorea 원본을 R2(`pub-...r2.dev/<krSet>/ko/{small,large}/<krSet>/<번호>.png`)로 미러.
  깨짐엔 **두 모드**가 있으니 `curl -I` 로 R2 상태를 본다:
  1. **객체 부재(404)** — DB URL 은 정상, R2 에만 파일이 없음. 원본
     `cards.image.pokemonkorea.co.kr/data/wmimages/SV/<CODE>/<CODE>_<3자리번호>.png`(200) 에서 받아
     `scripts/backfill-kr-images-r2.ts`(SETMAP 확장식)로 small·large 둘 다 업로드 — DB·빌드 무변경, 프로덕션 즉시 반영.
  2. **200이지만 비정규(원본 raw·과대크기)** — 객체는 있는데 깨져 보이는 변종. 그 세트는 보통 400×558 비인터레이스(~400KB)로
     정규화돼 올라가는데, **한 장만 원본 풀해상도(예 868×1212 interlaced ~1.9MB)** 가 그대로 올라가면 프런트 렌더가 그 한 장만 실패한다.
     진단: 세트 전체 `curl -I` 의 Content-Length 를 비교해 **크기 이상치**를 찾고(원본과 md5 동일이면 raw 미러 확정), `file`/PIL 로 해상도·interlace 확인.
     ⚠ `backfill-kr-images-r2.ts` 는 (a) 404/NULL 만 대상이라 200 인 비정규 객체를 못 잡고, (b) **리사이즈 없이 raw 업로드**라 그대로 쓰면 또 과대 객체를 올린다.
     이 모드는 원본을 이웃과 같은 규격(400×558 비인터레이스)으로 리사이즈해서 덮어써야 한다(현행 스크립트로는 부족 — 리사이즈 단계 필요).

## 별건 — 블랙볼트/화이트플레어 특수카드 EN 일러 드리프트

이건 KR이 아니라 **EN 병합** 문제다. 블랙볼트(zsv10pt5)·화이트플레어 같은 세트의 특수카드(IR/SAR)는
`merge-en-identity` 가 rank 내 **번호-zip** 으로 EN을 붙여서, 일러 단위로 어긋날 수 있다
(예: ビクティニ JP#097 Amelicart 풍경 IR 에 EN#171 5ban Rare 가 붙음 — 다른 일러).
포켓몬 특수카드 EN을 의심하면 **ptcg.io 의 artist/rarity** 와 JP 일러를 대조하고, 엇갈리면 이미지로 판정한다
(JP 풍경 IR ↔ EN 풍경 IR 처럼 같은 일러여야 정상). 단건 EN 최종판정은 pokemon.com 공식.
