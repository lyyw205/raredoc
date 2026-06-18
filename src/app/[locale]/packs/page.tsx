import type { Metadata } from "next";
import { PackGallery } from "@/components/dex/PackGallery";
import { Container } from "@/components/toss";
import { listRegionPacks, type Region, type RegionPack } from "@/lib/cards/dex-region";
import { REGION_ORDER as REGIONS } from "@/lib/cards/card-fields";

export const metadata: Metadata = { title: "카드팩 — Raredoc" };

export default async function PacksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 지역별 팩 목록(유저 무관, 1h 캐시) — 카드 도감과 동일한 데이터층 재사용. 카드별 쿼리 없음.
  const preferred = locale === "en" ? "en" : "ko";
  const lists = await Promise.all(REGIONS.map((r) => listRegionPacks(r, preferred)));
  const regionPacks: Record<Region, RegionPack[]> = { JP: [], EN: [], KR: [] };
  REGIONS.forEach((r, i) => { regionPacks[r] = lists[i]; });

  return (
    <Container size="xl" padding="md" className="py-8">
      <PackGallery regionPacks={regionPacks} locale={locale} />
    </Container>
  );
}
