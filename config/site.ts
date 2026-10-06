/**
 * Public URL of the site, used for canonical links and social previews.
 * On Vercel it's detected automatically; set NEXT_PUBLIC_SITE_URL to use a custom domain.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const SEO = {
  title: "PocketFlow — Simple monthly budget for students",
  description:
    "Decide where your money goes before you spend it. Set your monthly budget, split it into categories and see what's left at a glance. Free, no bank connection, works offline.",
  tagline: "PocketFlow doesn't tell you where your money went. It helps you decide where it will go.",
};

/** Full Open Graph block. Pages that override `openGraph` must spread this, or Next.js drops the image. */
export const OPEN_GRAPH = {
  type: "website" as const,
  siteName: "PocketFlow",
  title: SEO.title,
  description: SEO.description,
  locale: "en_US",
  alternateLocale: ["fr_FR"],
  images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: SEO.tagline }],
};
