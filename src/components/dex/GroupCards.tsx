"use client";

import * as React from "react";
import svBase from "@/data/group-sv-base.json";
import tripletBeat from "@/data/group-sv-triplet-beat.json";
import paldeaEvolved from "@/data/group-sv-paldea-evolved.json";
import paradoxRift from "@/data/group-sv-paradox-rift.json";
import pokemon151 from "@/data/group-sv-151.json";
import obsidianFlames from "@/data/group-sv-obsidian-flames.json";
import ragingSurf from "@/data/group-sv-raging-surf.json";
import paldeanFates from "@/data/group-sv-paldean-fates.json";
import temporalForces from "@/data/group-sv-temporal-forces.json";
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
import megaBraveSymphonia from "@/data/group-mega-brave-symphonia.json";
import megaInfernox from "@/data/group-mega-infernox.json";
import megaDreamEx from "@/data/group-mega-dream-ex.json";
import megaMunikisuzero from "@/data/group-mega-munikisuzero.json";

// 그룹별 EN/JP/KR 그룹핑 카드 UI — JP 앵커(번호순) + 언어탭 + 영판전용 꼬리.
// 카드 도감(DexCatalog)에서 해당 그룹 선택 시 인-플레이스로 렌더. 데이터는 확정 그룹핑 JSON.
const DATA: Record<string, GroupData> = {
  "sv-base": svBase as unknown as GroupData,
  "sv-triplet-beat": tripletBeat as unknown as GroupData,
  "sv-paldea-evolved": paldeaEvolved as unknown as GroupData,
  "sv-paradox-rift": paradoxRift as unknown as GroupData,
  "sv-151": pokemon151 as unknown as GroupData,
  "sv-obsidian-flames": obsidianFlames as unknown as GroupData,
  "sv-raging-surf": ragingSurf as unknown as GroupData,
  "sv-paldean-fates": paldeanFates as unknown as GroupData,
  "sv-temporal-forces": temporalForces as unknown as GroupData,
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
  "mega-brave-symphonia": megaBraveSymphonia as unknown as GroupData,
  "mega-infernox": megaInfernox as unknown as GroupData,
  "mega-dream-ex": megaDreamEx as unknown as GroupData,
  "mega-munikisuzero": megaMunikisuzero as unknown as GroupData,
};
export const GROUPED_GROUP_IDS = new Set(Object.keys(DATA));

type Print = { id: string; number: string; name: string; image: string | null; rarity: string | null; setId: string; region: string } | null;
type Anchor = { jp: Print; en: Print; kr: Print; dex: number | null };
type TailCard = { id: string; number: string; name: string; image: string | null; rarity: string | null; setId: string; region: string; dex: number | null; jpElsewhere: boolean };

// 타일 클릭 시 상위(DexCatalog)로 넘기는 카드 식별 정보 — 패널이 id 로 상세를 fetch.
export type GroupCardClick = { id: string; name: string; number: string; rarity: string | null; image: string | null; region: string; setId: string };
type GroupData = { group: { id: string; crossGroupEN?: boolean }; counts: { enMatched: number; krMatched: number }; anchors: Anchor[]; tail: { enOnly: TailCard[] } };

const REGION_LABEL: Record<string, string> = { JP: "일본판", EN: "영문판", KR: "한국판" };
const REGION_COLOR: Record<string, string> = { JP: "#e2504a", EN: "#3182f6", KR: "#1f9d55" };

export function GroupCards({ groupId, onCardClick }: { groupId: string; onCardClick?: (c: GroupCardClick) => void }) {
  const data = DATA[groupId];
  if (!data) return null;
  const anchors = data.anchors;
  const enOnly = data.tail.enOnly ?? [];
  const cross = data.group.crossGroupEN;

  return (
    <div>
      <p style={{ color: "#6b7684", fontSize: 13, margin: "0 0 12px", lineHeight: 1.6 }}>
        <b style={{ color: "#e2504a" }}>일본판 기준</b>으로 줄세우고, 각 카드의 영문·한국판은 <b>탭으로 전환</b>합니다.
        {cross
          ? " 영문판은 다른 EN 팩에서 교차로 찾아 붙였습니다(못 찾으면 EN 탭 없음)."
          : " 일본판에 없는 카드는 맨 뒤 영판 전용에 모았습니다."}
      </p>

      <SectionTitle>본문 — 일본판 기준 ({anchors.length})</SectionTitle>
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
                  {c.jpElsewhere && <div style={{ ...tagStyle, background: "#fff4e6", color: "#d9730d" }}>JP 타팩 수록</div>}
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
  const [active, setActive] = React.useState<"JP" | "EN" | "KR">("JP");
  const cur = a[active.toLowerCase() as "jp" | "en" | "kr"] ?? a.jp;
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
