import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://releve-ia.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Le dashboard est personnel (données locales) : rien à indexer
      disallow: "/dashboard",
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
