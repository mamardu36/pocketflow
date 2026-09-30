"use client";

import { Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Sheet } from "@/components/ui/sheet";
import { COLOR_STYLES } from "@/constants/categories";
import { useApp, useDateLocale, useMoney, useT } from "@/hooks/use-app";
import { calculateGoalBalance, calculateGoalProgress, getSavingsContributions, type SavingsContribution } from "@/lib/calculations/savings";
import { addSavingsTransaction, deleteSavingsGoal, deleteSavingsTransaction } from "@/lib/domain/actions";
import { formatMonthLabel, formatShortDate, toISODate } from "@/lib/dates";
import { parseMoneyInput } from "@/lib/money";
import type { SavingsGoal } from "@/types";

interface GoalDetailSheetProps {
  goal: SavingsGoal | null;
  onClose: () => void;
  onEdit: (goal: SavingsGoal) => void;
}

export function GoalDetailSheet({ goal, onClose, onEdit }: GoalDetailSheetProps) {
  const t = useT();
  return (
    <Sheet open={goal !== null} onClose={onClose} title={goal ? `${goal.emoji} ${goal.name}` : ""} closeLabel={t.common.close}>
      {goal && <GoalDetail key={goal.id} goal={goal} onClose={onClose} onEdit={onEdit} />}
    </Sheet>
  );
}

function GoalDetail({ goal, onClose, onEdit }: { goal: SavingsGoal; onClose: () => void; onEdit: (goal: SavingsGoal) => void }) {
  const t = useT();
  const money = useMoney();
  const locale = useDateLocale();
  const confirm = useConfirm();
  const { data, commit } = useApp();
  const [mode, setMode] = useState<"deposit" | "withdraw" | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const balance = calculateGoalBalance(goal, data);
  const progress = calculateGoalProgress(balance, goal.targetAmount);
  const contributions = getSavingsContributions(data, goal.id);

  const label = (c: SavingsContribution) => {
    if (c.source === "budget") return t.savings.fromBudget(formatMonthLabel(c.monthKey, locale));
    if (c.source === "unused") return c.note || t.savings.unusedFrom(formatMonthLabel(c.monthKey, locale));
    return c.note || (c.amount < 0 ? t.savings.withdrawal : t.savings.manual);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cents = parseMoneyInput(amount);
    if (cents === null || cents <= 0) return setError(t.savings.invalidAmount);
    const signed = mode === "withdraw" ? -cents : cents;
    const ok = commit((d) => addSavingsTransaction(d, { goalId: goal.id, amount: signed, date: toISODate(new Date()), note }));
    if (ok) {
      toast.success(mode === "withdraw" ? t.savings.moneyWithdrawn : t.savings.moneyAdded);
      setMode(null);
      setAmount("");
      setNote("");
      setError(null);
    }
  };

  const removeGoal = async () => {
    const ok = await confirm({ title: t.savings.deleteTitle, description: t.savings.deleteBody, confirmLabel: t.common.delete, cancelLabel: t.common.cancel, destructive: true });
    if (!ok) return;
    commit((d) => deleteSavingsGoal(d, goal.id));
    toast.success(t.savings.goalDeleted);
    onClose();
  };

  const removeEntry = async (id: string) => {
    const ok = await confirm({ title: t.savings.deleteEntry, confirmLabel: t.common.delete, cancelLabel: t.common.cancel, destructive: true });
    if (ok && commit((d) => deleteSavingsTransaction(d, id))) toast.success(t.savings.entryDeleted);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="tabular text-4xl font-semibold tracking-tight">{money(balance)}</p>
        {goal.targetAmount && <p className="tabular mt-1 text-sm text-muted-foreground">{t.savings.of(money(goal.targetAmount))}</p>}
        {progress !== null && <ProgressBar value={progress} barClassName={COLOR_STYLES[goal.color].bar} className="mt-3" label={`${Math.round(progress * 100)}%`} />}
      </div>

      {mode ? (
        <form onSubmit={submit} noValidate className="space-y-3 rounded-3xl bg-muted/50 p-4">
          <Field label={mode === "withdraw" ? t.savings.withdraw : t.savings.addMoney} htmlFor="savings-amount" error={error}>
            <MoneyInput id="savings-amount" value={amount} onValueChange={setAmount} autoFocus />
          </Field>
          <Field label={t.savings.note} htmlFor="savings-note" hint={t.common.optional}>
            <Input id="savings-note" value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setMode(null)} aria-label={t.common.cancel} className="w-12 px-0">
              <X className="h-5 w-5" />
            </Button>
            <Button type="submit" className="flex-1">
              {mode === "withdraw" ? t.savings.withdraw : t.savings.addMoney}
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => setMode("deposit")}>
            <Plus className="h-4 w-4" /> {t.savings.addMoney}
          </Button>
          <Button variant="secondary" onClick={() => setMode("withdraw")}>
            <Minus className="h-4 w-4" /> {t.savings.withdraw}
          </Button>
        </div>
      )}

      <section aria-label={t.savings.history}>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">{t.savings.history}</h3>
        <ul className="divide-y divide-border">
          {goal.initialAmount > 0 && (
            <li className="flex items-center justify-between py-2.5 text-sm">
              <span>{t.savings.initial}</span>
              <span className="tabular font-medium">{money(goal.initialAmount)}</span>
            </li>
          )}
          {contributions.map((c) => (
            <li key={c.id} className="flex items-center gap-2 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate">{label(c)}</span>
                {c.source !== "budget" && <span className="block text-xs text-muted-foreground">{formatShortDate(c.date, locale)}</span>}
              </span>
              <span className={c.amount < 0 ? "tabular font-medium text-danger" : "tabular font-medium text-positive"}>{money(c.amount, { signed: true })}</span>
              {c.savingsTransactionId && (
                <button
                  type="button"
                  onClick={() => removeEntry(c.savingsTransactionId!)}
                  aria-label={t.savings.deleteEntry}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
          {contributions.length === 0 && goal.initialAmount === 0 && <li className="py-3 text-sm text-muted-foreground">{t.savings.noHistory}</li>}
        </ul>
      </section>

      <div className="flex gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={() => onEdit(goal)} className="flex-1">
          <Pencil className="h-4 w-4" /> {t.common.edit}
        </Button>
        <Button variant="danger" onClick={removeGoal} className="flex-1">
          <Trash2 className="h-4 w-4" /> {t.common.delete}
        </Button>
      </div>
    </div>
  );
}
