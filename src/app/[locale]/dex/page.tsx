import type { Metadata } from "next";
import { DexCatalog } from "@/components/dex/DexCatalog";
import { Container } from "@/components/toss";
import { listRegionPacks, type Region, type RegionPack } from "@/lib/cards/dex-region";

export const metadata: Metadata = { title: "카드 도감 — Raredoc" };

const REGIONS: Region[] = ["JP", "EN", "KR"];

export default async function DexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 지역별 팩 목록(유저 무관, 1h 캐시, 가벼움) — 병렬. 카드는 팩 선택 시 액션이 lazy 로드.
  // 팩 이름은 locale 우선(ko→nameKo). en 외엔 ko.
  const preferred = locale === "en" ? "en" : "ko";
  const lists = await Promise.all(REGIONS.map((r) => listRegionPacks(r, preferred)));
  const regionPacks: Record<Region, RegionPack[]> = { JP: [], EN: [], KR: [] };
  REGIONS.forEach((r, i) => { regionPacks[r] = lists[i]; });

  return (
    <Container size="xl" padding="md" className="py-8">
      <DexCatalog regionPacks={regionPacks} locale={locale} />
    </Container>
  );
}
