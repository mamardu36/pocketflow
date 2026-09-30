"use client";

import { Pencil, TriangleAlert } from "lucide-react";
import { COLOR_STYLES } from "@/constants/categories";
import { useMoney, useT } from "@/hooks/use-app";
import type { MonthView } from "@/lib/domain/selectors";
import { cn } from "@/lib/utils";

interface MonthlyBudgetCardProps {
  view: MonthView;
  onEditBudget: () => void;
}

/**
 * The hero: "Left to assign" + an allocation bar where each segment is a category.
 * Empty track at the end = money that still has no job.
 */
export function MonthlyBudgetCard({ view, onEditBudget }: MonthlyBudgetCardProps) {
  const t = useT();
  const money = useMoney();
  const { summary, categories } = view;
  const over = summary.unassigned < 0;
  const scale = Math.max(summary.budget, summary.assigned, 1);

  return (
    <section aria-label={t.dashboard.monthlyBudget} className="rounded-4xl bg-hero p-5 text-hero-foreground shadow-lift sm:p-6">
      <p className="text-sm text-hero-muted">{t.dashboard.leftToAssign}</p>
      <p className={cn("tabular mt-1 text-[2.75rem] font-semibold leading-none tracking-tight sm:text-5xl", over && "text-[hsl(var(--danger))]")}>
        {money(summary.unassigned)}
      </p>
      <p className="mt-2 flex min-h-5 items-center gap-1.5 text-sm text-hero-muted">
        {over ? (
          <>
            <TriangleAlert className="h-4 w-4 shrink-0 text-[hsl(var(--danger))]" aria-hidden />
            <span>{t.dashboard.overAssigned(money(summary.overAssignedBy))}</span>
          </>
        ) : summary.unassigned === 0 && summary.budget > 0 ? (
          t.dashboard.allAssigned
        ) : null}
      </p>

      <div
        role="img"
        aria-label={`${t.dashboard.budgetAllocation}: ${money(summary.assigned)} / ${money(summary.budget)}`}
        className={cn("mt-5 flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-white/10", over && "ring-2 ring-[hsl(var(--danger))]")}
      >
        {categories.filter((c) => c.assigned > 0).map((c) => (
          <span
            key={c.id}
            title={c.name}
            className={cn("h-full transition-[width] duration-500 ease-out first:rounded-l-full last:rounded-r-full", COLOR_STYLES[c.color].bar)}
            style={{ width: `${(c.assigned / scale) * 100}%` }}
          />
        ))}
      </div>

      {over && <p className="mt-3 text-sm text-hero-muted">{t.dashboard.overAssignedHint}</p>}

      <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
        <div>
          <dt className="text-xs text-hero-muted">{t.dashboard.monthlyBudget}</dt>
          <dd className="mt-0.5">
            <button
              type="button"
              onClick={onEditBudget}
              aria-label={t.dashboard.editBudget}
              className="tabular -ml-1 inline-flex items-center gap-1.5 rounded-lg px-1 font-semibold transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {money(summary.budget)} <Pencil className="h-3.5 w-3.5 opacity-60" aria-hidden />
            </button>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-hero-muted">{t.dashboard.assigned}</dt>
          <dd className="tabular mt-0.5 font-semibold">{money(summary.assigned)}</dd>
        </div>
        <div>
          <dt className="text-xs text-hero-muted">{t.dashboard.spent}</dt>
          <dd className="tabular mt-0.5 font-semibold">{money(summary.spent)}</dd>
        </div>
      </dl>
    </section>
  );
}
