# Phase A Verification: JP L Sets + EN HGSS Sets

생성 일시: 2026-05-30 16:07:26 UTC

대상: JP L (l1a, l1b, l2, ll, l3) + EN HGSS (hgss1, hsp, hgss2, hgss3, hgss4, col1).

## 0) tcgdex 커버리지 (JP L Sets)

tcgdex 가 보유한 카드 수 vs DB cardCount.

| JP Set | DB cardCount | tcgdex 카드 | 커버율 | 비고 |
| --- | --- | --- | --- | --- |
| jp-tcg-L1a | 142 | 71 | 50.0% | 71장 미보유 |
| jp-tcg-L1b | 141 | 71 | 50.4% | 70장 미보유 |
| jp-tcg-L2 | 19 | 19 | 100.0% | ✓ 완전 |
| jp-tcg-LL | 40 | 40 | 100.0% | ✓ 완전 |
| jp-tcg-L3 | 161 | 81 | 50.3% | 80장 미보유 |

## A) 이미지 라이브니스 (Image Liveness)

EN(pokemontcg.io) 및 JP(Supabase/archives) 이미지 HTTP 상태 점검 (HEAD, 10 concurrent).

| 세트 | EN OK | EN 실패 | JP OK | JP 실패 | EN 성공률 | JP 성공률 |
| --- | --- | --- | --- | --- | --- | --- |
| L1a | 0 | 0 | 70 | 1 | — | 98.6% |
| L1b | 0 | 0 | 70 | 1 | — | 98.6% |
| L2 | 0 | 0 | 19 | 0 | — | 100.0% |
| L3 | 0 | 0 | 80 | 1 | — | 98.8% |
| LL | 0 | 0 | 40 | 0 | — | 100.0% |
| col1 | 106 | 0 | 0 | 97 | 100.0% | 0.0% |
| hgss1 | 124 | 0 | 0 | 106 | 100.0% | 0.0% |
| hgss2 | 95 | 1 | 0 | 87 | 99.0% | 0.0% |
| hgss3 | 91 | 0 | 0 | 67 | 100.0% | 0.0% |
| hgss4 | 103 | 0 | 0 | 72 | 100.0% | 0.0% |
| hsp | 24 | 1 | 0 | 0 | 96.0% | — |

**EN 전체:** 543/545 (99.6%)
**JP 전체:** 279/711 (39.2%)

### 실패 목록 (434건)
| ID | 이름 | Region | URL | HTTP |
| --- | --- | --- | --- | --- |
| en-tcg-hgss2-019 | Lucario | EN | https://images.pokemontcg.io/hgss2/19.png | 0 |
| en-tcg-hsp-HGSS18 | Tropical Tidal Wave | EN | https://images.pokemontcg.io/hsp/HGSS18.png | 404 |
| jp-tcg-L1a-70 | Double Colorless Energy (Mirror Holofoil) | JP | https://tcgplayer-cdn.tcgplayer.com/product/608193_200w.jpg | 403 |
| jp-tcg-L1b-70 | Rainbow Energy (Mirror Holofoil) | JP | https://tcgplayer-cdn.tcgplayer.com/product/608376_200w.jpg | 403 |
| jp-tcg-L3-80 | Rescue Energy (Mirror Holofoil) | JP | https://tcgplayer-cdn.tcgplayer.com/product/608537_200w.jpg | 403 |
| jp-tcg-col1-072 | モンジャラ | JP | (null) | 0 |
| jp-tcg-col1-073 | ヒメグマ | JP | (null) | 0 |
| jp-tcg-col1-074 | ワニノコ | JP | (null) | 0 |
| jp-tcg-col1-004 | エーフィ | JP | (null) | 0 |
| jp-tcg-col1-007 | ギャラドス | JP | (null) | 0 |
| jp-tcg-col1-008 | カポエラー | JP | (null) | 0 |
| jp-tcg-col1-010 | ヘルガー | JP | (null) | 0 |
| jp-tcg-col1-011 | ジラーチ | JP | (null) | 0 |
| jp-tcg-col1-013 | リーフィア | JP | (null) | 0 |
| jp-tcg-col1-016 | ブーバーン | JP | (null) | 0 |
| jp-tcg-col1-017 | キュウコン | JP | (null) | 0 |
| jp-tcg-col1-018 | パチリス | JP | (null) | 0 |
| jp-tcg-col1-021 | ドーブル | JP | (null) | 0 |
| jp-tcg-col1-022 | ブラッキー | JP | (null) | 0 |
| jp-tcg-col1-024 | ピィ | JP | (null) | 0 |
| jp-tcg-col1-025 | オーダイル | JP | (null) | 0 |
| jp-tcg-col1-026 | グランブル | JP | (null) | 0 |
| jp-tcg-col1-027 | メガニウム | JP | (null) | 0 |
| jp-tcg-col1-028 | ムウマージ | JP | (null) | 0 |
| jp-tcg-col1-029 | バリヤード | JP | (null) | 0 |
| jp-tcg-col1-030 | ピジョット | JP | (null) | 0 |
| jp-tcg-col1-031 | エアームド | JP | (null) | 0 |
| jp-tcg-col1-033 | カビゴン | JP | (null) | 0 |
| jp-tcg-col1-034 | モジャンボ | JP | (null) | 0 |
| jp-tcg-col1-035 | バクフーン | JP | (null) | 0 |
| jp-tcg-col1-036 | バルキー | JP | (null) | 0 |
| jp-tcg-col1-037 | リングマ | JP | (null) | 0 |
| jp-tcg-col1-038 | マタドガス | JP | (null) | 0 |
| jp-tcg-col1-039 | ザングース | JP | (null) | 0 |
| jp-tcg-col1-040 | ベイリーフ | JP | (null) | 0 |
| jp-tcg-col1-043 | モココ | JP | (null) | 0 |
| jp-tcg-col1-044 | ブースター | JP | (null) | 0 |
| jp-tcg-col1-045 | サンダース | JP | (null) | 0 |
| jp-tcg-col1-046 | ブビィ | JP | (null) | 0 |
| jp-tcg-col1-047 | マネネ | JP | (null) | 0 |
| jp-tcg-col1-048 | ピジョン | JP | (null) | 0 |
| jp-tcg-col1-049 | マグマラシ | JP | (null) | 0 |
| jp-tcg-col1-050 | リオル | JP | (null) | 0 |
| jp-tcg-col1-052 | シャワーズ | JP | (null) | 0 |
| jp-tcg-col1-053 | チコリータ | JP | (null) | 0 |
| jp-tcg-col1-054 | ピッピ | JP | (null) | 0 |
| jp-tcg-col1-055 | ヒノアラシ | JP | (null) | 0 |
| jp-tcg-col1-056 | イーブイ | JP | (null) | 0 |
| jp-tcg-col1-057 | エビワラー | JP | (null) | 0 |
| jp-tcg-col1-058 | サワムラー | JP | (null) | 0 |
| jp-tcg-col1-059 | デルビル | JP | (null) | 0 |
| jp-tcg-col1-060 | ドガース | JP | (null) | 0 |
| jp-tcg-col1-062 | ブーバー | JP | (null) | 0 |
| jp-tcg-col1-063 | メリープ | JP | (null) | 0 |
| jp-tcg-col1-064 | クチート | JP | (null) | 0 |
| jp-tcg-col1-065 | ムウマ | JP | (null) | 0 |
| jp-tcg-col1-066 | ゴマゾウ | JP | (null) | 0 |
| jp-tcg-col1-067 | ポッポ | JP | (null) | 0 |
| jp-tcg-col1-068 | クヌギダマ | JP | (null) | 0 |
| jp-tcg-col1-069 | ジーランス | JP | (null) | 0 |
| jp-tcg-col1-070 | ヤドン | JP | (null) | 0 |
| jp-tcg-col1-076 | Cheerleader's Cheer | JP | (null) | 0 |
| jp-tcg-col1-077 | Copycat | JP | (null) | 0 |
| jp-tcg-col1-078 | Dual Ball | JP | (null) | 0 |
| jp-tcg-col1-079 | Interviewer's Questions | JP | (null) | 0 |
| jp-tcg-col1-080 | Lost Remover | JP | (null) | 0 |
| jp-tcg-col1-081 | Lost World | JP | (null) | 0 |
| jp-tcg-col1-082 | Professor Elm's Training Method | JP | (null) | 0 |
| jp-tcg-col1-083 | Professor Oak's New Theory | JP | (null) | 0 |
| jp-tcg-col1-084 | Research Record | JP | (null) | 0 |
| jp-tcg-col1-085 | Sage's Training | JP | (null) | 0 |
| jp-tcg-col1-086 | Darkness Energy | JP | (null) | 0 |
| jp-tcg-col1-095 | Metal Energy | JP | (null) | 0 |
| jp-tcg-col1-088 | Grass Energy | JP | (null) | 0 |
| jp-tcg-col1-089 | Fire Energy | JP | (null) | 0 |
| jp-tcg-col1-090 | Water Energy | JP | (null) | 0 |
| jp-tcg-col1-091 | Lightning Energy | JP | (null) | 0 |
| jp-tcg-col1-092 | Psychic Energy | JP | (null) | 0 |
| jp-tcg-col1-093 | Fighting Energy | JP | (null) | 0 |
| jp-tcg-col1-SL3 | エンテイ | JP | (null) | 0 |
| jp-tcg-col1-SL9 | ライコウ | JP | (null) | 0 |
| jp-tcg-col1-SL11 | スイクン | JP | (null) | 0 |
| jp-tcg-col1-012 | カイオーガ | JP | (null) | 0 |
| jp-tcg-col1-075 | ロコン | JP | (null) | 0 |
| jp-tcg-col1-SL2 | ディアルガ | JP | (null) | 0 |
| jp-tcg-col1-SL4 | グラードン | JP | (null) | 0 |
| jp-tcg-col1-SL5 | ホウオウ | JP | (null) | 0 |
| jp-tcg-col1-SL6 | カイオーガ | JP | (null) | 0 |
| jp-tcg-col1-SL8 | パルキア | JP | (null) | 0 |
| jp-tcg-col1-SL10 | レックウザ | JP | (null) | 0 |
| jp-tcg-col1-001 | ピクシー | JP | (null) | 0 |
| jp-tcg-col1-005 | フォレトス | JP | (null) | 0 |
| jp-tcg-col1-014 | ルカリオ | JP | (null) | 0 |
| jp-tcg-col1-023 | デンリュウ | JP | (null) | 0 |
| jp-tcg-col1-032 | ヤドキング | JP | (null) | 0 |
| jp-tcg-col1-041 | アリゲイツ | JP | (null) | 0 |
| jp-tcg-col1-042 | ドンファン | JP | (null) | 0 |
| jp-tcg-col1-051 | ハブネーク | JP | (null) | 0 |
| jp-tcg-col1-061 | コイキング | JP | (null) | 0 |
| jp-tcg-col1-071 | ブルー | JP | (null) | 0 |
| jp-tcg-col1-SL1 | デオキシス | JP | (null) | 0 |
| jp-tcg-col1-SL7 | ルギア | JP | (null) | 0 |
| jp-tcg-hgss1-083 | イトマル | JP | (null) | 0 |
| jp-tcg-hgss1-015 | アリアドス | JP | (null) | 0 |
| jp-tcg-hgss1-067 | ハネッコ | JP | (null) | 0 |
| jp-tcg-hgss1-051 | ポポッコ | JP | (null) | 0 |
| jp-tcg-hgss1-085 | ヒマナッツ | JP | (null) | 0 |
| jp-tcg-hgss1-031 | キマワリ | JP | (null) | 0 |
| jp-tcg-hgss1-043 | ヘラクロス | JP | (null) | 0 |
| jp-tcg-hgss1-065 | ガーディ | JP | (null) | 0 |
| jp-tcg-hgss1-091 | Energy Switch | JP | (null) | 0 |
| jp-tcg-hgss1-102 | Switch | JP | (null) | 0 |
| jp-tcg-hgss1-099 | Pokémon Reversal | JP | (null) | 0 |
| jp-tcg-hgss1-095 | Poké Ball | JP | (null) | 0 |
| jp-tcg-hgss1-100 | Professor Elm's Training Method | JP | (null) | 0 |
| jp-tcg-hgss1-101 | Professor Oak's New Theory | JP | (null) | 0 |
| jp-tcg-hgss1-089 | Bill | JP | (null) | 0 |
| jp-tcg-hgss1-103 | Double Colorless Energy | JP | (null) | 0 |
| jp-tcg-hgss1-ONE | Alph Lithograph | JP | (null) | 0 |
| jp-tcg-hgss1-093 | Full Heal | JP | (null) | 0 |
| jp-tcg-hgss1-096 | Pokégear 3.0 | JP | (null) | 0 |
| jp-tcg-hgss1-098 | Pokémon Communication | JP | (null) | 0 |
| jp-tcg-hgss1-094 | Moomoo Milk | JP | (null) | 0 |
| jp-tcg-hgss1-092 | Fisherman | JP | (null) | 0 |
| jp-tcg-hgss1-097 | Pokémon Collector | JP | (null) | 0 |
| jp-tcg-hgss1-090 | Copycat | JP | (null) | 0 |
| jp-tcg-hgss1-104 | Rainbow Energy | JP | (null) | 0 |
| jp-tcg-hgss1-055 | アンノーン | JP | (null) | 0 |
| jp-tcg-hgss1-002 | マリルリ | JP | (null) | 0 |
| jp-tcg-hgss1-003 | ピクシー | JP | (null) | 0 |
| jp-tcg-hgss1-005 | カポエラー | JP | (null) | 0 |
| jp-tcg-hgss1-006 | ワタッコ | JP | (null) | 0 |
| jp-tcg-hgss1-007 | キュウコン | JP | (null) | 0 |
| jp-tcg-hgss1-008 | ヨルノズク | JP | (null) | 0 |
| jp-tcg-hgss1-009 | ヌオー | JP | (null) | 0 |
| jp-tcg-hgss1-011 | ツボツボ | JP | (null) | 0 |
| jp-tcg-hgss1-012 | ヤドキング | JP | (null) | 0 |
| jp-tcg-hgss1-013 | ソーナンス | JP | (null) | 0 |
| jp-tcg-hgss1-016 | バタフリー | JP | (null) | 0 |
| jp-tcg-hgss1-017 | ピィ | JP | (null) | 0 |
| jp-tcg-hgss1-018 | ナッシー | JP | (null) | 0 |
| jp-tcg-hgss1-020 | オーダイル | JP | (null) | 0 |
| jp-tcg-hgss1-021 | オオタチ | JP | (null) | 0 |
| jp-tcg-hgss1-022 | グランブル | JP | (null) | 0 |
| jp-tcg-hgss1-023 | スリーパー | JP | (null) | 0 |
| jp-tcg-hgss1-024 | ラプラス | JP | (null) | 0 |
| jp-tcg-hgss1-025 | レディアン | JP | (null) | 0 |
| jp-tcg-hgss1-027 | ペルシアン | JP | (null) | 0 |
| jp-tcg-hgss1-029 | サンドパン | JP | (null) | 0 |
| jp-tcg-hgss1-030 | ムチュール | JP | (null) | 0 |
| jp-tcg-hgss1-033 | バルキー | JP | (null) | 0 |
| jp-tcg-hgss1-034 | マタドガス | JP | (null) | 0 |
| jp-tcg-hgss1-035 | ベイリーフ | JP | (null) | 0 |
| jp-tcg-hgss1-036 | ハピナス | JP | (null) | 0 |
| jp-tcg-hgss1-038 | アリゲイツ | JP | (null) | 0 |
| jp-tcg-hgss1-039 | デリバード | JP | (null) | 0 |
| jp-tcg-hgss1-041 | ノコッチ | JP | (null) | 0 |
| jp-tcg-hgss1-042 | モココ | JP | (null) | 0 |
| jp-tcg-hgss1-044 | ププリン | JP | (null) | 0 |
| jp-tcg-hgss1-045 | マンタイン | JP | (null) | 0 |
| jp-tcg-hgss1-047 | ミルタンク | JP | (null) | 0 |
| jp-tcg-hgss1-048 | パラセクト | JP | (null) | 0 |
| jp-tcg-hgss1-049 | マグマラシ | JP | (null) | 0 |
| jp-tcg-hgss1-050 | ハリーセン | JP | (null) | 0 |
| jp-tcg-hgss1-052 | ヤドラン | JP | (null) | 0 |
| jp-tcg-hgss1-053 | スターミー | JP | (null) | 0 |
| jp-tcg-hgss1-057 | キャタピー | JP | (null) | 0 |
| jp-tcg-hgss1-058 | ラッキー | JP | (null) | 0 |
| jp-tcg-hgss1-059 | チコリータ | JP | (null) | 0 |
| jp-tcg-hgss1-060 | ピッピ | JP | (null) | 0 |
| jp-tcg-hgss1-061 | ヒノアラシ | JP | (null) | 0 |
| jp-tcg-hgss1-062 | スリープ | JP | (null) | 0 |
| jp-tcg-hgss1-063 | タマタマ | JP | (null) | 0 |
| jp-tcg-hgss1-064 | キリンリキ | JP | (null) | 0 |
| jp-tcg-hgss1-068 | プリン | JP | (null) | 0 |
| jp-tcg-hgss1-069 | ルージュラ | JP | (null) | 0 |
| jp-tcg-hgss1-070 | ドガース | JP | (null) | 0 |
| jp-tcg-hgss1-071 | レディバ | JP | (null) | 0 |
| jp-tcg-hgss1-072 | コイキング | JP | (null) | 0 |
| jp-tcg-hgss1-073 | メリープ | JP | (null) | 0 |
| jp-tcg-hgss1-074 | マリル | JP | (null) | 0 |
| jp-tcg-hgss1-075 | ニャース | JP | (null) | 0 |
| jp-tcg-hgss1-077 | ゴマゾウ | JP | (null) | 0 |
| jp-tcg-hgss1-078 | ピカチュウ | JP | (null) | 0 |
| jp-tcg-hgss1-079 | サンド | JP | (null) | 0 |
| jp-tcg-hgss1-080 | オタチ | JP | (null) | 0 |
| jp-tcg-hgss1-081 | ヤドン | JP | (null) | 0 |
| jp-tcg-hgss1-082 | ブルー | JP | (null) | 0 |
| jp-tcg-hgss1-084 | ヒトデマン | JP | (null) | 0 |
| jp-tcg-hgss1-088 | ウパー | JP | (null) | 0 |
| jp-tcg-hgss1-106 | ハピナス | JP | (null) | 0 |
| jp-tcg-hgss1-107 | ドンファン | JP | (null) | 0 |
| jp-tcg-hgss1-108 | オーダイル | JP | (null) | 0 |
| jp-tcg-hgss1-109 | メガニウム | JP | (null) | 0 |
| jp-tcg-hgss1-110 | バクフーン | JP | (null) | 0 |
| jp-tcg-hgss1-123 | ギャラドス | JP | (null) | 0 |
| jp-tcg-hgss1-001 | ウインディ | JP | (null) | 0 |
| jp-tcg-hgss1-019 | カモネギ | JP | (null) | 0 |
| jp-tcg-hgss1-028 | ピチュー | JP | (null) | 0 |
| jp-tcg-hgss1-037 | サニーゴ | JP | (null) | 0 |
| jp-tcg-hgss1-046 | トランセル | JP | (null) | 0 |
| jp-tcg-hgss1-056 | プクリン | JP | (null) | 0 |
| jp-tcg-hgss1-066 | ホーホー | JP | (null) | 0 |
| jp-tcg-hgss1-076 | パラス | JP | (null) | 0 |
| jp-tcg-hgss1-086 | ワニノコ | JP | (null) | 0 |
| jp-tcg-hgss1-087 | ロコン | JP | (null) | 0 |
| jp-tcg-hgss1-105 | デンリュウ | JP | (null) | 0 |
| jp-tcg-hgss1-010 | ライチュウ | JP | (null) | 0 |
| jp-tcg-hgss2-071 | Cheerleader's Cheer | JP | (null) | 0 |
| jp-tcg-hgss2-072 | Dual Ball | JP | (null) | 0 |
| jp-tcg-hgss2-073 | Emcee's Chatter | JP | (null) | 0 |
| jp-tcg-hgss2-074 | Energy Returner | JP | (null) | 0 |
| jp-tcg-hgss2-075 | Engineer's Adjustments | JP | (null) | 0 |
| jp-tcg-hgss2-076 | Good Rod | JP | (null) | 0 |
| jp-tcg-hgss2-077 | Interviewer's Questions | JP | (null) | 0 |
| jp-tcg-hgss2-078 | Judge | JP | (null) | 0 |
| jp-tcg-hgss2-079 | Life Herb | JP | (null) | 0 |
| jp-tcg-hgss2-080 | PlusPower | JP | (null) | 0 |
| jp-tcg-hgss2-081 | Pokémon Circulator | JP | (null) | 0 |
| jp-tcg-hgss2-082 | Rare Candy | JP | (null) | 0 |
| jp-tcg-hgss2-083 | Super Scoop Up | JP | (null) | 0 |
| jp-tcg-hgss2-TWO | Alph Lithograph | JP | (null) | 0 |
| jp-tcg-hgss2-002 | ブーバーン | JP | (null) | 0 |
| jp-tcg-hgss2-003 | マナフィ | JP | (null) | 0 |
| jp-tcg-hgss2-005 | ムウマージ | JP | (null) | 0 |
| jp-tcg-hgss2-006 | オクタン | JP | (null) | 0 |
| jp-tcg-hgss2-007 | ニョロトノ | JP | (null) | 0 |
| jp-tcg-hgss2-008 | シェイミ | JP | (null) | 0 |
| jp-tcg-hgss2-009 | ウソッキー | JP | (null) | 0 |
| jp-tcg-hgss2-010 | ドダイトス | JP | (null) | 0 |
| jp-tcg-hgss2-011 | ネイティオ | JP | (null) | 0 |
| jp-tcg-hgss2-015 | オニドリル | JP | (null) | 0 |
| jp-tcg-hgss2-016 | フローゼル | JP | (null) | 0 |
| jp-tcg-hgss2-019 | ルカリオ | JP | (null) | 0 |
| jp-tcg-hgss2-020 | キュウコン | JP | (null) | 0 |
| jp-tcg-hgss2-022 | オコリザル | JP | (null) | 0 |
| jp-tcg-hgss2-023 | ロズレイド | JP | (null) | 0 |
| jp-tcg-hgss2-025 | コータス | JP | (null) | 0 |
| jp-tcg-hgss2-028 | チェリム | JP | (null) | 0 |
| jp-tcg-hgss2-030 | ゴルバット | JP | (null) | 0 |
| jp-tcg-hgss2-032 | コクーン | JP | (null) | 0 |
| jp-tcg-hgss2-033 | メタング | JP | (null) | 0 |
| jp-tcg-hgss2-034 | マイナン | JP | (null) | 0 |
| jp-tcg-hgss2-035 | ドンメル | JP | (null) | 0 |
| jp-tcg-hgss2-036 | プラスル | JP | (null) | 0 |
| jp-tcg-hgss2-037 | ニョロゾ | JP | (null) | 0 |
| jp-tcg-hgss2-040 | シードラ | JP | (null) | 0 |
| jp-tcg-hgss2-041 | ケンタロス | JP | (null) | 0 |
| jp-tcg-hgss2-042 | カメール | JP | (null) | 0 |
| jp-tcg-hgss2-043 | エイパム | JP | (null) | 0 |
| jp-tcg-hgss2-044 | ダンバル | JP | (null) | 0 |
| jp-tcg-hgss2-045 | ブイゼル | JP | (null) | 0 |
| jp-tcg-hgss2-046 | マスキッパ | JP | (null) | 0 |
| jp-tcg-hgss2-047 | チェリンボ | JP | (null) | 0 |
| jp-tcg-hgss2-048 | チョンチー | JP | (null) | 0 |
| jp-tcg-hgss2-051 | ヨーギラス | JP | (null) | 0 |
| jp-tcg-hgss2-052 | ブーバー | JP | (null) | 0 |
| jp-tcg-hgss2-053 | マンキー | JP | (null) | 0 |
| jp-tcg-hgss2-054 | ムウマ | JP | (null) | 0 |
| jp-tcg-hgss2-055 | ネイティ | JP | (null) | 0 |
| jp-tcg-hgss2-057 | イワーク | JP | (null) | 0 |
| jp-tcg-hgss2-059 | テッポウオ | JP | (null) | 0 |
| jp-tcg-hgss2-060 | リオル | JP | (null) | 0 |
| jp-tcg-hgss2-061 | ロゼリア | JP | (null) | 0 |
| jp-tcg-hgss2-062 | オニスズメ | JP | (null) | 0 |
| jp-tcg-hgss2-063 | ゼニガメ | JP | (null) | 0 |
| jp-tcg-hgss2-064 | オドシシ | JP | (null) | 0 |
| jp-tcg-hgss2-065 | ヒメグマ | JP | (null) | 0 |
| jp-tcg-hgss2-068 | ロコン | JP | (null) | 0 |
| jp-tcg-hgss2-069 | ビードル | JP | (null) | 0 |
| jp-tcg-hgss2-070 | ズバット | JP | (null) | 0 |
| jp-tcg-hgss2-085 | キングドラ | JP | (null) | 0 |
| jp-tcg-hgss2-086 | ランターン | JP | (null) | 0 |
| jp-tcg-hgss2-088 | バンギラス | JP | (null) | 0 |
| jp-tcg-hgss2-089 | リングマ | JP | (null) | 0 |
| jp-tcg-hgss2-091 | ライコウ | JP | (null) | 0 |
| jp-tcg-hgss2-093 | ライコウ | JP | (null) | 0 |
| jp-tcg-hgss2-094 | エンテイ | JP | (null) | 0 |
| jp-tcg-hgss2-095 | エンテイ | JP | (null) | 0 |
| jp-tcg-hgss2-001 | ジラーチ | JP | (null) | 0 |
| jp-tcg-hgss2-004 | メタグロス | JP | (null) | 0 |
| jp-tcg-hgss2-012 | スピアー | JP | (null) | 0 |
| jp-tcg-hgss2-013 | カメックス | JP | (null) | 0 |
| jp-tcg-hgss2-021 | ニョロボン | JP | (null) | 0 |
| jp-tcg-hgss2-029 | ノコッチ | JP | (null) | 0 |
| jp-tcg-hgss2-031 | ハヤシガメ | JP | (null) | 0 |
| jp-tcg-hgss2-039 | サナギラス | JP | (null) | 0 |
| jp-tcg-hgss2-049 | タッツー | JP | (null) | 0 |
| jp-tcg-hgss2-058 | ニョロモ | JP | (null) | 0 |
| jp-tcg-hgss2-066 | トロピウス | JP | (null) | 0 |
| jp-tcg-hgss2-067 | ナエトル | JP | (null) | 0 |
| jp-tcg-hgss2-084 | クロバット | JP | (null) | 0 |
| jp-tcg-hgss2-087 | ハガネール | JP | (null) | 0 |
| jp-tcg-hgss2-090 | ライコウ | JP | (null) | 0 |
| jp-tcg-hgss2-092 | ライコウ | JP | (null) | 0 |
| jp-tcg-hgss3-THREE | Alph Lithograph | JP | (null) | 0 |
| jp-tcg-hgss3-011 | ドードリオ | JP | (null) | 0 |
| jp-tcg-hgss3-048 | イーブイ | JP | (null) | 0 |
| jp-tcg-hgss3-070 | トゲピー | JP | (null) | 0 |
| jp-tcg-hgss3-039 | トゲチック | JP | (null) | 0 |
| jp-tcg-hgss3-009 | トゲキッス | JP | (null) | 0 |
| jp-tcg-hgss3-008 | ドーブル | JP | (null) | 0 |
| jp-tcg-hgss3-066 | ヤドン | JP | (null) | 0 |
| jp-tcg-hgss3-073 | Energy Exchanger | JP | (null) | 0 |
| jp-tcg-hgss3-072 | Defender | JP | (null) | 0 |
| jp-tcg-hgss3-071 | Rare Candy | JP | (null) | 0 |
| jp-tcg-hgss3-075 | Legend Box | JP | (null) | 0 |
| jp-tcg-hgss3-074 | Flower Shop Lady | JP | (null) | 0 |
| jp-tcg-hgss3-077 | Sage's Training | JP | (null) | 0 |
| jp-tcg-hgss3-078 | Team Rocket's Trickery | JP | (null) | 0 |
| jp-tcg-hgss3-076 | Ruins of Alph | JP | (null) | 0 |
| jp-tcg-hgss3-079 | Darkness Energy | JP | (null) | 0 |
| jp-tcg-hgss3-080 | Metal Energy | JP | (null) | 0 |
| jp-tcg-hgss3-001 | キレイハナ | JP | (null) | 0 |
| jp-tcg-hgss3-002 | エーフィ | JP | (null) | 0 |
| jp-tcg-hgss3-006 | マグカルゴ | JP | (null) | 0 |
| jp-tcg-hgss3-013 | フォレトス | JP | (null) | 0 |
| jp-tcg-hgss3-015 | ドンカラス | JP | (null) | 0 |
| jp-tcg-hgss3-016 | ドンカラス | JP | (null) | 0 |
| jp-tcg-hgss3-018 | メタグロス | JP | (null) | 0 |
| jp-tcg-hgss3-019 | ムウマージ | JP | (null) | 0 |
| jp-tcg-hgss3-021 | エアームド | JP | (null) | 0 |
| jp-tcg-hgss3-024 | ラフレシア | JP | (null) | 0 |
| jp-tcg-hgss3-025 | マニューラ | JP | (null) | 0 |
| jp-tcg-hgss3-027 | クサイハナ | JP | (null) | 0 |
| jp-tcg-hgss3-028 | サンダース | JP | (null) | 0 |
| jp-tcg-hgss3-030 | メタング | JP | (null) | 0 |
| jp-tcg-hgss3-031 | ベトベトン | JP | (null) | 0 |
| jp-tcg-hgss3-034 | ラッタ | JP | (null) | 0 |
| jp-tcg-hgss3-040 | アンノーン | JP | (null) | 0 |
| jp-tcg-hgss3-041 | シャワーズ | JP | (null) | 0 |
| jp-tcg-hgss3-043 | ダンバル | JP | (null) | 0 |
| jp-tcg-hgss3-045 | ドードー | JP | (null) | 0 |
| jp-tcg-hgss3-046 | フワンテ | JP | (null) | 0 |
| jp-tcg-hgss3-047 | イーブイ | JP | (null) | 0 |
| jp-tcg-hgss3-049 | グライガー | JP | (null) | 0 |
| jp-tcg-hgss3-050 | ベトベター | JP | (null) | 0 |
| jp-tcg-hgss3-055 | マクノシタ | JP | (null) | 0 |
| jp-tcg-hgss3-056 | クチート | JP | (null) | 0 |
| jp-tcg-hgss3-057 | ムウマ | JP | (null) | 0 |
| jp-tcg-hgss3-059 | ヤミカラス | JP | (null) | 0 |
| jp-tcg-hgss3-060 | ナゾノクサ | JP | (null) | 0 |
| jp-tcg-hgss3-064 | コラッタ | JP | (null) | 0 |
| jp-tcg-hgss3-065 | ストライク | JP | (null) | 0 |
| jp-tcg-hgss3-067 | マグマッグ | JP | (null) | 0 |
| jp-tcg-hgss3-082 | ヘルガー | JP | (null) | 0 |
| jp-tcg-hgss3-084 | ハッサム | JP | (null) | 0 |
| jp-tcg-hgss3-086 | ブラッキー | JP | (null) | 0 |
| jp-tcg-hgss3-003 | フォレトス | JP | (null) | 0 |
| jp-tcg-hgss3-004 | グライオン | JP | (null) | 0 |
| jp-tcg-hgss3-012 | フワライド | JP | (null) | 0 |
| jp-tcg-hgss3-014 | ハリテヤマ | JP | (null) | 0 |
| jp-tcg-hgss3-020 | ロトム | JP | (null) | 0 |
| jp-tcg-hgss3-023 | ビークイン | JP | (null) | 0 |
| jp-tcg-hgss3-026 | ブースター | JP | (null) | 0 |
| jp-tcg-hgss3-035 | ヤミラミ | JP | (null) | 0 |
| jp-tcg-hgss3-044 | ミツハニー | JP | (null) | 0 |
| jp-tcg-hgss3-054 | デルビル | JP | (null) | 0 |
| jp-tcg-hgss3-063 | クヌギダマ | JP | (null) | 0 |
| jp-tcg-hgss3-068 | ニューラ | JP | (null) | 0 |
| jp-tcg-hgss3-081 | エーフィ | JP | (null) | 0 |
| jp-tcg-hgss3-033 | ライチュウ | JP | (null) | 0 |
| jp-tcg-hgss4-087 | Junk Arm | JP | (null) | 0 |
| jp-tcg-hgss4-085 | Black Belt | JP | (null) | 0 |
| jp-tcg-hgss4-089 | Twins | JP | (null) | 0 |
| jp-tcg-hgss4-086 | Indigo Plateau | JP | (null) | 0 |
| jp-tcg-hgss4-090 | Rescue Energy | JP | (null) | 0 |
| jp-tcg-hgss4-FOUR | Alph Lithograph | JP | (null) | 0 |
| jp-tcg-hgss4-001 | ボスゴドラ | JP | (null) | 0 |
| jp-tcg-hgss4-002 | チルタリス | JP | (null) | 0 |
| jp-tcg-hgss4-003 | セレビィ | JP | (null) | 0 |
| jp-tcg-hgss4-004 | ドラピオン | JP | (null) | 0 |
| jp-tcg-hgss4-005 | マンムー | JP | (null) | 0 |
| jp-tcg-hgss4-006 | ニドキング | JP | (null) | 0 |
| jp-tcg-hgss4-008 | ギャロップ | JP | (null) | 0 |
| jp-tcg-hgss4-009 | ソルロック | JP | (null) | 0 |
| jp-tcg-hgss4-012 | ウツボット | JP | (null) | 0 |
| jp-tcg-hgss4-013 | エテボース | JP | (null) | 0 |
| jp-tcg-hgss4-017 | メタモン | JP | (null) | 0 |
| jp-tcg-hgss4-020 | エレキブル | JP | (null) | 0 |
| jp-tcg-hgss4-021 | エレキッド | JP | (null) | 0 |
| jp-tcg-hgss4-022 | ゴルダック | JP | (null) | 0 |
| jp-tcg-hgss4-023 | ブーピッグ | JP | (null) | 0 |
| jp-tcg-hgss4-025 | ルナトーン | JP | (null) | 0 |
| jp-tcg-hgss4-026 | カイリキー | JP | (null) | 0 |
| jp-tcg-hgss4-027 | ブーバーン | JP | (null) | 0 |
| jp-tcg-hgss4-028 | ニドクイン | JP | (null) | 0 |
| jp-tcg-hgss4-029 | ピジョット | JP | (null) | 0 |
| jp-tcg-hgss4-031 | ホエルオー | JP | (null) | 0 |
| jp-tcg-hgss4-033 | エレブー | JP | (null) | 0 |
| jp-tcg-hgss4-034 | マルマイン | JP | (null) | 0 |
| jp-tcg-hgss4-036 | ガルーラ | JP | (null) | 0 |
| jp-tcg-hgss4-037 | コドラ | JP | (null) | 0 |
| jp-tcg-hgss4-038 | ベロベルト | JP | (null) | 0 |
| jp-tcg-hgss4-039 | ラブカス | JP | (null) | 0 |
| jp-tcg-hgss4-040 | ゴーリキー | JP | (null) | 0 |
| jp-tcg-hgss4-042 | ブーバー | JP | (null) | 0 |
| jp-tcg-hgss4-044 | ガラガラ | JP | (null) | 0 |
| jp-tcg-hgss4-045 | ニドリーナ | JP | (null) | 0 |
| jp-tcg-hgss4-046 | ニドリーノ | JP | (null) | 0 |
| jp-tcg-hgss4-047 | ピジョン | JP | (null) | 0 |
| jp-tcg-hgss4-048 | イノムー | JP | (null) | 0 |
| jp-tcg-hgss4-049 | ポリゴン２ | JP | (null) | 0 |
| jp-tcg-hgss4-051 | アンノーン | JP | (null) | 0 |
| jp-tcg-hgss4-052 | ホエルコ | JP | (null) | 0 |
| jp-tcg-hgss4-053 | ウツドン | JP | (null) | 0 |
| jp-tcg-hgss4-054 | メガヤンマ | JP | (null) | 0 |
| jp-tcg-hgss4-055 | エイパム | JP | (null) | 0 |
| jp-tcg-hgss4-056 | ココドラ | JP | (null) | 0 |
| jp-tcg-hgss4-057 | マダツボミ | JP | (null) | 0 |
| jp-tcg-hgss4-058 | ドーミラー | JP | (null) | 0 |
| jp-tcg-hgss4-065 | コロボーシ | JP | (null) | 0 |
| jp-tcg-hgss4-066 | ベロリンガ | JP | (null) | 0 |
| jp-tcg-hgss4-067 | ワンリキー | JP | (null) | 0 |
| jp-tcg-hgss4-070 | ニドラン♂ | JP | (null) | 0 |
| jp-tcg-hgss4-071 | ポッポ | JP | (null) | 0 |
| jp-tcg-hgss4-072 | ポニータ | JP | (null) | 0 |
| jp-tcg-hgss4-073 | ポリゴン | JP | (null) | 0 |
| jp-tcg-hgss4-074 | コダック | JP | (null) | 0 |
| jp-tcg-hgss4-075 | カゲボウズ | JP | (null) | 0 |
| jp-tcg-hgss4-076 | スコルピ | JP | (null) | 0 |
| jp-tcg-hgss4-077 | バネブー | JP | (null) | 0 |
| jp-tcg-hgss4-080 | メノクラゲ | JP | (null) | 0 |
| jp-tcg-hgss4-083 | ビリリダマ | JP | (null) | 0 |
| jp-tcg-hgss4-084 | ヤンヤンマ | JP | (null) | 0 |
| jp-tcg-hgss4-007 | ポリゴンＺ | JP | (null) | 0 |
| jp-tcg-hgss4-015 | ドータクン | JP | (null) | 0 |
| jp-tcg-hgss4-024 | コロトック | JP | (null) | 0 |
| jp-tcg-hgss4-030 | サメハダー | JP | (null) | 0 |
| jp-tcg-hgss4-041 | ブビィ | JP | (null) | 0 |
| jp-tcg-hgss4-050 | ドククラゲ | JP | (null) | 0 |
| jp-tcg-hgss4-059 | キバニア | JP | (null) | 0 |
| jp-tcg-hgss4-060 | カラカラ | JP | (null) | 0 |
| jp-tcg-hgss4-079 | ウリムー | JP | (null) | 0 |

## B) 필드 완성도 감사 (Field Completeness)

각 SetGroup/Set 의 LogicalCard 필드 채움률.

| 세트 | 총계 | hp | types | attacks | abilities | subtypes | illustrator | rarityId | pokedexNumbers | supertype | nameKo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| og-col1 | 106 | 81.1% | 81.1% | 81.1% | 13.2% | 100.0% | 92.5% | 100.0% | 81.1% | 100.0% | 80.2% |
| og-hgss1 | 124 | 79.8% | 79.8% | 79.8% | 19.4% | 100.0% | 93.5% | 100.0% | 79.8% | 100.0% | 79.8% |
| og-hgss2 | 96 | 85.4% | 85.4% | 85.4% | 16.7% | 100.0% | 100.0% | 100.0% | 85.4% | 100.0% | 85.4% |
| og-hgss3 | 91 | 87.9% | 87.9% | 87.9% | 18.7% | 100.0% | 100.0% | 100.0% | 87.9% | 100.0% | 86.8% |
| og-hgss4 | 103 | 93.2% | 93.2% | 93.2% | 22.3% | 100.0% | 100.0% | 100.0% | 93.2% | 100.0% | 93.2% |
| og-hsp | 25 | 96.0% | 96.0% | 96.0% | 44.0% | 100.0% | 100.0% | 100.0% | 96.0% | 100.0% | 96.0% |
| og-l1a | 71 | 85.9% | 0.0% | 85.9% | 0.0% | 0.0% | 97.2% | 97.2% | 0.0% | 0.0% | 0.0% |
| og-l1b | 71 | 87.3% | 0.0% | 87.3% | 0.0% | 0.0% | 98.6% | 98.6% | 0.0% | 0.0% | 0.0% |
| og-l2 | 19 | 57.9% | 0.0% | 57.9% | 0.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0.0% | 0.0% |
| og-l3 | 81 | 92.6% | 0.0% | 92.6% | 0.0% | 0.0% | 98.8% | 100.0% | 0.0% | 0.0% | 0.0% |
| og-ll | 40 | 90.0% | 0.0% | 90.0% | 0.0% | 0.0% | 100.0% | 100.0% | 0.0% | 0.0% | 0.0% |

## C) 인덱스 연속성 (ID Contiguity)

CardLocale ID 가 1~N 연속인지 점검.

| 세트 | Region | cardCount | 실제 | 갭 | 중복 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| col1 | EN | 106 | 95 | 11 | 0 | ! |
| hgss1 | EN | 124 | 123 | 1 | 0 | ! |
| hgss2 | EN | 96 | 95 | 1 | 0 | ! |
| hgss3 | EN | 91 | 90 | 1 | 0 | ! |
| hgss4 | EN | 103 | 102 | 1 | 0 | ! |
| L1a | JP | 142 | 70 | 72 | 0 | ! |
| L1b | JP | 141 | 71 | 70 | 0 | ! |
| L2 | JP | 19 | 19 | 0 | 0 | ✓ |
| L3 | JP | 161 | 81 | 80 | 0 | ! |
| LL | JP | 40 | 40 | 0 | 0 | ✓ |
| col1 | JP | 109 | 86 | 23 | 0 | ! |
| hgss1 | JP | 219 | 105 | 114 | 0 | ! |
| hgss2 | JP | 99 | 86 | 13 | 0 | ! |
| hgss3 | JP | 84 | 66 | 19 | 0 | ! |
| hgss4 | JP | 89 | 71 | 19 | 0 | ! |

**EN col1 갭:** 096, 097, 098, 099, 100, 101, 102, 103, 104, 105, 106

**EN hgss1 갭:** 124

**EN hgss2 갭:** 096

**EN hgss3 갭:** 091

**EN hgss4 갭:** 103

**JP L1a 갭:** 72건 (첫 5: 046, 072, 073, 074, 075...)

**JP L1b 갭:** 70건 (첫 5: 072, 073, 074, 075, 076...)

**JP L3 갭:** 80건 (첫 5: 082, 083, 084, 085, 086...)

**JP col1 갭:** 23건 (첫 5: 002, 003, 006, 009, 015...)

**JP hgss1 갭:** 114건 (첫 5: 004, 014, 026, 032, 040...)

**JP hgss2 갭:** 014, 017, 018, 024, 026, 027, 038, 050, 056, 096, 097, 098, 099

**JP hgss3 갭:** 005, 007, 010, 017, 022, 029, 032, 036, 037, 038, 042, 051, 052, 053, 058, 061, 062, 069, 083

**JP hgss4 갭:** 010, 011, 014, 016, 018, 019, 032, 035, 043, 061, 062, 063, 064, 068, 069, 078, 081, 082, 088

## E) 누락 이미지 카드

imageSmall 이 NULL 인 CardLocale.

### JP 누락 (429건)
| ID | 이름 | 세트 |
| --- | --- | --- |
| jp-tcg-col1-072 | モンジャラ | jp-tcg-col1 |
| jp-tcg-col1-073 | ヒメグマ | jp-tcg-col1 |
| jp-tcg-col1-074 | ワニノコ | jp-tcg-col1 |
| jp-tcg-col1-004 | エーフィ | jp-tcg-col1 |
| jp-tcg-col1-007 | ギャラドス | jp-tcg-col1 |
| jp-tcg-col1-008 | カポエラー | jp-tcg-col1 |
| jp-tcg-col1-010 | ヘルガー | jp-tcg-col1 |
| jp-tcg-col1-011 | ジラーチ | jp-tcg-col1 |
| jp-tcg-col1-013 | リーフィア | jp-tcg-col1 |
| jp-tcg-col1-016 | ブーバーン | jp-tcg-col1 |
| jp-tcg-col1-017 | キュウコン | jp-tcg-col1 |
| jp-tcg-col1-018 | パチリス | jp-tcg-col1 |
| jp-tcg-col1-021 | ドーブル | jp-tcg-col1 |
| jp-tcg-col1-022 | ブラッキー | jp-tcg-col1 |
| jp-tcg-col1-024 | ピィ | jp-tcg-col1 |
| jp-tcg-col1-025 | オーダイル | jp-tcg-col1 |
| jp-tcg-col1-026 | グランブル | jp-tcg-col1 |
| jp-tcg-col1-027 | メガニウム | jp-tcg-col1 |
| jp-tcg-col1-028 | ムウマージ | jp-tcg-col1 |
| jp-tcg-col1-029 | バリヤード | jp-tcg-col1 |
| jp-tcg-col1-030 | ピジョット | jp-tcg-col1 |
| jp-tcg-col1-031 | エアームド | jp-tcg-col1 |
| jp-tcg-col1-033 | カビゴン | jp-tcg-col1 |
| jp-tcg-col1-034 | モジャンボ | jp-tcg-col1 |
| jp-tcg-col1-035 | バクフーン | jp-tcg-col1 |
| jp-tcg-col1-036 | バルキー | jp-tcg-col1 |
| jp-tcg-col1-037 | リングマ | jp-tcg-col1 |
| jp-tcg-col1-038 | マタドガス | jp-tcg-col1 |
| jp-tcg-col1-039 | ザングース | jp-tcg-col1 |
| jp-tcg-col1-040 | ベイリーフ | jp-tcg-col1 |
| jp-tcg-col1-043 | モココ | jp-tcg-col1 |
| jp-tcg-col1-044 | ブースター | jp-tcg-col1 |
| jp-tcg-col1-045 | サンダース | jp-tcg-col1 |
| jp-tcg-col1-046 | ブビィ | jp-tcg-col1 |
| jp-tcg-col1-047 | マネネ | jp-tcg-col1 |
| jp-tcg-col1-048 | ピジョン | jp-tcg-col1 |
| jp-tcg-col1-049 | マグマラシ | jp-tcg-col1 |
| jp-tcg-col1-050 | リオル | jp-tcg-col1 |
| jp-tcg-col1-052 | シャワーズ | jp-tcg-col1 |
| jp-tcg-col1-053 | チコリータ | jp-tcg-col1 |
| jp-tcg-col1-054 | ピッピ | jp-tcg-col1 |
| jp-tcg-col1-055 | ヒノアラシ | jp-tcg-col1 |
| jp-tcg-col1-056 | イーブイ | jp-tcg-col1 |
| jp-tcg-col1-057 | エビワラー | jp-tcg-col1 |
| jp-tcg-col1-058 | サワムラー | jp-tcg-col1 |
| jp-tcg-col1-059 | デルビル | jp-tcg-col1 |
| jp-tcg-col1-060 | ドガース | jp-tcg-col1 |
| jp-tcg-col1-062 | ブーバー | jp-tcg-col1 |
| jp-tcg-col1-063 | メリープ | jp-tcg-col1 |
| jp-tcg-col1-064 | クチート | jp-tcg-col1 |
(... 379건 생략)

## F) Supertype 분류
| 세트 | 합계 | (null) | Energy | Pokémon | Trainer |
| --- | --- | --- | --- | --- | --- |
| og-l1a | 71 | 71 | 0 | 0 | 0 |
| og-l1b | 71 | 71 | 0 | 0 | 0 |
| og-l2 | 19 | 19 | 0 | 0 | 0 |
| og-l3 | 81 | 81 | 0 | 0 | 0 |
| og-ll | 40 | 40 | 0 | 0 | 0 |
| og-col1 | 106 | 0 | 10 | 86 | 10 |
| og-hgss1 | 124 | 0 | 10 | 99 | 15 |
| og-hgss2 | 96 | 0 | 0 | 82 | 14 |
| og-hgss3 | 91 | 0 | 2 | 80 | 9 |
| og-hgss4 | 103 | 0 | 1 | 96 | 6 |
| og-hsp | 25 | 0 | 0 | 24 | 1 |

### Null supertype (282건)
| LogicalCard ID | 이름 |
| --- | --- |
| lc-orphan-jp-tcg-L1a-2 | lc-orphan-jp-tcg-L1a-2 |
| lc-orphan-jp-tcg-L1a-3 | lc-orphan-jp-tcg-L1a-3 |
| lc-orphan-jp-tcg-L1a-5 | lc-orphan-jp-tcg-L1a-5 |
| lc-orphan-jp-tcg-L1a-7 | lc-orphan-jp-tcg-L1a-7 |
| lc-orphan-jp-tcg-L1a-8 | lc-orphan-jp-tcg-L1a-8 |
| lc-orphan-jp-tcg-L1a-21 | lc-orphan-jp-tcg-L1a-21 |
| lc-orphan-jp-tcg-L1a-29 | lc-orphan-jp-tcg-L1a-29 |
| lc-orphan-jp-tcg-L1a-57 | lc-orphan-jp-tcg-L1a-57 |
| lc-orphan-jp-tcg-L1a-1 | lc-orphan-jp-tcg-L1a-1 |
| lc-orphan-jp-tcg-L1a-10 | lc-orphan-jp-tcg-L1a-10 |
| lc-orphan-jp-tcg-L1a-11 | lc-orphan-jp-tcg-L1a-11 |
| lc-orphan-jp-tcg-L1a-12 | lc-orphan-jp-tcg-L1a-12 |
| lc-orphan-jp-tcg-L1a-13 | lc-orphan-jp-tcg-L1a-13 |
| lc-orphan-jp-tcg-L1a-14 | lc-orphan-jp-tcg-L1a-14 |
| lc-orphan-jp-tcg-L1a-15 | lc-orphan-jp-tcg-L1a-15 |
| lc-orphan-jp-tcg-L1a-16 | lc-orphan-jp-tcg-L1a-16 |
| lc-orphan-jp-tcg-L1a-17 | lc-orphan-jp-tcg-L1a-17 |
| lc-orphan-jp-tcg-L1a-18 | lc-orphan-jp-tcg-L1a-18 |
| lc-orphan-jp-tcg-L1a-19 | lc-orphan-jp-tcg-L1a-19 |
| lc-orphan-jp-tcg-L1a-20 | lc-orphan-jp-tcg-L1a-20 |
| lc-orphan-jp-tcg-L1a-22 | lc-orphan-jp-tcg-L1a-22 |
| lc-orphan-jp-tcg-L1a-23 | lc-orphan-jp-tcg-L1a-23 |
| lc-orphan-jp-tcg-L1a-24 | lc-orphan-jp-tcg-L1a-24 |
| lc-orphan-jp-tcg-L1a-25 | lc-orphan-jp-tcg-L1a-25 |
| lc-orphan-jp-tcg-L1a-26 | lc-orphan-jp-tcg-L1a-26 |
| lc-orphan-jp-tcg-L1a-27 | lc-orphan-jp-tcg-L1a-27 |
| lc-orphan-jp-tcg-L1a-28 | lc-orphan-jp-tcg-L1a-28 |
| lc-orphan-jp-tcg-L1a-30 | lc-orphan-jp-tcg-L1a-30 |
| lc-orphan-jp-tcg-L1a-31 | lc-orphan-jp-tcg-L1a-31 |
| lc-orphan-jp-tcg-L1a-32 | lc-orphan-jp-tcg-L1a-32 |
| lc-orphan-jp-tcg-L1a-33 | lc-orphan-jp-tcg-L1a-33 |
| lc-orphan-jp-tcg-L1a-34 | lc-orphan-jp-tcg-L1a-34 |
| lc-orphan-jp-tcg-L1a-35 | lc-orphan-jp-tcg-L1a-35 |
| lc-orphan-jp-tcg-L1a-36 | lc-orphan-jp-tcg-L1a-36 |
| lc-orphan-jp-tcg-L1a-37 | lc-orphan-jp-tcg-L1a-37 |
| lc-orphan-jp-tcg-L1a-38 | lc-orphan-jp-tcg-L1a-38 |
| lc-orphan-jp-tcg-L1a-39 | lc-orphan-jp-tcg-L1a-39 |
| lc-orphan-jp-tcg-L1a-4 | lc-orphan-jp-tcg-L1a-4 |
| lc-orphan-jp-tcg-L1a-40 | lc-orphan-jp-tcg-L1a-40 |
| lc-orphan-jp-tcg-L1a-41 | lc-orphan-jp-tcg-L1a-41 |
| lc-orphan-jp-tcg-L1a-42 | lc-orphan-jp-tcg-L1a-42 |
| lc-orphan-jp-tcg-L1a-43 | lc-orphan-jp-tcg-L1a-43 |
| lc-orphan-jp-tcg-L1a-44 | lc-orphan-jp-tcg-L1a-44 |
| lc-orphan-jp-tcg-L1a-45 | lc-orphan-jp-tcg-L1a-45 |
| lc-orphan-jp-tcg-L1a-47 | lc-orphan-jp-tcg-L1a-47 |
| lc-orphan-jp-tcg-L1a-48 | lc-orphan-jp-tcg-L1a-48 |
| lc-orphan-jp-tcg-L1a-49 | lc-orphan-jp-tcg-L1a-49 |
| lc-orphan-jp-tcg-L1a-50 | lc-orphan-jp-tcg-L1a-50 |
| lc-orphan-jp-tcg-L1a-51 | lc-orphan-jp-tcg-L1a-51 |
| lc-orphan-jp-tcg-L1a-52 | lc-orphan-jp-tcg-L1a-52 |
| lc-orphan-jp-tcg-L1a-53 | lc-orphan-jp-tcg-L1a-53 |
| lc-orphan-jp-tcg-L1a-54 | lc-orphan-jp-tcg-L1a-54 |
| lc-orphan-jp-tcg-L1a-55 | lc-orphan-jp-tcg-L1a-55 |
| lc-orphan-jp-tcg-L1a-56 | lc-orphan-jp-tcg-L1a-56 |
| lc-orphan-jp-tcg-L1a-58 | lc-orphan-jp-tcg-L1a-58 |
| lc-orphan-jp-tcg-L1a-59 | lc-orphan-jp-tcg-L1a-59 |
| lc-orphan-jp-tcg-L1a-6 | lc-orphan-jp-tcg-L1a-6 |
| lc-orphan-jp-tcg-L1a-60 | lc-orphan-jp-tcg-L1a-60 |
| lc-orphan-jp-tcg-L1a-61 | lc-orphan-jp-tcg-L1a-61 |
| lc-orphan-jp-tcg-L1a-62 | lc-orphan-jp-tcg-L1a-62 |
| lc-orphan-jp-tcg-L1a-63 | lc-orphan-jp-tcg-L1a-63 |
| lc-orphan-jp-tcg-L1a-64 | lc-orphan-jp-tcg-L1a-64 |
| lc-orphan-jp-tcg-L1a-65 | lc-orphan-jp-tcg-L1a-65 |
| lc-orphan-jp-tcg-L1a-66 | lc-orphan-jp-tcg-L1a-66 |
| lc-orphan-jp-tcg-L1a-67 | lc-orphan-jp-tcg-L1a-67 |
| lc-orphan-jp-tcg-L1a-68 | lc-orphan-jp-tcg-L1a-68 |
| lc-orphan-jp-tcg-L1a-69 | lc-orphan-jp-tcg-L1a-69 |
| lc-orphan-jp-tcg-L1a-70 | lc-orphan-jp-tcg-L1a-70 |
| lc-orphan-jp-tcg-L1a-71 | lc-orphan-jp-tcg-L1a-71 |
| lc-orphan-jp-tcg-L1a-9 | lc-orphan-jp-tcg-L1a-9 |
| lc-orphan-jp-tcg-L1a-DAR | lc-orphan-jp-tcg-L1a-DAR |
| lc-orphan-jp-tcg-L1b-2 | lc-orphan-jp-tcg-L1b-2 |
| lc-orphan-jp-tcg-L1b-3 | lc-orphan-jp-tcg-L1b-3 |
| lc-orphan-jp-tcg-L1b-4 | lc-orphan-jp-tcg-L1b-4 |
| lc-orphan-jp-tcg-L1b-6 | lc-orphan-jp-tcg-L1b-6 |
| lc-orphan-jp-tcg-L1b-47 | lc-orphan-jp-tcg-L1b-47 |
| lc-orphan-jp-tcg-L1b-52 | lc-orphan-jp-tcg-L1b-52 |
| lc-orphan-jp-tcg-L1b-1 | lc-orphan-jp-tcg-L1b-1 |
| lc-orphan-jp-tcg-L1b-10 | lc-orphan-jp-tcg-L1b-10 |
| lc-orphan-jp-tcg-L1b-11 | lc-orphan-jp-tcg-L1b-11 |
| lc-orphan-jp-tcg-L1b-12 | lc-orphan-jp-tcg-L1b-12 |
| lc-orphan-jp-tcg-L1b-13 | lc-orphan-jp-tcg-L1b-13 |
| lc-orphan-jp-tcg-L1b-14 | lc-orphan-jp-tcg-L1b-14 |
| lc-orphan-jp-tcg-L1b-15 | lc-orphan-jp-tcg-L1b-15 |
| lc-orphan-jp-tcg-L1b-16 | lc-orphan-jp-tcg-L1b-16 |
| lc-orphan-jp-tcg-L1b-17 | lc-orphan-jp-tcg-L1b-17 |
| lc-orphan-jp-tcg-L1b-18 | lc-orphan-jp-tcg-L1b-18 |
| lc-orphan-jp-tcg-L1b-19 | lc-orphan-jp-tcg-L1b-19 |
| lc-orphan-jp-tcg-L1b-20 | lc-orphan-jp-tcg-L1b-20 |
| lc-orphan-jp-tcg-L1b-21 | lc-orphan-jp-tcg-L1b-21 |
| lc-orphan-jp-tcg-L1b-22 | lc-orphan-jp-tcg-L1b-22 |
| lc-orphan-jp-tcg-L1b-23 | lc-orphan-jp-tcg-L1b-23 |
| lc-orphan-jp-tcg-L1b-24 | lc-orphan-jp-tcg-L1b-24 |
| lc-orphan-jp-tcg-L1b-25 | lc-orphan-jp-tcg-L1b-25 |
| lc-orphan-jp-tcg-L1b-26 | lc-orphan-jp-tcg-L1b-26 |
| lc-orphan-jp-tcg-L1b-27 | lc-orphan-jp-tcg-L1b-27 |
| lc-orphan-jp-tcg-L1b-28 | lc-orphan-jp-tcg-L1b-28 |
| lc-orphan-jp-tcg-L1b-29 | lc-orphan-jp-tcg-L1b-29 |
| lc-orphan-jp-tcg-L1b-30 | lc-orphan-jp-tcg-L1b-30 |
| lc-orphan-jp-tcg-L1b-31 | lc-orphan-jp-tcg-L1b-31 |
| lc-orphan-jp-tcg-L1b-32 | lc-orphan-jp-tcg-L1b-32 |
| lc-orphan-jp-tcg-L1b-33 | lc-orphan-jp-tcg-L1b-33 |
| lc-orphan-jp-tcg-L1b-34 | lc-orphan-jp-tcg-L1b-34 |
| lc-orphan-jp-tcg-L1b-35 | lc-orphan-jp-tcg-L1b-35 |
| lc-orphan-jp-tcg-L1b-9 | lc-orphan-jp-tcg-L1b-9 |
| lc-orphan-jp-tcg-L1b-36 | lc-orphan-jp-tcg-L1b-36 |
| lc-orphan-jp-tcg-L1b-37 | lc-orphan-jp-tcg-L1b-37 |
| lc-orphan-jp-tcg-L1b-38 | lc-orphan-jp-tcg-L1b-38 |
| lc-orphan-jp-tcg-L1b-39 | lc-orphan-jp-tcg-L1b-39 |
| lc-orphan-jp-tcg-L1b-40 | lc-orphan-jp-tcg-L1b-40 |
| lc-orphan-jp-tcg-L1b-41 | lc-orphan-jp-tcg-L1b-41 |
| lc-orphan-jp-tcg-L1b-42 | lc-orphan-jp-tcg-L1b-42 |
| lc-orphan-jp-tcg-L1b-43 | lc-orphan-jp-tcg-L1b-43 |
| lc-orphan-jp-tcg-L1b-44 | lc-orphan-jp-tcg-L1b-44 |
| lc-orphan-jp-tcg-L1b-45 | lc-orphan-jp-tcg-L1b-45 |
| lc-orphan-jp-tcg-L1b-46 | lc-orphan-jp-tcg-L1b-46 |
| lc-orphan-jp-tcg-L1b-48 | lc-orphan-jp-tcg-L1b-48 |
| lc-orphan-jp-tcg-L1b-49 | lc-orphan-jp-tcg-L1b-49 |
| lc-orphan-jp-tcg-L1b-5 | lc-orphan-jp-tcg-L1b-5 |
| lc-orphan-jp-tcg-L1b-50 | lc-orphan-jp-tcg-L1b-50 |
| lc-orphan-jp-tcg-L1b-51 | lc-orphan-jp-tcg-L1b-51 |
| lc-orphan-jp-tcg-L1b-53 | lc-orphan-jp-tcg-L1b-53 |
| lc-orphan-jp-tcg-L1b-54 | lc-orphan-jp-tcg-L1b-54 |
| lc-orphan-jp-tcg-L1b-55 | lc-orphan-jp-tcg-L1b-55 |
| lc-orphan-jp-tcg-L1b-56 | lc-orphan-jp-tcg-L1b-56 |
| lc-orphan-jp-tcg-L1b-57 | lc-orphan-jp-tcg-L1b-57 |
| lc-orphan-jp-tcg-L1b-58 | lc-orphan-jp-tcg-L1b-58 |
| lc-orphan-jp-tcg-L1b-59 | lc-orphan-jp-tcg-L1b-59 |
| lc-orphan-jp-tcg-L1b-60 | lc-orphan-jp-tcg-L1b-60 |
| lc-orphan-jp-tcg-L1b-61 | lc-orphan-jp-tcg-L1b-61 |
| lc-orphan-jp-tcg-L1b-62 | lc-orphan-jp-tcg-L1b-62 |
| lc-orphan-jp-tcg-L1b-63 | lc-orphan-jp-tcg-L1b-63 |
| lc-orphan-jp-tcg-L1b-64 | lc-orphan-jp-tcg-L1b-64 |
| lc-orphan-jp-tcg-L1b-65 | lc-orphan-jp-tcg-L1b-65 |
| lc-orphan-jp-tcg-L1b-66 | lc-orphan-jp-tcg-L1b-66 |
| lc-orphan-jp-tcg-L1b-67 | lc-orphan-jp-tcg-L1b-67 |
| lc-orphan-jp-tcg-L1b-68 | lc-orphan-jp-tcg-L1b-68 |
| lc-orphan-jp-tcg-L1b-69 | lc-orphan-jp-tcg-L1b-69 |
| lc-orphan-jp-tcg-L1b-7 | lc-orphan-jp-tcg-L1b-7 |
| lc-orphan-jp-tcg-L1b-70 | lc-orphan-jp-tcg-L1b-70 |
| lc-orphan-jp-tcg-L1b-71 | lc-orphan-jp-tcg-L1b-71 |
| lc-orphan-jp-tcg-L1b-8 | lc-orphan-jp-tcg-L1b-8 |
| lc-orphan-jp-tcg-L2-1 | lc-orphan-jp-tcg-L2-1 |
| lc-orphan-jp-tcg-L2-2 | lc-orphan-jp-tcg-L2-2 |
| lc-orphan-jp-tcg-L2-10 | lc-orphan-jp-tcg-L2-10 |
| lc-orphan-jp-tcg-L2-11 | lc-orphan-jp-tcg-L2-11 |
| lc-orphan-jp-tcg-L2-12 | lc-orphan-jp-tcg-L2-12 |
| lc-orphan-jp-tcg-L2-13 | lc-orphan-jp-tcg-L2-13 |
| lc-orphan-jp-tcg-L2-14 | lc-orphan-jp-tcg-L2-14 |
| lc-orphan-jp-tcg-L2-15 | lc-orphan-jp-tcg-L2-15 |
| lc-orphan-jp-tcg-L2-16 | lc-orphan-jp-tcg-L2-16 |
| lc-orphan-jp-tcg-L2-17 | lc-orphan-jp-tcg-L2-17 |
| lc-orphan-jp-tcg-L2-18 | lc-orphan-jp-tcg-L2-18 |
| lc-orphan-jp-tcg-L2-19 | lc-orphan-jp-tcg-L2-19 |
| lc-orphan-jp-tcg-L2-3 | lc-orphan-jp-tcg-L2-3 |
| lc-orphan-jp-tcg-L2-4 | lc-orphan-jp-tcg-L2-4 |
| lc-orphan-jp-tcg-L2-5 | lc-orphan-jp-tcg-L2-5 |
| lc-orphan-jp-tcg-L2-6 | lc-orphan-jp-tcg-L2-6 |
| lc-orphan-jp-tcg-L2-7 | lc-orphan-jp-tcg-L2-7 |
| lc-orphan-jp-tcg-L2-8 | lc-orphan-jp-tcg-L2-8 |
| lc-orphan-jp-tcg-L2-9 | lc-orphan-jp-tcg-L2-9 |
| lc-orphan-jp-tcg-L3-2 | lc-orphan-jp-tcg-L3-2 |
| lc-orphan-jp-tcg-L3-3 | lc-orphan-jp-tcg-L3-3 |
| lc-orphan-jp-tcg-L3-5 | lc-orphan-jp-tcg-L3-5 |
| lc-orphan-jp-tcg-L3-9 | lc-orphan-jp-tcg-L3-9 |
| lc-orphan-jp-tcg-L3-18 | lc-orphan-jp-tcg-L3-18 |
| lc-orphan-jp-tcg-L3-39 | lc-orphan-jp-tcg-L3-39 |
| lc-orphan-jp-tcg-L3-62 | lc-orphan-jp-tcg-L3-62 |
| lc-orphan-jp-tcg-L3-1 | lc-orphan-jp-tcg-L3-1 |
| lc-orphan-jp-tcg-L3-10 | lc-orphan-jp-tcg-L3-10 |
| lc-orphan-jp-tcg-L3-11 | lc-orphan-jp-tcg-L3-11 |
| lc-orphan-jp-tcg-L3-12 | lc-orphan-jp-tcg-L3-12 |
| lc-orphan-jp-tcg-L3-13 | lc-orphan-jp-tcg-L3-13 |
| lc-orphan-jp-tcg-L3-14 | lc-orphan-jp-tcg-L3-14 |
| lc-orphan-jp-tcg-L3-15 | lc-orphan-jp-tcg-L3-15 |
| lc-orphan-jp-tcg-L3-16 | lc-orphan-jp-tcg-L3-16 |
| lc-orphan-jp-tcg-L3-17 | lc-orphan-jp-tcg-L3-17 |
| lc-orphan-jp-tcg-L3-19 | lc-orphan-jp-tcg-L3-19 |
| lc-orphan-jp-tcg-L3-20 | lc-orphan-jp-tcg-L3-20 |
| lc-orphan-jp-tcg-L3-21 | lc-orphan-jp-tcg-L3-21 |
| lc-orphan-jp-tcg-L3-22 | lc-orphan-jp-tcg-L3-22 |
| lc-orphan-jp-tcg-L3-23 | lc-orphan-jp-tcg-L3-23 |
| lc-orphan-jp-tcg-L3-24 | lc-orphan-jp-tcg-L3-24 |
| lc-orphan-jp-tcg-L3-25 | lc-orphan-jp-tcg-L3-25 |
| lc-orphan-jp-tcg-L3-26 | lc-orphan-jp-tcg-L3-26 |
| lc-orphan-jp-tcg-L3-27 | lc-orphan-jp-tcg-L3-27 |
| lc-orphan-jp-tcg-L3-28 | lc-orphan-jp-tcg-L3-28 |
| lc-orphan-jp-tcg-L3-29 | lc-orphan-jp-tcg-L3-29 |
| lc-orphan-jp-tcg-L3-30 | lc-orphan-jp-tcg-L3-30 |
| lc-orphan-jp-tcg-L3-31 | lc-orphan-jp-tcg-L3-31 |
| lc-orphan-jp-tcg-L3-32 | lc-orphan-jp-tcg-L3-32 |
| lc-orphan-jp-tcg-L3-33 | lc-orphan-jp-tcg-L3-33 |
| lc-orphan-jp-tcg-L3-34 | lc-orphan-jp-tcg-L3-34 |
| lc-orphan-jp-tcg-L3-35 | lc-orphan-jp-tcg-L3-35 |
| lc-orphan-jp-tcg-L3-36 | lc-orphan-jp-tcg-L3-36 |
| lc-orphan-jp-tcg-L3-37 | lc-orphan-jp-tcg-L3-37 |
| lc-orphan-jp-tcg-L3-38 | lc-orphan-jp-tcg-L3-38 |
| lc-orphan-jp-tcg-L3-4 | lc-orphan-jp-tcg-L3-4 |
| lc-orphan-jp-tcg-L3-40 | lc-orphan-jp-tcg-L3-40 |
| lc-orphan-jp-tcg-L3-41 | lc-orphan-jp-tcg-L3-41 |
| lc-orphan-jp-tcg-L3-42 | lc-orphan-jp-tcg-L3-42 |
| lc-orphan-jp-tcg-L3-43 | lc-orphan-jp-tcg-L3-43 |
| lc-orphan-jp-tcg-L3-44 | lc-orphan-jp-tcg-L3-44 |
| lc-orphan-jp-tcg-L3-45 | lc-orphan-jp-tcg-L3-45 |
| lc-orphan-jp-tcg-L3-46 | lc-orphan-jp-tcg-L3-46 |
| lc-orphan-jp-tcg-L3-47 | lc-orphan-jp-tcg-L3-47 |
| lc-orphan-jp-tcg-L3-48 | lc-orphan-jp-tcg-L3-48 |
| lc-orphan-jp-tcg-L3-49 | lc-orphan-jp-tcg-L3-49 |
| lc-orphan-jp-tcg-L3-50 | lc-orphan-jp-tcg-L3-50 |
| lc-orphan-jp-tcg-L3-51 | lc-orphan-jp-tcg-L3-51 |
| lc-orphan-jp-tcg-L3-52 | lc-orphan-jp-tcg-L3-52 |
| lc-orphan-jp-tcg-L3-53 | lc-orphan-jp-tcg-L3-53 |
| lc-orphan-jp-tcg-L3-54 | lc-orphan-jp-tcg-L3-54 |
| lc-orphan-jp-tcg-L3-55 | lc-orphan-jp-tcg-L3-55 |
| lc-orphan-jp-tcg-L3-56 | lc-orphan-jp-tcg-L3-56 |
| lc-orphan-jp-tcg-L3-57 | lc-orphan-jp-tcg-L3-57 |
| lc-orphan-jp-tcg-L3-58 | lc-orphan-jp-tcg-L3-58 |
| lc-orphan-jp-tcg-L3-59 | lc-orphan-jp-tcg-L3-59 |
| lc-orphan-jp-tcg-L3-6 | lc-orphan-jp-tcg-L3-6 |
| lc-orphan-jp-tcg-L3-60 | lc-orphan-jp-tcg-L3-60 |
| lc-orphan-jp-tcg-L3-61 | lc-orphan-jp-tcg-L3-61 |
| lc-orphan-jp-tcg-L3-63 | lc-orphan-jp-tcg-L3-63 |
| lc-orphan-jp-tcg-L3-64 | lc-orphan-jp-tcg-L3-64 |
| lc-orphan-jp-tcg-L3-65 | lc-orphan-jp-tcg-L3-65 |
| lc-orphan-jp-tcg-L3-66 | lc-orphan-jp-tcg-L3-66 |
| lc-orphan-jp-tcg-L3-67 | lc-orphan-jp-tcg-L3-67 |
| lc-orphan-jp-tcg-L3-68 | lc-orphan-jp-tcg-L3-68 |
| lc-orphan-jp-tcg-L3-69 | lc-orphan-jp-tcg-L3-69 |
| lc-orphan-jp-tcg-L3-7 | lc-orphan-jp-tcg-L3-7 |
| lc-orphan-jp-tcg-L3-70 | lc-orphan-jp-tcg-L3-70 |
| lc-orphan-jp-tcg-L3-71 | lc-orphan-jp-tcg-L3-71 |
| lc-orphan-jp-tcg-L3-72 | lc-orphan-jp-tcg-L3-72 |
| lc-orphan-jp-tcg-L3-73 | lc-orphan-jp-tcg-L3-73 |
| lc-orphan-jp-tcg-L3-74 | lc-orphan-jp-tcg-L3-74 |
| lc-orphan-jp-tcg-L3-75 | lc-orphan-jp-tcg-L3-75 |
| lc-orphan-jp-tcg-L3-76 | lc-orphan-jp-tcg-L3-76 |
| lc-orphan-jp-tcg-L3-77 | lc-orphan-jp-tcg-L3-77 |
| lc-orphan-jp-tcg-L3-78 | lc-orphan-jp-tcg-L3-78 |
| lc-orphan-jp-tcg-L3-79 | lc-orphan-jp-tcg-L3-79 |
| lc-orphan-jp-tcg-L3-8 | lc-orphan-jp-tcg-L3-8 |
| lc-orphan-jp-tcg-L3-80 | lc-orphan-jp-tcg-L3-80 |
| lc-orphan-jp-tcg-L3-81 | lc-orphan-jp-tcg-L3-81 |
| lc-orphan-jp-tcg-LL-1 | lc-orphan-jp-tcg-LL-1 |
| lc-orphan-jp-tcg-LL-3 | lc-orphan-jp-tcg-LL-3 |
| lc-orphan-jp-tcg-LL-15 | lc-orphan-jp-tcg-LL-15 |
| lc-orphan-jp-tcg-LL-16 | lc-orphan-jp-tcg-LL-16 |
| lc-orphan-jp-tcg-LL-21 | lc-orphan-jp-tcg-LL-21 |
| lc-orphan-jp-tcg-LL-35 | lc-orphan-jp-tcg-LL-35 |
| lc-orphan-jp-tcg-LL-2 | lc-orphan-jp-tcg-LL-2 |
| lc-orphan-jp-tcg-LL-10 | lc-orphan-jp-tcg-LL-10 |
| lc-orphan-jp-tcg-LL-11 | lc-orphan-jp-tcg-LL-11 |
| lc-orphan-jp-tcg-LL-12 | lc-orphan-jp-tcg-LL-12 |
| lc-orphan-jp-tcg-LL-13 | lc-orphan-jp-tcg-LL-13 |
| lc-orphan-jp-tcg-LL-14 | lc-orphan-jp-tcg-LL-14 |
| lc-orphan-jp-tcg-LL-17 | lc-orphan-jp-tcg-LL-17 |
| lc-orphan-jp-tcg-LL-18 | lc-orphan-jp-tcg-LL-18 |
| lc-orphan-jp-tcg-LL-19 | lc-orphan-jp-tcg-LL-19 |
| lc-orphan-jp-tcg-LL-20 | lc-orphan-jp-tcg-LL-20 |
| lc-orphan-jp-tcg-LL-22 | lc-orphan-jp-tcg-LL-22 |
| lc-orphan-jp-tcg-LL-23 | lc-orphan-jp-tcg-LL-23 |
| lc-orphan-jp-tcg-LL-24 | lc-orphan-jp-tcg-LL-24 |
| lc-orphan-jp-tcg-LL-25 | lc-orphan-jp-tcg-LL-25 |
| lc-orphan-jp-tcg-LL-26 | lc-orphan-jp-tcg-LL-26 |
| lc-orphan-jp-tcg-LL-27 | lc-orphan-jp-tcg-LL-27 |
| lc-orphan-jp-tcg-LL-28 | lc-orphan-jp-tcg-LL-28 |
| lc-orphan-jp-tcg-LL-29 | lc-orphan-jp-tcg-LL-29 |
| lc-orphan-jp-tcg-LL-30 | lc-orphan-jp-tcg-LL-30 |
| lc-orphan-jp-tcg-LL-31 | lc-orphan-jp-tcg-LL-31 |
| lc-orphan-jp-tcg-LL-32 | lc-orphan-jp-tcg-LL-32 |
| lc-orphan-jp-tcg-LL-33 | lc-orphan-jp-tcg-LL-33 |
| lc-orphan-jp-tcg-LL-34 | lc-orphan-jp-tcg-LL-34 |
| lc-orphan-jp-tcg-LL-36 | lc-orphan-jp-tcg-LL-36 |
| lc-orphan-jp-tcg-LL-37 | lc-orphan-jp-tcg-LL-37 |
| lc-orphan-jp-tcg-LL-38 | lc-orphan-jp-tcg-LL-38 |
| lc-orphan-jp-tcg-LL-39 | lc-orphan-jp-tcg-LL-39 |
| lc-orphan-jp-tcg-LL-4 | lc-orphan-jp-tcg-LL-4 |
| lc-orphan-jp-tcg-LL-40 | lc-orphan-jp-tcg-LL-40 |
| lc-orphan-jp-tcg-LL-5 | lc-orphan-jp-tcg-LL-5 |
| lc-orphan-jp-tcg-LL-6 | lc-orphan-jp-tcg-LL-6 |
| lc-orphan-jp-tcg-LL-7 | lc-orphan-jp-tcg-LL-7 |
| lc-orphan-jp-tcg-LL-8 | lc-orphan-jp-tcg-LL-8 |
| lc-orphan-jp-tcg-LL-9 | lc-orphan-jp-tcg-LL-9 |

## G) EN ↔ JP 로케일 대응 (HGSS)

hsp 는 JP 대응 없음 (promo).

| 세트 | EN 카드 | JP 카드 | 양쪽 | EN만 | JP만 |
| --- | --- | --- | --- | --- | --- |
| col1 | 106 | 97 | 97 | 9 | 0 |
| hgss1 | 124 | 106 | 106 | 18 | 0 |
| hgss2 | 96 | 87 | 87 | 9 | 0 |
| hgss3 | 91 | 67 | 67 | 24 | 0 |
| hgss4 | 103 | 72 | 72 | 31 | 0 |
| hsp | 25 | 0 | 0 | 25 | 0 |

## H) 버전 가용성 (언어 조합)
| 세트 | 총계 | en | en+ja | ja |
| --- | --- | --- | --- | --- |
| og-l1a | 71 | 0 | 0 | 71 |
| og-l1b | 71 | 0 | 0 | 71 |
| og-l2 | 19 | 0 | 0 | 19 |
| og-l3 | 81 | 0 | 0 | 81 |
| og-ll | 40 | 0 | 0 | 40 |
| og-col1 | 106 | 9 | 97 | 0 |
| og-hgss1 | 124 | 18 | 106 | 0 |
| og-hgss2 | 96 | 9 | 87 | 0 |
| og-hgss3 | 91 | 24 | 67 | 0 |
| og-hgss4 | 103 | 31 | 72 | 0 |
| og-hsp | 25 | 25 | 0 | 0 |

## 권장 액션
| 우선순위 | 액션 |
| --- | --- |
| P1 | 이미지 HTTP 비200 434건 — URL 재확인 |
| P2 | JP imageSmall 누락 429건 — Bulbapedia 재탐색 |
| P2 | ID 갭: EN col1(11), EN hgss1(1), EN hgss2(1), EN hgss3(1), EN hgss4(1), JP L1a(72), JP L1b(70), JP L3(80), JP col1(23), JP hgss1(114), JP hgss2(13), JP hgss3(19), JP hgss4(19) |
| P2 | supertype null 282건 |