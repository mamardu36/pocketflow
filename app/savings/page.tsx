"use client";

import { PiggyBank, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/navigation/page-header";
import { GoalDetailSheet } from "@/components/savings/goal-detail-sheet";
import { GoalFormSheet } from "@/components/savings/goal-form-sheet";
import { SavingsGoalCard } from "@/components/savings/savings-goal-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useApp, useDateLocale, useMoney, useT } from "@/hooks/use-app";
import { calculateGoalBalance, calculateMonthlySavingsHistory, calculateSavingsTotal } from "@/lib/calculations/savings";
import { formatMonthLabel, getCurrentMonthKey, isSameMonth } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { SavingsGoal } from "@/types";

export default function SavingsPage() {
  const t = useT();
  const money = useMoney();
  const locale = useDateLocale();
  const { data } = useApp();
  const [formGoal, setFormGoal] = useState<SavingsGoal | null | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);

  const goals = useMemo(() => [...data.savingsGoals].sort((a, b) => a.sortOrder - b.sortOrder), [data.savingsGoals]);
  const total = useMemo(() => calculateSavingsTotal(data.savingsGoals, data), [data]);
  const history = useMemo(() => calculateMonthlySavingsHistory(data), [data]);
  const current = getCurrentMonthKey();
  const thisMonth = history.find((h) => isSameMonth(h.monthKey, current))?.amount ?? 0;
  const detailGoal = detailId ? data.savingsGoals.find((g) => g.id === detailId) ?? null : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.savings.title}
        action={
          <Button size="sm" variant="secondary" onClick={() => setFormGoal(null)}>
            <Plus className="h-4 w-4" aria-hidden />
            {t.savings.newGoal}
          </Button>
        }
      />

      <section aria-label={t.savings.total} className="rounded-4xl bg-hero p-5 text-hero-foreground shadow-lift sm:p-6">
        <p className="text-sm text-hero-muted">{t.savings.total}</p>
        <p className="tabular mt-1 text-[2.75rem] font-semibold leading-none tracking-tight">{money(total)}</p>
        <p className="mt-3 text-sm text-hero-muted">
          {thisMonth !== 0 ? t.savings.thisMonth(money(thisMonth, { signed: true })) : t.savings.totalHint}
        </p>
      </section>

      {goals.length === 0 ? (
        <EmptyState
          icon={<PiggyBank className="h-5 w-5" />}
          title={t.savings.emptyTitle}
          description={t.savings.emptyBody}
          action={<Button onClick={() => setFormGoal(null)}>{t.savings.createGoal}</Button>}
        />
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {goals.map((g) => (
            <SavingsGoalCard key={g.id} goal={g} balance={calculateGoalBalance(g, data)} onSelect={(goal) => setDetailId(goal.id)} />
          ))}
        </div>
      )}

      {history.length > 0 && (
        <section aria-labelledby="savings-by-month">
          <h2 id="savings-by-month" className="mb-2 px-1 text-base font-semibold">
            {t.savings.byMonth}
          </h2>
          <ul className="divide-y divide-border rounded-3xl border border-border bg-card shadow-soft">
            {history.map((h) => (
              <li key={`${h.monthKey.year}-${h.monthKey.month}`} className="flex items-center justify-between px-4 py-3">
                <span>{formatMonthLabel(h.monthKey, locale)}</span>
                <span className={cn("tabular font-medium", h.amount >= 0 ? "text-positive" : "text-danger")}>
                  {money(h.amount, { signed: true })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <GoalFormSheet open={formGoal !== undefined} onClose={() => setFormGoal(undefined)} goal={formGoal ?? null} />
      <GoalDetailSheet
        goal={detailGoal}
        onClose={() => setDetailId(null)}
        onEdit={(g) => {
          setDetailId(null);
          setFormGoal(g);
        }}
      />
    </div>
  );
}
