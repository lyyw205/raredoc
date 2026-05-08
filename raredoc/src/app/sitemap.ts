import type { MetadataRoute } from "next";
import { getAllSets } from "@/lib/api/pokemontcg";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://raredoc.kr";
const LOCALES = ["ko", "en"] as const;

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // 정적 페이지
  const staticRoutes = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/expansions", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/tier-list", priority: 0.8, changeFrequency: "weekly" as const },
  ];

  for (const locale of LOCALES) {
    for (const route of staticRoutes) {
      entries.push({
        url: `${BASE_URL}/${locale}${route.path}`,
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      });
    }
  }

  // 확장팩 페이지
  try {
    const sets = await getAllSets();
    for (const set of sets) {
      const lastMod = new Date(set.releaseDate);
      for (const locale of LOCALES) {
        entries.push({
          url: `${BASE_URL}/${locale}/expansions/${set.id}`,
          lastModified: lastMod,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch {
    // API 실패 시 정적 페이지만 반환
  }

  return entries;
}
