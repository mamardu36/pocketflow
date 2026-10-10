"use client";

import { Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Field, Input } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { useUndoable } from "@/hooks/use-undoable";
import { useApp, useDateLocale, useMoney, useT } from "@/hooks/use-app";
import { addTransaction, deleteTransaction, updateTransaction } from "@/lib/domain/actions";
import { buildMonthView } from "@/lib/domain/selectors";
import { getRecentDescriptions, guessCategory } from "@/lib/domain/suggestions";
import { defaultDateForMonth, firstDayOfMonth, formatMonthLabel, isDateInMonth, lastDayOfMonth } from "@/lib/dates";
import { centsToInput, parseMoneyInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { MonthKey, Transaction } from "@/types";

interface AddExpenseFormProps {
  month: MonthKey;
  transaction?: Transaction;
  defaultCategoryId?: string;
  onDone: () => void;
}

export function AddExpenseForm({ month, transaction, defaultCategoryId, onDone }: AddExpenseFormProps) {
  const t = useT();
  const money = useMoney();
  const locale = useDateLocale();
  const deleteWithUndo = useUndoable();
  const { data, commit } = useApp();

  const view = useMemo(() => buildMonthView(data, month), [data, month]);
  const categories = (view?.categories ?? []).filter((c) => c.type !== "savings");

  const [amount, setAmount] = useState(transaction ? centsToInput(transaction.amount) : "");
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? defaultCategoryId ?? "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [date, setDate] = useState(transaction?.date ?? defaultDateForMonth(month));
  const [errors, setErrors] = useState<{ amount?: string; category?: string; date?: string }>({});
  // Once the person picks a category themselves, we never override it.
  const [categoryTouched, setCategoryTouched] = useState(Boolean(transaction || defaultCategoryId));
  const [suggested, setSuggested] = useState(false);
  const recentDescriptions = useMemo(() => getRecentDescriptions(data), [data]);

  const onDescriptionChange = (value: string) => {
    setDescription(value);
    if (categoryTouched) return;
    const guess = guessCategory(data, value, categories);
    if (guess) {
      setCategoryId(guess.id);
      setSuggested(true);
    } else if (suggested) {
      setCategoryId("");
      setSuggested(false);
    }
  };

  const pickCategory = (id: string) => {
    setCategoryId(id);
    setCategoryTouched(true);
    setSuggested(false);
  };

  const monthLabel = formatMonthLabel(month, locale);

  if (!view) return <p className="py-6 text-center text-muted-foreground">{t.expense.noBudget}</p>;
  if (categories.length === 0) return <p className="py-6 text-center text-muted-foreground">{t.expense.noCategories}</p>;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cents = parseMoneyInput(amount);
    const nextErrors: typeof errors = {};
    if (cents === null || cents <= 0) nextErrors.amount = t.expense.invalidAmount;
    if (!categories.some((c) => c.id === categoryId)) nextErrors.category = t.expense.categoryRequired;
    if (!isDateInMonth(date, month)) nextErrors.date = t.expense.dateOutOfMonth(monthLabel);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || cents === null) return;

    const category = categories.find((c) => c.id === categoryId)!;
    const draft = { amount: cents, categoryId, description: description.trim() || category.name, date };
    const ok = commit((d) => (transaction ? updateTransaction(d, transaction.id, draft) : addTransaction(d, draft)));
    if (!ok) return;

    // Adding an expense is the one place a notification is worth it: it tells what's left.
    if (!transaction) {
      toast.dismiss();
      const spentBefore = view.stats.get(category.id)?.spent ?? 0;
      const remaining = category.assigned - spentBefore - cents;
      toast.success(t.expense.added(`${money(cents)} · ${draft.description}`), {
        description: remaining >= 0 ? t.expense.leftIn(money(remaining), category.name) : t.expense.overIn(money(-remaining), category.name),
      });
    }
    onDone();
  };

  const remove = () => {
    if (!transaction) return;
    if (deleteWithUndo((d) => deleteTransaction(d, transaction.id), t.expense.deleted)) onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label={t.expense.amount} htmlFor="expense-amount" error={errors.amount}>
        <MoneyInput
          id="expense-amount"
          size="xl"
          value={amount}
          onValueChange={setAmount}
          data-autofocus
          aria-invalid={Boolean(errors.amount)}
          aria-describedby={errors.amount ? "expense-amount-error" : undefined}
        />
      </Field>

      <Field label={t.expense.description} htmlFor="expense-description">
        <Input
          id="expense-description"
          value={description}
          maxLength={80}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t.expense.descriptionPlaceholder}
          list={recentDescriptions.length > 0 ? "expense-descriptions" : undefined}
          autoComplete="off"
          enterKeyHint="done"
        />
        {recentDescriptions.length > 0 && (
          <datalist id="expense-descriptions">
            {recentDescriptions.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        )}
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{t.expense.category}</legend>
        <div role="radiogroup" aria-label={t.expense.category} className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const selected = c.id === categoryId;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => pickCategory(c.id)}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-2xl border pl-1.5 pr-3.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted",
                )}
              >
                <CategoryIcon emoji={c.emoji} color={c.color} size="sm" />
                {c.name}
              </button>
            );
          })}
        </div>
        {suggested && !errors.category && (
          <p role="status" className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t.expense.suggested}
          </p>
        )}
        {errors.category && <p role="alert" className="mt-1.5 text-sm text-danger">{errors.category}</p>}
      </fieldset>

      <Field label={t.expense.date} htmlFor="expense-date" error={errors.date}>
        <Input id="expense-date" type="date" value={date} min={firstDayOfMonth(month)} max={lastDayOfMonth(month)} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <div className="flex gap-2 pt-1">
        {transaction && (
          <Button variant="danger" size="lg" onClick={remove} aria-label={t.common.delete} className="w-14 px-0">
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
        <Button type="submit" size="lg" className="flex-1">
          {transaction ? t.expense.update : t.expense.submit}
        </Button>
      </div>
    </form>
  );
}
