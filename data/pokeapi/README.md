# PokeAPI 표준 이름 매핑표

이 디렉터리는 **이 레포의 표준 포켓몬 종(species) 이름 매핑표**다. 도감번호(national dex) 하나로
KR / JP / EN(및 그 외 언어) 이름을 join 할 수 있다. 앞으로 종 이름이 필요한 스크립트는
`pokeapi.co` 라이브 API 를 도감번호마다 때리지 말고 이 CSV(로더 경유)를 단일 출처로 쓴다.

## 출처 / 라이선스
- 원천: [PokeAPI/pokeapi](https://github.com/PokeAPI/pokeapi) 의 `data/v2/csv` (계보상 [veekun/pokedex](https://github.com/veekun/pokedex)).
- 라이선스: 코드 BSD-3 / 데이터는 veekun 계열 공개 데이터. 게임 콘텐츠 저작권은 Nintendo·Creatures·GAME FREAK.
- 커밋 핀: `.pinned-commit` (재현성). 갱신은 `scripts/refresh-pokeapi-names.ts`.

## 파일
| 파일 | 키 컬럼 | 용도 |
|---|---|---|
| `pokemon_species_names.csv` | `pokemon_species_id, local_language_id, name, genus` | 도감번호 × 언어 → 이름·분류 |
| `languages.csv` | `id, identifier` | `local_language_id` → 언어코드(`ko`/`en`/`ja-hrkt`…) |
| `pokemon_species.csv` | `id, identifier` | 도감번호 → slug(`bulbasaur`) |

### 언어코드(identifier) 메모
- `ko` (id 3) = 한국어, `en` (id 9) = 영어
- `ja-hrkt` (id 1) = **카타카나 = TCG 표준 일본명** (`フシギダネ`) ← 로더의 `ja`
- `ja` (id 11) = 한자 표기, `zh-hant`/`zh-hans` = 번체/간체 등

## 사용
```ts
import { loadPokeapiNames, getName, buildNameIndex } from "@/scripts/lib/pokeapi-names"; // 스크립트에선 상대경로

getName(1, "ko");        // "이상해씨"
getName(1, "ja");        // "フシギダネ"  (카타카나 표준 일본명)
loadPokeapiNames().get(1);
// { dex:1, slug:"bulbasaur", ko:"이상해씨", ja:"フシギダネ", en:"Bulbasaur", all:{...}, genus:{ko:"씨앗포켓몬", ...} }

buildNameIndex("ko").get("이상해씨"); // 1  (이름→도감번호 역추적)
```

## 갱신
```bash
npx tsx scripts/refresh-pokeapi-names.ts          # 현재 핀 SHA 재다운로드
npx tsx scripts/refresh-pokeapi-names.ts master   # 최신으로 + 핀 업데이트
```
