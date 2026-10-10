import type { Metadata } from "next";
import { PrivacyContent } from "@/components/legal/privacy-content";
import { OPEN_GRAPH } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What PocketFlow stores, where, and how to delete it. No ads, no tracking, no bank connection.",
  alternates: { canonical: "/privacy" },
  openGraph: { ...OPEN_GRAPH, url: "/privacy", title: "Privacy · PocketFlow" },
};

/** Public page (also the privacy policy URL for the app stores). Rendered on the server. */
export default function PrivacyPage() {
  return <PrivacyContent />;
}
