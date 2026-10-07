import type { AppData, BudgetCategory } from "@/types";

/** "  CARREFOUR  City " → "carrefour city" */
export function normalizeDescription(text: string): string {
  return text.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

interface PastExpense {
  description: string;
  categoryName: string;
  categoryId: string;
}

/**
 * Past descriptions, most recent first, one per description.
 * Expenses saved without a description store the category name: those are skipped.
 */
export function getPastExpenses(data: AppData): PastExpense[] {
  const categories = new Map(data.categories.map((c) => [c.id, c]));
  const sorted = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const seen = new Set<string>();
  const result: PastExpense[] = [];
  for (const tx of sorted) {
    const category = categories.get(tx.categoryId);
    const key = normalizeDescription(tx.description);
    if (!category || !key || seen.has(key) || key === normalizeDescription(category.name)) continue;
    seen.add(key);
    result.push({ description: tx.description.trim(), categoryName: category.name, categoryId: category.id });
  }
  return result;
}

/** For the description field's autocomplete. */
export function getRecentDescriptions(data: AppData, limit = 50): string[] {
  return getPastExpenses(data).slice(0, limit).map((p) => p.description);
}

/**
 * The category used last time for this description, among the categories of the month being edited.
 * Exact match first; otherwise a past description starting with what was typed (3+ characters).
 * Categories belong to a month, so a past category is matched by id, then by name.
 */
export function guessCategory(data: AppData, description: string, available: readonly BudgetCategory[]): BudgetCategory | null {
  const typed = normalizeDescription(description);
  if (typed.length < 2) return null;
  const past = getPastExpenses(data);
  const match =
    past.find((p) => normalizeDescription(p.description) === typed) ??
    (typed.length >= 3 ? past.find((p) => normalizeDescription(p.description).startsWith(typed)) : undefined);
  if (!match) return null;
  return (
    available.find((c) => c.id === match.categoryId) ??
    available.find((c) => normalizeDescription(c.name) === normalizeDescription(match.categoryName)) ??
    null
  );
}
