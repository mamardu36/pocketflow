"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useApp, useDateLocale, useT } from "@/hooks/use-app";
import { addMonths, formatMonthLabel, getCurrentMonthKey, isSameMonth } from "@/lib/dates";
import { findBudget } from "@/lib/domain/selectors";

/** Gentle nudge to review last month. Never forces anything. */
export function PreviousMonthBanner() {
  const { data, month } = useApp();
  const t = useT();
  const locale = useDateLocale();
  if (!isSameMonth(month, getCurrentMonthKey())) return null;
  const previousKey = addMonths(month, -1);
  const previous = findBudget(data, previousKey);
  if (!previous || previous.reviewedAt) return null;

  return (
    <Link
      href={`/month?y=${previousKey.year}&m=${previousKey.month}`}
      className="flex items-center gap-3 rounded-3xl border border-border bg-card px-4 py-3 shadow-soft transition hover:border-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CircleCheck className="h-5 w-5 shrink-0 text-positive" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.dashboard.previousCompleted(formatMonthLabel(previousKey, locale, false))}</span>
      <span className="shrink-0 text-sm text-muted-foreground">{t.dashboard.seeSummary}</span>
    </Link>
  );
}
