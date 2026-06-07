"use client";

import * as React from "react";
import svBase from "@/data/group-sv-base.json";
import svVioletEx from "@/data/group-sv-violet-ex.json";
import tripletBeat from "@/data/group-sv-triplet-beat.json";
import paldeaEvolved from "@/data/group-sv-paldea-evolved.json";
import svSnowHazard from "@/data/group-sv-snow-hazard.json";
import paradoxRift from "@/data/group-sv-paradox-rift.json";
import svFutureFlash from "@/data/group-sv-future-flash.json";
import pokemon151 from "@/data/group-sv-151.json";
import obsidianFlames from "@/data/group-sv-obsidian-flames.json";
import ragingSurf from "@/data/group-sv-raging-surf.json";
import paldeanFates from "@/data/group-sv-paldean-fates.json";
import temporalForces from "@/data/group-sv-temporal-forces.json";
import svCyberJudge from "@/data/group-sv-cyber-judge.json";
import crimsonHaze from "@/data/group-sv-crimson-haze.json";
import twilightMasquerade from "@/data/group-sv-twilight-masquerade.json";
import shroudedFable from "@/data/group-sv-shrouded-fable.json";
import stellarCrown from "@/data/group-sv-stellar-crown.json";
import paradiseDragona from "@/data/group-sv-paradise-dragona.json";
import surgingSparks from "@/data/group-sv-surging-sparks.json";
import prismaticEvolutions from "@/data/group-sv-prismatic-evolutions.json";
import journeyTogether from "@/data/group-sv-journey-together.json";
import heatwaveArena from "@/data/group-sv-heatwave-arena.json";
import destinedRivals from "@/data/group-sv-destined-rivals.json";
import blackBoltWhiteFlare from "@/data/group-sv-black-bolt-white-flare.json";
import svWhiteFlare from "@/data/group-sv-white-flare.json";
import megaBraveSymphonia from "@/data/group-mega-brave-symphonia.json";
import megaSymphonia from "@/data/group-mega-symphonia.json";
import megaInfernox from "@/data/group-mega-infernox.json";
import megaDreamEx from "@/data/group-mega-dream-ex.json";
import megaMunikisuzero from "@/data/group-mega-munikisuzero.json";
import megaNinjaSpinner from "@/data/group-mega-ninja-spinner.json";
import megaAbyssEye from "@/data/group-mega-abyss-eye.json";
import megaStartDeck100 from "@/data/group-mega-start-deck-100.json";
import megaDecks from "@/data/group-mega-decks.json";
import megaGoods from "@/data/group-mega-goods.json";
import smDecks from "@/data/group-sm-decks.json";
import swshDecks from "@/data/group-swsh-decks.json";
import swshGoods from "@/data/group-swsh-goods.json";
import swshStartDeck100 from "@/data/group-swsh-start-deck-100.json";
import svDecks from "@/data/group-sv-decks.json";
import svGoods from "@/data/group-sv-goods.json";
import svExStartDeck from "@/data/group-sv-ex-start-deck.json";
import svStartDeckGenerations from "@/data/group-sv-start-deck-generations.json";
import ogS12a from "@/data/group-og-s12a.json";
import ogS12 from "@/data/group-og-s12.json";
import ogS11a from "@/data/group-og-s11a.json";
import ogS11 from "@/data/group-og-s11.json";
import ogS10b from "@/data/group-og-s10b.json";
import ogS10a from "@/data/group-og-s10a.json";
import ogS10d from "@/data/group-og-s10d.json";
import ogS10p from "@/data/group-og-s10p.json";
import ogS9a from "@/data/group-og-s9a.json";
import ogS9 from "@/data/group-og-s9.json";
import ogS8b from "@/data/group-og-s8b.json";
import ogS8a from "@/data/group-og-s8a.json";
import ogS8aG from "@/data/group-og-s8a-g.json";
import ogS8 from "@/data/group-og-s8.json";
import ogS7d from "@/data/group-og-s7d.json";
import ogS7r from "@/data/group-og-s7r.json";
import ogS6a from "@/data/group-og-s6a.json";
import ogS6h from "@/data/group-og-s6h.json";
import ogS6k from "@/data/group-og-s6k.json";
import ogS5i from "@/data/group-og-s5i.json";
import ogS5r from "@/data/group-og-s5r.json";
import ogS5a from "@/data/group-og-s5a.json";
import ogS4a from "@/data/group-og-s4a.json";
import ogS4 from "@/data/group-og-s4.json";
import ogS1a from "@/data/group-og-s1a.json";
import ogS1h from "@/data/group-og-s1h.json";
import ogS1w from "@/data/group-og-s1w.json";
import ogS2 from "@/data/group-og-s2.json";
import ogS2a from "@/data/group-og-s2a.json";
import ogS3a from "@/data/group-og-s3a.json";
import ogS3 from "@/data/group-og-s3.json";
import ogSm1s from "@/data/group-og-sm1s.json";
import ogSm1m from "@/data/group-og-sm1m.json";
import ogSm1plus from "@/data/group-og-sm1plus.json";
import ogSm2k from "@/data/group-og-sm2k.json";
import ogSm2l from "@/data/group-og-sm2l.json";
import ogSm2plus from "@/data/group-og-sm2plus.json";
import ogSm3n from "@/data/group-og-sm3n.json";
import ogSm3h from "@/data/group-og-sm3h.json";
import ogSm3plus from "@/data/group-og-sm3plus.json";
import ogSm4s from "@/data/group-og-sm4s.json";
import ogSm4a from "@/data/group-og-sm4a.json";
import ogSm4plus from "@/data/group-og-sm4plus.json";
import ogSm5s from "@/data/group-og-sm5s.json";
import ogSm5m from "@/data/group-og-sm5m.json";
import ogSm5plus from "@/data/group-og-sm5plus.json";
import ogSm6 from "@/data/group-og-sm6.json";
import ogSm6a from "@/data/group-og-sm6a.json";
import ogSm6b from "@/data/group-og-sm6b.json";
import ogSm7 from "@/data/group-og-sm7.json";
import ogSm7a from "@/data/group-og-sm7a.json";
import ogSm7b from "@/data/group-og-sm7b.json";
import ogSm8 from "@/data/group-og-sm8.json";
import ogSm8a from "@/data/group-og-sm8a.json";
import ogSm8b from "@/data/group-og-sm8b.json";
import ogSm9 from "@/data/group-og-sm9.json";
import ogSm9a from "@/data/group-og-sm9a.json";
import ogSm9b from "@/data/group-og-sm9b.json";
import ogSm10 from "@/data/group-og-sm10.json";
import ogSn10a from "@/data/group-og-sn10a.json";
import ogSm10b from "@/data/group-og-sm10b.json";
import ogSn11 from "@/data/group-og-sn11.json";
import ogSm11a from "@/data/group-og-sm11a.json";
import ogSm11b from "@/data/group-og-sm11b.json";
import ogSm12 from "@/data/group-og-sm12.json";
import ogSm12a from "@/data/group-og-sm12a.json";
import ogSmp2 from "@/data/group-og-smp2.json";
import ogSm0 from "@/data/group-og-sm0.json";
import ogSmp from "@/data/group-og-smp.json";
import ogXy1a from "@/data/group-og-xy1a.json";
import ogXy1b from "@/data/group-og-xy1b.json";
import ogXy2 from "@/data/group-og-xy2.json";
import ogXy3 from "@/data/group-og-xy3.json";
import ogXy4 from "@/data/group-og-xy4.json";
import ogXy5 from "@/data/group-og-xy5.json";
import ogXy5a from "@/data/group-og-xy5a.json";
import smBestOfXy from "@/data/group-sm-best-of-xy.json";
import ogCp6 from "@/data/group-og-cp6.json";
import ogCp5 from "@/data/group-og-cp5.json";
import ogBw1 from "@/data/group-og-bw1.json";
import ogBw3 from "@/data/group-og-bw3.json";
import ogBw3h from "@/data/group-og-bw3h.json";
import ogBw4 from "@/data/group-og-bw4.json";
import ogBw5 from "@/data/group-og-bw5.json";
import ogBw5d from "@/data/group-og-bw5d.json";
import ogBw6 from "@/data/group-og-bw6.json";
import ogBw6c from "@/data/group-og-bw6c.json";
import ogBw7 from "@/data/group-og-bw7.json";
import ogBw8 from "@/data/group-og-bw8.json";
import ogBw8t from "@/data/group-og-bw8t.json";
import ogBw9 from "@/data/group-og-bw9.json";
import ogEbb from "@/data/group-og-ebb.json";
import ogBwShiny from "@/data/group-og-bw-shiny.json";
import ogL1a from "@/data/group-og-l1a.json";
import ogL1b from "@/data/group-og-l1b.json";
import ogL2 from "@/data/group-og-l2.json";
import ogL3 from "@/data/group-og-l3.json";
import ogLl from "@/data/group-og-ll.json";
import ogDp1 from "@/data/group-og-dp1.json";
import ogDp1p from "@/data/group-og-dp1p.json";
import ogDp2 from "@/data/group-og-dp2.json";
import ogDp3 from "@/data/group-og-dp3.json";
import ogDp4 from "@/data/group-og-dp4.json";
import ogDp4d from "@/data/group-og-dp4d.json";
import ogDp5 from "@/data/group-og-dp5.json";
import ogDp5a from "@/data/group-og-dp5a.json";
import ogDp6 from "@/data/group-og-dp6.json";
import ogPl1 from "@/data/group-og-pl1.json";
import ogPl2 from "@/data/group-og-pl2.json";
import ogPl3 from "@/data/group-og-pl3.json";
import ogPl4 from "@/data/group-og-pl4.json";
import ogDv1 from "@/data/group-og-dv1.json";
import ogBw1w from "@/data/group-og-bw1w.json";
import ogBw2 from "@/data/group-og-bw2.json";
import ogCp1 from "@/data/group-og-cp1.json";
import ogCp2 from "@/data/group-og-cp2.json";
import ogCp3 from "@/data/group-og-cp3.json";
import ogCp4 from "@/data/group-og-cp4.json";
import ogXy6 from "@/data/group-og-xy6.json";
import ogXy7 from "@/data/group-og-xy7.json";
import ogXy8a from "@/data/group-og-xy8a.json";
import ogXy8b from "@/data/group-og-xy8b.json";
import ogXy9 from "@/data/group-og-xy9.json";
import ogXy10 from "@/data/group-og-xy10.json";
import ogXy11a from "@/data/group-og-xy11a.json";
import ogXy11b from "@/data/group-og-xy11b.json";

// 그룹별 EN/JP/KR 그룹핑 카드 UI — JP 앵커(번호순) + 언어탭 + 영판전용 꼬리.
// 카드 도감(DexCatalog)에서 해당 그룹 선택 시 인-플레이스로 렌더. 데이터는 확정 그룹핑 JSON.
const DATA: Record<string, GroupData> = {
  "sv-base": svBase as unknown as GroupData,
  "sv-violet-ex": svVioletEx as unknown as GroupData,
  "sv-triplet-beat": tripletBeat as unknown as GroupData,
  "sv-paldea-evolved": paldeaEvolved as unknown as GroupData,
  "sv-snow-hazard": svSnowHazard as unknown as GroupData,
  "sv-paradox-rift": paradoxRift as unknown as GroupData,
  "sv-future-flash": svFutureFlash as unknown as GroupData,
  "sv-151": pokemon151 as unknown as GroupData,
  "sv-obsidian-flames": obsidianFlames as unknown as GroupData,
  "sv-raging-surf": ragingSurf as unknown as GroupData,
  "sv-paldean-fates": paldeanFates as unknown as GroupData,
  "sv-temporal-forces": temporalForces as unknown as GroupData,
  "sv-cyber-judge": svCyberJudge as unknown as GroupData,
  "sv-crimson-haze": crimsonHaze as unknown as GroupData,
  "sv-twilight-masquerade": twilightMasquerade as unknown as GroupData,
  "sv-shrouded-fable": shroudedFable as unknown as GroupData,
  "sv-stellar-crown": stellarCrown as unknown as GroupData,
  "sv-paradise-dragona": paradiseDragona as unknown as GroupData,
  "sv-surging-sparks": surgingSparks as unknown as GroupData,
  "sv-prismatic-evolutions": prismaticEvolutions as unknown as GroupData,
  "sv-journey-together": journeyTogether as unknown as GroupData,
  "sv-heatwave-arena": heatwaveArena as unknown as GroupData,
  "sv-destined-rivals": destinedRivals as unknown as GroupData,
  "sv-black-bolt-white-flare": blackBoltWhiteFlare as unknown as GroupData,
  "sv-white-flare": svWhiteFlare as unknown as GroupData,
  "mega-brave-symphonia": megaBraveSymphonia as unknown as GroupData,
  "mega-symphonia": megaSymphonia as unknown as GroupData,
  "mega-infernox": megaInfernox as unknown as GroupData,
  "mega-dream-ex": megaDreamEx as unknown as GroupData,
  "mega-munikisuzero": megaMunikisuzero as unknown as GroupData,
  "mega-ninja-spinner": megaNinjaSpinner as unknown as GroupData,
  "mega-abyss-eye": megaAbyssEye as unknown as GroupData,
  "mega-start-deck-100": megaStartDeck100 as unknown as GroupData,
  "mega-decks": megaDecks as unknown as GroupData,
  "mega-goods": megaGoods as unknown as GroupData,
  "sm-decks": smDecks as unknown as GroupData,
  "swsh-decks": swshDecks as unknown as GroupData,
  "swsh-goods": swshGoods as unknown as GroupData,
  "swsh-start-deck-100": swshStartDeck100 as unknown as GroupData,
  "sv-decks": svDecks as unknown as GroupData,
  "sv-goods": svGoods as unknown as GroupData,
  "sv-ex-start-deck": svExStartDeck as unknown as GroupData,
  "sv-start-deck-generations": svStartDeckGenerations as unknown as GroupData,
  "og-s12a": ogS12a as unknown as GroupData,
  "og-s12": ogS12 as unknown as GroupData,
  "og-s11a": ogS11a as unknown as GroupData,
  "og-s11": ogS11 as unknown as GroupData,
  "og-s10b": ogS10b as unknown as GroupData,
  "og-s10a": ogS10a as unknown as GroupData,
  "og-s10d": ogS10d as unknown as GroupData,
  "og-s10p": ogS10p as unknown as GroupData,
  "og-s9a": ogS9a as unknown as GroupData,
  "og-s9": ogS9 as unknown as GroupData,
  "og-s8b": ogS8b as unknown as GroupData,
  "og-s8a": ogS8a as unknown as GroupData,
  "og-s8a-g": ogS8aG as unknown as GroupData,
  "og-s8": ogS8 as unknown as GroupData,
  "og-s7d": ogS7d as unknown as GroupData,
  "og-s7r": ogS7r as unknown as GroupData,
  "og-s6a": ogS6a as unknown as GroupData,
  "og-s6h": ogS6h as unknown as GroupData,
  "og-s6k": ogS6k as unknown as GroupData,
  "og-s5i": ogS5i as unknown as GroupData,
  "og-s5r": ogS5r as unknown as GroupData,
  "og-s5a": ogS5a as unknown as GroupData,
  "og-s4a": ogS4a as unknown as GroupData,
  "og-s4": ogS4 as unknown as GroupData,
  "og-s1a": ogS1a as unknown as GroupData,
  "og-s1h": ogS1h as unknown as GroupData,
  "og-s1w": ogS1w as unknown as GroupData,
  "og-s2": ogS2 as unknown as GroupData,
  "og-s2a": ogS2a as unknown as GroupData,
  "og-s3a": ogS3a as unknown as GroupData,
  "og-s3": ogS3 as unknown as GroupData,
  "og-sm1s": ogSm1s as unknown as GroupData,
  "og-sm1m": ogSm1m as unknown as GroupData,
  "og-sm1+": ogSm1plus as unknown as GroupData,
  "og-sm2k": ogSm2k as unknown as GroupData,
  "og-sm2l": ogSm2l as unknown as GroupData,
  "og-sm2+": ogSm2plus as unknown as GroupData,
  "og-sm3n": ogSm3n as unknown as GroupData,
  "og-sm3h": ogSm3h as unknown as GroupData,
  "og-sm3+": ogSm3plus as unknown as GroupData,
  "og-sm4s": ogSm4s as unknown as GroupData,
  "og-sm4a": ogSm4a as unknown as GroupData,
  "og-sm4+": ogSm4plus as unknown as GroupData,
  "og-sm5s": ogSm5s as unknown as GroupData,
  "og-sm5m": ogSm5m as unknown as GroupData,
  "og-sm5+": ogSm5plus as unknown as GroupData,
  "og-sm6": ogSm6 as unknown as GroupData,
  "og-sm6a": ogSm6a as unknown as GroupData,
  "og-sm6b": ogSm6b as unknown as GroupData,
  "og-sm7": ogSm7 as unknown as GroupData,
  "og-sm7a": ogSm7a as unknown as GroupData,
  "og-sm7b": ogSm7b as unknown as GroupData,
  "og-sm8": ogSm8 as unknown as GroupData,
  "og-sm8a": ogSm8a as unknown as GroupData,
  "og-sm8b": ogSm8b as unknown as GroupData,
  "og-sm9": ogSm9 as unknown as GroupData,
  "og-sm9a": ogSm9a as unknown as GroupData,
  "og-sm9b": ogSm9b as unknown as GroupData,
  "og-sm10": ogSm10 as unknown as GroupData,
  "og-sn10a": ogSn10a as unknown as GroupData,
  "og-sm10b": ogSm10b as unknown as GroupData,
  "og-sn11": ogSn11 as unknown as GroupData,
  "og-sm11a": ogSm11a as unknown as GroupData,
  "og-sm11b": ogSm11b as unknown as GroupData,
  "og-sm12": ogSm12 as unknown as GroupData,
  "og-sm12a": ogSm12a as unknown as GroupData,
  "og-smp2": ogSmp2 as unknown as GroupData,
  "og-sm0": ogSm0 as unknown as GroupData,
  "og-smp": ogSmp as unknown as GroupData,
  "og-xy1a": ogXy1a as unknown as GroupData,
  "og-xy1b": ogXy1b as unknown as GroupData,
  "og-xy2": ogXy2 as unknown as GroupData,
  "og-xy3": ogXy3 as unknown as GroupData,
  "og-xy4": ogXy4 as unknown as GroupData,
  "og-xy5": ogXy5 as unknown as GroupData,
  "og-xy5a": ogXy5a as unknown as GroupData,
  "sm-best-of-xy": smBestOfXy as unknown as GroupData,
  "og-cp6": ogCp6 as unknown as GroupData,
  "og-cp5": ogCp5 as unknown as GroupData,
  "og-bw1": ogBw1 as unknown as GroupData,
  "og-bw3": ogBw3 as unknown as GroupData,
  "og-bw3h": ogBw3h as unknown as GroupData,
  "og-bw4": ogBw4 as unknown as GroupData,
  "og-bw5": ogBw5 as unknown as GroupData,
  "og-bw5d": ogBw5d as unknown as GroupData,
  "og-bw6": ogBw6 as unknown as GroupData,
  "og-bw6c": ogBw6c as unknown as GroupData,
  "og-bw7": ogBw7 as unknown as GroupData,
  "og-bw8": ogBw8 as unknown as GroupData,
  "og-bw8t": ogBw8t as unknown as GroupData,
  "og-bw9": ogBw9 as unknown as GroupData,
  "og-ebb": ogEbb as unknown as GroupData,
  "og-bw-shiny": ogBwShiny as unknown as GroupData,
  "og-l1a": ogL1a as unknown as GroupData,
  "og-l1b": ogL1b as unknown as GroupData,
  "og-l2": ogL2 as unknown as GroupData,
  "og-l3": ogL3 as unknown as GroupData,
  "og-ll": ogLl as unknown as GroupData,
  "og-dp1": ogDp1 as unknown as GroupData,
  "og-dp1p": ogDp1p as unknown as GroupData,
  "og-dp2": ogDp2 as unknown as GroupData,
  "og-dp3": ogDp3 as unknown as GroupData,
  "og-dp4": ogDp4 as unknown as GroupData,
  "og-dp4d": ogDp4d as unknown as GroupData,
  "og-dp5": ogDp5 as unknown as GroupData,
  "og-dp5a": ogDp5a as unknown as GroupData,
  "og-dp6": ogDp6 as unknown as GroupData,
  "og-pl1": ogPl1 as unknown as GroupData,
  "og-pl2": ogPl2 as unknown as GroupData,
  "og-pl3": ogPl3 as unknown as GroupData,
  "og-pl4": ogPl4 as unknown as GroupData,
  "og-dv1": ogDv1 as unknown as GroupData,
  "og-bw1w": ogBw1w as unknown as GroupData,
  "og-bw2": ogBw2 as unknown as GroupData,
  "og-cp1": ogCp1 as unknown as GroupData,
  "og-cp2": ogCp2 as unknown as GroupData,
  "og-cp3": ogCp3 as unknown as GroupData,
  "og-cp4": ogCp4 as unknown as GroupData,
  "og-xy6": ogXy6 as unknown as GroupData,
  "og-xy7": ogXy7 as unknown as GroupData,
  "og-xy8a": ogXy8a as unknown as GroupData,
  "og-xy8b": ogXy8b as unknown as GroupData,
  "og-xy9": ogXy9 as unknown as GroupData,
  "og-xy10": ogXy10 as unknown as GroupData,
  "og-xy11a": ogXy11a as unknown as GroupData,
  "og-xy11b": ogXy11b as unknown as GroupData,
};
export const GROUPED_GROUP_IDS = new Set(Object.keys(DATA));

type Print = { id: string; number: string; name: string; image: string | null; rarity: string | null; setId: string; region: string } | null;
type Anchor = { jp: Print; en: Print; kr: Print; dex: number | null };
type TailCard = { id: string; number: string; name: string; image: string | null; rarity: string | null; setId: string; region: string; dex: number | null; jpElsewhere: boolean; jpPacks?: { groupId: string | null; name: string }[] };

// 타일 클릭 시 상위(DexCatalog)로 넘기는 카드 식별 정보 — 패널이 id 로 상세를 fetch.
export type GroupCardClick = { id: string; name: string; number: string; rarity: string | null; image: string | null; region: string; setId: string };
type GroupData = { group: { id: string; crossGroupEN?: boolean; enAnchor?: boolean }; counts: { enMatched: number; krMatched: number }; anchors: Anchor[]; tail: { enOnly: TailCard[]; krOnly?: TailCard[] } };

const REGION_LABEL: Record<string, string> = { JP: "일본판", EN: "영문판", KR: "한국판" };
const REGION_COLOR: Record<string, string> = { JP: "#e2504a", EN: "#3182f6", KR: "#1f9d55" };

export function GroupCards({ groupId, onCardClick }: { groupId: string; onCardClick?: (c: GroupCardClick) => void }) {
  const data = DATA[groupId];
  if (!data) return null;
  const anchors = data.anchors;
  const enOnly = data.tail.enOnly ?? [];
  const krOnly = data.tail.krOnly ?? [];
  const cross = data.group.crossGroupEN;
  const enAnchor = data.group.enAnchor;

  return (
    <div>
      <p style={{ color: "#6b7684", fontSize: 13, margin: "0 0 12px", lineHeight: 1.6 }}>
        {enAnchor
          ? <><b style={{ color: "#3182f6" }}>영문판 프로모</b> 전용 세트입니다(일본·한국판 대응 없음).</>
          : <>
              <b style={{ color: "#e2504a" }}>일본판 기준</b>으로 줄세우고, 각 카드의 영문·한국판은 <b>탭으로 전환</b>합니다.
              {cross
                ? " 영문판은 다른 EN 팩에서 교차로 찾아 붙였습니다(못 찾으면 EN 탭 없음)."
                : " 일본판에 없는 카드는 맨 뒤 영판 전용에 모았습니다."}
            </>}
      </p>

      <SectionTitle>본문 — {enAnchor ? "영문판" : "일본판"} 기준 ({anchors.length})</SectionTitle>
      <Grid>{anchors.map((a, i) => <AnchorTile key={i} a={a} onCardClick={onCardClick} />)}</Grid>

      {enOnly.length > 0 && (
        <>
          <SectionTitle>
            영판 전용 ({enOnly.length}){" "}
            <span style={{ fontWeight: 400, fontSize: 12, color: "#8b95a1" }}>· 일본판엔 없음 (대부분 다른 일본 팩 수록)</span>
          </SectionTitle>
          <Grid>
            {enOnly.map((c, i) => (
              <figure
                key={i}
                style={{ ...tileStyle, cursor: onCardClick ? "pointer" : "default" }}
                onClick={onCardClick ? () => onCardClick({ id: c.id, name: c.name, number: c.number, rarity: c.rarity, image: c.image, region: c.region, setId: c.setId }) : undefined}
              >
                <ImgBox src={c.image} alt={c.name} />
                <figcaption style={capStyle}>
                  <div style={{ ...tagStyle, background: "#fbe9e8", color: REGION_COLOR.EN, marginBottom: 4 }}>영문판</div>
                  <div style={nameStyle} title={c.name}>{c.name}</div>
                  <div style={metaStyle}>#{c.number}{c.rarity ? ` · ${c.rarity}` : ""}</div>
                  {c.jpPacks?.length
                    ? <div style={{ ...tagStyle, background: "#fff4e6", color: "#d9730d" }} title={c.jpPacks.map((p) => p.name).join(" · ")}>
                        JP: {c.jpPacks.length > 2 ? `${c.jpPacks.slice(0, 2).map((p) => p.name).join(" · ")} 외 ${c.jpPacks.length - 2}` : c.jpPacks.map((p) => p.name).join(" · ")}
                      </div>
                    : c.jpElsewhere && <div style={{ ...tagStyle, background: "#fff4e6", color: "#d9730d" }}>JP 타팩 수록</div>}
                </figcaption>
              </figure>
            ))}
          </Grid>
        </>
      )}

      {krOnly.length > 0 && (
        <>
          <SectionTitle>
            한국판 전용 ({krOnly.length}){" "}
            <span style={{ fontWeight: 400, fontSize: 12, color: "#8b95a1" }}>· 일본판에 대응 없음 (한국판 추가 수록)</span>
          </SectionTitle>
          <Grid>
            {krOnly.map((c, i) => (
              <figure
                key={i}
                style={{ ...tileStyle, cursor: onCardClick ? "pointer" : "default" }}
                onClick={onCardClick ? () => onCardClick({ id: c.id, name: c.name, number: c.number, rarity: c.rarity, image: c.image, region: c.region, setId: c.setId }) : undefined}
              >
                <ImgBox src={c.image} alt={c.name} />
                <figcaption style={capStyle}>
                  <div style={{ ...tagStyle, background: "#e7f6ee", color: REGION_COLOR.KR, marginBottom: 4 }}>한국판</div>
                  <div style={nameStyle} title={c.name}>{c.name}</div>
                  <div style={metaStyle}>#{c.number}{c.rarity ? ` · ${c.rarity}` : ""}</div>
                </figcaption>
              </figure>
            ))}
          </Grid>
        </>
      )}
    </div>
  );
}

function AnchorTile({ a, onCardClick }: { a: Anchor; onCardClick?: (c: GroupCardClick) => void }) {
  const avail = (["JP", "EN", "KR"] as const).filter((r) => a[r.toLowerCase() as "jp" | "en" | "kr"]);
  const [active, setActive] = React.useState<"JP" | "EN" | "KR">(avail[0] ?? "JP");
  const cur = a[active.toLowerCase() as "jp" | "en" | "kr"] ?? a.jp ?? a.en ?? a.kr;
  const handle = onCardClick && cur
    ? () => onCardClick({ id: cur.id, name: cur.name, number: cur.number, rarity: cur.rarity, image: cur.image, region: cur.region, setId: cur.setId })
    : undefined;
  return (
    <figure style={tileStyle}>
      <div onClick={handle} style={{ cursor: handle ? "pointer" : "default" }} title={handle ? "카드 정보 보기" : undefined}>
        <ImgBox src={cur?.image ?? null} alt={cur?.name ?? ""} />
      </div>
      <figcaption style={capStyle}>
        <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 5 }}>
          {(["JP", "EN", "KR"] as const).map((r) => {
            const has = avail.includes(r);
            const on = active === r && has;
            return (
              <button
                key={r}
                disabled={!has}
                onClick={() => has && setActive(r)}
                title={REGION_LABEL[r]}
                style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5, cursor: has ? "pointer" : "default",
                  border: `1px solid ${on ? REGION_COLOR[r] : "#e5e8eb"}`, background: on ? REGION_COLOR[r] : "#fff",
                  color: on ? "#fff" : has ? "#4e5968" : "#d1d6db",
                }}
              >
                {r}
              </button>
            );
          })}
        </div>
        <div style={nameStyle} title={cur?.name}>{cur?.name}</div>
        <div style={metaStyle}>#{cur?.number}{cur?.rarity ? ` · ${cur.rarity}` : ""}</div>
      </figcaption>
    </figure>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 14, fontWeight: 700, margin: "22px 0 10px", color: "#191f28" }}>{children}</h3>;
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(124px, 1fr))", gap: 10 }}>{children}</div>;
}
function ImgBox({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div style={{ aspectRatio: "63/88", background: "#f7f8fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={alt} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        : <span style={{ fontSize: 11, color: "#b0b8c1" }}>이미지 없음</span>}
    </div>
  );
}

const tileStyle: React.CSSProperties = { margin: 0, border: "1px solid #f2f4f6", borderRadius: 12, overflow: "hidden", background: "#fff", display: "flex", flexDirection: "column" };
const capStyle: React.CSSProperties = { padding: "7px 6px 9px", borderTop: "1px solid #f2f4f6" };
const nameStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#191f28", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const metaStyle: React.CSSProperties = { fontSize: 11, color: "#8b95a1", textAlign: "center", marginTop: 2 };
const tagStyle: React.CSSProperties = { display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5 };
