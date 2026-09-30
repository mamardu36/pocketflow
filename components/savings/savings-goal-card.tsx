"use client";

import { CategoryIcon } from "@/components/ui/category-icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { COLOR_STYLES } from "@/constants/categories";
import { useDateLocale, useMoney, useT } from "@/hooks/use-app";
import { calculateGoalProgress } from "@/lib/calculations/savings";
import { formatMonthLabel, monthKeyFromISODate } from "@/lib/dates";
import type { Cents, SavingsGoal } from "@/types";

export function SavingsGoalCard({ goal, balance, onSelect }: { goal: SavingsGoal; balance: Cents; onSelect: (goal: SavingsGoal) => void }) {
  const t = useT();
  const money = useMoney();
  const locale = useDateLocale();
  const progress = calculateGoalProgress(balance, goal.targetAmount);

  return (
    <button
      type="button"
      onClick={() => onSelect(goal)}
      aria-label={t.savings.open(goal.name)}
      className="block w-full rounded-3xl border border-border bg-card p-4 text-left shadow-soft transition hover:border-foreground/15 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-3">
        <CategoryIcon emoji={goal.emoji} color={goal.color} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{goal.name}</p>
          {goal.targetDate && <p className="truncate text-sm text-muted-foreground">{t.savings.by(formatMonthLabel(monthKeyFromISODate(goal.targetDate), locale))}</p>}
        </div>
        <div className="text-right">
          <p className="tabular font-semibold">{money(balance)}</p>
          {goal.targetAmount && <p className="tabular text-sm text-muted-foreground">{t.savings.of(money(goal.targetAmount))}</p>}
        </div>
      </div>
      {progress !== null && <ProgressBar value={progress} barClassName={COLOR_STYLES[goal.color].bar} className="mt-3" label={`${Math.round(progress * 100)}%`} />}
    </button>
  );
}
