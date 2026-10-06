import type { Metadata } from "next";
import { WelcomeScreen } from "@/components/onboarding/welcome-screen";
import { OPEN_GRAPH, SEO } from "@/config/site";

export const metadata: Metadata = {
  title: { absolute: SEO.title },
  description: SEO.description,
  alternates: { canonical: "/welcome" },
  openGraph: { ...OPEN_GRAPH, url: "/welcome" },
};

/** Rendered on the server: crawlers and link previews get the real content, not a loading screen. */
export default function WelcomePage() {
  return <WelcomeScreen />;
}
