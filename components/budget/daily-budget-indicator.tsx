"use client";

import { useMoney, useT } from "@/hooks/use-app";
import type { MonthView } from "@/lib/domain/selectors";

/** Secondary insights. At most two lines, never alarming. */
export function DailyBudgetIndicator({ view }: { view: MonthView }) {
  const t = useT();
  const money = useMoney();
  const lines: string[] = [];

  if (view.isPast) {
    lines.push(t.dashboard.monthEnded);
  } else if (view.remainingVariable > 0) {
    lines.push(`${t.dashboard.leftForDays(money(view.remainingVariable), view.remainingDays)} · ${t.dashboard.perDay(money(view.dailyAllowance))}`);
  }
  if (view.summary.unassigned > 0) lines.push(t.dashboard.stillToAssign(money(view.summary.unassigned)));
  else if (view.comparison && view.comparison.previous > 0) {
    lines.push(view.comparison.difference <= 0 ? t.dashboard.lowerThanLast : t.dashboard.higherThanLast(money(view.comparison.difference)));
  }

  if (lines.length === 0) return null;
  return (
    <div className="space-y-1 px-1 text-sm text-muted-foreground" aria-live="polite">
      {lines.slice(0, 2).map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
