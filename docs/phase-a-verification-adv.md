# Phase A Verification: ADV1~5

생성 일시: 2026-05-29 09:42:46 UTC

대상: ADV1~5 (일본판 ADV 시리즈, 2003). 총 325장.

## A) 이미지 라이브니스 (Image Liveness)

Supabase Storage에 업로드된 카드 이미지 HTTP 상태 점검 (HEAD).

| 세트 | JP 이름 | 총 카드 | HTTP 200 | 실패 | 성공률 |
| --- | --- | --- | --- | --- | --- |
| ADV1 | 拡張パック | 55 | 55 | 0 | 100.0% |
| ADV2 | 砂漠のきせき | 53 | 53 | 0 | 100.0% |
| ADV3 | 天空の覇者 | 54 | 54 | 0 | 100.0% |
| ADV4 | 強化拡張パックex1マグマVSアクア ふたつの野望 | 80 | 80 | 0 | 100.0% |
| ADV5 | とかれた封印 | 83 | 83 | 0 | 100.0% |

**전체:** 325/325 이미지 정상 (100.0%)

> 모든 이미지 정상 (실패 없음).

## B) 필드 완성도 감사 (Field Completeness)

각 LogicalCard 필드의 채움률 (%). 
※ nameKo는 ADV 시리즈 한국 미발매이므로 0% 예상 (Pokemon 카드는 PokeAPI로 채워질 수 있음).

| 세트 | 총계 | hp | types | attacks | abilities | subtypes | illustrator | rarityId | pokedexNumbers | supertype | nameKo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ADV1 | 55 | 92.7% | 0.0% | 92.7% | 0.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0.0% | 0.0% |
| ADV2 | 53 | 86.8% | 0.0% | 86.8% | 0.0% | 0.0% | 98.1% | 100.0% | 0.0% | 0.0% | 0.0% |
| ADV3 | 54 | 90.7% | 0.0% | 90.7% | 0.0% | 0.0% | 98.1% | 100.0% | 0.0% | 0.0% | 0.0% |
| ADV4 | 80 | 81.3% | 0.0% | 81.3% | 0.0% | 0.0% | 96.3% | 100.0% | 0.0% | 0.0% | 0.0% |
| ADV5 | 83 | 86.7% | 0.0% | 86.7% | 0.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0.0% | 0.0% |

**주의:** 0% 필드: ADV1.types, ADV1.subtypes, ADV1.pokedexNumbers, ADV1.supertype, ADV2.types, ADV2.subtypes, ADV2.pokedexNumbers, ADV2.supertype, ADV3.types, ADV3.subtypes, ADV3.pokedexNumbers, ADV3.supertype, ADV4.types, ADV4.subtypes, ADV4.pokedexNumbers, ADV4.supertype, ADV5.types, ADV5.subtypes, ADV5.pokedexNumbers, ADV5.supertype

## C) 인덱스 연속성 (ID Contiguity)

각 세트의 카드 ID가 1부터 {cardCount}까지 연속되는지 점검.

| 세트 | cardCount | 실제 수 | 갭 수 | 중복 수 | 상태 |
| --- | --- | --- | --- | --- | --- |
| ADV1 | 55 | 55 | 0 | 0 | ✓ |
| ADV2 | 53 | 53 | 0 | 0 | ✓ |
| ADV3 | 54 | 54 | 0 | 0 | ✓ |
| ADV4 | 80 | 80 | 0 | 0 | ✓ |
| ADV5 | 83 | 83 | 0 | 0 | ✓ |

## E) 누락 이미지 카드 진단

imageSmall이 NULL인 카드 — tcgdex API 탐침 (ADV 시리즈는 tcgdex 데이터 없음 → 404 예상).

> 누락 이미지 카드 없음 — 모든 카드에 imageSmall URL 존재.

## F) Supertype 분류

각 세트의 LogicalCard.supertype 값 분포.

| 세트 | 합계 | (null) |
| --- | --- | --- |
| ADV1 | 55 | 55 |
| ADV2 | 53 | 53 |
| ADV3 | 54 | 54 |
| ADV4 | 80 | 80 |
| ADV5 | 83 | 83 |

### Null supertype 카드 (325건)
| LogicalCard ID | 이름 |
| --- | --- |
| lc-orphan-jp-tcg-ADV1-1 | Koffing |
| lc-orphan-jp-tcg-ADV1-10 | Breloom |
| lc-orphan-jp-tcg-ADV1-11 | Blaziken |
| lc-orphan-jp-tcg-ADV1-12 | Numel |
| lc-orphan-jp-tcg-ADV1-13 | Camerupt |
| lc-orphan-jp-tcg-ADV1-14 | Goldeen |
| lc-orphan-jp-tcg-ADV1-15 | Seaking |
| lc-orphan-jp-tcg-ADV1-16 | Swampert |
| lc-orphan-jp-tcg-ADV1-17 | Wingull |
| lc-orphan-jp-tcg-ADV1-18 | Pelipper |
| lc-orphan-jp-tcg-ADV1-19 | Carvanha |
| lc-orphan-jp-tcg-ADV1-2 | Weezing |
| lc-orphan-jp-tcg-ADV1-20 | Sharpedo |
| lc-orphan-jp-tcg-ADV1-21 | Wailmer |
| lc-orphan-jp-tcg-ADV1-22 | Wailord |
| lc-orphan-jp-tcg-ADV1-23 | Electabuzz ex |
| lc-orphan-jp-tcg-ADV1-24 | Electrike |
| lc-orphan-jp-tcg-ADV1-25 | Manectric |
| lc-orphan-jp-tcg-ADV1-26 | Mewtwo ex |
| lc-orphan-jp-tcg-ADV1-27 | Ralts |
| lc-orphan-jp-tcg-ADV1-28 | Kirlia |
| lc-orphan-jp-tcg-ADV1-29 | Gardevoir |
| lc-orphan-jp-tcg-ADV1-3 | Sceptile |
| lc-orphan-jp-tcg-ADV1-30 | Hitmonchan ex |
| lc-orphan-jp-tcg-ADV1-31 | Phanpy |
| lc-orphan-jp-tcg-ADV1-32 | Donphan |
| lc-orphan-jp-tcg-ADV1-33 | Makuhita |
| lc-orphan-jp-tcg-ADV1-34 | Hariyama |
| lc-orphan-jp-tcg-ADV1-35 | Nosepass |
| lc-orphan-jp-tcg-ADV1-36 | Chansey ex |
| lc-orphan-jp-tcg-ADV1-37 | Zigzagoon |
| lc-orphan-jp-tcg-ADV1-38 | Linoone |
| lc-orphan-jp-tcg-ADV1-39 | Taillow |
| lc-orphan-jp-tcg-ADV1-4 | Wurmple |
| lc-orphan-jp-tcg-ADV1-40 | Swellow |
| lc-orphan-jp-tcg-ADV1-41 | Slakoth |
| lc-orphan-jp-tcg-ADV1-42 | Vigoroth |
| lc-orphan-jp-tcg-ADV1-43 | Slaking |
| lc-orphan-jp-tcg-ADV1-44 | Skitty |
| lc-orphan-jp-tcg-ADV1-45 | Delcatty |
| lc-orphan-jp-tcg-ADV1-46 | Sneasel ex |
| lc-orphan-jp-tcg-ADV1-47 | Poochyena |
| lc-orphan-jp-tcg-ADV1-48 | Mightyena |
| lc-orphan-jp-tcg-ADV1-49 | Aron |
| lc-orphan-jp-tcg-ADV1-5 | Silcoon |
| lc-orphan-jp-tcg-ADV1-50 | Lairon |
| lc-orphan-jp-tcg-ADV1-51 | Aggron |
| lc-orphan-jp-tcg-ADV1-52 | PokeNav |
| lc-orphan-jp-tcg-ADV1-53 | Lady Outing |
| lc-orphan-jp-tcg-ADV1-54 | Professor Birch |
| lc-orphan-jp-tcg-ADV1-55 | Oran Berry |
| lc-orphan-jp-tcg-ADV1-6 | Beautifly |
| lc-orphan-jp-tcg-ADV1-7 | Cascoon |
| lc-orphan-jp-tcg-ADV1-8 | Dustox |
| lc-orphan-jp-tcg-ADV1-9 | Shroomish |
| lc-orphan-jp-tcg-ADV2-1 | Seedot |
| lc-orphan-jp-tcg-ADV2-10 | Cradily |
| lc-orphan-jp-tcg-ADV2-11 | Cyndaquil |
| lc-orphan-jp-tcg-ADV2-12 | Quilava |
| lc-orphan-jp-tcg-ADV2-13 | Typhlosion ex |
| lc-orphan-jp-tcg-ADV2-14 | Psyduck |
| lc-orphan-jp-tcg-ADV2-15 | Golduck |
| lc-orphan-jp-tcg-ADV2-16 | Marill |
| lc-orphan-jp-tcg-ADV2-17 | Azumarill |
| lc-orphan-jp-tcg-ADV2-18 | Lotad |
| lc-orphan-jp-tcg-ADV2-19 | Lombre |
| lc-orphan-jp-tcg-ADV2-2 | Nuzleaf |
| lc-orphan-jp-tcg-ADV2-20 | Ludicolo |
| lc-orphan-jp-tcg-ADV2-21 | Wailord ex |
| lc-orphan-jp-tcg-ADV2-22 | Pikachu |
| lc-orphan-jp-tcg-ADV2-23 | Raichu ex |
| lc-orphan-jp-tcg-ADV2-24 | Pichu |
| lc-orphan-jp-tcg-ADV2-25 | Natu |
| lc-orphan-jp-tcg-ADV2-26 | Xatu |
| lc-orphan-jp-tcg-ADV2-27 | Wobbuffet |
| lc-orphan-jp-tcg-ADV2-28 | Gardevoir ex |
| lc-orphan-jp-tcg-ADV2-29 | Lunatone |
| lc-orphan-jp-tcg-ADV2-3 | Shiftry |
| lc-orphan-jp-tcg-ADV2-30 | Duskull |
| lc-orphan-jp-tcg-ADV2-31 | Dusclops |
| lc-orphan-jp-tcg-ADV2-32 | Wynaut |
| lc-orphan-jp-tcg-ADV2-33 | Sandshrew |
| lc-orphan-jp-tcg-ADV2-34 | Sandslash |
| lc-orphan-jp-tcg-ADV2-35 | Trapinch |
| lc-orphan-jp-tcg-ADV2-36 | Solrock |
| lc-orphan-jp-tcg-ADV2-37 | Baltoy |
| lc-orphan-jp-tcg-ADV2-38 | Anorith |
| lc-orphan-jp-tcg-ADV2-39 | Armaldo |
| lc-orphan-jp-tcg-ADV2-4 | Volbeat |
| lc-orphan-jp-tcg-ADV2-40 | Zigzagoon |
| lc-orphan-jp-tcg-ADV2-41 | Azurill |
| lc-orphan-jp-tcg-ADV2-42 | Zangoose |
| lc-orphan-jp-tcg-ADV2-43 | Kecleon |
| lc-orphan-jp-tcg-ADV2-44 | Sableye |
| lc-orphan-jp-tcg-ADV2-45 | Mawile |
| lc-orphan-jp-tcg-ADV2-46 | Aggron ex |
| lc-orphan-jp-tcg-ADV2-47 | Claw Fossil |
| lc-orphan-jp-tcg-ADV2-48 | Root Fossil |
| lc-orphan-jp-tcg-ADV2-49 | Double Full Heal |
| lc-orphan-jp-tcg-ADV2-5 | Illumise |
| lc-orphan-jp-tcg-ADV2-50 | Rare Candy |
| lc-orphan-jp-tcg-ADV2-51 | Lanette's Net Search |
| lc-orphan-jp-tcg-ADV2-52 | Wally's Training |
| lc-orphan-jp-tcg-ADV2-53 | Multi Energy |
| lc-orphan-jp-tcg-ADV2-6 | Cacnea |
| lc-orphan-jp-tcg-ADV2-7 | Cacturne |
| lc-orphan-jp-tcg-ADV2-8 | Seviper |
| lc-orphan-jp-tcg-ADV2-9 | Lileep |
| lc-orphan-jp-tcg-ADV3-1 | Grimer |
| lc-orphan-jp-tcg-ADV3-10 | Torkoal |
| lc-orphan-jp-tcg-ADV3-11 | Horsea |
| lc-orphan-jp-tcg-ADV3-12 | Seadra |
| lc-orphan-jp-tcg-ADV3-13 | Magikarp |
| lc-orphan-jp-tcg-ADV3-14 | Gyarados |
| lc-orphan-jp-tcg-ADV3-15 | Kingdra ex |
| lc-orphan-jp-tcg-ADV3-16 | Barboach |
| lc-orphan-jp-tcg-ADV3-17 | Whiscash |
| lc-orphan-jp-tcg-ADV3-18 | Corphish |
| lc-orphan-jp-tcg-ADV3-19 | Crawdaunt |
| lc-orphan-jp-tcg-ADV3-2 | Muk ex |
| lc-orphan-jp-tcg-ADV3-20 | Snorunt |
| lc-orphan-jp-tcg-ADV3-21 | Magnemite |
| lc-orphan-jp-tcg-ADV3-22 | Magneton |
| lc-orphan-jp-tcg-ADV3-23 | Mareep |
| lc-orphan-jp-tcg-ADV3-24 | Flaaffy |
| lc-orphan-jp-tcg-ADV3-25 | Ampharos ex |
| lc-orphan-jp-tcg-ADV3-26 | Plusle |
| lc-orphan-jp-tcg-ADV3-27 | Minun |
| lc-orphan-jp-tcg-ADV3-28 | Girafarig |
| lc-orphan-jp-tcg-ADV3-29 | Spoink |
| lc-orphan-jp-tcg-ADV3-3 | Wurmple |
| lc-orphan-jp-tcg-ADV3-30 | Grumpig |
| lc-orphan-jp-tcg-ADV3-31 | Shuppet |
| lc-orphan-jp-tcg-ADV3-32 | Geodude |
| lc-orphan-jp-tcg-ADV3-33 | Graveler |
| lc-orphan-jp-tcg-ADV3-34 | Golem |
| lc-orphan-jp-tcg-ADV3-35 | Meditite |
| lc-orphan-jp-tcg-ADV3-36 | Dratini |
| lc-orphan-jp-tcg-ADV3-37 | Dragonair |
| lc-orphan-jp-tcg-ADV3-38 | Dragonite ex |
| lc-orphan-jp-tcg-ADV3-39 | Taillow |
| lc-orphan-jp-tcg-ADV3-4 | Nincada |
| lc-orphan-jp-tcg-ADV3-40 | Vibrava |
| lc-orphan-jp-tcg-ADV3-41 | Flygon |
| lc-orphan-jp-tcg-ADV3-42 | Swablu |
| lc-orphan-jp-tcg-ADV3-43 | Altaria |
| lc-orphan-jp-tcg-ADV3-44 | Bagon |
| lc-orphan-jp-tcg-ADV3-45 | Shelgon |
| lc-orphan-jp-tcg-ADV3-46 | Salamence |
| lc-orphan-jp-tcg-ADV3-47 | Rayquaza ex |
| lc-orphan-jp-tcg-ADV3-48 | Absol |
| lc-orphan-jp-tcg-ADV3-49 | Skarmory |
| lc-orphan-jp-tcg-ADV3-5 | Ninjask |
| lc-orphan-jp-tcg-ADV3-50 | Energy Recycle System |
| lc-orphan-jp-tcg-ADV3-51 | TV Reporter |
| lc-orphan-jp-tcg-ADV3-52 | Mr. Briney's Compassion |
| lc-orphan-jp-tcg-ADV3-53 | Balloon Berry |
| lc-orphan-jp-tcg-ADV3-54 | Buffer Piece |
| lc-orphan-jp-tcg-ADV3-6 | Shedinja |
| lc-orphan-jp-tcg-ADV3-7 | Roselia |
| lc-orphan-jp-tcg-ADV3-8 | Slugma |
| lc-orphan-jp-tcg-ADV3-9 | Magcargo ex |
| lc-orphan-jp-tcg-ADV4-1 | Ekans |
| lc-orphan-jp-tcg-ADV4-10 | Team Aqua's Seviper |
| lc-orphan-jp-tcg-ADV4-11 | Team Aqua's Cacnea |
| lc-orphan-jp-tcg-ADV4-12 | Team Aqua's Cacturne |
| lc-orphan-jp-tcg-ADV4-13 | Growlithe |
| lc-orphan-jp-tcg-ADV4-14 | Arcanine |
| lc-orphan-jp-tcg-ADV4-15 | Flareon |
| lc-orphan-jp-tcg-ADV4-16 | Torchic |
| lc-orphan-jp-tcg-ADV4-17 | Combusken |
| lc-orphan-jp-tcg-ADV4-18 | Blaziken ex |
| lc-orphan-jp-tcg-ADV4-19 | Team Magma's Houndour |
| lc-orphan-jp-tcg-ADV4-2 | Arbok |
| lc-orphan-jp-tcg-ADV4-20 | Team Magma's Houndoom |
| lc-orphan-jp-tcg-ADV4-21 | Team Magma's Torkoal |
| lc-orphan-jp-tcg-ADV4-22 | Vaporeon |
| lc-orphan-jp-tcg-ADV4-23 | Omanyte |
| lc-orphan-jp-tcg-ADV4-24 | Omastar |
| lc-orphan-jp-tcg-ADV4-25 | Kabuto |
| lc-orphan-jp-tcg-ADV4-26 | Kabutops ex |
| lc-orphan-jp-tcg-ADV4-27 | Suicune ex |
| lc-orphan-jp-tcg-ADV4-28 | Mudkip |
| lc-orphan-jp-tcg-ADV4-29 | Marshtomp |
| lc-orphan-jp-tcg-ADV4-3 | Pineco |
| lc-orphan-jp-tcg-ADV4-30 | Wingull |
| lc-orphan-jp-tcg-ADV4-31 | Pelipper |
| lc-orphan-jp-tcg-ADV4-32 | Wailmer |
| lc-orphan-jp-tcg-ADV4-33 | Team Aqua's Carvanha |
| lc-orphan-jp-tcg-ADV4-34 | Team Aqua's Corphish |
| lc-orphan-jp-tcg-ADV4-35 | Team Aqua's Sharpedo |
| lc-orphan-jp-tcg-ADV4-36 | Team Aqua's Crawdaunt |
| lc-orphan-jp-tcg-ADV4-37 | Jolteon |
| lc-orphan-jp-tcg-ADV4-38 | Team Aqua's Electrike |
| lc-orphan-jp-tcg-ADV4-39 | Team Aqua's Manectric |
| lc-orphan-jp-tcg-ADV4-4 | Treecko |
| lc-orphan-jp-tcg-ADV4-40 | Espeon |
| lc-orphan-jp-tcg-ADV4-41 | Ralts |
| lc-orphan-jp-tcg-ADV4-42 | Kirlia |
| lc-orphan-jp-tcg-ADV4-43 | Duskull |
| lc-orphan-jp-tcg-ADV4-44 | Team Magma's Baltoy |
| lc-orphan-jp-tcg-ADV4-45 | Team Magma's Claydol |
| lc-orphan-jp-tcg-ADV4-46 | Geodude |
| lc-orphan-jp-tcg-ADV4-47 | Graveler |
| lc-orphan-jp-tcg-ADV4-48 | Golem ex |
| lc-orphan-jp-tcg-ADV4-49 | Onix |
| lc-orphan-jp-tcg-ADV4-5 | Grovyle |
| lc-orphan-jp-tcg-ADV4-50 | Swampert ex |
| lc-orphan-jp-tcg-ADV4-51 | Anorith |
| lc-orphan-jp-tcg-ADV4-52 | Team Magma's Rhyhorn |
| lc-orphan-jp-tcg-ADV4-53 | Team Magma's Rhydon |
| lc-orphan-jp-tcg-ADV4-54 | Eevee |
| lc-orphan-jp-tcg-ADV4-55 | Aerodactyl ex |
| lc-orphan-jp-tcg-ADV4-56 | Dunsparce |
| lc-orphan-jp-tcg-ADV4-57 | Linoone |
| lc-orphan-jp-tcg-ADV4-58 | Swellow |
| lc-orphan-jp-tcg-ADV4-59 | Skitty |
| lc-orphan-jp-tcg-ADV4-6 | Sceptile ex |
| lc-orphan-jp-tcg-ADV4-60 | Delcatty |
| lc-orphan-jp-tcg-ADV4-61 | Team Magma's Zangoose |
| lc-orphan-jp-tcg-ADV4-62 | Umbreon |
| lc-orphan-jp-tcg-ADV4-63 | Murkrow |
| lc-orphan-jp-tcg-ADV4-64 | Forretress |
| lc-orphan-jp-tcg-ADV4-65 | Steelix |
| lc-orphan-jp-tcg-ADV4-66 | Dual Ball |
| lc-orphan-jp-tcg-ADV4-67 | Mysterious Fossil |
| lc-orphan-jp-tcg-ADV4-68 | Warp Point |
| lc-orphan-jp-tcg-ADV4-69 | Strength Charm |
| lc-orphan-jp-tcg-ADV4-7 | Cacnea |
| lc-orphan-jp-tcg-ADV4-70 | Team Magma Belt |
| lc-orphan-jp-tcg-ADV4-71 | Team Aqua Belt |
| lc-orphan-jp-tcg-ADV4-72 | Team Magma Schemer |
| lc-orphan-jp-tcg-ADV4-73 | Team Aqua Schemer |
| lc-orphan-jp-tcg-ADV4-74 | Maxie |
| lc-orphan-jp-tcg-ADV4-75 | Archie |
| lc-orphan-jp-tcg-ADV4-76 | Team Magma Technical Machine 01 |
| lc-orphan-jp-tcg-ADV4-77 | Team Aqua Technical Machine 01 |
| lc-orphan-jp-tcg-ADV4-78 | Double Rainbow Energy |
| lc-orphan-jp-tcg-ADV4-79 | Magma Energy |
| lc-orphan-jp-tcg-ADV4-8 | Lileep |
| lc-orphan-jp-tcg-ADV4-80 | Aqua Energy |
| lc-orphan-jp-tcg-ADV4-9 | Cradily ex |
| lc-orphan-jp-tcg-ADV5-1 | Zubat |
| lc-orphan-jp-tcg-ADV5-10 | Seedot |
| lc-orphan-jp-tcg-ADV5-11 | Surskit |
| lc-orphan-jp-tcg-ADV5-12 | Masquerain |
| lc-orphan-jp-tcg-ADV5-13 | Gulpin |
| lc-orphan-jp-tcg-ADV5-14 | Swalot |
| lc-orphan-jp-tcg-ADV5-15 | Tropius |
| lc-orphan-jp-tcg-ADV5-16 | Vulpix |
| lc-orphan-jp-tcg-ADV5-17 | Ninetales |
| lc-orphan-jp-tcg-ADV5-18 | Ninetales ex |
| lc-orphan-jp-tcg-ADV5-19 | Sunny Castform |
| lc-orphan-jp-tcg-ADV5-2 | Golbat |
| lc-orphan-jp-tcg-ADV5-20 | Tentacool |
| lc-orphan-jp-tcg-ADV5-21 | Tentacruel |
| lc-orphan-jp-tcg-ADV5-22 | Staryu |
| lc-orphan-jp-tcg-ADV5-23 | Corsola |
| lc-orphan-jp-tcg-ADV5-24 | Feebas |
| lc-orphan-jp-tcg-ADV5-25 | Milotic |
| lc-orphan-jp-tcg-ADV5-26 | Rain Castform |
| lc-orphan-jp-tcg-ADV5-27 | Snow-cloud Castform |
| lc-orphan-jp-tcg-ADV5-28 | Snorunt |
| lc-orphan-jp-tcg-ADV5-29 | Glalie |
| lc-orphan-jp-tcg-ADV5-3 | Oddish |
| lc-orphan-jp-tcg-ADV5-30 | Spheal |
| lc-orphan-jp-tcg-ADV5-31 | Sealeo |
| lc-orphan-jp-tcg-ADV5-32 | Walrein |
| lc-orphan-jp-tcg-ADV5-33 | Clamperl |
| lc-orphan-jp-tcg-ADV5-34 | Huntail |
| lc-orphan-jp-tcg-ADV5-35 | Gorebyss |
| lc-orphan-jp-tcg-ADV5-36 | Relicanth |
| lc-orphan-jp-tcg-ADV5-37 | Luvdisc |
| lc-orphan-jp-tcg-ADV5-38 | Regice ex |
| lc-orphan-jp-tcg-ADV5-39 | Kyogre ex |
| lc-orphan-jp-tcg-ADV5-4 | Gloom |
| lc-orphan-jp-tcg-ADV5-40 | Voltorb |
| lc-orphan-jp-tcg-ADV5-41 | Electrode |
| lc-orphan-jp-tcg-ADV5-42 | Chinchou |
| lc-orphan-jp-tcg-ADV5-43 | Lanturn |
| lc-orphan-jp-tcg-ADV5-44 | Starmie |
| lc-orphan-jp-tcg-ADV5-45 | Claydol |
| lc-orphan-jp-tcg-ADV5-46 | Shuppet |
| lc-orphan-jp-tcg-ADV5-47 | Banette |
| lc-orphan-jp-tcg-ADV5-48 | Chimecho |
| lc-orphan-jp-tcg-ADV5-49 | Machop |
| lc-orphan-jp-tcg-ADV5-5 | Vileplume ex |
| lc-orphan-jp-tcg-ADV5-50 | Machoke |
| lc-orphan-jp-tcg-ADV5-51 | Machamp |
| lc-orphan-jp-tcg-ADV5-52 | Rhyhorn |
| lc-orphan-jp-tcg-ADV5-53 | Rhydon |
| lc-orphan-jp-tcg-ADV5-54 | Medicham |
| lc-orphan-jp-tcg-ADV5-55 | Regirock ex |
| lc-orphan-jp-tcg-ADV5-56 | Groudon ex |
| lc-orphan-jp-tcg-ADV5-57 | Jigglypuff |
| lc-orphan-jp-tcg-ADV5-58 | Wigglytuff ex |
| lc-orphan-jp-tcg-ADV5-59 | Doduo |
| lc-orphan-jp-tcg-ADV5-6 | Pinsir |
| lc-orphan-jp-tcg-ADV5-60 | Dodrio |
| lc-orphan-jp-tcg-ADV5-61 | Igglybuff |
| lc-orphan-jp-tcg-ADV5-62 | Whismur |
| lc-orphan-jp-tcg-ADV5-63 | Loudred |
| lc-orphan-jp-tcg-ADV5-64 | Exploud |
| lc-orphan-jp-tcg-ADV5-65 | Spinda |
| lc-orphan-jp-tcg-ADV5-66 | Castform |
| lc-orphan-jp-tcg-ADV5-67 | Nuzleaf |
| lc-orphan-jp-tcg-ADV5-68 | Shiftry |
| lc-orphan-jp-tcg-ADV5-69 | Beldum |
| lc-orphan-jp-tcg-ADV5-7 | Crobat |
| lc-orphan-jp-tcg-ADV5-70 | Metang |
| lc-orphan-jp-tcg-ADV5-71 | Metagross ex |
| lc-orphan-jp-tcg-ADV5-72 | Registeel ex |
| lc-orphan-jp-tcg-ADV5-73 | Life Herb |
| lc-orphan-jp-tcg-ADV5-74 | Steven's Advice |
| lc-orphan-jp-tcg-ADV5-75 | Ancient Technical Machine Ice |
| lc-orphan-jp-tcg-ADV5-76 | Ancient Technical Machine Rock |
| lc-orphan-jp-tcg-ADV5-77 | Ancient Technical Machine Steel |
| lc-orphan-jp-tcg-ADV5-78 | Island Cave |
| lc-orphan-jp-tcg-ADV5-79 | Ancient Tomb |
| lc-orphan-jp-tcg-ADV5-8 | Bellossom |
| lc-orphan-jp-tcg-ADV5-80 | Desert Ruins |
| lc-orphan-jp-tcg-ADV5-81 | High Pressure System |
| lc-orphan-jp-tcg-ADV5-82 | Low Pressure System |
| lc-orphan-jp-tcg-ADV5-83 | Magnetic Storm |
| lc-orphan-jp-tcg-ADV5-9 | Heracross |

## G) EN 교차 검증 — 보류 (Deferred)

> **사유:** ADV 시리즈(adv1~5)는 EN EX 시리즈와 카드 구성이 상이하여 단순 ID 매핑 불가. 별도 대응 테이블 작성 후 진행 예정.

## H) 버전 가용성 (CardLocale 언어 분포)

각 LogicalCard의 CardLocale 언어 조합. ADV는 한국 미발매이므로 ja only 예상.

| 세트 | 총계 | ja |
| --- | --- | --- |
| ADV1 | 55 | 55 |
| ADV2 | 53 | 53 |
| ADV3 | 54 | 54 |
| ADV4 | 80 | 80 |
| ADV5 | 83 | 83 |

> 모든 ADV 카드가 ja 단일 언어 — 정상.

## 권장 액션 (Recommended Actions)

| 우선순위 | 액션 |
| --- | --- |
| **P2** | 필드 채움률 50% 미만: ADV1.types(0.0%), ADV1.supertype(0.0%), ADV2.types(0.0%), ADV2.supertype(0.0%), ADV3.types(0.0%), ADV3.supertype(0.0%), ADV4.types(0.0%), ADV4.supertype(0.0%), ADV5.types(0.0%), ADV5.supertype(0.0%) — tcgdex ADV 데이터 없음, 수동 보강 필요 |
| **P2** | supertype null 325건 — Pokemon/Trainer/Energy 수동 분류 필요 |
| **P3** | tcgdex ADV1~5 카드 데이터 없음 — 향후 tcgdex 추가 시 재보강 가능 |
| **P3** | EN 교차 검증 보류 — JP↔EN 카드 대응 테이블 작성 후 별도 스크립트 실행 |

---
*자동 생성: scripts/phase-a-verify-adv.ts*