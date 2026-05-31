import { rebuildRankings } from "@/lib/services/gamification";
import { rebuildMarketStats } from "@/lib/services/market";

// 매일 1회 실행되는 크론 (Vercel Cron → vercel.json 의 crons 엔트리).
// CRON_SECRET 미설정 시 401. 호출 시 Authorization: Bearer <CRON_SECRET> 검증.
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 401 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // rebuildRankings 가 전 유저 통계 집계 + 비-rankMode/ rankMode 뱃지 갱신을 모두 수행.
  const result = await rebuildRankings();

  // 마켓 분석 통계 재집계 (랭킹/뱃지 다음). Price/Trade → MarketStat.
  const market = await rebuildMarketStats();

  return Response.json({ ok: true, ...result, market, ranAt: new Date().toISOString() });
}
