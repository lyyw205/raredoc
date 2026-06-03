/**
 * SV 트레이너/스타디움 JP→EN 이름 사전 (merge-en-identity 트레이너 매칭용).
 * 일러스트레이터는 같은 일러에 여러 카드가 섞여 스크램블되므로, 트레이너의 정체성은 *이름*으로 잡는다.
 * 세트마다 어휘가 반복되므로 누적 확장한다. 스크립트가 사전 미등록 JP명을 경고로 출력하니 그때 추가.
 */
export const TR_JP2EN: Record<string, string> = {
  // ── 서포트(인물) ──
  "ペパー": "Arven",
  "ジニア": "Jacq",
  "ボタン": "Penny",
  "カエデ": "Katy",
  "ミモザ": "Miriam",
  "ネモ": "Nemona",
  "スター団のしたっぱ": "Team Star Grunt",
  "ジャッジマン": "Judge",
  "タンパン小僧": "Youngster",
  "サワロ": "Saguaro",       // 아카데미 수학교사
  "ナンジャモ": "Iono",        // 전기 체육관장
  "グルーシャ": "Grusha",      // 얼음 체육관장
  "ピーニャ": "Giacomo",       // 스타단 보스(일러 교차검증으로 확정 — Dendra 아님)
  // ── 아이템 ──
  "ともだちてちょう": "Pal Pad",
  "ネストボール": "Nest Ball",
  "ハイパーボール": "Ultra Ball",
  "モンスターボール": "Poké Ball",
  "ふしぎなアメ": "Rare Candy",
  "学習装置": "Exp. Share",
  "ゴツゴツメット": "Rocky Helmet",
  "岩のむねあて": "Rock Chestplate",
  "まけんきハチマキ": "Defiance Band",
  "げんきのハチマキ": "Vitality Band",
  "エレキジェネレーター": "Electric Generator",
  "ピクニックバスケット": "Picnic Basket",
  "ポケギア3.0": "Pokégear 3.0",
  "ポケモンキャッチャー": "Pokémon Catcher",
  "ポケモンいれかえ": "Switch",
  "キズぐすり": "Potion",
  "クラッシュハンマー": "Crushing Hammer",
  "エネルギーサーチ": "Energy Search",
  "エネルギーつけかえ": "Energy Switch",
  "エネルギー回収": "Energy Retrieval",
  "スーパーエネルギー回収": "Superior Energy Retrieval",
  "すごいつりざお": "Super Rod",
  "おとどけドローン": "Delivery Drone",
  "勇気のおまもり": "Bravery Charm",
  "ファイトオレ": "Fighting Au Lait",
  "こだわりベルト": "Choice Belt",
  // ── 스타디움 ──
  "ビーチコート": "Beach Court",
  "テーブルシティ": "Mesagoza",
  "災いの荒野": "Calamitous Wasteland",
  "災いの雪山": "Calamitous Snowy Mountain",
};

// 博士の研究(Professor's Research)은 세트별 박사(Sada=고대/스칼렛 · Turo=미래/바이올렛)로 EN명이 갈린다.
// Sada(고대) 측 JP 세트 ID 목록 — 분할 세트 그룹에서 확인해 추가.
export const SADA_SETS = new Set<string>([
  "jp-tcg-SV1S", // 스칼렛ex (sv-base)
]);
export function profResearchEn(setId: string): string {
  return SADA_SETS.has(setId)
    ? "Professor's Research (Professor Sada)"
    : "Professor's Research (Professor Turo)";
}
