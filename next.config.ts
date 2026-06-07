import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone", // Lightsail 배포: CI 빌드 산출물(server.js+최소 node_modules)만 서버로 전송
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "archives.bulbagarden.net" },
      { protocol: "https", hostname: "mzsbvctbgyidbcpeosyn.supabase.co" },
    ],
  },
};

export default withNextIntl(nextConfig);
