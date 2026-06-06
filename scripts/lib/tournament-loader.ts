/**
 * 멀티소스 대회 공용 적재기 — docs/meta-pipeline-multisource.md §3
 *
 * 수집기(소스별 독립 스크립트)가 NormalizedTournament 모양으로 변환해 넘기면
 * 멱등 적재 + SourceRef(primary) 등록 + 이중집계 검사를 한 곳에서 처리한다.
 * (어댑터 추상층 아님 — 타입 계약 + 적재 함수 1개)
 *
 * 규칙 (§1 대회 정체성):
 * - 정본(primary) 수집기만 이 함수로 행을 생성한다. 보강(enrichment) 수집기는 행 생성 금지 —
 *   기존 행에 필드 주입 + SourceRef(role=enrichment) 등록만 (각 수집기에서 직접).
 * - metaRegion 은 필수 명시 (INTL|JP|KR) — 누락 시 throw (조용한 INTL 합산 방지).
 * - 디비전(마스터즈/시니어/주니어)은 대회 행 분리: id 에 디비전 포함 (예 "pd-{id}-masters").
 * - syncedAt 은 standings 적재 성공 후 마지막에 set → 중간 실패 시 재시도 가능(멱등).
 */
import { prisma } from "../../src/lib/prisma";

export const META_REGIONS = ["INTL", "JP", "KR"] as const;
export type MetaRegion = (typeof META_REGIONS)[number];

export type NormalizedStanding = {
  placing: number;
  playerName: string;
  playerUsername?: string | null; // 소스 username (pairings 류 조인 키)
  country?: string | null;
  deckKey?: string | null; // Limitless deck slug (정본 아키타입 키) — 무라벨 소스는 분류기(P4) 결과
  deckName?: string | null;
  deckIcons?: string[];
  wins?: number;
  losses?: number;
  ties?: number;
  decklist?: object | null; // 통일 양식 {pokemon|trainer|energy: [{count,set,number,name,cardId?,logicalCardId?}]}
  deckCode?: string | null; // JP/KR 공식 덱코드
  archetypeRaw?: string | null; // 소스 원문 라벨 (사후 재분류 원천)
  deckSource?: string | null; // decklist provenance: limitless|jp-deckcode|kr-deckcode|pokedata
};

export type NormalizedTournament = {
  id: string; // "{소스프리픽스}-{sourceId}[-{division}]" (lim-/lw-/jpc-/pd-/ptl-)
  source: string; // 정본 소스: limitless-play|limitless-web|jp-official|pokedata|ptcglegends
  sourceId: string; // 정본 소스 원본 ID (디비전 분리 시 "{원본ID}-{division}" 로 유일화)
  metaRegion: MetaRegion; // 필수 — 집계 파티션
  level: string; // worlds|ic|regional|special|cl|league|city|online
  division?: string | null; // masters|seniors|juniors — 행 분리는 id/sourceId 에 반영(주석 메타)
  externalUrl?: string | null;
  name: string; // 원문 대회명
  nameKo?: string | null; // 미지정 시 원문 유지(번역은 수동 편집)
  date: Date;
  region: string; // 표시용 레거시 (참가자 country 최빈값 등)
  format: string; // STANDARD|EXPANDED|STANDARD_JP
  players: number;
  platform?: string | null;
  winnerArchetypeId?: string | null; // 미지정 시 placing 1 의 deckKey 로 파생
  status?: string;
};

export type LoadResult = { tournamentId: string; standings: number; created: boolean };

/** 정본 대회 1건 멱등 적재 (Tournament + SourceRef(primary) + standings + syncedAt) */
export async function loadNormalizedTournament(
  t: NormalizedTournament,
  standings: NormalizedStanding[],
  opts: { dryRun?: boolean } = {},
): Promise<LoadResult> {
  if (!META_REGIONS.includes(t.metaRegion)) {
    throw new Error(`[loader] metaRegion 필수 (INTL|JP|KR): ${t.id} → "${t.metaRegion}"`);
  }
  if (!t.source || !t.sourceId) throw new Error(`[loader] source/sourceId 필수: ${t.id}`);

  // 이중집계 검사 ①: 같은 (source, sourceId) 가 다른 Tournament 에 이미 정본/보강으로 붙어있는가
  const existingRef = await prisma.tournamentSourceRef.findUnique({
    where: { source_sourceId: { source: t.source, sourceId: t.sourceId } },
    select: { tournamentId: true, role: true },
  });
  if (existingRef && existingRef.tournamentId !== t.id) {
    throw new Error(
      `[loader] 이중부착 차단: (${t.source}, ${t.sourceId}) 가 이미 ${existingRef.tournamentId} 에 ${existingRef.role} 로 연결됨 (요청: ${t.id})`,
    );
  }

  const winner = standings.find((s) => s.placing === 1);
  const fields = {
    source: t.source,
    sourceId: t.sourceId,
    metaRegion: t.metaRegion,
    level: t.level,
    externalUrl: t.externalUrl ?? null,
    name: t.name,
    date: t.date,
    region: t.region,
    format: t.format,
    players: t.players,
    platform: t.platform ?? null,
    winnerArchetypeId: t.winnerArchetypeId ?? winner?.deckKey ?? null,
    status: t.status ?? "completed",
  };

  if (opts.dryRun) {
    console.log(
      `[dry] ${t.id} "${t.name}" ${t.metaRegion}/${t.level} ${t.format} p=${t.players} standings=${standings.length} winner=${fields.winnerArchetypeId ?? "?"}`,
    );
    return { tournamentId: t.id, standings: standings.length, created: false };
  }

  const existing = await prisma.tournament.findUnique({ where: { id: t.id }, select: { id: true } });
  await prisma.tournament.upsert({
    where: { id: t.id },
    create: { id: t.id, nameKo: t.nameKo ?? t.name, ...fields },
    update: { ...fields, ...(t.nameKo ? { nameKo: t.nameKo } : {}) }, // nameKo 수동 편집 보존
  });

  // SourceRef(primary) — @@unique([source, sourceId]) 가 이중부착의 DB 레벨 차단 ②
  await prisma.tournamentSourceRef.upsert({
    where: { source_sourceId: { source: t.source, sourceId: t.sourceId } },
    create: { tournamentId: t.id, source: t.source, sourceId: t.sourceId, role: "primary", url: t.externalUrl ?? null },
    update: { role: "primary", url: t.externalUrl ?? null },
  });

  // standings 적재 — placing 중복 제거 (진행중 placing null 은 호출측에서 걸러서 넘길 것)
  const seen = new Set<number>();
  const rows = [];
  for (const s of standings) {
    if (s.placing == null || seen.has(s.placing)) continue;
    seen.add(s.placing);
    rows.push({
      tournamentId: t.id,
      placing: s.placing,
      playerName: s.playerName ?? "Unknown",
      playerUsername: s.playerUsername ?? null,
      country: s.country ?? null,
      deckKey: s.deckKey ?? null,
      deckName: s.deckName ?? null,
      deckIcons: s.deckIcons ?? [],
      wins: s.wins ?? 0,
      losses: s.losses ?? 0,
      ties: s.ties ?? 0,
      decklist: (s.decklist as object) ?? undefined,
      deckCode: s.deckCode ?? null,
      archetypeRaw: s.archetypeRaw ?? null,
      deckSource: s.deckSource ?? null,
    });
  }
  let count = 0;
  if (!existing) {
    // 신규 대회 고속 경로 — 메이저(standings ~2,000행)의 row-by-row upsert 회피
    await prisma.tournamentStanding.createMany({ data: rows, skipDuplicates: true });
    count = rows.length;
  } else {
    for (const { tournamentId, placing, ...data } of rows) {
      await prisma.tournamentStanding.upsert({
        where: { tournamentId_placing: { tournamentId, placing } },
        create: { tournamentId, placing, ...data },
        update: data,
      });
      count++;
    }
  }

  // standings 적재 성공 후에만 syncedAt set (멱등성)
  await prisma.tournament.update({ where: { id: t.id }, data: { syncedAt: new Date() } });

  return { tournamentId: t.id, standings: count, created: !existing };
}

/**
 * 보강(enrichment) SourceRef 등록 — 행 생성 금지 원칙의 등록부.
 * 정본 행이 없으면 throw (보강 수집기는 skip+로그 처리할 것).
 */
export async function registerEnrichmentRef(
  tournamentId: string,
  source: string,
  sourceId: string,
  url?: string | null,
): Promise<void> {
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { id: true } });
  if (!t) throw new Error(`[loader] enrichment 대상 정본 행 없음: ${tournamentId} (${source}, ${sourceId})`);
  const existingRef = await prisma.tournamentSourceRef.findUnique({
    where: { source_sourceId: { source, sourceId } },
    select: { tournamentId: true },
  });
  if (existingRef && existingRef.tournamentId !== tournamentId) {
    throw new Error(
      `[loader] 이중부착 차단: (${source}, ${sourceId}) 가 이미 ${existingRef.tournamentId} 에 연결됨 (요청: ${tournamentId})`,
    );
  }
  await prisma.tournamentSourceRef.upsert({
    where: { source_sourceId: { source, sourceId } },
    create: { tournamentId, source, sourceId, role: "enrichment", url: url ?? null },
    update: { url: url ?? null },
  });
}
