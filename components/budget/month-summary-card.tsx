"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useApp, useDateLocale, useMoney, useT } from "@/hooks/use-app";
import { markBudgetReviewed, moveUnusedToSavings } from "@/lib/domain/actions";
import type { MonthView } from "@/lib/domain/selectors";
import { addMonths, formatMonthLabel, lastDayOfMonth } from "@/lib/dates";

export function MonthStats({ view }: { view: MonthView }) {
  const t = useT();
  const money = useMoney();
  const s = view.summary;
  const items = [
    { label: t.history.budget, value: money(s.budget) },
    { label: t.history.spent, value: money(s.spent) },
    { label: t.history.saved, value: money(s.saved) },
    { label: t.history.unused, value: money(s.unused) },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2.5">
      {items.map((i) => (
        <div key={i.label} className="rounded-2xl bg-muted/60 px-3.5 py-3">
          <dt className="text-sm text-muted-foreground">{i.label}</dt>
          <dd className="tabular mt-0.5 text-lg font-semibold">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Month-end review: suggests (never forces) moving unused money to savings. */
export function MonthEndCard({ view }: { view: MonthView }) {
  const t = useT();
  const money = useMoney();
  const locale = useDateLocale();
  const { data, commit, setMonth } = useApp();
  const router = useRouter();
  const [moving, setMoving] = useState(false);
  const [goalId, setGoalId] = useState(data.savingsGoals[0]?.id ?? "");
  const monthName = formatMonthLabel(view.key, locale, false);

  if (!view.isPast || view.budget.reviewedAt) return null;

  const move = () => {
    const goal = data.savingsGoals.find((g) => g.id === goalId);
    if (!goal) return toast.error(t.history.needGoal);
    const ok = commit((d) =>
      moveUnusedToSavings(d, view.budget.id, goal.id, view.summary.unused, lastDayOfMonth(view.key), t.savings.unusedFrom(monthName)),
    );
    if (ok) {
      toast.success(t.history.moved(money(view.summary.unused), goal.name));
      setMoving(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold tracking-tight">{t.history.completedTitle(monthName)}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.history.completedBody}</p>
      {view.summary.overspentBy > 0 && <p className="mt-2 text-sm text-danger">{t.history.overspent(money(view.summary.overspentBy))}</p>}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {view.summary.unused > 0 && (
          <Button onClick={() => (data.savingsGoals.length ? setMoving(true) : toast.error(t.history.needGoal))} className="sm:flex-1">
            {t.history.moveUnused}
          </Button>
        )}
        <Button variant="secondary" onClick={() => {
            if (commit((d) => markBudgetReviewed(d, view.budget.id))) {
              setMonth(addMonths(view.key, 1));
              router.push("/");
            }
          }} className="sm:flex-1">
          {t.history.markDone}
        </Button>
      </div>

      <Sheet open={moving} onClose={() => setMoving(false)} title={t.history.moveUnused} description={money(view.summary.unused)} closeLabel={t.common.close}>
        <div className="space-y-5">
          <Field label={t.history.chooseGoal} htmlFor="move-goal">
            <Select id="move-goal" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              {data.savingsGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button size="lg" className="w-full" onClick={move}>
            {t.history.move}
          </Button>
        </div>
      </Sheet>
    </Card>
  );
}
