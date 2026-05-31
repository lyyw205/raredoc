# 카드 머지 후보 보고서

생성일: 2026-05-31 08:13:09 (dry-run — DB 수정 없음)

## 1. 전체 요약

| 항목 | 수치 |
|---|---|
| 현재 LogicalCard | 63,037 |
| 머지 후보 쌍 (high confidence) | 5 |
| 머지 후보 쌍 (medium confidence) | 0 |
| ambiguous (사용자 검토 필요) | 2,051 |
| skip (매칭 불가/데이터 부재) | 26,270 |
| 머지 시 제거될 LC | 5 |
| **머지 후 예상 LC** | **63,032** |

## 2. SetGroup별 통계

| SetGroup | Era | 총LC | EN-only | JP-only | KR-only | Mixed | HighConf | MedConf | Ambig | Skip | 합본? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| og-xy5a | XY | 244 | 164 | 80 | 0 | 0 | 4 | 0 | 76 | 365 | - |
| og-xy8a | XY | 229 | 164 | 65 | 0 | 0 | 1 | 0 | 64 | 368 | - |
| og-adv1 | ADV (루비·사파이어) | 55 | 0 | 55 | 0 | 0 | 0 | 0 | 0 | 55 | - |
| og-adv2 | ADV (루비·사파이어) | 53 | 0 | 53 | 0 | 0 | 0 | 0 | 0 | 53 | - |
| og-adv3 | ADV (루비·사파이어) | 54 | 0 | 54 | 0 | 0 | 0 | 0 | 0 | 54 | - |
| og-adv4 | ADV (루비·사파이어) | 80 | 0 | 80 | 0 | 0 | 0 | 0 | 0 | 80 | - |
| og-adv5 | ADV (루비·사파이어) | 83 | 0 | 83 | 0 | 0 | 0 | 0 | 0 | 83 | - |
| og-bw1 | BW | 115 | 59 | 0 | 0 | 56 | 0 | 0 | 0 | 97 | - |
| og-bw10 | BW | 105 | 0 | 0 | 0 | 105 | 0 | 0 | 0 | 0 | - |
| og-bw11 | BW | 140 | 25 | 0 | 0 | 115 | 0 | 0 | 0 | 49 | - |
| og-bw2 | BW | 98 | 0 | 0 | 0 | 98 | 0 | 0 | 0 | 0 | - |
| og-bw3 | BW | 102 | 0 | 0 | 0 | 102 | 0 | 0 | 0 | 0 | - |
| og-bw4 | BW | 103 | 0 | 0 | 0 | 103 | 0 | 0 | 0 | 0 | - |
| og-bw5 | BW | 111 | 0 | 0 | 0 | 111 | 0 | 0 | 0 | 0 | - |
| og-bw6 | BW | 128 | 0 | 0 | 0 | 128 | 0 | 0 | 0 | 0 | - |
| og-bw7 | BW | 153 | 0 | 0 | 0 | 153 | 0 | 0 | 0 | 0 | - |
| og-bw8 | BW | 138 | 0 | 0 | 0 | 138 | 0 | 0 | 0 | 0 | - |
| og-bw9 | BW | 122 | 0 | 0 | 0 | 122 | 0 | 0 | 0 | 0 | - |
| og-bwp | BW | 101 | 101 | 0 | 0 | 0 | 0 | 0 | 0 | 194 | - |
| og-dv1 | BW | 21 | 1 | 0 | 0 | 20 | 0 | 0 | 0 | 2 | - |
| og-dp1 | DP | 130 | 12 | 0 | 0 | 118 | 0 | 0 | 0 | 16 | - |
| og-dp2 | DP | 124 | 0 | 0 | 0 | 124 | 0 | 0 | 0 | 0 | - |
| og-dp3 | DP | 132 | 20 | 0 | 0 | 112 | 0 | 0 | 0 | 37 | - |
| og-dp4 | DP | 106 | 4 | 0 | 0 | 102 | 0 | 0 | 0 | 8 | - |
| og-dp5 | DP | 100 | 36 | 0 | 0 | 64 | 0 | 0 | 0 | 59 | - |
| og-dp6 | DP | 146 | 28 | 0 | 0 | 118 | 0 | 0 | 0 | 55 | - |
| og-dp7 | DP | 106 | 27 | 0 | 0 | 79 | 0 | 0 | 0 | 49 | - |
| og-e1 | e카드 | 128 | 0 | 128 | 0 | 0 | 0 | 0 | 0 | 240 | - |
| og-e2 | e카드 | 92 | 0 | 92 | 0 | 0 | 0 | 0 | 0 | 166 | - |
| og-e3 | e카드 | 90 | 0 | 90 | 0 | 0 | 0 | 0 | 0 | 168 | - |
| og-e4 | e카드 | 91 | 0 | 91 | 0 | 0 | 0 | 0 | 0 | 169 | - |
| og-e5 | e카드 | 91 | 0 | 91 | 0 | 0 | 0 | 0 | 0 | 168 | - |
| og-col1 | HGSS | 106 | 9 | 0 | 0 | 97 | 0 | 0 | 0 | 16 | - |
| og-hgss1 | HGSS | 124 | 18 | 0 | 0 | 106 | 0 | 0 | 0 | 28 | - |
| og-hgss2 | HGSS | 96 | 9 | 0 | 0 | 87 | 0 | 0 | 0 | 18 | - |
| og-hgss3 | HGSS | 91 | 24 | 0 | 0 | 67 | 0 | 0 | 0 | 48 | - |
| og-hgss4 | HGSS | 103 | 31 | 0 | 0 | 72 | 0 | 0 | 0 | 61 | - |
| og-hsp | HGSS | 25 | 25 | 0 | 0 | 0 | 0 | 0 | 0 | 49 | - |
| og-l1a | L (레전드) | 71 | 0 | 71 | 0 | 0 | 0 | 0 | 0 | 71 | - |
| og-l1b | L (레전드) | 71 | 0 | 71 | 0 | 0 | 0 | 0 | 0 | 71 | - |
| og-l2 | L (레전드) | 19 | 0 | 19 | 0 | 0 | 0 | 0 | 0 | 19 | - |
| og-l3 | L (레전드) | 81 | 0 | 81 | 0 | 0 | 0 | 0 | 0 | 81 | - |
| og-ll | L (레전드) | 40 | 0 | 40 | 0 | 0 | 0 | 0 | 0 | 40 | - |
| mega-abyss-eye | MEGA | 118 | 0 | 118 | 0 | 0 | 0 | 0 | 0 | 118 | - |
| mega-brave-symphonia | MEGA | 184 | 0 | 184 | 0 | 0 | 0 | 0 | 184 | 0 | ⚠️합본 |
| mega-dream-ex | MEGA | 250 | 0 | 250 | 0 | 0 | 0 | 0 | 250 | 0 | ⚠️합본 |
| mega-infernox | MEGA | 116 | 0 | 116 | 0 | 0 | 0 | 0 | 0 | 232 | - |
| mega-munikisuzero | MEGA | 117 | 0 | 117 | 0 | 0 | 0 | 0 | 0 | 234 | - |
| mega-ninja-spinner | MEGA | 120 | 0 | 120 | 0 | 0 | 0 | 0 | 120 | 0 | ⚠️합본 |
| og-pcg1 | PCG | 82 | 0 | 82 | 0 | 0 | 0 | 0 | 0 | 156 | - |
| og-pcg10 | PCG | 102 | 0 | 102 | 0 | 0 | 0 | 0 | 0 | 102 | - |
| og-pcg2 | PCG | 82 | 0 | 82 | 0 | 0 | 0 | 0 | 0 | 157 | - |
| og-pcg3 | PCG | 85 | 0 | 85 | 0 | 0 | 0 | 0 | 0 | 152 | - |
| og-pcg4 | PCG | 106 | 0 | 106 | 0 | 0 | 0 | 0 | 0 | 198 | - |
| og-pcg5 | PCG | 86 | 0 | 86 | 0 | 0 | 0 | 0 | 0 | 157 | - |
| og-pcg6 | PCG | 86 | 0 | 86 | 0 | 0 | 0 | 0 | 0 | 161 | - |
| og-pcg7 | PCG | 52 | 0 | 52 | 0 | 0 | 0 | 0 | 0 | 99 | - |
| og-pcg8 | PCG | 75 | 0 | 75 | 0 | 0 | 0 | 0 | 0 | 141 | - |
| og-pcg9 | PCG | 68 | 0 | 68 | 0 | 0 | 0 | 0 | 0 | 131 | - |
| og-pl1 | Pt | 133 | 49 | 0 | 0 | 84 | 0 | 0 | 0 | 89 | - |
| og-pl2 | Pt | 120 | 46 | 0 | 0 | 74 | 0 | 0 | 0 | 86 | - |
| og-pl3 | Pt | 153 | 64 | 0 | 0 | 89 | 0 | 0 | 0 | 128 | - |
| og-pl4 | Pt | 111 | 44 | 0 | 0 | 67 | 0 | 0 | 0 | 85 | - |
| og-cel25c | S (소드·실드) | 22 | 22 | 0 | 0 | 0 | 0 | 0 | 0 | 42 | - |
| og-s10a | S (소드·실드) | 411 | 217 | 99 | 95 | 0 | 0 | 0 | 99 | 584 | - |
| og-s10b | S (소드·실드) | 281 | 88 | 93 | 100 | 0 | 0 | 0 | 74 | 401 | - |
| og-s10d | S (소드·실드) | 304 | 216 | 88 | 0 | 0 | 0 | 0 | 304 | 0 | ⚠️합본 |
| og-s10p | S (소드·실드) | 88 | 0 | 88 | 0 | 0 | 0 | 0 | 0 | 88 | - |
| og-s11a | S (소드·실드) | 398 | 215 | 94 | 89 | 0 | 0 | 0 | 398 | 0 | ⚠️합본 |
| og-s12 | S (소드·실드) | 245 | 0 | 125 | 120 | 0 | 0 | 0 | 245 | 0 | ⚠️합본 |
| og-s12a | S (소드·실드) | 666 | 160 | 254 | 252 | 0 | 0 | 0 | 123 | 984 | - |
| og-s1a | S (소드·실드) | 164 | 0 | 86 | 78 | 0 | 0 | 0 | 0 | 242 | - |
| og-s1h | S (소드·실드) | 143 | 0 | 75 | 68 | 0 | 0 | 0 | 0 | 211 | - |
| og-s1w | S (소드·실드) | 359 | 216 | 75 | 68 | 0 | 0 | 0 | 359 | 0 | ⚠️합본 |
| og-s2 | S (소드·실드) | 430 | 209 | 115 | 106 | 0 | 0 | 0 | 430 | 0 | ⚠️합본 |
| og-s2a | S (소드·실드) | 365 | 201 | 86 | 78 | 0 | 0 | 0 | 365 | 0 | ⚠️합본 |
| og-s3 | S (소드·실드) | 229 | 0 | 119 | 110 | 0 | 0 | 0 | 0 | 339 | - |
| og-s3a | S (소드·실드) | 381 | 203 | 94 | 84 | 0 | 0 | 0 | 94 | 537 | - |
| og-s4 | S (소드·실드) | 232 | 0 | 121 | 111 | 0 | 0 | 0 | 0 | 343 | - |
| og-s4a | S (소드·실드) | 403 | 73 | 330 | 0 | 0 | 0 | 0 | 58 | 418 | - |
| og-s5a | S (소드·실드) | 166 | 0 | 96 | 70 | 0 | 0 | 0 | 0 | 236 | - |
| og-s5i | S (소드·실드) | 274 | 183 | 91 | 0 | 0 | 0 | 0 | 91 | 329 | - |
| og-s5r | S (소드·실드) | 91 | 0 | 91 | 0 | 0 | 0 | 0 | 0 | 91 | - |
| og-s6a | S (소드·실드) | 188 | 0 | 101 | 87 | 0 | 0 | 0 | 188 | 0 | ⚠️합본 |
| og-s6h | S (소드·실드) | 328 | 233 | 95 | 0 | 0 | 0 | 0 | 328 | 0 | ⚠️합본 |
| og-s6k | S (소드·실드) | 95 | 0 | 95 | 0 | 0 | 0 | 0 | 0 | 95 | - |
| og-s7d | S (소드·실드) | 90 | 0 | 90 | 0 | 0 | 0 | 0 | 0 | 90 | - |
| og-s7r | S (소드·실드) | 327 | 237 | 90 | 0 | 0 | 0 | 0 | 90 | 430 | - |
| og-s8 | S (소드·실드) | 510 | 284 | 129 | 97 | 0 | 0 | 0 | 510 | 0 | ⚠️합본 |
| og-s8a | S (소드·실드) | 86 | 25 | 30 | 31 | 0 | 0 | 0 | 86 | 0 | ⚠️합본 |
| og-s8b | S (소드·실드) | 555 | 0 | 285 | 270 | 0 | 0 | 0 | 0 | 825 | - |
| og-s9 | S (소드·실드) | 438 | 186 | 127 | 125 | 0 | 0 | 0 | 438 | 0 | ⚠️합본 |
| og-s9a | S (소드·실드) | 180 | 0 | 93 | 87 | 0 | 0 | 0 | 0 | 267 | - |
| og-swsh10tg | S (소드·실드) | 30 | 30 | 0 | 0 | 0 | 0 | 0 | 0 | 55 | - |
| og-swsh11tg | S (소드·실드) | 30 | 30 | 0 | 0 | 0 | 0 | 0 | 0 | 54 | - |
| og-swsh12pt5gg | S (소드·실드) | 70 | 70 | 0 | 0 | 0 | 0 | 0 | 0 | 130 | - |
| og-swsh12tg | S (소드·실드) | 30 | 30 | 0 | 0 | 0 | 0 | 0 | 0 | 54 | - |
| og-swsh35 | S (소드·실드) | 80 | 80 | 0 | 0 | 0 | 0 | 0 | 0 | 137 | - |
| og-swsh45sv | S (소드·실드) | 122 | 122 | 0 | 0 | 0 | 0 | 0 | 0 | 244 | - |
| og-swsh9tg | S (소드·실드) | 30 | 30 | 0 | 0 | 0 | 0 | 0 | 0 | 55 | - |
| og-swshp | S (소드·실드) | 304 | 304 | 0 | 0 | 0 | 0 | 0 | 0 | 596 | - |
| og-sm0 | SM (썬·문) | 4 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 4 | - |
| og-sm1+ | SM (썬·문) | 112 | 0 | 1 | 111 | 0 | 0 | 0 | 0 | 112 | - |
| og-sm10 | SM (썬·문) | 455 | 234 | 114 | 107 | 0 | 0 | 0 | 116 | 639 | - |
| og-sm10b | SM (썬·문) | 131 | 0 | 69 | 62 | 0 | 0 | 0 | 0 | 193 | - |
| og-sm11a | SM (썬·문) | 411 | 258 | 80 | 73 | 0 | 0 | 0 | 411 | 0 | ⚠️합본 |
| og-sm11b | SM (썬·문) | 143 | 0 | 75 | 68 | 0 | 0 | 0 | 143 | 0 | ⚠️합본 |
| og-sm12 | SM (썬·문) | 496 | 271 | 117 | 108 | 0 | 0 | 0 | 117 | 715 | - |
| og-sm12a | SM (썬·문) | 445 | 0 | 235 | 210 | 0 | 0 | 0 | 0 | 655 | - |
| og-sm1m | SM (썬·문) | 139 | 0 | 73 | 66 | 0 | 0 | 0 | 0 | 205 | - |
| og-sm1s | SM (썬·문) | 311 | 172 | 73 | 66 | 0 | 0 | 0 | 311 | 0 | ⚠️합본 |
| og-sm2+ | SM (썬·문) | 66 | 0 | 66 | 0 | 0 | 0 | 0 | 0 | 66 | - |
| og-sm2k | SM (썬·문) | 285 | 169 | 62 | 54 | 0 | 0 | 0 | 62 | 419 | - |
| og-sm2l | SM (썬·문) | 116 | 0 | 61 | 55 | 0 | 0 | 0 | 0 | 170 | - |
| og-sm3+ | SM (썬·문) | 246 | 78 | 82 | 86 | 0 | 0 | 0 | 64 | 356 | - |
| og-sm3h | SM (썬·문) | 290 | 169 | 64 | 57 | 0 | 0 | 0 | 290 | 0 | ⚠️합본 |
| og-sm3n | SM (썬·문) | 121 | 0 | 64 | 57 | 0 | 0 | 0 | 0 | 178 | - |
| og-sm4+ | SM (썬·문) | 245 | 0 | 125 | 120 | 0 | 0 | 0 | 0 | 364 | - |
| og-sm4a | SM (썬·문) | 117 | 0 | 62 | 55 | 0 | 0 | 0 | 0 | 172 | - |
| og-sm4s | SM (썬·문) | 241 | 124 | 62 | 55 | 0 | 0 | 0 | 241 | 0 | ⚠️합본 |
| og-sm5+ | SM (썬·문) | 171 | 0 | 68 | 103 | 0 | 0 | 0 | 0 | 234 | - |
| og-sm5m | SM (썬·문) | 150 | 0 | 78 | 72 | 0 | 0 | 0 | 0 | 222 | - |
| og-sm5s | SM (썬·문) | 323 | 173 | 78 | 72 | 0 | 0 | 0 | 78 | 454 | - |
| og-sm6 | SM (썬·문) | 358 | 146 | 110 | 102 | 0 | 0 | 0 | 101 | 488 | - |
| og-sm6a | SM (썬·문) | 144 | 78 | 66 | 0 | 0 | 0 | 0 | 59 | 158 | - |
| og-sm6b | SM (썬·문) | 86 | 0 | 86 | 0 | 0 | 0 | 0 | 0 | 86 | - |
| og-sm7 | SM (썬·문) | 399 | 183 | 112 | 104 | 0 | 0 | 0 | 399 | 0 | ⚠️합본 |
| og-sm7a | SM (썬·문) | 73 | 0 | 73 | 0 | 0 | 0 | 0 | 0 | 73 | - |
| og-sm7b | SM (썬·문) | 63 | 0 | 63 | 0 | 0 | 0 | 0 | 0 | 63 | - |
| og-sm8 | SM (썬·문) | 450 | 236 | 111 | 103 | 0 | 0 | 0 | 111 | 634 | - |
| og-sm8a | SM (썬·문) | 65 | 0 | 65 | 0 | 0 | 0 | 0 | 0 | 65 | - |
| og-sm8b | SM (썬·문) | 319 | 69 | 250 | 0 | 0 | 0 | 0 | 52 | 336 | - |
| og-sm9 | SM (썬·문) | 423 | 196 | 118 | 109 | 0 | 0 | 0 | 423 | 0 | ⚠️합본 |
| og-sm9a | SM (썬·문) | 70 | 0 | 70 | 0 | 0 | 0 | 0 | 0 | 70 | - |
| og-sm9b | SM (썬·문) | 69 | 0 | 69 | 0 | 0 | 0 | 0 | 0 | 69 | - |
| og-sma | SM (썬·문) | 94 | 94 | 0 | 0 | 0 | 0 | 0 | 0 | 178 | - |
| og-smp | SM (썬·문) | 251 | 251 | 0 | 0 | 0 | 0 | 0 | 0 | 498 | - |
| og-smp2 | SM (썬·문) | 67 | 18 | 25 | 24 | 0 | 0 | 0 | 18 | 91 | - |
| og-sn10a | SM (썬·문) | 69 | 0 | 69 | 0 | 0 | 0 | 0 | 0 | 69 | - |
| og-sn11 | SM (썬·문) | 115 | 0 | 115 | 0 | 0 | 0 | 0 | 0 | 115 | - |
| og-svk | SV | 93 | 0 | 44 | 49 | 0 | 0 | 0 | 0 | 134 | - |
| og-svln | SV | 47 | 0 | 22 | 25 | 0 | 0 | 0 | 0 | 69 | - |
| og-svls | SV | 47 | 0 | 22 | 25 | 0 | 0 | 0 | 0 | 69 | - |
| sv-151 | SV | 284 | 37 | 37 | 37 | 173 | 0 | 0 | 3 | 219 | - |
| sv-base | SV | 474 | 258 | 216 | 0 | 0 | 0 | 0 | 474 | 0 | ⚠️합본 |
| sv-black-bolt-white-flare | SV | 693 | 345 | 348 | 0 | 0 | 0 | 0 | 693 | 0 | ⚠️합본 |
| sv-crimson-haze | SV | 96 | 0 | 96 | 0 | 0 | 0 | 0 | 96 | 0 | ⚠️합본 |
| sv-destined-rivals | SV | 340 | 242 | 96 | 0 | 2 | 0 | 0 | 338 | 0 | ⚠️합본 |
| sv-heatwave-arena | SV | 92 | 0 | 92 | 0 | 0 | 0 | 0 | 92 | 0 | ⚠️합본 |
| sv-journey-together | SV | 315 | 183 | 125 | 0 | 7 | 0 | 0 | 308 | 0 | ⚠️합본 |
| sv-obsidian-flames | SV | 362 | 221 | 132 | 0 | 9 | 0 | 0 | 353 | 0 | ⚠️합본 |
| sv-paldea-evolved | SV | 477 | 279 | 198 | 0 | 0 | 0 | 0 | 477 | 0 | ⚠️합본 |
| sv-paldean-fates | SV | 245 | 245 | 0 | 0 | 0 | 0 | 0 | 245 | 0 | ⚠️합본 |
| sv-paradise-dragona | SV | 94 | 0 | 94 | 0 | 0 | 0 | 0 | 94 | 0 | ⚠️합본 |
| sv-paradox-rift | SV | 456 | 266 | 190 | 0 | 0 | 0 | 0 | 456 | 0 | ⚠️합본 |
| sv-prismatic-evolutions | SV | 237 | 0 | 57 | 0 | 180 | 0 | 0 | 57 | 0 | ⚠️합본 |
| sv-raging-surf | SV | 92 | 0 | 92 | 0 | 0 | 0 | 0 | 92 | 0 | ⚠️합본 |
| sv-shrouded-fable | SV | 99 | 99 | 0 | 0 | 0 | 0 | 0 | 99 | 0 | ⚠️합본 |
| sv-stellar-crown | SV | 175 | 40 | 0 | 0 | 135 | 0 | 0 | 40 | 0 | ⚠️합본 |
| sv-surging-sparks | SV | 252 | 146 | 0 | 0 | 106 | 0 | 0 | 146 | 0 | ⚠️합본 |
| sv-temporal-forces | SV | 267 | 218 | 49 | 0 | 0 | 0 | 0 | 267 | 0 | ⚠️합본 |
| sv-triplet-beat | SV | 103 | 0 | 103 | 0 | 0 | 0 | 0 | 103 | 0 | ⚠️합본 |
| sv-twilight-masquerade | SV | 326 | 225 | 100 | 0 | 1 | 0 | 0 | 325 | 0 | ⚠️합본 |
| og-vs1 | VS | 143 | 0 | 143 | 0 | 0 | 0 | 0 | 0 | 244 | - |
| og-web1 | web | 47 | 0 | 47 | 0 | 0 | 0 | 0 | 0 | 88 | - |
| og-g1 | XY | 115 | 115 | 0 | 0 | 0 | 0 | 0 | 0 | 203 | - |
| og-xy0 | XY | 39 | 39 | 0 | 0 | 0 | 0 | 0 | 0 | 72 | - |
| og-xy10 | XY | 300 | 125 | 88 | 87 | 0 | 0 | 0 | 300 | 0 | ⚠️합본 |
| og-xy11a | XY | 175 | 116 | 59 | 0 | 0 | 0 | 0 | 175 | 0 | ⚠️합본 |
| og-xy1a | XY | 209 | 146 | 63 | 0 | 0 | 0 | 0 | 209 | 0 | ⚠️합본 |
| og-xy1b | XY | 63 | 0 | 63 | 0 | 0 | 0 | 0 | 0 | 126 | - |
| og-xy2 | XY | 286 | 109 | 90 | 87 | 0 | 0 | 0 | 174 | 296 | - |
| og-xy3 | XY | 321 | 113 | 105 | 103 | 0 | 0 | 0 | 175 | 376 | - |
| og-xy4 | XY | 314 | 122 | 97 | 95 | 0 | 0 | 0 | 314 | 0 | ⚠️합본 |
| og-xy6 | XY | 290 | 110 | 91 | 89 | 0 | 0 | 0 | 290 | 0 | ⚠️합본 |
| og-xy7 | XY | 289 | 100 | 97 | 92 | 0 | 0 | 0 | 289 | 0 | ⚠️합본 |
| og-xy8b | XY | 65 | 0 | 65 | 0 | 0 | 0 | 0 | 0 | 130 | - |
| og-xy9 | XY | 300 | 123 | 89 | 88 | 0 | 0 | 0 | 300 | 0 | ⚠️합본 |
| og-xyp | XY | 216 | 216 | 0 | 0 | 0 | 0 | 0 | 0 | 410 | - |
| og-cp1 | XY (컨셉팩) | 102 | 34 | 34 | 34 | 0 | 0 | 0 | 22 | 160 | - |
| og-cp2 | XY (컨셉팩) | 54 | 0 | 27 | 27 | 0 | 0 | 0 | 0 | 81 | - |
| og-cp3 | XY (컨셉팩) | 64 | 0 | 32 | 32 | 0 | 0 | 0 | 0 | 96 | - |
| og-cp4 | XY (컨셉팩) | 131 | 0 | 0 | 0 | 131 | 0 | 0 | 0 | 0 | - |
| og-cp5 | XY (컨셉팩) | 74 | 0 | 38 | 36 | 0 | 0 | 0 | 0 | 110 | - |
| og-cp6 | XY (컨셉팩) | 329 | 113 | 103 | 113 | 0 | 0 | 0 | 83 | 489 | - |
| og-pmcg1 | 구판 | 102 | 0 | 102 | 0 | 0 | 0 | 0 | 0 | 171 | - |
| og-pmcg2 | 구판 | 48 | 0 | 48 | 0 | 0 | 0 | 0 | 0 | 95 | - |
| og-pmcg3 | 구판 | 48 | 0 | 48 | 0 | 0 | 0 | 0 | 0 | 91 | - |
| og-pmcg4 | 구판 | 65 | 0 | 65 | 0 | 0 | 0 | 0 | 0 | 118 | - |
| og-pmcg5 | 구판 | 96 | 0 | 96 | 0 | 0 | 0 | 0 | 0 | 162 | - |
| og-pmcg6 | 구판 | 98 | 0 | 98 | 0 | 0 | 0 | 0 | 0 | 173 | - |
| og-neo1 | 네오 | 96 | 0 | 96 | 0 | 0 | 0 | 0 | 0 | 168 | - |
| og-neo2 | 네오 | 57 | 0 | 57 | 0 | 0 | 0 | 0 | 0 | 109 | - |
| og-neo3 | 네오 | 57 | 0 | 57 | 0 | 0 | 0 | 0 | 0 | 109 | - |
| og-neo4 | 네오 | 113 | 0 | 113 | 0 | 0 | 0 | 0 | 0 | 211 | - |

## 3. 머지 후보 샘플 (최대 100쌍)

> 앞 50쌍 (high confidence 포켓몬) + 뒤 50쌍 (edge case / medium confidence)

| # | SetGroup | Num | Confidence | dex# | EN name (LC id) | JP name (LC id) | KR name (LC id) |
|---|---|---|---|---|---|---|---|
| 1 | og-xy5a | 2 | high | 14 | Kakuna (lc-en-tcg-xy5-002) | Kakuna (lc-orphan-jp-tcg-XY5a-2) | - |
| 2 | og-xy5a | 66 | high | 29 | Nidoran ♀ (lc-en-tcg-xy5-066) | Archie's Ace in the Hole - 066/070 (lc-orphan-jp-tcg-XY5a-66) | - |
| 3 | og-xy5a | 1 | high | 13 | Weedle (lc-en-tcg-xy5-001) | Weedle (lc-orphan-jp-tcg-XY5a-1) | - |
| 4 | og-xy5a | 3 | high | 15 | Beedrill (lc-en-tcg-xy5-003) | Beedrill (lc-orphan-jp-tcg-XY5a-3) | - |
| 5 | og-xy8a | 62 | high | 150 | Mewtwo-EX (lc-en-tcg-xy8-062) | Mewtwo EX - 062/059 (lc-orphan-jp-tcg-XY8a-62) | - |
| 6 | og-xy5a | 2 | high | 14 | Kakuna (lc-en-tcg-xy5-002) | Kakuna (lc-orphan-jp-tcg-XY5a-2) | - |
| 7 | og-xy5a | 66 | high | 29 | Nidoran ♀ (lc-en-tcg-xy5-066) | Archie's Ace in the Hole - 066/070 (lc-orphan-jp-tcg-XY5a-66) | - |
| 8 | og-xy5a | 1 | high | 13 | Weedle (lc-en-tcg-xy5-001) | Weedle (lc-orphan-jp-tcg-XY5a-1) | - |
| 9 | og-xy5a | 3 | high | 15 | Beedrill (lc-en-tcg-xy5-003) | Beedrill (lc-orphan-jp-tcg-XY5a-3) | - |
| 10 | og-xy8a | 62 | high | 150 | Mewtwo-EX (lc-en-tcg-xy8-062) | Mewtwo EX - 062/059 (lc-orphan-jp-tcg-XY8a-62) | - |

## 4. Ambiguous 케이스 (사용자 검토 필요)

총 2051개

| # | SetGroup | Num | 원인 | 관련 LC | 상세 |
|---|---|---|---|---|---|
| 1 | mega-brave-symphonia | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-orphan-jp-mega-brave-symphonia-M1L-018, lc-orphan-jp-mega-brave-symphonia-M1L-002, lc-orphan-jp-mega-brave-symphonia-M1L-004 ... (+181) | EN sets: , JP sets: jp-mega-brave-symphonia, KR sets: kr-m1l,kr-m1s,kr-mbg,kr-mbd |
| 2 | mega-dream-ex | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-orphan-jp-mega-dream-ex-156, lc-orphan-jp-mega-dream-ex-157, lc-orphan-jp-mega-dream-ex-151 ... (+247) | EN sets: , JP sets: jp-mega-dream-ex, KR sets: kr-mc,kr-m2a,kr-ma |
| 3 | mega-ninja-spinner | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-orphan-jp-mega-ninja-spinner-106, lc-orphan-jp-mega-ninja-spinner-104, lc-orphan-jp-mega-ninja-spinner-105 ... (+117) | EN sets: , JP sets: jp-mega-ninja-spinner, KR sets: kr-m4,kr-m-p |
| 4 | og-s10a | 4 | 번호(4) 일치 but dex# 불일치: keep=[46] vs candidate=[] | lc-en-tcg-swsh11-004 | keep: lc-en-tcg-swsh11-004 dex=[46] |
| 5 | og-s10a | 5 | 번호(5) 일치 but dex# 불일치: keep=[47] vs candidate=[] | lc-en-tcg-swsh11-005 | keep: lc-en-tcg-swsh11-005 dex=[47] |
| 6 | og-s10a | 6 | 번호(6) 일치 but dex# 불일치: keep=[265] vs candidate=[] | lc-en-tcg-swsh11-006 | keep: lc-en-tcg-swsh11-006 dex=[265] |
| 7 | og-s10a | 7 | 번호(7) 일치 but dex# 불일치: keep=[266] vs candidate=[] | lc-en-tcg-swsh11-007 | keep: lc-en-tcg-swsh11-007 dex=[266] |
| 8 | og-s10a | 8 | 번호(8) 일치 but dex# 불일치: keep=[267] vs candidate=[] | lc-en-tcg-swsh11-008 | keep: lc-en-tcg-swsh11-008 dex=[267] |
| 9 | og-s10a | 9 | 번호(9) 일치 but dex# 불일치: keep=[268] vs candidate=[] | lc-en-tcg-swsh11-009 | keep: lc-en-tcg-swsh11-009 dex=[268] |
| 10 | og-s10a | 10 | 번호(10) 일치 but dex# 불일치: keep=[269] vs candidate=[] | lc-en-tcg-swsh11-010 | keep: lc-en-tcg-swsh11-010 dex=[269] |
| 11 | og-s10a | 11 | 번호(11) 일치 but dex# 불일치: keep=[273] vs candidate=[] | lc-en-tcg-swsh11-011 | keep: lc-en-tcg-swsh11-011 dex=[273] |
| 12 | og-s10a | 14 | 번호(14) 일치 but dex# 불일치: keep=[315] vs candidate=[] | lc-en-tcg-swsh11-014 | keep: lc-en-tcg-swsh11-014 dex=[315] |
| 13 | og-s10a | 16 | 번호(16) 일치 but dex# 불일치: keep=[708] vs candidate=[] | lc-en-tcg-swsh11-016 | keep: lc-en-tcg-swsh11-016 dex=[708] |
| 14 | og-s10a | 17 | 번호(17) 일치 but dex# 불일치: keep=[709] vs candidate=[] | lc-en-tcg-swsh11-017 | keep: lc-en-tcg-swsh11-017 dex=[709] |
| 15 | og-s10a | 18 | 번호(18) 일치 but dex# 불일치: keep=[824] vs candidate=[] | lc-en-tcg-swsh11-018 | keep: lc-en-tcg-swsh11-018 dex=[824] |
| 16 | og-s10a | 19 | 번호(19) 일치 but dex# 불일치: keep=[825] vs candidate=[] | lc-en-tcg-swsh11-019 | keep: lc-en-tcg-swsh11-019 dex=[825] |
| 17 | og-s10a | 20 | 번호(20) 일치 but dex# 불일치: keep=[826] vs candidate=[] | lc-en-tcg-swsh11-020 | keep: lc-en-tcg-swsh11-020 dex=[826] |
| 18 | og-s10a | 21 | 번호(21) 일치 but dex# 불일치: keep=[218] vs candidate=[] | lc-en-tcg-swsh11-021 | keep: lc-en-tcg-swsh11-021 dex=[218] |
| 19 | og-s10a | 23 | 번호(23) 일치 but dex# 불일치: keep=[324] vs candidate=[] | lc-en-tcg-swsh11-023 | keep: lc-en-tcg-swsh11-023 dex=[324] |
| 20 | og-s10a | 24 | 번호(24) 일치 but dex# 불일치: keep=[607] vs candidate=[] | lc-en-tcg-swsh11-024 | keep: lc-en-tcg-swsh11-024 dex=[607] |
| 21 | og-s10a | 25 | 번호(25) 일치 but dex# 불일치: keep=[608] vs candidate=[] | lc-en-tcg-swsh11-025 | keep: lc-en-tcg-swsh11-025 dex=[608] |
| 22 | og-s10a | 27 | 번호(27) 일치 but dex# 불일치: keep=[655] vs candidate=[] | lc-en-tcg-swsh11-027 | keep: lc-en-tcg-swsh11-027 dex=[655] |
| 23 | og-s10a | 28 | 번호(28) 일치 but dex# 불일치: keep=[667] vs candidate=[] | lc-en-tcg-swsh11-028 | keep: lc-en-tcg-swsh11-028 dex=[667] |
| 24 | og-s10a | 29 | 번호(29) 일치 but dex# 불일치: keep=[668] vs candidate=[] | lc-en-tcg-swsh11-029 | keep: lc-en-tcg-swsh11-029 dex=[668] |
| 25 | og-s10a | 30 | 번호(30) 일치 but dex# 불일치: keep=[60] vs candidate=[] | lc-en-tcg-swsh11-030 | keep: lc-en-tcg-swsh11-030 dex=[60] |
| 26 | og-s10a | 31 | 번호(31) 일치 but dex# 불일치: keep=[61] vs candidate=[] | lc-en-tcg-swsh11-031 | keep: lc-en-tcg-swsh11-031 dex=[61] |
| 27 | og-s10a | 33 | 번호(33) 일치 but dex# 불일치: keep=[86] vs candidate=[] | lc-en-tcg-swsh11-033 | keep: lc-en-tcg-swsh11-033 dex=[86] |
| 28 | og-s10a | 34 | 번호(34) 일치 but dex# 불일치: keep=[87] vs candidate=[] | lc-en-tcg-swsh11-034 | keep: lc-en-tcg-swsh11-034 dex=[87] |
| 29 | og-s10a | 35 | 번호(35) 일치 but dex# 불일치: keep=[116] vs candidate=[] | lc-en-tcg-swsh11-035 | keep: lc-en-tcg-swsh11-035 dex=[116] |
| 30 | og-s10a | 36 | 번호(36) 일치 but dex# 불일치: keep=[117] vs candidate=[] | lc-en-tcg-swsh11-036 | keep: lc-en-tcg-swsh11-036 dex=[117] |
| 31 | og-s10a | 37 | 번호(37) 일치 but dex# 불일치: keep=[230] vs candidate=[] | lc-en-tcg-swsh11-037 | keep: lc-en-tcg-swsh11-037 dex=[230] |
| 32 | og-s10a | 38 | 번호(38) 일치 but dex# 불일치: keep=[370] vs candidate=[] | lc-en-tcg-swsh11-038 | keep: lc-en-tcg-swsh11-038 dex=[370] |
| 33 | og-s10a | 39 | 번호(39) 일치 but dex# 불일치: keep=[422] vs candidate=[] | lc-en-tcg-swsh11-039 | keep: lc-en-tcg-swsh11-039 dex=[422] |
| 34 | og-s10a | 40 | 번호(40) 일치 but dex# 불일치: keep=[456] vs candidate=[] | lc-en-tcg-swsh11-040 | keep: lc-en-tcg-swsh11-040 dex=[456] |
| 35 | og-s10a | 42 | 번호(42) 일치 but dex# 불일치: keep=[459] vs candidate=[] | lc-en-tcg-swsh11-042 | keep: lc-en-tcg-swsh11-042 dex=[459] |
| 36 | og-s10a | 43 | 번호(43) 일치 but dex# 불일치: keep=[460] vs candidate=[] | lc-en-tcg-swsh11-043 | keep: lc-en-tcg-swsh11-043 dex=[460] |
| 37 | og-s10a | 44 | 번호(44) 일치 but dex# 불일치: keep=[550] vs candidate=[] | lc-en-tcg-swsh11-044 | keep: lc-en-tcg-swsh11-044 dex=[550] |
| 38 | og-s10a | 45 | 번호(45) 일치 but dex# 불일치: keep=[902] vs candidate=[] | lc-en-tcg-swsh11-045 | keep: lc-en-tcg-swsh11-045 dex=[902] |
| 39 | og-s10a | 46 | 번호(46) 일치 but dex# 불일치: keep=[580] vs candidate=[] | lc-en-tcg-swsh11-046 | keep: lc-en-tcg-swsh11-046 dex=[580] |
| 40 | og-s10a | 47 | 번호(47) 일치 but dex# 불일치: keep=[581] vs candidate=[] | lc-en-tcg-swsh11-047 | keep: lc-en-tcg-swsh11-047 dex=[581] |
| 41 | og-s10a | 48 | 번호(48) 일치 but dex# 불일치: keep=[646] vs candidate=[] | lc-en-tcg-swsh11-048 | keep: lc-en-tcg-swsh11-048 dex=[646] |
| 42 | og-s10a | 49 | 번호(49) 일치 but dex# 불일치: keep=[646] vs candidate=[] | lc-en-tcg-swsh11-049 | keep: lc-en-tcg-swsh11-049 dex=[646] |
| 43 | og-s10a | 51 | 번호(51) 일치 but dex# 불일치: keep=[896] vs candidate=[] | lc-en-tcg-swsh11-051 | keep: lc-en-tcg-swsh11-051 dex=[896] |
| 44 | og-s10a | 52 | 번호(52) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-en-tcg-swsh11-052 | keep: lc-en-tcg-swsh11-052 dex=[25] |
| 45 | og-s10a | 53 | 번호(53) 일치 but dex# 불일치: keep=[26] vs candidate=[] | lc-en-tcg-swsh11-053 | keep: lc-en-tcg-swsh11-053 dex=[26] |
| 46 | og-s10a | 54 | 번호(54) 일치 but dex# 불일치: keep=[309] vs candidate=[] | lc-en-tcg-swsh11-054 | keep: lc-en-tcg-swsh11-054 dex=[309] |
| 47 | og-s10a | 55 | 번호(55) 일치 but dex# 불일치: keep=[310] vs candidate=[] | lc-en-tcg-swsh11-055 | keep: lc-en-tcg-swsh11-055 dex=[310] |
| 48 | og-s10a | 57 | 번호(57) 일치 but dex# 불일치: keep=[462] vs candidate=[] | lc-en-tcg-swsh11-057 | keep: lc-en-tcg-swsh11-057 dex=[462] |
| 49 | og-s10a | 59 | 번호(59) 일치 but dex# 불일치: keep=[602] vs candidate=[] | lc-en-tcg-swsh11-059 | keep: lc-en-tcg-swsh11-059 dex=[602] |
| 50 | og-s10a | 60 | 번호(60) 일치 but dex# 불일치: keep=[603] vs candidate=[] | lc-en-tcg-swsh11-060 | keep: lc-en-tcg-swsh11-060 dex=[603] |
| 51 | og-s10a | 61 | 번호(61) 일치 but dex# 불일치: keep=[604] vs candidate=[] | lc-en-tcg-swsh11-061 | keep: lc-en-tcg-swsh11-061 dex=[604] |
| 52 | og-s10a | 63 | 번호(63) 일치 but dex# 불일치: keep=[36] vs candidate=[] | lc-en-tcg-swsh11-063 | keep: lc-en-tcg-swsh11-063 dex=[36] |
| 53 | og-s10a | 64 | 번호(64) 일치 but dex# 불일치: keep=[92] vs candidate=[] | lc-en-tcg-swsh11-064 | keep: lc-en-tcg-swsh11-064 dex=[92] |
| 54 | og-s10a | 65 | 번호(65) 일치 but dex# 불일치: keep=[93] vs candidate=[] | lc-en-tcg-swsh11-065 | keep: lc-en-tcg-swsh11-065 dex=[93] |
| 55 | og-s10a | 66 | 번호(66) 일치 but dex# 불일치: keep=[94] vs candidate=[] | lc-en-tcg-swsh11-066 | keep: lc-en-tcg-swsh11-066 dex=[94] |
| 56 | og-s10a | 68 | 번호(68) 일치 but dex# 불일치: keep=[124] vs candidate=[] | lc-en-tcg-swsh11-068 | keep: lc-en-tcg-swsh11-068 dex=[124] |
| 57 | og-s10a | 69 | 번호(69) 일치 but dex# 불일치: keep=[282] vs candidate=[] | lc-en-tcg-swsh11-069 | keep: lc-en-tcg-swsh11-069 dex=[282] |
| 58 | og-s10a | 70 | 번호(70) 일치 but dex# 불일치: keep=[302] vs candidate=[] | lc-en-tcg-swsh11-070 | keep: lc-en-tcg-swsh11-070 dex=[302] |
| 59 | og-s10a | 71 | 번호(71) 일치 but dex# 불일치: keep=[303] vs candidate=[] | lc-en-tcg-swsh11-071 | keep: lc-en-tcg-swsh11-071 dex=[303] |
| 60 | og-s10a | 72 | 번호(72) 일치 but dex# 불일치: keep=[353] vs candidate=[] | lc-en-tcg-swsh11-072 | keep: lc-en-tcg-swsh11-072 dex=[353] |
| 61 | og-s10a | 73 | 번호(73) 일치 but dex# 불일치: keep=[354] vs candidate=[] | lc-en-tcg-swsh11-073 | keep: lc-en-tcg-swsh11-073 dex=[354] |
| 62 | og-s10a | 74 | 번호(74) 일치 but dex# 불일치: keep=[488] vs candidate=[] | lc-en-tcg-swsh11-074 | keep: lc-en-tcg-swsh11-074 dex=[488] |
| 63 | og-s10a | 75 | 번호(75) 일치 but dex# 불일치: keep=[570] vs candidate=[] | lc-en-tcg-swsh11-075 | keep: lc-en-tcg-swsh11-075 dex=[570] |
| 64 | og-s10a | 77 | 번호(77) 일치 but dex# 불일치: keep=[686] vs candidate=[] | lc-en-tcg-swsh11-077 | keep: lc-en-tcg-swsh11-077 dex=[686] |
| 65 | og-s10a | 78 | 번호(78) 일치 but dex# 불일치: keep=[687] vs candidate=[] | lc-en-tcg-swsh11-078 | keep: lc-en-tcg-swsh11-078 dex=[687] |
| 66 | og-s10a | 79 | 번호(79) 일치 but dex# 불일치: keep=[764] vs candidate=[] | lc-en-tcg-swsh11-079 | keep: lc-en-tcg-swsh11-079 dex=[764] |
| 67 | og-s10a | 80 | 번호(80) 일치 but dex# 불일치: keep=[778] vs candidate=[] | lc-en-tcg-swsh11-080 | keep: lc-en-tcg-swsh11-080 dex=[778] |
| 68 | og-s10a | 81 | 번호(81) 일치 but dex# 불일치: keep=[897] vs candidate=[] | lc-en-tcg-swsh11-081 | keep: lc-en-tcg-swsh11-081 dex=[897] |
| 69 | og-s10a | 82 | 번호(82) 일치 but dex# 불일치: keep=[905] vs candidate=[] | lc-en-tcg-swsh11-082 | keep: lc-en-tcg-swsh11-082 dex=[905] |
| 70 | og-s10a | 83 | 번호(83) 일치 but dex# 불일치: keep=[58] vs candidate=[] | lc-en-tcg-swsh11-083 | keep: lc-en-tcg-swsh11-083 dex=[58] |
| 71 | og-s10a | 84 | 번호(84) 일치 but dex# 불일치: keep=[59] vs candidate=[] | lc-en-tcg-swsh11-084 | keep: lc-en-tcg-swsh11-084 dex=[59] |
| 72 | og-s10a | 86 | 번호(86) 일치 but dex# 불일치: keep=[66] vs candidate=[] | lc-en-tcg-swsh11-086 | keep: lc-en-tcg-swsh11-086 dex=[66] |
| 73 | og-s10a | 87 | 번호(87) 일치 but dex# 불일치: keep=[67] vs candidate=[] | lc-en-tcg-swsh11-087 | keep: lc-en-tcg-swsh11-087 dex=[67] |
| 74 | og-s10a | 88 | 번호(88) 일치 but dex# 불일치: keep=[68] vs candidate=[] | lc-en-tcg-swsh11-088 | keep: lc-en-tcg-swsh11-088 dex=[68] |
| 75 | og-s10a | 89 | 번호(89) 일치 but dex# 불일치: keep=[111] vs candidate=[] | lc-en-tcg-swsh11-089 | keep: lc-en-tcg-swsh11-089 dex=[111] |
| 76 | og-s10a | 90 | 번호(90) 일치 but dex# 불일치: keep=[112] vs candidate=[] | lc-en-tcg-swsh11-090 | keep: lc-en-tcg-swsh11-090 dex=[112] |
| 77 | og-s10a | 91 | 번호(91) 일치 but dex# 불일치: keep=[464] vs candidate=[] | lc-en-tcg-swsh11-091 | keep: lc-en-tcg-swsh11-091 dex=[464] |
| 78 | og-s10a | 92 | 번호(92) 일치 but dex# 불일치: keep=[142] vs candidate=[] | lc-en-tcg-swsh11-092 | keep: lc-en-tcg-swsh11-092 dex=[142] |
| 79 | og-s10a | 93 | 번호(93) 일치 but dex# 불일치: keep=[142] vs candidate=[] | lc-en-tcg-swsh11-093 | keep: lc-en-tcg-swsh11-093 dex=[142] |
| 80 | og-s10a | 95 | 번호(95) 일치 but dex# 불일치: keep=[207] vs candidate=[] | lc-en-tcg-swsh11-095 | keep: lc-en-tcg-swsh11-095 dex=[207] |
| 81 | og-s10a | 96 | 번호(96) 일치 but dex# 불일치: keep=[472] vs candidate=[] | lc-en-tcg-swsh11-096 | keep: lc-en-tcg-swsh11-096 dex=[472] |
| 82 | og-s10a | 97 | 번호(97) 일치 but dex# 불일치: keep=[296] vs candidate=[] | lc-en-tcg-swsh11-097 | keep: lc-en-tcg-swsh11-097 dex=[296] |
| 83 | og-s10a | 98 | 번호(98) 일치 but dex# 불일치: keep=[297] vs candidate=[] | lc-en-tcg-swsh11-098 | keep: lc-en-tcg-swsh11-098 dex=[297] |
| 84 | og-s10a | 99 | 번호(99) 일치 but dex# 불일치: keep=[307] vs candidate=[] | lc-en-tcg-swsh11-099 | keep: lc-en-tcg-swsh11-099 dex=[307] |
| 85 | og-s10a | 1 | 번호(1) 일치 but dex# 불일치: keep=[43] vs candidate=[] | lc-en-tcg-swsh11-001 | keep: lc-en-tcg-swsh11-001 dex=[43] |
| 86 | og-s10a | 2 | 번호(2) 일치 but dex# 불일치: keep=[44] vs candidate=[] | lc-en-tcg-swsh11-002 | keep: lc-en-tcg-swsh11-002 dex=[44] |
| 87 | og-s10a | 3 | 번호(3) 일치 but dex# 불일치: keep=[45] vs candidate=[] | lc-en-tcg-swsh11-003 | keep: lc-en-tcg-swsh11-003 dex=[45] |
| 88 | og-s10a | 12 | 번호(12) 일치 but dex# 불일치: keep=[274] vs candidate=[] | lc-en-tcg-swsh11-012 | keep: lc-en-tcg-swsh11-012 dex=[274] |
| 89 | og-s10a | 13 | 번호(13) 일치 but dex# 불일치: keep=[275] vs candidate=[] | lc-en-tcg-swsh11-013 | keep: lc-en-tcg-swsh11-013 dex=[275] |
| 90 | og-s10a | 15 | 번호(15) 일치 but dex# 불일치: keep=[407] vs candidate=[] | lc-en-tcg-swsh11-015 | keep: lc-en-tcg-swsh11-015 dex=[407] |
| 91 | og-s10a | 22 | 번호(22) 일치 but dex# 불일치: keep=[219] vs candidate=[] | lc-en-tcg-swsh11-022 | keep: lc-en-tcg-swsh11-022 dex=[219] |
| 92 | og-s10a | 26 | 번호(26) 일치 but dex# 불일치: keep=[609] vs candidate=[] | lc-en-tcg-swsh11-026 | keep: lc-en-tcg-swsh11-026 dex=[609] |
| 93 | og-s10a | 32 | 번호(32) 일치 but dex# 불일치: keep=[186] vs candidate=[] | lc-en-tcg-swsh11-032 | keep: lc-en-tcg-swsh11-032 dex=[186] |
| 94 | og-s10a | 41 | 번호(41) 일치 but dex# 불일치: keep=[457] vs candidate=[] | lc-en-tcg-swsh11-041 | keep: lc-en-tcg-swsh11-041 dex=[457] |
| 95 | og-s10a | 50 | 번호(50) 일치 but dex# 불일치: keep=[845] vs candidate=[] | lc-en-tcg-swsh11-050 | keep: lc-en-tcg-swsh11-050 dex=[845] |
| 96 | og-s10a | 56 | 번호(56) 일치 but dex# 불일치: keep=[462] vs candidate=[] | lc-en-tcg-swsh11-056 | keep: lc-en-tcg-swsh11-056 dex=[462] |
| 97 | og-s10a | 58 | 번호(58) 일치 but dex# 불일치: keep=[479] vs candidate=[] | lc-en-tcg-swsh11-058 | keep: lc-en-tcg-swsh11-058 dex=[479] |
| 98 | og-s10a | 62 | 번호(62) 일치 but dex# 불일치: keep=[35] vs candidate=[] | lc-en-tcg-swsh11-062 | keep: lc-en-tcg-swsh11-062 dex=[35] |
| 99 | og-s10a | 67 | 번호(67) 일치 but dex# 불일치: keep=[122] vs candidate=[] | lc-en-tcg-swsh11-067 | keep: lc-en-tcg-swsh11-067 dex=[122] |
| 100 | og-s10a | 76 | 번호(76) 일치 but dex# 불일치: keep=[571] vs candidate=[] | lc-en-tcg-swsh11-076 | keep: lc-en-tcg-swsh11-076 dex=[571] |
| 101 | og-s10a | 85 | 번호(85) 일치 but dex# 불일치: keep=[62] vs candidate=[] | lc-en-tcg-swsh11-085 | keep: lc-en-tcg-swsh11-085 dex=[62] |
| 102 | og-s10a | 94 | 번호(94) 일치 but dex# 불일치: keep=[185] vs candidate=[] | lc-en-tcg-swsh11-094 | keep: lc-en-tcg-swsh11-094 dex=[185] |
| 103 | og-s10b | 2 | 번호(2) 일치 but dex# 불일치: keep=[2] vs candidate=[] | lc-en-tcg-pgo-002 | keep: lc-en-tcg-pgo-002 dex=[2] |
| 104 | og-s10b | 3 | 번호(3) 일치 but dex# 불일치: keep=[3] vs candidate=[] | lc-en-tcg-pgo-003 | keep: lc-en-tcg-pgo-003 dex=[3] |
| 105 | og-s10b | 4 | 번호(4) 일치 but dex# 불일치: keep=[3] vs candidate=[] | lc-en-tcg-pgo-004 | keep: lc-en-tcg-pgo-004 dex=[3] |
| 106 | og-s10b | 6 | 번호(6) 일치 but dex# 불일치: keep=[167] vs candidate=[] | lc-en-tcg-pgo-006 | keep: lc-en-tcg-pgo-006 dex=[167] |
| 107 | og-s10b | 7 | 번호(7) 일치 but dex# 불일치: keep=[168] vs candidate=[] | lc-en-tcg-pgo-007 | keep: lc-en-tcg-pgo-007 dex=[168] |
| 108 | og-s10b | 8 | 번호(8) 일치 but dex# 불일치: keep=[4] vs candidate=[] | lc-en-tcg-pgo-008 | keep: lc-en-tcg-pgo-008 dex=[4] |
| 109 | og-s10b | 9 | 번호(9) 일치 but dex# 불일치: keep=[5] vs candidate=[] | lc-en-tcg-pgo-009 | keep: lc-en-tcg-pgo-009 dex=[5] |
| 110 | og-s10b | 10 | 번호(10) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-pgo-010 | keep: lc-en-tcg-pgo-010 dex=[6] |
| 111 | og-s10b | 11 | 번호(11) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-pgo-011 | keep: lc-en-tcg-pgo-011 dex=[6] |
| 112 | og-s10b | 12 | 번호(12) 일치 but dex# 불일치: keep=[146] vs candidate=[] | lc-en-tcg-pgo-012 | keep: lc-en-tcg-pgo-012 dex=[146] |
| 113 | og-s10b | 13 | 번호(13) 일치 but dex# 불일치: keep=[322] vs candidate=[] | lc-en-tcg-pgo-013 | keep: lc-en-tcg-pgo-013 dex=[322] |
| 114 | og-s10b | 18 | 번호(18) 일치 but dex# 불일치: keep=[9] vs candidate=[] | lc-en-tcg-pgo-018 | keep: lc-en-tcg-pgo-018 dex=[9] |
| 115 | og-s10b | 20 | 번호(20) 일치 but dex# 불일치: keep=[80] vs candidate=[] | lc-en-tcg-pgo-020 | keep: lc-en-tcg-pgo-020 dex=[80] |
| 116 | og-s10b | 21 | 번호(21) 일치 but dex# 불일치: keep=[129] vs candidate=[] | lc-en-tcg-pgo-021 | keep: lc-en-tcg-pgo-021 dex=[129] |
| 117 | og-s10b | 23 | 번호(23) 일치 but dex# 불일치: keep=[131] vs candidate=[] | lc-en-tcg-pgo-023 | keep: lc-en-tcg-pgo-023 dex=[131] |
| 118 | og-s10b | 25 | 번호(25) 일치 but dex# 불일치: keep=[767] vs candidate=[] | lc-en-tcg-pgo-025 | keep: lc-en-tcg-pgo-025 dex=[767] |
| 119 | og-s10b | 26 | 번호(26) 일치 but dex# 불일치: keep=[768] vs candidate=[] | lc-en-tcg-pgo-026 | keep: lc-en-tcg-pgo-026 dex=[768] |
| 120 | og-s10b | 27 | 번호(27) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-en-tcg-pgo-027 | keep: lc-en-tcg-pgo-027 dex=[25] |
| 121 | og-s10b | 28 | 번호(28) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-en-tcg-pgo-028 | keep: lc-en-tcg-pgo-028 dex=[25] |
| 122 | og-s10b | 29 | 번호(29) 일치 but dex# 불일치: keep=[145] vs candidate=[] | lc-en-tcg-pgo-029 | keep: lc-en-tcg-pgo-029 dex=[145] |
| 123 | og-s10b | 30 | 번호(30) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-en-tcg-pgo-030 | keep: lc-en-tcg-pgo-030 dex=[150] |
| 124 | og-s10b | 31 | 번호(31) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-en-tcg-pgo-031 | keep: lc-en-tcg-pgo-031 dex=[150] |
| 125 | og-s10b | 32 | 번호(32) 일치 but dex# 불일치: keep=[177] vs candidate=[] | lc-en-tcg-pgo-032 | keep: lc-en-tcg-pgo-032 dex=[177] |
| 126 | og-s10b | 34 | 번호(34) 일치 but dex# 불일치: keep=[337] vs candidate=[] | lc-en-tcg-pgo-034 | keep: lc-en-tcg-pgo-034 dex=[337] |
| 127 | og-s10b | 35 | 번호(35) 일치 but dex# 불일치: keep=[700] vs candidate=[] | lc-en-tcg-pgo-035 | keep: lc-en-tcg-pgo-035 dex=[700] |
| 128 | og-s10b | 36 | 번호(36) 일치 but dex# 불일치: keep=[95] vs candidate=[] | lc-en-tcg-pgo-036 | keep: lc-en-tcg-pgo-036 dex=[95] |
| 129 | og-s10b | 37 | 번호(37) 일치 but dex# 불일치: keep=[246] vs candidate=[] | lc-en-tcg-pgo-037 | keep: lc-en-tcg-pgo-037 dex=[246] |
| 130 | og-s10b | 38 | 번호(38) 일치 but dex# 불일치: keep=[247] vs candidate=[] | lc-en-tcg-pgo-038 | keep: lc-en-tcg-pgo-038 dex=[247] |
| 131 | og-s10b | 39 | 번호(39) 일치 but dex# 불일치: keep=[338] vs candidate=[] | lc-en-tcg-pgo-039 | keep: lc-en-tcg-pgo-039 dex=[338] |
| 132 | og-s10b | 40 | 번호(40) 일치 but dex# 불일치: keep=[534] vs candidate=[] | lc-en-tcg-pgo-040 | keep: lc-en-tcg-pgo-040 dex=[534] |
| 133 | og-s10b | 41 | 번호(41) 일치 but dex# 불일치: keep=[19] vs candidate=[] | lc-en-tcg-pgo-041 | keep: lc-en-tcg-pgo-041 dex=[19] |
| 134 | og-s10b | 43 | 번호(43) 일치 but dex# 불일치: keep=[248] vs candidate=[] | lc-en-tcg-pgo-043 | keep: lc-en-tcg-pgo-043 dex=[248] |
| 135 | og-s10b | 44 | 번호(44) 일치 but dex# 불일치: keep=[208] vs candidate=[] | lc-en-tcg-pgo-044 | keep: lc-en-tcg-pgo-044 dex=[208] |
| 136 | og-s10b | 45 | 번호(45) 일치 but dex# 불일치: keep=[808] vs candidate=[] | lc-en-tcg-pgo-045 | keep: lc-en-tcg-pgo-045 dex=[808] |
| 137 | og-s10b | 46 | 번호(46) 일치 but dex# 불일치: keep=[809] vs candidate=[] | lc-en-tcg-pgo-046 | keep: lc-en-tcg-pgo-046 dex=[809] |
| 138 | og-s10b | 47 | 번호(47) 일치 but dex# 불일치: keep=[809] vs candidate=[] | lc-en-tcg-pgo-047 | keep: lc-en-tcg-pgo-047 dex=[809] |
| 139 | og-s10b | 48 | 번호(48) 일치 but dex# 불일치: keep=[809] vs candidate=[] | lc-en-tcg-pgo-048 | keep: lc-en-tcg-pgo-048 dex=[809] |
| 140 | og-s10b | 49 | 번호(49) 일치 but dex# 불일치: keep=[149] vs candidate=[] | lc-en-tcg-pgo-049 | keep: lc-en-tcg-pgo-049 dex=[149] |
| 141 | og-s10b | 52 | 번호(52) 일치 but dex# 불일치: keep=[242] vs candidate=[] | lc-en-tcg-pgo-052 | keep: lc-en-tcg-pgo-052 dex=[242] |
| 142 | og-s10b | 53 | 번호(53) 일치 but dex# 불일치: keep=[132] vs candidate=[] | lc-en-tcg-pgo-053 | keep: lc-en-tcg-pgo-053 dex=[132] |
| 143 | og-s10b | 54 | 번호(54) 일치 but dex# 불일치: keep=[133] vs candidate=[] | lc-en-tcg-pgo-054 | keep: lc-en-tcg-pgo-054 dex=[133] |
| 144 | og-s10b | 55 | 번호(55) 일치 but dex# 불일치: keep=[143] vs candidate=[] | lc-en-tcg-pgo-055 | keep: lc-en-tcg-pgo-055 dex=[143] |
| 145 | og-s10b | 56 | 번호(56) 일치 but dex# 불일치: keep=[190] vs candidate=[] | lc-en-tcg-pgo-056 | keep: lc-en-tcg-pgo-056 dex=[190] |
| 146 | og-s10b | 57 | 번호(57) 일치 but dex# 불일치: keep=[424] vs candidate=[] | lc-en-tcg-pgo-057 | keep: lc-en-tcg-pgo-057 dex=[424] |
| 147 | og-s10b | 58 | 번호(58) 일치 but dex# 불일치: keep=[289] vs candidate=[] | lc-en-tcg-pgo-058 | keep: lc-en-tcg-pgo-058 dex=[289] |
| 148 | og-s10b | 59 | 번호(59) 일치 but dex# 불일치: keep=[399] vs candidate=[] | lc-en-tcg-pgo-059 | keep: lc-en-tcg-pgo-059 dex=[399] |
| 149 | og-s10b | 61 | 번호(61) 일치 but dex# 불일치: keep=[519] vs candidate=[] | lc-en-tcg-pgo-061 | keep: lc-en-tcg-pgo-061 dex=[519] |
| 150 | og-s10b | 62 | 번호(62) 일치 but dex# 불일치: keep=[520] vs candidate=[] | lc-en-tcg-pgo-062 | keep: lc-en-tcg-pgo-062 dex=[520] |
| 151 | og-s10b | 63 | 번호(63) 일치 but dex# 불일치: keep=[521] vs candidate=[] | lc-en-tcg-pgo-063 | keep: lc-en-tcg-pgo-063 dex=[521] |
| 152 | og-s10b | 72 | 번호(72) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-en-tcg-pgo-072 | keep: lc-en-tcg-pgo-072 dex=[150] |
| 153 | og-s10b | 73 | 번호(73) 일치 but dex# 불일치: keep=[534] vs candidate=[] | lc-en-tcg-pgo-073 | keep: lc-en-tcg-pgo-073 dex=[534] |
| 154 | og-s10b | 74 | 번호(74) 일치 but dex# 불일치: keep=[534] vs candidate=[] | lc-en-tcg-pgo-074 | keep: lc-en-tcg-pgo-074 dex=[534] |
| 155 | og-s10b | 75 | 번호(75) 일치 but dex# 불일치: keep=[809] vs candidate=[] | lc-en-tcg-pgo-075 | keep: lc-en-tcg-pgo-075 dex=[809] |
| 156 | og-s10b | 76 | 번호(76) 일치 but dex# 불일치: keep=[149] vs candidate=[] | lc-en-tcg-pgo-076 | keep: lc-en-tcg-pgo-076 dex=[149] |
| 157 | og-s10b | 77 | 번호(77) 일치 but dex# 불일치: keep=[289] vs candidate=[] | lc-en-tcg-pgo-077 | keep: lc-en-tcg-pgo-077 dex=[289] |
| 158 | og-s10b | 79 | 번호(79) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-en-tcg-pgo-079 | keep: lc-en-tcg-pgo-079 dex=[150] |
| 159 | og-s10b | 80 | 번호(80) 일치 but dex# 불일치: keep=[809] vs candidate=[] | lc-en-tcg-pgo-080 | keep: lc-en-tcg-pgo-080 dex=[809] |
| 160 | og-s10b | 81 | 번호(81) 일치 but dex# 불일치: keep=[149] vs candidate=[] | lc-en-tcg-pgo-081 | keep: lc-en-tcg-pgo-081 dex=[149] |
| 161 | og-s10b | 86 | 번호(86) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-en-tcg-pgo-086 | keep: lc-en-tcg-pgo-086 dex=[150] |
| 162 | og-s10b | 14 | 번호(14) 일치 but dex# 불일치: keep=[323] vs candidate=[] | lc-en-tcg-pgo-014 | keep: lc-en-tcg-pgo-014 dex=[323] |
| 163 | og-s10b | 15 | 번호(15) 일치 but dex# 불일치: keep=[7] vs candidate=[] | lc-en-tcg-pgo-015 | keep: lc-en-tcg-pgo-015 dex=[7] |
| 164 | og-s10b | 1 | 번호(1) 일치 but dex# 불일치: keep=[1] vs candidate=[] | lc-en-tcg-pgo-001 | keep: lc-en-tcg-pgo-001 dex=[1] |
| 165 | og-s10b | 5 | 번호(5) 일치 but dex# 불일치: keep=[103] vs candidate=[] | lc-en-tcg-pgo-005 | keep: lc-en-tcg-pgo-005 dex=[103] |
| 166 | og-s10b | 16 | 번호(16) 일치 but dex# 불일치: keep=[8] vs candidate=[] | lc-en-tcg-pgo-016 | keep: lc-en-tcg-pgo-016 dex=[8] |
| 167 | og-s10b | 17 | 번호(17) 일치 but dex# 불일치: keep=[9] vs candidate=[] | lc-en-tcg-pgo-017 | keep: lc-en-tcg-pgo-017 dex=[9] |
| 168 | og-s10b | 19 | 번호(19) 일치 but dex# 불일치: keep=[79] vs candidate=[] | lc-en-tcg-pgo-019 | keep: lc-en-tcg-pgo-019 dex=[79] |
| 169 | og-s10b | 22 | 번호(22) 일치 but dex# 불일치: keep=[130] vs candidate=[] | lc-en-tcg-pgo-022 | keep: lc-en-tcg-pgo-022 dex=[130] |
| 170 | og-s10b | 24 | 번호(24) 일치 but dex# 불일치: keep=[144] vs candidate=[] | lc-en-tcg-pgo-024 | keep: lc-en-tcg-pgo-024 dex=[144] |
| 171 | og-s10b | 33 | 번호(33) 일치 but dex# 불일치: keep=[178] vs candidate=[] | lc-en-tcg-pgo-033 | keep: lc-en-tcg-pgo-033 dex=[178] |
| 172 | og-s10b | 42 | 번호(42) 일치 but dex# 불일치: keep=[20] vs candidate=[] | lc-en-tcg-pgo-042 | keep: lc-en-tcg-pgo-042 dex=[20] |
| 173 | og-s10b | 50 | 번호(50) 일치 but dex# 불일치: keep=[149] vs candidate=[] | lc-en-tcg-pgo-050 | keep: lc-en-tcg-pgo-050 dex=[149] |
| 174 | og-s10b | 51 | 번호(51) 일치 but dex# 불일치: keep=[113] vs candidate=[] | lc-en-tcg-pgo-051 | keep: lc-en-tcg-pgo-051 dex=[113] |
| 175 | og-s10b | 60 | 번호(60) 일치 but dex# 불일치: keep=[400] vs candidate=[] | lc-en-tcg-pgo-060 | keep: lc-en-tcg-pgo-060 dex=[400] |
| 176 | og-s10b | 71 | 번호(71) 일치 but dex# 불일치: keep=[103] vs candidate=[] | lc-en-tcg-pgo-071 | keep: lc-en-tcg-pgo-071 dex=[103] |
| 177 | og-s10d | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-swsh10-147, lc-en-tcg-swsh10-148, lc-en-tcg-swsh10-149 ... (+301) | EN sets: en-tcg-swsh10, JP sets: jp-tcg-S10D, KR sets: kr-s10,kr-sj |
| 178 | og-s11a | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-swsh12-003, lc-en-tcg-swsh12-004, lc-en-tcg-swsh12-005 ... (+395) | EN sets: en-tcg-swsh12, JP sets: jp-tcg-S11a, KR sets: kr-s11,kr-s11a |
| 179 | og-s12 | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-orphan-jp-tcg-S12-090, lc-orphan-jp-tcg-S12-095, lc-orphan-jp-tcg-S12-034 ... (+242) | EN sets: , JP sets: jp-tcg-S12, KR sets: kr-s12,kr-so |
| 180 | og-s12a | 7 | 번호(7) 일치 but dex# 불일치: keep=[191] vs candidate=[] | lc-en-tcg-swsh12pt5-007 | keep: lc-en-tcg-swsh12pt5-007 dex=[191] |
| 181 | og-s12a | 6 | 번호(6) 일치 but dex# 불일치: keep=[123] vs candidate=[] | lc-en-tcg-swsh12pt5-006 | keep: lc-en-tcg-swsh12pt5-006 dex=[123] |
| 182 | og-s12a | 1 | 번호(1) 일치 but dex# 불일치: keep=[43] vs candidate=[] | lc-en-tcg-swsh12pt5-001 | keep: lc-en-tcg-swsh12pt5-001 dex=[43] |
| 183 | og-s12a | 2 | 번호(2) 일치 but dex# 불일치: keep=[44] vs candidate=[] | lc-en-tcg-swsh12pt5-002 | keep: lc-en-tcg-swsh12pt5-002 dex=[44] |
| 184 | og-s12a | 3 | 번호(3) 일치 but dex# 불일치: keep=[182] vs candidate=[] | lc-en-tcg-swsh12pt5-003 | keep: lc-en-tcg-swsh12pt5-003 dex=[182] |
| 185 | og-s12a | 4 | 번호(4) 일치 but dex# 불일치: keep=[114] vs candidate=[] | lc-en-tcg-swsh12pt5-004 | keep: lc-en-tcg-swsh12pt5-004 dex=[114] |
| 186 | og-s12a | 5 | 번호(5) 일치 but dex# 불일치: keep=[465] vs candidate=[] | lc-en-tcg-swsh12pt5-005 | keep: lc-en-tcg-swsh12pt5-005 dex=[465] |
| 187 | og-s12a | 9 | 번호(9) 일치 but dex# 불일치: keep=[469] vs candidate=[] | lc-en-tcg-swsh12pt5-009 | keep: lc-en-tcg-swsh12pt5-009 dex=[469] |
| 188 | og-s12a | 10 | 번호(10) 일치 but dex# 불일치: keep=[401] vs candidate=[] | lc-en-tcg-swsh12pt5-010 | keep: lc-en-tcg-swsh12pt5-010 dex=[401] |
| 189 | og-s12a | 11 | 번호(11) 일치 but dex# 불일치: keep=[420] vs candidate=[] | lc-en-tcg-swsh12pt5-011 | keep: lc-en-tcg-swsh12pt5-011 dex=[420] |
| 190 | og-s12a | 12 | 번호(12) 일치 but dex# 불일치: keep=[455] vs candidate=[] | lc-en-tcg-swsh12pt5-012 | keep: lc-en-tcg-swsh12pt5-012 dex=[455] |
| 191 | og-s12a | 13 | 번호(13) 일치 but dex# 불일치: keep=[470] vs candidate=[] | lc-en-tcg-swsh12pt5-013 | keep: lc-en-tcg-swsh12pt5-013 dex=[470] |
| 192 | og-s12a | 14 | 번호(14) 일치 but dex# 불일치: keep=[470] vs candidate=[] | lc-en-tcg-swsh12pt5-014 | keep: lc-en-tcg-swsh12pt5-014 dex=[470] |
| 193 | og-s12a | 15 | 번호(15) 일치 but dex# 불일치: keep=[736] vs candidate=[] | lc-en-tcg-swsh12pt5-015 | keep: lc-en-tcg-swsh12pt5-015 dex=[736] |
| 194 | og-s12a | 16 | 번호(16) 일치 but dex# 불일치: keep=[893] vs candidate=[] | lc-en-tcg-swsh12pt5-016 | keep: lc-en-tcg-swsh12pt5-016 dex=[893] |
| 195 | og-s12a | 18 | 번호(18) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-swsh12pt5-018 | keep: lc-en-tcg-swsh12pt5-018 dex=[6] |
| 196 | og-s12a | 19 | 번호(19) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-swsh12pt5-019 | keep: lc-en-tcg-swsh12pt5-019 dex=[6] |
| 197 | og-s12a | 20 | 번호(20) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-swsh12pt5-020 | keep: lc-en-tcg-swsh12pt5-020 dex=[6] |
| 198 | og-s12a | 21 | 번호(21) 일치 but dex# 불일치: keep=[244] vs candidate=[] | lc-en-tcg-swsh12pt5-021 | keep: lc-en-tcg-swsh12pt5-021 dex=[244] |
| 199 | og-s12a | 22 | 번호(22) 일치 but dex# 불일치: keep=[514] vs candidate=[] | lc-en-tcg-swsh12pt5-022 | keep: lc-en-tcg-swsh12pt5-022 dex=[514] |
| 200 | og-s12a | 23 | 번호(23) 일치 but dex# 불일치: keep=[514] vs candidate=[] | lc-en-tcg-swsh12pt5-023 | keep: lc-en-tcg-swsh12pt5-023 dex=[514] |
| 201 | og-s12a | 24 | 번호(24) 일치 but dex# 불일치: keep=[636] vs candidate=[] | lc-en-tcg-swsh12pt5-024 | keep: lc-en-tcg-swsh12pt5-024 dex=[636] |
| 202 | og-s12a | 25 | 번호(25) 일치 but dex# 불일치: keep=[637] vs candidate=[] | lc-en-tcg-swsh12pt5-025 | keep: lc-en-tcg-swsh12pt5-025 dex=[637] |
| 203 | og-s12a | 28 | 번호(28) 일치 but dex# 불일치: keep=[758] vs candidate=[] | lc-en-tcg-swsh12pt5-028 | keep: lc-en-tcg-swsh12pt5-028 dex=[758] |
| 204 | og-s12a | 29 | 번호(29) 일치 but dex# 불일치: keep=[86] vs candidate=[] | lc-en-tcg-swsh12pt5-029 | keep: lc-en-tcg-swsh12pt5-029 dex=[86] |
| 205 | og-s12a | 30 | 번호(30) 일치 but dex# 불일치: keep=[122] vs candidate=[] | lc-en-tcg-swsh12pt5-030 | keep: lc-en-tcg-swsh12pt5-030 dex=[122] |
| 206 | og-s12a | 31 | 번호(31) 일치 but dex# 불일치: keep=[320] vs candidate=[] | lc-en-tcg-swsh12pt5-031 | keep: lc-en-tcg-swsh12pt5-031 dex=[320] |
| 207 | og-s12a | 32 | 번호(32) 일치 but dex# 불일치: keep=[321] vs candidate=[] | lc-en-tcg-swsh12pt5-032 | keep: lc-en-tcg-swsh12pt5-032 dex=[321] |
| 208 | og-s12a | 33 | 번호(33) 일치 but dex# 불일치: keep=[341] vs candidate=[] | lc-en-tcg-swsh12pt5-033 | keep: lc-en-tcg-swsh12pt5-033 dex=[341] |
| 209 | og-s12a | 34 | 번호(34) 일치 but dex# 불일치: keep=[361] vs candidate=[] | lc-en-tcg-swsh12pt5-034 | keep: lc-en-tcg-swsh12pt5-034 dex=[361] |
| 210 | og-s12a | 35 | 번호(35) 일치 but dex# 불일치: keep=[370] vs candidate=[] | lc-en-tcg-swsh12pt5-035 | keep: lc-en-tcg-swsh12pt5-035 dex=[370] |
| 211 | og-s12a | 37 | 번호(37) 일치 but dex# 불일치: keep=[382] vs candidate=[] | lc-en-tcg-swsh12pt5-037 | keep: lc-en-tcg-swsh12pt5-037 dex=[382] |
| 212 | og-s12a | 38 | 번호(38) 일치 but dex# 불일치: keep=[471] vs candidate=[] | lc-en-tcg-swsh12pt5-038 | keep: lc-en-tcg-swsh12pt5-038 dex=[471] |
| 213 | og-s12a | 39 | 번호(39) 일치 but dex# 불일치: keep=[403] vs candidate=[] | lc-en-tcg-swsh12pt5-039 | keep: lc-en-tcg-swsh12pt5-039 dex=[403] |
| 214 | og-s12a | 40 | 번호(40) 일치 but dex# 불일치: keep=[403] vs candidate=[] | lc-en-tcg-swsh12pt5-040 | keep: lc-en-tcg-swsh12pt5-040 dex=[403] |
| 215 | og-s12a | 41 | 번호(41) 일치 but dex# 불일치: keep=[404] vs candidate=[] | lc-en-tcg-swsh12pt5-041 | keep: lc-en-tcg-swsh12pt5-041 dex=[404] |
| 216 | og-s12a | 42 | 번호(42) 일치 but dex# 불일치: keep=[404] vs candidate=[] | lc-en-tcg-swsh12pt5-042 | keep: lc-en-tcg-swsh12pt5-042 dex=[404] |
| 217 | og-s12a | 43 | 번호(43) 일치 but dex# 불일치: keep=[405] vs candidate=[] | lc-en-tcg-swsh12pt5-043 | keep: lc-en-tcg-swsh12pt5-043 dex=[405] |
| 218 | og-s12a | 53 | 번호(53) 일치 but dex# 불일치: keep=[807] vs candidate=[] | lc-en-tcg-swsh12pt5-053 | keep: lc-en-tcg-swsh12pt5-053 dex=[807] |
| 219 | og-s12a | 45 | 번호(45) 일치 but dex# 불일치: keep=[479] vs candidate=[] | lc-en-tcg-swsh12pt5-045 | keep: lc-en-tcg-swsh12pt5-045 dex=[479] |
| 220 | og-s12a | 47 | 번호(47) 일치 but dex# 불일치: keep=[587] vs candidate=[] | lc-en-tcg-swsh12pt5-047 | keep: lc-en-tcg-swsh12pt5-047 dex=[587] |
| 221 | og-s12a | 48 | 번호(48) 일치 but dex# 불일치: keep=[603] vs candidate=[] | lc-en-tcg-swsh12pt5-048 | keep: lc-en-tcg-swsh12pt5-048 dex=[603] |
| 222 | og-s12a | 49 | 번호(49) 일치 but dex# 불일치: keep=[694] vs candidate=[] | lc-en-tcg-swsh12pt5-049 | keep: lc-en-tcg-swsh12pt5-049 dex=[694] |
| 223 | og-s12a | 50 | 번호(50) 일치 but dex# 불일치: keep=[695] vs candidate=[] | lc-en-tcg-swsh12pt5-050 | keep: lc-en-tcg-swsh12pt5-050 dex=[695] |
| 224 | og-s12a | 51 | 번호(51) 일치 but dex# 불일치: keep=[737] vs candidate=[] | lc-en-tcg-swsh12pt5-051 | keep: lc-en-tcg-swsh12pt5-051 dex=[737] |
| 225 | og-s12a | 52 | 번호(52) 일치 but dex# 불일치: keep=[807] vs candidate=[] | lc-en-tcg-swsh12pt5-052 | keep: lc-en-tcg-swsh12pt5-052 dex=[807] |
| 226 | og-s12a | 56 | 번호(56) 일치 but dex# 불일치: keep=[871] vs candidate=[] | lc-en-tcg-swsh12pt5-056 | keep: lc-en-tcg-swsh12pt5-056 dex=[871] |
| 227 | og-s12a | 57 | 번호(57) 일치 but dex# 불일치: keep=[102] vs candidate=[] | lc-en-tcg-swsh12pt5-057 | keep: lc-en-tcg-swsh12pt5-057 dex=[102] |
| 228 | og-s12a | 58 | 번호(58) 일치 but dex# 불일치: keep=[103] vs candidate=[] | lc-en-tcg-swsh12pt5-058 | keep: lc-en-tcg-swsh12pt5-058 dex=[103] |
| 229 | og-s12a | 59 | 번호(59) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-en-tcg-swsh12pt5-059 | keep: lc-en-tcg-swsh12pt5-059 dex=[150] |
| 230 | og-s12a | 60 | 번호(60) 일치 but dex# 불일치: keep=[151] vs candidate=[] | lc-en-tcg-swsh12pt5-060 | keep: lc-en-tcg-swsh12pt5-060 dex=[151] |
| 231 | og-s12a | 61 | 번호(61) 일치 but dex# 불일치: keep=[203] vs candidate=[] | lc-en-tcg-swsh12pt5-061 | keep: lc-en-tcg-swsh12pt5-061 dex=[203] |
| 232 | og-s12a | 71 | 번호(71) 일치 but dex# 불일치: keep=[447] vs candidate=[] | lc-en-tcg-swsh12pt5-071 | keep: lc-en-tcg-swsh12pt5-071 dex=[447] |
| 233 | og-s12a | 63 | 번호(63) 일치 but dex# 불일치: keep=[356] vs candidate=[] | lc-en-tcg-swsh12pt5-063 | keep: lc-en-tcg-swsh12pt5-063 dex=[356] |
| 234 | og-s12a | 64 | 번호(64) 일치 but dex# 불일치: keep=[786] vs candidate=[] | lc-en-tcg-swsh12pt5-064 | keep: lc-en-tcg-swsh12pt5-064 dex=[786] |
| 235 | og-s12a | 65 | 번호(65) 일치 but dex# 불일치: keep=[858] vs candidate=[] | lc-en-tcg-swsh12pt5-065 | keep: lc-en-tcg-swsh12pt5-065 dex=[858] |
| 236 | og-s12a | 66 | 번호(66) 일치 but dex# 불일치: keep=[858] vs candidate=[] | lc-en-tcg-swsh12pt5-066 | keep: lc-en-tcg-swsh12pt5-066 dex=[858] |
| 237 | og-s12a | 67 | 번호(67) 일치 but dex# 불일치: keep=[905] vs candidate=[] | lc-en-tcg-swsh12pt5-067 | keep: lc-en-tcg-swsh12pt5-067 dex=[905] |
| 238 | og-s12a | 68 | 번호(68) 일치 but dex# 불일치: keep=[75] vs candidate=[] | lc-en-tcg-swsh12pt5-068 | keep: lc-en-tcg-swsh12pt5-068 dex=[75] |
| 239 | og-s12a | 69 | 번호(69) 일치 but dex# 불일치: keep=[338] vs candidate=[] | lc-en-tcg-swsh12pt5-069 | keep: lc-en-tcg-swsh12pt5-069 dex=[338] |
| 240 | og-s12a | 70 | 번호(70) 일치 but dex# 불일치: keep=[343] vs candidate=[] | lc-en-tcg-swsh12pt5-070 | keep: lc-en-tcg-swsh12pt5-070 dex=[343] |
| 241 | og-s12a | 74 | 번호(74) 일치 but dex# 불일치: keep=[745] vs candidate=[] | lc-en-tcg-swsh12pt5-074 | keep: lc-en-tcg-swsh12pt5-074 dex=[745] |
| 242 | og-s12a | 75 | 번호(75) 일치 but dex# 불일치: keep=[109] vs candidate=[] | lc-en-tcg-swsh12pt5-075 | keep: lc-en-tcg-swsh12pt5-075 dex=[109] |
| 243 | og-s12a | 76 | 번호(76) 일치 but dex# 불일치: keep=[359] vs candidate=[] | lc-en-tcg-swsh12pt5-076 | keep: lc-en-tcg-swsh12pt5-076 dex=[359] |
| 244 | og-s12a | 77 | 번호(77) 일치 but dex# 불일치: keep=[509] vs candidate=[] | lc-en-tcg-swsh12pt5-077 | keep: lc-en-tcg-swsh12pt5-077 dex=[509] |
| 245 | og-s12a | 78 | 번호(78) 일치 but dex# 불일치: keep=[510] vs candidate=[] | lc-en-tcg-swsh12pt5-078 | keep: lc-en-tcg-swsh12pt5-078 dex=[510] |
| 246 | og-s12a | 79 | 번호(79) 일치 but dex# 불일치: keep=[552] vs candidate=[] | lc-en-tcg-swsh12pt5-079 | keep: lc-en-tcg-swsh12pt5-079 dex=[552] |
| 247 | og-s12a | 80 | 번호(80) 일치 but dex# 불일치: keep=[675] vs candidate=[] | lc-en-tcg-swsh12pt5-080 | keep: lc-en-tcg-swsh12pt5-080 dex=[675] |
| 248 | og-s12a | 81 | 번호(81) 일치 but dex# 불일치: keep=[690] vs candidate=[] | lc-en-tcg-swsh12pt5-081 | keep: lc-en-tcg-swsh12pt5-081 dex=[690] |
| 249 | og-s12a | 83 | 번호(83) 일치 but dex# 불일치: keep=[720] vs candidate=[] | lc-en-tcg-swsh12pt5-083 | keep: lc-en-tcg-swsh12pt5-083 dex=[720] |
| 250 | og-s12a | 84 | 번호(84) 일치 but dex# 불일치: keep=[52] vs candidate=[] | lc-en-tcg-swsh12pt5-084 | keep: lc-en-tcg-swsh12pt5-084 dex=[52] |
| 251 | og-s12a | 85 | 번호(85) 일치 but dex# 불일치: keep=[863] vs candidate=[] | lc-en-tcg-swsh12pt5-085 | keep: lc-en-tcg-swsh12pt5-085 dex=[863] |
| 252 | og-s12a | 86 | 번호(86) 일치 but dex# 불일치: keep=[212] vs candidate=[] | lc-en-tcg-swsh12pt5-086 | keep: lc-en-tcg-swsh12pt5-086 dex=[212] |
| 253 | og-s12a | 87 | 번호(87) 일치 but dex# 불일치: keep=[304] vs candidate=[] | lc-en-tcg-swsh12pt5-087 | keep: lc-en-tcg-swsh12pt5-087 dex=[304] |
| 254 | og-s12a | 88 | 번호(88) 일치 but dex# 불일치: keep=[305] vs candidate=[] | lc-en-tcg-swsh12pt5-088 | keep: lc-en-tcg-swsh12pt5-088 dex=[305] |
| 255 | og-s12a | 89 | 번호(89) 일치 but dex# 불일치: keep=[306] vs candidate=[] | lc-en-tcg-swsh12pt5-089 | keep: lc-en-tcg-swsh12pt5-089 dex=[306] |
| 256 | og-s12a | 90 | 번호(90) 일치 but dex# 불일치: keep=[375] vs candidate=[] | lc-en-tcg-swsh12pt5-090 | keep: lc-en-tcg-swsh12pt5-090 dex=[375] |
| 257 | og-s12a | 92 | 번호(92) 일치 but dex# 불일치: keep=[624] vs candidate=[] | lc-en-tcg-swsh12pt5-092 | keep: lc-en-tcg-swsh12pt5-092 dex=[624] |
| 258 | og-s12a | 93 | 번호(93) 일치 but dex# 불일치: keep=[625] vs candidate=[] | lc-en-tcg-swsh12pt5-093 | keep: lc-en-tcg-swsh12pt5-093 dex=[625] |
| 259 | og-s12a | 94 | 번호(94) 일치 but dex# 불일치: keep=[888] vs candidate=[] | lc-en-tcg-swsh12pt5-094 | keep: lc-en-tcg-swsh12pt5-094 dex=[888] |
| 260 | og-s12a | 95 | 번호(95) 일치 but dex# 불일치: keep=[888] vs candidate=[] | lc-en-tcg-swsh12pt5-095 | keep: lc-en-tcg-swsh12pt5-095 dex=[888] |
| 261 | og-s12a | 97 | 번호(97) 일치 but dex# 불일치: keep=[889] vs candidate=[] | lc-en-tcg-swsh12pt5-097 | keep: lc-en-tcg-swsh12pt5-097 dex=[889] |
| 262 | og-s12a | 98 | 번호(98) 일치 but dex# 불일치: keep=[889] vs candidate=[] | lc-en-tcg-swsh12pt5-098 | keep: lc-en-tcg-swsh12pt5-098 dex=[889] |
| 263 | og-s12a | 107 | 번호(107) 일치 but dex# 불일치: keep=[132] vs candidate=[] | lc-en-tcg-swsh12pt5-107 | keep: lc-en-tcg-swsh12pt5-107 dex=[132] |
| 264 | og-s12a | 100 | 번호(100) 일치 but dex# 불일치: keep=[384] vs candidate=[] | lc-en-tcg-swsh12pt5-100 | keep: lc-en-tcg-swsh12pt5-100 dex=[384] |
| 265 | og-s12a | 101 | 번호(101) 일치 but dex# 불일치: keep=[384] vs candidate=[] | lc-en-tcg-swsh12pt5-101 | keep: lc-en-tcg-swsh12pt5-101 dex=[384] |
| 266 | og-s12a | 102 | 번호(102) 일치 but dex# 불일치: keep=[384] vs candidate=[] | lc-en-tcg-swsh12pt5-102 | keep: lc-en-tcg-swsh12pt5-102 dex=[384] |
| 267 | og-s12a | 103 | 번호(103) 일치 but dex# 불일치: keep=[884] vs candidate=[] | lc-en-tcg-swsh12pt5-103 | keep: lc-en-tcg-swsh12pt5-103 dex=[884] |
| 268 | og-s12a | 104 | 번호(104) 일치 but dex# 불일치: keep=[884] vs candidate=[] | lc-en-tcg-swsh12pt5-104 | keep: lc-en-tcg-swsh12pt5-104 dex=[884] |
| 269 | og-s12a | 105 | 번호(105) 일치 but dex# 불일치: keep=[890] vs candidate=[] | lc-en-tcg-swsh12pt5-105 | keep: lc-en-tcg-swsh12pt5-105 dex=[890] |
| 270 | og-s12a | 106 | 번호(106) 일치 but dex# 불일치: keep=[128] vs candidate=[] | lc-en-tcg-swsh12pt5-106 | keep: lc-en-tcg-swsh12pt5-106 dex=[128] |
| 271 | og-s12a | 109 | 번호(109) 일치 but dex# 불일치: keep=[143] vs candidate=[] | lc-en-tcg-swsh12pt5-109 | keep: lc-en-tcg-swsh12pt5-109 dex=[143] |
| 272 | og-s12a | 110 | 번호(110) 일치 but dex# 불일치: keep=[396] vs candidate=[] | lc-en-tcg-swsh12pt5-110 | keep: lc-en-tcg-swsh12pt5-110 dex=[396] |
| 273 | og-s12a | 111 | 번호(111) 일치 but dex# 불일치: keep=[399] vs candidate=[] | lc-en-tcg-swsh12pt5-111 | keep: lc-en-tcg-swsh12pt5-111 dex=[399] |
| 274 | og-s12a | 112 | 번호(112) 일치 but dex# 불일치: keep=[441] vs candidate=[] | lc-en-tcg-swsh12pt5-112 | keep: lc-en-tcg-swsh12pt5-112 dex=[441] |
| 275 | og-s12a | 113 | 번호(113) 일치 but dex# 불일치: keep=[486] vs candidate=[] | lc-en-tcg-swsh12pt5-113 | keep: lc-en-tcg-swsh12pt5-113 dex=[486] |
| 276 | og-s12a | 114 | 번호(114) 일치 but dex# 불일치: keep=[486] vs candidate=[] | lc-en-tcg-swsh12pt5-114 | keep: lc-en-tcg-swsh12pt5-114 dex=[486] |
| 277 | og-s12a | 115 | 번호(115) 일치 but dex# 불일치: keep=[492] vs candidate=[] | lc-en-tcg-swsh12pt5-115 | keep: lc-en-tcg-swsh12pt5-115 dex=[492] |
| 278 | og-s12a | 116 | 번호(116) 일치 but dex# 불일치: keep=[508] vs candidate=[] | lc-en-tcg-swsh12pt5-116 | keep: lc-en-tcg-swsh12pt5-116 dex=[508] |
| 279 | og-s12a | 118 | 번호(118) 일치 but dex# 불일치: keep=[735] vs candidate=[] | lc-en-tcg-swsh12pt5-118 | keep: lc-en-tcg-swsh12pt5-118 dex=[735] |
| 280 | og-s12a | 119 | 번호(119) 일치 but dex# 불일치: keep=[765] vs candidate=[] | lc-en-tcg-swsh12pt5-119 | keep: lc-en-tcg-swsh12pt5-119 dex=[765] |
| 281 | og-s12a | 120 | 번호(120) 일치 but dex# 불일치: keep=[820] vs candidate=[] | lc-en-tcg-swsh12pt5-120 | keep: lc-en-tcg-swsh12pt5-120 dex=[820] |
| 282 | og-s12a | 121 | 번호(121) 일치 but dex# 불일치: keep=[831] vs candidate=[] | lc-en-tcg-swsh12pt5-121 | keep: lc-en-tcg-swsh12pt5-121 dex=[831] |
| 283 | og-s12a | 122 | 번호(122) 일치 but dex# 불일치: keep=[832] vs candidate=[] | lc-en-tcg-swsh12pt5-122 | keep: lc-en-tcg-swsh12pt5-122 dex=[832] |
| 284 | og-s12a | 91 | 번호(91) 일치 but dex# 불일치: keep=[624] vs candidate=[] | lc-en-tcg-swsh12pt5-091 | keep: lc-en-tcg-swsh12pt5-091 dex=[624] |
| 285 | og-s12a | 8 | 번호(8) 일치 but dex# 불일치: keep=[193] vs candidate=[] | lc-en-tcg-swsh12pt5-008 | keep: lc-en-tcg-swsh12pt5-008 dex=[193] |
| 286 | og-s12a | 17 | 번호(17) 일치 but dex# 불일치: keep=[898] vs candidate=[] | lc-en-tcg-swsh12pt5-017 | keep: lc-en-tcg-swsh12pt5-017 dex=[898] |
| 287 | og-s12a | 26 | 번호(26) 일치 but dex# 불일치: keep=[721] vs candidate=[] | lc-en-tcg-swsh12pt5-026 | keep: lc-en-tcg-swsh12pt5-026 dex=[721] |
| 288 | og-s12a | 27 | 번호(27) 일치 but dex# 불일치: keep=[757] vs candidate=[] | lc-en-tcg-swsh12pt5-027 | keep: lc-en-tcg-swsh12pt5-027 dex=[757] |
| 289 | og-s12a | 36 | 번호(36) 일치 but dex# 불일치: keep=[382] vs candidate=[] | lc-en-tcg-swsh12pt5-036 | keep: lc-en-tcg-swsh12pt5-036 dex=[382] |
| 290 | og-s12a | 44 | 번호(44) 일치 but dex# 불일치: keep=[405] vs candidate=[] | lc-en-tcg-swsh12pt5-044 | keep: lc-en-tcg-swsh12pt5-044 dex=[405] |
| 291 | og-s12a | 46 | 번호(46) 일치 but dex# 불일치: keep=[479] vs candidate=[] | lc-en-tcg-swsh12pt5-046 | keep: lc-en-tcg-swsh12pt5-046 dex=[479] |
| 292 | og-s12a | 54 | 번호(54) 일치 but dex# 불일치: keep=[807] vs candidate=[] | lc-en-tcg-swsh12pt5-054 | keep: lc-en-tcg-swsh12pt5-054 dex=[807] |
| 293 | og-s12a | 55 | 번호(55) 일치 but dex# 불일치: keep=[807] vs candidate=[] | lc-en-tcg-swsh12pt5-055 | keep: lc-en-tcg-swsh12pt5-055 dex=[807] |
| 294 | og-s12a | 62 | 번호(62) 일치 but dex# 불일치: keep=[337] vs candidate=[] | lc-en-tcg-swsh12pt5-062 | keep: lc-en-tcg-swsh12pt5-062 dex=[337] |
| 295 | og-s12a | 72 | 번호(72) 일치 but dex# 불일치: keep=[674] vs candidate=[] | lc-en-tcg-swsh12pt5-072 | keep: lc-en-tcg-swsh12pt5-072 dex=[674] |
| 296 | og-s12a | 73 | 번호(73) 일치 but dex# 불일치: keep=[744] vs candidate=[] | lc-en-tcg-swsh12pt5-073 | keep: lc-en-tcg-swsh12pt5-073 dex=[744] |
| 297 | og-s12a | 82 | 번호(82) 일치 but dex# 불일치: keep=[691] vs candidate=[] | lc-en-tcg-swsh12pt5-082 | keep: lc-en-tcg-swsh12pt5-082 dex=[691] |
| 298 | og-s12a | 96 | 번호(96) 일치 but dex# 불일치: keep=[888] vs candidate=[] | lc-en-tcg-swsh12pt5-096 | keep: lc-en-tcg-swsh12pt5-096 dex=[888] |
| 299 | og-s12a | 99 | 번호(99) 일치 but dex# 불일치: keep=[889] vs candidate=[] | lc-en-tcg-swsh12pt5-099 | keep: lc-en-tcg-swsh12pt5-099 dex=[889] |
| 300 | og-s12a | 108 | 번호(108) 일치 but dex# 불일치: keep=[133] vs candidate=[] | lc-en-tcg-swsh12pt5-108 | keep: lc-en-tcg-swsh12pt5-108 dex=[133] |
| 301 | og-s12a | 117 | 번호(117) 일치 but dex# 불일치: keep=[734] vs candidate=[] | lc-en-tcg-swsh12pt5-117 | keep: lc-en-tcg-swsh12pt5-117 dex=[734] |
| 302 | og-s12a | 160 | 번호(160) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-en-tcg-swsh12pt5-160 | keep: lc-en-tcg-swsh12pt5-160 dex=[25] |
| 303 | og-s1w | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-swsh1-212, lc-en-tcg-swsh1-215, lc-en-tcg-swsh1-068 ... (+356) | EN sets: en-tcg-swsh1, JP sets: jp-tcg-S1W, KR sets: kr-si,kr-svm,kr-sd,kr-sn,kr-sb,kr-sa,kr-sp1,kr-s1w |
| 304 | og-s2 | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-swsh2-192, lc-en-tcg-swsh2-001, lc-en-tcg-swsh2-002 ... (+427) | EN sets: en-tcg-swsh2, JP sets: jp-tcg-S2, KR sets: kr-sp2,kr-s2 |
| 305 | og-s2a | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-swsh3-165, lc-en-tcg-swsh3-167, lc-en-tcg-swsh3-168 ... (+362) | EN sets: en-tcg-swsh3, JP sets: jp-tcg-S2a, KR sets: kr-s2a,kr-se |
| 306 | og-s3a | 1 | 번호(1) 일치 but dex# 불일치: keep=[13] vs candidate=[] | lc-en-tcg-swsh4-001 | keep: lc-en-tcg-swsh4-001 dex=[13] |
| 307 | og-s3a | 2 | 번호(2) 일치 but dex# 불일치: keep=[14] vs candidate=[] | lc-en-tcg-swsh4-002 | keep: lc-en-tcg-swsh4-002 dex=[14] |
| 308 | og-s3a | 5 | 번호(5) 일치 but dex# 불일치: keep=[103] vs candidate=[] | lc-en-tcg-swsh4-005 | keep: lc-en-tcg-swsh4-005 dex=[103] |
| 309 | og-s3a | 6 | 번호(6) 일치 but dex# 불일치: keep=[193] vs candidate=[] | lc-en-tcg-swsh4-006 | keep: lc-en-tcg-swsh4-006 dex=[193] |
| 310 | og-s3a | 8 | 번호(8) 일치 but dex# 불일치: keep=[204] vs candidate=[] | lc-en-tcg-swsh4-008 | keep: lc-en-tcg-swsh4-008 dex=[204] |
| 311 | og-s3a | 10 | 번호(10) 일치 but dex# 불일치: keep=[273] vs candidate=[] | lc-en-tcg-swsh4-010 | keep: lc-en-tcg-swsh4-010 dex=[273] |
| 312 | og-s3a | 11 | 번호(11) 일치 but dex# 불일치: keep=[274] vs candidate=[] | lc-en-tcg-swsh4-011 | keep: lc-en-tcg-swsh4-011 dex=[274] |
| 313 | og-s3a | 12 | 번호(12) 일치 but dex# 불일치: keep=[275] vs candidate=[] | lc-en-tcg-swsh4-012 | keep: lc-en-tcg-swsh4-012 dex=[275] |
| 314 | og-s3a | 13 | 번호(13) 일치 but dex# 불일치: keep=[290] vs candidate=[] | lc-en-tcg-swsh4-013 | keep: lc-en-tcg-swsh4-013 dex=[290] |
| 315 | og-s3a | 14 | 번호(14) 일치 but dex# 불일치: keep=[291] vs candidate=[] | lc-en-tcg-swsh4-014 | keep: lc-en-tcg-swsh4-014 dex=[291] |
| 316 | og-s3a | 16 | 번호(16) 일치 but dex# 불일치: keep=[649] vs candidate=[] | lc-en-tcg-swsh4-016 | keep: lc-en-tcg-swsh4-016 dex=[649] |
| 317 | og-s3a | 17 | 번호(17) 일치 but dex# 불일치: keep=[672] vs candidate=[] | lc-en-tcg-swsh4-017 | keep: lc-en-tcg-swsh4-017 dex=[672] |
| 318 | og-s3a | 18 | 번호(18) 일치 but dex# 불일치: keep=[673] vs candidate=[] | lc-en-tcg-swsh4-018 | keep: lc-en-tcg-swsh4-018 dex=[673] |
| 319 | og-s3a | 19 | 번호(19) 일치 but dex# 불일치: keep=[781] vs candidate=[] | lc-en-tcg-swsh4-019 | keep: lc-en-tcg-swsh4-019 dex=[781] |
| 320 | og-s3a | 20 | 번호(20) 일치 but dex# 불일치: keep=[826] vs candidate=[] | lc-en-tcg-swsh4-020 | keep: lc-en-tcg-swsh4-020 dex=[826] |
| 321 | og-s3a | 21 | 번호(21) 일치 but dex# 불일치: keep=[826] vs candidate=[] | lc-en-tcg-swsh4-021 | keep: lc-en-tcg-swsh4-021 dex=[826] |
| 322 | og-s3a | 22 | 번호(22) 일치 but dex# 불일치: keep=[893] vs candidate=[] | lc-en-tcg-swsh4-022 | keep: lc-en-tcg-swsh4-022 dex=[893] |
| 323 | og-s3a | 23 | 번호(23) 일치 but dex# 불일치: keep=[4] vs candidate=[] | lc-en-tcg-swsh4-023 | keep: lc-en-tcg-swsh4-023 dex=[4] |
| 324 | og-s3a | 24 | 번호(24) 일치 but dex# 불일치: keep=[5] vs candidate=[] | lc-en-tcg-swsh4-024 | keep: lc-en-tcg-swsh4-024 dex=[5] |
| 325 | og-s3a | 25 | 번호(25) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-swsh4-025 | keep: lc-en-tcg-swsh4-025 dex=[6] |
| 326 | og-s3a | 26 | 번호(26) 일치 but dex# 불일치: keep=[136] vs candidate=[] | lc-en-tcg-swsh4-026 | keep: lc-en-tcg-swsh4-026 dex=[136] |
| 327 | og-s3a | 27 | 번호(27) 일치 but dex# 불일치: keep=[218] vs candidate=[] | lc-en-tcg-swsh4-027 | keep: lc-en-tcg-swsh4-027 dex=[218] |
| 328 | og-s3a | 28 | 번호(28) 일치 but dex# 불일치: keep=[219] vs candidate=[] | lc-en-tcg-swsh4-028 | keep: lc-en-tcg-swsh4-028 dex=[219] |
| 329 | og-s3a | 30 | 번호(30) 일치 but dex# 불일치: keep=[134] vs candidate=[] | lc-en-tcg-swsh4-030 | keep: lc-en-tcg-swsh4-030 dex=[134] |
| 330 | og-s3a | 31 | 번호(31) 일치 but dex# 불일치: keep=[320] vs candidate=[] | lc-en-tcg-swsh4-031 | keep: lc-en-tcg-swsh4-031 dex=[320] |
| 331 | og-s3a | 33 | 번호(33) 일치 but dex# 불일치: keep=[501] vs candidate=[] | lc-en-tcg-swsh4-033 | keep: lc-en-tcg-swsh4-033 dex=[501] |
| 332 | og-s3a | 36 | 번호(36) 일치 but dex# 불일치: keep=[555] vs candidate=[] | lc-en-tcg-swsh4-036 | keep: lc-en-tcg-swsh4-036 dex=[555] |
| 333 | og-s3a | 37 | 번호(37) 일치 but dex# 불일치: keep=[555] vs candidate=[] | lc-en-tcg-swsh4-037 | keep: lc-en-tcg-swsh4-037 dex=[555] |
| 334 | og-s3a | 38 | 번호(38) 일치 but dex# 불일치: keep=[833] vs candidate=[] | lc-en-tcg-swsh4-038 | keep: lc-en-tcg-swsh4-038 dex=[833] |
| 335 | og-s3a | 39 | 번호(39) 일치 but dex# 불일치: keep=[834] vs candidate=[] | lc-en-tcg-swsh4-039 | keep: lc-en-tcg-swsh4-039 dex=[834] |
| 336 | og-s3a | 40 | 번호(40) 일치 but dex# 불일치: keep=[845] vs candidate=[] | lc-en-tcg-swsh4-040 | keep: lc-en-tcg-swsh4-040 dex=[845] |
| 337 | og-s3a | 41 | 번호(41) 일치 but dex# 불일치: keep=[846] vs candidate=[] | lc-en-tcg-swsh4-041 | keep: lc-en-tcg-swsh4-041 dex=[846] |
| 338 | og-s3a | 42 | 번호(42) 일치 but dex# 불일치: keep=[847] vs candidate=[] | lc-en-tcg-swsh4-042 | keep: lc-en-tcg-swsh4-042 dex=[847] |
| 339 | og-s3a | 44 | 번호(44) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-en-tcg-swsh4-044 | keep: lc-en-tcg-swsh4-044 dex=[25] |
| 340 | og-s3a | 45 | 번호(45) 일치 but dex# 불일치: keep=[100] vs candidate=[] | lc-en-tcg-swsh4-045 | keep: lc-en-tcg-swsh4-045 dex=[100] |
| 341 | og-s3a | 47 | 번호(47) 일치 but dex# 불일치: keep=[135] vs candidate=[] | lc-en-tcg-swsh4-047 | keep: lc-en-tcg-swsh4-047 dex=[135] |
| 342 | og-s3a | 48 | 번호(48) 일치 but dex# 불일치: keep=[145] vs candidate=[] | lc-en-tcg-swsh4-048 | keep: lc-en-tcg-swsh4-048 dex=[145] |
| 343 | og-s3a | 49 | 번호(49) 일치 but dex# 불일치: keep=[181] vs candidate=[] | lc-en-tcg-swsh4-049 | keep: lc-en-tcg-swsh4-049 dex=[181] |
| 344 | og-s3a | 50 | 번호(50) 일치 but dex# 불일치: keep=[243] vs candidate=[] | lc-en-tcg-swsh4-050 | keep: lc-en-tcg-swsh4-050 dex=[243] |
| 345 | og-s3a | 51 | 번호(51) 일치 but dex# 불일치: keep=[309] vs candidate=[] | lc-en-tcg-swsh4-051 | keep: lc-en-tcg-swsh4-051 dex=[309] |
| 346 | og-s3a | 90 | 번호(90) 일치 but dex# 불일치: keep=[447] vs candidate=[] | lc-en-tcg-swsh4-090 | keep: lc-en-tcg-swsh4-090 dex=[447] |
| 347 | og-s3a | 53 | 번호(53) 일치 but dex# 불일치: keep=[522] vs candidate=[] | lc-en-tcg-swsh4-053 | keep: lc-en-tcg-swsh4-053 dex=[522] |
| 348 | og-s3a | 54 | 번호(54) 일치 but dex# 불일치: keep=[523] vs candidate=[] | lc-en-tcg-swsh4-054 | keep: lc-en-tcg-swsh4-054 dex=[523] |
| 349 | og-s3a | 55 | 번호(55) 일치 but dex# 불일치: keep=[595] vs candidate=[] | lc-en-tcg-swsh4-055 | keep: lc-en-tcg-swsh4-055 dex=[595] |
| 350 | og-s3a | 57 | 번호(57) 일치 but dex# 불일치: keep=[602] vs candidate=[] | lc-en-tcg-swsh4-057 | keep: lc-en-tcg-swsh4-057 dex=[602] |
| 351 | og-s3a | 58 | 번호(58) 일치 but dex# 불일치: keep=[603] vs candidate=[] | lc-en-tcg-swsh4-058 | keep: lc-en-tcg-swsh4-058 dex=[603] |
| 352 | og-s3a | 59 | 번호(59) 일치 but dex# 불일치: keep=[604] vs candidate=[] | lc-en-tcg-swsh4-059 | keep: lc-en-tcg-swsh4-059 dex=[604] |
| 353 | og-s3a | 60 | 번호(60) 일치 but dex# 불일치: keep=[644] vs candidate=[] | lc-en-tcg-swsh4-060 | keep: lc-en-tcg-swsh4-060 dex=[644] |
| 354 | og-s3a | 61 | 번호(61) 일치 but dex# 불일치: keep=[807] vs candidate=[] | lc-en-tcg-swsh4-061 | keep: lc-en-tcg-swsh4-061 dex=[807] |
| 355 | og-s3a | 63 | 번호(63) 일치 but dex# 불일치: keep=[35] vs candidate=[] | lc-en-tcg-swsh4-063 | keep: lc-en-tcg-swsh4-063 dex=[35] |
| 356 | og-s3a | 64 | 번호(64) 일치 but dex# 불일치: keep=[36] vs candidate=[] | lc-en-tcg-swsh4-064 | keep: lc-en-tcg-swsh4-064 dex=[36] |
| 357 | og-s3a | 65 | 번호(65) 일치 but dex# 불일치: keep=[203] vs candidate=[] | lc-en-tcg-swsh4-065 | keep: lc-en-tcg-swsh4-065 dex=[203] |
| 358 | og-s3a | 66 | 번호(66) 일치 but dex# 불일치: keep=[292] vs candidate=[] | lc-en-tcg-swsh4-066 | keep: lc-en-tcg-swsh4-066 dex=[292] |
| 359 | og-s3a | 67 | 번호(67) 일치 but dex# 불일치: keep=[353] vs candidate=[] | lc-en-tcg-swsh4-067 | keep: lc-en-tcg-swsh4-067 dex=[353] |
| 360 | og-s3a | 69 | 번호(69) 일치 but dex# 불일치: keep=[355] vs candidate=[] | lc-en-tcg-swsh4-069 | keep: lc-en-tcg-swsh4-069 dex=[355] |
| 361 | og-s3a | 70 | 번호(70) 일치 but dex# 불일치: keep=[356] vs candidate=[] | lc-en-tcg-swsh4-070 | keep: lc-en-tcg-swsh4-070 dex=[356] |
| 362 | og-s3a | 71 | 번호(71) 일치 but dex# 불일치: keep=[477] vs candidate=[] | lc-en-tcg-swsh4-071 | keep: lc-en-tcg-swsh4-071 dex=[477] |
| 363 | og-s3a | 72 | 번호(72) 일치 but dex# 불일치: keep=[358] vs candidate=[] | lc-en-tcg-swsh4-072 | keep: lc-en-tcg-swsh4-072 dex=[358] |
| 364 | og-s3a | 73 | 번호(73) 일치 but dex# 불일치: keep=[527] vs candidate=[] | lc-en-tcg-swsh4-073 | keep: lc-en-tcg-swsh4-073 dex=[527] |
| 365 | og-s3a | 74 | 번호(74) 일치 but dex# 불일치: keep=[528] vs candidate=[] | lc-en-tcg-swsh4-074 | keep: lc-en-tcg-swsh4-074 dex=[528] |
| 366 | og-s3a | 75 | 번호(75) 일치 but dex# 불일치: keep=[546] vs candidate=[] | lc-en-tcg-swsh4-075 | keep: lc-en-tcg-swsh4-075 dex=[546] |
| 367 | og-s3a | 77 | 번호(77) 일치 but dex# 불일치: keep=[702] vs candidate=[] | lc-en-tcg-swsh4-077 | keep: lc-en-tcg-swsh4-077 dex=[702] |
| 368 | og-s3a | 78 | 번호(78) 일치 but dex# 불일치: keep=[716] vs candidate=[] | lc-en-tcg-swsh4-078 | keep: lc-en-tcg-swsh4-078 dex=[716] |
| 369 | og-s3a | 80 | 번호(80) 일치 but dex# 불일치: keep=[868] vs candidate=[] | lc-en-tcg-swsh4-080 | keep: lc-en-tcg-swsh4-080 dex=[868] |
| 370 | og-s3a | 82 | 번호(82) 일치 but dex# 불일치: keep=[888] vs candidate=[] | lc-en-tcg-swsh4-082 | keep: lc-en-tcg-swsh4-082 dex=[888] |
| 371 | og-s3a | 83 | 번호(83) 일치 but dex# 불일치: keep=[194] vs candidate=[] | lc-en-tcg-swsh4-083 | keep: lc-en-tcg-swsh4-083 dex=[194] |
| 372 | og-s3a | 84 | 번호(84) 일치 but dex# 불일치: keep=[195] vs candidate=[] | lc-en-tcg-swsh4-084 | keep: lc-en-tcg-swsh4-084 dex=[195] |
| 373 | og-s3a | 85 | 번호(85) 일치 but dex# 불일치: keep=[213] vs candidate=[] | lc-en-tcg-swsh4-085 | keep: lc-en-tcg-swsh4-085 dex=[213] |
| 374 | og-s3a | 86 | 번호(86) 일치 but dex# 불일치: keep=[231] vs candidate=[] | lc-en-tcg-swsh4-086 | keep: lc-en-tcg-swsh4-086 dex=[231] |
| 375 | og-s3a | 87 | 번호(87) 일치 but dex# 불일치: keep=[232] vs candidate=[] | lc-en-tcg-swsh4-087 | keep: lc-en-tcg-swsh4-087 dex=[232] |
| 376 | og-s3a | 88 | 번호(88) 일치 but dex# 불일치: keep=[237] vs candidate=[] | lc-en-tcg-swsh4-088 | keep: lc-en-tcg-swsh4-088 dex=[237] |
| 377 | og-s3a | 89 | 번호(89) 일치 but dex# 불일치: keep=[377] vs candidate=[] | lc-en-tcg-swsh4-089 | keep: lc-en-tcg-swsh4-089 dex=[377] |
| 378 | og-s3a | 92 | 번호(92) 일치 but dex# 불일치: keep=[639] vs candidate=[] | lc-en-tcg-swsh4-092 | keep: lc-en-tcg-swsh4-092 dex=[639] |
| 379 | og-s3a | 93 | 번호(93) 일치 but dex# 불일치: keep=[718] vs candidate=[] | lc-en-tcg-swsh4-093 | keep: lc-en-tcg-swsh4-093 dex=[718] |
| 380 | og-s3a | 94 | 번호(94) 일치 but dex# 불일치: keep=[744] vs candidate=[] | lc-en-tcg-swsh4-094 | keep: lc-en-tcg-swsh4-094 dex=[744] |
| 381 | og-s3a | 3 | 번호(3) 일치 but dex# 불일치: keep=[15] vs candidate=[] | lc-en-tcg-swsh4-003 | keep: lc-en-tcg-swsh4-003 dex=[15] |
| 382 | og-s3a | 7 | 번호(7) 일치 but dex# 불일치: keep=[469] vs candidate=[] | lc-en-tcg-swsh4-007 | keep: lc-en-tcg-swsh4-007 dex=[469] |
| 383 | og-s3a | 29 | 번호(29) 일치 but dex# 불일치: keep=[663] vs candidate=[] | lc-en-tcg-swsh4-029 | keep: lc-en-tcg-swsh4-029 dex=[663] |
| 384 | og-s3a | 52 | 번호(52) 일치 but dex# 불일치: keep=[310] vs candidate=[] | lc-en-tcg-swsh4-052 | keep: lc-en-tcg-swsh4-052 dex=[310] |
| 385 | og-s3a | 76 | 번호(76) 일치 but dex# 불일치: keep=[547] vs candidate=[] | lc-en-tcg-swsh4-076 | keep: lc-en-tcg-swsh4-076 dex=[547] |
| 386 | og-s3a | 4 | 번호(4) 일치 but dex# 불일치: keep=[102] vs candidate=[] | lc-en-tcg-swsh4-004 | keep: lc-en-tcg-swsh4-004 dex=[102] |
| 387 | og-s3a | 9 | 번호(9) 일치 but dex# 불일치: keep=[251] vs candidate=[] | lc-en-tcg-swsh4-009 | keep: lc-en-tcg-swsh4-009 dex=[251] |
| 388 | og-s3a | 15 | 번호(15) 일치 but dex# 불일치: keep=[492] vs candidate=[] | lc-en-tcg-swsh4-015 | keep: lc-en-tcg-swsh4-015 dex=[492] |
| 389 | og-s3a | 32 | 번호(32) 일치 but dex# 불일치: keep=[321] vs candidate=[] | lc-en-tcg-swsh4-032 | keep: lc-en-tcg-swsh4-032 dex=[321] |
| 390 | og-s3a | 34 | 번호(34) 일치 but dex# 불일치: keep=[502] vs candidate=[] | lc-en-tcg-swsh4-034 | keep: lc-en-tcg-swsh4-034 dex=[502] |
| 391 | og-s3a | 35 | 번호(35) 일치 but dex# 불일치: keep=[503] vs candidate=[] | lc-en-tcg-swsh4-035 | keep: lc-en-tcg-swsh4-035 dex=[503] |
| 392 | og-s3a | 43 | 번호(43) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-en-tcg-swsh4-043 | keep: lc-en-tcg-swsh4-043 dex=[25] |
| 393 | og-s3a | 46 | 번호(46) 일치 but dex# 불일치: keep=[101] vs candidate=[] | lc-en-tcg-swsh4-046 | keep: lc-en-tcg-swsh4-046 dex=[101] |
| 394 | og-s3a | 56 | 번호(56) 일치 but dex# 불일치: keep=[596] vs candidate=[] | lc-en-tcg-swsh4-056 | keep: lc-en-tcg-swsh4-056 dex=[596] |
| 395 | og-s3a | 62 | 번호(62) 일치 but dex# 불일치: keep=[871] vs candidate=[] | lc-en-tcg-swsh4-062 | keep: lc-en-tcg-swsh4-062 dex=[871] |
| 396 | og-s3a | 68 | 번호(68) 일치 but dex# 불일치: keep=[354] vs candidate=[] | lc-en-tcg-swsh4-068 | keep: lc-en-tcg-swsh4-068 dex=[354] |
| 397 | og-s3a | 79 | 번호(79) 일치 but dex# 불일치: keep=[719] vs candidate=[] | lc-en-tcg-swsh4-079 | keep: lc-en-tcg-swsh4-079 dex=[719] |
| 398 | og-s3a | 81 | 번호(81) 일치 but dex# 불일치: keep=[869] vs candidate=[] | lc-en-tcg-swsh4-081 | keep: lc-en-tcg-swsh4-081 dex=[869] |
| 399 | og-s3a | 91 | 번호(91) 일치 but dex# 불일치: keep=[529] vs candidate=[] | lc-en-tcg-swsh4-091 | keep: lc-en-tcg-swsh4-091 dex=[529] |
| 400 | og-s4a | 1 | 번호(1) 일치 but dex# 불일치: keep=[193] vs candidate=[] | lc-en-tcg-swsh45-001 | keep: lc-en-tcg-swsh45-001 dex=[193] |
| 401 | og-s4a | 4 | 번호(4) 일치 but dex# 불일치: keep=[331] vs candidate=[] | lc-en-tcg-swsh45-004 | keep: lc-en-tcg-swsh45-004 dex=[331] |
| 402 | og-s4a | 5 | 번호(5) 일치 but dex# 불일치: keep=[357] vs candidate=[] | lc-en-tcg-swsh45-005 | keep: lc-en-tcg-swsh45-005 dex=[357] |
| 403 | og-s4a | 15 | 번호(15) 일치 but dex# 불일치: keep=[830] vs candidate=[] | lc-en-tcg-swsh45-015 | keep: lc-en-tcg-swsh45-015 dex=[830] |
| 404 | og-s4a | 7 | 번호(7) 일치 but dex# 불일치: keep=[723] vs candidate=[] | lc-en-tcg-swsh45-007 | keep: lc-en-tcg-swsh45-007 dex=[723] |
| 405 | og-s4a | 8 | 번호(8) 일치 but dex# 불일치: keep=[724] vs candidate=[] | lc-en-tcg-swsh45-008 | keep: lc-en-tcg-swsh45-008 dex=[724] |
| 406 | og-s4a | 9 | 번호(9) 일치 but dex# 불일치: keep=[781] vs candidate=[] | lc-en-tcg-swsh45-009 | keep: lc-en-tcg-swsh45-009 dex=[781] |
| 407 | og-s4a | 10 | 번호(10) 일치 but dex# 불일치: keep=[781] vs candidate=[] | lc-en-tcg-swsh45-010 | keep: lc-en-tcg-swsh45-010 dex=[781] |
| 408 | og-s4a | 11 | 번호(11) 일치 but dex# 불일치: keep=[810] vs candidate=[] | lc-en-tcg-swsh45-011 | keep: lc-en-tcg-swsh45-011 dex=[810] |
| 409 | og-s4a | 12 | 번호(12) 일치 but dex# 불일치: keep=[811] vs candidate=[] | lc-en-tcg-swsh45-012 | keep: lc-en-tcg-swsh45-012 dex=[811] |
| 410 | og-s4a | 13 | 번호(13) 일치 but dex# 불일치: keep=[812] vs candidate=[] | lc-en-tcg-swsh45-013 | keep: lc-en-tcg-swsh45-013 dex=[812] |
| 411 | og-s4a | 14 | 번호(14) 일치 but dex# 불일치: keep=[829] vs candidate=[] | lc-en-tcg-swsh45-014 | keep: lc-en-tcg-swsh45-014 dex=[829] |
| 412 | og-s4a | 16 | 번호(16) 일치 but dex# 불일치: keep=[893] vs candidate=[] | lc-en-tcg-swsh45-016 | keep: lc-en-tcg-swsh45-016 dex=[893] |
| 413 | og-s4a | 17 | 번호(17) 일치 but dex# 불일치: keep=[643] vs candidate=[] | lc-en-tcg-swsh45-017 | keep: lc-en-tcg-swsh45-017 dex=[643] |
| 414 | og-s4a | 18 | 번호(18) 일치 but dex# 불일치: keep=[815] vs candidate=[] | lc-en-tcg-swsh45-018 | keep: lc-en-tcg-swsh45-018 dex=[815] |
| 415 | og-s4a | 21 | 번호(21) 일치 but dex# 불일치: keep=[382] vs candidate=[] | lc-en-tcg-swsh45-021 | keep: lc-en-tcg-swsh45-021 dex=[382] |
| 416 | og-s4a | 22 | 번호(22) 일치 but dex# 불일치: keep=[418] vs candidate=[] | lc-en-tcg-swsh45-022 | keep: lc-en-tcg-swsh45-022 dex=[418] |
| 417 | og-s4a | 23 | 번호(23) 일치 but dex# 불일치: keep=[419] vs candidate=[] | lc-en-tcg-swsh45-023 | keep: lc-en-tcg-swsh45-023 dex=[419] |
| 418 | og-s4a | 24 | 번호(24) 일치 but dex# 불일치: keep=[490] vs candidate=[] | lc-en-tcg-swsh45-024 | keep: lc-en-tcg-swsh45-024 dex=[490] |
| 419 | og-s4a | 25 | 번호(25) 일치 but dex# 불일치: keep=[721] vs candidate=[] | lc-en-tcg-swsh45-025 | keep: lc-en-tcg-swsh45-025 dex=[721] |
| 420 | og-s4a | 27 | 번호(27) 일치 but dex# 불일치: keep=[834] vs candidate=[] | lc-en-tcg-swsh45-027 | keep: lc-en-tcg-swsh45-027 dex=[834] |
| 421 | og-s4a | 28 | 번호(28) 일치 but dex# 불일치: keep=[845] vs candidate=[] | lc-en-tcg-swsh45-028 | keep: lc-en-tcg-swsh45-028 dex=[845] |
| 422 | og-s4a | 29 | 번호(29) 일치 but dex# 불일치: keep=[872] vs candidate=[] | lc-en-tcg-swsh45-029 | keep: lc-en-tcg-swsh45-029 dex=[872] |
| 423 | og-s4a | 30 | 번호(30) 일치 but dex# 불일치: keep=[873] vs candidate=[] | lc-en-tcg-swsh45-030 | keep: lc-en-tcg-swsh45-030 dex=[873] |
| 424 | og-s4a | 31 | 번호(31) 일치 but dex# 불일치: keep=[403] vs candidate=[] | lc-en-tcg-swsh45-031 | keep: lc-en-tcg-swsh45-031 dex=[403] |
| 425 | og-s4a | 32 | 번호(32) 일치 but dex# 불일치: keep=[404] vs candidate=[] | lc-en-tcg-swsh45-032 | keep: lc-en-tcg-swsh45-032 dex=[404] |
| 426 | og-s4a | 33 | 번호(33) 일치 but dex# 불일치: keep=[405] vs candidate=[] | lc-en-tcg-swsh45-033 | keep: lc-en-tcg-swsh45-033 dex=[405] |
| 427 | og-s4a | 34 | 번호(34) 일치 but dex# 불일치: keep=[479] vs candidate=[] | lc-en-tcg-swsh45-034 | keep: lc-en-tcg-swsh45-034 dex=[479] |
| 428 | og-s4a | 36 | 번호(36) 일치 but dex# 불일치: keep=[877] vs candidate=[] | lc-en-tcg-swsh45-036 | keep: lc-en-tcg-swsh45-036 dex=[877] |
| 429 | og-s4a | 37 | 번호(37) 일치 but dex# 불일치: keep=[877] vs candidate=[] | lc-en-tcg-swsh45-037 | keep: lc-en-tcg-swsh45-037 dex=[877] |
| 430 | og-s4a | 38 | 번호(38) 일치 but dex# 불일치: keep=[877] vs candidate=[] | lc-en-tcg-swsh45-038 | keep: lc-en-tcg-swsh45-038 dex=[877] |
| 431 | og-s4a | 39 | 번호(39) 일치 but dex# 불일치: keep=[876] vs candidate=[] | lc-en-tcg-swsh45-039 | keep: lc-en-tcg-swsh45-039 dex=[876] |
| 432 | og-s4a | 40 | 번호(40) 일치 but dex# 불일치: keep=[328] vs candidate=[] | lc-en-tcg-swsh45-040 | keep: lc-en-tcg-swsh45-040 dex=[328] |
| 433 | og-s4a | 41 | 번호(41) 일치 but dex# 불일치: keep=[109] vs candidate=[] | lc-en-tcg-swsh45-041 | keep: lc-en-tcg-swsh45-041 dex=[109] |
| 434 | og-s4a | 42 | 번호(42) 일치 but dex# 불일치: keep=[110] vs candidate=[] | lc-en-tcg-swsh45-042 | keep: lc-en-tcg-swsh45-042 dex=[110] |
| 435 | og-s4a | 43 | 번호(43) 일치 but dex# 불일치: keep=[167] vs candidate=[] | lc-en-tcg-swsh45-043 | keep: lc-en-tcg-swsh45-043 dex=[167] |
| 436 | og-s4a | 45 | 번호(45) 일치 but dex# 불일치: keep=[169] vs candidate=[] | lc-en-tcg-swsh45-045 | keep: lc-en-tcg-swsh45-045 dex=[169] |
| 437 | og-s4a | 46 | 번호(46) 일치 but dex# 불일치: keep=[717] vs candidate=[] | lc-en-tcg-swsh45-046 | keep: lc-en-tcg-swsh45-046 dex=[717] |
| 438 | og-s4a | 47 | 번호(47) 일치 but dex# 불일치: keep=[827] vs candidate=[] | lc-en-tcg-swsh45-047 | keep: lc-en-tcg-swsh45-047 dex=[827] |
| 439 | og-s4a | 48 | 번호(48) 일치 but dex# 불일치: keep=[828] vs candidate=[] | lc-en-tcg-swsh45-048 | keep: lc-en-tcg-swsh45-048 dex=[828] |
| 440 | og-s4a | 49 | 번호(49) 일치 but dex# 불일치: keep=[878] vs candidate=[] | lc-en-tcg-swsh45-049 | keep: lc-en-tcg-swsh45-049 dex=[878] |
| 441 | og-s4a | 50 | 번호(50) 일치 but dex# 불일치: keep=[132] vs candidate=[] | lc-en-tcg-swsh45-050 | keep: lc-en-tcg-swsh45-050 dex=[132] |
| 442 | og-s4a | 51 | 번호(51) 일치 but dex# 불일치: keep=[132] vs candidate=[] | lc-en-tcg-swsh45-051 | keep: lc-en-tcg-swsh45-051 dex=[132] |
| 443 | og-s4a | 54 | 번호(54) 일치 but dex# 불일치: keep=[845] vs candidate=[] | lc-en-tcg-swsh45-054 | keep: lc-en-tcg-swsh45-054 dex=[845] |
| 444 | og-s4a | 55 | 번호(55) 일치 but dex# 불일치: keep=[845] vs candidate=[] | lc-en-tcg-swsh45-055 | keep: lc-en-tcg-swsh45-055 dex=[845] |
| 445 | og-s4a | 56 | 번호(56) 일치 but dex# 불일치: keep=[876] vs candidate=[] | lc-en-tcg-swsh45-056 | keep: lc-en-tcg-swsh45-056 dex=[876] |
| 446 | og-s4a | 64 | 번호(64) 일치 but dex# 불일치: keep=[869] vs candidate=[] | lc-en-tcg-swsh45-064 | keep: lc-en-tcg-swsh45-064 dex=[869] |
| 447 | og-s4a | 2 | 번호(2) 일치 but dex# 불일치: keep=[469] vs candidate=[] | lc-en-tcg-swsh45-002 | keep: lc-en-tcg-swsh45-002 dex=[469] |
| 448 | og-s4a | 20 | 번호(20) 일치 but dex# 불일치: keep=[116] vs candidate=[] | lc-en-tcg-swsh45-020 | keep: lc-en-tcg-swsh45-020 dex=[116] |
| 449 | og-s4a | 35 | 번호(35) 일치 but dex# 불일치: keep=[877] vs candidate=[] | lc-en-tcg-swsh45-035 | keep: lc-en-tcg-swsh45-035 dex=[877] |
| 450 | og-s4a | 73 | 번호(73) 일치 but dex# 불일치: keep=[869] vs candidate=[] | lc-en-tcg-swsh45-073 | keep: lc-en-tcg-swsh45-073 dex=[869] |
| 451 | og-s4a | 3 | 번호(3) 일치 but dex# 불일치: keep=[251] vs candidate=[] | lc-en-tcg-swsh45-003 | keep: lc-en-tcg-swsh45-003 dex=[251] |
| 452 | og-s4a | 6 | 번호(6) 일치 but dex# 불일치: keep=[722] vs candidate=[] | lc-en-tcg-swsh45-006 | keep: lc-en-tcg-swsh45-006 dex=[722] |
| 453 | og-s4a | 19 | 번호(19) 일치 but dex# 불일치: keep=[815] vs candidate=[] | lc-en-tcg-swsh45-019 | keep: lc-en-tcg-swsh45-019 dex=[815] |
| 454 | og-s4a | 26 | 번호(26) 일치 but dex# 불일치: keep=[833] vs candidate=[] | lc-en-tcg-swsh45-026 | keep: lc-en-tcg-swsh45-026 dex=[833] |
| 455 | og-s4a | 44 | 번호(44) 일치 but dex# 불일치: keep=[169] vs candidate=[] | lc-en-tcg-swsh45-044 | keep: lc-en-tcg-swsh45-044 dex=[169] |
| 456 | og-s4a | 52 | 번호(52) 일치 but dex# 불일치: keep=[133] vs candidate=[] | lc-en-tcg-swsh45-052 | keep: lc-en-tcg-swsh45-052 dex=[133] |
| 457 | og-s4a | 53 | 번호(53) 일치 but dex# 불일치: keep=[820] vs candidate=[] | lc-en-tcg-swsh45-053 | keep: lc-en-tcg-swsh45-053 dex=[820] |
| 458 | og-s5i | 1 | 번호(1) 일치 but dex# 불일치: keep=[69] vs candidate=[] | lc-en-tcg-swsh5-001 | keep: lc-en-tcg-swsh5-001 dex=[69] |
| 459 | og-s5i | 3 | 번호(3) 일치 but dex# 불일치: keep=[71] vs candidate=[] | lc-en-tcg-swsh5-003 | keep: lc-en-tcg-swsh5-003 dex=[71] |
| 460 | og-s5i | 4 | 번호(4) 일치 but dex# 불일치: keep=[331] vs candidate=[] | lc-en-tcg-swsh5-004 | keep: lc-en-tcg-swsh5-004 dex=[331] |
| 461 | og-s5i | 5 | 번호(5) 일치 but dex# 불일치: keep=[332] vs candidate=[] | lc-en-tcg-swsh5-005 | keep: lc-en-tcg-swsh5-005 dex=[332] |
| 462 | og-s5i | 7 | 번호(7) 일치 but dex# 불일치: keep=[420] vs candidate=[] | lc-en-tcg-swsh5-007 | keep: lc-en-tcg-swsh5-007 dex=[420] |
| 463 | og-s5i | 8 | 번호(8) 일치 but dex# 불일치: keep=[421] vs candidate=[] | lc-en-tcg-swsh5-008 | keep: lc-en-tcg-swsh5-008 dex=[421] |
| 464 | og-s5i | 19 | 번호(19) 일치 but dex# 불일치: keep=[841] vs candidate=[] | lc-en-tcg-swsh5-019 | keep: lc-en-tcg-swsh5-019 dex=[841] |
| 465 | og-s5i | 10 | 번호(10) 일치 but dex# 불일치: keep=[632] vs candidate=[] | lc-en-tcg-swsh5-010 | keep: lc-en-tcg-swsh5-010 dex=[632] |
| 466 | og-s5i | 11 | 번호(11) 일치 but dex# 불일치: keep=[664] vs candidate=[] | lc-en-tcg-swsh5-011 | keep: lc-en-tcg-swsh5-011 dex=[664] |
| 467 | og-s5i | 12 | 번호(12) 일치 but dex# 불일치: keep=[665] vs candidate=[] | lc-en-tcg-swsh5-012 | keep: lc-en-tcg-swsh5-012 dex=[665] |
| 468 | og-s5i | 13 | 번호(13) 일치 but dex# 불일치: keep=[666] vs candidate=[] | lc-en-tcg-swsh5-013 | keep: lc-en-tcg-swsh5-013 dex=[666] |
| 469 | og-s5i | 15 | 번호(15) 일치 but dex# 불일치: keep=[754] vs candidate=[] | lc-en-tcg-swsh5-015 | keep: lc-en-tcg-swsh5-015 dex=[754] |
| 470 | og-s5i | 17 | 번호(17) 일치 but dex# 불일치: keep=[824] vs candidate=[] | lc-en-tcg-swsh5-017 | keep: lc-en-tcg-swsh5-017 dex=[824] |
| 471 | og-s5i | 18 | 번호(18) 일치 but dex# 불일치: keep=[841] vs candidate=[] | lc-en-tcg-swsh5-018 | keep: lc-en-tcg-swsh5-018 dex=[841] |
| 472 | og-s5i | 22 | 번호(22) 일치 but dex# 불일치: keep=[494] vs candidate=[] | lc-en-tcg-swsh5-022 | keep: lc-en-tcg-swsh5-022 dex=[494] |
| 473 | og-s5i | 23 | 번호(23) 일치 but dex# 불일치: keep=[498] vs candidate=[] | lc-en-tcg-swsh5-023 | keep: lc-en-tcg-swsh5-023 dex=[498] |
| 474 | og-s5i | 24 | 번호(24) 일치 but dex# 불일치: keep=[499] vs candidate=[] | lc-en-tcg-swsh5-024 | keep: lc-en-tcg-swsh5-024 dex=[499] |
| 475 | og-s5i | 25 | 번호(25) 일치 but dex# 불일치: keep=[500] vs candidate=[] | lc-en-tcg-swsh5-025 | keep: lc-en-tcg-swsh5-025 dex=[500] |
| 476 | og-s5i | 26 | 번호(26) 일치 but dex# 불일치: keep=[631] vs candidate=[] | lc-en-tcg-swsh5-026 | keep: lc-en-tcg-swsh5-026 dex=[631] |
| 477 | og-s5i | 27 | 번호(27) 일치 but dex# 불일치: keep=[757] vs candidate=[] | lc-en-tcg-swsh5-027 | keep: lc-en-tcg-swsh5-027 dex=[757] |
| 478 | og-s5i | 31 | 번호(31) 일치 but dex# 불일치: keep=[116] vs candidate=[] | lc-en-tcg-swsh5-031 | keep: lc-en-tcg-swsh5-031 dex=[116] |
| 479 | og-s5i | 32 | 번호(32) 일치 but dex# 불일치: keep=[117] vs candidate=[] | lc-en-tcg-swsh5-032 | keep: lc-en-tcg-swsh5-032 dex=[117] |
| 480 | og-s5i | 33 | 번호(33) 일치 but dex# 불일치: keep=[230] vs candidate=[] | lc-en-tcg-swsh5-033 | keep: lc-en-tcg-swsh5-033 dex=[230] |
| 481 | og-s5i | 34 | 번호(34) 일치 but dex# 불일치: keep=[122] vs candidate=[] | lc-en-tcg-swsh5-034 | keep: lc-en-tcg-swsh5-034 dex=[122] |
| 482 | og-s5i | 36 | 번호(36) 일치 but dex# 불일치: keep=[223] vs candidate=[] | lc-en-tcg-swsh5-036 | keep: lc-en-tcg-swsh5-036 dex=[223] |
| 483 | og-s5i | 37 | 번호(37) 일치 but dex# 불일치: keep=[224] vs candidate=[] | lc-en-tcg-swsh5-037 | keep: lc-en-tcg-swsh5-037 dex=[224] |
| 484 | og-s5i | 40 | 번호(40) 일치 but dex# 불일치: keep=[395] vs candidate=[] | lc-en-tcg-swsh5-040 | keep: lc-en-tcg-swsh5-040 dex=[395] |
| 485 | og-s5i | 41 | 번호(41) 일치 but dex# 불일치: keep=[592] vs candidate=[] | lc-en-tcg-swsh5-041 | keep: lc-en-tcg-swsh5-041 dex=[592] |
| 486 | og-s5i | 42 | 번호(42) 일치 but dex# 불일치: keep=[593] vs candidate=[] | lc-en-tcg-swsh5-042 | keep: lc-en-tcg-swsh5-042 dex=[593] |
| 487 | og-s5i | 43 | 번호(43) 일치 but dex# 불일치: keep=[779] vs candidate=[] | lc-en-tcg-swsh5-043 | keep: lc-en-tcg-swsh5-043 dex=[779] |
| 488 | og-s5i | 44 | 번호(44) 일치 but dex# 불일치: keep=[125] vs candidate=[] | lc-en-tcg-swsh5-044 | keep: lc-en-tcg-swsh5-044 dex=[125] |
| 489 | og-s5i | 45 | 번호(45) 일치 but dex# 불일치: keep=[466] vs candidate=[] | lc-en-tcg-swsh5-045 | keep: lc-en-tcg-swsh5-045 dex=[466] |
| 490 | og-s5i | 46 | 번호(46) 일치 but dex# 불일치: keep=[403] vs candidate=[] | lc-en-tcg-swsh5-046 | keep: lc-en-tcg-swsh5-046 dex=[403] |
| 491 | og-s5i | 47 | 번호(47) 일치 but dex# 불일치: keep=[404] vs candidate=[] | lc-en-tcg-swsh5-047 | keep: lc-en-tcg-swsh5-047 dex=[404] |
| 492 | og-s5i | 49 | 번호(49) 일치 but dex# 불일치: keep=[417] vs candidate=[] | lc-en-tcg-swsh5-049 | keep: lc-en-tcg-swsh5-049 dex=[417] |
| 493 | og-s5i | 50 | 번호(50) 일치 but dex# 불일치: keep=[785] vs candidate=[] | lc-en-tcg-swsh5-050 | keep: lc-en-tcg-swsh5-050 dex=[785] |
| 494 | og-s5i | 51 | 번호(51) 일치 but dex# 불일치: keep=[785] vs candidate=[] | lc-en-tcg-swsh5-051 | keep: lc-en-tcg-swsh5-051 dex=[785] |
| 495 | og-s5i | 52 | 번호(52) 일치 but dex# 불일치: keep=[835] vs candidate=[] | lc-en-tcg-swsh5-052 | keep: lc-en-tcg-swsh5-052 dex=[835] |
| 496 | og-s5i | 53 | 번호(53) 일치 but dex# 불일치: keep=[836] vs candidate=[] | lc-en-tcg-swsh5-053 | keep: lc-en-tcg-swsh5-053 dex=[836] |
| 497 | og-s5i | 54 | 번호(54) 일치 but dex# 불일치: keep=[79] vs candidate=[] | lc-en-tcg-swsh5-054 | keep: lc-en-tcg-swsh5-054 dex=[79] |
| 498 | og-s5i | 55 | 번호(55) 일치 but dex# 불일치: keep=[325] vs candidate=[] | lc-en-tcg-swsh5-055 | keep: lc-en-tcg-swsh5-055 dex=[325] |
| 499 | og-s5i | 56 | 번호(56) 일치 but dex# 불일치: keep=[326] vs candidate=[] | lc-en-tcg-swsh5-056 | keep: lc-en-tcg-swsh5-056 dex=[326] |
| 500 | og-s5i | 59 | 번호(59) 일치 but dex# 불일치: keep=[358] vs candidate=[] | lc-en-tcg-swsh5-059 | keep: lc-en-tcg-swsh5-059 dex=[358] |
| 501 | og-s5i | 60 | 번호(60) 일치 but dex# 불일치: keep=[677] vs candidate=[] | lc-en-tcg-swsh5-060 | keep: lc-en-tcg-swsh5-060 dex=[677] |
| 502 | og-s5i | 61 | 번호(61) 일치 but dex# 불일치: keep=[678] vs candidate=[] | lc-en-tcg-swsh5-061 | keep: lc-en-tcg-swsh5-061 dex=[678] |
| 503 | og-s5i | 63 | 번호(63) 일치 but dex# 불일치: keep=[800] vs candidate=[] | lc-en-tcg-swsh5-063 | keep: lc-en-tcg-swsh5-063 dex=[800] |
| 504 | og-s5i | 64 | 번호(64) 일치 but dex# 불일치: keep=[825] vs candidate=[] | lc-en-tcg-swsh5-064 | keep: lc-en-tcg-swsh5-064 dex=[825] |
| 505 | og-s5i | 65 | 번호(65) 일치 but dex# 불일치: keep=[826] vs candidate=[] | lc-en-tcg-swsh5-065 | keep: lc-en-tcg-swsh5-065 dex=[826] |
| 506 | og-s5i | 68 | 번호(68) 일치 but dex# 불일치: keep=[95] vs candidate=[] | lc-en-tcg-swsh5-068 | keep: lc-en-tcg-swsh5-068 dex=[95] |
| 507 | og-s5i | 69 | 번호(69) 일치 but dex# 불일치: keep=[104] vs candidate=[] | lc-en-tcg-swsh5-069 | keep: lc-en-tcg-swsh5-069 dex=[104] |
| 508 | og-s5i | 70 | 번호(70) 일치 but dex# 불일치: keep=[105] vs candidate=[] | lc-en-tcg-swsh5-070 | keep: lc-en-tcg-swsh5-070 dex=[105] |
| 509 | og-s5i | 71 | 번호(71) 일치 but dex# 불일치: keep=[207] vs candidate=[] | lc-en-tcg-swsh5-071 | keep: lc-en-tcg-swsh5-071 dex=[207] |
| 510 | og-s5i | 72 | 번호(72) 일치 but dex# 불일치: keep=[472] vs candidate=[] | lc-en-tcg-swsh5-072 | keep: lc-en-tcg-swsh5-072 dex=[472] |
| 511 | og-s5i | 73 | 번호(73) 일치 but dex# 불일치: keep=[532] vs candidate=[] | lc-en-tcg-swsh5-073 | keep: lc-en-tcg-swsh5-073 dex=[532] |
| 512 | og-s5i | 74 | 번호(74) 일치 but dex# 불일치: keep=[533] vs candidate=[] | lc-en-tcg-swsh5-074 | keep: lc-en-tcg-swsh5-074 dex=[533] |
| 513 | og-s5i | 77 | 번호(77) 일치 but dex# 불일치: keep=[620] vs candidate=[] | lc-en-tcg-swsh5-077 | keep: lc-en-tcg-swsh5-077 dex=[620] |
| 514 | og-s5i | 78 | 번호(78) 일치 but dex# 불일치: keep=[837] vs candidate=[] | lc-en-tcg-swsh5-078 | keep: lc-en-tcg-swsh5-078 dex=[837] |
| 515 | og-s5i | 80 | 번호(80) 일치 but dex# 불일치: keep=[839] vs candidate=[] | lc-en-tcg-swsh5-080 | keep: lc-en-tcg-swsh5-080 dex=[839] |
| 516 | og-s5i | 81 | 번호(81) 일치 but dex# 불일치: keep=[843] vs candidate=[] | lc-en-tcg-swsh5-081 | keep: lc-en-tcg-swsh5-081 dex=[843] |
| 517 | og-s5i | 82 | 번호(82) 일치 but dex# 불일치: keep=[844] vs candidate=[] | lc-en-tcg-swsh5-082 | keep: lc-en-tcg-swsh5-082 dex=[844] |
| 518 | og-s5i | 83 | 번호(83) 일치 but dex# 불일치: keep=[870] vs candidate=[] | lc-en-tcg-swsh5-083 | keep: lc-en-tcg-swsh5-083 dex=[870] |
| 519 | og-s5i | 84 | 번호(84) 일치 but dex# 불일치: keep=[874] vs candidate=[] | lc-en-tcg-swsh5-084 | keep: lc-en-tcg-swsh5-084 dex=[874] |
| 520 | og-s5i | 86 | 번호(86) 일치 but dex# 불일치: keep=[892] vs candidate=[] | lc-en-tcg-swsh5-086 | keep: lc-en-tcg-swsh5-086 dex=[892] |
| 521 | og-s5i | 87 | 번호(87) 일치 but dex# 불일치: keep=[892] vs candidate=[] | lc-en-tcg-swsh5-087 | keep: lc-en-tcg-swsh5-087 dex=[892] |
| 522 | og-s5i | 88 | 번호(88) 일치 but dex# 불일치: keep=[892] vs candidate=[] | lc-en-tcg-swsh5-088 | keep: lc-en-tcg-swsh5-088 dex=[892] |
| 523 | og-s5i | 89 | 번호(89) 일치 but dex# 불일치: keep=[41] vs candidate=[] | lc-en-tcg-swsh5-089 | keep: lc-en-tcg-swsh5-089 dex=[41] |
| 524 | og-s5i | 90 | 번호(90) 일치 but dex# 불일치: keep=[42] vs candidate=[] | lc-en-tcg-swsh5-090 | keep: lc-en-tcg-swsh5-090 dex=[42] |
| 525 | og-s5i | 91 | 번호(91) 일치 but dex# 불일치: keep=[169] vs candidate=[] | lc-en-tcg-swsh5-091 | keep: lc-en-tcg-swsh5-091 dex=[169] |
| 526 | og-s5i | 2 | 번호(2) 일치 but dex# 불일치: keep=[70] vs candidate=[] | lc-en-tcg-swsh5-002 | keep: lc-en-tcg-swsh5-002 dex=[70] |
| 527 | og-s5i | 6 | 번호(6) 일치 but dex# 불일치: keep=[402] vs candidate=[] | lc-en-tcg-swsh5-006 | keep: lc-en-tcg-swsh5-006 dex=[402] |
| 528 | og-s5i | 9 | 번호(9) 일치 but dex# 불일치: keep=[455] vs candidate=[] | lc-en-tcg-swsh5-009 | keep: lc-en-tcg-swsh5-009 dex=[455] |
| 529 | og-s5i | 14 | 번호(14) 일치 but dex# 불일치: keep=[753] vs candidate=[] | lc-en-tcg-swsh5-014 | keep: lc-en-tcg-swsh5-014 dex=[753] |
| 530 | og-s5i | 16 | 번호(16) 일치 but dex# 불일치: keep=[787] vs candidate=[] | lc-en-tcg-swsh5-016 | keep: lc-en-tcg-swsh5-016 dex=[787] |
| 531 | og-s5i | 20 | 번호(20) 일치 but dex# 불일치: keep=[244] vs candidate=[] | lc-en-tcg-swsh5-020 | keep: lc-en-tcg-swsh5-020 dex=[244] |
| 532 | og-s5i | 21 | 번호(21) 일치 but dex# 불일치: keep=[494] vs candidate=[] | lc-en-tcg-swsh5-021 | keep: lc-en-tcg-swsh5-021 dex=[494] |
| 533 | og-s5i | 28 | 번호(28) 일치 but dex# 불일치: keep=[758] vs candidate=[] | lc-en-tcg-swsh5-028 | keep: lc-en-tcg-swsh5-028 dex=[758] |
| 534 | og-s5i | 29 | 번호(29) 일치 but dex# 불일치: keep=[850] vs candidate=[] | lc-en-tcg-swsh5-029 | keep: lc-en-tcg-swsh5-029 dex=[850] |
| 535 | og-s5i | 30 | 번호(30) 일치 but dex# 불일치: keep=[851] vs candidate=[] | lc-en-tcg-swsh5-030 | keep: lc-en-tcg-swsh5-030 dex=[851] |
| 536 | og-s5i | 35 | 번호(35) 일치 but dex# 불일치: keep=[866] vs candidate=[] | lc-en-tcg-swsh5-035 | keep: lc-en-tcg-swsh5-035 dex=[866] |
| 537 | og-s5i | 38 | 번호(38) 일치 but dex# 불일치: keep=[341] vs candidate=[] | lc-en-tcg-swsh5-038 | keep: lc-en-tcg-swsh5-038 dex=[341] |
| 538 | og-s5i | 39 | 번호(39) 일치 but dex# 불일치: keep=[342] vs candidate=[] | lc-en-tcg-swsh5-039 | keep: lc-en-tcg-swsh5-039 dex=[342] |
| 539 | og-s5i | 48 | 번호(48) 일치 but dex# 불일치: keep=[405] vs candidate=[] | lc-en-tcg-swsh5-048 | keep: lc-en-tcg-swsh5-048 dex=[405] |
| 540 | og-s5i | 57 | 번호(57) 일치 but dex# 불일치: keep=[343] vs candidate=[] | lc-en-tcg-swsh5-057 | keep: lc-en-tcg-swsh5-057 dex=[343] |
| 541 | og-s5i | 58 | 번호(58) 일치 but dex# 불일치: keep=[344] vs candidate=[] | lc-en-tcg-swsh5-058 | keep: lc-en-tcg-swsh5-058 dex=[344] |
| 542 | og-s5i | 62 | 번호(62) 일치 but dex# 불일치: keep=[778] vs candidate=[] | lc-en-tcg-swsh5-062 | keep: lc-en-tcg-swsh5-062 dex=[778] |
| 543 | og-s5i | 66 | 번호(66) 일치 but dex# 불일치: keep=[56] vs candidate=[] | lc-en-tcg-swsh5-066 | keep: lc-en-tcg-swsh5-066 dex=[56] |
| 544 | og-s5i | 67 | 번호(67) 일치 but dex# 불일치: keep=[57] vs candidate=[] | lc-en-tcg-swsh5-067 | keep: lc-en-tcg-swsh5-067 dex=[57] |
| 545 | og-s5i | 75 | 번호(75) 일치 but dex# 불일치: keep=[534] vs candidate=[] | lc-en-tcg-swsh5-075 | keep: lc-en-tcg-swsh5-075 dex=[534] |
| 546 | og-s5i | 76 | 번호(76) 일치 but dex# 불일치: keep=[619] vs candidate=[] | lc-en-tcg-swsh5-076 | keep: lc-en-tcg-swsh5-076 dex=[619] |
| 547 | og-s5i | 79 | 번호(79) 일치 but dex# 불일치: keep=[838] vs candidate=[] | lc-en-tcg-swsh5-079 | keep: lc-en-tcg-swsh5-079 dex=[838] |
| 548 | og-s5i | 85 | 번호(85) 일치 but dex# 불일치: keep=[892] vs candidate=[] | lc-en-tcg-swsh5-085 | keep: lc-en-tcg-swsh5-085 dex=[892] |
| 549 | og-s6a | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-orphan-jp-tcg-S6a-63, lc-orphan-jp-tcg-S6a-60, lc-orphan-jp-tcg-S6a-61 ... (+185) | EN sets: , JP sets: jp-tcg-S6a, KR sets: kr-s6a,kr-sp4 |
| 550 | og-s6h | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-swsh6-134, lc-en-tcg-swsh6-135, lc-en-tcg-swsh6-136 ... (+325) | EN sets: en-tcg-swsh6, JP sets: jp-tcg-S6H, KR sets: kr-s6,kr-sp3 |
| 551 | og-s7r | 2 | 번호(2) 일치 but dex# 불일치: keep=[187] vs candidate=[] | lc-en-tcg-swsh7-002 | keep: lc-en-tcg-swsh7-002 dex=[187] |
| 552 | og-s7r | 6 | 번호(6) 일치 but dex# 불일치: keep=[357] vs candidate=[] | lc-en-tcg-swsh7-006 | keep: lc-en-tcg-swsh7-006 dex=[357] |
| 553 | og-s7r | 1 | 번호(1) 일치 but dex# 불일치: keep=[127] vs candidate=[] | lc-en-tcg-swsh7-001 | keep: lc-en-tcg-swsh7-001 dex=[127] |
| 554 | og-s7r | 5 | 번호(5) 일치 but dex# 불일치: keep=[273] vs candidate=[] | lc-en-tcg-swsh7-005 | keep: lc-en-tcg-swsh7-005 dex=[273] |
| 555 | og-s7r | 8 | 번호(8) 일치 but dex# 불일치: keep=[470] vs candidate=[] | lc-en-tcg-swsh7-008 | keep: lc-en-tcg-swsh7-008 dex=[470] |
| 556 | og-s7r | 10 | 번호(10) 일치 but dex# 불일치: keep=[549] vs candidate=[] | lc-en-tcg-swsh7-010 | keep: lc-en-tcg-swsh7-010 dex=[549] |
| 557 | og-s7r | 9 | 번호(9) 일치 but dex# 불일치: keep=[548] vs candidate=[] | lc-en-tcg-swsh7-009 | keep: lc-en-tcg-swsh7-009 dex=[548] |
| 558 | og-s7r | 12 | 번호(12) 일치 but dex# 불일치: keep=[558] vs candidate=[] | lc-en-tcg-swsh7-012 | keep: lc-en-tcg-swsh7-012 dex=[558] |
| 559 | og-s7r | 20 | 번호(20) 일치 but dex# 불일치: keep=[494] vs candidate=[] | lc-en-tcg-swsh7-020 | keep: lc-en-tcg-swsh7-020 dex=[494] |
| 560 | og-s7r | 11 | 번호(11) 일치 but dex# 불일치: keep=[557] vs candidate=[] | lc-en-tcg-swsh7-011 | keep: lc-en-tcg-swsh7-011 dex=[557] |
| 561 | og-s7r | 7 | 번호(7) 일치 but dex# 불일치: keep=[470] vs candidate=[] | lc-en-tcg-swsh7-007 | keep: lc-en-tcg-swsh7-007 dex=[470] |
| 562 | og-s7r | 14 | 번호(14) 일치 but dex# 불일치: keep=[709] vs candidate=[] | lc-en-tcg-swsh7-014 | keep: lc-en-tcg-swsh7-014 dex=[709] |
| 563 | og-s7r | 36 | 번호(36) 일치 but dex# 불일치: keep=[319] vs candidate=[] | lc-en-tcg-swsh7-036 | keep: lc-en-tcg-swsh7-036 dex=[319] |
| 564 | og-s7r | 41 | 번호(41) 일치 but dex# 불일치: keep=[471] vs candidate=[] | lc-en-tcg-swsh7-041 | keep: lc-en-tcg-swsh7-041 dex=[471] |
| 565 | og-s7r | 46 | 번호(46) 일치 but dex# 불일치: keep=[746] vs candidate=[] | lc-en-tcg-swsh7-046 | keep: lc-en-tcg-swsh7-046 dex=[746] |
| 566 | og-s7r | 44 | 번호(44) 일치 but dex# 불일치: keep=[712] vs candidate=[] | lc-en-tcg-swsh7-044 | keep: lc-en-tcg-swsh7-044 dex=[712] |
| 567 | og-s7r | 35 | 번호(35) 일치 but dex# 불일치: keep=[318] vs candidate=[] | lc-en-tcg-swsh7-035 | keep: lc-en-tcg-swsh7-035 dex=[318] |
| 568 | og-s7r | 59 | 번호(59) 일치 but dex# 불일치: keep=[880] vs candidate=[] | lc-en-tcg-swsh7-059 | keep: lc-en-tcg-swsh7-059 dex=[880] |
| 569 | og-s7r | 58 | 번호(58) 일치 but dex# 불일치: keep=[880] vs candidate=[] | lc-en-tcg-swsh7-058 | keep: lc-en-tcg-swsh7-058 dex=[880] |
| 570 | og-s7r | 30 | 번호(30) 일치 but dex# 불일치: keep=[134] vs candidate=[] | lc-en-tcg-swsh7-030 | keep: lc-en-tcg-swsh7-030 dex=[134] |
| 571 | og-s7r | 28 | 번호(28) 일치 but dex# 불일치: keep=[130] vs candidate=[] | lc-en-tcg-swsh7-028 | keep: lc-en-tcg-swsh7-028 dex=[130] |
| 572 | og-s7r | 47 | 번호(47) 일치 but dex# 불일치: keep=[875] vs candidate=[] | lc-en-tcg-swsh7-047 | keep: lc-en-tcg-swsh7-047 dex=[875] |
| 573 | og-s7r | 34 | 번호(34) 일치 but dex# 불일치: keep=[272] vs candidate=[] | lc-en-tcg-swsh7-034 | keep: lc-en-tcg-swsh7-034 dex=[272] |
| 574 | og-s7r | 42 | 번호(42) 일치 but dex# 불일치: keep=[535] vs candidate=[] | lc-en-tcg-swsh7-042 | keep: lc-en-tcg-swsh7-042 dex=[535] |
| 575 | og-s7r | 25 | 번호(25) 일치 but dex# 불일치: keep=[55] vs candidate=[] | lc-en-tcg-swsh7-025 | keep: lc-en-tcg-swsh7-025 dex=[55] |
| 576 | og-s7r | 49 | 번호(49) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-en-tcg-swsh7-049 | keep: lc-en-tcg-swsh7-049 dex=[25] |
| 577 | og-s7r | 40 | 번호(40) 일치 but dex# 불일치: keep=[471] vs candidate=[] | lc-en-tcg-swsh7-040 | keep: lc-en-tcg-swsh7-040 dex=[471] |
| 578 | og-s7r | 24 | 번호(24) 일치 but dex# 불일치: keep=[54] vs candidate=[] | lc-en-tcg-swsh7-024 | keep: lc-en-tcg-swsh7-024 dex=[54] |
| 579 | og-s7r | 16 | 번호(16) 일치 but dex# 불일치: keep=[830] vs candidate=[] | lc-en-tcg-swsh7-016 | keep: lc-en-tcg-swsh7-016 dex=[830] |
| 580 | og-s7r | 26 | 번호(26) 일치 but dex# 불일치: keep=[72] vs candidate=[] | lc-en-tcg-swsh7-026 | keep: lc-en-tcg-swsh7-026 dex=[72] |
| 581 | og-s7r | 27 | 번호(27) 일치 but dex# 불일치: keep=[73] vs candidate=[] | lc-en-tcg-swsh7-027 | keep: lc-en-tcg-swsh7-027 dex=[73] |
| 582 | og-s7r | 32 | 번호(32) 일치 but dex# 불일치: keep=[270] vs candidate=[] | lc-en-tcg-swsh7-032 | keep: lc-en-tcg-swsh7-032 dex=[270] |
| 583 | og-s7r | 50 | 번호(50) 일치 but dex# 불일치: keep=[26] vs candidate=[] | lc-en-tcg-swsh7-050 | keep: lc-en-tcg-swsh7-050 dex=[26] |
| 584 | og-s7r | 19 | 번호(19) 일치 but dex# 불일치: keep=[244] vs candidate=[] | lc-en-tcg-swsh7-019 | keep: lc-en-tcg-swsh7-019 dex=[244] |
| 585 | og-s7r | 39 | 번호(39) 일치 but dex# 불일치: keep=[370] vs candidate=[] | lc-en-tcg-swsh7-039 | keep: lc-en-tcg-swsh7-039 dex=[370] |
| 586 | og-s7r | 22 | 번호(22) 일치 but dex# 불일치: keep=[667] vs candidate=[] | lc-en-tcg-swsh7-022 | keep: lc-en-tcg-swsh7-022 dex=[667] |
| 587 | og-s7r | 23 | 번호(23) 일치 but dex# 불일치: keep=[668] vs candidate=[] | lc-en-tcg-swsh7-023 | keep: lc-en-tcg-swsh7-023 dex=[668] |
| 588 | og-s7r | 29 | 번호(29) 일치 but dex# 불일치: keep=[130] vs candidate=[] | lc-en-tcg-swsh7-029 | keep: lc-en-tcg-swsh7-029 dex=[130] |
| 589 | og-s7r | 52 | 번호(52) 일치 but dex# 불일치: keep=[170] vs candidate=[] | lc-en-tcg-swsh7-052 | keep: lc-en-tcg-swsh7-052 dex=[170] |
| 590 | og-s7r | 54 | 번호(54) 일치 but dex# 불일치: keep=[179] vs candidate=[] | lc-en-tcg-swsh7-054 | keep: lc-en-tcg-swsh7-054 dex=[179] |
| 591 | og-s7r | 17 | 번호(17) 일치 but dex# 불일치: keep=[840] vs candidate=[] | lc-en-tcg-swsh7-017 | keep: lc-en-tcg-swsh7-017 dex=[840] |
| 592 | og-s7r | 37 | 번호(37) 일치 but dex# 불일치: keep=[349] vs candidate=[] | lc-en-tcg-swsh7-037 | keep: lc-en-tcg-swsh7-037 dex=[349] |
| 593 | og-s7r | 18 | 번호(18) 일치 but dex# 불일치: keep=[136] vs candidate=[] | lc-en-tcg-swsh7-018 | keep: lc-en-tcg-swsh7-018 dex=[136] |
| 594 | og-s7r | 51 | 번호(51) 일치 but dex# 불일치: keep=[135] vs candidate=[] | lc-en-tcg-swsh7-051 | keep: lc-en-tcg-swsh7-051 dex=[135] |
| 595 | og-s7r | 56 | 번호(56) 일치 but dex# 불일치: keep=[181] vs candidate=[] | lc-en-tcg-swsh7-056 | keep: lc-en-tcg-swsh7-056 dex=[181] |
| 596 | og-s7r | 57 | 번호(57) 일치 but dex# 불일치: keep=[587] vs candidate=[] | lc-en-tcg-swsh7-057 | keep: lc-en-tcg-swsh7-057 dex=[587] |
| 597 | og-s7r | 15 | 번호(15) 일치 but dex# 불일치: keep=[829] vs candidate=[] | lc-en-tcg-swsh7-015 | keep: lc-en-tcg-swsh7-015 dex=[829] |
| 598 | og-s7r | 21 | 번호(21) 일치 but dex# 불일치: keep=[637] vs candidate=[] | lc-en-tcg-swsh7-021 | keep: lc-en-tcg-swsh7-021 dex=[637] |
| 599 | og-s7r | 55 | 번호(55) 일치 but dex# 불일치: keep=[180] vs candidate=[] | lc-en-tcg-swsh7-055 | keep: lc-en-tcg-swsh7-055 dex=[180] |
| 600 | og-s7r | 63 | 번호(63) 일치 but dex# 불일치: keep=[144] vs candidate=[] | lc-en-tcg-swsh7-063 | keep: lc-en-tcg-swsh7-063 dex=[144] |
| 601 | og-s7r | 62 | 번호(62) 일치 but dex# 불일치: keep=[97] vs candidate=[] | lc-en-tcg-swsh7-062 | keep: lc-en-tcg-swsh7-062 dex=[97] |
| 602 | og-s7r | 60 | 번호(60) 일치 but dex# 불일치: keep=[894] vs candidate=[] | lc-en-tcg-swsh7-060 | keep: lc-en-tcg-swsh7-060 dex=[894] |
| 603 | og-s7r | 61 | 번호(61) 일치 but dex# 불일치: keep=[96] vs candidate=[] | lc-en-tcg-swsh7-061 | keep: lc-en-tcg-swsh7-061 dex=[96] |
| 604 | og-s7r | 66 | 번호(66) 일치 but dex# 불일치: keep=[202] vs candidate=[] | lc-en-tcg-swsh7-066 | keep: lc-en-tcg-swsh7-066 dex=[202] |
| 605 | og-s7r | 64 | 번호(64) 일치 but dex# 불일치: keep=[196] vs candidate=[] | lc-en-tcg-swsh7-064 | keep: lc-en-tcg-swsh7-064 dex=[196] |
| 606 | og-s7r | 65 | 번호(65) 일치 but dex# 불일치: keep=[196] vs candidate=[] | lc-en-tcg-swsh7-065 | keep: lc-en-tcg-swsh7-065 dex=[196] |
| 607 | og-s7r | 67 | 번호(67) 일치 but dex# 불일치: keep=[302] vs candidate=[] | lc-en-tcg-swsh7-067 | keep: lc-en-tcg-swsh7-067 dex=[302] |
| 608 | og-s7r | 68 | 번호(68) 일치 but dex# 불일치: keep=[527] vs candidate=[] | lc-en-tcg-swsh7-068 | keep: lc-en-tcg-swsh7-068 dex=[527] |
| 609 | og-s7r | 70 | 번호(70) 일치 but dex# 불일치: keep=[623] vs candidate=[] | lc-en-tcg-swsh7-070 | keep: lc-en-tcg-swsh7-070 dex=[623] |
| 610 | og-s7r | 73 | 번호(73) 일치 but dex# 불일치: keep=[671] vs candidate=[] | lc-en-tcg-swsh7-073 | keep: lc-en-tcg-swsh7-073 dex=[671] |
| 611 | og-s7r | 71 | 번호(71) 일치 but dex# 불일치: keep=[669] vs candidate=[] | lc-en-tcg-swsh7-071 | keep: lc-en-tcg-swsh7-071 dex=[669] |
| 612 | og-s7r | 72 | 번호(72) 일치 but dex# 불일치: keep=[670] vs candidate=[] | lc-en-tcg-swsh7-072 | keep: lc-en-tcg-swsh7-072 dex=[670] |
| 613 | og-s7r | 74 | 번호(74) 일치 but dex# 불일치: keep=[700] vs candidate=[] | lc-en-tcg-swsh7-074 | keep: lc-en-tcg-swsh7-074 dex=[700] |
| 614 | og-s7r | 75 | 번호(75) 일치 but dex# 불일치: keep=[700] vs candidate=[] | lc-en-tcg-swsh7-075 | keep: lc-en-tcg-swsh7-075 dex=[700] |
| 615 | og-s7r | 77 | 번호(77) 일치 but dex# 불일치: keep=[711] vs candidate=[] | lc-en-tcg-swsh7-077 | keep: lc-en-tcg-swsh7-077 dex=[711] |
| 616 | og-s7r | 78 | 번호(78) 일치 but dex# 불일치: keep=[742] vs candidate=[] | lc-en-tcg-swsh7-078 | keep: lc-en-tcg-swsh7-078 dex=[742] |
| 617 | og-s7r | 81 | 번호(81) 일치 but dex# 불일치: keep=[107] vs candidate=[] | lc-en-tcg-swsh7-081 | keep: lc-en-tcg-swsh7-081 dex=[107] |
| 618 | og-s7r | 79 | 번호(79) 일치 but dex# 불일치: keep=[743] vs candidate=[] | lc-en-tcg-swsh7-079 | keep: lc-en-tcg-swsh7-079 dex=[743] |
| 619 | og-s7r | 80 | 번호(80) 일치 but dex# 불일치: keep=[802] vs candidate=[] | lc-en-tcg-swsh7-080 | keep: lc-en-tcg-swsh7-080 dex=[802] |
| 620 | og-s7r | 83 | 번호(83) 일치 but dex# 불일치: keep=[308] vs candidate=[] | lc-en-tcg-swsh7-083 | keep: lc-en-tcg-swsh7-083 dex=[308] |
| 621 | og-s7r | 84 | 번호(84) 일치 but dex# 불일치: keep=[449] vs candidate=[] | lc-en-tcg-swsh7-084 | keep: lc-en-tcg-swsh7-084 dex=[449] |
| 622 | og-s7r | 85 | 번호(85) 일치 but dex# 불일치: keep=[450] vs candidate=[] | lc-en-tcg-swsh7-085 | keep: lc-en-tcg-swsh7-085 dex=[450] |
| 623 | og-s7r | 86 | 번호(86) 일치 but dex# 불일치: keep=[524] vs candidate=[] | lc-en-tcg-swsh7-086 | keep: lc-en-tcg-swsh7-086 dex=[524] |
| 624 | og-s7r | 87 | 번호(87) 일치 but dex# 불일치: keep=[525] vs candidate=[] | lc-en-tcg-swsh7-087 | keep: lc-en-tcg-swsh7-087 dex=[525] |
| 625 | og-s7r | 90 | 번호(90) 일치 but dex# 불일치: keep=[537] vs candidate=[] | lc-en-tcg-swsh7-090 | keep: lc-en-tcg-swsh7-090 dex=[537] |
| 626 | og-s7r | 89 | 번호(89) 일치 but dex# 불일치: keep=[536] vs candidate=[] | lc-en-tcg-swsh7-089 | keep: lc-en-tcg-swsh7-089 dex=[536] |
| 627 | og-s7r | 4 | 번호(4) 일치 but dex# 불일치: keep=[189] vs candidate=[] | lc-en-tcg-swsh7-004 | keep: lc-en-tcg-swsh7-004 dex=[189] |
| 628 | og-s7r | 3 | 번호(3) 일치 but dex# 불일치: keep=[188] vs candidate=[] | lc-en-tcg-swsh7-003 | keep: lc-en-tcg-swsh7-003 dex=[188] |
| 629 | og-s7r | 13 | 번호(13) 일치 but dex# 불일치: keep=[709] vs candidate=[] | lc-en-tcg-swsh7-013 | keep: lc-en-tcg-swsh7-013 dex=[709] |
| 630 | og-s7r | 43 | 번호(43) 일치 but dex# 불일치: keep=[615] vs candidate=[] | lc-en-tcg-swsh7-043 | keep: lc-en-tcg-swsh7-043 dex=[615] |
| 631 | og-s7r | 31 | 번호(31) 일치 but dex# 불일치: keep=[245] vs candidate=[] | lc-en-tcg-swsh7-031 | keep: lc-en-tcg-swsh7-031 dex=[245] |
| 632 | og-s7r | 53 | 번호(53) 일치 but dex# 불일치: keep=[171] vs candidate=[] | lc-en-tcg-swsh7-053 | keep: lc-en-tcg-swsh7-053 dex=[171] |
| 633 | og-s7r | 38 | 번호(38) 일치 but dex# 불일치: keep=[350] vs candidate=[] | lc-en-tcg-swsh7-038 | keep: lc-en-tcg-swsh7-038 dex=[350] |
| 634 | og-s7r | 45 | 번호(45) 일치 but dex# 불일치: keep=[713] vs candidate=[] | lc-en-tcg-swsh7-045 | keep: lc-en-tcg-swsh7-045 dex=[713] |
| 635 | og-s7r | 33 | 번호(33) 일치 but dex# 불일치: keep=[271] vs candidate=[] | lc-en-tcg-swsh7-033 | keep: lc-en-tcg-swsh7-033 dex=[271] |
| 636 | og-s7r | 48 | 번호(48) 일치 but dex# 불일치: keep=[883] vs candidate=[] | lc-en-tcg-swsh7-048 | keep: lc-en-tcg-swsh7-048 dex=[883] |
| 637 | og-s7r | 69 | 번호(69) 일치 but dex# 불일치: keep=[528] vs candidate=[] | lc-en-tcg-swsh7-069 | keep: lc-en-tcg-swsh7-069 dex=[528] |
| 638 | og-s7r | 76 | 번호(76) 일치 but dex# 불일치: keep=[710] vs candidate=[] | lc-en-tcg-swsh7-076 | keep: lc-en-tcg-swsh7-076 dex=[710] |
| 639 | og-s7r | 82 | 번호(82) 일치 but dex# 불일치: keep=[145] vs candidate=[] | lc-en-tcg-swsh7-082 | keep: lc-en-tcg-swsh7-082 dex=[145] |
| 640 | og-s7r | 88 | 번호(88) 일치 but dex# 불일치: keep=[526] vs candidate=[] | lc-en-tcg-swsh7-088 | keep: lc-en-tcg-swsh7-088 dex=[526] |
| 641 | og-s8 | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-swsh8-240, lc-en-tcg-swsh8-239, lc-en-tcg-swsh8-242 ... (+507) | EN sets: en-tcg-swsh8, JP sets: jp-tcg-S8, KR sets: kr-s8,kr-sp5 |
| 642 | og-s8a | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-cel25-004, lc-en-tcg-cel25-002, lc-en-tcg-cel25-007 ... (+83) | EN sets: en-tcg-cel25, JP sets: jp-tcg-S8a, KR sets: kr-s8a-g,kr-s8a |
| 643 | og-s9 | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-swsh9-003, lc-en-tcg-swsh9-042, lc-en-tcg-swsh9-118 ... (+435) | EN sets: en-tcg-swsh9, JP sets: jp-tcg-S9, KR sets: kr-s9,kr-sl,kr-sg,kr-sp6 |
| 644 | og-sm10 | 2 | 번호(2) 일치 but dex# 불일치: keep=[10] vs candidate=[] | lc-en-tcg-sm10-002 | keep: lc-en-tcg-sm10-002 dex=[10] |
| 645 | og-sm10 | 3 | 번호(3) 일치 but dex# 불일치: keep=[11] vs candidate=[] | lc-en-tcg-sm10-003 | keep: lc-en-tcg-sm10-003 dex=[11] |
| 646 | og-sm10 | 4 | 번호(4) 일치 but dex# 불일치: keep=[12] vs candidate=[] | lc-en-tcg-sm10-004 | keep: lc-en-tcg-sm10-004 dex=[12] |
| 647 | og-sm10 | 5 | 번호(5) 일치 but dex# 불일치: keep=[43] vs candidate=[] | lc-en-tcg-sm10-005 | keep: lc-en-tcg-sm10-005 dex=[43] |
| 648 | og-sm10 | 6 | 번호(6) 일치 but dex# 불일치: keep=[43] vs candidate=[] | lc-en-tcg-sm10-006 | keep: lc-en-tcg-sm10-006 dex=[43] |
| 649 | og-sm10 | 7 | 번호(7) 일치 but dex# 불일치: keep=[44] vs candidate=[] | lc-en-tcg-sm10-007 | keep: lc-en-tcg-sm10-007 dex=[44] |
| 650 | og-sm10 | 8 | 번호(8) 일치 but dex# 불일치: keep=[45] vs candidate=[] | lc-en-tcg-sm10-008 | keep: lc-en-tcg-sm10-008 dex=[45] |
| 651 | og-sm10 | 9 | 번호(9) 일치 but dex# 불일치: keep=[48] vs candidate=[] | lc-en-tcg-sm10-009 | keep: lc-en-tcg-sm10-009 dex=[48] |
| 652 | og-sm10 | 12 | 번호(12) 일치 but dex# 불일치: keep=[49] vs candidate=[] | lc-en-tcg-sm10-012 | keep: lc-en-tcg-sm10-012 dex=[49] |
| 653 | og-sm10 | 13 | 번호(13) 일치 but dex# 불일치: keep=[69] vs candidate=[] | lc-en-tcg-sm10-013 | keep: lc-en-tcg-sm10-013 dex=[69] |
| 654 | og-sm10 | 14 | 번호(14) 일치 but dex# 불일치: keep=[70] vs candidate=[] | lc-en-tcg-sm10-014 | keep: lc-en-tcg-sm10-014 dex=[70] |
| 655 | og-sm10 | 15 | 번호(15) 일치 but dex# 불일치: keep=[71] vs candidate=[] | lc-en-tcg-sm10-015 | keep: lc-en-tcg-sm10-015 dex=[71] |
| 656 | og-sm10 | 16 | 번호(16) 일치 but dex# 불일치: keep=[114] vs candidate=[] | lc-en-tcg-sm10-016 | keep: lc-en-tcg-sm10-016 dex=[114] |
| 657 | og-sm10 | 17 | 번호(17) 일치 but dex# 불일치: keep=[465] vs candidate=[] | lc-en-tcg-sm10-017 | keep: lc-en-tcg-sm10-017 dex=[465] |
| 658 | og-sm10 | 18 | 번호(18) 일치 but dex# 불일치: keep=[736] vs candidate=[] | lc-en-tcg-sm10-018 | keep: lc-en-tcg-sm10-018 dex=[736] |
| 659 | og-sm10 | 19 | 번호(19) 일치 but dex# 불일치: keep=[798] vs candidate=[] | lc-en-tcg-sm10-019 | keep: lc-en-tcg-sm10-019 dex=[798] |
| 660 | og-sm10 | 21 | 번호(21) 일치 but dex# 불일치: keep=[58] vs candidate=[] | lc-en-tcg-sm10-021 | keep: lc-en-tcg-sm10-021 dex=[58] |
| 661 | og-sm10 | 22 | 번호(22) 일치 but dex# 불일치: keep=[59] vs candidate=[] | lc-en-tcg-sm10-022 | keep: lc-en-tcg-sm10-022 dex=[59] |
| 662 | og-sm10 | 23 | 번호(23) 일치 but dex# 불일치: keep=[554] vs candidate=[] | lc-en-tcg-sm10-023 | keep: lc-en-tcg-sm10-023 dex=[554] |
| 663 | og-sm10 | 24 | 번호(24) 일치 but dex# 불일치: keep=[555] vs candidate=[] | lc-en-tcg-sm10-024 | keep: lc-en-tcg-sm10-024 dex=[555] |
| 664 | og-sm10 | 25 | 번호(25) 일치 but dex# 불일치: keep=[721] vs candidate=[] | lc-en-tcg-sm10-025 | keep: lc-en-tcg-sm10-025 dex=[721] |
| 665 | og-sm10 | 26 | 번호(26) 일치 but dex# 불일치: keep=[725] vs candidate=[] | lc-en-tcg-sm10-026 | keep: lc-en-tcg-sm10-026 dex=[725] |
| 666 | og-sm10 | 27 | 번호(27) 일치 but dex# 불일치: keep=[725] vs candidate=[] | lc-en-tcg-sm10-027 | keep: lc-en-tcg-sm10-027 dex=[725] |
| 667 | og-sm10 | 28 | 번호(28) 일치 but dex# 불일치: keep=[726] vs candidate=[] | lc-en-tcg-sm10-028 | keep: lc-en-tcg-sm10-028 dex=[726] |
| 668 | og-sm10 | 30 | 번호(30) 일치 but dex# 불일치: keep=[757] vs candidate=[] | lc-en-tcg-sm10-030 | keep: lc-en-tcg-sm10-030 dex=[757] |
| 669 | og-sm10 | 31 | 번호(31) 일치 but dex# 불일치: keep=[758] vs candidate=[] | lc-en-tcg-sm10-031 | keep: lc-en-tcg-sm10-031 dex=[758] |
| 670 | og-sm10 | 32 | 번호(32) 일치 but dex# 불일치: keep=[806] vs candidate=[] | lc-en-tcg-sm10-032 | keep: lc-en-tcg-sm10-032 dex=[806] |
| 671 | og-sm10 | 33 | 번호(33) 일치 but dex# 불일치: keep=[7] vs candidate=[] | lc-en-tcg-sm10-033 | keep: lc-en-tcg-sm10-033 dex=[7] |
| 672 | og-sm10 | 34 | 번호(34) 일치 but dex# 불일치: keep=[8] vs candidate=[] | lc-en-tcg-sm10-034 | keep: lc-en-tcg-sm10-034 dex=[8] |
| 673 | og-sm10 | 35 | 번호(35) 일치 but dex# 불일치: keep=[9] vs candidate=[] | lc-en-tcg-sm10-035 | keep: lc-en-tcg-sm10-035 dex=[9] |
| 674 | og-sm10 | 36 | 번호(36) 일치 but dex# 불일치: keep=[60] vs candidate=[] | lc-en-tcg-sm10-036 | keep: lc-en-tcg-sm10-036 dex=[60] |
| 675 | og-sm10 | 37 | 번호(37) 일치 but dex# 불일치: keep=[60] vs candidate=[] | lc-en-tcg-sm10-037 | keep: lc-en-tcg-sm10-037 dex=[60] |
| 676 | og-sm10 | 39 | 번호(39) 일치 but dex# 불일치: keep=[62] vs candidate=[] | lc-en-tcg-sm10-039 | keep: lc-en-tcg-sm10-039 dex=[62] |
| 677 | og-sm10 | 40 | 번호(40) 일치 but dex# 불일치: keep=[72] vs candidate=[] | lc-en-tcg-sm10-040 | keep: lc-en-tcg-sm10-040 dex=[72] |
| 678 | og-sm10 | 42 | 번호(42) 일치 but dex# 불일치: keep=[79] vs candidate=[] | lc-en-tcg-sm10-042 | keep: lc-en-tcg-sm10-042 dex=[79] |
| 679 | og-sm10 | 43 | 번호(43) 일치 but dex# 불일치: keep=[80] vs candidate=[] | lc-en-tcg-sm10-043 | keep: lc-en-tcg-sm10-043 dex=[80] |
| 680 | og-sm10 | 44 | 번호(44) 일치 but dex# 불일치: keep=[86] vs candidate=[] | lc-en-tcg-sm10-044 | keep: lc-en-tcg-sm10-044 dex=[86] |
| 681 | og-sm10 | 45 | 번호(45) 일치 but dex# 불일치: keep=[87] vs candidate=[] | lc-en-tcg-sm10-045 | keep: lc-en-tcg-sm10-045 dex=[87] |
| 682 | og-sm10 | 46 | 번호(46) 일치 but dex# 불일치: keep=[98] vs candidate=[] | lc-en-tcg-sm10-046 | keep: lc-en-tcg-sm10-046 dex=[98] |
| 683 | og-sm10 | 73 | 번호(73) 일치 but dex# 불일치: keep=[109] vs candidate=[] | lc-en-tcg-sm10-073 | keep: lc-en-tcg-sm10-073 dex=[109] |
| 684 | og-sm10 | 48 | 번호(48) 일치 but dex# 불일치: keep=[118] vs candidate=[] | lc-en-tcg-sm10-048 | keep: lc-en-tcg-sm10-048 dex=[118] |
| 685 | og-sm10 | 49 | 번호(49) 일치 but dex# 불일치: keep=[119] vs candidate=[] | lc-en-tcg-sm10-049 | keep: lc-en-tcg-sm10-049 dex=[119] |
| 686 | og-sm10 | 50 | 번호(50) 일치 but dex# 불일치: keep=[646] vs candidate=[] | lc-en-tcg-sm10-050 | keep: lc-en-tcg-sm10-050 dex=[646] |
| 687 | og-sm10 | 51 | 번호(51) 일치 but dex# 불일치: keep=[656] vs candidate=[] | lc-en-tcg-sm10-051 | keep: lc-en-tcg-sm10-051 dex=[656] |
| 688 | og-sm10 | 52 | 번호(52) 일치 but dex# 불일치: keep=[657] vs candidate=[] | lc-en-tcg-sm10-052 | keep: lc-en-tcg-sm10-052 dex=[657] |
| 689 | og-sm10 | 54 | 번호(54) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-en-tcg-sm10-054 | keep: lc-en-tcg-sm10-054 dex=[25] |
| 690 | og-sm10 | 55 | 번호(55) 일치 but dex# 불일치: keep=[26] vs candidate=[] | lc-en-tcg-sm10-055 | keep: lc-en-tcg-sm10-055 dex=[26] |
| 691 | og-sm10 | 92 | 번호(92) 일치 but dex# 불일치: keep=[111] vs candidate=[] | lc-en-tcg-sm10-092 | keep: lc-en-tcg-sm10-092 dex=[111] |
| 692 | og-sm10 | 58 | 번호(58) 일치 but dex# 불일치: keep=[737] vs candidate=[] | lc-en-tcg-sm10-058 | keep: lc-en-tcg-sm10-058 dex=[737] |
| 693 | og-sm10 | 59 | 번호(59) 일치 but dex# 불일치: keep=[738] vs candidate=[] | lc-en-tcg-sm10-059 | keep: lc-en-tcg-sm10-059 dex=[738] |
| 694 | og-sm10 | 60 | 번호(60) 일치 but dex# 불일치: keep=[807] vs candidate=[] | lc-en-tcg-sm10-060 | keep: lc-en-tcg-sm10-060 dex=[807] |
| 695 | og-sm10 | 62 | 번호(62) 일치 but dex# 불일치: keep=[23] vs candidate=[] | lc-en-tcg-sm10-062 | keep: lc-en-tcg-sm10-062 dex=[23] |
| 696 | og-sm10 | 63 | 번호(63) 일치 but dex# 불일치: keep=[24] vs candidate=[] | lc-en-tcg-sm10-063 | keep: lc-en-tcg-sm10-063 dex=[24] |
| 697 | og-sm10 | 65 | 번호(65) 일치 but dex# 불일치: keep=[42] vs candidate=[] | lc-en-tcg-sm10-065 | keep: lc-en-tcg-sm10-065 dex=[42] |
| 698 | og-sm10 | 66 | 번호(66) 일치 but dex# 불일치: keep=[169] vs candidate=[] | lc-en-tcg-sm10-066 | keep: lc-en-tcg-sm10-066 dex=[169] |
| 699 | og-sm10 | 67 | 번호(67) 일치 but dex# 불일치: keep=[92] vs candidate=[] | lc-en-tcg-sm10-067 | keep: lc-en-tcg-sm10-067 dex=[92] |
| 700 | og-sm10 | 68 | 번호(68) 일치 but dex# 불일치: keep=[92] vs candidate=[] | lc-en-tcg-sm10-068 | keep: lc-en-tcg-sm10-068 dex=[92] |
| 701 | og-sm10 | 69 | 번호(69) 일치 but dex# 불일치: keep=[93] vs candidate=[] | lc-en-tcg-sm10-069 | keep: lc-en-tcg-sm10-069 dex=[93] |
| 702 | og-sm10 | 70 | 번호(70) 일치 but dex# 불일치: keep=[94] vs candidate=[] | lc-en-tcg-sm10-070 | keep: lc-en-tcg-sm10-070 dex=[94] |
| 703 | og-sm10 | 71 | 번호(71) 일치 but dex# 불일치: keep=[96] vs candidate=[] | lc-en-tcg-sm10-071 | keep: lc-en-tcg-sm10-071 dex=[96] |
| 704 | og-sm10 | 72 | 번호(72) 일치 but dex# 불일치: keep=[97] vs candidate=[] | lc-en-tcg-sm10-072 | keep: lc-en-tcg-sm10-072 dex=[97] |
| 705 | og-sm10 | 75 | 번호(75) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-en-tcg-sm10-075 | keep: lc-en-tcg-sm10-075 dex=[150] |
| 706 | og-sm10 | 76 | 번호(76) 일치 but dex# 불일치: keep=[151] vs candidate=[] | lc-en-tcg-sm10-076 | keep: lc-en-tcg-sm10-076 dex=[151] |
| 707 | og-sm10 | 77 | 번호(77) 일치 but dex# 불일치: keep=[200] vs candidate=[] | lc-en-tcg-sm10-077 | keep: lc-en-tcg-sm10-077 dex=[200] |
| 708 | og-sm10 | 78 | 번호(78) 일치 but dex# 불일치: keep=[429] vs candidate=[] | lc-en-tcg-sm10-078 | keep: lc-en-tcg-sm10-078 dex=[429] |
| 709 | og-sm10 | 79 | 번호(79) 일치 but dex# 불일치: keep=[677] vs candidate=[] | lc-en-tcg-sm10-079 | keep: lc-en-tcg-sm10-079 dex=[677] |
| 710 | og-sm10 | 80 | 번호(80) 일치 but dex# 불일치: keep=[678] vs candidate=[] | lc-en-tcg-sm10-080 | keep: lc-en-tcg-sm10-080 dex=[678] |
| 711 | og-sm10 | 81 | 번호(81) 일치 but dex# 불일치: keep=[802] vs candidate=[] | lc-en-tcg-sm10-081 | keep: lc-en-tcg-sm10-081 dex=[802] |
| 712 | og-sm10 | 91 | 번호(91) 일치 but dex# 불일치: keep=[105] vs candidate=[] | lc-en-tcg-sm10-091 | keep: lc-en-tcg-sm10-091 dex=[105] |
| 713 | og-sm10 | 83 | 번호(83) 일치 but dex# 불일치: keep=[27] vs candidate=[] | lc-en-tcg-sm10-083 | keep: lc-en-tcg-sm10-083 dex=[27] |
| 714 | og-sm10 | 84 | 번호(84) 일치 but dex# 불일치: keep=[28] vs candidate=[] | lc-en-tcg-sm10-084 | keep: lc-en-tcg-sm10-084 dex=[28] |
| 715 | og-sm10 | 85 | 번호(85) 일치 but dex# 불일치: keep=[50] vs candidate=[] | lc-en-tcg-sm10-085 | keep: lc-en-tcg-sm10-085 dex=[50] |
| 716 | og-sm10 | 86 | 번호(86) 일치 but dex# 불일치: keep=[51] vs candidate=[] | lc-en-tcg-sm10-086 | keep: lc-en-tcg-sm10-086 dex=[51] |
| 717 | og-sm10 | 87 | 번호(87) 일치 but dex# 불일치: keep=[74] vs candidate=[] | lc-en-tcg-sm10-087 | keep: lc-en-tcg-sm10-087 dex=[74] |
| 718 | og-sm10 | 88 | 번호(88) 일치 but dex# 불일치: keep=[75] vs candidate=[] | lc-en-tcg-sm10-088 | keep: lc-en-tcg-sm10-088 dex=[75] |
| 719 | og-sm10 | 89 | 번호(89) 일치 but dex# 불일치: keep=[76] vs candidate=[] | lc-en-tcg-sm10-089 | keep: lc-en-tcg-sm10-089 dex=[76] |
| 720 | og-sm10 | 90 | 번호(90) 일치 but dex# 불일치: keep=[104] vs candidate=[] | lc-en-tcg-sm10-090 | keep: lc-en-tcg-sm10-090 dex=[104] |
| 721 | og-sm10 | 94 | 번호(94) 일치 but dex# 불일치: keep=[112] vs candidate=[] | lc-en-tcg-sm10-094 | keep: lc-en-tcg-sm10-094 dex=[112] |
| 722 | og-sm10 | 96 | 번호(96) 일치 but dex# 불일치: keep=[194] vs candidate=[] | lc-en-tcg-sm10-096 | keep: lc-en-tcg-sm10-096 dex=[194] |
| 723 | og-sm10 | 97 | 번호(97) 일치 but dex# 불일치: keep=[195] vs candidate=[] | lc-en-tcg-sm10-097 | keep: lc-en-tcg-sm10-097 dex=[195] |
| 724 | og-sm10 | 98 | 번호(98) 일치 but dex# 불일치: keep=[207] vs candidate=[] | lc-en-tcg-sm10-098 | keep: lc-en-tcg-sm10-098 dex=[207] |
| 725 | og-sm10 | 99 | 번호(99) 일치 but dex# 불일치: keep=[472] vs candidate=[] | lc-en-tcg-sm10-099 | keep: lc-en-tcg-sm10-099 dex=[472] |
| 726 | og-sm10 | 100 | 번호(100) 일치 but dex# 불일치: keep=[236] vs candidate=[] | lc-en-tcg-sm10-100 | keep: lc-en-tcg-sm10-100 dex=[236] |
| 727 | og-sm10 | 101 | 번호(101) 일치 but dex# 불일치: keep=[237] vs candidate=[] | lc-en-tcg-sm10-101 | keep: lc-en-tcg-sm10-101 dex=[237] |
| 728 | og-sm10 | 102 | 번호(102) 일치 but dex# 불일치: keep=[447] vs candidate=[] | lc-en-tcg-sm10-102 | keep: lc-en-tcg-sm10-102 dex=[447] |
| 729 | og-sm10 | 104 | 번호(104) 일치 but dex# 불일치: keep=[739] vs candidate=[] | lc-en-tcg-sm10-104 | keep: lc-en-tcg-sm10-104 dex=[739] |
| 730 | og-sm10 | 105 | 번호(105) 일치 but dex# 불일치: keep=[740] vs candidate=[] | lc-en-tcg-sm10-105 | keep: lc-en-tcg-sm10-105 dex=[740] |
| 731 | og-sm10 | 106 | 번호(106) 일치 but dex# 불일치: keep=[805] vs candidate=[] | lc-en-tcg-sm10-106 | keep: lc-en-tcg-sm10-106 dex=[805] |
| 732 | og-sm10 | 108 | 번호(108) 일치 but dex# 불일치: keep=[198] vs candidate=[] | lc-en-tcg-sm10-108 | keep: lc-en-tcg-sm10-108 dex=[198] |
| 733 | og-sm10 | 109 | 번호(109) 일치 but dex# 불일치: keep=[430] vs candidate=[] | lc-en-tcg-sm10-109 | keep: lc-en-tcg-sm10-109 dex=[430] |
| 734 | og-sm10 | 110 | 번호(110) 일치 but dex# 불일치: keep=[318] vs candidate=[] | lc-en-tcg-sm10-110 | keep: lc-en-tcg-sm10-110 dex=[318] |
| 735 | og-sm10 | 112 | 번호(112) 일치 but dex# 불일치: keep=[442] vs candidate=[] | lc-en-tcg-sm10-112 | keep: lc-en-tcg-sm10-112 dex=[442] |
| 736 | og-sm10 | 113 | 번호(113) 일치 but dex# 불일치: keep=[551] vs candidate=[] | lc-en-tcg-sm10-113 | keep: lc-en-tcg-sm10-113 dex=[551] |
| 737 | og-sm10 | 114 | 번호(114) 일치 but dex# 불일치: keep=[551] vs candidate=[] | lc-en-tcg-sm10-114 | keep: lc-en-tcg-sm10-114 dex=[551] |
| 738 | og-sm10 | 115 | 번호(115) 일치 but dex# 불일치: keep=[552] vs candidate=[] | lc-en-tcg-sm10-115 | keep: lc-en-tcg-sm10-115 dex=[552] |
| 739 | og-sm10 | 116 | 번호(116) 일치 but dex# 불일치: keep=[553] vs candidate=[] | lc-en-tcg-sm10-116 | keep: lc-en-tcg-sm10-116 dex=[553] |
| 740 | og-sm10 | 10 | 번호(10) 일치 but dex# 불일치: keep=[48] vs candidate=[] | lc-en-tcg-sm10-010 | keep: lc-en-tcg-sm10-010 dex=[48] |
| 741 | og-sm10 | 1 | 번호(1) 일치 but dex# 불일치: keep=[794,795] vs candidate=[] | lc-en-tcg-sm10-001 | keep: lc-en-tcg-sm10-001 dex=[794,795] |
| 742 | og-sm10 | 20 | 번호(20) 일치 but dex# 불일치: keep=[6,643] vs candidate=[] | lc-en-tcg-sm10-020 | keep: lc-en-tcg-sm10-020 dex=[6,643] |
| 743 | og-sm10 | 29 | 번호(29) 일치 but dex# 불일치: keep=[727] vs candidate=[] | lc-en-tcg-sm10-029 | keep: lc-en-tcg-sm10-029 dex=[727] |
| 744 | og-sm10 | 38 | 번호(38) 일치 but dex# 불일치: keep=[61] vs candidate=[] | lc-en-tcg-sm10-038 | keep: lc-en-tcg-sm10-038 dex=[61] |
| 745 | og-sm10 | 41 | 번호(41) 일치 but dex# 불일치: keep=[73] vs candidate=[] | lc-en-tcg-sm10-041 | keep: lc-en-tcg-sm10-041 dex=[73] |
| 746 | og-sm10 | 47 | 번호(47) 일치 but dex# 불일치: keep=[99] vs candidate=[] | lc-en-tcg-sm10-047 | keep: lc-en-tcg-sm10-047 dex=[99] |
| 747 | og-sm10 | 53 | 번호(53) 일치 but dex# 불일치: keep=[771] vs candidate=[] | lc-en-tcg-sm10-053 | keep: lc-en-tcg-sm10-053 dex=[771] |
| 748 | og-sm10 | 56 | 번호(56) 일치 but dex# 불일치: keep=[618] vs candidate=[] | lc-en-tcg-sm10-056 | keep: lc-en-tcg-sm10-056 dex=[618] |
| 749 | og-sm10 | 57 | 번호(57) 일치 but dex# 불일치: keep=[702] vs candidate=[] | lc-en-tcg-sm10-057 | keep: lc-en-tcg-sm10-057 dex=[702] |
| 750 | og-sm10 | 107 | 번호(107) 일치 but dex# 불일치: keep=[571,658] vs candidate=[] | lc-en-tcg-sm10-107 | keep: lc-en-tcg-sm10-107 dex=[571,658] |
| 751 | og-sm10 | 61 | 번호(61) 일치 but dex# 불일치: keep=[89] vs candidate=[] | lc-en-tcg-sm10-061 | keep: lc-en-tcg-sm10-061 dex=[89] |
| 752 | og-sm10 | 64 | 번호(64) 일치 but dex# 불일치: keep=[41] vs candidate=[] | lc-en-tcg-sm10-064 | keep: lc-en-tcg-sm10-064 dex=[41] |
| 753 | og-sm10 | 74 | 번호(74) 일치 but dex# 불일치: keep=[110] vs candidate=[] | lc-en-tcg-sm10-074 | keep: lc-en-tcg-sm10-074 dex=[110] |
| 754 | og-sm10 | 82 | 번호(82) 일치 but dex# 불일치: keep=[68,802] vs candidate=[] | lc-en-tcg-sm10-082 | keep: lc-en-tcg-sm10-082 dex=[68,802] |
| 755 | og-sm10 | 93 | 번호(93) 일치 but dex# 불일치: keep=[111] vs candidate=[] | lc-en-tcg-sm10-093 | keep: lc-en-tcg-sm10-093 dex=[111] |
| 756 | og-sm10 | 95 | 번호(95) 일치 but dex# 불일치: keep=[464] vs candidate=[] | lc-en-tcg-sm10-095 | keep: lc-en-tcg-sm10-095 dex=[464] |
| 757 | og-sm10 | 103 | 번호(103) 일치 but dex# 불일치: keep=[645] vs candidate=[] | lc-en-tcg-sm10-103 | keep: lc-en-tcg-sm10-103 dex=[645] |
| 758 | og-sm10 | 111 | 번호(111) 일치 but dex# 불일치: keep=[319] vs candidate=[] | lc-en-tcg-sm10-111 | keep: lc-en-tcg-sm10-111 dex=[319] |
| 759 | og-sm10 | 11 | 번호(11) 일치 but dex# 불일치: keep=[49] vs candidate=[] | lc-en-tcg-sm10-011 | keep: lc-en-tcg-sm10-011 dex=[49] |
| 760 | og-sm11a | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-sm11-192, lc-en-tcg-sm11-236, lc-en-tcg-sm11-193 ... (+408) | EN sets: en-tcg-sm11, JP sets: jp-tcg-SM11a, KR sets: kr-sm11a,kr-smm |
| 761 | og-sm11b | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-orphan-jp-tcg-SM11b-1, lc-orphan-jp-tcg-SM11b-10, lc-orphan-jp-tcg-SM11b-11 ... (+140) | EN sets: , JP sets: jp-tcg-SM11b, KR sets: kr-smn,kr-sm11b |
| 762 | og-sm12 | 10 | 번호(10) 일치 but dex# 불일치: keep=[345] vs candidate=[] | lc-en-tcg-sm12-010 | keep: lc-en-tcg-sm12-010 dex=[345] |
| 763 | og-sm12 | 11 | 번호(11) 일치 but dex# 불일치: keep=[346] vs candidate=[] | lc-en-tcg-sm12-011 | keep: lc-en-tcg-sm12-011 dex=[346] |
| 764 | og-sm12 | 2 | 번호(2) 일치 but dex# 불일치: keep=[43] vs candidate=[] | lc-en-tcg-sm12-002 | keep: lc-en-tcg-sm12-002 dex=[43] |
| 765 | og-sm12 | 3 | 번호(3) 일치 but dex# 불일치: keep=[44] vs candidate=[] | lc-en-tcg-sm12-003 | keep: lc-en-tcg-sm12-003 dex=[44] |
| 766 | og-sm12 | 4 | 번호(4) 일치 but dex# 불일치: keep=[45] vs candidate=[] | lc-en-tcg-sm12-004 | keep: lc-en-tcg-sm12-004 dex=[45] |
| 767 | og-sm12 | 5 | 번호(5) 일치 but dex# 불일치: keep=[114] vs candidate=[] | lc-en-tcg-sm12-005 | keep: lc-en-tcg-sm12-005 dex=[114] |
| 768 | og-sm12 | 6 | 번호(6) 일치 but dex# 불일치: keep=[465] vs candidate=[] | lc-en-tcg-sm12-006 | keep: lc-en-tcg-sm12-006 dex=[465] |
| 769 | og-sm12 | 7 | 번호(7) 일치 but dex# 불일치: keep=[191] vs candidate=[] | lc-en-tcg-sm12-007 | keep: lc-en-tcg-sm12-007 dex=[191] |
| 770 | og-sm12 | 8 | 번호(8) 일치 but dex# 불일치: keep=[192] vs candidate=[] | lc-en-tcg-sm12-008 | keep: lc-en-tcg-sm12-008 dex=[192] |
| 771 | og-sm12 | 9 | 번호(9) 일치 but dex# 불일치: keep=[214] vs candidate=[] | lc-en-tcg-sm12-009 | keep: lc-en-tcg-sm12-009 dex=[214] |
| 772 | og-sm12 | 13 | 번호(13) 일치 but dex# 불일치: keep=[401] vs candidate=[] | lc-en-tcg-sm12-013 | keep: lc-en-tcg-sm12-013 dex=[401] |
| 773 | og-sm12 | 15 | 번호(15) 일치 but dex# 불일치: keep=[585] vs candidate=[] | lc-en-tcg-sm12-015 | keep: lc-en-tcg-sm12-015 dex=[585] |
| 774 | og-sm12 | 16 | 번호(16) 일치 but dex# 불일치: keep=[586] vs candidate=[] | lc-en-tcg-sm12-016 | keep: lc-en-tcg-sm12-016 dex=[586] |
| 775 | og-sm12 | 17 | 번호(17) 일치 but dex# 불일치: keep=[722] vs candidate=[] | lc-en-tcg-sm12-017 | keep: lc-en-tcg-sm12-017 dex=[722] |
| 776 | og-sm12 | 18 | 번호(18) 일치 but dex# 불일치: keep=[722] vs candidate=[] | lc-en-tcg-sm12-018 | keep: lc-en-tcg-sm12-018 dex=[722] |
| 777 | og-sm12 | 19 | 번호(19) 일치 but dex# 불일치: keep=[723] vs candidate=[] | lc-en-tcg-sm12-019 | keep: lc-en-tcg-sm12-019 dex=[723] |
| 778 | og-sm12 | 49 | 번호(49) 일치 but dex# 불일치: keep=[363] vs candidate=[] | lc-en-tcg-sm12-049 | keep: lc-en-tcg-sm12-049 dex=[363] |
| 779 | og-sm12 | 22 | 번호(22) 일치 but dex# 불일치: keep=[6,654] vs candidate=[] | lc-en-tcg-sm12-022 | keep: lc-en-tcg-sm12-022 dex=[6,654] |
| 780 | og-sm12 | 23 | 번호(23) 일치 but dex# 불일치: keep=[77] vs candidate=[] | lc-en-tcg-sm12-023 | keep: lc-en-tcg-sm12-023 dex=[77] |
| 781 | og-sm12 | 24 | 번호(24) 일치 but dex# 불일치: keep=[78] vs candidate=[] | lc-en-tcg-sm12-024 | keep: lc-en-tcg-sm12-024 dex=[78] |
| 782 | og-sm12 | 25 | 번호(25) 일치 but dex# 불일치: keep=[136] vs candidate=[] | lc-en-tcg-sm12-025 | keep: lc-en-tcg-sm12-025 dex=[136] |
| 783 | og-sm12 | 26 | 번호(26) 일치 but dex# 불일치: keep=[218] vs candidate=[] | lc-en-tcg-sm12-026 | keep: lc-en-tcg-sm12-026 dex=[218] |
| 784 | og-sm12 | 27 | 번호(27) 일치 but dex# 불일치: keep=[219] vs candidate=[] | lc-en-tcg-sm12-027 | keep: lc-en-tcg-sm12-027 dex=[219] |
| 785 | og-sm12 | 28 | 번호(28) 일치 but dex# 불일치: keep=[244] vs candidate=[] | lc-en-tcg-sm12-028 | keep: lc-en-tcg-sm12-028 dex=[244] |
| 786 | og-sm12 | 29 | 번호(29) 일치 but dex# 불일치: keep=[324] vs candidate=[] | lc-en-tcg-sm12-029 | keep: lc-en-tcg-sm12-029 dex=[324] |
| 787 | og-sm12 | 31 | 번호(31) 일치 but dex# 불일치: keep=[498] vs candidate=[] | lc-en-tcg-sm12-031 | keep: lc-en-tcg-sm12-031 dex=[498] |
| 788 | og-sm12 | 32 | 번호(32) 일치 but dex# 불일치: keep=[499] vs candidate=[] | lc-en-tcg-sm12-032 | keep: lc-en-tcg-sm12-032 dex=[499] |
| 789 | og-sm12 | 34 | 번호(34) 일치 but dex# 불일치: keep=[636] vs candidate=[] | lc-en-tcg-sm12-034 | keep: lc-en-tcg-sm12-034 dex=[636] |
| 790 | og-sm12 | 36 | 번호(36) 일치 but dex# 불일치: keep=[667] vs candidate=[] | lc-en-tcg-sm12-036 | keep: lc-en-tcg-sm12-036 dex=[667] |
| 791 | og-sm12 | 37 | 번호(37) 일치 but dex# 불일치: keep=[668] vs candidate=[] | lc-en-tcg-sm12-037 | keep: lc-en-tcg-sm12-037 dex=[668] |
| 792 | og-sm12 | 38 | 번호(38) 일치 but dex# 불일치: keep=[9,393] vs candidate=[] | lc-en-tcg-sm12-038 | keep: lc-en-tcg-sm12-038 dex=[9,393] |
| 793 | og-sm12 | 40 | 번호(40) 일치 but dex# 불일치: keep=[54] vs candidate=[] | lc-en-tcg-sm12-040 | keep: lc-en-tcg-sm12-040 dex=[54] |
| 794 | og-sm12 | 41 | 번호(41) 일치 but dex# 불일치: keep=[55] vs candidate=[] | lc-en-tcg-sm12-041 | keep: lc-en-tcg-sm12-041 dex=[55] |
| 795 | og-sm12 | 42 | 번호(42) 일치 but dex# 불일치: keep=[134] vs candidate=[] | lc-en-tcg-sm12-042 | keep: lc-en-tcg-sm12-042 dex=[134] |
| 796 | og-sm12 | 43 | 번호(43) 일치 but dex# 불일치: keep=[215] vs candidate=[] | lc-en-tcg-sm12-043 | keep: lc-en-tcg-sm12-043 dex=[215] |
| 797 | og-sm12 | 44 | 번호(44) 일치 but dex# 불일치: keep=[461] vs candidate=[] | lc-en-tcg-sm12-044 | keep: lc-en-tcg-sm12-044 dex=[461] |
| 798 | og-sm12 | 45 | 번호(45) 일치 but dex# 불일치: keep=[320] vs candidate=[] | lc-en-tcg-sm12-045 | keep: lc-en-tcg-sm12-045 dex=[320] |
| 799 | og-sm12 | 46 | 번호(46) 일치 but dex# 불일치: keep=[321] vs candidate=[] | lc-en-tcg-sm12-046 | keep: lc-en-tcg-sm12-046 dex=[321] |
| 800 | og-sm12 | 47 | 번호(47) 일치 but dex# 불일치: keep=[361] vs candidate=[] | lc-en-tcg-sm12-047 | keep: lc-en-tcg-sm12-047 dex=[361] |
| 801 | og-sm12 | 48 | 번호(48) 일치 but dex# 불일치: keep=[362] vs candidate=[] | lc-en-tcg-sm12-048 | keep: lc-en-tcg-sm12-048 dex=[362] |
| 802 | og-sm12 | 51 | 번호(51) 일치 but dex# 불일치: keep=[364] vs candidate=[] | lc-en-tcg-sm12-051 | keep: lc-en-tcg-sm12-051 dex=[364] |
| 803 | og-sm12 | 53 | 번호(53) 일치 but dex# 불일치: keep=[382] vs candidate=[] | lc-en-tcg-sm12-053 | keep: lc-en-tcg-sm12-053 dex=[382] |
| 804 | og-sm12 | 54 | 번호(54) 일치 but dex# 불일치: keep=[393] vs candidate=[] | lc-en-tcg-sm12-054 | keep: lc-en-tcg-sm12-054 dex=[393] |
| 805 | og-sm12 | 55 | 번호(55) 일치 but dex# 불일치: keep=[394] vs candidate=[] | lc-en-tcg-sm12-055 | keep: lc-en-tcg-sm12-055 dex=[394] |
| 806 | og-sm12 | 56 | 번호(56) 일치 but dex# 불일치: keep=[395] vs candidate=[] | lc-en-tcg-sm12-056 | keep: lc-en-tcg-sm12-056 dex=[395] |
| 807 | og-sm12 | 57 | 번호(57) 일치 but dex# 불일치: keep=[489] vs candidate=[] | lc-en-tcg-sm12-057 | keep: lc-en-tcg-sm12-057 dex=[489] |
| 808 | og-sm12 | 58 | 번호(58) 일치 but dex# 불일치: keep=[535] vs candidate=[] | lc-en-tcg-sm12-058 | keep: lc-en-tcg-sm12-058 dex=[535] |
| 809 | og-sm12 | 59 | 번호(59) 일치 but dex# 불일치: keep=[580] vs candidate=[] | lc-en-tcg-sm12-059 | keep: lc-en-tcg-sm12-059 dex=[580] |
| 810 | og-sm12 | 61 | 번호(61) 일치 but dex# 불일치: keep=[646] vs candidate=[] | lc-en-tcg-sm12-061 | keep: lc-en-tcg-sm12-061 dex=[646] |
| 811 | og-sm12 | 62 | 번호(62) 일치 but dex# 불일치: keep=[746] vs candidate=[] | lc-en-tcg-sm12-062 | keep: lc-en-tcg-sm12-062 dex=[746] |
| 812 | og-sm12 | 64 | 번호(64) 일치 but dex# 불일치: keep=[751] vs candidate=[] | lc-en-tcg-sm12-064 | keep: lc-en-tcg-sm12-064 dex=[751] |
| 813 | og-sm12 | 65 | 번호(65) 일치 but dex# 불일치: keep=[752] vs candidate=[] | lc-en-tcg-sm12-065 | keep: lc-en-tcg-sm12-065 dex=[752] |
| 814 | og-sm12 | 66 | 번호(66) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-en-tcg-sm12-066 | keep: lc-en-tcg-sm12-066 dex=[25] |
| 815 | og-sm12 | 67 | 번호(67) 일치 but dex# 불일치: keep=[26] vs candidate=[] | lc-en-tcg-sm12-067 | keep: lc-en-tcg-sm12-067 dex=[26] |
| 816 | og-sm12 | 68 | 번호(68) 일치 but dex# 불일치: keep=[81] vs candidate=[] | lc-en-tcg-sm12-068 | keep: lc-en-tcg-sm12-068 dex=[81] |
| 817 | og-sm12 | 70 | 번호(70) 일치 but dex# 불일치: keep=[135] vs candidate=[] | lc-en-tcg-sm12-070 | keep: lc-en-tcg-sm12-070 dex=[135] |
| 818 | og-sm12 | 71 | 번호(71) 일치 but dex# 불일치: keep=[170] vs candidate=[] | lc-en-tcg-sm12-071 | keep: lc-en-tcg-sm12-071 dex=[170] |
| 819 | og-sm12 | 72 | 번호(72) 일치 but dex# 불일치: keep=[171] vs candidate=[] | lc-en-tcg-sm12-072 | keep: lc-en-tcg-sm12-072 dex=[171] |
| 820 | og-sm12 | 73 | 번호(73) 일치 but dex# 불일치: keep=[777] vs candidate=[] | lc-en-tcg-sm12-073 | keep: lc-en-tcg-sm12-073 dex=[777] |
| 821 | og-sm12 | 74 | 번호(74) 일치 but dex# 불일치: keep=[777] vs candidate=[] | lc-en-tcg-sm12-074 | keep: lc-en-tcg-sm12-074 dex=[777] |
| 822 | og-sm12 | 76 | 번호(76) 일치 but dex# 불일치: keep=[109] vs candidate=[] | lc-en-tcg-sm12-076 | keep: lc-en-tcg-sm12-076 dex=[109] |
| 823 | og-sm12 | 77 | 번호(77) 일치 but dex# 불일치: keep=[110] vs candidate=[] | lc-en-tcg-sm12-077 | keep: lc-en-tcg-sm12-077 dex=[110] |
| 824 | og-sm12 | 80 | 번호(80) 일치 but dex# 불일치: keep=[280] vs candidate=[] | lc-en-tcg-sm12-080 | keep: lc-en-tcg-sm12-080 dex=[280] |
| 825 | og-sm12 | 81 | 번호(81) 일치 but dex# 불일치: keep=[281] vs candidate=[] | lc-en-tcg-sm12-081 | keep: lc-en-tcg-sm12-081 dex=[281] |
| 826 | og-sm12 | 82 | 번호(82) 일치 but dex# 불일치: keep=[475] vs candidate=[] | lc-en-tcg-sm12-082 | keep: lc-en-tcg-sm12-082 dex=[475] |
| 827 | og-sm12 | 84 | 번호(84) 일치 but dex# 불일치: keep=[356] vs candidate=[] | lc-en-tcg-sm12-084 | keep: lc-en-tcg-sm12-084 dex=[356] |
| 828 | og-sm12 | 85 | 번호(85) 일치 but dex# 불일치: keep=[477] vs candidate=[] | lc-en-tcg-sm12-085 | keep: lc-en-tcg-sm12-085 dex=[477] |
| 829 | og-sm12 | 86 | 번호(86) 일치 but dex# 불일치: keep=[479] vs candidate=[] | lc-en-tcg-sm12-086 | keep: lc-en-tcg-sm12-086 dex=[479] |
| 830 | og-sm12 | 88 | 번호(88) 일치 but dex# 불일치: keep=[528] vs candidate=[] | lc-en-tcg-sm12-088 | keep: lc-en-tcg-sm12-088 dex=[528] |
| 831 | og-sm12 | 89 | 번호(89) 일치 but dex# 불일치: keep=[622] vs candidate=[] | lc-en-tcg-sm12-089 | keep: lc-en-tcg-sm12-089 dex=[622] |
| 832 | og-sm12 | 90 | 번호(90) 일치 but dex# 불일치: keep=[623] vs candidate=[] | lc-en-tcg-sm12-090 | keep: lc-en-tcg-sm12-090 dex=[623] |
| 833 | og-sm12 | 91 | 번호(91) 일치 but dex# 불일치: keep=[690] vs candidate=[] | lc-en-tcg-sm12-091 | keep: lc-en-tcg-sm12-091 dex=[690] |
| 834 | og-sm12 | 92 | 번호(92) 일치 but dex# 불일치: keep=[691] vs candidate=[] | lc-en-tcg-sm12-092 | keep: lc-en-tcg-sm12-092 dex=[691] |
| 835 | og-sm12 | 93 | 번호(93) 일치 but dex# 불일치: keep=[708] vs candidate=[] | lc-en-tcg-sm12-093 | keep: lc-en-tcg-sm12-093 dex=[708] |
| 836 | og-sm12 | 94 | 번호(94) 일치 but dex# 불일치: keep=[709] vs candidate=[] | lc-en-tcg-sm12-094 | keep: lc-en-tcg-sm12-094 dex=[709] |
| 837 | og-sm12 | 97 | 번호(97) 일치 but dex# 불일치: keep=[778] vs candidate=[] | lc-en-tcg-sm12-097 | keep: lc-en-tcg-sm12-097 dex=[778] |
| 838 | og-sm12 | 98 | 번호(98) 일치 but dex# 불일치: keep=[781] vs candidate=[] | lc-en-tcg-sm12-098 | keep: lc-en-tcg-sm12-098 dex=[781] |
| 839 | og-sm12 | 99 | 번호(99) 일치 but dex# 불일치: keep=[789] vs candidate=[] | lc-en-tcg-sm12-099 | keep: lc-en-tcg-sm12-099 dex=[789] |
| 840 | og-sm12 | 100 | 번호(100) 일치 but dex# 불일치: keep=[789] vs candidate=[] | lc-en-tcg-sm12-100 | keep: lc-en-tcg-sm12-100 dex=[789] |
| 841 | og-sm12 | 101 | 번호(101) 일치 but dex# 불일치: keep=[790] vs candidate=[] | lc-en-tcg-sm12-101 | keep: lc-en-tcg-sm12-101 dex=[790] |
| 842 | og-sm12 | 103 | 번호(103) 일치 but dex# 불일치: keep=[802] vs candidate=[] | lc-en-tcg-sm12-103 | keep: lc-en-tcg-sm12-103 dex=[802] |
| 843 | og-sm12 | 104 | 번호(104) 일치 but dex# 불일치: keep=[806] vs candidate=[] | lc-en-tcg-sm12-104 | keep: lc-en-tcg-sm12-104 dex=[806] |
| 844 | og-sm12 | 107 | 번호(107) 일치 but dex# 불일치: keep=[328] vs candidate=[] | lc-en-tcg-sm12-107 | keep: lc-en-tcg-sm12-107 dex=[328] |
| 845 | og-sm12 | 108 | 번호(108) 일치 but dex# 불일치: keep=[328] vs candidate=[] | lc-en-tcg-sm12-108 | keep: lc-en-tcg-sm12-108 dex=[328] |
| 846 | og-sm12 | 109 | 번호(109) 일치 but dex# 불일치: keep=[329] vs candidate=[] | lc-en-tcg-sm12-109 | keep: lc-en-tcg-sm12-109 dex=[329] |
| 847 | og-sm12 | 111 | 번호(111) 일치 but dex# 불일치: keep=[347] vs candidate=[] | lc-en-tcg-sm12-111 | keep: lc-en-tcg-sm12-111 dex=[347] |
| 848 | og-sm12 | 112 | 번호(112) 일치 but dex# 불일치: keep=[348] vs candidate=[] | lc-en-tcg-sm12-112 | keep: lc-en-tcg-sm12-112 dex=[348] |
| 849 | og-sm12 | 113 | 번호(113) 일치 but dex# 불일치: keep=[383] vs candidate=[] | lc-en-tcg-sm12-113 | keep: lc-en-tcg-sm12-113 dex=[383] |
| 850 | og-sm12 | 115 | 번호(115) 일치 but dex# 불일치: keep=[530] vs candidate=[] | lc-en-tcg-sm12-115 | keep: lc-en-tcg-sm12-115 dex=[530] |
| 851 | og-sm12 | 116 | 번호(116) 일치 but dex# 불일치: keep=[536] vs candidate=[] | lc-en-tcg-sm12-116 | keep: lc-en-tcg-sm12-116 dex=[536] |
| 852 | og-sm12 | 117 | 번호(117) 일치 but dex# 불일치: keep=[537] vs candidate=[] | lc-en-tcg-sm12-117 | keep: lc-en-tcg-sm12-117 dex=[537] |
| 853 | og-sm12 | 33 | 번호(33) 일치 but dex# 불일치: keep=[500] vs candidate=[] | lc-en-tcg-sm12-033 | keep: lc-en-tcg-sm12-033 dex=[500] |
| 854 | og-sm12 | 1 | 번호(1) 일치 but dex# 불일치: keep=[3,495] vs candidate=[] | lc-en-tcg-sm12-001 | keep: lc-en-tcg-sm12-001 dex=[3,495] |
| 855 | og-sm12 | 12 | 번호(12) 일치 but dex# 불일치: keep=[357] vs candidate=[] | lc-en-tcg-sm12-012 | keep: lc-en-tcg-sm12-012 dex=[357] |
| 856 | og-sm12 | 14 | 번호(14) 일치 but dex# 불일치: keep=[402] vs candidate=[] | lc-en-tcg-sm12-014 | keep: lc-en-tcg-sm12-014 dex=[402] |
| 857 | og-sm12 | 20 | 번호(20) 일치 but dex# 불일치: keep=[724] vs candidate=[] | lc-en-tcg-sm12-020 | keep: lc-en-tcg-sm12-020 dex=[724] |
| 858 | og-sm12 | 21 | 번호(21) 일치 but dex# 불일치: keep=[794] vs candidate=[] | lc-en-tcg-sm12-021 | keep: lc-en-tcg-sm12-021 dex=[794] |
| 859 | og-sm12 | 30 | 번호(30) 일치 but dex# 불일치: keep=[494] vs candidate=[] | lc-en-tcg-sm12-030 | keep: lc-en-tcg-sm12-030 dex=[494] |
| 860 | og-sm12 | 78 | 번호(78) 일치 but dex# 불일치: keep=[177] vs candidate=[] | lc-en-tcg-sm12-078 | keep: lc-en-tcg-sm12-078 dex=[177] |
| 861 | og-sm12 | 35 | 번호(35) 일치 but dex# 불일치: keep=[637] vs candidate=[] | lc-en-tcg-sm12-035 | keep: lc-en-tcg-sm12-035 dex=[637] |
| 862 | og-sm12 | 39 | 번호(39) 일치 but dex# 불일치: keep=[37] vs candidate=[] | lc-en-tcg-sm12-039 | keep: lc-en-tcg-sm12-039 dex=[37] |
| 863 | og-sm12 | 50 | 번호(50) 일치 but dex# 불일치: keep=[363] vs candidate=[] | lc-en-tcg-sm12-050 | keep: lc-en-tcg-sm12-050 dex=[363] |
| 864 | og-sm12 | 52 | 번호(52) 일치 but dex# 불일치: keep=[365] vs candidate=[] | lc-en-tcg-sm12-052 | keep: lc-en-tcg-sm12-052 dex=[365] |
| 865 | og-sm12 | 60 | 번호(60) 일치 but dex# 불일치: keep=[581] vs candidate=[] | lc-en-tcg-sm12-060 | keep: lc-en-tcg-sm12-060 dex=[581] |
| 866 | og-sm12 | 63 | 번호(63) 일치 but dex# 불일치: keep=[746] vs candidate=[] | lc-en-tcg-sm12-063 | keep: lc-en-tcg-sm12-063 dex=[746] |
| 867 | og-sm12 | 69 | 번호(69) 일치 but dex# 불일치: keep=[82] vs candidate=[] | lc-en-tcg-sm12-069 | keep: lc-en-tcg-sm12-069 dex=[82] |
| 868 | og-sm12 | 75 | 번호(75) 일치 but dex# 불일치: keep=[791,792] vs candidate=[] | lc-en-tcg-sm12-075 | keep: lc-en-tcg-sm12-075 dex=[791,792] |
| 869 | og-sm12 | 79 | 번호(79) 일치 but dex# 불일치: keep=[178] vs candidate=[] | lc-en-tcg-sm12-079 | keep: lc-en-tcg-sm12-079 dex=[178] |
| 870 | og-sm12 | 83 | 번호(83) 일치 but dex# 불일치: keep=[355] vs candidate=[] | lc-en-tcg-sm12-083 | keep: lc-en-tcg-sm12-083 dex=[355] |
| 871 | og-sm12 | 87 | 번호(87) 일치 but dex# 불일치: keep=[527] vs candidate=[] | lc-en-tcg-sm12-087 | keep: lc-en-tcg-sm12-087 dex=[527] |
| 872 | og-sm12 | 95 | 번호(95) 일치 but dex# 불일치: keep=[741] vs candidate=[] | lc-en-tcg-sm12-095 | keep: lc-en-tcg-sm12-095 dex=[741] |
| 873 | og-sm12 | 96 | 번호(96) 일치 but dex# 불일치: keep=[778] vs candidate=[] | lc-en-tcg-sm12-096 | keep: lc-en-tcg-sm12-096 dex=[778] |
| 874 | og-sm12 | 102 | 번호(102) 일치 but dex# 불일치: keep=[792] vs candidate=[] | lc-en-tcg-sm12-102 | keep: lc-en-tcg-sm12-102 dex=[792] |
| 875 | og-sm12 | 105 | 번호(105) 일치 but dex# 불일치: keep=[95] vs candidate=[] | lc-en-tcg-sm12-105 | keep: lc-en-tcg-sm12-105 dex=[95] |
| 876 | og-sm12 | 106 | 번호(106) 일치 but dex# 불일치: keep=[299] vs candidate=[] | lc-en-tcg-sm12-106 | keep: lc-en-tcg-sm12-106 dex=[299] |
| 877 | og-sm12 | 110 | 번호(110) 일치 but dex# 불일치: keep=[330] vs candidate=[] | lc-en-tcg-sm12-110 | keep: lc-en-tcg-sm12-110 dex=[330] |
| 878 | og-sm12 | 114 | 번호(114) 일치 but dex# 불일치: keep=[529] vs candidate=[] | lc-en-tcg-sm12-114 | keep: lc-en-tcg-sm12-114 dex=[529] |
| 879 | og-sm1s | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-sm1-131, lc-en-tcg-sm1-132, lc-en-tcg-sm1-133 ... (+308) | EN sets: en-tcg-sm1, JP sets: jp-tcg-SM1S, KR sets: kr-sma,kr-sme,kr-sm1s,kr-sm30a |
| 880 | og-sm2k | 3 | 번호(3) 일치 but dex# 불일치: keep=[71] vs candidate=[] | lc-en-tcg-sm2-003 | keep: lc-en-tcg-sm2-003 dex=[71] |
| 881 | og-sm2k | 2 | 번호(2) 일치 but dex# 불일치: keep=[70] vs candidate=[] | lc-en-tcg-sm2-002 | keep: lc-en-tcg-sm2-002 dex=[70] |
| 882 | og-sm2k | 6 | 번호(6) 일치 but dex# 불일치: keep=[708] vs candidate=[] | lc-en-tcg-sm2-006 | keep: lc-en-tcg-sm2-006 dex=[708] |
| 883 | og-sm2k | 7 | 번호(7) 일치 but dex# 불일치: keep=[709] vs candidate=[] | lc-en-tcg-sm2-007 | keep: lc-en-tcg-sm2-007 dex=[709] |
| 884 | og-sm2k | 8 | 번호(8) 일치 but dex# 불일치: keep=[767] vs candidate=[] | lc-en-tcg-sm2-008 | keep: lc-en-tcg-sm2-008 dex=[767] |
| 885 | og-sm2k | 9 | 번호(9) 일치 but dex# 불일치: keep=[768] vs candidate=[] | lc-en-tcg-sm2-009 | keep: lc-en-tcg-sm2-009 dex=[768] |
| 886 | og-sm2k | 10 | 번호(10) 일치 but dex# 불일치: keep=[494] vs candidate=[] | lc-en-tcg-sm2-010 | keep: lc-en-tcg-sm2-010 dex=[494] |
| 887 | og-sm2k | 11 | 번호(11) 일치 but dex# 불일치: keep=[607] vs candidate=[] | lc-en-tcg-sm2-011 | keep: lc-en-tcg-sm2-011 dex=[607] |
| 888 | og-sm2k | 12 | 번호(12) 일치 but dex# 불일치: keep=[608] vs candidate=[] | lc-en-tcg-sm2-012 | keep: lc-en-tcg-sm2-012 dex=[608] |
| 889 | og-sm2k | 13 | 번호(13) 일치 but dex# 불일치: keep=[609] vs candidate=[] | lc-en-tcg-sm2-013 | keep: lc-en-tcg-sm2-013 dex=[609] |
| 890 | og-sm2k | 31 | 번호(31) 일치 but dex# 불일치: keep=[361] vs candidate=[] | lc-en-tcg-sm2-031 | keep: lc-en-tcg-sm2-031 dex=[361] |
| 891 | og-sm2k | 15 | 번호(15) 일치 but dex# 불일치: keep=[757] vs candidate=[] | lc-en-tcg-sm2-015 | keep: lc-en-tcg-sm2-015 dex=[757] |
| 892 | og-sm2k | 16 | 번호(16) 일치 but dex# 불일치: keep=[758] vs candidate=[] | lc-en-tcg-sm2-016 | keep: lc-en-tcg-sm2-016 dex=[758] |
| 893 | og-sm2k | 17 | 번호(17) 일치 but dex# 불일치: keep=[776] vs candidate=[] | lc-en-tcg-sm2-017 | keep: lc-en-tcg-sm2-017 dex=[776] |
| 894 | og-sm2k | 19 | 번호(19) 일치 but dex# 불일치: keep=[27] vs candidate=[] | lc-en-tcg-sm2-019 | keep: lc-en-tcg-sm2-019 dex=[27] |
| 895 | og-sm2k | 20 | 번호(20) 일치 but dex# 불일치: keep=[28] vs candidate=[] | lc-en-tcg-sm2-020 | keep: lc-en-tcg-sm2-020 dex=[28] |
| 896 | og-sm2k | 21 | 번호(21) 일치 but dex# 불일치: keep=[37] vs candidate=[] | lc-en-tcg-sm2-021 | keep: lc-en-tcg-sm2-021 dex=[37] |
| 897 | og-sm2k | 23 | 번호(23) 일치 but dex# 불일치: keep=[72] vs candidate=[] | lc-en-tcg-sm2-023 | keep: lc-en-tcg-sm2-023 dex=[72] |
| 898 | og-sm2k | 24 | 번호(24) 일치 but dex# 불일치: keep=[73] vs candidate=[] | lc-en-tcg-sm2-024 | keep: lc-en-tcg-sm2-024 dex=[73] |
| 899 | og-sm2k | 25 | 번호(25) 일치 but dex# 불일치: keep=[186] vs candidate=[] | lc-en-tcg-sm2-025 | keep: lc-en-tcg-sm2-025 dex=[186] |
| 900 | og-sm2k | 26 | 번호(26) 일치 but dex# 불일치: keep=[225] vs candidate=[] | lc-en-tcg-sm2-026 | keep: lc-en-tcg-sm2-026 dex=[225] |
| 901 | og-sm2k | 27 | 번호(27) 일치 but dex# 불일치: keep=[318] vs candidate=[] | lc-en-tcg-sm2-027 | keep: lc-en-tcg-sm2-027 dex=[318] |
| 902 | og-sm2k | 29 | 번호(29) 일치 but dex# 불일치: keep=[320] vs candidate=[] | lc-en-tcg-sm2-029 | keep: lc-en-tcg-sm2-029 dex=[320] |
| 903 | og-sm2k | 30 | 번호(30) 일치 but dex# 불일치: keep=[321] vs candidate=[] | lc-en-tcg-sm2-030 | keep: lc-en-tcg-sm2-030 dex=[321] |
| 904 | og-sm2k | 32 | 번호(32) 일치 but dex# 불일치: keep=[362] vs candidate=[] | lc-en-tcg-sm2-032 | keep: lc-en-tcg-sm2-032 dex=[362] |
| 905 | og-sm2k | 33 | 번호(33) 일치 but dex# 불일치: keep=[582] vs candidate=[] | lc-en-tcg-sm2-033 | keep: lc-en-tcg-sm2-033 dex=[582] |
| 906 | og-sm2k | 34 | 번호(34) 일치 but dex# 불일치: keep=[583] vs candidate=[] | lc-en-tcg-sm2-034 | keep: lc-en-tcg-sm2-034 dex=[583] |
| 907 | og-sm2k | 35 | 번호(35) 일치 but dex# 불일치: keep=[584] vs candidate=[] | lc-en-tcg-sm2-035 | keep: lc-en-tcg-sm2-035 dex=[584] |
| 908 | og-sm2k | 36 | 번호(36) 일치 but dex# 불일치: keep=[594] vs candidate=[] | lc-en-tcg-sm2-036 | keep: lc-en-tcg-sm2-036 dex=[594] |
| 909 | og-sm2k | 38 | 번호(38) 일치 but dex# 불일치: keep=[746] vs candidate=[] | lc-en-tcg-sm2-038 | keep: lc-en-tcg-sm2-038 dex=[746] |
| 910 | og-sm2k | 39 | 번호(39) 일치 but dex# 불일치: keep=[747] vs candidate=[] | lc-en-tcg-sm2-039 | keep: lc-en-tcg-sm2-039 dex=[747] |
| 911 | og-sm2k | 40 | 번호(40) 일치 but dex# 불일치: keep=[74] vs candidate=[] | lc-en-tcg-sm2-040 | keep: lc-en-tcg-sm2-040 dex=[74] |
| 912 | og-sm2k | 42 | 번호(42) 일치 but dex# 불일치: keep=[76] vs candidate=[] | lc-en-tcg-sm2-042 | keep: lc-en-tcg-sm2-042 dex=[76] |
| 913 | og-sm2k | 43 | 번호(43) 일치 but dex# 불일치: keep=[694] vs candidate=[] | lc-en-tcg-sm2-043 | keep: lc-en-tcg-sm2-043 dex=[694] |
| 914 | og-sm2k | 44 | 번호(44) 일치 but dex# 불일치: keep=[695] vs candidate=[] | lc-en-tcg-sm2-044 | keep: lc-en-tcg-sm2-044 dex=[695] |
| 915 | og-sm2k | 45 | 번호(45) 일치 but dex# 불일치: keep=[738] vs candidate=[] | lc-en-tcg-sm2-045 | keep: lc-en-tcg-sm2-045 dex=[738] |
| 916 | og-sm2k | 46 | 번호(46) 일치 but dex# 불일치: keep=[741] vs candidate=[] | lc-en-tcg-sm2-046 | keep: lc-en-tcg-sm2-046 dex=[741] |
| 917 | og-sm2k | 48 | 번호(48) 일치 but dex# 불일치: keep=[79] vs candidate=[] | lc-en-tcg-sm2-048 | keep: lc-en-tcg-sm2-048 dex=[79] |
| 918 | og-sm2k | 50 | 번호(50) 일치 but dex# 불일치: keep=[568] vs candidate=[] | lc-en-tcg-sm2-050 | keep: lc-en-tcg-sm2-050 dex=[568] |
| 919 | og-sm2k | 51 | 번호(51) 일치 but dex# 불일치: keep=[569] vs candidate=[] | lc-en-tcg-sm2-051 | keep: lc-en-tcg-sm2-051 dex=[569] |
| 920 | og-sm2k | 52 | 번호(52) 일치 but dex# 불일치: keep=[574] vs candidate=[] | lc-en-tcg-sm2-052 | keep: lc-en-tcg-sm2-052 dex=[574] |
| 921 | og-sm2k | 53 | 번호(53) 일치 but dex# 불일치: keep=[575] vs candidate=[] | lc-en-tcg-sm2-053 | keep: lc-en-tcg-sm2-053 dex=[575] |
| 922 | og-sm2k | 54 | 번호(54) 일치 but dex# 불일치: keep=[576] vs candidate=[] | lc-en-tcg-sm2-054 | keep: lc-en-tcg-sm2-054 dex=[576] |
| 923 | og-sm2k | 55 | 번호(55) 일치 but dex# 불일치: keep=[741] vs candidate=[] | lc-en-tcg-sm2-055 | keep: lc-en-tcg-sm2-055 dex=[741] |
| 924 | og-sm2k | 56 | 번호(56) 일치 but dex# 불일치: keep=[741] vs candidate=[] | lc-en-tcg-sm2-056 | keep: lc-en-tcg-sm2-056 dex=[741] |
| 925 | og-sm2k | 58 | 번호(58) 일치 but dex# 불일치: keep=[778] vs candidate=[] | lc-en-tcg-sm2-058 | keep: lc-en-tcg-sm2-058 dex=[778] |
| 926 | og-sm2k | 59 | 번호(59) 일치 but dex# 불일치: keep=[781] vs candidate=[] | lc-en-tcg-sm2-059 | keep: lc-en-tcg-sm2-059 dex=[781] |
| 927 | og-sm2k | 60 | 번호(60) 일치 but dex# 불일치: keep=[786] vs candidate=[] | lc-en-tcg-sm2-060 | keep: lc-en-tcg-sm2-060 dex=[786] |
| 928 | og-sm2k | 61 | 번호(61) 일치 but dex# 불일치: keep=[792] vs candidate=[] | lc-en-tcg-sm2-061 | keep: lc-en-tcg-sm2-061 dex=[792] |
| 929 | og-sm2k | 62 | 번호(62) 일치 but dex# 불일치: keep=[66] vs candidate=[] | lc-en-tcg-sm2-062 | keep: lc-en-tcg-sm2-062 dex=[66] |
| 930 | og-sm2k | 1 | 번호(1) 일치 but dex# 불일치: keep=[69] vs candidate=[] | lc-en-tcg-sm2-001 | keep: lc-en-tcg-sm2-001 dex=[69] |
| 931 | og-sm2k | 4 | 번호(4) 일치 but dex# 불일치: keep=[548] vs candidate=[] | lc-en-tcg-sm2-004 | keep: lc-en-tcg-sm2-004 dex=[548] |
| 932 | og-sm2k | 5 | 번호(5) 일치 but dex# 불일치: keep=[549] vs candidate=[] | lc-en-tcg-sm2-005 | keep: lc-en-tcg-sm2-005 dex=[549] |
| 933 | og-sm2k | 14 | 번호(14) 일치 but dex# 불일치: keep=[741] vs candidate=[] | lc-en-tcg-sm2-014 | keep: lc-en-tcg-sm2-014 dex=[741] |
| 934 | og-sm2k | 18 | 번호(18) 일치 but dex# 불일치: keep=[776] vs candidate=[] | lc-en-tcg-sm2-018 | keep: lc-en-tcg-sm2-018 dex=[776] |
| 935 | og-sm2k | 22 | 번호(22) 일치 but dex# 불일치: keep=[38] vs candidate=[] | lc-en-tcg-sm2-022 | keep: lc-en-tcg-sm2-022 dex=[38] |
| 936 | og-sm2k | 41 | 번호(41) 일치 but dex# 불일치: keep=[75] vs candidate=[] | lc-en-tcg-sm2-041 | keep: lc-en-tcg-sm2-041 dex=[75] |
| 937 | og-sm2k | 47 | 번호(47) 일치 but dex# 불일치: keep=[785] vs candidate=[] | lc-en-tcg-sm2-047 | keep: lc-en-tcg-sm2-047 dex=[785] |
| 938 | og-sm2k | 49 | 번호(49) 일치 but dex# 불일치: keep=[80] vs candidate=[] | lc-en-tcg-sm2-049 | keep: lc-en-tcg-sm2-049 dex=[80] |
| 939 | og-sm2k | 57 | 번호(57) 일치 but dex# 불일치: keep=[748] vs candidate=[] | lc-en-tcg-sm2-057 | keep: lc-en-tcg-sm2-057 dex=[748] |
| 940 | og-sm2k | 28 | 번호(28) 일치 but dex# 불일치: keep=[319] vs candidate=[] | lc-en-tcg-sm2-028 | keep: lc-en-tcg-sm2-028 dex=[319] |
| 941 | og-sm2k | 37 | 번호(37) 일치 but dex# 불일치: keep=[746] vs candidate=[] | lc-en-tcg-sm2-037 | keep: lc-en-tcg-sm2-037 dex=[746] |
| 942 | og-sm3+ | 4 | 번호(4) 일치 but dex# 불일치: keep=[285] vs candidate=[] | lc-en-tcg-sm35-004 | keep: lc-en-tcg-sm35-004 dex=[285] |
| 943 | og-sm3+ | 5 | 번호(5) 일치 but dex# 불일치: keep=[286] vs candidate=[] | lc-en-tcg-sm35-005 | keep: lc-en-tcg-sm35-005 dex=[286] |
| 944 | og-sm3+ | 6 | 번호(6) 일치 but dex# 불일치: keep=[455] vs candidate=[] | lc-en-tcg-sm35-006 | keep: lc-en-tcg-sm35-006 dex=[455] |
| 945 | og-sm3+ | 7 | 번호(7) 일치 but dex# 불일치: keep=[492] vs candidate=[] | lc-en-tcg-sm35-007 | keep: lc-en-tcg-sm35-007 dex=[492] |
| 946 | og-sm3+ | 8 | 번호(8) 일치 but dex# 불일치: keep=[640] vs candidate=[] | lc-en-tcg-sm35-008 | keep: lc-en-tcg-sm35-008 dex=[640] |
| 947 | og-sm3+ | 9 | 번호(9) 일치 but dex# 불일치: keep=[649] vs candidate=[] | lc-en-tcg-sm35-009 | keep: lc-en-tcg-sm35-009 dex=[649] |
| 948 | og-sm3+ | 11 | 번호(11) 일치 but dex# 불일치: keep=[324] vs candidate=[] | lc-en-tcg-sm35-011 | keep: lc-en-tcg-sm35-011 dex=[324] |
| 949 | og-sm3+ | 14 | 번호(14) 일치 but dex# 불일치: keep=[643] vs candidate=[] | lc-en-tcg-sm35-014 | keep: lc-en-tcg-sm35-014 dex=[643] |
| 950 | og-sm3+ | 15 | 번호(15) 일치 but dex# 불일치: keep=[725] vs candidate=[] | lc-en-tcg-sm35-015 | keep: lc-en-tcg-sm35-015 dex=[725] |
| 951 | og-sm3+ | 16 | 번호(16) 일치 but dex# 불일치: keep=[726] vs candidate=[] | lc-en-tcg-sm35-016 | keep: lc-en-tcg-sm35-016 dex=[726] |
| 952 | og-sm3+ | 18 | 번호(18) 일치 but dex# 불일치: keep=[158] vs candidate=[] | lc-en-tcg-sm35-018 | keep: lc-en-tcg-sm35-018 dex=[158] |
| 953 | og-sm3+ | 19 | 번호(19) 일치 but dex# 불일치: keep=[159] vs candidate=[] | lc-en-tcg-sm35-019 | keep: lc-en-tcg-sm35-019 dex=[159] |
| 954 | og-sm3+ | 20 | 번호(20) 일치 but dex# 불일치: keep=[160] vs candidate=[] | lc-en-tcg-sm35-020 | keep: lc-en-tcg-sm35-020 dex=[160] |
| 955 | og-sm3+ | 21 | 번호(21) 일치 but dex# 불일치: keep=[211] vs candidate=[] | lc-en-tcg-sm35-021 | keep: lc-en-tcg-sm35-021 dex=[211] |
| 956 | og-sm3+ | 22 | 번호(22) 일치 but dex# 불일치: keep=[418] vs candidate=[] | lc-en-tcg-sm35-022 | keep: lc-en-tcg-sm35-022 dex=[418] |
| 957 | og-sm3+ | 25 | 번호(25) 일치 but dex# 불일치: keep=[490] vs candidate=[] | lc-en-tcg-sm35-025 | keep: lc-en-tcg-sm35-025 dex=[490] |
| 958 | og-sm3+ | 26 | 번호(26) 일치 but dex# 불일치: keep=[647] vs candidate=[] | lc-en-tcg-sm35-026 | keep: lc-en-tcg-sm35-026 dex=[647] |
| 959 | og-sm3+ | 27 | 번호(27) 일치 but dex# 불일치: keep=[721] vs candidate=[] | lc-en-tcg-sm35-027 | keep: lc-en-tcg-sm35-027 dex=[721] |
| 960 | og-sm3+ | 28 | 번호(28) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-en-tcg-sm35-028 | keep: lc-en-tcg-sm35-028 dex=[25] |
| 961 | og-sm3+ | 29 | 번호(29) 일치 but dex# 불일치: keep=[26] vs candidate=[] | lc-en-tcg-sm35-029 | keep: lc-en-tcg-sm35-029 dex=[26] |
| 962 | og-sm3+ | 30 | 번호(30) 일치 but dex# 불일치: keep=[100] vs candidate=[] | lc-en-tcg-sm35-030 | keep: lc-en-tcg-sm35-030 dex=[100] |
| 963 | og-sm3+ | 31 | 번호(31) 일치 but dex# 불일치: keep=[101] vs candidate=[] | lc-en-tcg-sm35-031 | keep: lc-en-tcg-sm35-031 dex=[101] |
| 964 | og-sm3+ | 32 | 번호(32) 일치 but dex# 불일치: keep=[243] vs candidate=[] | lc-en-tcg-sm35-032 | keep: lc-en-tcg-sm35-032 dex=[243] |
| 965 | og-sm3+ | 35 | 번호(35) 일치 but dex# 불일치: keep=[644] vs candidate=[] | lc-en-tcg-sm35-035 | keep: lc-en-tcg-sm35-035 dex=[644] |
| 966 | og-sm3+ | 36 | 번호(36) 일치 but dex# 불일치: keep=[23] vs candidate=[] | lc-en-tcg-sm35-036 | keep: lc-en-tcg-sm35-036 dex=[23] |
| 967 | og-sm3+ | 37 | 번호(37) 일치 but dex# 불일치: keep=[24] vs candidate=[] | lc-en-tcg-sm35-037 | keep: lc-en-tcg-sm35-037 dex=[24] |
| 968 | og-sm3+ | 38 | 번호(38) 일치 but dex# 불일치: keep=[124] vs candidate=[] | lc-en-tcg-sm35-038 | keep: lc-en-tcg-sm35-038 dex=[124] |
| 969 | og-sm3+ | 39 | 번호(39) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-en-tcg-sm35-039 | keep: lc-en-tcg-sm35-039 dex=[150] |
| 970 | og-sm3+ | 40 | 번호(40) 일치 but dex# 불일치: keep=[151] vs candidate=[] | lc-en-tcg-sm35-040 | keep: lc-en-tcg-sm35-040 dex=[151] |
| 971 | og-sm3+ | 41 | 번호(41) 일치 but dex# 불일치: keep=[381] vs candidate=[] | lc-en-tcg-sm35-041 | keep: lc-en-tcg-sm35-041 dex=[381] |
| 972 | og-sm3+ | 42 | 번호(42) 일치 but dex# 불일치: keep=[385] vs candidate=[] | lc-en-tcg-sm35-042 | keep: lc-en-tcg-sm35-042 dex=[385] |
| 973 | og-sm3+ | 45 | 번호(45) 일치 but dex# 불일치: keep=[802] vs candidate=[] | lc-en-tcg-sm35-045 | keep: lc-en-tcg-sm35-045 dex=[802] |
| 974 | og-sm3+ | 46 | 번호(46) 일치 but dex# 불일치: keep=[618] vs candidate=[] | lc-en-tcg-sm35-046 | keep: lc-en-tcg-sm35-046 dex=[618] |
| 975 | og-sm3+ | 47 | 번호(47) 일치 but dex# 불일치: keep=[442] vs candidate=[] | lc-en-tcg-sm35-047 | keep: lc-en-tcg-sm35-047 dex=[442] |
| 976 | og-sm3+ | 48 | 번호(48) 일치 but dex# 불일치: keep=[509] vs candidate=[] | lc-en-tcg-sm35-048 | keep: lc-en-tcg-sm35-048 dex=[509] |
| 977 | og-sm3+ | 49 | 번호(49) 일치 but dex# 불일치: keep=[510] vs candidate=[] | lc-en-tcg-sm35-049 | keep: lc-en-tcg-sm35-049 dex=[510] |
| 978 | og-sm3+ | 50 | 번호(50) 일치 but dex# 불일치: keep=[559] vs candidate=[] | lc-en-tcg-sm35-050 | keep: lc-en-tcg-sm35-050 dex=[559] |
| 979 | og-sm3+ | 51 | 번호(51) 일치 but dex# 불일치: keep=[560] vs candidate=[] | lc-en-tcg-sm35-051 | keep: lc-en-tcg-sm35-051 dex=[560] |
| 980 | og-sm3+ | 52 | 번호(52) 일치 but dex# 불일치: keep=[570] vs candidate=[] | lc-en-tcg-sm35-052 | keep: lc-en-tcg-sm35-052 dex=[570] |
| 981 | og-sm3+ | 54 | 번호(54) 일치 but dex# 불일치: keep=[717] vs candidate=[] | lc-en-tcg-sm35-054 | keep: lc-en-tcg-sm35-054 dex=[717] |
| 982 | og-sm3+ | 55 | 번호(55) 일치 but dex# 불일치: keep=[720] vs candidate=[] | lc-en-tcg-sm35-055 | keep: lc-en-tcg-sm35-055 dex=[720] |
| 983 | og-sm3+ | 56 | 번호(56) 일치 but dex# 불일치: keep=[384] vs candidate=[] | lc-en-tcg-sm35-056 | keep: lc-en-tcg-sm35-056 dex=[384] |
| 984 | og-sm3+ | 57 | 번호(57) 일치 but dex# 불일치: keep=[493] vs candidate=[] | lc-en-tcg-sm35-057 | keep: lc-en-tcg-sm35-057 dex=[493] |
| 985 | og-sm3+ | 72 | 번호(72) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-en-tcg-sm35-072 | keep: lc-en-tcg-sm35-072 dex=[150] |
| 986 | og-sm3+ | 74 | 번호(74) 일치 but dex# 불일치: keep=[244] vs candidate=[] | lc-en-tcg-sm35-074 | keep: lc-en-tcg-sm35-074 dex=[244] |
| 987 | og-sm3+ | 75 | 번호(75) 일치 but dex# 불일치: keep=[26] vs candidate=[] | lc-en-tcg-sm35-075 | keep: lc-en-tcg-sm35-075 dex=[26] |
| 988 | og-sm3+ | 76 | 번호(76) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-en-tcg-sm35-076 | keep: lc-en-tcg-sm35-076 dex=[150] |
| 989 | og-sm3+ | 77 | 번호(77) 일치 but dex# 불일치: keep=[571] vs candidate=[] | lc-en-tcg-sm35-077 | keep: lc-en-tcg-sm35-077 dex=[571] |
| 990 | og-sm3+ | 78 | 번호(78) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-en-tcg-sm35-078 | keep: lc-en-tcg-sm35-078 dex=[150] |
| 991 | og-sm3+ | 12 | 번호(12) 일치 but dex# 불일치: keep=[636] vs candidate=[] | lc-en-tcg-sm35-012 | keep: lc-en-tcg-sm35-012 dex=[636] |
| 992 | og-sm3+ | 33 | 번호(33) 일치 but dex# 불일치: keep=[311] vs candidate=[] | lc-en-tcg-sm35-033 | keep: lc-en-tcg-sm35-033 dex=[311] |
| 993 | og-sm3+ | 1 | 번호(1) 일치 but dex# 불일치: keep=[1] vs candidate=[] | lc-en-tcg-sm35-001 | keep: lc-en-tcg-sm35-001 dex=[1] |
| 994 | og-sm3+ | 2 | 번호(2) 일치 but dex# 불일치: keep=[2] vs candidate=[] | lc-en-tcg-sm35-002 | keep: lc-en-tcg-sm35-002 dex=[2] |
| 995 | og-sm3+ | 3 | 번호(3) 일치 but dex# 불일치: keep=[3] vs candidate=[] | lc-en-tcg-sm35-003 | keep: lc-en-tcg-sm35-003 dex=[3] |
| 996 | og-sm3+ | 10 | 번호(10) 일치 but dex# 불일치: keep=[244] vs candidate=[] | lc-en-tcg-sm35-010 | keep: lc-en-tcg-sm35-010 dex=[244] |
| 997 | og-sm3+ | 13 | 번호(13) 일치 but dex# 불일치: keep=[637] vs candidate=[] | lc-en-tcg-sm35-013 | keep: lc-en-tcg-sm35-013 dex=[637] |
| 998 | og-sm3+ | 17 | 번호(17) 일치 but dex# 불일치: keep=[727] vs candidate=[] | lc-en-tcg-sm35-017 | keep: lc-en-tcg-sm35-017 dex=[727] |
| 999 | og-sm3+ | 23 | 번호(23) 일치 but dex# 불일치: keep=[419] vs candidate=[] | lc-en-tcg-sm35-023 | keep: lc-en-tcg-sm35-023 dex=[419] |
| 1000 | og-sm3+ | 24 | 번호(24) 일치 but dex# 불일치: keep=[484] vs candidate=[] | lc-en-tcg-sm35-024 | keep: lc-en-tcg-sm35-024 dex=[484] |
| 1001 | og-sm3+ | 34 | 번호(34) 일치 but dex# 불일치: keep=[312] vs candidate=[] | lc-en-tcg-sm35-034 | keep: lc-en-tcg-sm35-034 dex=[312] |
| 1002 | og-sm3+ | 43 | 번호(43) 일치 but dex# 불일치: keep=[622] vs candidate=[] | lc-en-tcg-sm35-043 | keep: lc-en-tcg-sm35-043 dex=[622] |
| 1003 | og-sm3+ | 44 | 번호(44) 일치 but dex# 불일치: keep=[623] vs candidate=[] | lc-en-tcg-sm35-044 | keep: lc-en-tcg-sm35-044 dex=[623] |
| 1004 | og-sm3+ | 53 | 번호(53) 일치 but dex# 불일치: keep=[571] vs candidate=[] | lc-en-tcg-sm35-053 | keep: lc-en-tcg-sm35-053 dex=[571] |
| 1005 | og-sm3+ | 71 | 번호(71) 일치 but dex# 불일치: keep=[244] vs candidate=[] | lc-en-tcg-sm35-071 | keep: lc-en-tcg-sm35-071 dex=[244] |
| 1006 | og-sm3h | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-sm3-114, lc-en-tcg-sm3-115, lc-en-tcg-sm3-116 ... (+287) | EN sets: en-tcg-sm3, JP sets: jp-tcg-SM3H, KR sets: kr-sm3h,kr-sm60a,kr-smc,kr-smi |
| 1007 | og-sm4s | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-sm4-099, lc-en-tcg-sm4-100, lc-en-tcg-sm4-123 ... (+238) | EN sets: en-tcg-sm4, JP sets: jp-tcg-SM4S, KR sets: kr-sm4s,kr-sm60b |
| 1008 | og-sm5s | 60 | 번호(60) 일치 but dex# 불일치: keep=[789] vs candidate=[] | lc-en-tcg-sm5-060 | keep: lc-en-tcg-sm5-060 dex=[789] |
| 1009 | og-sm5s | 1 | 번호(1) 일치 but dex# 불일치: keep=[102] vs candidate=[] | lc-en-tcg-sm5-001 | keep: lc-en-tcg-sm5-001 dex=[102] |
| 1010 | og-sm5s | 21 | 번호(21) 일치 but dex# 불일치: keep=[390] vs candidate=[] | lc-en-tcg-sm5-021 | keep: lc-en-tcg-sm5-021 dex=[390] |
| 1011 | og-sm5s | 3 | 번호(3) 일치 but dex# 불일치: keep=[469] vs candidate=[] | lc-en-tcg-sm5-003 | keep: lc-en-tcg-sm5-003 dex=[469] |
| 1012 | og-sm5s | 4 | 번호(4) 일치 but dex# 불일치: keep=[315] vs candidate=[] | lc-en-tcg-sm5-004 | keep: lc-en-tcg-sm5-004 dex=[315] |
| 1013 | og-sm5s | 5 | 번호(5) 일치 but dex# 불일치: keep=[407] vs candidate=[] | lc-en-tcg-sm5-005 | keep: lc-en-tcg-sm5-005 dex=[407] |
| 1014 | og-sm5s | 6 | 번호(6) 일치 but dex# 불일치: keep=[387] vs candidate=[] | lc-en-tcg-sm5-006 | keep: lc-en-tcg-sm5-006 dex=[387] |
| 1015 | og-sm5s | 7 | 번호(7) 일치 but dex# 불일치: keep=[387] vs candidate=[] | lc-en-tcg-sm5-007 | keep: lc-en-tcg-sm5-007 dex=[387] |
| 1016 | og-sm5s | 8 | 번호(8) 일치 but dex# 불일치: keep=[388] vs candidate=[] | lc-en-tcg-sm5-008 | keep: lc-en-tcg-sm5-008 dex=[388] |
| 1017 | og-sm5s | 9 | 번호(9) 일치 but dex# 불일치: keep=[389] vs candidate=[] | lc-en-tcg-sm5-009 | keep: lc-en-tcg-sm5-009 dex=[389] |
| 1018 | og-sm5s | 10 | 번호(10) 일치 but dex# 불일치: keep=[420] vs candidate=[] | lc-en-tcg-sm5-010 | keep: lc-en-tcg-sm5-010 dex=[420] |
| 1019 | og-sm5s | 11 | 번호(11) 일치 but dex# 불일치: keep=[421] vs candidate=[] | lc-en-tcg-sm5-011 | keep: lc-en-tcg-sm5-011 dex=[421] |
| 1020 | og-sm5s | 12 | 번호(12) 일치 but dex# 불일치: keep=[455] vs candidate=[] | lc-en-tcg-sm5-012 | keep: lc-en-tcg-sm5-012 dex=[455] |
| 1021 | og-sm5s | 14 | 번호(14) 일치 but dex# 불일치: keep=[479] vs candidate=[] | lc-en-tcg-sm5-014 | keep: lc-en-tcg-sm5-014 dex=[479] |
| 1022 | og-sm5s | 15 | 번호(15) 일치 but dex# 불일치: keep=[492] vs candidate=[] | lc-en-tcg-sm5-015 | keep: lc-en-tcg-sm5-015 dex=[492] |
| 1023 | og-sm5s | 16 | 번호(16) 일치 but dex# 불일치: keep=[751] vs candidate=[] | lc-en-tcg-sm5-016 | keep: lc-en-tcg-sm5-016 dex=[751] |
| 1024 | og-sm5s | 17 | 번호(17) 일치 but dex# 불일치: keep=[752] vs candidate=[] | lc-en-tcg-sm5-017 | keep: lc-en-tcg-sm5-017 dex=[752] |
| 1025 | og-sm5s | 18 | 번호(18) 일치 but dex# 불일치: keep=[126] vs candidate=[] | lc-en-tcg-sm5-018 | keep: lc-en-tcg-sm5-018 dex=[126] |
| 1026 | og-sm5s | 19 | 번호(19) 일치 but dex# 불일치: keep=[467] vs candidate=[] | lc-en-tcg-sm5-019 | keep: lc-en-tcg-sm5-019 dex=[467] |
| 1027 | og-sm5s | 24 | 번호(24) 일치 but dex# 불일치: keep=[479] vs candidate=[] | lc-en-tcg-sm5-024 | keep: lc-en-tcg-sm5-024 dex=[479] |
| 1028 | og-sm5s | 25 | 번호(25) 일치 but dex# 불일치: keep=[757] vs candidate=[] | lc-en-tcg-sm5-025 | keep: lc-en-tcg-sm5-025 dex=[757] |
| 1029 | og-sm5s | 26 | 번호(26) 일치 but dex# 불일치: keep=[758] vs candidate=[] | lc-en-tcg-sm5-026 | keep: lc-en-tcg-sm5-026 dex=[758] |
| 1030 | og-sm5s | 27 | 번호(27) 일치 but dex# 불일치: keep=[776] vs candidate=[] | lc-en-tcg-sm5-027 | keep: lc-en-tcg-sm5-027 dex=[776] |
| 1031 | og-sm5s | 28 | 번호(28) 일치 but dex# 불일치: keep=[27] vs candidate=[] | lc-en-tcg-sm5-028 | keep: lc-en-tcg-sm5-028 dex=[27] |
| 1032 | og-sm5s | 29 | 번호(29) 일치 but dex# 불일치: keep=[28] vs candidate=[] | lc-en-tcg-sm5-029 | keep: lc-en-tcg-sm5-029 dex=[28] |
| 1033 | og-sm5s | 30 | 번호(30) 일치 but dex# 불일치: keep=[37] vs candidate=[] | lc-en-tcg-sm5-030 | keep: lc-en-tcg-sm5-030 dex=[37] |
| 1034 | og-sm5s | 31 | 번호(31) 일치 but dex# 불일치: keep=[393] vs candidate=[] | lc-en-tcg-sm5-031 | keep: lc-en-tcg-sm5-031 dex=[393] |
| 1035 | og-sm5s | 32 | 번호(32) 일치 but dex# 불일치: keep=[393] vs candidate=[] | lc-en-tcg-sm5-032 | keep: lc-en-tcg-sm5-032 dex=[393] |
| 1036 | og-sm5s | 34 | 번호(34) 일치 but dex# 불일치: keep=[395] vs candidate=[] | lc-en-tcg-sm5-034 | keep: lc-en-tcg-sm5-034 dex=[395] |
| 1037 | og-sm5s | 35 | 번호(35) 일치 but dex# 불일치: keep=[418] vs candidate=[] | lc-en-tcg-sm5-035 | keep: lc-en-tcg-sm5-035 dex=[418] |
| 1038 | og-sm5s | 36 | 번호(36) 일치 but dex# 불일치: keep=[419] vs candidate=[] | lc-en-tcg-sm5-036 | keep: lc-en-tcg-sm5-036 dex=[419] |
| 1039 | og-sm5s | 37 | 번호(37) 일치 but dex# 불일치: keep=[459] vs candidate=[] | lc-en-tcg-sm5-037 | keep: lc-en-tcg-sm5-037 dex=[459] |
| 1040 | og-sm5s | 38 | 번호(38) 일치 but dex# 불일치: keep=[460] vs candidate=[] | lc-en-tcg-sm5-038 | keep: lc-en-tcg-sm5-038 dex=[460] |
| 1041 | og-sm5s | 40 | 번호(40) 일치 but dex# 불일치: keep=[479] vs candidate=[] | lc-en-tcg-sm5-040 | keep: lc-en-tcg-sm5-040 dex=[479] |
| 1042 | og-sm5s | 41 | 번호(41) 일치 but dex# 불일치: keep=[479] vs candidate=[] | lc-en-tcg-sm5-041 | keep: lc-en-tcg-sm5-041 dex=[479] |
| 1043 | og-sm5s | 42 | 번호(42) 일치 but dex# 불일치: keep=[490] vs candidate=[] | lc-en-tcg-sm5-042 | keep: lc-en-tcg-sm5-042 dex=[490] |
| 1044 | og-sm5s | 43 | 번호(43) 일치 but dex# 불일치: keep=[125] vs candidate=[] | lc-en-tcg-sm5-043 | keep: lc-en-tcg-sm5-043 dex=[125] |
| 1045 | og-sm5s | 44 | 번호(44) 일치 but dex# 불일치: keep=[466] vs candidate=[] | lc-en-tcg-sm5-044 | keep: lc-en-tcg-sm5-044 dex=[466] |
| 1046 | og-sm5s | 45 | 번호(45) 일치 but dex# 불일치: keep=[403] vs candidate=[] | lc-en-tcg-sm5-045 | keep: lc-en-tcg-sm5-045 dex=[403] |
| 1047 | og-sm5s | 46 | 번호(46) 일치 but dex# 불일치: keep=[403] vs candidate=[] | lc-en-tcg-sm5-046 | keep: lc-en-tcg-sm5-046 dex=[403] |
| 1048 | og-sm5s | 47 | 번호(47) 일치 but dex# 불일치: keep=[404] vs candidate=[] | lc-en-tcg-sm5-047 | keep: lc-en-tcg-sm5-047 dex=[404] |
| 1049 | og-sm5s | 50 | 번호(50) 일치 but dex# 불일치: keep=[479] vs candidate=[] | lc-en-tcg-sm5-050 | keep: lc-en-tcg-sm5-050 dex=[479] |
| 1050 | og-sm5s | 78 | 번호(78) 일치 but dex# 불일치: keep=[50] vs candidate=[] | lc-en-tcg-sm5-078 | keep: lc-en-tcg-sm5-078 dex=[50] |
| 1051 | og-sm5s | 52 | 번호(52) 일치 but dex# 불일치: keep=[426] vs candidate=[] | lc-en-tcg-sm5-052 | keep: lc-en-tcg-sm5-052 dex=[426] |
| 1052 | og-sm5s | 53 | 번호(53) 일치 but dex# 불일치: keep=[442] vs candidate=[] | lc-en-tcg-sm5-053 | keep: lc-en-tcg-sm5-053 dex=[442] |
| 1053 | og-sm5s | 54 | 번호(54) 일치 but dex# 불일치: keep=[451] vs candidate=[] | lc-en-tcg-sm5-054 | keep: lc-en-tcg-sm5-054 dex=[451] |
| 1054 | og-sm5s | 55 | 번호(55) 일치 but dex# 불일치: keep=[452] vs candidate=[] | lc-en-tcg-sm5-055 | keep: lc-en-tcg-sm5-055 dex=[452] |
| 1055 | og-sm5s | 56 | 번호(56) 일치 but dex# 불일치: keep=[453] vs candidate=[] | lc-en-tcg-sm5-056 | keep: lc-en-tcg-sm5-056 dex=[453] |
| 1056 | og-sm5s | 57 | 번호(57) 일치 but dex# 불일치: keep=[454] vs candidate=[] | lc-en-tcg-sm5-057 | keep: lc-en-tcg-sm5-057 dex=[454] |
| 1057 | og-sm5s | 58 | 번호(58) 일치 but dex# 불일치: keep=[487] vs candidate=[] | lc-en-tcg-sm5-058 | keep: lc-en-tcg-sm5-058 dex=[487] |
| 1058 | og-sm5s | 59 | 번호(59) 일치 but dex# 불일치: keep=[488] vs candidate=[] | lc-en-tcg-sm5-059 | keep: lc-en-tcg-sm5-059 dex=[488] |
| 1059 | og-sm5s | 63 | 번호(63) 일치 but dex# 불일치: keep=[800] vs candidate=[] | lc-en-tcg-sm5-063 | keep: lc-en-tcg-sm5-063 dex=[800] |
| 1060 | og-sm5s | 64 | 번호(64) 일치 but dex# 불일치: keep=[408] vs candidate=[] | lc-en-tcg-sm5-064 | keep: lc-en-tcg-sm5-064 dex=[408] |
| 1061 | og-sm5s | 65 | 번호(65) 일치 but dex# 불일치: keep=[409] vs candidate=[] | lc-en-tcg-sm5-065 | keep: lc-en-tcg-sm5-065 dex=[409] |
| 1062 | og-sm5s | 66 | 번호(66) 일치 but dex# 불일치: keep=[447] vs candidate=[] | lc-en-tcg-sm5-066 | keep: lc-en-tcg-sm5-066 dex=[447] |
| 1063 | og-sm5s | 67 | 번호(67) 일치 but dex# 불일치: keep=[448] vs candidate=[] | lc-en-tcg-sm5-067 | keep: lc-en-tcg-sm5-067 dex=[448] |
| 1064 | og-sm5s | 68 | 번호(68) 일치 but dex# 불일치: keep=[449] vs candidate=[] | lc-en-tcg-sm5-068 | keep: lc-en-tcg-sm5-068 dex=[449] |
| 1065 | og-sm5s | 70 | 번호(70) 일치 but dex# 불일치: keep=[766] vs candidate=[] | lc-en-tcg-sm5-070 | keep: lc-en-tcg-sm5-070 dex=[766] |
| 1066 | og-sm5s | 71 | 번호(71) 일치 but dex# 불일치: keep=[198] vs candidate=[] | lc-en-tcg-sm5-071 | keep: lc-en-tcg-sm5-071 dex=[198] |
| 1067 | og-sm5s | 72 | 번호(72) 일치 but dex# 불일치: keep=[430] vs candidate=[] | lc-en-tcg-sm5-072 | keep: lc-en-tcg-sm5-072 dex=[430] |
| 1068 | og-sm5s | 74 | 번호(74) 일치 but dex# 불일치: keep=[461] vs candidate=[] | lc-en-tcg-sm5-074 | keep: lc-en-tcg-sm5-074 dex=[461] |
| 1069 | og-sm5s | 75 | 번호(75) 일치 but dex# 불일치: keep=[434] vs candidate=[] | lc-en-tcg-sm5-075 | keep: lc-en-tcg-sm5-075 dex=[434] |
| 1070 | og-sm5s | 76 | 번호(76) 일치 but dex# 불일치: keep=[435] vs candidate=[] | lc-en-tcg-sm5-076 | keep: lc-en-tcg-sm5-076 dex=[435] |
| 1071 | og-sm5s | 20 | 번호(20) 일치 but dex# 불일치: keep=[390] vs candidate=[] | lc-en-tcg-sm5-020 | keep: lc-en-tcg-sm5-020 dex=[390] |
| 1072 | og-sm5s | 48 | 번호(48) 일치 but dex# 불일치: keep=[405] vs candidate=[] | lc-en-tcg-sm5-048 | keep: lc-en-tcg-sm5-048 dex=[405] |
| 1073 | og-sm5s | 51 | 번호(51) 일치 but dex# 불일치: keep=[425] vs candidate=[] | lc-en-tcg-sm5-051 | keep: lc-en-tcg-sm5-051 dex=[425] |
| 1074 | og-sm5s | 61 | 번호(61) 일치 but dex# 불일치: keep=[790] vs candidate=[] | lc-en-tcg-sm5-061 | keep: lc-en-tcg-sm5-061 dex=[790] |
| 1075 | og-sm5s | 22 | 번호(22) 일치 but dex# 불일치: keep=[391] vs candidate=[] | lc-en-tcg-sm5-022 | keep: lc-en-tcg-sm5-022 dex=[391] |
| 1076 | og-sm5s | 2 | 번호(2) 일치 but dex# 불일치: keep=[193] vs candidate=[] | lc-en-tcg-sm5-002 | keep: lc-en-tcg-sm5-002 dex=[193] |
| 1077 | og-sm5s | 13 | 번호(13) 일치 but dex# 불일치: keep=[470] vs candidate=[] | lc-en-tcg-sm5-013 | keep: lc-en-tcg-sm5-013 dex=[470] |
| 1078 | og-sm5s | 23 | 번호(23) 일치 but dex# 불일치: keep=[392] vs candidate=[] | lc-en-tcg-sm5-023 | keep: lc-en-tcg-sm5-023 dex=[392] |
| 1079 | og-sm5s | 33 | 번호(33) 일치 but dex# 불일치: keep=[394] vs candidate=[] | lc-en-tcg-sm5-033 | keep: lc-en-tcg-sm5-033 dex=[394] |
| 1080 | og-sm5s | 39 | 번호(39) 일치 but dex# 불일치: keep=[471] vs candidate=[] | lc-en-tcg-sm5-039 | keep: lc-en-tcg-sm5-039 dex=[471] |
| 1081 | og-sm5s | 49 | 번호(49) 일치 but dex# 불일치: keep=[417] vs candidate=[] | lc-en-tcg-sm5-049 | keep: lc-en-tcg-sm5-049 dex=[417] |
| 1082 | og-sm5s | 62 | 번호(62) 일치 but dex# 불일치: keep=[792] vs candidate=[] | lc-en-tcg-sm5-062 | keep: lc-en-tcg-sm5-062 dex=[792] |
| 1083 | og-sm5s | 69 | 번호(69) 일치 but dex# 불일치: keep=[450] vs candidate=[] | lc-en-tcg-sm5-069 | keep: lc-en-tcg-sm5-069 dex=[450] |
| 1084 | og-sm5s | 73 | 번호(73) 일치 but dex# 불일치: keep=[215] vs candidate=[] | lc-en-tcg-sm5-073 | keep: lc-en-tcg-sm5-073 dex=[215] |
| 1085 | og-sm5s | 77 | 번호(77) 일치 but dex# 불일치: keep=[491] vs candidate=[] | lc-en-tcg-sm5-077 | keep: lc-en-tcg-sm5-077 dex=[491] |
| 1086 | og-sm6 | 10 | 번호(10) 일치 but dex# 불일치: keep=[673] vs candidate=[] | lc-en-tcg-sm6-010 | keep: lc-en-tcg-sm6-010 dex=[673] |
| 1087 | og-sm6 | 1 | 번호(1) 일치 but dex# 불일치: keep=[102] vs candidate=[] | lc-en-tcg-sm6-001 | keep: lc-en-tcg-sm6-001 dex=[102] |
| 1088 | og-sm6 | 2 | 번호(2) 일치 but dex# 불일치: keep=[103] vs candidate=[] | lc-en-tcg-sm6-002 | keep: lc-en-tcg-sm6-002 dex=[103] |
| 1089 | og-sm6 | 3 | 번호(3) 일치 but dex# 불일치: keep=[459] vs candidate=[] | lc-en-tcg-sm6-003 | keep: lc-en-tcg-sm6-003 dex=[459] |
| 1090 | og-sm6 | 4 | 번호(4) 일치 but dex# 불일치: keep=[460] vs candidate=[] | lc-en-tcg-sm6-004 | keep: lc-en-tcg-sm6-004 dex=[460] |
| 1091 | og-sm6 | 5 | 번호(5) 일치 but dex# 불일치: keep=[664] vs candidate=[] | lc-en-tcg-sm6-005 | keep: lc-en-tcg-sm6-005 dex=[664] |
| 1092 | og-sm6 | 6 | 번호(6) 일치 but dex# 불일치: keep=[664] vs candidate=[] | lc-en-tcg-sm6-006 | keep: lc-en-tcg-sm6-006 dex=[664] |
| 1093 | og-sm6 | 7 | 번호(7) 일치 but dex# 불일치: keep=[665] vs candidate=[] | lc-en-tcg-sm6-007 | keep: lc-en-tcg-sm6-007 dex=[665] |
| 1094 | og-sm6 | 8 | 번호(8) 일치 but dex# 불일치: keep=[666] vs candidate=[] | lc-en-tcg-sm6-008 | keep: lc-en-tcg-sm6-008 dex=[666] |
| 1095 | og-sm6 | 9 | 번호(9) 일치 but dex# 불일치: keep=[672] vs candidate=[] | lc-en-tcg-sm6-009 | keep: lc-en-tcg-sm6-009 dex=[672] |
| 1096 | og-sm6 | 13 | 번호(13) 일치 but dex# 불일치: keep=[485] vs candidate=[] | lc-en-tcg-sm6-013 | keep: lc-en-tcg-sm6-013 dex=[485] |
| 1097 | og-sm6 | 14 | 번호(14) 일치 but dex# 불일치: keep=[653] vs candidate=[] | lc-en-tcg-sm6-014 | keep: lc-en-tcg-sm6-014 dex=[653] |
| 1098 | og-sm6 | 15 | 번호(15) 일치 but dex# 불일치: keep=[653] vs candidate=[] | lc-en-tcg-sm6-015 | keep: lc-en-tcg-sm6-015 dex=[653] |
| 1099 | og-sm6 | 16 | 번호(16) 일치 but dex# 불일치: keep=[654] vs candidate=[] | lc-en-tcg-sm6-016 | keep: lc-en-tcg-sm6-016 dex=[654] |
| 1100 | og-sm6 | 17 | 번호(17) 일치 but dex# 불일치: keep=[655] vs candidate=[] | lc-en-tcg-sm6-017 | keep: lc-en-tcg-sm6-017 dex=[655] |
| 1101 | og-sm6 | 18 | 번호(18) 일치 but dex# 불일치: keep=[667] vs candidate=[] | lc-en-tcg-sm6-018 | keep: lc-en-tcg-sm6-018 dex=[667] |
| 1102 | og-sm6 | 20 | 번호(20) 일치 but dex# 불일치: keep=[484] vs candidate=[] | lc-en-tcg-sm6-020 | keep: lc-en-tcg-sm6-020 dex=[484] |
| 1103 | og-sm6 | 23 | 번호(23) 일치 but dex# 불일치: keep=[657] vs candidate=[] | lc-en-tcg-sm6-023 | keep: lc-en-tcg-sm6-023 dex=[657] |
| 1104 | og-sm6 | 25 | 번호(25) 일치 but dex# 불일치: keep=[692] vs candidate=[] | lc-en-tcg-sm6-025 | keep: lc-en-tcg-sm6-025 dex=[692] |
| 1105 | og-sm6 | 26 | 번호(26) 일치 but dex# 불일치: keep=[693] vs candidate=[] | lc-en-tcg-sm6-026 | keep: lc-en-tcg-sm6-026 dex=[693] |
| 1106 | og-sm6 | 27 | 번호(27) 일치 but dex# 불일치: keep=[698] vs candidate=[] | lc-en-tcg-sm6-027 | keep: lc-en-tcg-sm6-027 dex=[698] |
| 1107 | og-sm6 | 28 | 번호(28) 일치 but dex# 불일치: keep=[699] vs candidate=[] | lc-en-tcg-sm6-028 | keep: lc-en-tcg-sm6-028 dex=[699] |
| 1108 | og-sm6 | 29 | 번호(29) 일치 but dex# 불일치: keep=[712] vs candidate=[] | lc-en-tcg-sm6-029 | keep: lc-en-tcg-sm6-029 dex=[712] |
| 1109 | og-sm6 | 30 | 번호(30) 일치 but dex# 불일치: keep=[713] vs candidate=[] | lc-en-tcg-sm6-030 | keep: lc-en-tcg-sm6-030 dex=[713] |
| 1110 | og-sm6 | 32 | 번호(32) 일치 but dex# 불일치: keep=[751] vs candidate=[] | lc-en-tcg-sm6-032 | keep: lc-en-tcg-sm6-032 dex=[751] |
| 1111 | og-sm6 | 33 | 번호(33) 일치 but dex# 불일치: keep=[752] vs candidate=[] | lc-en-tcg-sm6-033 | keep: lc-en-tcg-sm6-033 dex=[752] |
| 1112 | og-sm6 | 34 | 번호(34) 일치 but dex# 불일치: keep=[81] vs candidate=[] | lc-en-tcg-sm6-034 | keep: lc-en-tcg-sm6-034 dex=[81] |
| 1113 | og-sm6 | 35 | 번호(35) 일치 but dex# 불일치: keep=[82] vs candidate=[] | lc-en-tcg-sm6-035 | keep: lc-en-tcg-sm6-035 dex=[82] |
| 1114 | og-sm6 | 36 | 번호(36) 일치 but dex# 불일치: keep=[462] vs candidate=[] | lc-en-tcg-sm6-036 | keep: lc-en-tcg-sm6-036 dex=[462] |
| 1115 | og-sm6 | 37 | 번호(37) 일치 but dex# 불일치: keep=[694] vs candidate=[] | lc-en-tcg-sm6-037 | keep: lc-en-tcg-sm6-037 dex=[694] |
| 1116 | og-sm6 | 38 | 번호(38) 일치 but dex# 불일치: keep=[695] vs candidate=[] | lc-en-tcg-sm6-038 | keep: lc-en-tcg-sm6-038 dex=[695] |
| 1117 | og-sm6 | 39 | 번호(39) 일치 but dex# 불일치: keep=[796] vs candidate=[] | lc-en-tcg-sm6-039 | keep: lc-en-tcg-sm6-039 dex=[796] |
| 1118 | og-sm6 | 41 | 번호(41) 일치 but dex# 불일치: keep=[480] vs candidate=[] | lc-en-tcg-sm6-041 | keep: lc-en-tcg-sm6-041 dex=[480] |
| 1119 | og-sm6 | 42 | 번호(42) 일치 but dex# 불일치: keep=[481] vs candidate=[] | lc-en-tcg-sm6-042 | keep: lc-en-tcg-sm6-042 dex=[481] |
| 1120 | og-sm6 | 43 | 번호(43) 일치 but dex# 불일치: keep=[482] vs candidate=[] | lc-en-tcg-sm6-043 | keep: lc-en-tcg-sm6-043 dex=[482] |
| 1121 | og-sm6 | 44 | 번호(44) 일치 but dex# 불일치: keep=[677] vs candidate=[] | lc-en-tcg-sm6-044 | keep: lc-en-tcg-sm6-044 dex=[677] |
| 1122 | og-sm6 | 46 | 번호(46) 일치 but dex# 불일치: keep=[679] vs candidate=[] | lc-en-tcg-sm6-046 | keep: lc-en-tcg-sm6-046 dex=[679] |
| 1123 | og-sm6 | 47 | 번호(47) 일치 but dex# 불일치: keep=[679] vs candidate=[] | lc-en-tcg-sm6-047 | keep: lc-en-tcg-sm6-047 dex=[679] |
| 1124 | og-sm6 | 48 | 번호(48) 일치 but dex# 불일치: keep=[680] vs candidate=[] | lc-en-tcg-sm6-048 | keep: lc-en-tcg-sm6-048 dex=[680] |
| 1125 | og-sm6 | 49 | 번호(49) 일치 but dex# 불일치: keep=[681] vs candidate=[] | lc-en-tcg-sm6-049 | keep: lc-en-tcg-sm6-049 dex=[681] |
| 1126 | og-sm6 | 51 | 번호(51) 일치 but dex# 불일치: keep=[687] vs candidate=[] | lc-en-tcg-sm6-051 | keep: lc-en-tcg-sm6-051 dex=[687] |
| 1127 | og-sm6 | 52 | 번호(52) 일치 but dex# 불일치: keep=[690] vs candidate=[] | lc-en-tcg-sm6-052 | keep: lc-en-tcg-sm6-052 dex=[690] |
| 1128 | og-sm6 | 53 | 번호(53) 일치 but dex# 불일치: keep=[691] vs candidate=[] | lc-en-tcg-sm6-053 | keep: lc-en-tcg-sm6-053 dex=[691] |
| 1129 | og-sm6 | 54 | 번호(54) 일치 but dex# 불일치: keep=[720] vs candidate=[] | lc-en-tcg-sm6-054 | keep: lc-en-tcg-sm6-054 dex=[720] |
| 1130 | og-sm6 | 55 | 번호(55) 일치 but dex# 불일치: keep=[803] vs candidate=[] | lc-en-tcg-sm6-055 | keep: lc-en-tcg-sm6-055 dex=[803] |
| 1131 | og-sm6 | 57 | 번호(57) 일치 but dex# 불일치: keep=[104] vs candidate=[] | lc-en-tcg-sm6-057 | keep: lc-en-tcg-sm6-057 dex=[104] |
| 1132 | og-sm6 | 58 | 번호(58) 일치 but dex# 불일치: keep=[389] vs candidate=[] | lc-en-tcg-sm6-058 | keep: lc-en-tcg-sm6-058 dex=[389] |
| 1133 | og-sm6 | 59 | 번호(59) 일치 but dex# 불일치: keep=[392] vs candidate=[] | lc-en-tcg-sm6-059 | keep: lc-en-tcg-sm6-059 dex=[392] |
| 1134 | og-sm6 | 60 | 번호(60) 일치 but dex# 불일치: keep=[443] vs candidate=[] | lc-en-tcg-sm6-060 | keep: lc-en-tcg-sm6-060 dex=[443] |
| 1135 | og-sm6 | 61 | 번호(61) 일치 but dex# 불일치: keep=[444] vs candidate=[] | lc-en-tcg-sm6-061 | keep: lc-en-tcg-sm6-061 dex=[444] |
| 1136 | og-sm6 | 63 | 번호(63) 일치 but dex# 불일치: keep=[453] vs candidate=[] | lc-en-tcg-sm6-063 | keep: lc-en-tcg-sm6-063 dex=[453] |
| 1137 | og-sm6 | 64 | 번호(64) 일치 but dex# 불일치: keep=[454] vs candidate=[] | lc-en-tcg-sm6-064 | keep: lc-en-tcg-sm6-064 dex=[454] |
| 1138 | og-sm6 | 65 | 번호(65) 일치 but dex# 불일치: keep=[674] vs candidate=[] | lc-en-tcg-sm6-065 | keep: lc-en-tcg-sm6-065 dex=[674] |
| 1139 | og-sm6 | 66 | 번호(66) 일치 but dex# 불일치: keep=[688] vs candidate=[] | lc-en-tcg-sm6-066 | keep: lc-en-tcg-sm6-066 dex=[688] |
| 1140 | og-sm6 | 67 | 번호(67) 일치 but dex# 불일치: keep=[689] vs candidate=[] | lc-en-tcg-sm6-067 | keep: lc-en-tcg-sm6-067 dex=[689] |
| 1141 | og-sm6 | 68 | 번호(68) 일치 but dex# 불일치: keep=[696] vs candidate=[] | lc-en-tcg-sm6-068 | keep: lc-en-tcg-sm6-068 dex=[696] |
| 1142 | og-sm6 | 70 | 번호(70) 일치 but dex# 불일치: keep=[701] vs candidate=[] | lc-en-tcg-sm6-070 | keep: lc-en-tcg-sm6-070 dex=[701] |
| 1143 | og-sm6 | 71 | 번호(71) 일치 but dex# 불일치: keep=[718] vs candidate=[] | lc-en-tcg-sm6-071 | keep: lc-en-tcg-sm6-071 dex=[718] |
| 1144 | og-sm6 | 72 | 번호(72) 일치 but dex# 불일치: keep=[718] vs candidate=[] | lc-en-tcg-sm6-072 | keep: lc-en-tcg-sm6-072 dex=[718] |
| 1145 | og-sm6 | 74 | 번호(74) 일치 but dex# 불일치: keep=[719] vs candidate=[] | lc-en-tcg-sm6-074 | keep: lc-en-tcg-sm6-074 dex=[719] |
| 1146 | og-sm6 | 75 | 번호(75) 일치 but dex# 불일치: keep=[744] vs candidate=[] | lc-en-tcg-sm6-075 | keep: lc-en-tcg-sm6-075 dex=[744] |
| 1147 | og-sm6 | 76 | 번호(76) 일치 but dex# 불일치: keep=[745] vs candidate=[] | lc-en-tcg-sm6-076 | keep: lc-en-tcg-sm6-076 dex=[745] |
| 1148 | og-sm6 | 78 | 번호(78) 일치 but dex# 불일치: keep=[675] vs candidate=[] | lc-en-tcg-sm6-078 | keep: lc-en-tcg-sm6-078 dex=[675] |
| 1149 | og-sm6 | 80 | 번호(80) 일치 but dex# 불일치: keep=[799] vs candidate=[] | lc-en-tcg-sm6-080 | keep: lc-en-tcg-sm6-080 dex=[799] |
| 1150 | og-sm6 | 81 | 번호(81) 일치 but dex# 불일치: keep=[395] vs candidate=[] | lc-en-tcg-sm6-081 | keep: lc-en-tcg-sm6-081 dex=[395] |
| 1151 | og-sm6 | 82 | 번호(82) 일치 but dex# 불일치: keep=[483] vs candidate=[] | lc-en-tcg-sm6-082 | keep: lc-en-tcg-sm6-082 dex=[483] |
| 1152 | og-sm6 | 83 | 번호(83) 일치 but dex# 불일치: keep=[669] vs candidate=[] | lc-en-tcg-sm6-083 | keep: lc-en-tcg-sm6-083 dex=[669] |
| 1153 | og-sm6 | 84 | 번호(84) 일치 but dex# 불일치: keep=[669] vs candidate=[] | lc-en-tcg-sm6-084 | keep: lc-en-tcg-sm6-084 dex=[669] |
| 1154 | og-sm6 | 86 | 번호(86) 일치 but dex# 불일치: keep=[671] vs candidate=[] | lc-en-tcg-sm6-086 | keep: lc-en-tcg-sm6-086 dex=[671] |
| 1155 | og-sm6 | 87 | 번호(87) 일치 but dex# 불일치: keep=[700] vs candidate=[] | lc-en-tcg-sm6-087 | keep: lc-en-tcg-sm6-087 dex=[700] |
| 1156 | og-sm6 | 88 | 번호(88) 일치 but dex# 불일치: keep=[702] vs candidate=[] | lc-en-tcg-sm6-088 | keep: lc-en-tcg-sm6-088 dex=[702] |
| 1157 | og-sm6 | 89 | 번호(89) 일치 but dex# 불일치: keep=[707] vs candidate=[] | lc-en-tcg-sm6-089 | keep: lc-en-tcg-sm6-089 dex=[707] |
| 1158 | og-sm6 | 91 | 번호(91) 일치 but dex# 불일치: keep=[704] vs candidate=[] | lc-en-tcg-sm6-091 | keep: lc-en-tcg-sm6-091 dex=[704] |
| 1159 | og-sm6 | 92 | 번호(92) 일치 but dex# 불일치: keep=[704] vs candidate=[] | lc-en-tcg-sm6-092 | keep: lc-en-tcg-sm6-092 dex=[704] |
| 1160 | og-sm6 | 93 | 번호(93) 일치 but dex# 불일치: keep=[705] vs candidate=[] | lc-en-tcg-sm6-093 | keep: lc-en-tcg-sm6-093 dex=[705] |
| 1161 | og-sm6 | 94 | 번호(94) 일치 but dex# 불일치: keep=[706] vs candidate=[] | lc-en-tcg-sm6-094 | keep: lc-en-tcg-sm6-094 dex=[706] |
| 1162 | og-sm6 | 96 | 번호(96) 일치 but dex# 불일치: keep=[493] vs candidate=[] | lc-en-tcg-sm6-096 | keep: lc-en-tcg-sm6-096 dex=[493] |
| 1163 | og-sm6 | 97 | 번호(97) 일치 but dex# 불일치: keep=[659] vs candidate=[] | lc-en-tcg-sm6-097 | keep: lc-en-tcg-sm6-097 dex=[659] |
| 1164 | og-sm6 | 98 | 번호(98) 일치 but dex# 불일치: keep=[660] vs candidate=[] | lc-en-tcg-sm6-098 | keep: lc-en-tcg-sm6-098 dex=[660] |
| 1165 | og-sm6 | 99 | 번호(99) 일치 but dex# 불일치: keep=[676] vs candidate=[] | lc-en-tcg-sm6-099 | keep: lc-en-tcg-sm6-099 dex=[676] |
| 1166 | og-sm6 | 100 | 번호(100) 일치 but dex# 불일치: keep=[714] vs candidate=[] | lc-en-tcg-sm6-100 | keep: lc-en-tcg-sm6-100 dex=[714] |
| 1167 | og-sm6 | 101 | 번호(101) 일치 but dex# 불일치: keep=[715] vs candidate=[] | lc-en-tcg-sm6-101 | keep: lc-en-tcg-sm6-101 dex=[715] |
| 1168 | og-sm6 | 11 | 번호(11) 일치 but dex# 불일치: keep=[795] vs candidate=[] | lc-en-tcg-sm6-011 | keep: lc-en-tcg-sm6-011 dex=[795] |
| 1169 | og-sm6 | 22 | 번호(22) 일치 but dex# 불일치: keep=[656] vs candidate=[] | lc-en-tcg-sm6-022 | keep: lc-en-tcg-sm6-022 dex=[656] |
| 1170 | og-sm6 | 21 | 번호(21) 일치 but dex# 불일치: keep=[656] vs candidate=[] | lc-en-tcg-sm6-021 | keep: lc-en-tcg-sm6-021 dex=[656] |
| 1171 | og-sm6 | 12 | 번호(12) 일치 but dex# 불일치: keep=[105] vs candidate=[] | lc-en-tcg-sm6-012 | keep: lc-en-tcg-sm6-012 dex=[105] |
| 1172 | og-sm6 | 19 | 번호(19) 일치 but dex# 불일치: keep=[668] vs candidate=[] | lc-en-tcg-sm6-019 | keep: lc-en-tcg-sm6-019 dex=[668] |
| 1173 | og-sm6 | 24 | 번호(24) 일치 but dex# 불일치: keep=[658] vs candidate=[] | lc-en-tcg-sm6-024 | keep: lc-en-tcg-sm6-024 dex=[658] |
| 1174 | og-sm6 | 31 | 번호(31) 일치 but dex# 불일치: keep=[721] vs candidate=[] | lc-en-tcg-sm6-031 | keep: lc-en-tcg-sm6-031 dex=[721] |
| 1175 | og-sm6 | 40 | 번호(40) 일치 but dex# 불일치: keep=[479] vs candidate=[] | lc-en-tcg-sm6-040 | keep: lc-en-tcg-sm6-040 dex=[479] |
| 1176 | og-sm6 | 45 | 번호(45) 일치 but dex# 불일치: keep=[678] vs candidate=[] | lc-en-tcg-sm6-045 | keep: lc-en-tcg-sm6-045 dex=[678] |
| 1177 | og-sm6 | 50 | 번호(50) 일치 but dex# 불일치: keep=[686] vs candidate=[] | lc-en-tcg-sm6-050 | keep: lc-en-tcg-sm6-050 dex=[686] |
| 1178 | og-sm6 | 56 | 번호(56) 일치 but dex# 불일치: keep=[804] vs candidate=[] | lc-en-tcg-sm6-056 | keep: lc-en-tcg-sm6-056 dex=[804] |
| 1179 | og-sm6 | 69 | 번호(69) 일치 but dex# 불일치: keep=[697] vs candidate=[] | lc-en-tcg-sm6-069 | keep: lc-en-tcg-sm6-069 dex=[697] |
| 1180 | og-sm6 | 73 | 번호(73) 일치 but dex# 불일치: keep=[718] vs candidate=[] | lc-en-tcg-sm6-073 | keep: lc-en-tcg-sm6-073 dex=[718] |
| 1181 | og-sm6 | 77 | 번호(77) 일치 but dex# 불일치: keep=[794] vs candidate=[] | lc-en-tcg-sm6-077 | keep: lc-en-tcg-sm6-077 dex=[794] |
| 1182 | og-sm6 | 79 | 번호(79) 일치 but dex# 불일치: keep=[717] vs candidate=[] | lc-en-tcg-sm6-079 | keep: lc-en-tcg-sm6-079 dex=[717] |
| 1183 | og-sm6 | 85 | 번호(85) 일치 but dex# 불일치: keep=[670] vs candidate=[] | lc-en-tcg-sm6-085 | keep: lc-en-tcg-sm6-085 dex=[670] |
| 1184 | og-sm6 | 90 | 번호(90) 일치 but dex# 불일치: keep=[716] vs candidate=[] | lc-en-tcg-sm6-090 | keep: lc-en-tcg-sm6-090 dex=[716] |
| 1185 | og-sm6 | 95 | 번호(95) 일치 but dex# 불일치: keep=[800] vs candidate=[] | lc-en-tcg-sm6-095 | keep: lc-en-tcg-sm6-095 dex=[800] |
| 1186 | og-sm6 | 62 | 번호(62) 일치 but dex# 불일치: keep=[445] vs candidate=[] | lc-en-tcg-sm6-062 | keep: lc-en-tcg-sm6-062 dex=[445] |
| 1187 | og-sm6a | 2 | 번호(2) 일치 but dex# 불일치: keep=[5] vs candidate=[] | lc-en-tcg-sm75-002 | keep: lc-en-tcg-sm75-002 dex=[5] |
| 1188 | og-sm6a | 1 | 번호(1) 일치 but dex# 불일치: keep=[4] vs candidate=[] | lc-en-tcg-sm75-001 | keep: lc-en-tcg-sm75-001 dex=[4] |
| 1189 | og-sm6a | 3 | 번호(3) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-sm75-003 | keep: lc-en-tcg-sm75-003 dex=[6] |
| 1190 | og-sm6a | 6 | 번호(6) 일치 but dex# 불일치: keep=[257] vs candidate=[] | lc-en-tcg-sm75-006 | keep: lc-en-tcg-sm75-006 dex=[257] |
| 1191 | og-sm6a | 7 | 번호(7) 일치 but dex# 불일치: keep=[494] vs candidate=[] | lc-en-tcg-sm75-007 | keep: lc-en-tcg-sm75-007 dex=[494] |
| 1192 | og-sm6a | 8 | 번호(8) 일치 but dex# 불일치: keep=[554] vs candidate=[] | lc-en-tcg-sm75-008 | keep: lc-en-tcg-sm75-008 dex=[554] |
| 1193 | og-sm6a | 9 | 번호(9) 일치 but dex# 불일치: keep=[555] vs candidate=[] | lc-en-tcg-sm75-009 | keep: lc-en-tcg-sm75-009 dex=[555] |
| 1194 | og-sm6a | 10 | 번호(10) 일치 but dex# 불일치: keep=[631] vs candidate=[] | lc-en-tcg-sm75-010 | keep: lc-en-tcg-sm75-010 dex=[631] |
| 1195 | og-sm6a | 12 | 번호(12) 일치 but dex# 불일치: keep=[725] vs candidate=[] | lc-en-tcg-sm75-012 | keep: lc-en-tcg-sm75-012 dex=[725] |
| 1196 | og-sm6a | 13 | 번호(13) 일치 but dex# 불일치: keep=[757] vs candidate=[] | lc-en-tcg-sm75-013 | keep: lc-en-tcg-sm75-013 dex=[757] |
| 1197 | og-sm6a | 15 | 번호(15) 일치 but dex# 불일치: keep=[116] vs candidate=[] | lc-en-tcg-sm75-015 | keep: lc-en-tcg-sm75-015 dex=[116] |
| 1198 | og-sm6a | 16 | 번호(16) 일치 but dex# 불일치: keep=[116] vs candidate=[] | lc-en-tcg-sm75-016 | keep: lc-en-tcg-sm75-016 dex=[116] |
| 1199 | og-sm6a | 17 | 번호(17) 일치 but dex# 불일치: keep=[117] vs candidate=[] | lc-en-tcg-sm75-017 | keep: lc-en-tcg-sm75-017 dex=[117] |
| 1200 | og-sm6a | 19 | 번호(19) 일치 but dex# 불일치: keep=[129] vs candidate=[] | lc-en-tcg-sm75-019 | keep: lc-en-tcg-sm75-019 dex=[129] |
| 1201 | og-sm6a | 20 | 번호(20) 일치 but dex# 불일치: keep=[130] vs candidate=[] | lc-en-tcg-sm75-020 | keep: lc-en-tcg-sm75-020 dex=[130] |
| 1202 | og-sm6a | 21 | 번호(21) 일치 but dex# 불일치: keep=[131] vs candidate=[] | lc-en-tcg-sm75-021 | keep: lc-en-tcg-sm75-021 dex=[131] |
| 1203 | og-sm6a | 22 | 번호(22) 일치 but dex# 불일치: keep=[158] vs candidate=[] | lc-en-tcg-sm75-022 | keep: lc-en-tcg-sm75-022 dex=[158] |
| 1204 | og-sm6a | 25 | 번호(25) 일치 but dex# 불일치: keep=[194] vs candidate=[] | lc-en-tcg-sm75-025 | keep: lc-en-tcg-sm75-025 dex=[194] |
| 1205 | og-sm6a | 26 | 번호(26) 일치 but dex# 불일치: keep=[195] vs candidate=[] | lc-en-tcg-sm75-026 | keep: lc-en-tcg-sm75-026 dex=[195] |
| 1206 | og-sm6a | 27 | 번호(27) 일치 but dex# 불일치: keep=[222] vs candidate=[] | lc-en-tcg-sm75-027 | keep: lc-en-tcg-sm75-027 dex=[222] |
| 1207 | og-sm6a | 28 | 번호(28) 일치 but dex# 불일치: keep=[349] vs candidate=[] | lc-en-tcg-sm75-028 | keep: lc-en-tcg-sm75-028 dex=[349] |
| 1208 | og-sm6a | 29 | 번호(29) 일치 but dex# 불일치: keep=[350] vs candidate=[] | lc-en-tcg-sm75-029 | keep: lc-en-tcg-sm75-029 dex=[350] |
| 1209 | og-sm6a | 30 | 번호(30) 일치 but dex# 불일치: keep=[489] vs candidate=[] | lc-en-tcg-sm75-030 | keep: lc-en-tcg-sm75-030 dex=[489] |
| 1210 | og-sm6a | 31 | 번호(31) 일치 but dex# 불일치: keep=[746] vs candidate=[] | lc-en-tcg-sm75-031 | keep: lc-en-tcg-sm75-031 dex=[746] |
| 1211 | og-sm6a | 34 | 번호(34) 일치 but dex# 불일치: keep=[147] vs candidate=[] | lc-en-tcg-sm75-034 | keep: lc-en-tcg-sm75-034 dex=[147] |
| 1212 | og-sm6a | 35 | 번호(35) 일치 but dex# 불일치: keep=[147] vs candidate=[] | lc-en-tcg-sm75-035 | keep: lc-en-tcg-sm75-035 dex=[147] |
| 1213 | og-sm6a | 36 | 번호(36) 일치 but dex# 불일치: keep=[148] vs candidate=[] | lc-en-tcg-sm75-036 | keep: lc-en-tcg-sm75-036 dex=[148] |
| 1214 | og-sm6a | 38 | 번호(38) 일치 but dex# 불일치: keep=[329] vs candidate=[] | lc-en-tcg-sm75-038 | keep: lc-en-tcg-sm75-038 dex=[329] |
| 1215 | og-sm6a | 39 | 번호(39) 일치 but dex# 불일치: keep=[330] vs candidate=[] | lc-en-tcg-sm75-039 | keep: lc-en-tcg-sm75-039 dex=[330] |
| 1216 | og-sm6a | 40 | 번호(40) 일치 but dex# 불일치: keep=[334] vs candidate=[] | lc-en-tcg-sm75-040 | keep: lc-en-tcg-sm75-040 dex=[334] |
| 1217 | og-sm6a | 42 | 번호(42) 일치 but dex# 불일치: keep=[371] vs candidate=[] | lc-en-tcg-sm75-042 | keep: lc-en-tcg-sm75-042 dex=[371] |
| 1218 | og-sm6a | 43 | 번호(43) 일치 but dex# 불일치: keep=[372] vs candidate=[] | lc-en-tcg-sm75-043 | keep: lc-en-tcg-sm75-043 dex=[372] |
| 1219 | og-sm6a | 44 | 번호(44) 일치 but dex# 불일치: keep=[373] vs candidate=[] | lc-en-tcg-sm75-044 | keep: lc-en-tcg-sm75-044 dex=[373] |
| 1220 | og-sm6a | 45 | 번호(45) 일치 but dex# 불일치: keep=[621] vs candidate=[] | lc-en-tcg-sm75-045 | keep: lc-en-tcg-sm75-045 dex=[621] |
| 1221 | og-sm6a | 46 | 번호(46) 일치 but dex# 불일치: keep=[644] vs candidate=[] | lc-en-tcg-sm75-046 | keep: lc-en-tcg-sm75-046 dex=[644] |
| 1222 | og-sm6a | 47 | 번호(47) 일치 but dex# 불일치: keep=[646] vs candidate=[] | lc-en-tcg-sm75-047 | keep: lc-en-tcg-sm75-047 dex=[646] |
| 1223 | og-sm6a | 48 | 번호(48) 일치 but dex# 불일치: keep=[646] vs candidate=[] | lc-en-tcg-sm75-048 | keep: lc-en-tcg-sm75-048 dex=[646] |
| 1224 | og-sm6a | 50 | 번호(50) 일치 but dex# 불일치: keep=[776] vs candidate=[] | lc-en-tcg-sm75-050 | keep: lc-en-tcg-sm75-050 dex=[776] |
| 1225 | og-sm6a | 52 | 번호(52) 일치 but dex# 불일치: keep=[782] vs candidate=[] | lc-en-tcg-sm75-052 | keep: lc-en-tcg-sm75-052 dex=[782] |
| 1226 | og-sm6a | 54 | 번호(54) 일치 but dex# 불일치: keep=[784] vs candidate=[] | lc-en-tcg-sm75-054 | keep: lc-en-tcg-sm75-054 dex=[784] |
| 1227 | og-sm6a | 55 | 번호(55) 일치 but dex# 불일치: keep=[115] vs candidate=[] | lc-en-tcg-sm75-055 | keep: lc-en-tcg-sm75-055 dex=[115] |
| 1228 | og-sm6a | 56 | 번호(56) 일치 but dex# 불일치: keep=[333] vs candidate=[] | lc-en-tcg-sm75-056 | keep: lc-en-tcg-sm75-056 dex=[333] |
| 1229 | og-sm6a | 57 | 번호(57) 일치 but dex# 불일치: keep=[333] vs candidate=[] | lc-en-tcg-sm75-057 | keep: lc-en-tcg-sm75-057 dex=[333] |
| 1230 | og-sm6a | 66 | 번호(66) 일치 but dex# 불일치: keep=[230] vs candidate=[] | lc-en-tcg-sm75-066 | keep: lc-en-tcg-sm75-066 dex=[230] |
| 1231 | og-sm6a | 51 | 번호(51) 일치 but dex# 불일치: keep=[780] vs candidate=[] | lc-en-tcg-sm75-051 | keep: lc-en-tcg-sm75-051 dex=[780] |
| 1232 | og-sm6a | 4 | 번호(4) 일치 but dex# 불일치: keep=[255] vs candidate=[] | lc-en-tcg-sm75-004 | keep: lc-en-tcg-sm75-004 dex=[255] |
| 1233 | og-sm6a | 5 | 번호(5) 일치 but dex# 불일치: keep=[256] vs candidate=[] | lc-en-tcg-sm75-005 | keep: lc-en-tcg-sm75-005 dex=[256] |
| 1234 | og-sm6a | 11 | 번호(11) 일치 but dex# 불일치: keep=[643] vs candidate=[] | lc-en-tcg-sm75-011 | keep: lc-en-tcg-sm75-011 dex=[643] |
| 1235 | og-sm6a | 14 | 번호(14) 일치 but dex# 불일치: keep=[758] vs candidate=[] | lc-en-tcg-sm75-014 | keep: lc-en-tcg-sm75-014 dex=[758] |
| 1236 | og-sm6a | 18 | 번호(18) 일치 but dex# 불일치: keep=[230] vs candidate=[] | lc-en-tcg-sm75-018 | keep: lc-en-tcg-sm75-018 dex=[230] |
| 1237 | og-sm6a | 23 | 번호(23) 일치 but dex# 불일치: keep=[159] vs candidate=[] | lc-en-tcg-sm75-023 | keep: lc-en-tcg-sm75-023 dex=[159] |
| 1238 | og-sm6a | 24 | 번호(24) 일치 but dex# 불일치: keep=[160] vs candidate=[] | lc-en-tcg-sm75-024 | keep: lc-en-tcg-sm75-024 dex=[160] |
| 1239 | og-sm6a | 32 | 번호(32) 일치 but dex# 불일치: keep=[328] vs candidate=[] | lc-en-tcg-sm75-032 | keep: lc-en-tcg-sm75-032 dex=[328] |
| 1240 | og-sm6a | 33 | 번호(33) 일치 but dex# 불일치: keep=[635] vs candidate=[] | lc-en-tcg-sm75-033 | keep: lc-en-tcg-sm75-033 dex=[635] |
| 1241 | og-sm6a | 37 | 번호(37) 일치 but dex# 불일치: keep=[149] vs candidate=[] | lc-en-tcg-sm75-037 | keep: lc-en-tcg-sm75-037 dex=[149] |
| 1242 | og-sm6a | 41 | 번호(41) 일치 but dex# 불일치: keep=[334] vs candidate=[] | lc-en-tcg-sm75-041 | keep: lc-en-tcg-sm75-041 dex=[334] |
| 1243 | og-sm6a | 49 | 번호(49) 일치 but dex# 불일치: keep=[718] vs candidate=[] | lc-en-tcg-sm75-049 | keep: lc-en-tcg-sm75-049 dex=[718] |
| 1244 | og-sm6a | 53 | 번호(53) 일치 but dex# 불일치: keep=[783] vs candidate=[] | lc-en-tcg-sm75-053 | keep: lc-en-tcg-sm75-053 dex=[783] |
| 1245 | og-sm6a | 65 | 번호(65) 일치 but dex# 불일치: keep=[643] vs candidate=[] | lc-en-tcg-sm75-065 | keep: lc-en-tcg-sm75-065 dex=[643] |
| 1246 | og-sm7 | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-sm7-126, lc-en-tcg-sm7-148, lc-en-tcg-sm7-147 ... (+396) | EN sets: en-tcg-sm7, JP sets: jp-tcg-SM7, KR sets: kr-smk,kr-sm7 |
| 1247 | og-sm8 | 71 | 번호(71) 일치 but dex# 불일치: keep=[125] vs candidate=[] | lc-en-tcg-sm8-071 | keep: lc-en-tcg-sm8-071 dex=[125] |
| 1248 | og-sm8 | 3 | 번호(3) 일치 but dex# 불일치: keep=[123] vs candidate=[] | lc-en-tcg-sm8-003 | keep: lc-en-tcg-sm8-003 dex=[123] |
| 1249 | og-sm8 | 1 | 번호(1) 일치 but dex# 불일치: keep=[114] vs candidate=[] | lc-en-tcg-sm8-001 | keep: lc-en-tcg-sm8-001 dex=[114] |
| 1250 | og-sm8 | 2 | 번호(2) 일치 but dex# 불일치: keep=[465] vs candidate=[] | lc-en-tcg-sm8-002 | keep: lc-en-tcg-sm8-002 dex=[465] |
| 1251 | og-sm8 | 15 | 번호(15) 일치 but dex# 불일치: keep=[204] vs candidate=[] | lc-en-tcg-sm8-015 | keep: lc-en-tcg-sm8-015 dex=[204] |
| 1252 | og-sm8 | 4 | 번호(4) 일치 but dex# 불일치: keep=[127] vs candidate=[] | lc-en-tcg-sm8-004 | keep: lc-en-tcg-sm8-004 dex=[127] |
| 1253 | og-sm8 | 5 | 번호(5) 일치 but dex# 불일치: keep=[152] vs candidate=[] | lc-en-tcg-sm8-005 | keep: lc-en-tcg-sm8-005 dex=[152] |
| 1254 | og-sm8 | 6 | 번호(6) 일치 but dex# 불일치: keep=[152] vs candidate=[] | lc-en-tcg-sm8-006 | keep: lc-en-tcg-sm8-006 dex=[152] |
| 1255 | og-sm8 | 7 | 번호(7) 일치 but dex# 불일치: keep=[153] vs candidate=[] | lc-en-tcg-sm8-007 | keep: lc-en-tcg-sm8-007 dex=[153] |
| 1256 | og-sm8 | 9 | 번호(9) 일치 but dex# 불일치: keep=[167] vs candidate=[] | lc-en-tcg-sm8-009 | keep: lc-en-tcg-sm8-009 dex=[167] |
| 1257 | og-sm8 | 10 | 번호(10) 일치 but dex# 불일치: keep=[168] vs candidate=[] | lc-en-tcg-sm8-010 | keep: lc-en-tcg-sm8-010 dex=[168] |
| 1258 | og-sm8 | 11 | 번호(11) 일치 but dex# 불일치: keep=[187] vs candidate=[] | lc-en-tcg-sm8-011 | keep: lc-en-tcg-sm8-011 dex=[187] |
| 1259 | og-sm8 | 12 | 번호(12) 일치 but dex# 불일치: keep=[187] vs candidate=[] | lc-en-tcg-sm8-012 | keep: lc-en-tcg-sm8-012 dex=[187] |
| 1260 | og-sm8 | 17 | 번호(17) 일치 but dex# 불일치: keep=[213] vs candidate=[] | lc-en-tcg-sm8-017 | keep: lc-en-tcg-sm8-017 dex=[213] |
| 1261 | og-sm8 | 18 | 번호(18) 일치 but dex# 불일치: keep=[214] vs candidate=[] | lc-en-tcg-sm8-018 | keep: lc-en-tcg-sm8-018 dex=[214] |
| 1262 | og-sm8 | 19 | 번호(19) 일치 but dex# 불일치: keep=[251] vs candidate=[] | lc-en-tcg-sm8-019 | keep: lc-en-tcg-sm8-019 dex=[251] |
| 1263 | og-sm8 | 20 | 번호(20) 일치 but dex# 불일치: keep=[252] vs candidate=[] | lc-en-tcg-sm8-020 | keep: lc-en-tcg-sm8-020 dex=[252] |
| 1264 | og-sm8 | 21 | 번호(21) 일치 but dex# 불일치: keep=[253] vs candidate=[] | lc-en-tcg-sm8-021 | keep: lc-en-tcg-sm8-021 dex=[253] |
| 1265 | og-sm8 | 22 | 번호(22) 일치 but dex# 불일치: keep=[254] vs candidate=[] | lc-en-tcg-sm8-022 | keep: lc-en-tcg-sm8-022 dex=[254] |
| 1266 | og-sm8 | 23 | 번호(23) 일치 but dex# 불일치: keep=[265] vs candidate=[] | lc-en-tcg-sm8-023 | keep: lc-en-tcg-sm8-023 dex=[265] |
| 1267 | og-sm8 | 24 | 번호(24) 일치 but dex# 불일치: keep=[265] vs candidate=[] | lc-en-tcg-sm8-024 | keep: lc-en-tcg-sm8-024 dex=[265] |
| 1268 | og-sm8 | 25 | 번호(25) 일치 but dex# 불일치: keep=[266] vs candidate=[] | lc-en-tcg-sm8-025 | keep: lc-en-tcg-sm8-025 dex=[266] |
| 1269 | og-sm8 | 26 | 번호(26) 일치 but dex# 불일치: keep=[267] vs candidate=[] | lc-en-tcg-sm8-026 | keep: lc-en-tcg-sm8-026 dex=[267] |
| 1270 | og-sm8 | 27 | 번호(27) 일치 but dex# 불일치: keep=[268] vs candidate=[] | lc-en-tcg-sm8-027 | keep: lc-en-tcg-sm8-027 dex=[268] |
| 1271 | og-sm8 | 28 | 번호(28) 일치 but dex# 불일치: keep=[269] vs candidate=[] | lc-en-tcg-sm8-028 | keep: lc-en-tcg-sm8-028 dex=[269] |
| 1272 | og-sm8 | 29 | 번호(29) 일치 but dex# 불일치: keep=[290] vs candidate=[] | lc-en-tcg-sm8-029 | keep: lc-en-tcg-sm8-029 dex=[290] |
| 1273 | og-sm8 | 31 | 번호(31) 일치 but dex# 불일치: keep=[415] vs candidate=[] | lc-en-tcg-sm8-031 | keep: lc-en-tcg-sm8-031 dex=[415] |
| 1274 | og-sm8 | 32 | 번호(32) 일치 but dex# 불일치: keep=[416] vs candidate=[] | lc-en-tcg-sm8-032 | keep: lc-en-tcg-sm8-032 dex=[416] |
| 1275 | og-sm8 | 33 | 번호(33) 일치 but dex# 불일치: keep=[492] vs candidate=[] | lc-en-tcg-sm8-033 | keep: lc-en-tcg-sm8-033 dex=[492] |
| 1276 | og-sm8 | 43 | 번호(43) 일치 but dex# 불일치: keep=[218] vs candidate=[] | lc-en-tcg-sm8-043 | keep: lc-en-tcg-sm8-043 dex=[218] |
| 1277 | og-sm8 | 35 | 번호(35) 일치 but dex# 불일치: keep=[672] vs candidate=[] | lc-en-tcg-sm8-035 | keep: lc-en-tcg-sm8-035 dex=[672] |
| 1278 | og-sm8 | 36 | 번호(36) 일치 but dex# 불일치: keep=[673] vs candidate=[] | lc-en-tcg-sm8-036 | keep: lc-en-tcg-sm8-036 dex=[673] |
| 1279 | og-sm8 | 37 | 번호(37) 일치 but dex# 불일치: keep=[787] vs candidate=[] | lc-en-tcg-sm8-037 | keep: lc-en-tcg-sm8-037 dex=[787] |
| 1280 | og-sm8 | 38 | 번호(38) 일치 but dex# 불일치: keep=[146] vs candidate=[] | lc-en-tcg-sm8-038 | keep: lc-en-tcg-sm8-038 dex=[146] |
| 1281 | og-sm8 | 39 | 번호(39) 일치 but dex# 불일치: keep=[155] vs candidate=[] | lc-en-tcg-sm8-039 | keep: lc-en-tcg-sm8-039 dex=[155] |
| 1282 | og-sm8 | 40 | 번호(40) 일치 but dex# 불일치: keep=[155] vs candidate=[] | lc-en-tcg-sm8-040 | keep: lc-en-tcg-sm8-040 dex=[155] |
| 1283 | og-sm8 | 41 | 번호(41) 일치 but dex# 불일치: keep=[156] vs candidate=[] | lc-en-tcg-sm8-041 | keep: lc-en-tcg-sm8-041 dex=[156] |
| 1284 | og-sm8 | 42 | 번호(42) 일치 but dex# 불일치: keep=[157] vs candidate=[] | lc-en-tcg-sm8-042 | keep: lc-en-tcg-sm8-042 dex=[157] |
| 1285 | og-sm8 | 45 | 번호(45) 일치 but dex# 불일치: keep=[228] vs candidate=[] | lc-en-tcg-sm8-045 | keep: lc-en-tcg-sm8-045 dex=[228] |
| 1286 | og-sm8 | 46 | 번호(46) 일치 but dex# 불일치: keep=[229] vs candidate=[] | lc-en-tcg-sm8-046 | keep: lc-en-tcg-sm8-046 dex=[229] |
| 1287 | og-sm8 | 47 | 번호(47) 일치 but dex# 불일치: keep=[244] vs candidate=[] | lc-en-tcg-sm8-047 | keep: lc-en-tcg-sm8-047 dex=[244] |
| 1288 | og-sm8 | 48 | 번호(48) 일치 but dex# 불일치: keep=[485] vs candidate=[] | lc-en-tcg-sm8-048 | keep: lc-en-tcg-sm8-048 dex=[485] |
| 1289 | og-sm8 | 49 | 번호(49) 일치 but dex# 불일치: keep=[494] vs candidate=[] | lc-en-tcg-sm8-049 | keep: lc-en-tcg-sm8-049 dex=[494] |
| 1290 | og-sm8 | 50 | 번호(50) 일치 but dex# 불일치: keep=[667] vs candidate=[] | lc-en-tcg-sm8-050 | keep: lc-en-tcg-sm8-050 dex=[667] |
| 1291 | og-sm8 | 51 | 번호(51) 일치 but dex# 불일치: keep=[668] vs candidate=[] | lc-en-tcg-sm8-051 | keep: lc-en-tcg-sm8-051 dex=[668] |
| 1292 | og-sm8 | 52 | 번호(52) 일치 but dex# 불일치: keep=[806] vs candidate=[] | lc-en-tcg-sm8-052 | keep: lc-en-tcg-sm8-052 dex=[806] |
| 1293 | og-sm8 | 54 | 번호(54) 일치 but dex# 불일치: keep=[79] vs candidate=[] | lc-en-tcg-sm8-054 | keep: lc-en-tcg-sm8-054 dex=[79] |
| 1294 | og-sm8 | 55 | 번호(55) 일치 but dex# 불일치: keep=[199] vs candidate=[] | lc-en-tcg-sm8-055 | keep: lc-en-tcg-sm8-055 dex=[199] |
| 1295 | og-sm8 | 56 | 번호(56) 일치 but dex# 불일치: keep=[131] vs candidate=[] | lc-en-tcg-sm8-056 | keep: lc-en-tcg-sm8-056 dex=[131] |
| 1296 | og-sm8 | 57 | 번호(57) 일치 but dex# 불일치: keep=[225] vs candidate=[] | lc-en-tcg-sm8-057 | keep: lc-en-tcg-sm8-057 dex=[225] |
| 1297 | og-sm8 | 58 | 번호(58) 일치 but dex# 불일치: keep=[226] vs candidate=[] | lc-en-tcg-sm8-058 | keep: lc-en-tcg-sm8-058 dex=[226] |
| 1298 | og-sm8 | 59 | 번호(59) 일치 but dex# 불일치: keep=[245] vs candidate=[] | lc-en-tcg-sm8-059 | keep: lc-en-tcg-sm8-059 dex=[245] |
| 1299 | og-sm8 | 61 | 번호(61) 일치 but dex# 불일치: keep=[613] vs candidate=[] | lc-en-tcg-sm8-061 | keep: lc-en-tcg-sm8-061 dex=[613] |
| 1300 | og-sm8 | 63 | 번호(63) 일치 but dex# 불일치: keep=[646] vs candidate=[] | lc-en-tcg-sm8-063 | keep: lc-en-tcg-sm8-063 dex=[646] |
| 1301 | og-sm8 | 64 | 번호(64) 일치 but dex# 불일치: keep=[728] vs candidate=[] | lc-en-tcg-sm8-064 | keep: lc-en-tcg-sm8-064 dex=[728] |
| 1302 | og-sm8 | 65 | 번호(65) 일치 but dex# 불일치: keep=[728] vs candidate=[] | lc-en-tcg-sm8-065 | keep: lc-en-tcg-sm8-065 dex=[728] |
| 1303 | og-sm8 | 66 | 번호(66) 일치 but dex# 불일치: keep=[729] vs candidate=[] | lc-en-tcg-sm8-066 | keep: lc-en-tcg-sm8-066 dex=[729] |
| 1304 | og-sm8 | 68 | 번호(68) 일치 but dex# 불일치: keep=[747] vs candidate=[] | lc-en-tcg-sm8-068 | keep: lc-en-tcg-sm8-068 dex=[747] |
| 1305 | og-sm8 | 69 | 번호(69) 일치 but dex# 불일치: keep=[748] vs candidate=[] | lc-en-tcg-sm8-069 | keep: lc-en-tcg-sm8-069 dex=[748] |
| 1306 | og-sm8 | 70 | 번호(70) 일치 but dex# 불일치: keep=[779] vs candidate=[] | lc-en-tcg-sm8-070 | keep: lc-en-tcg-sm8-070 dex=[779] |
| 1307 | og-sm8 | 73 | 번호(73) 일치 but dex# 불일치: keep=[170] vs candidate=[] | lc-en-tcg-sm8-073 | keep: lc-en-tcg-sm8-073 dex=[170] |
| 1308 | og-sm8 | 74 | 번호(74) 일치 but dex# 불일치: keep=[171] vs candidate=[] | lc-en-tcg-sm8-074 | keep: lc-en-tcg-sm8-074 dex=[171] |
| 1309 | og-sm8 | 75 | 번호(75) 일치 but dex# 불일치: keep=[179] vs candidate=[] | lc-en-tcg-sm8-075 | keep: lc-en-tcg-sm8-075 dex=[179] |
| 1310 | og-sm8 | 76 | 번호(76) 일치 but dex# 불일치: keep=[179] vs candidate=[] | lc-en-tcg-sm8-076 | keep: lc-en-tcg-sm8-076 dex=[179] |
| 1311 | og-sm8 | 77 | 번호(77) 일치 but dex# 불일치: keep=[180] vs candidate=[] | lc-en-tcg-sm8-077 | keep: lc-en-tcg-sm8-077 dex=[180] |
| 1312 | og-sm8 | 79 | 번호(79) 일치 but dex# 불일치: keep=[243] vs candidate=[] | lc-en-tcg-sm8-079 | keep: lc-en-tcg-sm8-079 dex=[243] |
| 1313 | og-sm8 | 80 | 번호(80) 일치 but dex# 불일치: keep=[417] vs candidate=[] | lc-en-tcg-sm8-080 | keep: lc-en-tcg-sm8-080 dex=[417] |
| 1314 | og-sm8 | 81 | 번호(81) 일치 but dex# 불일치: keep=[522] vs candidate=[] | lc-en-tcg-sm8-081 | keep: lc-en-tcg-sm8-081 dex=[522] |
| 1315 | og-sm8 | 83 | 번호(83) 일치 but dex# 불일치: keep=[618] vs candidate=[] | lc-en-tcg-sm8-083 | keep: lc-en-tcg-sm8-083 dex=[618] |
| 1316 | og-sm8 | 85 | 번호(85) 일치 but dex# 불일치: keep=[785] vs candidate=[] | lc-en-tcg-sm8-085 | keep: lc-en-tcg-sm8-085 dex=[785] |
| 1317 | og-sm8 | 87 | 번호(87) 일치 but dex# 불일치: keep=[177] vs candidate=[] | lc-en-tcg-sm8-087 | keep: lc-en-tcg-sm8-087 dex=[177] |
| 1318 | og-sm8 | 88 | 번호(88) 일치 but dex# 불일치: keep=[178] vs candidate=[] | lc-en-tcg-sm8-088 | keep: lc-en-tcg-sm8-088 dex=[178] |
| 1319 | og-sm8 | 89 | 번호(89) 일치 but dex# 불일치: keep=[196] vs candidate=[] | lc-en-tcg-sm8-089 | keep: lc-en-tcg-sm8-089 dex=[196] |
| 1320 | og-sm8 | 90 | 번호(90) 일치 but dex# 불일치: keep=[201] vs candidate=[] | lc-en-tcg-sm8-090 | keep: lc-en-tcg-sm8-090 dex=[201] |
| 1321 | og-sm8 | 93 | 번호(93) 일치 but dex# 불일치: keep=[202] vs candidate=[] | lc-en-tcg-sm8-093 | keep: lc-en-tcg-sm8-093 dex=[202] |
| 1322 | og-sm8 | 94 | 번호(94) 일치 but dex# 불일치: keep=[203] vs candidate=[] | lc-en-tcg-sm8-094 | keep: lc-en-tcg-sm8-094 dex=[203] |
| 1323 | og-sm8 | 95 | 번호(95) 일치 but dex# 불일치: keep=[292] vs candidate=[] | lc-en-tcg-sm8-095 | keep: lc-en-tcg-sm8-095 dex=[292] |
| 1324 | og-sm8 | 96 | 번호(96) 일치 but dex# 불일치: keep=[302] vs candidate=[] | lc-en-tcg-sm8-096 | keep: lc-en-tcg-sm8-096 dex=[302] |
| 1325 | og-sm8 | 97 | 번호(97) 일치 but dex# 불일치: keep=[487] vs candidate=[] | lc-en-tcg-sm8-097 | keep: lc-en-tcg-sm8-097 dex=[487] |
| 1326 | og-sm8 | 98 | 번호(98) 일치 but dex# 불일치: keep=[561] vs candidate=[] | lc-en-tcg-sm8-098 | keep: lc-en-tcg-sm8-098 dex=[561] |
| 1327 | og-sm8 | 99 | 번호(99) 일치 but dex# 불일치: keep=[562] vs candidate=[] | lc-en-tcg-sm8-099 | keep: lc-en-tcg-sm8-099 dex=[562] |
| 1328 | og-sm8 | 101 | 번호(101) 일치 but dex# 불일치: keep=[607] vs candidate=[] | lc-en-tcg-sm8-101 | keep: lc-en-tcg-sm8-101 dex=[607] |
| 1329 | og-sm8 | 102 | 번호(102) 일치 but dex# 불일치: keep=[608] vs candidate=[] | lc-en-tcg-sm8-102 | keep: lc-en-tcg-sm8-102 dex=[608] |
| 1330 | og-sm8 | 104 | 번호(104) 일치 but dex# 불일치: keep=[648] vs candidate=[] | lc-en-tcg-sm8-104 | keep: lc-en-tcg-sm8-104 dex=[648] |
| 1331 | og-sm8 | 105 | 번호(105) 일치 but dex# 불일치: keep=[747] vs candidate=[] | lc-en-tcg-sm8-105 | keep: lc-en-tcg-sm8-105 dex=[747] |
| 1332 | og-sm8 | 107 | 번호(107) 일치 but dex# 불일치: keep=[803] vs candidate=[] | lc-en-tcg-sm8-107 | keep: lc-en-tcg-sm8-107 dex=[803] |
| 1333 | og-sm8 | 108 | 번호(108) 일치 but dex# 불일치: keep=[804] vs candidate=[] | lc-en-tcg-sm8-108 | keep: lc-en-tcg-sm8-108 dex=[804] |
| 1334 | og-sm8 | 109 | 번호(109) 일치 but dex# 불일치: keep=[95] vs candidate=[] | lc-en-tcg-sm8-109 | keep: lc-en-tcg-sm8-109 dex=[95] |
| 1335 | og-sm8 | 111 | 번호(111) 일치 but dex# 불일치: keep=[231] vs candidate=[] | lc-en-tcg-sm8-111 | keep: lc-en-tcg-sm8-111 dex=[231] |
| 1336 | og-sm8 | 30 | 번호(30) 일치 but dex# 불일치: keep=[291] vs candidate=[] | lc-en-tcg-sm8-030 | keep: lc-en-tcg-sm8-030 dex=[291] |
| 1337 | og-sm8 | 13 | 번호(13) 일치 but dex# 불일치: keep=[188] vs candidate=[] | lc-en-tcg-sm8-013 | keep: lc-en-tcg-sm8-013 dex=[188] |
| 1338 | og-sm8 | 14 | 번호(14) 일치 but dex# 불일치: keep=[189] vs candidate=[] | lc-en-tcg-sm8-014 | keep: lc-en-tcg-sm8-014 dex=[189] |
| 1339 | og-sm8 | 8 | 번호(8) 일치 but dex# 불일치: keep=[154] vs candidate=[] | lc-en-tcg-sm8-008 | keep: lc-en-tcg-sm8-008 dex=[154] |
| 1340 | og-sm8 | 16 | 번호(16) 일치 but dex# 불일치: keep=[213] vs candidate=[] | lc-en-tcg-sm8-016 | keep: lc-en-tcg-sm8-016 dex=[213] |
| 1341 | og-sm8 | 34 | 번호(34) 일치 but dex# 불일치: keep=[640] vs candidate=[] | lc-en-tcg-sm8-034 | keep: lc-en-tcg-sm8-034 dex=[640] |
| 1342 | og-sm8 | 44 | 번호(44) 일치 but dex# 불일치: keep=[219] vs candidate=[] | lc-en-tcg-sm8-044 | keep: lc-en-tcg-sm8-044 dex=[219] |
| 1343 | og-sm8 | 53 | 번호(53) 일치 but dex# 불일치: keep=[37] vs candidate=[] | lc-en-tcg-sm8-053 | keep: lc-en-tcg-sm8-053 dex=[37] |
| 1344 | og-sm8 | 60 | 번호(60) 일치 but dex# 불일치: keep=[245] vs candidate=[] | lc-en-tcg-sm8-060 | keep: lc-en-tcg-sm8-060 dex=[245] |
| 1345 | og-sm8 | 62 | 번호(62) 일치 but dex# 불일치: keep=[614] vs candidate=[] | lc-en-tcg-sm8-062 | keep: lc-en-tcg-sm8-062 dex=[614] |
| 1346 | og-sm8 | 67 | 번호(67) 일치 but dex# 불일치: keep=[730] vs candidate=[] | lc-en-tcg-sm8-067 | keep: lc-en-tcg-sm8-067 dex=[730] |
| 1347 | og-sm8 | 72 | 번호(72) 일치 but dex# 불일치: keep=[466] vs candidate=[] | lc-en-tcg-sm8-072 | keep: lc-en-tcg-sm8-072 dex=[466] |
| 1348 | og-sm8 | 78 | 번호(78) 일치 but dex# 불일치: keep=[181] vs candidate=[] | lc-en-tcg-sm8-078 | keep: lc-en-tcg-sm8-078 dex=[181] |
| 1349 | og-sm8 | 82 | 번호(82) 일치 but dex# 불일치: keep=[523] vs candidate=[] | lc-en-tcg-sm8-082 | keep: lc-en-tcg-sm8-082 dex=[523] |
| 1350 | og-sm8 | 84 | 번호(84) 일치 but dex# 불일치: keep=[702] vs candidate=[] | lc-en-tcg-sm8-084 | keep: lc-en-tcg-sm8-084 dex=[702] |
| 1351 | og-sm8 | 86 | 번호(86) 일치 but dex# 불일치: keep=[807] vs candidate=[] | lc-en-tcg-sm8-086 | keep: lc-en-tcg-sm8-086 dex=[807] |
| 1352 | og-sm8 | 91 | 번호(91) 일치 but dex# 불일치: keep=[201] vs candidate=[] | lc-en-tcg-sm8-091 | keep: lc-en-tcg-sm8-091 dex=[201] |
| 1353 | og-sm8 | 92 | 번호(92) 일치 but dex# 불일치: keep=[201] vs candidate=[] | lc-en-tcg-sm8-092 | keep: lc-en-tcg-sm8-092 dex=[201] |
| 1354 | og-sm8 | 100 | 번호(100) 일치 but dex# 불일치: keep=[563] vs candidate=[] | lc-en-tcg-sm8-100 | keep: lc-en-tcg-sm8-100 dex=[563] |
| 1355 | og-sm8 | 103 | 번호(103) 일치 but dex# 불일치: keep=[609] vs candidate=[] | lc-en-tcg-sm8-103 | keep: lc-en-tcg-sm8-103 dex=[609] |
| 1356 | og-sm8 | 106 | 번호(106) 일치 but dex# 불일치: keep=[793] vs candidate=[] | lc-en-tcg-sm8-106 | keep: lc-en-tcg-sm8-106 dex=[793] |
| 1357 | og-sm8 | 110 | 번호(110) 일치 but dex# 불일치: keep=[185] vs candidate=[] | lc-en-tcg-sm8-110 | keep: lc-en-tcg-sm8-110 dex=[185] |
| 1358 | og-sm8b | 1 | 번호(1) 일치 but dex# 불일치: keep=[10] vs candidate=[] | lc-en-tcg-sm115-001 | keep: lc-en-tcg-sm115-001 dex=[10] |
| 1359 | og-sm8b | 2 | 번호(2) 일치 but dex# 불일치: keep=[11] vs candidate=[] | lc-en-tcg-sm115-002 | keep: lc-en-tcg-sm115-002 dex=[11] |
| 1360 | og-sm8b | 4 | 번호(4) 일치 but dex# 불일치: keep=[46] vs candidate=[] | lc-en-tcg-sm115-004 | keep: lc-en-tcg-sm115-004 dex=[46] |
| 1361 | og-sm8b | 5 | 번호(5) 일치 but dex# 불일치: keep=[123] vs candidate=[] | lc-en-tcg-sm115-005 | keep: lc-en-tcg-sm115-005 dex=[123] |
| 1362 | og-sm8b | 6 | 번호(6) 일치 but dex# 불일치: keep=[127] vs candidate=[] | lc-en-tcg-sm115-006 | keep: lc-en-tcg-sm115-006 dex=[127] |
| 1363 | og-sm8b | 7 | 번호(7) 일치 but dex# 불일치: keep=[4] vs candidate=[] | lc-en-tcg-sm115-007 | keep: lc-en-tcg-sm115-007 dex=[4] |
| 1364 | og-sm8b | 8 | 번호(8) 일치 but dex# 불일치: keep=[5] vs candidate=[] | lc-en-tcg-sm115-008 | keep: lc-en-tcg-sm115-008 dex=[5] |
| 1365 | og-sm8b | 9 | 번호(9) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-sm115-009 | keep: lc-en-tcg-sm115-009 dex=[6] |
| 1366 | og-sm8b | 10 | 번호(10) 일치 but dex# 불일치: keep=[126] vs candidate=[] | lc-en-tcg-sm115-010 | keep: lc-en-tcg-sm115-010 dex=[126] |
| 1367 | og-sm8b | 11 | 번호(11) 일치 but dex# 불일치: keep=[54] vs candidate=[] | lc-en-tcg-sm115-011 | keep: lc-en-tcg-sm115-011 dex=[54] |
| 1368 | og-sm8b | 12 | 번호(12) 일치 but dex# 불일치: keep=[79] vs candidate=[] | lc-en-tcg-sm115-012 | keep: lc-en-tcg-sm115-012 dex=[79] |
| 1369 | og-sm8b | 13 | 번호(13) 일치 but dex# 불일치: keep=[120] vs candidate=[] | lc-en-tcg-sm115-013 | keep: lc-en-tcg-sm115-013 dex=[120] |
| 1370 | og-sm8b | 15 | 번호(15) 일치 but dex# 불일치: keep=[129] vs candidate=[] | lc-en-tcg-sm115-015 | keep: lc-en-tcg-sm115-015 dex=[129] |
| 1371 | og-sm8b | 16 | 번호(16) 일치 but dex# 불일치: keep=[130] vs candidate=[] | lc-en-tcg-sm115-016 | keep: lc-en-tcg-sm115-016 dex=[130] |
| 1372 | og-sm8b | 17 | 번호(17) 일치 but dex# 불일치: keep=[131] vs candidate=[] | lc-en-tcg-sm115-017 | keep: lc-en-tcg-sm115-017 dex=[131] |
| 1373 | og-sm8b | 18 | 번호(18) 일치 but dex# 불일치: keep=[134] vs candidate=[] | lc-en-tcg-sm115-018 | keep: lc-en-tcg-sm115-018 dex=[134] |
| 1374 | og-sm8b | 19 | 번호(19) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-en-tcg-sm115-019 | keep: lc-en-tcg-sm115-019 dex=[25] |
| 1375 | og-sm8b | 20 | 번호(20) 일치 but dex# 불일치: keep=[26] vs candidate=[] | lc-en-tcg-sm115-020 | keep: lc-en-tcg-sm115-020 dex=[26] |
| 1376 | og-sm8b | 21 | 번호(21) 일치 but dex# 불일치: keep=[100] vs candidate=[] | lc-en-tcg-sm115-021 | keep: lc-en-tcg-sm115-021 dex=[100] |
| 1377 | og-sm8b | 22 | 번호(22) 일치 but dex# 불일치: keep=[101] vs candidate=[] | lc-en-tcg-sm115-022 | keep: lc-en-tcg-sm115-022 dex=[101] |
| 1378 | og-sm8b | 23 | 번호(23) 일치 but dex# 불일치: keep=[135] vs candidate=[] | lc-en-tcg-sm115-023 | keep: lc-en-tcg-sm115-023 dex=[135] |
| 1379 | og-sm8b | 25 | 번호(25) 일치 but dex# 불일치: keep=[23] vs candidate=[] | lc-en-tcg-sm115-025 | keep: lc-en-tcg-sm115-025 dex=[23] |
| 1380 | og-sm8b | 26 | 번호(26) 일치 but dex# 불일치: keep=[23] vs candidate=[] | lc-en-tcg-sm115-026 | keep: lc-en-tcg-sm115-026 dex=[23] |
| 1381 | og-sm8b | 27 | 번호(27) 일치 but dex# 불일치: keep=[24] vs candidate=[] | lc-en-tcg-sm115-027 | keep: lc-en-tcg-sm115-027 dex=[24] |
| 1382 | og-sm8b | 28 | 번호(28) 일치 but dex# 불일치: keep=[109] vs candidate=[] | lc-en-tcg-sm115-028 | keep: lc-en-tcg-sm115-028 dex=[109] |
| 1383 | og-sm8b | 29 | 번호(29) 일치 but dex# 불일치: keep=[110] vs candidate=[] | lc-en-tcg-sm115-029 | keep: lc-en-tcg-sm115-029 dex=[110] |
| 1384 | og-sm8b | 30 | 번호(30) 일치 but dex# 불일치: keep=[124] vs candidate=[] | lc-en-tcg-sm115-030 | keep: lc-en-tcg-sm115-030 dex=[124] |
| 1385 | og-sm8b | 31 | 번호(31) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-en-tcg-sm115-031 | keep: lc-en-tcg-sm115-031 dex=[150] |
| 1386 | og-sm8b | 32 | 번호(32) 일치 but dex# 불일치: keep=[151] vs candidate=[] | lc-en-tcg-sm115-032 | keep: lc-en-tcg-sm115-032 dex=[151] |
| 1387 | og-sm8b | 33 | 번호(33) 일치 but dex# 불일치: keep=[74] vs candidate=[] | lc-en-tcg-sm115-033 | keep: lc-en-tcg-sm115-033 dex=[74] |
| 1388 | og-sm8b | 35 | 번호(35) 일치 but dex# 불일치: keep=[76] vs candidate=[] | lc-en-tcg-sm115-035 | keep: lc-en-tcg-sm115-035 dex=[76] |
| 1389 | og-sm8b | 37 | 번호(37) 일치 but dex# 불일치: keep=[104] vs candidate=[] | lc-en-tcg-sm115-037 | keep: lc-en-tcg-sm115-037 dex=[104] |
| 1390 | og-sm8b | 38 | 번호(38) 일치 but dex# 불일치: keep=[35] vs candidate=[] | lc-en-tcg-sm115-038 | keep: lc-en-tcg-sm115-038 dex=[35] |
| 1391 | og-sm8b | 39 | 번호(39) 일치 but dex# 불일치: keep=[35] vs candidate=[] | lc-en-tcg-sm115-039 | keep: lc-en-tcg-sm115-039 dex=[35] |
| 1392 | og-sm8b | 40 | 번호(40) 일치 but dex# 불일치: keep=[36] vs candidate=[] | lc-en-tcg-sm115-040 | keep: lc-en-tcg-sm115-040 dex=[36] |
| 1393 | og-sm8b | 41 | 번호(41) 일치 but dex# 불일치: keep=[39] vs candidate=[] | lc-en-tcg-sm115-041 | keep: lc-en-tcg-sm115-041 dex=[39] |
| 1394 | og-sm8b | 42 | 번호(42) 일치 but dex# 불일치: keep=[40] vs candidate=[] | lc-en-tcg-sm115-042 | keep: lc-en-tcg-sm115-042 dex=[40] |
| 1395 | og-sm8b | 45 | 번호(45) 일치 but dex# 불일치: keep=[83] vs candidate=[] | lc-en-tcg-sm115-045 | keep: lc-en-tcg-sm115-045 dex=[83] |
| 1396 | og-sm8b | 46 | 번호(46) 일치 but dex# 불일치: keep=[113] vs candidate=[] | lc-en-tcg-sm115-046 | keep: lc-en-tcg-sm115-046 dex=[113] |
| 1397 | og-sm8b | 47 | 번호(47) 일치 but dex# 불일치: keep=[115] vs candidate=[] | lc-en-tcg-sm115-047 | keep: lc-en-tcg-sm115-047 dex=[115] |
| 1398 | og-sm8b | 48 | 번호(48) 일치 but dex# 불일치: keep=[133] vs candidate=[] | lc-en-tcg-sm115-048 | keep: lc-en-tcg-sm115-048 dex=[133] |
| 1399 | og-sm8b | 49 | 번호(49) 일치 but dex# 불일치: keep=[133] vs candidate=[] | lc-en-tcg-sm115-049 | keep: lc-en-tcg-sm115-049 dex=[133] |
| 1400 | og-sm8b | 50 | 번호(50) 일치 but dex# 불일치: keep=[143] vs candidate=[] | lc-en-tcg-sm115-050 | keep: lc-en-tcg-sm115-050 dex=[143] |
| 1401 | og-sm8b | 69 | 번호(69) 일치 but dex# 불일치: keep=[144,145,146] vs candidate=[] | lc-en-tcg-sm115-069 | keep: lc-en-tcg-sm115-069 dex=[144,145,146] |
| 1402 | og-sm8b | 3 | 번호(3) 일치 but dex# 불일치: keep=[12] vs candidate=[] | lc-en-tcg-sm115-003 | keep: lc-en-tcg-sm115-003 dex=[12] |
| 1403 | og-sm8b | 14 | 번호(14) 일치 but dex# 불일치: keep=[121] vs candidate=[] | lc-en-tcg-sm115-014 | keep: lc-en-tcg-sm115-014 dex=[121] |
| 1404 | og-sm8b | 24 | 번호(24) 일치 but dex# 불일치: keep=[145] vs candidate=[] | lc-en-tcg-sm115-024 | keep: lc-en-tcg-sm115-024 dex=[145] |
| 1405 | og-sm8b | 34 | 번호(34) 일치 but dex# 불일치: keep=[75] vs candidate=[] | lc-en-tcg-sm115-034 | keep: lc-en-tcg-sm115-034 dex=[75] |
| 1406 | og-sm8b | 36 | 번호(36) 일치 but dex# 불일치: keep=[95] vs candidate=[] | lc-en-tcg-sm115-036 | keep: lc-en-tcg-sm115-036 dex=[95] |
| 1407 | og-sm8b | 43 | 번호(43) 일치 but dex# 불일치: keep=[122] vs candidate=[] | lc-en-tcg-sm115-043 | keep: lc-en-tcg-sm115-043 dex=[122] |
| 1408 | og-sm8b | 44 | 번호(44) 일치 but dex# 불일치: keep=[144,145,146] vs candidate=[] | lc-en-tcg-sm115-044 | keep: lc-en-tcg-sm115-044 dex=[144,145,146] |
| 1409 | og-sm8b | 66 | 번호(66) 일치 but dex# 불일치: keep=[144,145,146] vs candidate=[] | lc-en-tcg-sm115-066 | keep: lc-en-tcg-sm115-066 dex=[144,145,146] |
| 1410 | og-sm9 | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-sm9-176, lc-en-tcg-sm9-177, lc-en-tcg-sm9-001 ... (+420) | EN sets: en-tcg-sm9, JP sets: jp-tcg-SM9, KR sets: kr-sm9,kr-smd,kr-sml_ |
| 1411 | og-smp2 | 2 | 번호(2) 일치 but dex# 불일치: keep=[272] vs candidate=[] | lc-en-tcg-det1-002 | keep: lc-en-tcg-det1-002 dex=[272] |
| 1412 | og-smp2 | 3 | 번호(3) 일치 but dex# 불일치: keep=[755] vs candidate=[] | lc-en-tcg-det1-003 | keep: lc-en-tcg-det1-003 dex=[755] |
| 1413 | og-smp2 | 4 | 번호(4) 일치 but dex# 불일치: keep=[4] vs candidate=[] | lc-en-tcg-det1-004 | keep: lc-en-tcg-det1-004 dex=[4] |
| 1414 | og-smp2 | 5 | 번호(5) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-det1-005 | keep: lc-en-tcg-det1-005 dex=[6] |
| 1415 | og-smp2 | 6 | 번호(6) 일치 but dex# 불일치: keep=[59] vs candidate=[] | lc-en-tcg-det1-006 | keep: lc-en-tcg-det1-006 dex=[59] |
| 1416 | og-smp2 | 7 | 번호(7) 일치 but dex# 불일치: keep=[54] vs candidate=[] | lc-en-tcg-det1-007 | keep: lc-en-tcg-det1-007 dex=[54] |
| 1417 | og-smp2 | 8 | 번호(8) 일치 but dex# 불일치: keep=[129] vs candidate=[] | lc-en-tcg-det1-008 | keep: lc-en-tcg-det1-008 dex=[129] |
| 1418 | og-smp2 | 10 | 번호(10) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-en-tcg-det1-010 | keep: lc-en-tcg-det1-010 dex=[25] |
| 1419 | og-smp2 | 11 | 번호(11) 일치 but dex# 불일치: keep=[122] vs candidate=[] | lc-en-tcg-det1-011 | keep: lc-en-tcg-det1-011 dex=[122] |
| 1420 | og-smp2 | 12 | 번호(12) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-en-tcg-det1-012 | keep: lc-en-tcg-det1-012 dex=[150] |
| 1421 | og-smp2 | 13 | 번호(13) 일치 but dex# 불일치: keep=[68] vs candidate=[] | lc-en-tcg-det1-013 | keep: lc-en-tcg-det1-013 dex=[68] |
| 1422 | og-smp2 | 14 | 번호(14) 일치 but dex# 불일치: keep=[39] vs candidate=[] | lc-en-tcg-det1-014 | keep: lc-en-tcg-det1-014 dex=[39] |
| 1423 | og-smp2 | 15 | 번호(15) 일치 but dex# 불일치: keep=[209] vs candidate=[] | lc-en-tcg-det1-015 | keep: lc-en-tcg-det1-015 dex=[209] |
| 1424 | og-smp2 | 16 | 번호(16) 일치 but dex# 불일치: keep=[108] vs candidate=[] | lc-en-tcg-det1-016 | keep: lc-en-tcg-det1-016 dex=[108] |
| 1425 | og-smp2 | 17 | 번호(17) 일치 but dex# 불일치: keep=[132] vs candidate=[] | lc-en-tcg-det1-017 | keep: lc-en-tcg-det1-017 dex=[132] |
| 1426 | og-smp2 | 18 | 번호(18) 일치 but dex# 불일치: keep=[289] vs candidate=[] | lc-en-tcg-det1-018 | keep: lc-en-tcg-det1-018 dex=[289] |
| 1427 | og-smp2 | 1 | 번호(1) 일치 but dex# 불일치: keep=[1] vs candidate=[] | lc-en-tcg-det1-001 | keep: lc-en-tcg-det1-001 dex=[1] |
| 1428 | og-smp2 | 9 | 번호(9) 일치 but dex# 불일치: keep=[658] vs candidate=[] | lc-en-tcg-det1-009 | keep: lc-en-tcg-det1-009 dex=[658] |
| 1429 | sv-151 | 182 | 번호(182) 일치 but dex# 불일치: keep=[148] vs candidate=[] | lc-orphan-jp-sv-151-182 | keep: lc-orphan-jp-sv-151-182 dex=[148] |
| 1430 | sv-151 | 181 | 번호(181) 일치 but dex# 불일치: keep=[143] vs candidate=[] | lc-orphan-jp-sv-151-181 | keep: lc-orphan-jp-sv-151-181 dex=[143] |
| 1431 | sv-151 | 183 | 번호(183) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-orphan-jp-sv-151-183 | keep: lc-orphan-jp-sv-151-183 dex=[150] |
| 1432 | sv-base | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-base-n152, lc-cg-sv-base-n153, lc-cg-sv-base-n154 ... (+471) | EN sets: sv1, JP sets: jp-sv-base, KR sets: kr-sv-base,kr-svd,kr-sv1v,kr-svg,kr-sv1s,kr-svc,kr-svem,kr-sva,kr-svb,kr-svp1 |
| 1433 | sv-black-bolt-white-flare | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-black-bolt-white-flare-n173, lc-orphan-zsv10pt5-1, lc-orphan-zsv10pt5-10 ... (+690) | EN sets: zsv10pt5,rsv10pt5, JP sets: jp-sv-black-bolt-white-flare, KR sets: kr-sv-black-bolt-white-flare,kr-sv11w,kr-sv11b |
| 1434 | sv-crimson-haze | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-crimson-haze-n11, lc-cg-sv-crimson-haze-n56, lc-cg-sv-crimson-haze-n13 ... (+93) | EN sets: , JP sets: jp-sv-crimson-haze, KR sets: kr-sv-crimson-haze,kr-sv5a |
| 1435 | sv-destined-rivals | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-destined-rivals-n152, lc-cg-sv-destined-rivals-n153, lc-cg-sv-destined-rivals-n154 ... (+335) | EN sets: sv10, JP sets: jp-sv-destined-rivals, KR sets: kr-sv-destined-rivals,kr-sv10 |
| 1436 | sv-heatwave-arena | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-heatwave-arena-n1, lc-cg-sv-heatwave-arena-n3, lc-cg-sv-heatwave-arena-n4 ... (+89) | EN sets: , JP sets: jp-sv-heatwave-arena, KR sets: kr-sv-heatwave-arena,kr-sv9a |
| 1437 | sv-journey-together | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-journey-together-n160, lc-cg-sv-journey-together-n162, lc-cg-sv-journey-together-n161 ... (+305) | EN sets: sv9, JP sets: jp-sv-journey-together, KR sets: kr-sv-journey-together,kr-sv9,kr-svn,kr-svom,kr-svod |
| 1438 | sv-obsidian-flames | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-obsidian-flames-n152, lc-cg-sv-obsidian-flames-n153, lc-cg-sv-obsidian-flames-n154 ... (+350) | EN sets: sv3, JP sets: jp-sv-obsidian-flames, KR sets: kr-sv-obsidian-flames,kr-sv3,kr-svf |
| 1439 | sv-paldea-evolved | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-paldea-evolved-n152, lc-cg-sv-paldea-evolved-n153, lc-cg-sv-paldea-evolved-n154 ... (+474) | EN sets: sv2, JP sets: jp-sv-paldea-evolved, KR sets: kr-sv-paldea-evolved,kr-sv2p,kr-sv2d,kr-svp2 |
| 1440 | sv-paldean-fates | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-paldean-fates-n152, lc-cg-sv-paldean-fates-n153, lc-cg-sv-paldean-fates-n154 ... (+242) | EN sets: sv4pt5, JP sets: jp-sv-paldean-fates, KR sets: kr-sv-paldean-fates,kr-sv4a |
| 1441 | sv-paradise-dragona | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-paradise-dragona-n2, lc-cg-sv-paradise-dragona-n3, lc-cg-sv-paradise-dragona-n4 ... (+91) | EN sets: , JP sets: jp-sv-paradise-dragona, KR sets: kr-sv-paradise-dragona,kr-sv7a |
| 1442 | sv-paradox-rift | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-paradox-rift-n152, lc-cg-sv-paradox-rift-n153, lc-cg-sv-paradox-rift-n154 ... (+453) | EN sets: sv4, JP sets: jp-sv-paradox-rift, KR sets: kr-sv-paradox-rift,kr-svhk,kr-sv4m,kr-sv4k,kr-svhm |
| 1443 | sv-prismatic-evolutions | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-prismatic-evolutions-n181, lc-cg-sv-prismatic-evolutions-n182, lc-cg-sv-prismatic-evolutions-n183 ... (+54) | EN sets: sv8pt5, JP sets: jp-sv-prismatic-evolutions, KR sets: kr-sv8a,kr-sv-prismatic-evolutions |
| 1444 | sv-raging-surf | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-raging-surf-n2, lc-cg-sv-raging-surf-n3, lc-cg-sv-raging-surf-n4 ... (+89) | EN sets: , JP sets: jp-sv-raging-surf, KR sets: kr-sv-raging-surf,kr-sv3a |
| 1445 | sv-shrouded-fable | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-shrouded-fable-n94, lc-cg-sv-shrouded-fable-n31, lc-cg-sv-shrouded-fable-n32 ... (+96) | EN sets: sv6pt5, JP sets: jp-sv-shrouded-fable, KR sets: kr-sv-shrouded-fable,kr-sv6a,kr-svjp |
| 1446 | sv-stellar-crown | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-stellar-crown-n152, lc-cg-sv-stellar-crown-n153, lc-cg-sv-stellar-crown-n154 ... (+37) | EN sets: sv7, JP sets: jp-sv-stellar-crown, KR sets: kr-sv7,kr-svel,kr-svjl,kr-sv-stellar-crown |
| 1447 | sv-surging-sparks | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-surging-sparks-n187, lc-cg-sv-surging-sparks-n188, lc-cg-sv-surging-sparks-n152 ... (+143) | EN sets: sv8, JP sets: jp-sv-surging-sparks, KR sets: kr-sv-surging-sparks,kr-sv8 |
| 1448 | sv-temporal-forces | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-temporal-forces-n160, lc-cg-sv-temporal-forces-n161, lc-cg-sv-temporal-forces-n162 ... (+264) | EN sets: sv5, JP sets: jp-sv-temporal-forces, KR sets: kr-sv-temporal-forces,kr-sv5m,kr-sv5k |
| 1449 | sv-triplet-beat | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-orphan-jp-sv-triplet-beat-31, lc-orphan-jp-sv-triplet-beat-14, lc-orphan-jp-sv-triplet-beat-71 ... (+100) | EN sets: , JP sets: jp-sv-triplet-beat, KR sets: kr-sv-triplet-beat,kr-sv1a |
| 1450 | sv-twilight-masquerade | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-cg-sv-twilight-masquerade-n152, lc-cg-sv-twilight-masquerade-n153, lc-cg-sv-twilight-masquerade-n154 ... (+322) | EN sets: sv6, JP sets: jp-sv-twilight-masquerade, KR sets: kr-sv-twilight-masquerade,kr-sv6 |
| 1451 | og-xy10 | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-xy10-100, lc-en-tcg-xy10-101, lc-en-tcg-xy10-102 ... (+297) | EN sets: en-tcg-xy10, JP sets: jp-tcg-XY10, KR sets: kr-xy10,kr-xyf,kr-xyg |
| 1452 | og-xy11a | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-xy11-099, lc-en-tcg-xy11-100, lc-en-tcg-xy11-101 ... (+172) | EN sets: en-tcg-xy11, JP sets: jp-tcg-XY11a, KR sets: kr-rbd,kr-xy11,kr-ubd,kr-xyh |
| 1453 | og-xy1a | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-xy1-128, lc-en-tcg-xy1-129, lc-en-tcg-xy1-130 ... (+206) | EN sets: en-tcg-xy1, JP sets: jp-tcg-XY1a, KR sets: kr-xy30,kr-xy1 |
| 1454 | og-xy2 | 18 | 번호(18) 일치 but dex# 불일치: keep=[667] vs candidate=[] | lc-en-tcg-xy2-018, lc-orphan-jp-tcg-XY2-18 | keep: lc-en-tcg-xy2-018 dex=[667] |
| 1455 | og-xy2 | 69 | 번호(69) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-xy2-069, lc-orphan-jp-tcg-XY2-69 | keep: lc-en-tcg-xy2-069 dex=[6] |
| 1456 | og-xy2 | 1 | 번호(1) 일치 but dex# 불일치: keep=[10] vs candidate=[] | lc-en-tcg-xy2-001, lc-orphan-jp-tcg-XY2-1 | keep: lc-en-tcg-xy2-001 dex=[10] |
| 1457 | og-xy2 | 2 | 번호(2) 일치 but dex# 불일치: keep=[11] vs candidate=[] | lc-en-tcg-xy2-002, lc-orphan-jp-tcg-XY2-2 | keep: lc-en-tcg-xy2-002 dex=[11] |
| 1458 | og-xy2 | 3 | 번호(3) 일치 but dex# 불일치: keep=[12] vs candidate=[] | lc-en-tcg-xy2-003, lc-orphan-jp-tcg-XY2-3 | keep: lc-en-tcg-xy2-003 dex=[12] |
| 1459 | og-xy2 | 4 | 번호(4) 일치 but dex# 불일치: keep=[204] vs candidate=[] | lc-en-tcg-xy2-004, lc-orphan-jp-tcg-XY2-4 | keep: lc-en-tcg-xy2-004 dex=[204] |
| 1460 | og-xy2 | 5 | 번호(5) 일치 but dex# 불일치: keep=[273] vs candidate=[] | lc-en-tcg-xy2-005, lc-orphan-jp-tcg-XY2-5 | keep: lc-en-tcg-xy2-005 dex=[273] |
| 1461 | og-xy2 | 9 | 번호(9) 일치 but dex# 불일치: keep=[407] vs candidate=[] | lc-en-tcg-xy2-009, lc-orphan-jp-tcg-XY2-9 | keep: lc-en-tcg-xy2-009 dex=[407] |
| 1462 | og-xy2 | 10 | 번호(10) 일치 but dex# 불일치: keep=[556] vs candidate=[] | lc-en-tcg-xy2-010, lc-orphan-jp-tcg-XY2-10 | keep: lc-en-tcg-xy2-010 dex=[556] |
| 1463 | og-xy2 | 11 | 번호(11) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-xy2-011, lc-orphan-jp-tcg-XY2-11 | keep: lc-en-tcg-xy2-011 dex=[6] |
| 1464 | og-xy2 | 12 | 번호(12) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-xy2-012, lc-orphan-jp-tcg-XY2-12 | keep: lc-en-tcg-xy2-012 dex=[6] |
| 1465 | og-xy2 | 13 | 번호(13) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-xy2-013, lc-orphan-jp-tcg-XY2-13 | keep: lc-en-tcg-xy2-013 dex=[6] |
| 1466 | og-xy2 | 14 | 번호(14) 일치 but dex# 불일치: keep=[77] vs candidate=[] | lc-en-tcg-xy2-014, lc-orphan-jp-tcg-XY2-14 | keep: lc-en-tcg-xy2-014 dex=[77] |
| 1467 | og-xy2 | 15 | 번호(15) 일치 but dex# 불일치: keep=[78] vs candidate=[] | lc-en-tcg-xy2-015, lc-orphan-jp-tcg-XY2-15 | keep: lc-en-tcg-xy2-015 dex=[78] |
| 1468 | og-xy2 | 16 | 번호(16) 일치 but dex# 불일치: keep=[324] vs candidate=[] | lc-en-tcg-xy2-016, lc-orphan-jp-tcg-XY2-16 | keep: lc-en-tcg-xy2-016 dex=[324] |
| 1469 | og-xy2 | 21 | 번호(21) 일치 but dex# 불일치: keep=[211] vs candidate=[] | lc-en-tcg-xy2-021, lc-orphan-jp-tcg-XY2-21 | keep: lc-en-tcg-xy2-021 dex=[211] |
| 1470 | og-xy2 | 22 | 번호(22) 일치 but dex# 불일치: keep=[349] vs candidate=[] | lc-en-tcg-xy2-022, lc-orphan-jp-tcg-XY2-22 | keep: lc-en-tcg-xy2-022 dex=[349] |
| 1471 | og-xy2 | 23 | 번호(23) 일치 but dex# 불일치: keep=[350] vs candidate=[] | lc-en-tcg-xy2-023, lc-orphan-jp-tcg-XY2-23 | keep: lc-en-tcg-xy2-023 dex=[350] |
| 1472 | og-xy2 | 24 | 번호(24) 일치 but dex# 불일치: keep=[363] vs candidate=[] | lc-en-tcg-xy2-024, lc-orphan-jp-tcg-XY2-24 | keep: lc-en-tcg-xy2-024 dex=[363] |
| 1473 | og-xy2 | 25 | 번호(25) 일치 but dex# 불일치: keep=[364] vs candidate=[] | lc-en-tcg-xy2-025, lc-orphan-jp-tcg-XY2-25 | keep: lc-en-tcg-xy2-025 dex=[364] |
| 1474 | og-xy2 | 26 | 번호(26) 일치 but dex# 불일치: keep=[365] vs candidate=[] | lc-en-tcg-xy2-026, lc-orphan-jp-tcg-XY2-26 | keep: lc-en-tcg-xy2-026 dex=[365] |
| 1475 | og-xy2 | 27 | 번호(27) 일치 but dex# 불일치: keep=[370] vs candidate=[] | lc-en-tcg-xy2-027, lc-orphan-jp-tcg-XY2-27 | keep: lc-en-tcg-xy2-027 dex=[370] |
| 1476 | og-xy2 | 28 | 번호(28) 일치 but dex# 불일치: keep=[418] vs candidate=[] | lc-en-tcg-xy2-028, lc-orphan-jp-tcg-XY2-28 | keep: lc-en-tcg-xy2-028 dex=[418] |
| 1477 | og-xy2 | 29 | 번호(29) 일치 but dex# 불일치: keep=[419] vs candidate=[] | lc-en-tcg-xy2-029, lc-orphan-jp-tcg-XY2-29 | keep: lc-en-tcg-xy2-029 dex=[419] |
| 1478 | og-xy2 | 31 | 번호(31) 일치 but dex# 불일치: keep=[713] vs candidate=[] | lc-en-tcg-xy2-031, lc-orphan-jp-tcg-XY2-31 | keep: lc-en-tcg-xy2-031 dex=[713] |
| 1479 | og-xy2 | 32 | 번호(32) 일치 but dex# 불일치: keep=[403] vs candidate=[] | lc-en-tcg-xy2-032, lc-orphan-jp-tcg-XY2-32 | keep: lc-en-tcg-xy2-032 dex=[403] |
| 1480 | og-xy2 | 33 | 번호(33) 일치 but dex# 불일치: keep=[404] vs candidate=[] | lc-en-tcg-xy2-033, lc-orphan-jp-tcg-XY2-33 | keep: lc-en-tcg-xy2-033 dex=[404] |
| 1481 | og-xy2 | 34 | 번호(34) 일치 but dex# 불일치: keep=[405] vs candidate=[] | lc-en-tcg-xy2-034, lc-orphan-jp-tcg-XY2-34 | keep: lc-en-tcg-xy2-034 dex=[405] |
| 1482 | og-xy2 | 35 | 번호(35) 일치 but dex# 불일치: keep=[462] vs candidate=[] | lc-en-tcg-xy2-035, lc-orphan-jp-tcg-XY2-35 | keep: lc-en-tcg-xy2-035 dex=[462] |
| 1483 | og-xy2 | 36 | 번호(36) 일치 but dex# 불일치: keep=[694] vs candidate=[] | lc-en-tcg-xy2-036, lc-orphan-jp-tcg-XY2-36 | keep: lc-en-tcg-xy2-036 dex=[694] |
| 1484 | og-xy2 | 37 | 번호(37) 일치 but dex# 불일치: keep=[695] vs candidate=[] | lc-en-tcg-xy2-037, lc-orphan-jp-tcg-XY2-37 | keep: lc-en-tcg-xy2-037 dex=[695] |
| 1485 | og-xy2 | 38 | 번호(38) 일치 but dex# 불일치: keep=[355] vs candidate=[] | lc-en-tcg-xy2-038, lc-orphan-jp-tcg-XY2-38 | keep: lc-en-tcg-xy2-038 dex=[355] |
| 1486 | og-xy2 | 40 | 번호(40) 일치 but dex# 불일치: keep=[477] vs candidate=[] | lc-en-tcg-xy2-040, lc-orphan-jp-tcg-XY2-40 | keep: lc-en-tcg-xy2-040 dex=[477] |
| 1487 | og-xy2 | 41 | 번호(41) 일치 but dex# 불일치: keep=[454] vs candidate=[] | lc-en-tcg-xy2-041, lc-orphan-jp-tcg-XY2-41 | keep: lc-en-tcg-xy2-041 dex=[454] |
| 1488 | og-xy2 | 42 | 번호(42) 일치 but dex# 불일치: keep=[677] vs candidate=[] | lc-en-tcg-xy2-042, lc-orphan-jp-tcg-XY2-42 | keep: lc-en-tcg-xy2-042 dex=[677] |
| 1489 | og-xy2 | 43 | 번호(43) 일치 but dex# 불일치: keep=[678] vs candidate=[] | lc-en-tcg-xy2-043, lc-orphan-jp-tcg-XY2-43 | keep: lc-en-tcg-xy2-043 dex=[678] |
| 1490 | og-xy2 | 44 | 번호(44) 일치 but dex# 불일치: keep=[690] vs candidate=[] | lc-en-tcg-xy2-044, lc-orphan-jp-tcg-XY2-44 | keep: lc-en-tcg-xy2-044 dex=[690] |
| 1491 | og-xy2 | 45 | 번호(45) 일치 but dex# 불일치: keep=[74] vs candidate=[] | lc-en-tcg-xy2-045, lc-orphan-jp-tcg-XY2-45 | keep: lc-en-tcg-xy2-045 dex=[74] |
| 1492 | og-xy2 | 46 | 번호(46) 일치 but dex# 불일치: keep=[75] vs candidate=[] | lc-en-tcg-xy2-046, lc-orphan-jp-tcg-XY2-46 | keep: lc-en-tcg-xy2-046 dex=[75] |
| 1493 | og-xy2 | 47 | 번호(47) 일치 but dex# 불일치: keep=[76] vs candidate=[] | lc-en-tcg-xy2-047, lc-orphan-jp-tcg-XY2-47 | keep: lc-en-tcg-xy2-047 dex=[76] |
| 1494 | og-xy2 | 50 | 번호(50) 일치 but dex# 불일치: keep=[215] vs candidate=[] | lc-en-tcg-xy2-050, lc-orphan-jp-tcg-XY2-50 | keep: lc-en-tcg-xy2-050 dex=[215] |
| 1495 | og-xy2 | 51 | 번호(51) 일치 but dex# 불일치: keep=[215] vs candidate=[] | lc-en-tcg-xy2-051, lc-orphan-jp-tcg-XY2-51 | keep: lc-en-tcg-xy2-051 dex=[215] |
| 1496 | og-xy2 | 52 | 번호(52) 일치 but dex# 불일치: keep=[461] vs candidate=[] | lc-en-tcg-xy2-052, lc-orphan-jp-tcg-XY2-52 | keep: lc-en-tcg-xy2-052 dex=[461] |
| 1497 | og-xy2 | 53 | 번호(53) 일치 but dex# 불일치: keep=[434] vs candidate=[] | lc-en-tcg-xy2-053, lc-orphan-jp-tcg-XY2-53 | keep: lc-en-tcg-xy2-053 dex=[434] |
| 1498 | og-xy2 | 54 | 번호(54) 일치 but dex# 불일치: keep=[434] vs candidate=[] | lc-en-tcg-xy2-054, lc-orphan-jp-tcg-XY2-54 | keep: lc-en-tcg-xy2-054 dex=[434] |
| 1499 | og-xy2 | 55 | 번호(55) 일치 but dex# 불일치: keep=[435] vs candidate=[] | lc-en-tcg-xy2-055, lc-orphan-jp-tcg-XY2-55 | keep: lc-en-tcg-xy2-055 dex=[435] |
| 1500 | og-xy2 | 56 | 번호(56) 일치 but dex# 불일치: keep=[551] vs candidate=[] | lc-en-tcg-xy2-056, lc-orphan-jp-tcg-XY2-56 | keep: lc-en-tcg-xy2-056 dex=[551] |
| 1501 | og-xy2 | 57 | 번호(57) 일치 but dex# 불일치: keep=[552] vs candidate=[] | lc-en-tcg-xy2-057, lc-orphan-jp-tcg-XY2-57 | keep: lc-en-tcg-xy2-057 dex=[552] |
| 1502 | og-xy2 | 61 | 번호(61) 일치 but dex# 불일치: keep=[632] vs candidate=[] | lc-en-tcg-xy2-061, lc-orphan-jp-tcg-XY2-61 | keep: lc-en-tcg-xy2-061 dex=[632] |
| 1503 | og-xy2 | 62 | 번호(62) 일치 but dex# 불일치: keep=[669] vs candidate=[] | lc-en-tcg-xy2-062, lc-orphan-jp-tcg-XY2-62 | keep: lc-en-tcg-xy2-062 dex=[669] |
| 1504 | og-xy2 | 63 | 번호(63) 일치 but dex# 불일치: keep=[669] vs candidate=[] | lc-en-tcg-xy2-063, lc-orphan-jp-tcg-XY2-63 | keep: lc-en-tcg-xy2-063 dex=[669] |
| 1505 | og-xy2 | 64 | 번호(64) 일치 but dex# 불일치: keep=[670] vs candidate=[] | lc-en-tcg-xy2-064, lc-orphan-jp-tcg-XY2-64 | keep: lc-en-tcg-xy2-064 dex=[670] |
| 1506 | og-xy2 | 66 | 번호(66) 일치 but dex# 불일치: keep=[671] vs candidate=[] | lc-en-tcg-xy2-066, lc-orphan-jp-tcg-XY2-66 | keep: lc-en-tcg-xy2-066 dex=[671] |
| 1507 | og-xy2 | 67 | 번호(67) 일치 but dex# 불일치: keep=[682] vs candidate=[] | lc-en-tcg-xy2-067, lc-orphan-jp-tcg-XY2-67 | keep: lc-en-tcg-xy2-067 dex=[682] |
| 1508 | og-xy2 | 68 | 번호(68) 일치 but dex# 불일치: keep=[703] vs candidate=[] | lc-en-tcg-xy2-068, lc-orphan-jp-tcg-XY2-68 | keep: lc-en-tcg-xy2-068 dex=[703] |
| 1509 | og-xy2 | 71 | 번호(71) 일치 but dex# 불일치: keep=[691] vs candidate=[] | lc-en-tcg-xy2-071, lc-orphan-jp-tcg-XY2-71 | keep: lc-en-tcg-xy2-071 dex=[691] |
| 1510 | og-xy2 | 72 | 번호(72) 일치 but dex# 불일치: keep=[704] vs candidate=[] | lc-en-tcg-xy2-072, lc-orphan-jp-tcg-XY2-72 | keep: lc-en-tcg-xy2-072 dex=[704] |
| 1511 | og-xy2 | 73 | 번호(73) 일치 but dex# 불일치: keep=[705] vs candidate=[] | lc-en-tcg-xy2-073, lc-orphan-jp-tcg-XY2-73 | keep: lc-en-tcg-xy2-073 dex=[705] |
| 1512 | og-xy2 | 74 | 번호(74) 일치 but dex# 불일치: keep=[706] vs candidate=[] | lc-en-tcg-xy2-074, lc-orphan-jp-tcg-XY2-74 | keep: lc-en-tcg-xy2-074 dex=[706] |
| 1513 | og-xy2 | 75 | 번호(75) 일치 but dex# 불일치: keep=[16] vs candidate=[] | lc-en-tcg-xy2-075, lc-orphan-jp-tcg-XY2-75 | keep: lc-en-tcg-xy2-075 dex=[16] |
| 1514 | og-xy2 | 76 | 번호(76) 일치 but dex# 불일치: keep=[17] vs candidate=[] | lc-en-tcg-xy2-076, lc-orphan-jp-tcg-XY2-76 | keep: lc-en-tcg-xy2-076 dex=[17] |
| 1515 | og-xy2 | 77 | 번호(77) 일치 but dex# 불일치: keep=[18] vs candidate=[] | lc-en-tcg-xy2-077, lc-orphan-jp-tcg-XY2-77 | keep: lc-en-tcg-xy2-077 dex=[18] |
| 1516 | og-xy2 | 78 | 번호(78) 일치 but dex# 불일치: keep=[115] vs candidate=[] | lc-en-tcg-xy2-078, lc-orphan-jp-tcg-XY2-78 | keep: lc-en-tcg-xy2-078 dex=[115] |
| 1517 | og-xy2 | 81 | 번호(81) 일치 but dex# 불일치: keep=[161] vs candidate=[] | lc-en-tcg-xy2-081, lc-orphan-jp-tcg-XY2-81 | keep: lc-en-tcg-xy2-081 dex=[161] |
| 1518 | og-xy2 | 82 | 번호(82) 일치 but dex# 불일치: keep=[162] vs candidate=[] | lc-en-tcg-xy2-082, lc-orphan-jp-tcg-XY2-82 | keep: lc-en-tcg-xy2-082 dex=[162] |
| 1519 | og-xy2 | 83 | 번호(83) 일치 but dex# 불일치: keep=[241] vs candidate=[] | lc-en-tcg-xy2-083, lc-orphan-jp-tcg-XY2-83 | keep: lc-en-tcg-xy2-083 dex=[241] |
| 1520 | og-xy2 | 84 | 번호(84) 일치 but dex# 불일치: keep=[427] vs candidate=[] | lc-en-tcg-xy2-084, lc-orphan-jp-tcg-XY2-84 | keep: lc-en-tcg-xy2-084 dex=[427] |
| 1521 | og-xy2 | 85 | 번호(85) 일치 but dex# 불일치: keep=[428] vs candidate=[] | lc-en-tcg-xy2-085, lc-orphan-jp-tcg-XY2-85 | keep: lc-en-tcg-xy2-085 dex=[428] |
| 1522 | og-xy2 | 86 | 번호(86) 일치 but dex# 불일치: keep=[661] vs candidate=[] | lc-en-tcg-xy2-086, lc-orphan-jp-tcg-XY2-86 | keep: lc-en-tcg-xy2-086 dex=[661] |
| 1523 | og-xy2 | 87 | 번호(87) 일치 but dex# 불일치: keep=[676] vs candidate=[] | lc-en-tcg-xy2-087, lc-orphan-jp-tcg-XY2-87 | keep: lc-en-tcg-xy2-087 dex=[676] |
| 1524 | og-xy2 | 6 | 번호(6) 일치 but dex# 불일치: keep=[274] vs candidate=[] | lc-en-tcg-xy2-006, lc-orphan-jp-tcg-XY2-6 | keep: lc-en-tcg-xy2-006 dex=[274] |
| 1525 | og-xy2 | 7 | 번호(7) 일치 but dex# 불일치: keep=[275] vs candidate=[] | lc-en-tcg-xy2-007, lc-orphan-jp-tcg-XY2-7 | keep: lc-en-tcg-xy2-007 dex=[275] |
| 1526 | og-xy2 | 17 | 번호(17) 일치 but dex# 불일치: keep=[662] vs candidate=[] | lc-en-tcg-xy2-017, lc-orphan-jp-tcg-XY2-17 | keep: lc-en-tcg-xy2-017 dex=[662] |
| 1527 | og-xy2 | 19 | 번호(19) 일치 but dex# 불일치: keep=[667] vs candidate=[] | lc-en-tcg-xy2-019, lc-orphan-jp-tcg-XY2-19 | keep: lc-en-tcg-xy2-019 dex=[667] |
| 1528 | og-xy2 | 48 | 번호(48) 일치 but dex# 불일치: keep=[688] vs candidate=[] | lc-en-tcg-xy2-048, lc-orphan-jp-tcg-XY2-48 | keep: lc-en-tcg-xy2-048 dex=[688] |
| 1529 | og-xy2 | 58 | 번호(58) 일치 but dex# 불일치: keep=[559] vs candidate=[] | lc-en-tcg-xy2-058, lc-orphan-jp-tcg-XY2-58 | keep: lc-en-tcg-xy2-058 dex=[559] |
| 1530 | og-xy2 | 59 | 번호(59) 일치 but dex# 불일치: keep=[560] vs candidate=[] | lc-en-tcg-xy2-059, lc-orphan-jp-tcg-XY2-59 | keep: lc-en-tcg-xy2-059 dex=[560] |
| 1531 | og-xy2 | 8 | 번호(8) 일치 but dex# 불일치: keep=[315] vs candidate=[] | lc-en-tcg-xy2-008, lc-orphan-jp-tcg-XY2-8 | keep: lc-en-tcg-xy2-008 dex=[315] |
| 1532 | og-xy2 | 20 | 번호(20) 일치 but dex# 불일치: keep=[668] vs candidate=[] | lc-en-tcg-xy2-020, lc-orphan-jp-tcg-XY2-20 | keep: lc-en-tcg-xy2-020 dex=[668] |
| 1533 | og-xy2 | 30 | 번호(30) 일치 but dex# 불일치: keep=[712] vs candidate=[] | lc-en-tcg-xy2-030, lc-orphan-jp-tcg-XY2-30 | keep: lc-en-tcg-xy2-030 dex=[712] |
| 1534 | og-xy2 | 39 | 번호(39) 일치 but dex# 불일치: keep=[356] vs candidate=[] | lc-en-tcg-xy2-039, lc-orphan-jp-tcg-XY2-39 | keep: lc-en-tcg-xy2-039 dex=[356] |
| 1535 | og-xy2 | 49 | 번호(49) 일치 but dex# 불일치: keep=[689] vs candidate=[] | lc-en-tcg-xy2-049, lc-orphan-jp-tcg-XY2-49 | keep: lc-en-tcg-xy2-049 dex=[689] |
| 1536 | og-xy2 | 60 | 번호(60) 일치 but dex# 불일치: keep=[205] vs candidate=[] | lc-en-tcg-xy2-060, lc-orphan-jp-tcg-XY2-60 | keep: lc-en-tcg-xy2-060 dex=[205] |
| 1537 | og-xy2 | 65 | 번호(65) 일치 but dex# 불일치: keep=[670] vs candidate=[] | lc-en-tcg-xy2-065, lc-orphan-jp-tcg-XY2-65 | keep: lc-en-tcg-xy2-065 dex=[670] |
| 1538 | og-xy2 | 70 | 번호(70) 일치 but dex# 불일치: keep=[621] vs candidate=[] | lc-en-tcg-xy2-070, lc-orphan-jp-tcg-XY2-70 | keep: lc-en-tcg-xy2-070 dex=[621] |
| 1539 | og-xy2 | 79 | 번호(79) 일치 but dex# 불일치: keep=[115] vs candidate=[] | lc-en-tcg-xy2-079, lc-orphan-jp-tcg-XY2-79 | keep: lc-en-tcg-xy2-079 dex=[115] |
| 1540 | og-xy2 | 80 | 번호(80) 일치 but dex# 불일치: keep=[143] vs candidate=[] | lc-en-tcg-xy2-080, lc-orphan-jp-tcg-XY2-80 | keep: lc-en-tcg-xy2-080 dex=[143] |
| 1541 | og-xy2 | 77 | 번호(77) 일치 but dex# 불일치: keep=[18] vs candidate=[] | lc-orphan-jp-tcg-XY2-77 | keep: lc-orphan-jp-tcg-XY2-77 dex=[18] |
| 1542 | og-xy2 | 79 | 번호(79) 일치 but dex# 불일치: keep=[115] vs candidate=[] | lc-orphan-jp-tcg-XY2-79 | keep: lc-orphan-jp-tcg-XY2-79 dex=[115] |
| 1543 | og-xy2 | 80 | 번호(80) 일치 but dex# 불일치: keep=[143] vs candidate=[] | lc-orphan-jp-tcg-XY2-80 | keep: lc-orphan-jp-tcg-XY2-80 dex=[143] |
| 1544 | og-xy2 | 86 | 번호(86) 일치 but dex# 불일치: keep=[661] vs candidate=[] | lc-orphan-jp-tcg-XY2-86 | keep: lc-orphan-jp-tcg-XY2-86 dex=[661] |
| 1545 | og-xy2 | 11 | 번호(11) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-orphan-jp-tcg-XY2-11 | keep: lc-orphan-jp-tcg-XY2-11 dex=[6] |
| 1546 | og-xy2 | 1 | 번호(1) 일치 but dex# 불일치: keep=[10] vs candidate=[] | lc-orphan-jp-tcg-XY2-1 | keep: lc-orphan-jp-tcg-XY2-1 dex=[10] |
| 1547 | og-xy2 | 10 | 번호(10) 일치 but dex# 불일치: keep=[556] vs candidate=[] | lc-orphan-jp-tcg-XY2-10 | keep: lc-orphan-jp-tcg-XY2-10 dex=[556] |
| 1548 | og-xy2 | 14 | 번호(14) 일치 but dex# 불일치: keep=[77] vs candidate=[] | lc-orphan-jp-tcg-XY2-14 | keep: lc-orphan-jp-tcg-XY2-14 dex=[77] |
| 1549 | og-xy2 | 15 | 번호(15) 일치 but dex# 불일치: keep=[78] vs candidate=[] | lc-orphan-jp-tcg-XY2-15 | keep: lc-orphan-jp-tcg-XY2-15 dex=[78] |
| 1550 | og-xy2 | 16 | 번호(16) 일치 but dex# 불일치: keep=[324] vs candidate=[] | lc-orphan-jp-tcg-XY2-16 | keep: lc-orphan-jp-tcg-XY2-16 dex=[324] |
| 1551 | og-xy2 | 17 | 번호(17) 일치 but dex# 불일치: keep=[662] vs candidate=[] | lc-orphan-jp-tcg-XY2-17 | keep: lc-orphan-jp-tcg-XY2-17 dex=[662] |
| 1552 | og-xy2 | 19 | 번호(19) 일치 but dex# 불일치: keep=[667] vs candidate=[] | lc-orphan-jp-tcg-XY2-19 | keep: lc-orphan-jp-tcg-XY2-19 dex=[667] |
| 1553 | og-xy2 | 21 | 번호(21) 일치 but dex# 불일치: keep=[211] vs candidate=[] | lc-orphan-jp-tcg-XY2-21 | keep: lc-orphan-jp-tcg-XY2-21 dex=[211] |
| 1554 | og-xy2 | 22 | 번호(22) 일치 but dex# 불일치: keep=[349] vs candidate=[] | lc-orphan-jp-tcg-XY2-22 | keep: lc-orphan-jp-tcg-XY2-22 dex=[349] |
| 1555 | og-xy2 | 24 | 번호(24) 일치 but dex# 불일치: keep=[363] vs candidate=[] | lc-orphan-jp-tcg-XY2-24 | keep: lc-orphan-jp-tcg-XY2-24 dex=[363] |
| 1556 | og-xy2 | 25 | 번호(25) 일치 but dex# 불일치: keep=[364] vs candidate=[] | lc-orphan-jp-tcg-XY2-25 | keep: lc-orphan-jp-tcg-XY2-25 dex=[364] |
| 1557 | og-xy2 | 38 | 번호(38) 일치 but dex# 불일치: keep=[355] vs candidate=[] | lc-orphan-jp-tcg-XY2-38 | keep: lc-orphan-jp-tcg-XY2-38 dex=[355] |
| 1558 | og-xy2 | 27 | 번호(27) 일치 but dex# 불일치: keep=[370] vs candidate=[] | lc-orphan-jp-tcg-XY2-27 | keep: lc-orphan-jp-tcg-XY2-27 dex=[370] |
| 1559 | og-xy2 | 28 | 번호(28) 일치 but dex# 불일치: keep=[418] vs candidate=[] | lc-orphan-jp-tcg-XY2-28 | keep: lc-orphan-jp-tcg-XY2-28 dex=[418] |
| 1560 | og-xy2 | 29 | 번호(29) 일치 but dex# 불일치: keep=[419] vs candidate=[] | lc-orphan-jp-tcg-XY2-29 | keep: lc-orphan-jp-tcg-XY2-29 dex=[419] |
| 1561 | og-xy2 | 30 | 번호(30) 일치 but dex# 불일치: keep=[712] vs candidate=[] | lc-orphan-jp-tcg-XY2-30 | keep: lc-orphan-jp-tcg-XY2-30 dex=[712] |
| 1562 | og-xy2 | 31 | 번호(31) 일치 but dex# 불일치: keep=[713] vs candidate=[] | lc-orphan-jp-tcg-XY2-31 | keep: lc-orphan-jp-tcg-XY2-31 dex=[713] |
| 1563 | og-xy2 | 6 | 번호(6) 일치 but dex# 불일치: keep=[274] vs candidate=[] | lc-orphan-jp-tcg-XY2-6 | keep: lc-orphan-jp-tcg-XY2-6 dex=[274] |
| 1564 | og-xy2 | 33 | 번호(33) 일치 but dex# 불일치: keep=[404] vs candidate=[] | lc-orphan-jp-tcg-XY2-33 | keep: lc-orphan-jp-tcg-XY2-33 dex=[404] |
| 1565 | og-xy2 | 34 | 번호(34) 일치 but dex# 불일치: keep=[405] vs candidate=[] | lc-orphan-jp-tcg-XY2-34 | keep: lc-orphan-jp-tcg-XY2-34 dex=[405] |
| 1566 | og-xy2 | 35 | 번호(35) 일치 but dex# 불일치: keep=[462] vs candidate=[] | lc-orphan-jp-tcg-XY2-35 | keep: lc-orphan-jp-tcg-XY2-35 dex=[462] |
| 1567 | og-xy2 | 36 | 번호(36) 일치 but dex# 불일치: keep=[694] vs candidate=[] | lc-orphan-jp-tcg-XY2-36 | keep: lc-orphan-jp-tcg-XY2-36 dex=[694] |
| 1568 | og-xy2 | 37 | 번호(37) 일치 but dex# 불일치: keep=[695] vs candidate=[] | lc-orphan-jp-tcg-XY2-37 | keep: lc-orphan-jp-tcg-XY2-37 dex=[695] |
| 1569 | og-xy2 | 40 | 번호(40) 일치 but dex# 불일치: keep=[477] vs candidate=[] | lc-orphan-jp-tcg-XY2-40 | keep: lc-orphan-jp-tcg-XY2-40 dex=[477] |
| 1570 | og-xy2 | 42 | 번호(42) 일치 but dex# 불일치: keep=[677] vs candidate=[] | lc-orphan-jp-tcg-XY2-42 | keep: lc-orphan-jp-tcg-XY2-42 dex=[677] |
| 1571 | og-xy2 | 43 | 번호(43) 일치 but dex# 불일치: keep=[678] vs candidate=[] | lc-orphan-jp-tcg-XY2-43 | keep: lc-orphan-jp-tcg-XY2-43 dex=[678] |
| 1572 | og-xy2 | 44 | 번호(44) 일치 but dex# 불일치: keep=[690] vs candidate=[] | lc-orphan-jp-tcg-XY2-44 | keep: lc-orphan-jp-tcg-XY2-44 dex=[690] |
| 1573 | og-xy2 | 45 | 번호(45) 일치 but dex# 불일치: keep=[74] vs candidate=[] | lc-orphan-jp-tcg-XY2-45 | keep: lc-orphan-jp-tcg-XY2-45 dex=[74] |
| 1574 | og-xy2 | 47 | 번호(47) 일치 but dex# 불일치: keep=[76] vs candidate=[] | lc-orphan-jp-tcg-XY2-47 | keep: lc-orphan-jp-tcg-XY2-47 dex=[76] |
| 1575 | og-xy2 | 48 | 번호(48) 일치 but dex# 불일치: keep=[688] vs candidate=[] | lc-orphan-jp-tcg-XY2-48 | keep: lc-orphan-jp-tcg-XY2-48 dex=[688] |
| 1576 | og-xy2 | 49 | 번호(49) 일치 but dex# 불일치: keep=[689] vs candidate=[] | lc-orphan-jp-tcg-XY2-49 | keep: lc-orphan-jp-tcg-XY2-49 dex=[689] |
| 1577 | og-xy2 | 50 | 번호(50) 일치 but dex# 불일치: keep=[215] vs candidate=[] | lc-orphan-jp-tcg-XY2-50 | keep: lc-orphan-jp-tcg-XY2-50 dex=[215] |
| 1578 | og-xy2 | 51 | 번호(51) 일치 but dex# 불일치: keep=[215] vs candidate=[] | lc-orphan-jp-tcg-XY2-51 | keep: lc-orphan-jp-tcg-XY2-51 dex=[215] |
| 1579 | og-xy2 | 55 | 번호(55) 일치 but dex# 불일치: keep=[435] vs candidate=[] | lc-orphan-jp-tcg-XY2-55 | keep: lc-orphan-jp-tcg-XY2-55 dex=[435] |
| 1580 | og-xy2 | 57 | 번호(57) 일치 but dex# 불일치: keep=[552] vs candidate=[] | lc-orphan-jp-tcg-XY2-57 | keep: lc-orphan-jp-tcg-XY2-57 dex=[552] |
| 1581 | og-xy2 | 58 | 번호(58) 일치 but dex# 불일치: keep=[559] vs candidate=[] | lc-orphan-jp-tcg-XY2-58 | keep: lc-orphan-jp-tcg-XY2-58 dex=[559] |
| 1582 | og-xy2 | 59 | 번호(59) 일치 but dex# 불일치: keep=[560] vs candidate=[] | lc-orphan-jp-tcg-XY2-59 | keep: lc-orphan-jp-tcg-XY2-59 dex=[560] |
| 1583 | og-xy2 | 61 | 번호(61) 일치 but dex# 불일치: keep=[632] vs candidate=[] | lc-orphan-jp-tcg-XY2-61 | keep: lc-orphan-jp-tcg-XY2-61 dex=[632] |
| 1584 | og-xy2 | 62 | 번호(62) 일치 but dex# 불일치: keep=[669] vs candidate=[] | lc-orphan-jp-tcg-XY2-62 | keep: lc-orphan-jp-tcg-XY2-62 dex=[669] |
| 1585 | og-xy2 | 63 | 번호(63) 일치 but dex# 불일치: keep=[669] vs candidate=[] | lc-orphan-jp-tcg-XY2-63 | keep: lc-orphan-jp-tcg-XY2-63 dex=[669] |
| 1586 | og-xy2 | 64 | 번호(64) 일치 but dex# 불일치: keep=[670] vs candidate=[] | lc-orphan-jp-tcg-XY2-64 | keep: lc-orphan-jp-tcg-XY2-64 dex=[670] |
| 1587 | og-xy2 | 66 | 번호(66) 일치 but dex# 불일치: keep=[671] vs candidate=[] | lc-orphan-jp-tcg-XY2-66 | keep: lc-orphan-jp-tcg-XY2-66 dex=[671] |
| 1588 | og-xy2 | 67 | 번호(67) 일치 but dex# 불일치: keep=[682] vs candidate=[] | lc-orphan-jp-tcg-XY2-67 | keep: lc-orphan-jp-tcg-XY2-67 dex=[682] |
| 1589 | og-xy2 | 69 | 번호(69) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-orphan-jp-tcg-XY2-69 | keep: lc-orphan-jp-tcg-XY2-69 dex=[6] |
| 1590 | og-xy2 | 70 | 번호(70) 일치 but dex# 불일치: keep=[621] vs candidate=[] | lc-orphan-jp-tcg-XY2-70 | keep: lc-orphan-jp-tcg-XY2-70 dex=[621] |
| 1591 | og-xy2 | 72 | 번호(72) 일치 but dex# 불일치: keep=[704] vs candidate=[] | lc-orphan-jp-tcg-XY2-72 | keep: lc-orphan-jp-tcg-XY2-72 dex=[704] |
| 1592 | og-xy2 | 73 | 번호(73) 일치 but dex# 불일치: keep=[705] vs candidate=[] | lc-orphan-jp-tcg-XY2-73 | keep: lc-orphan-jp-tcg-XY2-73 dex=[705] |
| 1593 | og-xy2 | 75 | 번호(75) 일치 but dex# 불일치: keep=[16] vs candidate=[] | lc-orphan-jp-tcg-XY2-75 | keep: lc-orphan-jp-tcg-XY2-75 dex=[16] |
| 1594 | og-xy2 | 78 | 번호(78) 일치 but dex# 불일치: keep=[115] vs candidate=[] | lc-orphan-jp-tcg-XY2-78 | keep: lc-orphan-jp-tcg-XY2-78 dex=[115] |
| 1595 | og-xy2 | 81 | 번호(81) 일치 but dex# 불일치: keep=[161] vs candidate=[] | lc-orphan-jp-tcg-XY2-81 | keep: lc-orphan-jp-tcg-XY2-81 dex=[161] |
| 1596 | og-xy2 | 83 | 번호(83) 일치 but dex# 불일치: keep=[241] vs candidate=[] | lc-orphan-jp-tcg-XY2-83 | keep: lc-orphan-jp-tcg-XY2-83 dex=[241] |
| 1597 | og-xy2 | 84 | 번호(84) 일치 but dex# 불일치: keep=[427] vs candidate=[] | lc-orphan-jp-tcg-XY2-84 | keep: lc-orphan-jp-tcg-XY2-84 dex=[427] |
| 1598 | og-xy2 | 85 | 번호(85) 일치 but dex# 불일치: keep=[428] vs candidate=[] | lc-orphan-jp-tcg-XY2-85 | keep: lc-orphan-jp-tcg-XY2-85 dex=[428] |
| 1599 | og-xy2 | 3 | 번호(3) 일치 but dex# 불일치: keep=[12] vs candidate=[] | lc-orphan-jp-tcg-XY2-3 | keep: lc-orphan-jp-tcg-XY2-3 dex=[12] |
| 1600 | og-xy2 | 4 | 번호(4) 일치 but dex# 불일치: keep=[204] vs candidate=[] | lc-orphan-jp-tcg-XY2-4 | keep: lc-orphan-jp-tcg-XY2-4 dex=[204] |
| 1601 | og-xy2 | 5 | 번호(5) 일치 but dex# 불일치: keep=[273] vs candidate=[] | lc-orphan-jp-tcg-XY2-5 | keep: lc-orphan-jp-tcg-XY2-5 dex=[273] |
| 1602 | og-xy2 | 7 | 번호(7) 일치 but dex# 불일치: keep=[275] vs candidate=[] | lc-orphan-jp-tcg-XY2-7 | keep: lc-orphan-jp-tcg-XY2-7 dex=[275] |
| 1603 | og-xy2 | 8 | 번호(8) 일치 but dex# 불일치: keep=[315] vs candidate=[] | lc-orphan-jp-tcg-XY2-8 | keep: lc-orphan-jp-tcg-XY2-8 dex=[315] |
| 1604 | og-xy2 | 9 | 번호(9) 일치 but dex# 불일치: keep=[407] vs candidate=[] | lc-orphan-jp-tcg-XY2-9 | keep: lc-orphan-jp-tcg-XY2-9 dex=[407] |
| 1605 | og-xy2 | 12 | 번호(12) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-orphan-jp-tcg-XY2-12 | keep: lc-orphan-jp-tcg-XY2-12 dex=[6] |
| 1606 | og-xy2 | 18 | 번호(18) 일치 but dex# 불일치: keep=[667] vs candidate=[] | lc-orphan-jp-tcg-XY2-18 | keep: lc-orphan-jp-tcg-XY2-18 dex=[667] |
| 1607 | og-xy2 | 20 | 번호(20) 일치 but dex# 불일치: keep=[668] vs candidate=[] | lc-orphan-jp-tcg-XY2-20 | keep: lc-orphan-jp-tcg-XY2-20 dex=[668] |
| 1608 | og-xy2 | 23 | 번호(23) 일치 but dex# 불일치: keep=[350] vs candidate=[] | lc-orphan-jp-tcg-XY2-23 | keep: lc-orphan-jp-tcg-XY2-23 dex=[350] |
| 1609 | og-xy2 | 32 | 번호(32) 일치 but dex# 불일치: keep=[403] vs candidate=[] | lc-orphan-jp-tcg-XY2-32 | keep: lc-orphan-jp-tcg-XY2-32 dex=[403] |
| 1610 | og-xy2 | 41 | 번호(41) 일치 but dex# 불일치: keep=[454] vs candidate=[] | lc-orphan-jp-tcg-XY2-41 | keep: lc-orphan-jp-tcg-XY2-41 dex=[454] |
| 1611 | og-xy2 | 46 | 번호(46) 일치 but dex# 불일치: keep=[75] vs candidate=[] | lc-orphan-jp-tcg-XY2-46 | keep: lc-orphan-jp-tcg-XY2-46 dex=[75] |
| 1612 | og-xy2 | 52 | 번호(52) 일치 but dex# 불일치: keep=[461] vs candidate=[] | lc-orphan-jp-tcg-XY2-52 | keep: lc-orphan-jp-tcg-XY2-52 dex=[461] |
| 1613 | og-xy2 | 53 | 번호(53) 일치 but dex# 불일치: keep=[434] vs candidate=[] | lc-orphan-jp-tcg-XY2-53 | keep: lc-orphan-jp-tcg-XY2-53 dex=[434] |
| 1614 | og-xy2 | 56 | 번호(56) 일치 but dex# 불일치: keep=[551] vs candidate=[] | lc-orphan-jp-tcg-XY2-56 | keep: lc-orphan-jp-tcg-XY2-56 dex=[551] |
| 1615 | og-xy2 | 60 | 번호(60) 일치 but dex# 불일치: keep=[205] vs candidate=[] | lc-orphan-jp-tcg-XY2-60 | keep: lc-orphan-jp-tcg-XY2-60 dex=[205] |
| 1616 | og-xy2 | 65 | 번호(65) 일치 but dex# 불일치: keep=[670] vs candidate=[] | lc-orphan-jp-tcg-XY2-65 | keep: lc-orphan-jp-tcg-XY2-65 dex=[670] |
| 1617 | og-xy2 | 71 | 번호(71) 일치 but dex# 불일치: keep=[691] vs candidate=[] | lc-orphan-jp-tcg-XY2-71 | keep: lc-orphan-jp-tcg-XY2-71 dex=[691] |
| 1618 | og-xy2 | 74 | 번호(74) 일치 but dex# 불일치: keep=[706] vs candidate=[] | lc-orphan-jp-tcg-XY2-74 | keep: lc-orphan-jp-tcg-XY2-74 dex=[706] |
| 1619 | og-xy2 | 76 | 번호(76) 일치 but dex# 불일치: keep=[17] vs candidate=[] | lc-orphan-jp-tcg-XY2-76 | keep: lc-orphan-jp-tcg-XY2-76 dex=[17] |
| 1620 | og-xy2 | 82 | 번호(82) 일치 but dex# 불일치: keep=[162] vs candidate=[] | lc-orphan-jp-tcg-XY2-82 | keep: lc-orphan-jp-tcg-XY2-82 dex=[162] |
| 1621 | og-xy2 | 87 | 번호(87) 일치 but dex# 불일치: keep=[676] vs candidate=[] | lc-orphan-jp-tcg-XY2-87 | keep: lc-orphan-jp-tcg-XY2-87 dex=[676] |
| 1622 | og-xy2 | 13 | 번호(13) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-orphan-jp-tcg-XY2-13 | keep: lc-orphan-jp-tcg-XY2-13 dex=[6] |
| 1623 | og-xy2 | 39 | 번호(39) 일치 but dex# 불일치: keep=[356] vs candidate=[] | lc-orphan-jp-tcg-XY2-39 | keep: lc-orphan-jp-tcg-XY2-39 dex=[356] |
| 1624 | og-xy2 | 54 | 번호(54) 일치 but dex# 불일치: keep=[434] vs candidate=[] | lc-orphan-jp-tcg-XY2-54 | keep: lc-orphan-jp-tcg-XY2-54 dex=[434] |
| 1625 | og-xy2 | 68 | 번호(68) 일치 but dex# 불일치: keep=[703] vs candidate=[] | lc-orphan-jp-tcg-XY2-68 | keep: lc-orphan-jp-tcg-XY2-68 dex=[703] |
| 1626 | og-xy2 | 2 | 번호(2) 일치 but dex# 불일치: keep=[11] vs candidate=[] | lc-orphan-jp-tcg-XY2-2 | keep: lc-orphan-jp-tcg-XY2-2 dex=[11] |
| 1627 | og-xy2 | 26 | 번호(26) 일치 but dex# 불일치: keep=[365] vs candidate=[] | lc-orphan-jp-tcg-XY2-26 | keep: lc-orphan-jp-tcg-XY2-26 dex=[365] |
| 1628 | og-xy3 | 1 | 번호(1) 일치 but dex# 불일치: keep=[69] vs candidate=[] | lc-en-tcg-xy3-001, lc-orphan-jp-tcg-XY3-1 | keep: lc-en-tcg-xy3-001 dex=[69] |
| 1629 | og-xy3 | 4 | 번호(4) 일치 but dex# 불일치: keep=[214] vs candidate=[] | lc-en-tcg-xy3-004, lc-orphan-jp-tcg-XY3-4 | keep: lc-en-tcg-xy3-004 dex=[214] |
| 1630 | og-xy3 | 5 | 번호(5) 일치 but dex# 불일치: keep=[214] vs candidate=[] | lc-en-tcg-xy3-005, lc-orphan-jp-tcg-XY3-5 | keep: lc-en-tcg-xy3-005 dex=[214] |
| 1631 | og-xy3 | 6 | 번호(6) 일치 but dex# 불일치: keep=[285] vs candidate=[] | lc-en-tcg-xy3-006, lc-orphan-jp-tcg-XY3-6 | keep: lc-en-tcg-xy3-006 dex=[285] |
| 1632 | og-xy3 | 7 | 번호(7) 일치 but dex# 불일치: keep=[470] vs candidate=[] | lc-en-tcg-xy3-007, lc-orphan-jp-tcg-XY3-7 | keep: lc-en-tcg-xy3-007 dex=[470] |
| 1633 | og-xy3 | 8 | 번호(8) 일치 but dex# 불일치: keep=[616] vs candidate=[] | lc-en-tcg-xy3-008, lc-orphan-jp-tcg-XY3-8 | keep: lc-en-tcg-xy3-008 dex=[616] |
| 1634 | og-xy3 | 9 | 번호(9) 일치 but dex# 불일치: keep=[617] vs candidate=[] | lc-en-tcg-xy3-009, lc-orphan-jp-tcg-XY3-9 | keep: lc-en-tcg-xy3-009 dex=[617] |
| 1635 | og-xy3 | 10 | 번호(10) 일치 but dex# 불일치: keep=[126] vs candidate=[] | lc-en-tcg-xy3-010, lc-orphan-jp-tcg-XY3-10 | keep: lc-en-tcg-xy3-010 dex=[126] |
| 1636 | og-xy3 | 29 | 번호(29) 일치 but dex# 불일치: keep=[125] vs candidate=[] | lc-en-tcg-xy3-029, lc-orphan-jp-tcg-XY3-29 | keep: lc-en-tcg-xy3-029 dex=[125] |
| 1637 | og-xy3 | 12 | 번호(12) 일치 but dex# 불일치: keep=[255] vs candidate=[] | lc-en-tcg-xy3-012, lc-orphan-jp-tcg-XY3-12 | keep: lc-en-tcg-xy3-012 dex=[255] |
| 1638 | og-xy3 | 13 | 번호(13) 일치 but dex# 불일치: keep=[256] vs candidate=[] | lc-en-tcg-xy3-013, lc-orphan-jp-tcg-XY3-13 | keep: lc-en-tcg-xy3-013 dex=[256] |
| 1639 | og-xy3 | 14 | 번호(14) 일치 but dex# 불일치: keep=[257] vs candidate=[] | lc-en-tcg-xy3-014, lc-orphan-jp-tcg-XY3-14 | keep: lc-en-tcg-xy3-014 dex=[257] |
| 1640 | og-xy3 | 15 | 번호(15) 일치 but dex# 불일치: keep=[60] vs candidate=[] | lc-en-tcg-xy3-015, lc-orphan-jp-tcg-XY3-15 | keep: lc-en-tcg-xy3-015 dex=[60] |
| 1641 | og-xy3 | 16 | 번호(16) 일치 but dex# 불일치: keep=[61] vs candidate=[] | lc-en-tcg-xy3-016, lc-orphan-jp-tcg-XY3-16 | keep: lc-en-tcg-xy3-016 dex=[61] |
| 1642 | og-xy3 | 17 | 번호(17) 일치 but dex# 불일치: keep=[62] vs candidate=[] | lc-en-tcg-xy3-017, lc-orphan-jp-tcg-XY3-17 | keep: lc-en-tcg-xy3-017 dex=[62] |
| 1643 | og-xy3 | 18 | 번호(18) 일치 but dex# 불일치: keep=[186] vs candidate=[] | lc-en-tcg-xy3-018, lc-orphan-jp-tcg-XY3-18 | keep: lc-en-tcg-xy3-018 dex=[186] |
| 1644 | og-xy3 | 19 | 번호(19) 일치 but dex# 불일치: keep=[471] vs candidate=[] | lc-en-tcg-xy3-019, lc-orphan-jp-tcg-XY3-19 | keep: lc-en-tcg-xy3-019 dex=[471] |
| 1645 | og-xy3 | 21 | 번호(21) 일치 but dex# 불일치: keep=[613] vs candidate=[] | lc-en-tcg-xy3-021, lc-orphan-jp-tcg-XY3-21 | keep: lc-en-tcg-xy3-021 dex=[613] |
| 1646 | og-xy3 | 22 | 번호(22) 일치 but dex# 불일치: keep=[614] vs candidate=[] | lc-en-tcg-xy3-022, lc-orphan-jp-tcg-XY3-22 | keep: lc-en-tcg-xy3-022 dex=[614] |
| 1647 | og-xy3 | 23 | 번호(23) 일치 but dex# 불일치: keep=[692] vs candidate=[] | lc-en-tcg-xy3-023, lc-orphan-jp-tcg-XY3-23 | keep: lc-en-tcg-xy3-023 dex=[692] |
| 1648 | og-xy3 | 24 | 번호(24) 일치 but dex# 불일치: keep=[693] vs candidate=[] | lc-en-tcg-xy3-024, lc-orphan-jp-tcg-XY3-24 | keep: lc-en-tcg-xy3-024 dex=[693] |
| 1649 | og-xy3 | 25 | 번호(25) 일치 but dex# 불일치: keep=[698] vs candidate=[] | lc-en-tcg-xy3-025, lc-orphan-jp-tcg-XY3-25 | keep: lc-en-tcg-xy3-025 dex=[698] |
| 1650 | og-xy3 | 26 | 번호(26) 일치 but dex# 불일치: keep=[699] vs candidate=[] | lc-en-tcg-xy3-026, lc-orphan-jp-tcg-XY3-26 | keep: lc-en-tcg-xy3-026 dex=[699] |
| 1651 | og-xy3 | 27 | 번호(27) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-en-tcg-xy3-027, lc-orphan-jp-tcg-XY3-27 | keep: lc-en-tcg-xy3-027 dex=[25] |
| 1652 | og-xy3 | 28 | 번호(28) 일치 but dex# 불일치: keep=[26] vs candidate=[] | lc-en-tcg-xy3-028, lc-orphan-jp-tcg-XY3-28 | keep: lc-en-tcg-xy3-028 dex=[26] |
| 1653 | og-xy3 | 31 | 번호(31) 일치 but dex# 불일치: keep=[311] vs candidate=[] | lc-en-tcg-xy3-031, lc-orphan-jp-tcg-XY3-31 | keep: lc-en-tcg-xy3-031 dex=[311] |
| 1654 | og-xy3 | 32 | 번호(32) 일치 but dex# 불일치: keep=[312] vs candidate=[] | lc-en-tcg-xy3-032, lc-orphan-jp-tcg-XY3-32 | keep: lc-en-tcg-xy3-032 dex=[312] |
| 1655 | og-xy3 | 33 | 번호(33) 일치 but dex# 불일치: keep=[642] vs candidate=[] | lc-en-tcg-xy3-033, lc-orphan-jp-tcg-XY3-33 | keep: lc-en-tcg-xy3-033 dex=[642] |
| 1656 | og-xy3 | 34 | 번호(34) 일치 but dex# 불일치: keep=[702] vs candidate=[] | lc-en-tcg-xy3-034, lc-orphan-jp-tcg-XY3-34 | keep: lc-en-tcg-xy3-034 dex=[702] |
| 1657 | og-xy3 | 35 | 번호(35) 일치 but dex# 불일치: keep=[96] vs candidate=[] | lc-en-tcg-xy3-035, lc-orphan-jp-tcg-XY3-35 | keep: lc-en-tcg-xy3-035 dex=[96] |
| 1658 | og-xy3 | 36 | 번호(36) 일치 but dex# 불일치: keep=[97] vs candidate=[] | lc-en-tcg-xy3-036, lc-orphan-jp-tcg-XY3-36 | keep: lc-en-tcg-xy3-036 dex=[97] |
| 1659 | og-xy3 | 37 | 번호(37) 일치 but dex# 불일치: keep=[124] vs candidate=[] | lc-en-tcg-xy3-037, lc-orphan-jp-tcg-XY3-37 | keep: lc-en-tcg-xy3-037 dex=[124] |
| 1660 | og-xy3 | 38 | 번호(38) 일치 but dex# 불일치: keep=[451] vs candidate=[] | lc-en-tcg-xy3-038, lc-orphan-jp-tcg-XY3-38 | keep: lc-en-tcg-xy3-038 dex=[451] |
| 1661 | og-xy3 | 41 | 번호(41) 일치 but dex# 불일치: keep=[576] vs candidate=[] | lc-en-tcg-xy3-041, lc-orphan-jp-tcg-XY3-41 | keep: lc-en-tcg-xy3-041 dex=[576] |
| 1662 | og-xy3 | 42 | 번호(42) 일치 but dex# 불일치: keep=[622] vs candidate=[] | lc-en-tcg-xy3-042, lc-orphan-jp-tcg-XY3-42 | keep: lc-en-tcg-xy3-042 dex=[622] |
| 1663 | og-xy3 | 44 | 번호(44) 일치 but dex# 불일치: keep=[66] vs candidate=[] | lc-en-tcg-xy3-044, lc-orphan-jp-tcg-XY3-44 | keep: lc-en-tcg-xy3-044 dex=[66] |
| 1664 | og-xy3 | 45 | 번호(45) 일치 but dex# 불일치: keep=[67] vs candidate=[] | lc-en-tcg-xy3-045, lc-orphan-jp-tcg-XY3-45 | keep: lc-en-tcg-xy3-045 dex=[67] |
| 1665 | og-xy3 | 46 | 번호(46) 일치 but dex# 불일치: keep=[68] vs candidate=[] | lc-en-tcg-xy3-046, lc-orphan-jp-tcg-XY3-46 | keep: lc-en-tcg-xy3-046 dex=[68] |
| 1666 | og-xy3 | 47 | 번호(47) 일치 but dex# 불일치: keep=[106] vs candidate=[] | lc-en-tcg-xy3-047, lc-orphan-jp-tcg-XY3-47 | keep: lc-en-tcg-xy3-047 dex=[106] |
| 1667 | og-xy3 | 48 | 번호(48) 일치 but dex# 불일치: keep=[107] vs candidate=[] | lc-en-tcg-xy3-048, lc-orphan-jp-tcg-XY3-48 | keep: lc-en-tcg-xy3-048 dex=[107] |
| 1668 | og-xy3 | 50 | 번호(50) 일치 but dex# 불일치: keep=[286] vs candidate=[] | lc-en-tcg-xy3-050, lc-orphan-jp-tcg-XY3-50 | keep: lc-en-tcg-xy3-050 dex=[286] |
| 1669 | og-xy3 | 51 | 번호(51) 일치 but dex# 불일치: keep=[296] vs candidate=[] | lc-en-tcg-xy3-051, lc-orphan-jp-tcg-XY3-51 | keep: lc-en-tcg-xy3-051 dex=[296] |
| 1670 | og-xy3 | 52 | 번호(52) 일치 but dex# 불일치: keep=[297] vs candidate=[] | lc-en-tcg-xy3-052, lc-orphan-jp-tcg-XY3-52 | keep: lc-en-tcg-xy3-052 dex=[297] |
| 1671 | og-xy3 | 53 | 번호(53) 일치 but dex# 불일치: keep=[328] vs candidate=[] | lc-en-tcg-xy3-053, lc-orphan-jp-tcg-XY3-53 | keep: lc-en-tcg-xy3-053 dex=[328] |
| 1672 | og-xy3 | 55 | 번호(55) 일치 but dex# 불일치: keep=[448] vs candidate=[] | lc-en-tcg-xy3-055, lc-orphan-jp-tcg-XY3-55 | keep: lc-en-tcg-xy3-055 dex=[448] |
| 1673 | og-xy3 | 56 | 번호(56) 일치 but dex# 불일치: keep=[619] vs candidate=[] | lc-en-tcg-xy3-056, lc-orphan-jp-tcg-XY3-56 | keep: lc-en-tcg-xy3-056 dex=[619] |
| 1674 | og-xy3 | 57 | 번호(57) 일치 but dex# 불일치: keep=[620] vs candidate=[] | lc-en-tcg-xy3-057, lc-orphan-jp-tcg-XY3-57 | keep: lc-en-tcg-xy3-057 dex=[620] |
| 1675 | og-xy3 | 59 | 번호(59) 일치 but dex# 불일치: keep=[674] vs candidate=[] | lc-en-tcg-xy3-059, lc-orphan-jp-tcg-XY3-59 | keep: lc-en-tcg-xy3-059 dex=[674] |
| 1676 | og-xy3 | 60 | 번호(60) 일치 but dex# 불일치: keep=[674] vs candidate=[] | lc-en-tcg-xy3-060, lc-orphan-jp-tcg-XY3-60 | keep: lc-en-tcg-xy3-060 dex=[674] |
| 1677 | og-xy3 | 61 | 번호(61) 일치 but dex# 불일치: keep=[696] vs candidate=[] | lc-en-tcg-xy3-061, lc-orphan-jp-tcg-XY3-61 | keep: lc-en-tcg-xy3-061 dex=[696] |
| 1678 | og-xy3 | 62 | 번호(62) 일치 but dex# 불일치: keep=[697] vs candidate=[] | lc-en-tcg-xy3-062, lc-orphan-jp-tcg-XY3-62 | keep: lc-en-tcg-xy3-062 dex=[697] |
| 1679 | og-xy3 | 63 | 번호(63) 일치 but dex# 불일치: keep=[701] vs candidate=[] | lc-en-tcg-xy3-063, lc-orphan-jp-tcg-XY3-63 | keep: lc-en-tcg-xy3-063 dex=[701] |
| 1680 | og-xy3 | 64 | 번호(64) 일치 but dex# 불일치: keep=[701] vs candidate=[] | lc-en-tcg-xy3-064, lc-orphan-jp-tcg-XY3-64 | keep: lc-en-tcg-xy3-064 dex=[701] |
| 1681 | og-xy3 | 65 | 번호(65) 일치 but dex# 불일치: keep=[452] vs candidate=[] | lc-en-tcg-xy3-065, lc-orphan-jp-tcg-XY3-65 | keep: lc-en-tcg-xy3-065 dex=[452] |
| 1682 | og-xy3 | 66 | 번호(66) 일치 but dex# 불일치: keep=[559] vs candidate=[] | lc-en-tcg-xy3-066, lc-orphan-jp-tcg-XY3-66 | keep: lc-en-tcg-xy3-066 dex=[559] |
| 1683 | og-xy3 | 68 | 번호(68) 일치 but dex# 불일치: keep=[675] vs candidate=[] | lc-en-tcg-xy3-068, lc-orphan-jp-tcg-XY3-68 | keep: lc-en-tcg-xy3-068 dex=[675] |
| 1684 | og-xy3 | 69 | 번호(69) 일치 but dex# 불일치: keep=[35] vs candidate=[] | lc-en-tcg-xy3-069, lc-orphan-jp-tcg-XY3-69 | keep: lc-en-tcg-xy3-069 dex=[35] |
| 1685 | og-xy3 | 70 | 번호(70) 일치 but dex# 불일치: keep=[35] vs candidate=[] | lc-en-tcg-xy3-070, lc-orphan-jp-tcg-XY3-70 | keep: lc-en-tcg-xy3-070 dex=[35] |
| 1686 | og-xy3 | 71 | 번호(71) 일치 but dex# 불일치: keep=[36] vs candidate=[] | lc-en-tcg-xy3-071, lc-orphan-jp-tcg-XY3-71 | keep: lc-en-tcg-xy3-071 dex=[36] |
| 1687 | og-xy3 | 72 | 번호(72) 일치 but dex# 불일치: keep=[700] vs candidate=[] | lc-en-tcg-xy3-072, lc-orphan-jp-tcg-XY3-72 | keep: lc-en-tcg-xy3-072 dex=[700] |
| 1688 | og-xy3 | 73 | 번호(73) 일치 but dex# 불일치: keep=[707] vs candidate=[] | lc-en-tcg-xy3-073, lc-orphan-jp-tcg-XY3-73 | keep: lc-en-tcg-xy3-073 dex=[707] |
| 1689 | og-xy3 | 74 | 번호(74) 일치 but dex# 불일치: keep=[149] vs candidate=[] | lc-en-tcg-xy3-074, lc-orphan-jp-tcg-XY3-74 | keep: lc-en-tcg-xy3-074 dex=[149] |
| 1690 | og-xy3 | 75 | 번호(75) 일치 but dex# 불일치: keep=[329] vs candidate=[] | lc-en-tcg-xy3-075, lc-orphan-jp-tcg-XY3-75 | keep: lc-en-tcg-xy3-075 dex=[329] |
| 1691 | og-xy3 | 77 | 번호(77) 일치 but dex# 불일치: keep=[715] vs candidate=[] | lc-en-tcg-xy3-077, lc-orphan-jp-tcg-XY3-77 | keep: lc-en-tcg-xy3-077 dex=[715] |
| 1692 | og-xy3 | 78 | 번호(78) 일치 but dex# 불일치: keep=[108] vs candidate=[] | lc-en-tcg-xy3-078, lc-orphan-jp-tcg-XY3-78 | keep: lc-en-tcg-xy3-078 dex=[108] |
| 1693 | og-xy3 | 79 | 번호(79) 일치 but dex# 불일치: keep=[463] vs candidate=[] | lc-en-tcg-xy3-079, lc-orphan-jp-tcg-XY3-79 | keep: lc-en-tcg-xy3-079 dex=[463] |
| 1694 | og-xy3 | 81 | 번호(81) 일치 but dex# 불일치: keep=[287] vs candidate=[] | lc-en-tcg-xy3-081, lc-orphan-jp-tcg-XY3-81 | keep: lc-en-tcg-xy3-081 dex=[287] |
| 1695 | og-xy3 | 82 | 번호(82) 일치 but dex# 불일치: keep=[288] vs candidate=[] | lc-en-tcg-xy3-082, lc-orphan-jp-tcg-XY3-82 | keep: lc-en-tcg-xy3-082 dex=[288] |
| 1696 | og-xy3 | 83 | 번호(83) 일치 but dex# 불일치: keep=[289] vs candidate=[] | lc-en-tcg-xy3-083, lc-orphan-jp-tcg-XY3-83 | keep: lc-en-tcg-xy3-083 dex=[289] |
| 1697 | og-xy3 | 84 | 번호(84) 일치 but dex# 불일치: keep=[504] vs candidate=[] | lc-en-tcg-xy3-084, lc-orphan-jp-tcg-XY3-84 | keep: lc-en-tcg-xy3-084 dex=[504] |
| 1698 | og-xy3 | 86 | 번호(86) 일치 but dex# 불일치: keep=[641] vs candidate=[] | lc-en-tcg-xy3-086, lc-orphan-jp-tcg-XY3-86 | keep: lc-en-tcg-xy3-086 dex=[641] |
| 1699 | og-xy3 | 87 | 번호(87) 일치 but dex# 불일치: keep=[714] vs candidate=[] | lc-en-tcg-xy3-087, lc-orphan-jp-tcg-XY3-87 | keep: lc-en-tcg-xy3-087 dex=[714] |
| 1700 | og-xy3 | 2 | 번호(2) 일치 but dex# 불일치: keep=[70] vs candidate=[] | lc-en-tcg-xy3-002, lc-orphan-jp-tcg-XY3-2 | keep: lc-en-tcg-xy3-002 dex=[70] |
| 1701 | og-xy3 | 3 | 번호(3) 일치 but dex# 불일치: keep=[71] vs candidate=[] | lc-en-tcg-xy3-003, lc-orphan-jp-tcg-XY3-3 | keep: lc-en-tcg-xy3-003 dex=[71] |
| 1702 | og-xy3 | 11 | 번호(11) 일치 but dex# 불일치: keep=[467] vs candidate=[] | lc-en-tcg-xy3-011, lc-orphan-jp-tcg-XY3-11 | keep: lc-en-tcg-xy3-011 dex=[467] |
| 1703 | og-xy3 | 20 | 번호(20) 일치 but dex# 불일치: keep=[537] vs candidate=[] | lc-en-tcg-xy3-020, lc-orphan-jp-tcg-XY3-20 | keep: lc-en-tcg-xy3-020 dex=[537] |
| 1704 | og-xy3 | 30 | 번호(30) 일치 but dex# 불일치: keep=[466] vs candidate=[] | lc-en-tcg-xy3-030, lc-orphan-jp-tcg-XY3-30 | keep: lc-en-tcg-xy3-030 dex=[466] |
| 1705 | og-xy3 | 39 | 번호(39) 일치 but dex# 불일치: keep=[574] vs candidate=[] | lc-en-tcg-xy3-039, lc-orphan-jp-tcg-XY3-39 | keep: lc-en-tcg-xy3-039 dex=[574] |
| 1706 | og-xy3 | 40 | 번호(40) 일치 but dex# 불일치: keep=[575] vs candidate=[] | lc-en-tcg-xy3-040, lc-orphan-jp-tcg-XY3-40 | keep: lc-en-tcg-xy3-040 dex=[575] |
| 1707 | og-xy3 | 43 | 번호(43) 일치 but dex# 불일치: keep=[623] vs candidate=[] | lc-en-tcg-xy3-043, lc-orphan-jp-tcg-XY3-43 | keep: lc-en-tcg-xy3-043 dex=[623] |
| 1708 | og-xy3 | 49 | 번호(49) 일치 but dex# 불일치: keep=[237] vs candidate=[] | lc-en-tcg-xy3-049, lc-orphan-jp-tcg-XY3-49 | keep: lc-en-tcg-xy3-049 dex=[237] |
| 1709 | og-xy3 | 54 | 번호(54) 일치 but dex# 불일치: keep=[448] vs candidate=[] | lc-en-tcg-xy3-054, lc-orphan-jp-tcg-XY3-54 | keep: lc-en-tcg-xy3-054 dex=[448] |
| 1710 | og-xy3 | 58 | 번호(58) 일치 but dex# 불일치: keep=[645] vs candidate=[] | lc-en-tcg-xy3-058, lc-orphan-jp-tcg-XY3-58 | keep: lc-en-tcg-xy3-058 dex=[645] |
| 1711 | og-xy3 | 67 | 번호(67) 일치 but dex# 불일치: keep=[560] vs candidate=[] | lc-en-tcg-xy3-067, lc-orphan-jp-tcg-XY3-67 | keep: lc-en-tcg-xy3-067 dex=[560] |
| 1712 | og-xy3 | 76 | 번호(76) 일치 but dex# 불일치: keep=[330] vs candidate=[] | lc-en-tcg-xy3-076, lc-orphan-jp-tcg-XY3-76 | keep: lc-en-tcg-xy3-076 dex=[330] |
| 1713 | og-xy3 | 80 | 번호(80) 일치 but dex# 불일치: keep=[133] vs candidate=[] | lc-en-tcg-xy3-080, lc-orphan-jp-tcg-XY3-80 | keep: lc-en-tcg-xy3-080 dex=[133] |
| 1714 | og-xy3 | 85 | 번호(85) 일치 but dex# 불일치: keep=[505] vs candidate=[] | lc-en-tcg-xy3-085, lc-orphan-jp-tcg-XY3-85 | keep: lc-en-tcg-xy3-085 dex=[505] |
| 1715 | og-xy3 | 105 | 번호(105) + dex#(214) 일치 but 이름 베이스 불일치: "Heracross-EX" vs "Mega Lucario EX - 105/096" — 번호 스킴 불일치 의심 | lc-en-tcg-xy3-105 | keep: lc-en-tcg-xy3-105 dex=[214] |
| 1716 | og-xy3 | 6 | 번호(6) 일치 but dex# 불일치: keep=[285] vs candidate=[] | lc-orphan-jp-tcg-XY3-6 | keep: lc-orphan-jp-tcg-XY3-6 dex=[285] |
| 1717 | og-xy3 | 7 | 번호(7) 일치 but dex# 불일치: keep=[470] vs candidate=[] | lc-orphan-jp-tcg-XY3-7 | keep: lc-orphan-jp-tcg-XY3-7 dex=[470] |
| 1718 | og-xy3 | 1 | 번호(1) 일치 but dex# 불일치: keep=[69] vs candidate=[] | lc-orphan-jp-tcg-XY3-1 | keep: lc-orphan-jp-tcg-XY3-1 dex=[69] |
| 1719 | og-xy3 | 5 | 번호(5) 일치 but dex# 불일치: keep=[214] vs candidate=[] | lc-orphan-jp-tcg-XY3-5 | keep: lc-orphan-jp-tcg-XY3-5 dex=[214] |
| 1720 | og-xy3 | 8 | 번호(8) 일치 but dex# 불일치: keep=[616] vs candidate=[] | lc-orphan-jp-tcg-XY3-8 | keep: lc-orphan-jp-tcg-XY3-8 dex=[616] |
| 1721 | og-xy3 | 24 | 번호(24) 일치 but dex# 불일치: keep=[693] vs candidate=[] | lc-orphan-jp-tcg-XY3-24 | keep: lc-orphan-jp-tcg-XY3-24 dex=[693] |
| 1722 | og-xy3 | 11 | 번호(11) 일치 but dex# 불일치: keep=[467] vs candidate=[] | lc-orphan-jp-tcg-XY3-11 | keep: lc-orphan-jp-tcg-XY3-11 dex=[467] |
| 1723 | og-xy3 | 12 | 번호(12) 일치 but dex# 불일치: keep=[255] vs candidate=[] | lc-orphan-jp-tcg-XY3-12 | keep: lc-orphan-jp-tcg-XY3-12 dex=[255] |
| 1724 | og-xy3 | 13 | 번호(13) 일치 but dex# 불일치: keep=[256] vs candidate=[] | lc-orphan-jp-tcg-XY3-13 | keep: lc-orphan-jp-tcg-XY3-13 dex=[256] |
| 1725 | og-xy3 | 15 | 번호(15) 일치 but dex# 불일치: keep=[60] vs candidate=[] | lc-orphan-jp-tcg-XY3-15 | keep: lc-orphan-jp-tcg-XY3-15 dex=[60] |
| 1726 | og-xy3 | 16 | 번호(16) 일치 but dex# 불일치: keep=[61] vs candidate=[] | lc-orphan-jp-tcg-XY3-16 | keep: lc-orphan-jp-tcg-XY3-16 dex=[61] |
| 1727 | og-xy3 | 18 | 번호(18) 일치 but dex# 불일치: keep=[186] vs candidate=[] | lc-orphan-jp-tcg-XY3-18 | keep: lc-orphan-jp-tcg-XY3-18 dex=[186] |
| 1728 | og-xy3 | 20 | 번호(20) 일치 but dex# 불일치: keep=[537] vs candidate=[] | lc-orphan-jp-tcg-XY3-20 | keep: lc-orphan-jp-tcg-XY3-20 dex=[537] |
| 1729 | og-xy3 | 21 | 번호(21) 일치 but dex# 불일치: keep=[613] vs candidate=[] | lc-orphan-jp-tcg-XY3-21 | keep: lc-orphan-jp-tcg-XY3-21 dex=[613] |
| 1730 | og-xy3 | 22 | 번호(22) 일치 but dex# 불일치: keep=[614] vs candidate=[] | lc-orphan-jp-tcg-XY3-22 | keep: lc-orphan-jp-tcg-XY3-22 dex=[614] |
| 1731 | og-xy3 | 23 | 번호(23) 일치 but dex# 불일치: keep=[692] vs candidate=[] | lc-orphan-jp-tcg-XY3-23 | keep: lc-orphan-jp-tcg-XY3-23 dex=[692] |
| 1732 | og-xy3 | 25 | 번호(25) 일치 but dex# 불일치: keep=[698] vs candidate=[] | lc-orphan-jp-tcg-XY3-25 | keep: lc-orphan-jp-tcg-XY3-25 dex=[698] |
| 1733 | og-xy3 | 27 | 번호(27) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-orphan-jp-tcg-XY3-27 | keep: lc-orphan-jp-tcg-XY3-27 dex=[25] |
| 1734 | og-xy3 | 28 | 번호(28) 일치 but dex# 불일치: keep=[26] vs candidate=[] | lc-orphan-jp-tcg-XY3-28 | keep: lc-orphan-jp-tcg-XY3-28 dex=[26] |
| 1735 | og-xy3 | 29 | 번호(29) 일치 but dex# 불일치: keep=[125] vs candidate=[] | lc-orphan-jp-tcg-XY3-29 | keep: lc-orphan-jp-tcg-XY3-29 dex=[125] |
| 1736 | og-xy3 | 30 | 번호(30) 일치 but dex# 불일치: keep=[466] vs candidate=[] | lc-orphan-jp-tcg-XY3-30 | keep: lc-orphan-jp-tcg-XY3-30 dex=[466] |
| 1737 | og-xy3 | 32 | 번호(32) 일치 but dex# 불일치: keep=[312] vs candidate=[] | lc-orphan-jp-tcg-XY3-32 | keep: lc-orphan-jp-tcg-XY3-32 dex=[312] |
| 1738 | og-xy3 | 33 | 번호(33) 일치 but dex# 불일치: keep=[642] vs candidate=[] | lc-orphan-jp-tcg-XY3-33 | keep: lc-orphan-jp-tcg-XY3-33 dex=[642] |
| 1739 | og-xy3 | 34 | 번호(34) 일치 but dex# 불일치: keep=[702] vs candidate=[] | lc-orphan-jp-tcg-XY3-34 | keep: lc-orphan-jp-tcg-XY3-34 dex=[702] |
| 1740 | og-xy3 | 35 | 번호(35) 일치 but dex# 불일치: keep=[96] vs candidate=[] | lc-orphan-jp-tcg-XY3-35 | keep: lc-orphan-jp-tcg-XY3-35 dex=[96] |
| 1741 | og-xy3 | 36 | 번호(36) 일치 but dex# 불일치: keep=[97] vs candidate=[] | lc-orphan-jp-tcg-XY3-36 | keep: lc-orphan-jp-tcg-XY3-36 dex=[97] |
| 1742 | og-xy3 | 38 | 번호(38) 일치 but dex# 불일치: keep=[451] vs candidate=[] | lc-orphan-jp-tcg-XY3-38 | keep: lc-orphan-jp-tcg-XY3-38 dex=[451] |
| 1743 | og-xy3 | 39 | 번호(39) 일치 but dex# 불일치: keep=[574] vs candidate=[] | lc-orphan-jp-tcg-XY3-39 | keep: lc-orphan-jp-tcg-XY3-39 dex=[574] |
| 1744 | og-xy3 | 40 | 번호(40) 일치 but dex# 불일치: keep=[575] vs candidate=[] | lc-orphan-jp-tcg-XY3-40 | keep: lc-orphan-jp-tcg-XY3-40 dex=[575] |
| 1745 | og-xy3 | 42 | 번호(42) 일치 but dex# 불일치: keep=[622] vs candidate=[] | lc-orphan-jp-tcg-XY3-42 | keep: lc-orphan-jp-tcg-XY3-42 dex=[622] |
| 1746 | og-xy3 | 43 | 번호(43) 일치 but dex# 불일치: keep=[623] vs candidate=[] | lc-orphan-jp-tcg-XY3-43 | keep: lc-orphan-jp-tcg-XY3-43 dex=[623] |
| 1747 | og-xy3 | 44 | 번호(44) 일치 but dex# 불일치: keep=[66] vs candidate=[] | lc-orphan-jp-tcg-XY3-44 | keep: lc-orphan-jp-tcg-XY3-44 dex=[66] |
| 1748 | og-xy3 | 47 | 번호(47) 일치 but dex# 불일치: keep=[106] vs candidate=[] | lc-orphan-jp-tcg-XY3-47 | keep: lc-orphan-jp-tcg-XY3-47 dex=[106] |
| 1749 | og-xy3 | 49 | 번호(49) 일치 but dex# 불일치: keep=[237] vs candidate=[] | lc-orphan-jp-tcg-XY3-49 | keep: lc-orphan-jp-tcg-XY3-49 dex=[237] |
| 1750 | og-xy3 | 50 | 번호(50) 일치 but dex# 불일치: keep=[286] vs candidate=[] | lc-orphan-jp-tcg-XY3-50 | keep: lc-orphan-jp-tcg-XY3-50 dex=[286] |
| 1751 | og-xy3 | 51 | 번호(51) 일치 but dex# 불일치: keep=[296] vs candidate=[] | lc-orphan-jp-tcg-XY3-51 | keep: lc-orphan-jp-tcg-XY3-51 dex=[296] |
| 1752 | og-xy3 | 53 | 번호(53) 일치 but dex# 불일치: keep=[328] vs candidate=[] | lc-orphan-jp-tcg-XY3-53 | keep: lc-orphan-jp-tcg-XY3-53 dex=[328] |
| 1753 | og-xy3 | 54 | 번호(54) 일치 but dex# 불일치: keep=[448] vs candidate=[] | lc-orphan-jp-tcg-XY3-54 | keep: lc-orphan-jp-tcg-XY3-54 dex=[448] |
| 1754 | og-xy3 | 55 | 번호(55) 일치 but dex# 불일치: keep=[448] vs candidate=[] | lc-orphan-jp-tcg-XY3-55 | keep: lc-orphan-jp-tcg-XY3-55 dex=[448] |
| 1755 | og-xy3 | 56 | 번호(56) 일치 but dex# 불일치: keep=[619] vs candidate=[] | lc-orphan-jp-tcg-XY3-56 | keep: lc-orphan-jp-tcg-XY3-56 dex=[619] |
| 1756 | og-xy3 | 57 | 번호(57) 일치 but dex# 불일치: keep=[620] vs candidate=[] | lc-orphan-jp-tcg-XY3-57 | keep: lc-orphan-jp-tcg-XY3-57 dex=[620] |
| 1757 | og-xy3 | 58 | 번호(58) 일치 but dex# 불일치: keep=[645] vs candidate=[] | lc-orphan-jp-tcg-XY3-58 | keep: lc-orphan-jp-tcg-XY3-58 dex=[645] |
| 1758 | og-xy3 | 59 | 번호(59) 일치 but dex# 불일치: keep=[674] vs candidate=[] | lc-orphan-jp-tcg-XY3-59 | keep: lc-orphan-jp-tcg-XY3-59 dex=[674] |
| 1759 | og-xy3 | 60 | 번호(60) 일치 but dex# 불일치: keep=[674] vs candidate=[] | lc-orphan-jp-tcg-XY3-60 | keep: lc-orphan-jp-tcg-XY3-60 dex=[674] |
| 1760 | og-xy3 | 61 | 번호(61) 일치 but dex# 불일치: keep=[696] vs candidate=[] | lc-orphan-jp-tcg-XY3-61 | keep: lc-orphan-jp-tcg-XY3-61 dex=[696] |
| 1761 | og-xy3 | 62 | 번호(62) 일치 but dex# 불일치: keep=[697] vs candidate=[] | lc-orphan-jp-tcg-XY3-62 | keep: lc-orphan-jp-tcg-XY3-62 dex=[697] |
| 1762 | og-xy3 | 64 | 번호(64) 일치 but dex# 불일치: keep=[701] vs candidate=[] | lc-orphan-jp-tcg-XY3-64 | keep: lc-orphan-jp-tcg-XY3-64 dex=[701] |
| 1763 | og-xy3 | 65 | 번호(65) 일치 but dex# 불일치: keep=[452] vs candidate=[] | lc-orphan-jp-tcg-XY3-65 | keep: lc-orphan-jp-tcg-XY3-65 dex=[452] |
| 1764 | og-xy3 | 67 | 번호(67) 일치 but dex# 불일치: keep=[560] vs candidate=[] | lc-orphan-jp-tcg-XY3-67 | keep: lc-orphan-jp-tcg-XY3-67 dex=[560] |
| 1765 | og-xy3 | 68 | 번호(68) 일치 but dex# 불일치: keep=[675] vs candidate=[] | lc-orphan-jp-tcg-XY3-68 | keep: lc-orphan-jp-tcg-XY3-68 dex=[675] |
| 1766 | og-xy3 | 69 | 번호(69) 일치 but dex# 불일치: keep=[35] vs candidate=[] | lc-orphan-jp-tcg-XY3-69 | keep: lc-orphan-jp-tcg-XY3-69 dex=[35] |
| 1767 | og-xy3 | 70 | 번호(70) 일치 but dex# 불일치: keep=[35] vs candidate=[] | lc-orphan-jp-tcg-XY3-70 | keep: lc-orphan-jp-tcg-XY3-70 dex=[35] |
| 1768 | og-xy3 | 73 | 번호(73) 일치 but dex# 불일치: keep=[707] vs candidate=[] | lc-orphan-jp-tcg-XY3-73 | keep: lc-orphan-jp-tcg-XY3-73 dex=[707] |
| 1769 | og-xy3 | 75 | 번호(75) 일치 but dex# 불일치: keep=[329] vs candidate=[] | lc-orphan-jp-tcg-XY3-75 | keep: lc-orphan-jp-tcg-XY3-75 dex=[329] |
| 1770 | og-xy3 | 76 | 번호(76) 일치 but dex# 불일치: keep=[330] vs candidate=[] | lc-orphan-jp-tcg-XY3-76 | keep: lc-orphan-jp-tcg-XY3-76 dex=[330] |
| 1771 | og-xy3 | 77 | 번호(77) 일치 but dex# 불일치: keep=[715] vs candidate=[] | lc-orphan-jp-tcg-XY3-77 | keep: lc-orphan-jp-tcg-XY3-77 dex=[715] |
| 1772 | og-xy3 | 79 | 번호(79) 일치 but dex# 불일치: keep=[463] vs candidate=[] | lc-orphan-jp-tcg-XY3-79 | keep: lc-orphan-jp-tcg-XY3-79 dex=[463] |
| 1773 | og-xy3 | 81 | 번호(81) 일치 but dex# 불일치: keep=[287] vs candidate=[] | lc-orphan-jp-tcg-XY3-81 | keep: lc-orphan-jp-tcg-XY3-81 dex=[287] |
| 1774 | og-xy3 | 82 | 번호(82) 일치 but dex# 불일치: keep=[288] vs candidate=[] | lc-orphan-jp-tcg-XY3-82 | keep: lc-orphan-jp-tcg-XY3-82 dex=[288] |
| 1775 | og-xy3 | 83 | 번호(83) 일치 but dex# 불일치: keep=[289] vs candidate=[] | lc-orphan-jp-tcg-XY3-83 | keep: lc-orphan-jp-tcg-XY3-83 dex=[289] |
| 1776 | og-xy3 | 84 | 번호(84) 일치 but dex# 불일치: keep=[504] vs candidate=[] | lc-orphan-jp-tcg-XY3-84 | keep: lc-orphan-jp-tcg-XY3-84 dex=[504] |
| 1777 | og-xy3 | 85 | 번호(85) 일치 but dex# 불일치: keep=[505] vs candidate=[] | lc-orphan-jp-tcg-XY3-85 | keep: lc-orphan-jp-tcg-XY3-85 dex=[505] |
| 1778 | og-xy3 | 10 | 번호(10) 일치 but dex# 불일치: keep=[126] vs candidate=[] | lc-orphan-jp-tcg-XY3-10 | keep: lc-orphan-jp-tcg-XY3-10 dex=[126] |
| 1779 | og-xy3 | 14 | 번호(14) 일치 but dex# 불일치: keep=[257] vs candidate=[] | lc-orphan-jp-tcg-XY3-14 | keep: lc-orphan-jp-tcg-XY3-14 dex=[257] |
| 1780 | og-xy3 | 19 | 번호(19) 일치 but dex# 불일치: keep=[471] vs candidate=[] | lc-orphan-jp-tcg-XY3-19 | keep: lc-orphan-jp-tcg-XY3-19 dex=[471] |
| 1781 | og-xy3 | 26 | 번호(26) 일치 but dex# 불일치: keep=[699] vs candidate=[] | lc-orphan-jp-tcg-XY3-26 | keep: lc-orphan-jp-tcg-XY3-26 dex=[699] |
| 1782 | og-xy3 | 31 | 번호(31) 일치 but dex# 불일치: keep=[311] vs candidate=[] | lc-orphan-jp-tcg-XY3-31 | keep: lc-orphan-jp-tcg-XY3-31 dex=[311] |
| 1783 | og-xy3 | 37 | 번호(37) 일치 but dex# 불일치: keep=[124] vs candidate=[] | lc-orphan-jp-tcg-XY3-37 | keep: lc-orphan-jp-tcg-XY3-37 dex=[124] |
| 1784 | og-xy3 | 41 | 번호(41) 일치 but dex# 불일치: keep=[576] vs candidate=[] | lc-orphan-jp-tcg-XY3-41 | keep: lc-orphan-jp-tcg-XY3-41 dex=[576] |
| 1785 | og-xy3 | 45 | 번호(45) 일치 but dex# 불일치: keep=[67] vs candidate=[] | lc-orphan-jp-tcg-XY3-45 | keep: lc-orphan-jp-tcg-XY3-45 dex=[67] |
| 1786 | og-xy3 | 48 | 번호(48) 일치 but dex# 불일치: keep=[107] vs candidate=[] | lc-orphan-jp-tcg-XY3-48 | keep: lc-orphan-jp-tcg-XY3-48 dex=[107] |
| 1787 | og-xy3 | 63 | 번호(63) 일치 but dex# 불일치: keep=[701] vs candidate=[] | lc-orphan-jp-tcg-XY3-63 | keep: lc-orphan-jp-tcg-XY3-63 dex=[701] |
| 1788 | og-xy3 | 66 | 번호(66) 일치 but dex# 불일치: keep=[559] vs candidate=[] | lc-orphan-jp-tcg-XY3-66 | keep: lc-orphan-jp-tcg-XY3-66 dex=[559] |
| 1789 | og-xy3 | 71 | 번호(71) 일치 but dex# 불일치: keep=[36] vs candidate=[] | lc-orphan-jp-tcg-XY3-71 | keep: lc-orphan-jp-tcg-XY3-71 dex=[36] |
| 1790 | og-xy3 | 74 | 번호(74) 일치 but dex# 불일치: keep=[149] vs candidate=[] | lc-orphan-jp-tcg-XY3-74 | keep: lc-orphan-jp-tcg-XY3-74 dex=[149] |
| 1791 | og-xy3 | 78 | 번호(78) 일치 but dex# 불일치: keep=[108] vs candidate=[] | lc-orphan-jp-tcg-XY3-78 | keep: lc-orphan-jp-tcg-XY3-78 dex=[108] |
| 1792 | og-xy3 | 80 | 번호(80) 일치 but dex# 불일치: keep=[133] vs candidate=[] | lc-orphan-jp-tcg-XY3-80 | keep: lc-orphan-jp-tcg-XY3-80 dex=[133] |
| 1793 | og-xy3 | 86 | 번호(86) 일치 but dex# 불일치: keep=[641] vs candidate=[] | lc-orphan-jp-tcg-XY3-86 | keep: lc-orphan-jp-tcg-XY3-86 dex=[641] |
| 1794 | og-xy3 | 87 | 번호(87) 일치 but dex# 불일치: keep=[714] vs candidate=[] | lc-orphan-jp-tcg-XY3-87 | keep: lc-orphan-jp-tcg-XY3-87 dex=[714] |
| 1795 | og-xy3 | 4 | 번호(4) 일치 but dex# 불일치: keep=[214] vs candidate=[] | lc-orphan-jp-tcg-XY3-4 | keep: lc-orphan-jp-tcg-XY3-4 dex=[214] |
| 1796 | og-xy3 | 2 | 번호(2) 일치 but dex# 불일치: keep=[70] vs candidate=[] | lc-orphan-jp-tcg-XY3-2 | keep: lc-orphan-jp-tcg-XY3-2 dex=[70] |
| 1797 | og-xy3 | 3 | 번호(3) 일치 but dex# 불일치: keep=[71] vs candidate=[] | lc-orphan-jp-tcg-XY3-3 | keep: lc-orphan-jp-tcg-XY3-3 dex=[71] |
| 1798 | og-xy3 | 17 | 번호(17) 일치 but dex# 불일치: keep=[62] vs candidate=[] | lc-orphan-jp-tcg-XY3-17 | keep: lc-orphan-jp-tcg-XY3-17 dex=[62] |
| 1799 | og-xy3 | 46 | 번호(46) 일치 but dex# 불일치: keep=[68] vs candidate=[] | lc-orphan-jp-tcg-XY3-46 | keep: lc-orphan-jp-tcg-XY3-46 dex=[68] |
| 1800 | og-xy3 | 72 | 번호(72) 일치 but dex# 불일치: keep=[700] vs candidate=[] | lc-orphan-jp-tcg-XY3-72 | keep: lc-orphan-jp-tcg-XY3-72 dex=[700] |
| 1801 | og-xy3 | 9 | 번호(9) 일치 but dex# 불일치: keep=[617] vs candidate=[] | lc-orphan-jp-tcg-XY3-9 | keep: lc-orphan-jp-tcg-XY3-9 dex=[617] |
| 1802 | og-xy3 | 52 | 번호(52) 일치 but dex# 불일치: keep=[297] vs candidate=[] | lc-orphan-jp-tcg-XY3-52 | keep: lc-orphan-jp-tcg-XY3-52 dex=[297] |
| 1803 | og-xy4 | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-xy4-097, lc-en-tcg-xy4-098, lc-en-tcg-xy4-099 ... (+311) | EN sets: en-tcg-xy4, JP sets: jp-tcg-XY4, KR sets: kr-xy4,kr-xya |
| 1804 | og-xy5a | 4 | 번호(4) + dex#(114) 일치 but 이름 베이스 불일치: "Tangela" vs "Lotad" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-004 | keep: lc-en-tcg-xy5-004 dex=[114] |
| 1805 | og-xy5a | 5 | 번호(5) + dex#(465) 일치 but 이름 베이스 불일치: "Tangrowth" vs "Lombre" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-005 | keep: lc-en-tcg-xy5-005 dex=[465] |
| 1806 | og-xy5a | 7 | 번호(7) + dex#(253) 일치 but 이름 베이스 불일치: "Grovyle" vs "Surskit" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-007 | keep: lc-en-tcg-xy5-007 dex=[253] |
| 1807 | og-xy5a | 8 | 번호(8) + dex#(254) 일치 but 이름 베이스 불일치: "Sceptile" vs "Masquerain" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-008 | keep: lc-en-tcg-xy5-008 dex=[254] |
| 1808 | og-xy5a | 80 | 번호(80) + dex#(308) 일치 but 이름 베이스 불일치: "Medicham" vs "Dive Ball - 080/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-080 | keep: lc-en-tcg-xy5-080 dex=[308] |
| 1809 | og-xy5a | 10 | 번호(10) + dex#(270) 일치 but 이름 베이스 불일치: "Lotad" vs "Seadra" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-010 | keep: lc-en-tcg-xy5-010 dex=[270] |
| 1810 | og-xy5a | 11 | 번호(11) + dex#(271) 일치 but 이름 베이스 불일치: "Lombre" vs "Staryu" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-011 | keep: lc-en-tcg-xy5-011 dex=[271] |
| 1811 | og-xy5a | 12 | 번호(12) + dex#(272) 일치 but 이름 베이스 불일치: "Ludicolo" vs "Mudkip" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-012 | keep: lc-en-tcg-xy5-012 dex=[272] |
| 1812 | og-xy5a | 13 | 번호(13) + dex#(283) 일치 but 이름 베이스 불일치: "Surskit" vs "Marshtomp" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-013 | keep: lc-en-tcg-xy5-013 dex=[283] |
| 1813 | og-xy5a | 14 | 번호(14) + dex#(284) 일치 but 이름 베이스 불일치: "Masquerain" vs "Swampert - 014/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-014 | keep: lc-en-tcg-xy5-014 dex=[284] |
| 1814 | og-xy5a | 15 | 번호(15) + dex#(285) 일치 but 이름 베이스 불일치: "Shroomish" vs "Swampert - 015/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-015 | keep: lc-en-tcg-xy5-015 dex=[285] |
| 1815 | og-xy5a | 16 | 번호(16) + dex#(286) 일치 but 이름 베이스 불일치: "Breloom" vs "Ludicolo - 016/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-016 | keep: lc-en-tcg-xy5-016 dex=[286] |
| 1816 | og-xy5a | 17 | 번호(17) + dex#(313) 일치 but 이름 베이스 불일치: "Volbeat" vs "Wailord EX - 017/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-017 | keep: lc-en-tcg-xy5-017 dex=[313] |
| 1817 | og-xy5a | 18 | 번호(18) + dex#(314) 일치 but 이름 베이스 불일치: "Illumise" vs "Barboach" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-018 | keep: lc-en-tcg-xy5-018 dex=[314] |
| 1818 | og-xy5a | 20 | 번호(20) + dex#(37) 일치 but 이름 베이스 불일치: "Vulpix" vs "Whiscash - 020/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-020 | keep: lc-en-tcg-xy5-020 dex=[37] |
| 1819 | og-xy5a | 21 | 번호(21) + dex#(38) 일치 but 이름 베이스 불일치: "Ninetales" vs "Corphish" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-021 | keep: lc-en-tcg-xy5-021 dex=[38] |
| 1820 | og-xy5a | 22 | 번호(22) + dex#(218) 일치 but 이름 베이스 불일치: "Slugma" vs "Feebas" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-022 | keep: lc-en-tcg-xy5-022 dex=[218] |
| 1821 | og-xy5a | 23 | 번호(23) + dex#(219) 일치 but 이름 베이스 불일치: "Magcargo" vs "Milotic" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-023 | keep: lc-en-tcg-xy5-023 dex=[219] |
| 1822 | og-xy5a | 24 | 번호(24) + dex#(219) 일치 but 이름 베이스 불일치: "Magcargo" vs "Spheal" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-024 | keep: lc-en-tcg-xy5-024 dex=[219] |
| 1823 | og-xy5a | 25 | 번호(25) + dex#(255) 일치 but 이름 베이스 불일치: "Torchic" vs "Sealeo" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-025 | keep: lc-en-tcg-xy5-025 dex=[255] |
| 1824 | og-xy5a | 26 | 번호(26) + dex#(255) 일치 but 이름 베이스 불일치: "Torchic" vs "Walrein" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-026 | keep: lc-en-tcg-xy5-026 dex=[255] |
| 1825 | og-xy5a | 27 | 번호(27) + dex#(256) 일치 but 이름 베이스 불일치: "Combusken" vs "Clamperl" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-027 | keep: lc-en-tcg-xy5-027 dex=[256] |
| 1826 | og-xy5a | 30 | 번호(30) + dex#(116) 일치 but 이름 베이스 불일치: "Horsea" vs "Gorebyss - 030/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-030 | keep: lc-en-tcg-xy5-030 dex=[116] |
| 1827 | og-xy5a | 31 | 번호(31) + dex#(117) 일치 but 이름 베이스 불일치: "Seadra" vs "Kyogre EX - 031/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-031 | keep: lc-en-tcg-xy5-031 dex=[117] |
| 1828 | og-xy5a | 32 | 번호(32) + dex#(120) 일치 but 이름 베이스 불일치: "Staryu" vs "Primal Kyogre EX - 032/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-032 | keep: lc-en-tcg-xy5-032 dex=[120] |
| 1829 | og-xy5a | 33 | 번호(33) + dex#(258) 일치 but 이름 베이스 불일치: "Mudkip" vs "Manaphy" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-033 | keep: lc-en-tcg-xy5-033 dex=[258] |
| 1830 | og-xy5a | 34 | 번호(34) + dex#(259) 일치 but 이름 베이스 불일치: "Marshtomp" vs "Chinchou" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-034 | keep: lc-en-tcg-xy5-034 dex=[259] |
| 1831 | og-xy5a | 35 | 번호(35) + dex#(260) 일치 but 이름 베이스 불일치: "Swampert" vs "Lanturn" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-035 | keep: lc-en-tcg-xy5-035 dex=[260] |
| 1832 | og-xy5a | 36 | 번호(36) + dex#(260) 일치 but 이름 베이스 불일치: "Swampert" vs "Tynamo" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-036 | keep: lc-en-tcg-xy5-036 dex=[260] |
| 1833 | og-xy5a | 38 | 번호(38) + dex#(321) 일치 but 이름 베이스 불일치: "Wailord-EX" vs "Eelektrik - 038/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-038 | keep: lc-en-tcg-xy5-038 dex=[321] |
| 1834 | og-xy5a | 41 | 번호(41) + dex#(340) 일치 but 이름 베이스 불일치: "Whiscash" vs "Tentacool - 041/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-041 | keep: lc-en-tcg-xy5-041 dex=[340] |
| 1835 | og-xy5a | 42 | 번호(42) + dex#(341) 일치 but 이름 베이스 불일치: "Corphish" vs "Tentacruel" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-042 | keep: lc-en-tcg-xy5-042 dex=[341] |
| 1836 | og-xy5a | 43 | 번호(43) + dex#(349) 일치 but 이름 베이스 불일치: "Feebas" vs "Starmie" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-043 | keep: lc-en-tcg-xy5-043 dex=[349] |
| 1837 | og-xy5a | 44 | 번호(44) + dex#(350) 일치 but 이름 베이스 불일치: "Milotic" vs "Sharpedo EX - 044/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-044 | keep: lc-en-tcg-xy5-044 dex=[350] |
| 1838 | og-xy5a | 45 | 번호(45) + dex#(363) 일치 but 이름 베이스 불일치: "Spheal" vs "Crawdaunt" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-045 | keep: lc-en-tcg-xy5-045 dex=[363] |
| 1839 | og-xy5a | 46 | 번호(46) + dex#(363) 일치 but 이름 베이스 불일치: "Spheal" vs "Mr. Mime" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-046 | keep: lc-en-tcg-xy5-046 dex=[363] |
| 1840 | og-xy5a | 47 | 번호(47) + dex#(364) 일치 but 이름 베이스 불일치: "Sealeo" vs "Marill" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-047 | keep: lc-en-tcg-xy5-047 dex=[364] |
| 1841 | og-xy5a | 48 | 번호(48) + dex#(365) 일치 but 이름 베이스 불일치: "Walrein" vs "Azumarill - 048/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-048 | keep: lc-en-tcg-xy5-048 dex=[365] |
| 1842 | og-xy5a | 49 | 번호(49) + dex#(366) 일치 but 이름 베이스 불일치: "Clamperl" vs "Azumarill - 049/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-049 | keep: lc-en-tcg-xy5-049 dex=[366] |
| 1843 | og-xy5a | 51 | 번호(51) + dex#(368) 일치 but 이름 베이스 불일치: "Gorebyss" vs "M Gardevoir EX - 051/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-051 | keep: lc-en-tcg-xy5-051 dex=[368] |
| 1844 | og-xy5a | 52 | 번호(52) + dex#(368) 일치 but 이름 베이스 불일치: "Gorebyss" vs "Kingdra - 052/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-052 | keep: lc-en-tcg-xy5-052 dex=[368] |
| 1845 | og-xy5a | 53 | 번호(53) + dex#(382) 일치 but 이름 베이스 불일치: "Kyogre" vs "Kingdra - 053/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-053 | keep: lc-en-tcg-xy5-053 dex=[382] |
| 1846 | og-xy5a | 54 | 번호(54) + dex#(382) 일치 but 이름 베이스 불일치: "Kyogre-EX" vs "Skitty" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-054 | keep: lc-en-tcg-xy5-054 dex=[382] |
| 1847 | og-xy5a | 55 | 번호(55) + dex#(382) 일치 but 이름 베이스 불일치: "Primal Kyogre-EX" vs "Delcatty" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-055 | keep: lc-en-tcg-xy5-055 dex=[382] |
| 1848 | og-xy5a | 56 | 번호(56) + dex#(490) 일치 but 이름 베이스 불일치: "Manaphy" vs "Spinda" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-056 | keep: lc-en-tcg-xy5-056 dex=[490] |
| 1849 | og-xy5a | 57 | 번호(57) + dex#(170) 일치 but 이름 베이스 불일치: "Chinchou" vs "Bidoof - 057/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-057 | keep: lc-en-tcg-xy5-057 dex=[170] |
| 1850 | og-xy5a | 58 | 번호(58) + dex#(171) 일치 but 이름 베이스 불일치: "Lanturn" vs "Bidoof - 058/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-058 | keep: lc-en-tcg-xy5-058 dex=[171] |
| 1851 | og-xy5a | 60 | 번호(60) + dex#(309) 일치 but 이름 베이스 불일치: "Electrike" vs "Escape Rope" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-060 | keep: lc-en-tcg-xy5-060 dex=[309] |
| 1852 | og-xy5a | 62 | 번호(62) + dex#(602) 일치 but 이름 베이스 불일치: "Tynamo" vs "Dive Ball - 062/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-062 | keep: lc-en-tcg-xy5-062 dex=[602] |
| 1853 | og-xy5a | 63 | 번호(63) + dex#(603) 일치 but 이름 베이스 불일치: "Eelektrik" vs "Exp. Share" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-063 | keep: lc-en-tcg-xy5-063 dex=[603] |
| 1854 | og-xy5a | 64 | 번호(64) + dex#(603) 일치 but 이름 베이스 불일치: "Eelektrik" vs "Kyogre Spirit Link" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-064 | keep: lc-en-tcg-xy5-064 dex=[603] |
| 1855 | og-xy5a | 67 | 번호(67) + dex#(30) 일치 but 이름 베이스 불일치: "Nidorina" vs "Professor Birch's Observations - 067/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-067 | keep: lc-en-tcg-xy5-067 dex=[30] |
| 1856 | og-xy5a | 78 | 번호(78) + dex#(299) 일치 but 이름 베이스 불일치: "Nosepass" vs "Professor Birch's Observations - 078/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-078 | keep: lc-en-tcg-xy5-078 dex=[299] |
| 1857 | og-xy5a | 69 | 번호(69) + dex#(31) 일치 but 이름 베이스 불일치: "Nidoqueen" vs "Silent Lab" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-069 | keep: lc-en-tcg-xy5-069 dex=[31] |
| 1858 | og-xy5a | 70 | 번호(70) + dex#(72) 일치 but 이름 베이스 불일치: "Tentacool" vs "Wonder Energy" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-070 | keep: lc-en-tcg-xy5-070 dex=[72] |
| 1859 | og-xy5a | 71 | 번호(71) + dex#(72) 일치 but 이름 베이스 불일치: "Tentacool" vs "Wailord EX - 071/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-071 | keep: lc-en-tcg-xy5-071 dex=[72] |
| 1860 | og-xy5a | 72 | 번호(72) + dex#(73) 일치 but 이름 베이스 불일치: "Tentacruel" vs "Kyogre EX - 072/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-072 | keep: lc-en-tcg-xy5-072 dex=[73] |
| 1861 | og-xy5a | 73 | 번호(73) + dex#(121) 일치 but 이름 베이스 불일치: "Starmie" vs "Primal Kyogre EX - 073/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-073 | keep: lc-en-tcg-xy5-073 dex=[121] |
| 1862 | og-xy5a | 74 | 번호(74) + dex#(111) 일치 but 이름 베이스 불일치: "Rhyhorn" vs "Sharpedo EX - 074/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-074 | keep: lc-en-tcg-xy5-074 dex=[111] |
| 1863 | og-xy5a | 75 | 번호(75) + dex#(112) 일치 but 이름 베이스 불일치: "Rhydon" vs "Gardevoir EX - 075/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-075 | keep: lc-en-tcg-xy5-075 dex=[112] |
| 1864 | og-xy5a | 77 | 번호(77) + dex#(464) 일치 but 이름 베이스 불일치: "Rhyperior" vs "Archie's Ace in the Hole - 077/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-077 | keep: lc-en-tcg-xy5-077 dex=[464] |
| 1865 | og-xy5a | 79 | 번호(79) + dex#(307) 일치 but 이름 베이스 불일치: "Meditite" vs "Enhanced Hammer" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-079 | keep: lc-en-tcg-xy5-079 dex=[307] |
| 1866 | og-xy5a | 6 | 번호(6) + dex#(252) 일치 but 이름 베이스 불일치: "Treecko" vs "Ludicolo - 006/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-006 | keep: lc-en-tcg-xy5-006 dex=[252] |
| 1867 | og-xy5a | 39 | 번호(39) + dex#(339) 일치 but 이름 베이스 불일치: "Barboach" vs "Eelektross" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-039 | keep: lc-en-tcg-xy5-039 dex=[339] |
| 1868 | og-xy5a | 9 | 번호(9) + dex#(254) 일치 but 이름 베이스 불일치: "Sceptile" vs "Horsea" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-009 | keep: lc-en-tcg-xy5-009 dex=[254] |
| 1869 | og-xy5a | 19 | 번호(19) + dex#(709) 일치 but 이름 베이스 불일치: "Trevenant-EX" vs "Whiscash - 019/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-019 | keep: lc-en-tcg-xy5-019 dex=[709] |
| 1870 | og-xy5a | 28 | 번호(28) + dex#(257) 일치 but 이름 베이스 불일치: "Blaziken" vs "Huntail" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-028 | keep: lc-en-tcg-xy5-028 dex=[257] |
| 1871 | og-xy5a | 29 | 번호(29) + dex#(323) 일치 but 이름 베이스 불일치: "Camerupt-EX" vs "Gorebyss - 029/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-029 | keep: lc-en-tcg-xy5-029 dex=[323] |
| 1872 | og-xy5a | 37 | 번호(37) + dex#(272) 일치 but 이름 베이스 불일치: "Ludicolo" vs "Eelektrik - 037/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-037 | keep: lc-en-tcg-xy5-037 dex=[272] |
| 1873 | og-xy5a | 40 | 번호(40) + dex#(340) 일치 but 이름 베이스 불일치: "Whiscash" vs "Tentacool - 040/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-040 | keep: lc-en-tcg-xy5-040 dex=[340] |
| 1874 | og-xy5a | 50 | 번호(50) + dex#(367) 일치 but 이름 베이스 불일치: "Huntail" vs "Gardevoir EX - 050/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-050 | keep: lc-en-tcg-xy5-050 dex=[367] |
| 1875 | og-xy5a | 59 | 번호(59) + dex#(309) 일치 but 이름 베이스 불일치: "Electrike" vs "Bibarel" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-059 | keep: lc-en-tcg-xy5-059 dex=[309] |
| 1876 | og-xy5a | 61 | 번호(61) + dex#(310) 일치 but 이름 베이스 불일치: "Manectric" vs "Fresh Water Set" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-061 | keep: lc-en-tcg-xy5-061 dex=[310] |
| 1877 | og-xy5a | 65 | 번호(65) + dex#(604) 일치 but 이름 베이스 불일치: "Eelektross" vs "Gardevoir Spirit Link" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-065 | keep: lc-en-tcg-xy5-065 dex=[604] |
| 1878 | og-xy5a | 68 | 번호(68) + dex#(31) 일치 but 이름 베이스 불일치: "Nidoqueen" vs "Rough Seas" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-068 | keep: lc-en-tcg-xy5-068 dex=[31] |
| 1879 | og-xy5a | 76 | 번호(76) + dex#(464) 일치 but 이름 베이스 불일치: "Rhyperior" vs "M Gardevoir EX - 076/070" — 번호 스킴 불일치 의심 | lc-en-tcg-xy5-076 | keep: lc-en-tcg-xy5-076 dex=[464] |
| 1880 | og-xy6 | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-xy6-092, lc-en-tcg-xy6-093, lc-en-tcg-xy6-094 ... (+287) | EN sets: en-tcg-xy6, JP sets: jp-tcg-XY6, KR sets: kr-xyb,kr-xye,kr-xy6 |
| 1881 | og-xy7 | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-xy7-070, lc-en-tcg-xy7-071, lc-en-tcg-xy7-073 ... (+286) | EN sets: en-tcg-xy7, JP sets: jp-tcg-XY7, KR sets: kr-xy7,kr-xyc |
| 1882 | og-xy8a | 3 | 번호(3) + dex#(127) 일치 but 이름 베이스 불일치: "Pinsir" vs "Pansage" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-003 | keep: lc-en-tcg-xy8-003 dex=[127] |
| 1883 | og-xy8a | 4 | 번호(4) + dex#(331) 일치 but 이름 베이스 불일치: "Cacnea" vs "Simisage" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-004 | keep: lc-en-tcg-xy8-004 dex=[331] |
| 1884 | og-xy8a | 5 | 번호(5) + dex#(511) 일치 but 이름 베이스 불일치: "Pansage" vs "Chespin" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-005 | keep: lc-en-tcg-xy8-005 dex=[511] |
| 1885 | og-xy8a | 6 | 번호(6) + dex#(512) 일치 but 이름 베이스 불일치: "Simisage" vs "Scatterbug" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-006 | keep: lc-en-tcg-xy8-006 dex=[512] |
| 1886 | og-xy8a | 7 | 번호(7) + dex#(650) 일치 but 이름 베이스 불일치: "Chespin" vs "Spewpa" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-007 | keep: lc-en-tcg-xy8-007 dex=[650] |
| 1887 | og-xy8a | 8 | 번호(8) + dex#(650) 일치 but 이름 베이스 불일치: "Chespin" vs "Vivillon" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-008 | keep: lc-en-tcg-xy8-008 dex=[650] |
| 1888 | og-xy8a | 9 | 번호(9) + dex#(650) 일치 but 이름 베이스 불일치: "Chespin" vs "Cyndaquil" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-009 | keep: lc-en-tcg-xy8-009 dex=[650] |
| 1889 | og-xy8a | 10 | 번호(10) + dex#(651) 일치 but 이름 베이스 불일치: "Quilladin" vs "Quilava" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-010 | keep: lc-en-tcg-xy8-010 dex=[651] |
| 1890 | og-xy8a | 58 | 번호(58) + dex#(92) 일치 but 이름 베이스 불일치: "Gastly" vs "Parallel City" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-058 | keep: lc-en-tcg-xy8-058 dex=[92] |
| 1891 | og-xy8a | 12 | 번호(12) + dex#(652) 일치 but 이름 베이스 불일치: "Chesnaught BREAK" vs "Remoraid" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-012 | keep: lc-en-tcg-xy8-012 dex=[652] |
| 1892 | og-xy8a | 13 | 번호(13) + dex#(664) 일치 but 이름 베이스 불일치: "Scatterbug" vs "Octillery" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-013 | keep: lc-en-tcg-xy8-013 dex=[664] |
| 1893 | og-xy8a | 14 | 번호(14) + dex#(665) 일치 but 이름 베이스 불일치: "Spewpa" vs "Glalie EX - 014/059" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-014 | keep: lc-en-tcg-xy8-014 dex=[665] |
| 1894 | og-xy8a | 15 | 번호(15) + dex#(666) 일치 but 이름 베이스 불일치: "Vivillon" vs "Mega Glalie EX - 015/059" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-015 | keep: lc-en-tcg-xy8-015 dex=[666] |
| 1895 | og-xy8a | 16 | 번호(16) + dex#(672) 일치 but 이름 베이스 불일치: "Skiddo" vs "Panpour" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-016 | keep: lc-en-tcg-xy8-016 dex=[672] |
| 1896 | og-xy8a | 17 | 번호(17) + dex#(673) 일치 but 이름 베이스 불일치: "Gogoat" vs "Simipour" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-017 | keep: lc-en-tcg-xy8-017 dex=[673] |
| 1897 | og-xy8a | 18 | 번호(18) + dex#(155) 일치 but 이름 베이스 불일치: "Cyndaquil" vs "Vanillite" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-018 | keep: lc-en-tcg-xy8-018 dex=[155] |
| 1898 | og-xy8a | 19 | 번호(19) + dex#(156) 일치 but 이름 베이스 불일치: "Quilava" vs "Vanillish" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-019 | keep: lc-en-tcg-xy8-019 dex=[156] |
| 1899 | og-xy8a | 21 | 번호(21) + dex#(229) 일치 but 이름 베이스 불일치: "Houndoom-EX" vs "Magnemite" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-021 | keep: lc-en-tcg-xy8-021 dex=[229] |
| 1900 | og-xy8a | 22 | 번호(22) + dex#(229) 일치 but 이름 베이스 불일치: "M Houndoom-EX" vs "Gastly" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-022 | keep: lc-en-tcg-xy8-022 dex=[229] |
| 1901 | og-xy8a | 23 | 번호(23) + dex#(513) 일치 but 이름 베이스 불일치: "Pansear" vs "Haunter" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-023 | keep: lc-en-tcg-xy8-023 dex=[513] |
| 1902 | og-xy8a | 24 | 번호(24) + dex#(514) 일치 but 이름 베이스 불일치: "Simisear" vs "Gengar" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-024 | keep: lc-en-tcg-xy8-024 dex=[514] |
| 1903 | og-xy8a | 25 | 번호(25) + dex#(653) 일치 but 이름 베이스 불일치: "Fennekin" vs "Mewtwo EX - 025/059" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-025 | keep: lc-en-tcg-xy8-025 dex=[653] |
| 1904 | og-xy8a | 26 | 번호(26) + dex#(654) 일치 but 이름 베이스 불일치: "Braixen" vs "Mega Mewtwo EX - 026/059" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-026 | keep: lc-en-tcg-xy8-026 dex=[654] |
| 1905 | og-xy8a | 27 | 번호(27) + dex#(118) 일치 but 이름 베이스 불일치: "Goldeen" vs "Woobat" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-027 | keep: lc-en-tcg-xy8-027 dex=[118] |
| 1906 | og-xy8a | 28 | 번호(28) + dex#(119) 일치 but 이름 베이스 불일치: "Seaking" vs "Swoobat" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-028 | keep: lc-en-tcg-xy8-028 dex=[119] |
| 1907 | og-xy8a | 29 | 번호(29) + dex#(120) 일치 but 이름 베이스 불일치: "Staryu" vs "Elgyem" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-029 | keep: lc-en-tcg-xy8-029 dex=[120] |
| 1908 | og-xy8a | 31 | 번호(31) + dex#(223) 일치 but 이름 베이스 불일치: "Remoraid" vs "Sandshrew" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-031 | keep: lc-en-tcg-xy8-031 dex=[223] |
| 1909 | og-xy8a | 32 | 번호(32) + dex#(223) 일치 but 이름 베이스 불일치: "Remoraid" vs "Sandslash" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-032 | keep: lc-en-tcg-xy8-032 dex=[223] |
| 1910 | og-xy8a | 33 | 번호(33) + dex#(224) 일치 but 이름 베이스 불일치: "Octillery" vs "Meloetta" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-033 | keep: lc-en-tcg-xy8-033 dex=[224] |
| 1911 | og-xy8a | 34 | 번호(34) + dex#(362) 일치 but 이름 베이스 불일치: "Glalie-EX" vs "Cacturne" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-034 | keep: lc-en-tcg-xy8-034 dex=[362] |
| 1912 | og-xy8a | 35 | 번호(35) + dex#(362) 일치 but 이름 베이스 불일치: "M Glalie-EX" vs "Zorua" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-035 | keep: lc-en-tcg-xy8-035 dex=[362] |
| 1913 | og-xy8a | 36 | 번호(36) + dex#(393) 일치 but 이름 베이스 불일치: "Piplup" vs "Zoroark" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-036 | keep: lc-en-tcg-xy8-036 dex=[393] |
| 1914 | og-xy8a | 37 | 번호(37) + dex#(394) 일치 but 이름 베이스 불일치: "Prinplup" vs "Zoroark BREAK" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-037 | keep: lc-en-tcg-xy8-037 dex=[394] |
| 1915 | og-xy8a | 38 | 번호(38) + dex#(395) 일치 but 이름 베이스 불일치: "Empoleon" vs "Snubbull" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-038 | keep: lc-en-tcg-xy8-038 dex=[395] |
| 1916 | og-xy8a | 39 | 번호(39) + dex#(459) 일치 but 이름 베이스 불일치: "Snover" vs "Granbull" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-039 | keep: lc-en-tcg-xy8-039 dex=[459] |
| 1917 | og-xy8a | 41 | 번호(41) + dex#(515) 일치 but 이름 베이스 불일치: "Panpour" vs "Floette" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-041 | keep: lc-en-tcg-xy8-041 dex=[515] |
| 1918 | og-xy8a | 42 | 번호(42) + dex#(516) 일치 but 이름 베이스 불일치: "Simipour" vs "Florges" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-042 | keep: lc-en-tcg-xy8-042 dex=[516] |
| 1919 | og-xy8a | 43 | 번호(43) + dex#(582) 일치 but 이름 베이스 불일치: "Vanillite" vs "Florges BREAK" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-043 | keep: lc-en-tcg-xy8-043 dex=[582] |
| 1920 | og-xy8a | 44 | 번호(44) + dex#(583) 일치 but 이름 베이스 불일치: "Vanillish" vs "Xerneas" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-044 | keep: lc-en-tcg-xy8-044 dex=[583] |
| 1921 | og-xy8a | 46 | 번호(46) + dex#(656) 일치 but 이름 베이스 불일치: "Froakie" vs "Fraxure" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-046 | keep: lc-en-tcg-xy8-046 dex=[656] |
| 1922 | og-xy8a | 47 | 번호(47) + dex#(657) 일치 but 이름 베이스 불일치: "Frogadier" vs "Haxorus" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-047 | keep: lc-en-tcg-xy8-047 dex=[657] |
| 1923 | og-xy8a | 48 | 번호(48) + dex#(25) 일치 but 이름 베이스 불일치: "Pikachu" vs "Doduo" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-048 | keep: lc-en-tcg-xy8-048 dex=[25] |
| 1924 | og-xy8a | 50 | 번호(50) + dex#(26) 일치 but 이름 베이스 불일치: "Raichu BREAK" vs "Noctowl" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-050 | keep: lc-en-tcg-xy8-050 dex=[26] |
| 1925 | og-xy8a | 51 | 번호(51) + dex#(81) 일치 but 이름 베이스 불일치: "Magnemite" vs "Teddiursa" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-051 | keep: lc-en-tcg-xy8-051 dex=[81] |
| 1926 | og-xy8a | 52 | 번호(52) + dex#(81) 일치 but 이름 베이스 불일치: "Magnemite" vs "Ursaring" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-052 | keep: lc-en-tcg-xy8-052 dex=[81] |
| 1927 | og-xy8a | 53 | 번호(53) + dex#(82) 일치 but 이름 베이스 불일치: "Magneton" vs "Smeargle" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-053 | keep: lc-en-tcg-xy8-053 dex=[82] |
| 1928 | og-xy8a | 54 | 번호(54) + dex#(462) 일치 but 이름 베이스 불일치: "Magnezone" vs "Float Stone" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-054 | keep: lc-en-tcg-xy8-054 dex=[462] |
| 1929 | og-xy8a | 55 | 번호(55) + dex#(243) 일치 but 이름 베이스 불일치: "Raikou" vs "Glalie Spirit Link" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-055 | keep: lc-en-tcg-xy8-055 dex=[243] |
| 1930 | og-xy8a | 56 | 번호(56) + dex#(618) 일치 but 이름 베이스 불일치: "Stunfisk" vs "Mewtwo Spirit Link" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-056 | keep: lc-en-tcg-xy8-056 dex=[618] |
| 1931 | og-xy8a | 57 | 번호(57) + dex#(702) 일치 but 이름 베이스 불일치: "Dedenne" vs "Brigette - 057/059" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-057 | keep: lc-en-tcg-xy8-057 dex=[702] |
| 1932 | og-xy8a | 60 | 번호(60) + dex#(94) 일치 but 이름 베이스 불일치: "Gengar" vs "Glalie EX - 060/059" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-060 | keep: lc-en-tcg-xy8-060 dex=[94] |
| 1933 | og-xy8a | 61 | 번호(61) + dex#(150) 일치 but 이름 베이스 불일치: "Mewtwo-EX" vs "Mega Glalie EX - 061/059" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-061 | keep: lc-en-tcg-xy8-061 dex=[150] |
| 1934 | og-xy8a | 63 | 번호(63) + dex#(150) 일치 but 이름 베이스 불일치: "M Mewtwo-EX" vs "Mewtwo - 063/059" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-063 | keep: lc-en-tcg-xy8-063 dex=[150] |
| 1935 | og-xy8a | 64 | 번호(64) + dex#(150) 일치 but 이름 베이스 불일치: "M Mewtwo-EX" vs "Brigette - 064/059" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-064 | keep: lc-en-tcg-xy8-064 dex=[150] |
| 1936 | og-xy8a | 65 | 번호(65) + dex#(200) 일치 but 이름 베이스 불일치: "Misdreavus" vs "Mewtwo EX - 065/059" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-065 | keep: lc-en-tcg-xy8-065 dex=[200] |
| 1937 | og-xy8a | 1 | 번호(1) + dex#(46) 일치 but 이름 베이스 불일치: "Paras" vs "Pinsir" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-001 | keep: lc-en-tcg-xy8-001 dex=[46] |
| 1938 | og-xy8a | 2 | 번호(2) + dex#(47) 일치 but 이름 베이스 불일치: "Parasect" vs "Cacnea" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-002 | keep: lc-en-tcg-xy8-002 dex=[47] |
| 1939 | og-xy8a | 11 | 번호(11) + dex#(652) 일치 but 이름 베이스 불일치: "Chesnaught" vs "Typhlosion" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-011 | keep: lc-en-tcg-xy8-011 dex=[652] |
| 1940 | og-xy8a | 20 | 번호(20) + dex#(157) 일치 but 이름 베이스 불일치: "Typhlosion" vs "Vanilluxe" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-020 | keep: lc-en-tcg-xy8-020 dex=[157] |
| 1941 | og-xy8a | 30 | 번호(30) + dex#(121) 일치 but 이름 베이스 불일치: "Starmie" vs "Beheeyem" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-030 | keep: lc-en-tcg-xy8-030 dex=[121] |
| 1942 | og-xy8a | 40 | 번호(40) + dex#(460) 일치 but 이름 베이스 불일치: "Abomasnow" vs "Flabebe" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-040 | keep: lc-en-tcg-xy8-040 dex=[460] |
| 1943 | og-xy8a | 45 | 번호(45) + dex#(584) 일치 but 이름 베이스 불일치: "Vanilluxe" vs "Axew" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-045 | keep: lc-en-tcg-xy8-045 dex=[584] |
| 1944 | og-xy8a | 49 | 번호(49) + dex#(26) 일치 but 이름 베이스 불일치: "Raichu" vs "Hoothoot" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-049 | keep: lc-en-tcg-xy8-049 dex=[26] |
| 1945 | og-xy8a | 59 | 번호(59) + dex#(93) 일치 but 이름 베이스 불일치: "Haunter" vs "Rainbow Energy" — 번호 스킴 불일치 의심 | lc-en-tcg-xy8-059 | keep: lc-en-tcg-xy8-059 dex=[93] |
| 1946 | og-xy9 | ALL | 합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험 | lc-en-tcg-xy9-102, lc-en-tcg-xy9-103, lc-en-tcg-xy9-104 ... (+297) | EN sets: en-tcg-xy9, JP sets: jp-tcg-XY9, KR sets: kr-xyd,kr-xy9 |
| 1947 | og-cp1 | 3 | 번호(3) 일치 but dex# 불일치: keep=[363] vs candidate=[] | lc-en-tcg-dc1-003 | keep: lc-en-tcg-dc1-003 dex=[363] |
| 1948 | og-cp1 | 4 | 번호(4) 일치 but dex# 불일치: keep=[364] vs candidate=[] | lc-en-tcg-dc1-004 | keep: lc-en-tcg-dc1-004 dex=[364] |
| 1949 | og-cp1 | 5 | 번호(5) 일치 but dex# 불일치: keep=[365] vs candidate=[] | lc-en-tcg-dc1-005 | keep: lc-en-tcg-dc1-005 dex=[365] |
| 1950 | og-cp1 | 6 | 번호(6) 일치 but dex# 불일치: keep=[382] vs candidate=[] | lc-en-tcg-dc1-006 | keep: lc-en-tcg-dc1-006 dex=[382] |
| 1951 | og-cp1 | 9 | 번호(9) 일치 but dex# 불일치: keep=[336] vs candidate=[] | lc-en-tcg-dc1-009 | keep: lc-en-tcg-dc1-009 dex=[336] |
| 1952 | og-cp1 | 10 | 번호(10) 일치 but dex# 불일치: keep=[343] vs candidate=[] | lc-en-tcg-dc1-010 | keep: lc-en-tcg-dc1-010 dex=[343] |
| 1953 | og-cp1 | 11 | 번호(11) 일치 but dex# 불일치: keep=[344] vs candidate=[] | lc-en-tcg-dc1-011 | keep: lc-en-tcg-dc1-011 dex=[344] |
| 1954 | og-cp1 | 12 | 번호(12) 일치 but dex# 불일치: keep=[304] vs candidate=[] | lc-en-tcg-dc1-012 | keep: lc-en-tcg-dc1-012 dex=[304] |
| 1955 | og-cp1 | 13 | 번호(13) 일치 but dex# 불일치: keep=[305] vs candidate=[] | lc-en-tcg-dc1-013 | keep: lc-en-tcg-dc1-013 dex=[305] |
| 1956 | og-cp1 | 15 | 번호(15) 일치 but dex# 불일치: keep=[383] vs candidate=[] | lc-en-tcg-dc1-015 | keep: lc-en-tcg-dc1-015 dex=[383] |
| 1957 | og-cp1 | 16 | 번호(16) 일치 but dex# 불일치: keep=[261] vs candidate=[] | lc-en-tcg-dc1-016 | keep: lc-en-tcg-dc1-016 dex=[261] |
| 1958 | og-cp1 | 18 | 번호(18) 일치 but dex# 불일치: keep=[262] vs candidate=[] | lc-en-tcg-dc1-018 | keep: lc-en-tcg-dc1-018 dex=[262] |
| 1959 | og-cp1 | 19 | 번호(19) 일치 but dex# 불일치: keep=[262] vs candidate=[] | lc-en-tcg-dc1-019 | keep: lc-en-tcg-dc1-019 dex=[262] |
| 1960 | og-cp1 | 20 | 번호(20) 일치 but dex# 불일치: keep=[318] vs candidate=[] | lc-en-tcg-dc1-020 | keep: lc-en-tcg-dc1-020 dex=[318] |
| 1961 | og-cp1 | 21 | 번호(21) 일치 but dex# 불일치: keep=[319] vs candidate=[] | lc-en-tcg-dc1-021 | keep: lc-en-tcg-dc1-021 dex=[319] |
| 1962 | og-cp1 | 22 | 번호(22) 일치 but dex# 불일치: keep=[335] vs candidate=[] | lc-en-tcg-dc1-022 | keep: lc-en-tcg-dc1-022 dex=[335] |
| 1963 | og-cp1 | 7 | 번호(7) 일치 but dex# 불일치: keep=[88] vs candidate=[] | lc-en-tcg-dc1-007 | keep: lc-en-tcg-dc1-007 dex=[88] |
| 1964 | og-cp1 | 1 | 번호(1) 일치 but dex# 불일치: keep=[322] vs candidate=[] | lc-en-tcg-dc1-001 | keep: lc-en-tcg-dc1-001 dex=[322] |
| 1965 | og-cp1 | 2 | 번호(2) 일치 but dex# 불일치: keep=[323] vs candidate=[] | lc-en-tcg-dc1-002 | keep: lc-en-tcg-dc1-002 dex=[323] |
| 1966 | og-cp1 | 8 | 번호(8) 일치 but dex# 불일치: keep=[89] vs candidate=[] | lc-en-tcg-dc1-008 | keep: lc-en-tcg-dc1-008 dex=[89] |
| 1967 | og-cp1 | 14 | 번호(14) 일치 but dex# 불일치: keep=[306] vs candidate=[] | lc-en-tcg-dc1-014 | keep: lc-en-tcg-dc1-014 dex=[306] |
| 1968 | og-cp1 | 17 | 번호(17) 일치 but dex# 불일치: keep=[261] vs candidate=[] | lc-en-tcg-dc1-017 | keep: lc-en-tcg-dc1-017 dex=[261] |
| 1969 | og-cp6 | 2 | 번호(2) 일치 but dex# 불일치: keep=[3] vs candidate=[] | lc-en-tcg-xy12-002 | keep: lc-en-tcg-xy12-002 dex=[3] |
| 1970 | og-cp6 | 3 | 번호(3) 일치 but dex# 불일치: keep=[10] vs candidate=[] | lc-en-tcg-xy12-003 | keep: lc-en-tcg-xy12-003 dex=[10] |
| 1971 | og-cp6 | 4 | 번호(4) 일치 but dex# 불일치: keep=[11] vs candidate=[] | lc-en-tcg-xy12-004 | keep: lc-en-tcg-xy12-004 dex=[11] |
| 1972 | og-cp6 | 5 | 번호(5) 일치 but dex# 불일치: keep=[13] vs candidate=[] | lc-en-tcg-xy12-005 | keep: lc-en-tcg-xy12-005 dex=[13] |
| 1973 | og-cp6 | 7 | 번호(7) 일치 but dex# 불일치: keep=[15] vs candidate=[] | lc-en-tcg-xy12-007 | keep: lc-en-tcg-xy12-007 dex=[15] |
| 1974 | og-cp6 | 8 | 번호(8) 일치 but dex# 불일치: keep=[114] vs candidate=[] | lc-en-tcg-xy12-008 | keep: lc-en-tcg-xy12-008 dex=[114] |
| 1975 | og-cp6 | 9 | 번호(9) 일치 but dex# 불일치: keep=[4] vs candidate=[] | lc-en-tcg-xy12-009 | keep: lc-en-tcg-xy12-009 dex=[4] |
| 1976 | og-cp6 | 11 | 번호(11) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-xy12-011 | keep: lc-en-tcg-xy12-011 dex=[6] |
| 1977 | og-cp6 | 12 | 번호(12) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-xy12-012 | keep: lc-en-tcg-xy12-012 dex=[6] |
| 1978 | og-cp6 | 13 | 번호(13) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-xy12-013 | keep: lc-en-tcg-xy12-013 dex=[6] |
| 1979 | og-cp6 | 14 | 번호(14) 일치 but dex# 불일치: keep=[37] vs candidate=[] | lc-en-tcg-xy12-014 | keep: lc-en-tcg-xy12-014 dex=[37] |
| 1980 | og-cp6 | 16 | 번호(16) 일치 but dex# 불일치: keep=[38] vs candidate=[] | lc-en-tcg-xy12-016 | keep: lc-en-tcg-xy12-016 dex=[38] |
| 1981 | og-cp6 | 17 | 번호(17) 일치 but dex# 불일치: keep=[58] vs candidate=[] | lc-en-tcg-xy12-017 | keep: lc-en-tcg-xy12-017 dex=[58] |
| 1982 | og-cp6 | 18 | 번호(18) 일치 but dex# 불일치: keep=[59] vs candidate=[] | lc-en-tcg-xy12-018 | keep: lc-en-tcg-xy12-018 dex=[59] |
| 1983 | og-cp6 | 19 | 번호(19) 일치 but dex# 불일치: keep=[77] vs candidate=[] | lc-en-tcg-xy12-019 | keep: lc-en-tcg-xy12-019 dex=[77] |
| 1984 | og-cp6 | 21 | 번호(21) 일치 but dex# 불일치: keep=[9] vs candidate=[] | lc-en-tcg-xy12-021 | keep: lc-en-tcg-xy12-021 dex=[9] |
| 1985 | og-cp6 | 22 | 번호(22) 일치 but dex# 불일치: keep=[9] vs candidate=[] | lc-en-tcg-xy12-022 | keep: lc-en-tcg-xy12-022 dex=[9] |
| 1986 | og-cp6 | 23 | 번호(23) 일치 but dex# 불일치: keep=[60] vs candidate=[] | lc-en-tcg-xy12-023 | keep: lc-en-tcg-xy12-023 dex=[60] |
| 1987 | og-cp6 | 24 | 번호(24) 일치 but dex# 불일치: keep=[61] vs candidate=[] | lc-en-tcg-xy12-024 | keep: lc-en-tcg-xy12-024 dex=[61] |
| 1988 | og-cp6 | 25 | 번호(25) 일치 but dex# 불일치: keep=[62] vs candidate=[] | lc-en-tcg-xy12-025 | keep: lc-en-tcg-xy12-025 dex=[62] |
| 1989 | og-cp6 | 26 | 번호(26) 일치 but dex# 불일치: keep=[80] vs candidate=[] | lc-en-tcg-xy12-026 | keep: lc-en-tcg-xy12-026 dex=[80] |
| 1990 | og-cp6 | 27 | 번호(27) 일치 but dex# 불일치: keep=[80] vs candidate=[] | lc-en-tcg-xy12-027 | keep: lc-en-tcg-xy12-027 dex=[80] |
| 1991 | og-cp6 | 28 | 번호(28) 일치 but dex# 불일치: keep=[86] vs candidate=[] | lc-en-tcg-xy12-028 | keep: lc-en-tcg-xy12-028 dex=[86] |
| 1992 | og-cp6 | 30 | 번호(30) 일치 but dex# 불일치: keep=[120] vs candidate=[] | lc-en-tcg-xy12-030 | keep: lc-en-tcg-xy12-030 dex=[120] |
| 1993 | og-cp6 | 32 | 번호(32) 일치 but dex# 불일치: keep=[121] vs candidate=[] | lc-en-tcg-xy12-032 | keep: lc-en-tcg-xy12-032 dex=[121] |
| 1994 | og-cp6 | 33 | 번호(33) 일치 but dex# 불일치: keep=[129] vs candidate=[] | lc-en-tcg-xy12-033 | keep: lc-en-tcg-xy12-033 dex=[129] |
| 1995 | og-cp6 | 34 | 번호(34) 일치 but dex# 불일치: keep=[130] vs candidate=[] | lc-en-tcg-xy12-034 | keep: lc-en-tcg-xy12-034 dex=[130] |
| 1996 | og-cp6 | 35 | 번호(35) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-en-tcg-xy12-035 | keep: lc-en-tcg-xy12-035 dex=[25] |
| 1997 | og-cp6 | 36 | 번호(36) 일치 but dex# 불일치: keep=[26] vs candidate=[] | lc-en-tcg-xy12-036 | keep: lc-en-tcg-xy12-036 dex=[26] |
| 1998 | og-cp6 | 39 | 번호(39) 일치 but dex# 불일치: keep=[100] vs candidate=[] | lc-en-tcg-xy12-039 | keep: lc-en-tcg-xy12-039 dex=[100] |
| 1999 | og-cp6 | 40 | 번호(40) 일치 but dex# 불일치: keep=[101] vs candidate=[] | lc-en-tcg-xy12-040 | keep: lc-en-tcg-xy12-040 dex=[101] |
| 2000 | og-cp6 | 41 | 번호(41) 일치 but dex# 불일치: keep=[125] vs candidate=[] | lc-en-tcg-xy12-041 | keep: lc-en-tcg-xy12-041 dex=[125] |
| 2001 | og-cp6 | 42 | 번호(42) 일치 but dex# 불일치: keep=[145] vs candidate=[] | lc-en-tcg-xy12-042 | keep: lc-en-tcg-xy12-042 dex=[145] |
| 2002 | og-cp6 | 43 | 번호(43) 일치 but dex# 불일치: keep=[32] vs candidate=[] | lc-en-tcg-xy12-043 | keep: lc-en-tcg-xy12-043 dex=[32] |
| 2003 | og-cp6 | 44 | 번호(44) 일치 but dex# 불일치: keep=[33] vs candidate=[] | lc-en-tcg-xy12-044 | keep: lc-en-tcg-xy12-044 dex=[33] |
| 2004 | og-cp6 | 45 | 번호(45) 일치 but dex# 불일치: keep=[34] vs candidate=[] | lc-en-tcg-xy12-045 | keep: lc-en-tcg-xy12-045 dex=[34] |
| 2005 | og-cp6 | 46 | 번호(46) 일치 but dex# 불일치: keep=[34] vs candidate=[] | lc-en-tcg-xy12-046 | keep: lc-en-tcg-xy12-046 dex=[34] |
| 2006 | og-cp6 | 48 | 번호(48) 일치 but dex# 불일치: keep=[93] vs candidate=[] | lc-en-tcg-xy12-048 | keep: lc-en-tcg-xy12-048 dex=[93] |
| 2007 | og-cp6 | 49 | 번호(49) 일치 but dex# 불일치: keep=[96] vs candidate=[] | lc-en-tcg-xy12-049 | keep: lc-en-tcg-xy12-049 dex=[96] |
| 2008 | og-cp6 | 50 | 번호(50) 일치 but dex# 불일치: keep=[109] vs candidate=[] | lc-en-tcg-xy12-050 | keep: lc-en-tcg-xy12-050 dex=[109] |
| 2009 | og-cp6 | 51 | 번호(51) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-en-tcg-xy12-051 | keep: lc-en-tcg-xy12-051 dex=[150] |
| 2010 | og-cp6 | 52 | 번호(52) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-en-tcg-xy12-052 | keep: lc-en-tcg-xy12-052 dex=[150] |
| 2011 | og-cp6 | 53 | 번호(53) 일치 but dex# 불일치: keep=[151] vs candidate=[] | lc-en-tcg-xy12-053 | keep: lc-en-tcg-xy12-053 dex=[151] |
| 2012 | og-cp6 | 54 | 번호(54) 일치 but dex# 불일치: keep=[27] vs candidate=[] | lc-en-tcg-xy12-054 | keep: lc-en-tcg-xy12-054 dex=[27] |
| 2013 | og-cp6 | 55 | 번호(55) 일치 but dex# 불일치: keep=[50] vs candidate=[] | lc-en-tcg-xy12-055 | keep: lc-en-tcg-xy12-055 dex=[50] |
| 2014 | og-cp6 | 57 | 번호(57) 일치 but dex# 불일치: keep=[66] vs candidate=[] | lc-en-tcg-xy12-057 | keep: lc-en-tcg-xy12-057 dex=[66] |
| 2015 | og-cp6 | 58 | 번호(58) 일치 but dex# 불일치: keep=[67] vs candidate=[] | lc-en-tcg-xy12-058 | keep: lc-en-tcg-xy12-058 dex=[67] |
| 2016 | og-cp6 | 59 | 번호(59) 일치 but dex# 불일치: keep=[68] vs candidate=[] | lc-en-tcg-xy12-059 | keep: lc-en-tcg-xy12-059 dex=[68] |
| 2017 | og-cp6 | 60 | 번호(60) 일치 but dex# 불일치: keep=[68] vs candidate=[] | lc-en-tcg-xy12-060 | keep: lc-en-tcg-xy12-060 dex=[68] |
| 2018 | og-cp6 | 61 | 번호(61) 일치 but dex# 불일치: keep=[95] vs candidate=[] | lc-en-tcg-xy12-061 | keep: lc-en-tcg-xy12-061 dex=[95] |
| 2019 | og-cp6 | 62 | 번호(62) 일치 but dex# 불일치: keep=[107] vs candidate=[] | lc-en-tcg-xy12-062 | keep: lc-en-tcg-xy12-062 dex=[107] |
| 2020 | og-cp6 | 63 | 번호(63) 일치 but dex# 불일치: keep=[35] vs candidate=[] | lc-en-tcg-xy12-063 | keep: lc-en-tcg-xy12-063 dex=[35] |
| 2021 | og-cp6 | 64 | 번호(64) 일치 but dex# 불일치: keep=[18] vs candidate=[] | lc-en-tcg-xy12-064 | keep: lc-en-tcg-xy12-064 dex=[18] |
| 2022 | og-cp6 | 66 | 번호(66) 일치 but dex# 불일치: keep=[19] vs candidate=[] | lc-en-tcg-xy12-066 | keep: lc-en-tcg-xy12-066 dex=[19] |
| 2023 | og-cp6 | 67 | 번호(67) 일치 but dex# 불일치: keep=[20] vs candidate=[] | lc-en-tcg-xy12-067 | keep: lc-en-tcg-xy12-067 dex=[20] |
| 2024 | og-cp6 | 68 | 번호(68) 일치 but dex# 불일치: keep=[83] vs candidate=[] | lc-en-tcg-xy12-068 | keep: lc-en-tcg-xy12-068 dex=[83] |
| 2025 | og-cp6 | 69 | 번호(69) 일치 but dex# 불일치: keep=[84] vs candidate=[] | lc-en-tcg-xy12-069 | keep: lc-en-tcg-xy12-069 dex=[84] |
| 2026 | og-cp6 | 70 | 번호(70) 일치 but dex# 불일치: keep=[113] vs candidate=[] | lc-en-tcg-xy12-070 | keep: lc-en-tcg-xy12-070 dex=[113] |
| 2027 | og-cp6 | 71 | 번호(71) 일치 but dex# 불일치: keep=[137] vs candidate=[] | lc-en-tcg-xy12-071 | keep: lc-en-tcg-xy12-071 dex=[137] |
| 2028 | og-cp6 | 72 | 번호(72) 일치 but dex# 불일치: keep=[149] vs candidate=[] | lc-en-tcg-xy12-072 | keep: lc-en-tcg-xy12-072 dex=[149] |
| 2029 | og-cp6 | 101 | 번호(101) 일치 but dex# 불일치: keep=[6] vs candidate=[] | lc-en-tcg-xy12-101 | keep: lc-en-tcg-xy12-101 dex=[6] |
| 2030 | og-cp6 | 102 | 번호(102) 일치 but dex# 불일치: keep=[9] vs candidate=[] | lc-en-tcg-xy12-102 | keep: lc-en-tcg-xy12-102 dex=[9] |
| 2031 | og-cp6 | 104 | 번호(104) 일치 but dex# 불일치: keep=[18] vs candidate=[] | lc-en-tcg-xy12-104 | keep: lc-en-tcg-xy12-104 dex=[18] |
| 2032 | og-cp6 | 105 | 번호(105) 일치 but dex# 불일치: keep=[18] vs candidate=[] | lc-en-tcg-xy12-105 | keep: lc-en-tcg-xy12-105 dex=[18] |
| 2033 | og-cp6 | 106 | 번호(106) 일치 but dex# 불일치: keep=[149] vs candidate=[] | lc-en-tcg-xy12-106 | keep: lc-en-tcg-xy12-106 dex=[149] |
| 2034 | og-cp6 | 109 | 번호(109) 일치 but dex# 불일치: keep=[103] vs candidate=[] | lc-en-tcg-xy12-109 | keep: lc-en-tcg-xy12-109 dex=[103] |
| 2035 | og-cp6 | 110 | 번호(110) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-en-tcg-xy12-110 | keep: lc-en-tcg-xy12-110 dex=[25] |
| 2036 | og-cp6 | 111 | 번호(111) 일치 but dex# 불일치: keep=[25] vs candidate=[] | lc-en-tcg-xy12-111 | keep: lc-en-tcg-xy12-111 dex=[25] |
| 2037 | og-cp6 | 112 | 번호(112) 일치 but dex# 불일치: keep=[84] vs candidate=[] | lc-en-tcg-xy12-112 | keep: lc-en-tcg-xy12-112 dex=[84] |
| 2038 | og-cp6 | 100 | 번호(100) 일치 but dex# 불일치: keep=[3] vs candidate=[] | lc-en-tcg-xy12-100 | keep: lc-en-tcg-xy12-100 dex=[3] |
| 2039 | og-cp6 | 1 | 번호(1) 일치 but dex# 불일치: keep=[3] vs candidate=[] | lc-en-tcg-xy12-001 | keep: lc-en-tcg-xy12-001 dex=[3] |
| 2040 | og-cp6 | 6 | 번호(6) 일치 but dex# 불일치: keep=[14] vs candidate=[] | lc-en-tcg-xy12-006 | keep: lc-en-tcg-xy12-006 dex=[14] |
| 2041 | og-cp6 | 10 | 번호(10) 일치 but dex# 불일치: keep=[5] vs candidate=[] | lc-en-tcg-xy12-010 | keep: lc-en-tcg-xy12-010 dex=[5] |
| 2042 | og-cp6 | 15 | 번호(15) 일치 but dex# 불일치: keep=[38] vs candidate=[] | lc-en-tcg-xy12-015 | keep: lc-en-tcg-xy12-015 dex=[38] |
| 2043 | og-cp6 | 20 | 번호(20) 일치 but dex# 불일치: keep=[126] vs candidate=[] | lc-en-tcg-xy12-020 | keep: lc-en-tcg-xy12-020 dex=[126] |
| 2044 | og-cp6 | 29 | 번호(29) 일치 but dex# 불일치: keep=[87] vs candidate=[] | lc-en-tcg-xy12-029 | keep: lc-en-tcg-xy12-029 dex=[87] |
| 2045 | og-cp6 | 31 | 번호(31) 일치 but dex# 불일치: keep=[121] vs candidate=[] | lc-en-tcg-xy12-031 | keep: lc-en-tcg-xy12-031 dex=[121] |
| 2046 | og-cp6 | 37 | 번호(37) 일치 but dex# 불일치: keep=[81] vs candidate=[] | lc-en-tcg-xy12-037 | keep: lc-en-tcg-xy12-037 dex=[81] |
| 2047 | og-cp6 | 38 | 번호(38) 일치 but dex# 불일치: keep=[82] vs candidate=[] | lc-en-tcg-xy12-038 | keep: lc-en-tcg-xy12-038 dex=[82] |
| 2048 | og-cp6 | 47 | 번호(47) 일치 but dex# 불일치: keep=[92] vs candidate=[] | lc-en-tcg-xy12-047 | keep: lc-en-tcg-xy12-047 dex=[92] |
| 2049 | og-cp6 | 56 | 번호(56) 일치 but dex# 불일치: keep=[51] vs candidate=[] | lc-en-tcg-xy12-056 | keep: lc-en-tcg-xy12-056 dex=[51] |
| 2050 | og-cp6 | 65 | 번호(65) 일치 but dex# 불일치: keep=[18] vs candidate=[] | lc-en-tcg-xy12-065 | keep: lc-en-tcg-xy12-065 dex=[18] |
| 2051 | og-cp6 | 103 | 번호(103) 일치 but dex# 불일치: keep=[150] vs candidate=[] | lc-en-tcg-xy12-103 | keep: lc-en-tcg-xy12-103 dex=[150] |

## 5. 위험 케이스 처리 결과

### 합본 Set (자동 ambiguous 처리)

| SetGroup | Era | ambiguous로 분류된 LC |
|---|---|---|
| mega-brave-symphonia | MEGA | 184 |
| mega-dream-ex | MEGA | 250 |
| mega-ninja-spinner | MEGA | 120 |
| og-s10d | S (소드·실드) | 304 |
| og-s11a | S (소드·실드) | 398 |
| og-s12 | S (소드·실드) | 245 |
| og-s1w | S (소드·실드) | 359 |
| og-s2 | S (소드·실드) | 430 |
| og-s2a | S (소드·실드) | 365 |
| og-s6a | S (소드·실드) | 188 |
| og-s6h | S (소드·실드) | 328 |
| og-s8 | S (소드·실드) | 510 |
| og-s8a | S (소드·실드) | 86 |
| og-s9 | S (소드·실드) | 438 |
| og-sm11a | SM (썬·문) | 411 |
| og-sm11b | SM (썬·문) | 143 |
| og-sm1s | SM (썬·문) | 311 |
| og-sm3h | SM (썬·문) | 290 |
| og-sm4s | SM (썬·문) | 241 |
| og-sm7 | SM (썬·문) | 399 |
| og-sm9 | SM (썬·문) | 423 |
| sv-base | SV | 474 |
| sv-black-bolt-white-flare | SV | 693 |
| sv-crimson-haze | SV | 96 |
| sv-destined-rivals | SV | 338 |
| sv-heatwave-arena | SV | 92 |
| sv-journey-together | SV | 308 |
| sv-obsidian-flames | SV | 353 |
| sv-paldea-evolved | SV | 477 |
| sv-paldean-fates | SV | 245 |
| sv-paradise-dragona | SV | 94 |
| sv-paradox-rift | SV | 456 |
| sv-prismatic-evolutions | SV | 57 |
| sv-raging-surf | SV | 92 |
| sv-shrouded-fable | SV | 99 |
| sv-stellar-crown | SV | 40 |
| sv-surging-sparks | SV | 146 |
| sv-temporal-forces | SV | 267 |
| sv-triplet-beat | SV | 103 |
| sv-twilight-masquerade | SV | 325 |
| og-xy10 | XY | 300 |
| og-xy11a | XY | 175 |
| og-xy1a | XY | 209 |
| og-xy4 | XY | 314 |
| og-xy6 | XY | 290 |
| og-xy7 | XY | 289 |
| og-xy9 | XY | 300 |

## 6. 다음 단계

1. **이 보고서 검토**: 샘플 100쌍이 실제로 같은 카드인지 확인
2. **ambiguous 케이스 결정**: 합본 set 처리 방침 확정 필요
3. **머지 실행**: 사용자 OK 후 별도 스크립트(`scripts/apply-card-merge.ts`) 실행
   - 입력: `docs/card-merge-candidates.json`
   - 동작: mergeLcIds의 CardLocale을 keepLcId로 재연결 후 mergeLcIds LogicalCard 삭제
4. **Trainer/Energy 교차 매칭**: EN↔JP 이름 번역 맵 구축 후 medium confidence 확장

> 백업: `prisma/backups/logicalcard-cardlocale-20260531.json.bak` (100.7MB, LC 63,037 / CL 66,845)