import type { MetadataRoute } from "next";
import { SITE_BASE_URL as BASE_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        // 이미지 크롤러 차단 (pokemontcg.io 이미지 hotlink 보호)
        userAgent: "Googlebot-Image",
        disallow: "/",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
