"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { MigrationDialog } from "@/components/auth/migration-dialog";
import { ExpenseSheetProvider } from "@/components/expenses/expense-sheet-provider";
import { BottomNavigation } from "@/components/navigation/bottom-navigation";
import { DemoBanner } from "@/components/navigation/demo-banner";
import { DesktopSidebar } from "@/components/navigation/desktop-sidebar";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { useApp } from "@/hooks/use-app";

const STANDALONE_ROUTES = ["/welcome", "/onboarding", "/auth"];

function LoadingScreen() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-muted border-t-foreground" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Gates routes by mode and renders the navigation chrome. */
export function AppShell({ children }: { children: ReactNode }) {
  const { status, mode } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const standalone = STANDALONE_ROUTES.includes(pathname);

  const redirect =
    status !== "ready" ? null
    : !mode && !standalone ? "/welcome"
    : mode && (pathname === "/welcome" || pathname === "/onboarding") ? "/"
    : mode === "cloud" && pathname === "/auth" ? "/"
    : null;

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  return (
    <ConfirmProvider>
      <ExpenseSheetProvider>
        {status !== "ready" || redirect ? (
          <LoadingScreen />
        ) : standalone ? (
          <main className="min-h-dvh">{children}</main>
        ) : (
          <>
            <DesktopSidebar />
            <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] md:ml-64 md:max-w-3xl md:px-10 md:pb-12 md:pt-8 lg:ml-[max(16rem,calc((100vw-48rem)/2))]">
              <DemoBanner />
              {children}
            </main>
            <BottomNavigation />
          </>
        )}
        <MigrationDialog />
      </ExpenseSheetProvider>
    </ConfirmProvider>
  );
}
