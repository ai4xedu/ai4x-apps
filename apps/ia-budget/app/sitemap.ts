import type { MetadataRoute } from "next";
import { USE_CASES } from "@/lib/usecases";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://releve-ia.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE}/comparateur`, changeFrequency: "monthly", priority: 0.9 },
    ...USE_CASES.map((uc) => ({
      url: `${BASE}/comparateur/${uc.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
