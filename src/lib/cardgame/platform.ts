/**
 * 대회 platform → 온/오프라인 표시 메타.
 *
 * Limitless `details.platform`: PTCGL/PTCGO 는 온라인(게임 클라이언트),
 * 그 외(null·오프라인 매장명 등)는 오프라인으로 간주.
 */
const ONLINE_PLATFORMS = new Set(["PTCGL", "PTCGO", "PTCG LIVE", "ONLINE"]);

export type PlatformBadge = { online: boolean; emoji: string; label: string; sub: string | null };

export function platformBadge(platform: string | null | undefined): PlatformBadge {
  const p = (platform ?? "").toUpperCase();
  const online = ONLINE_PLATFORMS.has(p);
  return online
    ? { online: true, emoji: "🌐", label: "온라인", sub: platform ?? null }
    : { online: false, emoji: "🏢", label: "오프라인", sub: platform ?? null };
}
