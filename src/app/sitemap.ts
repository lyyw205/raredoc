import type { MetadataRoute } from "next";
import { SITE_BASE_URL as BASE_URL } from "@/lib/constants";

const LOCALES = ["ko", "en"] as const;

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // 정적 페이지
  const staticRoutes = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/packs", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/dex", priority: 0.9, changeFrequency: "daily" as const },
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

  return entries;
}
