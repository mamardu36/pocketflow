import { sumCents } from "@/lib/calculations/budget";
import { firstDayOfMonth } from "@/lib/dates";
import type { BudgetCategory, Cents, MonthKey, MonthlyBudget, SavingsGoal, SavingsTransaction } from "@/types";

export interface SavingsLedger {
  budgets: readonly MonthlyBudget[];
  categories: readonly BudgetCategory[];
  savingsTransactions: readonly SavingsTransaction[];
}

export type ContributionSource = "budget" | "manual" | "unused";

export interface SavingsContribution {
  id: string;
  goalId: string | null;
  amount: Cents;
  date: string;
  monthKey: MonthKey;
  source: ContributionSource;
  note: string;
  /** Present for manual/unused entries (deletable). */
  savingsTransactionId: string | null;
}

/**
 * Savings balance is derived, never reset:
 * initial amount + monthly savings allocations + manual deposits/withdrawals + unused money moved at month end.
 */
export function getSavingsContributions(ledger: SavingsLedger, goalId?: string | null): SavingsContribution[] {
  const budgetById = new Map(ledger.budgets.map((b) => [b.id, b]));
  const fromBudget: SavingsContribution[] = ledger.categories
    .filter((c) => c.type === "savings" && c.assigned > 0)
    .flatMap((c) => {
      const budget = budgetById.get(c.budgetId);
      if (!budget) return [];
      const monthKey = { year: budget.year, month: budget.month };
      return [{
        id: `alloc-${c.id}`,
        goalId: c.savingsGoalId,
        amount: c.assigned,
        date: firstDayOfMonth(monthKey),
        monthKey,
        source: "budget" as const,
        note: c.name,
        savingsTransactionId: null,
      }];
    });
  const manual: SavingsContribution[] = ledger.savingsTransactions.map((s) => {
    const [year, month] = s.date.split("-").map(Number);
    return {
      id: s.id,
      goalId: s.goalId,
      amount: s.amount,
      date: s.date,
      monthKey: { year, month },
      source: s.source,
      note: s.note,
      savingsTransactionId: s.id,
    };
  });
  const all = [...fromBudget, ...manual];
  const filtered = goalId === undefined ? all : all.filter((c) => c.goalId === goalId);
  return filtered.sort((a, b) => b.date.localeCompare(a.date));
}

export function calculateGoalBalance(goal: SavingsGoal, ledger: SavingsLedger): Cents {
  return goal.initialAmount + sumCents(getSavingsContributions(ledger, goal.id).map((c) => c.amount));
}

/** Includes money allocated to savings categories not linked to any goal. */
export function calculateSavingsTotal(goals: readonly SavingsGoal[], ledger: SavingsLedger): Cents {
  const initial = sumCents(goals.map((g) => g.initialAmount));
  return initial + sumCents(getSavingsContributions(ledger).map((c) => c.amount));
}

export function calculateGoalProgress(balance: Cents, target: Cents | null): number | null {
  if (!target || target <= 0) return null;
  return Math.min(1, Math.max(0, balance / target));
}

export interface MonthlySavingsEntry {
  monthKey: MonthKey;
  amount: Cents;
}

/** Net savings added per month, newest first. */
export function calculateMonthlySavingsHistory(ledger: SavingsLedger, goalId?: string): MonthlySavingsEntry[] {
  const byMonth = new Map<string, MonthlySavingsEntry>();
  for (const c of getSavingsContributions(ledger, goalId)) {
    const key = `${c.monthKey.year}-${c.monthKey.month}`;
    const entry = byMonth.get(key) ?? { monthKey: c.monthKey, amount: 0 };
    entry.amount += c.amount;
    byMonth.set(key, entry);
  }
  return [...byMonth.values()].sort(
    (a, b) => b.monthKey.year * 12 + b.monthKey.month - (a.monthKey.year * 12 + a.monthKey.month),
  );
}
