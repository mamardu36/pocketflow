import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/navigation/app-shell";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { ThemeToaster } from "@/components/theme-toaster";
import { APP_CONFIG } from "@/config/app";
import { AppProvider } from "@/hooks/use-app";
import { STORAGE_KEYS } from "@/lib/storage/keys";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: APP_CONFIG.name, template: `%s · ${APP_CONFIG.name}` },
  description: APP_CONFIG.description,
  applicationName: APP_CONFIG.name,
  appleWebApp: { capable: true, title: APP_CONFIG.shortName, statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: APP_CONFIG.themeColor.light },
    { media: "(prefers-color-scheme: dark)", color: APP_CONFIG.themeColor.dark },
  ],
};

// Applies the saved theme before first paint (no flash).
const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEYS.theme)})||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppProvider>
          <AppShell>{children}</AppShell>
          <ThemeToaster />
          <ServiceWorkerRegister />
        </AppProvider>
      </body>
    </html>
  );
}
