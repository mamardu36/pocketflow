/**
 * Pure state transitions. Every action takes AppData and returns a new AppData,
 * keeping untouched records by reference so repositories can diff cheaply.
 */
import { newBudget, newCategory, newSavingsGoal, newSavingsTransaction, newTransaction } from "@/lib/domain/factories";
import { findBudget, findTemplateBudget, getCategoriesForBudget } from "@/lib/domain/selectors";
import { nowISO } from "@/lib/utils";
import type {
  AppData, BudgetCategory, CategoryDraft, Cents, MonthKey, MonthlyBudget, SavingsGoal, SavingsGoalDraft,
  SavingsTransaction, Transaction, TransactionDraft, UserPreferences,
} from "@/types";

function touch<T extends { updatedAt: string }>(item: T, patch: Partial<NoInfer<T>>): T {
  return { ...item, ...patch, updatedAt: nowISO() };
}

function nextSortOrder(items: readonly { sortOrder: number }[]): number {
  return items.reduce((max, i) => Math.max(max, i.sortOrder), -1) + 1;
}

export interface CreateMonthInput {
  key: MonthKey;
  amount: Cents;
  /**
   * Recurring categories always keep their amount.
   * When true, non-recurring categories keep last month's amount too; otherwise they start at 0.
   */
  reuseAmounts: boolean;
  /** Used when there is no previous month to copy (first month). */
  seedCategories?: CategoryDraft[];
}

export function createMonthBudget(data: AppData, input: CreateMonthInput): AppData {
  if (findBudget(data, input.key)) return data;
  const template = findTemplateBudget(data, input.key);
  const budget = newBudget(input.key, input.amount);

  const drafts: CategoryDraft[] = template
    ? getCategoriesForBudget(data, template.id).map((c) => ({
        name: c.name,
        emoji: c.emoji,
        type: c.type,
        color: c.color,
        recurring: c.recurring,
        savingsGoalId: c.savingsGoalId && data.savingsGoals.some((g) => g.id === c.savingsGoalId) ? c.savingsGoalId : null,
        assigned: c.recurring || input.reuseAmounts ? c.assigned : 0,
      }))
    : input.seedCategories ?? [];

  const categories = drafts.map((d, i) => newCategory(budget.id, d, i));
  return { ...data, budgets: [...data.budgets, budget], categories: [...data.categories, ...categories] };
}

export function updateBudget(data: AppData, budgetId: string, patch: Partial<Pick<MonthlyBudget, "amount" | "reviewedAt">>): AppData {
  return { ...data, budgets: data.budgets.map((b) => (b.id === budgetId ? touch(b, patch) : b)) };
}

export function addCategory(data: AppData, budgetId: string, draft: CategoryDraft): AppData {
  const siblings = data.categories.filter((c) => c.budgetId === budgetId && c.type === draft.type);
  return { ...data, categories: [...data.categories, newCategory(budgetId, draft, nextSortOrder(siblings))] };
}

export function updateCategory(data: AppData, categoryId: string, patch: Partial<CategoryDraft>): AppData {
  return {
    ...data,
    categories: data.categories.map((c) => {
      if (c.id !== categoryId) return c;
      const next = touch(c, patch as Partial<BudgetCategory>);
      if (next.type !== "savings") next.savingsGoalId = null;
      return next;
    }),
  };
}

/** Deletes the category and its transactions (only in that month). */
export function deleteCategory(data: AppData, categoryId: string): AppData {
  return {
    ...data,
    categories: data.categories.filter((c) => c.id !== categoryId),
    transactions: data.transactions.filter((t) => t.categoryId !== categoryId),
  };
}

export function addTransaction(data: AppData, draft: TransactionDraft): AppData {
  const category = data.categories.find((c) => c.id === draft.categoryId);
  if (!category) throw new Error("Category not found.");
  if (category.type === "savings") throw new Error("Expenses can't be added to a savings category.");
  if (draft.amount <= 0) throw new Error("Amount must be greater than zero.");
  return { ...data, transactions: [...data.transactions, newTransaction(category.budgetId, draft)] };
}

export function updateTransaction(data: AppData, transactionId: string, patch: Partial<TransactionDraft>): AppData {
  const category = patch.categoryId ? data.categories.find((c) => c.id === patch.categoryId) : null;
  if (patch.categoryId && !category) throw new Error("Category not found.");
  return {
    ...data,
    transactions: data.transactions.map((t) =>
      t.id === transactionId
        ? touch<Transaction>(t, { ...patch, ...(category ? { budgetId: category.budgetId } : {}) })
        : t,
    ),
  };
}

export function deleteTransaction(data: AppData, transactionId: string): AppData {
  return { ...data, transactions: data.transactions.filter((t) => t.id !== transactionId) };
}

export function addSavingsGoal(data: AppData, goal: SavingsGoal): AppData {
  return { ...data, savingsGoals: [...data.savingsGoals, goal] };
}

export function createSavingsGoal(data: AppData, draft: SavingsGoalDraft): { data: AppData; goal: SavingsGoal } {
  const goal = newSavingsGoal(draft, nextSortOrder(data.savingsGoals));
  return { data: addSavingsGoal(data, goal), goal };
}

export function updateSavingsGoal(data: AppData, goalId: string, patch: Partial<SavingsGoalDraft>): AppData {
  return { ...data, savingsGoals: data.savingsGoals.map((g) => (g.id === goalId ? touch(g, patch) : g)) };
}

/** Removes the goal and its manual entries. Monthly allocations stay in history, unlinked. */
export function deleteSavingsGoal(data: AppData, goalId: string): AppData {
  return {
    ...data,
    savingsGoals: data.savingsGoals.filter((g) => g.id !== goalId),
    savingsTransactions: data.savingsTransactions.filter((s) => s.goalId !== goalId),
    categories: data.categories.map((c) => (c.savingsGoalId === goalId ? touch(c, { savingsGoalId: null }) : c)),
  };
}

export function addSavingsTransaction(
  data: AppData,
  input: Pick<SavingsTransaction, "goalId" | "amount" | "date" | "note"> & Partial<Pick<SavingsTransaction, "source" | "budgetId">>,
): AppData {
  if (input.amount === 0) throw new Error("Amount can't be zero.");
  if (!data.savingsGoals.some((g) => g.id === input.goalId)) throw new Error("Savings goal not found.");
  const tx = newSavingsTransaction({ source: "manual", budgetId: null, ...input });
  return { ...data, savingsTransactions: [...data.savingsTransactions, tx] };
}

export function deleteSavingsTransaction(data: AppData, id: string): AppData {
  return { ...data, savingsTransactions: data.savingsTransactions.filter((s) => s.id !== id) };
}

/** Month-end helper: moves unused money of a month into a goal and marks the month reviewed. */
export function moveUnusedToSavings(data: AppData, budgetId: string, goalId: string, amount: Cents, date: string, note: string): AppData {
  if (amount <= 0) throw new Error("There is no unused money to move.");
  const withTx = addSavingsTransaction(data, { goalId, amount, date, note, source: "unused", budgetId });
  return updateBudget(withTx, budgetId, { reviewedAt: nowISO() });
}

export function markBudgetReviewed(data: AppData, budgetId: string): AppData {
  return updateBudget(data, budgetId, { reviewedAt: nowISO() });
}

export function updatePreferences(data: AppData, patch: Partial<Omit<UserPreferences, "updatedAt">>): AppData {
  return { ...data, preferences: { ...data.preferences, ...patch, updatedAt: nowISO() } };
}

/** Adds a starter set (Rent, Groceries, Transport, Going out + a linked savings goal) with 0 assigned. */
export function addSuggestedCategories(data: AppData, budgetId: string, suggestions: readonly Omit<CategoryDraft, "assigned">[]): AppData {
  let next = data;
  for (const s of suggestions) {
    let savingsGoalId: string | null = null;
    if (s.type === "savings") {
      const existing = next.savingsGoals.find((g) => g.name.toLowerCase() === s.name.toLowerCase());
      if (existing) savingsGoalId = existing.id;
      else {
        const created = createSavingsGoal(next, { name: s.name, emoji: s.emoji, color: s.color, targetAmount: null, initialAmount: 0, targetDate: null });
        next = created.data;
        savingsGoalId = created.goal.id;
      }
    }
    next = addCategory(next, budgetId, { ...s, assigned: 0, savingsGoalId });
  }
  return next;
}
