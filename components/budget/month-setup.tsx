"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { useApp, useDateLocale, useT } from "@/hooks/use-app";
import { createMonthBudget } from "@/lib/domain/actions";
import { findTemplateBudget, getBudgetKey } from "@/lib/domain/selectors";
import { formatMonthLabel } from "@/lib/dates";
import { centsToInput, parseMoneyInput } from "@/lib/money";
import type { MonthKey } from "@/types";

/** Shown the first time a month is opened: asks for the amount and carries over categories. */
export function MonthSetup({ monthKey }: { monthKey: MonthKey }) {
  const t = useT();
  const locale = useDateLocale();
  const { data, commit } = useApp();
  const template = findTemplateBudget(data, monthKey);
  const [value, setValue] = useState(template ? centsToInput(template.amount) : "");
  const [reuse, setReuse] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cents = parseMoneyInput(value);
    if (cents === null || cents <= 0) return setError(t.category.invalidAmount);
    commit((d) => createMonthBudget(d, { key: monthKey, amount: cents, reuseAmounts: reuse }));
  };

  return (
    <Card className="animate-month-in p-5 sm:p-6">
      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t.month.setupTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.month.setupHint}</p>
        </div>
        <Field label={t.dashboard.monthlyBudget} htmlFor="month-amount" error={error}>
          <MoneyInput id="month-amount" size="xl" value={value} onValueChange={setValue} autoFocus />
        </Field>
        {template ? (
          <>
            <p className="text-sm text-muted-foreground">{t.month.copiedFrom(formatMonthLabel(getBudgetKey(template), locale))}</p>
            <Switch id="reuse-amounts" checked={reuse} onChange={setReuse} label={t.month.reuseAmounts} hint={t.month.reuseHint} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t.month.noTemplate}</p>
        )}
        <Button type="submit" size="lg" className="w-full">
          {t.month.create}
        </Button>
      </form>
    </Card>
  );
}
