"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useExpenseSheet } from "@/components/expenses/expense-sheet-provider";
import { isNavActive, NAV_ITEMS } from "@/components/navigation/nav-items";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { APP_CONFIG } from "@/config/app";
import { useApp, useT } from "@/hooks/use-app";
import { cn } from "@/lib/utils";

export function DesktopSidebar() {
  const pathname = usePathname();
  const t = useT();
  const { mode, user } = useApp();
  const expense = useExpenseSheet();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-background px-4 py-6 md:flex">
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-2 text-lg font-semibold tracking-tight">
        <Logo className="h-8 w-8" />
        {APP_CONFIG.name}
      </Link>
      <Button onClick={() => expense.open()} className="mb-6 w-full">
        <Plus className="h-4 w-4" /> {t.dashboard.addExpense}
      </Button>
      <nav aria-label={t.nav.main}>
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(href, pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-2xl px-3 text-[15px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                  {t.nav[label]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="mt-auto truncate px-3 text-xs text-muted-foreground">
        {mode === "cloud" ? user?.email : mode === "demo" ? t.settings.demoMode : t.settings.guestMode}
      </p>
    </aside>
  );
}
