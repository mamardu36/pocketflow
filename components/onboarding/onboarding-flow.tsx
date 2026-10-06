"use client";

import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { ONBOARDING_SUGGESTIONS } from "@/constants/categories";
import { useApp, useMoney, useT } from "@/hooks/use-app";
import { calculateUnassignedMoney } from "@/lib/calculations/budget";
import { getCurrentMonthKey } from "@/lib/dates";
import { createMonthBudget, createSavingsGoal } from "@/lib/domain/actions";
import { createEmptyData } from "@/lib/domain/factories";
import { parseMoneyInput } from "@/lib/money";
import { cn, createId, errorMessage } from "@/lib/utils";
import { localizeName, type Messages } from "@/lib/i18n";
import type { AppData, CategoryColor, CategoryDraft, CategoryType, LanguageCode } from "@/types";

interface DraftItem {
  key: string;
  name: string;
  emoji: string;
  type: CategoryType;
  color: CategoryColor;
  recurring: boolean;
  selected: boolean;
  amount: string;
}

const initialItems = (t: Messages): DraftItem[] =>
  ONBOARDING_SUGGESTIONS.map((s) => ({ ...s, name: localizeName(s.name, t), key: createId(), selected: true, amount: "" }));

/** Builds the guest's first data set: one month, selected categories, and a goal per savings category. */
function buildInitialData(amount: number, items: DraftItem[], language: LanguageCode): AppData {
  let data = createEmptyData(language);
  const drafts: CategoryDraft[] = [];
  for (const item of items) {
    const draft: CategoryDraft = {
      name: item.name.trim(),
      emoji: item.emoji,
      type: item.type,
      color: item.color,
      recurring: item.recurring,
      assigned: parseMoneyInput(item.amount) ?? 0,
    };
    if (item.type === "savings") {
      const created = createSavingsGoal(data, {
        name: draft.name, emoji: item.emoji, color: item.color, targetAmount: null, initialAmount: 0, targetDate: null,
      });
      data = created.data;
      draft.savingsGoalId = created.goal.id;
    }
    drafts.push(draft);
  }
  return createMonthBudget(data, { key: getCurrentMonthKey(), amount, reuseAmounts: true, seedCategories: drafts });
}

export function OnboardingFlow() {
  const t = useT();
  const money = useMoney();
  const router = useRouter();
  const { startGuest, data: appData } = useApp();
  const [step, setStep] = useState<1 | 2>(1);
  const [amountInput, setAmountInput] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [items, setItems] = useState<DraftItem[]>(() => initialItems(t));
  const [customName, setCustomName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const amount = parseMoneyInput(amountInput) ?? 0;
  const selected = items.filter((i) => i.selected);
  const left = useMemo(
    () => calculateUnassignedMoney(amount, selected.map((i) => ({ assigned: parseMoneyInput(i.amount) ?? 0 }))),
    [amount, selected],
  );

  const update = (key: string, patch: Partial<DraftItem>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const submitAmount = (e: FormEvent) => {
    e.preventDefault();
    const cents = parseMoneyInput(amountInput);
    if (cents === null || cents <= 0) return setAmountError(t.category.invalidAmount);
    setAmountError(null);
    setStep(2);
  };

  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    setItems((list) => [
      ...list,
      { key: createId(), name, emoji: "📦", type: "variable", color: "slate", recurring: false, selected: true, amount: "" },
    ]);
    setCustomName("");
  };

  const finish = async () => {
    if (selected.some((i) => !i.name.trim())) return setError(t.category.nameRequired);
    if (selected.some((i) => i.amount.trim() !== "" && parseMoneyInput(i.amount) === null)) return setError(t.category.invalidAmount);
    setError(null);
    setBusy(true);
    try {
      await startGuest(buildInitialData(amount, selected, appData.preferences.language));
      router.replace("/");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="mb-6 flex items-center gap-2">
        <button
          type="button"
          onClick={() => (step === 2 ? setStep(1) : router.push("/welcome"))}
          aria-label={t.common.back}
          className="-ml-2 grid h-11 w-11 place-items-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="text-sm text-muted-foreground">{t.onboarding.step(step, 2)}</p>
        <div className="ml-auto flex gap-1" aria-hidden>
          {[1, 2].map((n) => (
            <span key={n} className={cn("h-1.5 w-6 rounded-full transition", n <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
      </div>

      {step === 1 ? (
        <form onSubmit={submitAmount} noValidate className="flex flex-1 flex-col animate-fade-in">
          <h1 className="text-3xl font-semibold tracking-tight">{t.onboarding.amountTitle}</h1>
          <p className="mt-2 text-muted-foreground">{t.onboarding.amountHint}</p>
          <Field label={t.dashboard.monthlyBudget} htmlFor="onb-amount" error={amountError} className="mt-8">
            <MoneyInput id="onb-amount" size="xl" value={amountInput} onValueChange={setAmountInput} autoFocus />
          </Field>
          <div className="mt-auto pt-8">
            <Button type="submit" size="lg" className="w-full">
              {t.common.continue}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-1 flex-col animate-fade-in">
          <h1 className="text-3xl font-semibold tracking-tight">{t.onboarding.categoriesTitle}</h1>
          <p className="mt-2 text-muted-foreground">{t.onboarding.categoriesHint}</p>

          <div
            className={cn(
              "sticky top-2 z-10 mt-5 flex items-baseline justify-between rounded-2xl px-4 py-3 shadow-soft",
              left < 0 ? "bg-danger/10 text-danger" : "bg-hero text-hero-foreground",
            )}
            aria-live="polite"
          >
            <span className="text-sm opacity-80">{left < 0 ? t.dashboard.overAssigned(money(-left)) : t.dashboard.leftToAssign}</span>
            <span className="tabular text-2xl font-semibold">{money(left)}</span>
          </div>

          <ul className="mt-4 space-y-2.5">
            {items.map((item) => (
              <li
                key={item.key}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border border-border bg-card p-2.5 transition",
                  !item.selected && "opacity-50",
                )}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={item.selected}
                  aria-label={t.onboarding.include(item.name || t.category.new)}
                  onClick={() => update(item.key, { selected: !item.selected })}
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    item.selected ? "bg-primary/10" : "bg-muted",
                  )}
                >
                  {item.selected ? <Check className="h-5 w-5 text-primary" aria-hidden /> : <span aria-hidden className="grayscale">{item.emoji}</span>}
                </button>
                <div className="min-w-0 flex-1">
                  <input
                    aria-label={t.onboarding.nameFor}
                    value={item.name}
                    onChange={(e) => update(item.key, { name: e.target.value })}
                    disabled={!item.selected}
                    className="h-8 w-full rounded-lg bg-transparent px-1 font-medium focus:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <p className="px-1 text-xs text-muted-foreground">
                    {item.emoji} {t.categoryTypeShort[item.type]}
                  </p>
                </div>
                <MoneyInput
                  aria-label={t.onboarding.amountFor(item.name)}
                  value={item.amount}
                  onValueChange={(v) => update(item.key, { amount: v })}
                  disabled={!item.selected}
                  className="w-28 shrink-0"
                />
                <button
                  type="button"
                  onClick={() => setItems((list) => list.filter((i) => i.key !== item.key))}
                  aria-label={t.onboarding.remove(item.name)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex gap-2">
            <Input
              aria-label={t.onboarding.customPlaceholder}
              placeholder={t.onboarding.customPlaceholder}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addCustom} disabled={!customName.trim()}>
              <Plus className="h-4 w-4" aria-hidden />
              {t.onboarding.addCustom}
            </Button>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-2xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="mt-auto pt-8">
            <Button size="lg" className="w-full" onClick={finish} disabled={busy}>
              {t.onboarding.finish}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
