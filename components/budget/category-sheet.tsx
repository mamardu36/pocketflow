"use client";

import { Trash2, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Field, Input, Select } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { CATEGORY_TYPES } from "@/constants/categories";
import { useUndoableDelete } from "@/hooks/use-undoable-delete";
import { useApp, useMoney, useT } from "@/hooks/use-app";
import { calculateAssignedMoney } from "@/lib/calculations/budget";
import { addCategory, createSavingsGoal, deleteCategory, updateCategory } from "@/lib/domain/actions";
import { centsToInput, parseMoneyInput } from "@/lib/money";
import type { BudgetCategory, CategoryColor, CategoryType, MonthlyBudget } from "@/types";

interface CategorySheetProps {
  open: boolean;
  onClose: () => void;
  budget: MonthlyBudget;
  category?: BudgetCategory | null;
  defaultType?: CategoryType;
  onDeleted?: () => void;
}

export function CategorySheet(props: CategorySheetProps) {
  const t = useT();
  return (
    <Sheet open={props.open} onClose={props.onClose} title={props.category ? t.category.editTitle : t.category.new} closeLabel={t.common.close}>
      {props.open && <CategoryForm key={props.category?.id ?? props.defaultType ?? "new"} {...props} />}
    </Sheet>
  );
}

const NEW_GOAL = "__new__";

function CategoryForm({ onClose, budget, category, defaultType = "variable", onDeleted }: CategorySheetProps) {
  const t = useT();
  const money = useMoney();
  const deleteWithUndo = useUndoableDelete();
  const { data, commit } = useApp();

  const [name, setName] = useState(category?.name ?? "");
  const [emoji, setEmoji] = useState(category?.emoji ?? (defaultType === "savings" ? "🐷" : defaultType === "fixed" ? "🧾" : "📦"));
  const [type, setType] = useState<CategoryType>(category?.type ?? defaultType);
  const [color, setColor] = useState<CategoryColor>(category?.color ?? (defaultType === "savings" ? "teal" : "slate"));
  const [amount, setAmount] = useState(category ? centsToInput(category.assigned) : "");
  const [recurring, setRecurring] = useState(category?.recurring ?? defaultType === "fixed");
  const [goalId, setGoalId] = useState(category?.savingsGoalId ?? NEW_GOAL);
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});

  const others = data.categories.filter((c) => c.budgetId === budget.id && c.id !== category?.id);
  const parsed = amount.trim() === "" ? 0 : parseMoneyInput(amount);
  const leftAfter = budget.amount - calculateAssignedMoney(others) - (parsed ?? 0);
  const hasExpenses = category ? data.transactions.some((tx) => tx.categoryId === category.id) : false;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!name.trim()) nextErrors.name = t.category.nameRequired;
    if (parsed === null) nextErrors.amount = t.category.invalidAmount;
    if (type === "savings" && hasExpenses) nextErrors.name = t.category.savingsHasExpenses;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || parsed === null) return;

    const ok = commit((d) => {
      let next = d;
      let savingsGoalId: string | null = null;
      if (type === "savings") {
        if (goalId === NEW_GOAL || !d.savingsGoals.some((g) => g.id === goalId)) {
          const created = createSavingsGoal(next, { name: name.trim(), emoji, color, targetAmount: null, initialAmount: 0, targetDate: null });
          next = created.data;
          savingsGoalId = created.goal.id;
        } else {
          savingsGoalId = goalId;
        }
      }
      const draft = { name: name.trim(), emoji, type, color, assigned: parsed, recurring, savingsGoalId };
      return category ? updateCategory(next, category.id, draft) : addCategory(next, budget.id, draft);
    });
    if (!ok) return;
    toast.success(category ? t.category.saved : t.category.created, leftAfter < 0 ? { description: t.category.overWarning(money(-leftAfter)) } : undefined);
    onClose();
  };

  const remove = () => {
    if (!category) return;
    if (!deleteWithUndo((d) => deleteCategory(d, category.id), t.category.deleted)) return;
    onClose();
    onDeleted?.();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Segmented
        label={t.category.type}
        value={type}
        onChange={(v) => {
          setType(v);
          if (v === "fixed" && !category) setRecurring(true);
        }}
        options={CATEGORY_TYPES.map((v) => ({ value: v, label: t.categoryTypeShort[v], disabled: v === "savings" && hasExpenses }))}
      />

      <Field label={t.category.name} htmlFor="category-name" error={errors.name}>
        <Input id="category-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} data-autofocus={category ? undefined : true} autoComplete="off" />
      </Field>

      <Field label={t.category.budget} htmlFor="category-amount" error={errors.amount}>
        <MoneyInput id="category-amount" value={amount} onValueChange={setAmount} />
      </Field>

      <div
        className={leftAfter < 0 ? "flex items-start gap-2 rounded-2xl bg-danger/10 px-3 py-2.5 text-sm text-danger" : "px-1 text-sm text-muted-foreground"}
        role={leftAfter < 0 ? "alert" : undefined}
      >
        {leftAfter < 0 ? (
          <>
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {t.category.overWarning(money(-leftAfter))}
          </>
        ) : (
          t.category.leftAfter(money(leftAfter))
        )}
      </div>

      {type === "savings" && (
        <Field label={t.category.goal} htmlFor="category-goal">
          <Select id="category-goal" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            {data.savingsGoals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.emoji} {g.name}
              </option>
            ))}
            <option value={NEW_GOAL}>{t.category.newGoal}</option>
          </Select>
        </Field>
      )}

      {type !== "savings" && (
        <Switch id="category-recurring" checked={recurring} onChange={setRecurring} label={t.category.recurringLabel} hint={t.category.recurringHint} />
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">{t.category.icon}</p>
        <EmojiPicker value={emoji} onChange={setEmoji} label={t.category.icon} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t.category.color}</p>
        <ColorPicker value={color} onChange={setColor} label={t.category.color} />
      </div>

      <div className="flex gap-2 pt-1">
        {category && (
          <Button variant="danger" size="lg" onClick={remove} aria-label={t.common.delete} className="w-14 px-0">
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
        <Button type="submit" size="lg" className="flex-1">
          {t.common.save}
        </Button>
      </div>
    </form>
  );
}
