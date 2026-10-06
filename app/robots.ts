import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/site";

/** Only the public pages are worth indexing; the rest is the personal app. */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/welcome"],
      disallow: ["/expenses", "/savings", "/history", "/settings", "/category", "/month", "/onboarding", "/auth", "/reset-password"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
