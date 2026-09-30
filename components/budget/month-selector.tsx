"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp, useDateLocale, useT } from "@/hooks/use-app";
import { addMonths, formatMonthLabel, getCurrentMonthKey, isSameMonth } from "@/lib/dates";

export function MonthSelector() {
  const { month, setMonth } = useApp();
  const t = useT();
  const locale = useDateLocale();
  const current = getCurrentMonthKey();
  const isCurrent = isSameMonth(month, current);

  const navButton = "grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="flex items-center gap-1">
      <button type="button" className={navButton} onClick={() => setMonth(addMonths(month, -1))} aria-label={t.month.previous}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h1 key={`${month.year}-${month.month}`} className="min-w-0 animate-month-in truncate px-1 text-2xl font-semibold tracking-tight" aria-live="polite">
        {formatMonthLabel(month, locale)}
      </h1>
      <button type="button" className={navButton} onClick={() => setMonth(addMonths(month, 1))} aria-label={t.month.next}>
        <ChevronRight className="h-5 w-5" />
      </button>
      {!isCurrent && (
        <button
          type="button"
          onClick={() => setMonth(current)}
          className="ml-1 shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs font-medium transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t.month.backToToday}
        </button>
      )}
    </div>
  );
}
