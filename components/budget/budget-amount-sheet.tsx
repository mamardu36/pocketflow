"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Sheet } from "@/components/ui/sheet";
import { useApp, useT } from "@/hooks/use-app";
import { updateBudget } from "@/lib/domain/actions";
import { centsToInput, parseMoneyInput } from "@/lib/money";
import type { MonthlyBudget } from "@/types";

export function BudgetAmountSheet({ open, onClose, budget }: { open: boolean; onClose: () => void; budget: MonthlyBudget }) {
  const t = useT();
  return (
    <Sheet open={open} onClose={onClose} title={t.dashboard.editBudget} description={t.month.setupHint} closeLabel={t.common.close}>
      {open && <AmountForm budget={budget} onClose={onClose} />}
    </Sheet>
  );
}

function AmountForm({ budget, onClose }: { budget: MonthlyBudget; onClose: () => void }) {
  const t = useT();
  const { commit } = useApp();
  const [value, setValue] = useState(centsToInput(budget.amount));
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cents = parseMoneyInput(value);
    if (cents === null) return setError(t.category.invalidAmount);
    if (commit((d) => updateBudget(d, budget.id, { amount: cents }))) {
      toast.success(t.dashboard.budgetUpdated);
      onClose();
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label={t.dashboard.monthlyBudget} htmlFor="budget-amount" error={error}>
        <MoneyInput id="budget-amount" size="xl" value={value} onValueChange={setValue} data-autofocus />
      </Field>
      <Button type="submit" size="lg" className="w-full">
        {t.common.save}
      </Button>
    </form>
  );
}
