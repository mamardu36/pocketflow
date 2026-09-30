"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Field, Input } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Sheet } from "@/components/ui/sheet";
import { useApp, useT } from "@/hooks/use-app";
import { createSavingsGoal, updateSavingsGoal } from "@/lib/domain/actions";
import { isValidISODate } from "@/lib/dates";
import { centsToInput, parseMoneyInput } from "@/lib/money";
import type { CategoryColor, SavingsGoal } from "@/types";

export function GoalFormSheet({ open, onClose, goal }: { open: boolean; onClose: () => void; goal?: SavingsGoal | null }) {
  const t = useT();
  return (
    <Sheet open={open} onClose={onClose} title={goal ? t.savings.editGoal : t.savings.newGoal} closeLabel={t.common.close}>
      {open && <GoalForm goal={goal} onClose={onClose} />}
    </Sheet>
  );
}

function GoalForm({ goal, onClose }: { goal?: SavingsGoal | null; onClose: () => void }) {
  const t = useT();
  const { commit } = useApp();
  const [name, setName] = useState(goal?.name ?? "");
  const [emoji, setEmoji] = useState(goal?.emoji ?? "🐷");
  const [color, setColor] = useState<CategoryColor>(goal?.color ?? "teal");
  const [target, setTarget] = useState(goal?.targetAmount ? centsToInput(goal.targetAmount) : "");
  const [initial, setInitial] = useState(goal ? centsToInput(goal.initialAmount) : "");
  const [date, setDate] = useState(goal?.targetDate ?? "");
  const [errors, setErrors] = useState<{ name?: string; target?: string; initial?: string }>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const targetCents = target.trim() ? parseMoneyInput(target) : null;
    const initialCents = initial.trim() ? parseMoneyInput(initial) : 0;
    const next: typeof errors = {};
    if (!name.trim()) next.name = t.savings.nameRequired;
    if (target.trim() && (targetCents === null || targetCents <= 0)) next.target = t.savings.invalidAmount;
    if (initialCents === null) next.initial = t.savings.invalidAmount;
    setErrors(next);
    if (Object.keys(next).length > 0 || initialCents === null) return;

    const draft = { name: name.trim(), emoji, color, targetAmount: targetCents, initialAmount: initialCents, targetDate: isValidISODate(date) ? date : null };
    const ok = commit((d) => (goal ? updateSavingsGoal(d, goal.id, draft) : createSavingsGoal(d, draft).data));
    if (ok) {
      toast.success(goal ? t.savings.goalSaved : t.savings.goalCreated);
      onClose();
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label={t.savings.goalName} htmlFor="goal-name" error={errors.name}>
        <Input id="goal-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} data-autofocus autoComplete="off" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.savings.target} htmlFor="goal-target" error={errors.target} hint={t.common.optional}>
          <MoneyInput id="goal-target" value={target} onValueChange={setTarget} />
        </Field>
        <Field label={t.savings.alreadySaved} htmlFor="goal-initial" error={errors.initial}>
          <MoneyInput id="goal-initial" value={initial} onValueChange={setInitial} />
        </Field>
      </div>
      <Field label={t.savings.targetDate} htmlFor="goal-date" hint={t.common.optional}>
        <Input id="goal-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-medium">{t.category.icon}</p>
        <EmojiPicker value={emoji} onChange={setEmoji} label={t.category.icon} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">{t.category.color}</p>
        <ColorPicker value={color} onChange={setColor} label={t.category.color} />
      </div>
      <Button type="submit" size="lg" className="w-full">
        {goal ? t.common.save : t.savings.createGoal}
      </Button>
    </form>
  );
}
