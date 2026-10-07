import { diffData } from "@/lib/domain/diff";
import { nowISO } from "@/lib/utils";
import type { AppData } from "@/types";

/**
 * Builds the inverse of a deletion: given the state before and after, returns an updater
 * that puts back what was removed (records and goal links), without touching anything
 * changed in between. Records whose parent has disappeared since are skipped.
 */
export function buildUndo(prev: AppData, next: AppData): (current: AppData) => AppData {
  const diff = diffData(prev, next);
  const pick = <T extends { id: string }>(items: readonly T[], ids: string[]) => {
    const set = new Set(ids);
    return items.filter((i) => set.has(i.id));
  };
  const removed = {
    budgets: pick(prev.budgets, diff.budgets.deletes),
    categories: pick(prev.categories, diff.categories.deletes),
    transactions: pick(prev.transactions, diff.transactions.deletes),
    savingsGoals: pick(prev.savingsGoals, diff.savingsGoals.deletes),
    savingsTransactions: pick(prev.savingsTransactions, diff.savingsTransactions.deletes),
  };
  // Deleting a goal unlinks its savings categories: remember the links.
  const prevCategories = new Map(prev.categories.map((c) => [c.id, c]));
  const relinks = diff.categories.upserts
    .map((c) => ({ id: c.id, goalId: prevCategories.get(c.id)?.savingsGoalId ?? null, now: c.savingsGoalId }))
    .filter((l): l is { id: string; goalId: string; now: null } => l.goalId !== null && l.now === null);

  return (current) => {
    const has = <T extends { id: string }>(items: readonly T[]) => new Set(items.map((i) => i.id));
    const savingsGoals = [...current.savingsGoals, ...removed.savingsGoals.filter((g) => !has(current.savingsGoals).has(g.id))];
    const goalIds = has(savingsGoals);
    const budgets = [...current.budgets, ...removed.budgets.filter((b) => !has(current.budgets).has(b.id))];
    const budgetIds = has(budgets);

    const updatedAt = nowISO();
    const relinkMap = new Map(relinks.filter((l) => goalIds.has(l.goalId)).map((l) => [l.id, l.goalId]));
    const categories = [
      ...current.categories.map((c) =>
        relinkMap.has(c.id) && c.savingsGoalId === null ? { ...c, savingsGoalId: relinkMap.get(c.id)!, updatedAt } : c,
      ),
      ...removed.categories.filter((c) => budgetIds.has(c.budgetId) && !has(current.categories).has(c.id)),
    ];
    const categoryIds = has(categories);
    const transactions = [
      ...current.transactions,
      ...removed.transactions.filter(
        (t) => budgetIds.has(t.budgetId) && categoryIds.has(t.categoryId) && !has(current.transactions).has(t.id),
      ),
    ];
    const savingsTransactions = [
      ...current.savingsTransactions,
      ...removed.savingsTransactions.filter(
        (s) => goalIds.has(s.goalId) && (s.budgetId === null || budgetIds.has(s.budgetId)) && !has(current.savingsTransactions).has(s.id),
      ),
    ];
    return { ...current, budgets, categories, transactions, savingsGoals, savingsTransactions };
  };
}
