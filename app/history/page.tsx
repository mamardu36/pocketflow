"use client";

import { CalendarClock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/navigation/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useApp, useDateLocale, useMoney, useT } from "@/hooks/use-app";
import { formatMonthLabel, getCurrentMonthKey, isSameMonth } from "@/lib/dates";
import { buildMonthView, getBudgetKey, type MonthView } from "@/lib/domain/selectors";

export default function HistoryPage() {
  const t = useT();
  const { data } = useApp();

  const years = useMemo(() => {
    const views = data.budgets
      .map((b) => buildMonthView(data, getBudgetKey(b)))
      .filter((v): v is MonthView => v !== null)
      .sort((a, b) => b.key.year - a.key.year || b.key.month - a.key.month);
    const grouped = new Map<number, MonthView[]>();
    for (const v of views) grouped.set(v.key.year, [...(grouped.get(v.key.year) ?? []), v]);
    return [...grouped.entries()];
  }, [data]);

  return (
    <div className="space-y-6">
      <PageHeader title={t.history.title} />
      {years.length === 0 ? (
        <EmptyState icon={<CalendarClock className="h-5 w-5" />} title={t.history.emptyTitle} description={t.history.emptyBody} />
      ) : (
        years.map(([year, months]) => (
          <section key={year} aria-labelledby={`year-${year}`}>
            <h2 id={`year-${year}`} className="mb-2 px-1 text-sm font-semibold text-muted-foreground">
              {year}
            </h2>
            <ul className="space-y-2.5">
              {months.map((v) => (
                <li key={v.budget.id}>
                  <MonthRow view={v} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function MonthRow({ view }: { view: MonthView }) {
  const t = useT();
  const money = useMoney();
  const locale = useDateLocale();
  const label = formatMonthLabel(view.key, locale, false);
  const s = view.summary;
  const current = isSameMonth(view.key, getCurrentMonthKey());

  return (
    <Link
      href={`/month?y=${view.key.year}&m=${view.key.month}`}
      aria-label={t.history.open(formatMonthLabel(view.key, locale))}
      className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft transition hover:border-foreground/15 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-medium">
          {label}
          {current && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{t.history.current}</span>}
        </p>
        <dl className="tabular mt-2 grid grid-cols-3 gap-2 text-sm">
          {[
            [t.history.budget, s.budget],
            [t.history.spent, s.spent],
            [t.history.saved, s.saved],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="font-medium">{money(v as number)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
