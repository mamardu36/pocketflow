import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${getSiteUrl()}/welcome`, changeFrequency: "monthly", priority: 1 }];
}
