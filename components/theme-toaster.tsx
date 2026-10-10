"use client";

import { Toaster } from "sonner";
import { useApp } from "@/hooks/use-app";

/**
 * Notifications: one at a time, small, at the bottom (above the tab bar on phones),
 * styled like the app's cards. Only used when the screen itself doesn't already show the result.
 */
export function ThemeToaster() {
  const theme = useApp().data.preferences.theme;
  return (
    <Toaster
      position="bottom-center"
      theme={theme}
      visibleToasts={1}
      gap={8}
      offset={{ bottom: 24 }}
      // Phones: sit just above the bottom navigation bar.
      mobileOffset={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)", left: 16, right: 16 }}
      toastOptions={{
        unstyled: true,
        duration: 3500,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 text-sm text-foreground shadow-lift backdrop-blur sm:w-[360px]",
          content: "min-w-0 flex-1",
          title: "font-medium leading-snug",
          description: "mt-0.5 text-xs text-muted-foreground",
          icon: "shrink-0 text-primary [&>svg]:h-[18px] [&>svg]:w-[18px]",
          success: "[&_[data-icon]]:text-positive",
          error: "[&_[data-icon]]:text-danger",
          info: "[&_[data-icon]]:text-muted-foreground",
          actionButton:
            "shrink-0 rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15 active:scale-95",
        },
      }}
    />
  );
}
