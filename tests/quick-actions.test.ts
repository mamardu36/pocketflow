import { describe, expect, it } from "vitest";
import {
  addSavingsTransaction, addTransaction, createMonthBudget, createSavingsGoal, deleteCategory, deleteSavingsGoal,
  deleteTransaction, updateCategory,
} from "@/lib/domain/actions";
import { buildMonthView, findBudget, getCategoriesForBudget } from "@/lib/domain/selectors";
import { getRecentDescriptions, guessCategory, normalizeDescription } from "@/lib/domain/suggestions";
import { buildUndo } from "@/lib/domain/undo";
import { SEPT_2026, categoryByName, sampleMonth, spend } from "./helpers";

const OCT = { year: 2026, month: 10 };
const octCategories = (data: ReturnType<typeof sampleMonth>) => getCategoriesForBudget(data, findBudget(data, OCT)!.id);

describe("category guessing", () => {
  const base = () => {
    let data = sampleMonth();
    data = spend(data, SEPT_2026, "Groceries", 3250, "2026-09-03");
    data = addTransaction(data, { categoryId: categoryByName(data, SEPT_2026, "Groceries").id, amount: 1000, description: "Carrefour City", date: "2026-09-05" });
    data = addTransaction(data, { categoryId: categoryByName(data, SEPT_2026, "Going out").id, amount: 1600, description: "Le Bistrot", date: "2026-09-06" });
    return data;
  };

  it("finds the category used last time for the same description", () => {
    const data = base();
    const sept = buildMonthView(data, SEPT_2026)!.categories;
    expect(guessCategory(data, "le bistrot", sept)?.name).toBe("Going out");
    expect(guessCategory(data, "  LE   BISTROT ", sept)?.name).toBe("Going out");
  });

  it("matches the beginning of a past description after 3 characters", () => {
    const data = base();
    const sept = buildMonthView(data, SEPT_2026)!.categories;
    expect(guessCategory(data, "carr", sept)?.name).toBe("Groceries");
    expect(guessCategory(data, "ca", sept)).toBeNull();
    expect(guessCategory(data, "Amazon", sept)).toBeNull();
  });

  it("maps last month's category to this month's one with the same name", () => {
    const data = createMonthBudget(base(), { key: OCT, amount: 100000, reuseAmounts: true });
    const guess = guessCategory(data, "Le Bistrot", octCategories(data));
    expect(guess?.name).toBe("Going out");
    expect(guess?.budgetId).toBe(findBudget(data, OCT)!.id);
  });

  it("follows the most recent choice when a description changed category", () => {
    let data = base();
    data = addTransaction(data, { categoryId: categoryByName(data, SEPT_2026, "Transport").id, amount: 500, description: "Le Bistrot", date: "2026-09-20" });
    expect(guessCategory(data, "Le Bistrot", buildMonthView(data, SEPT_2026)!.categories)?.name).toBe("Transport");
  });

  it("suggests past descriptions, ignoring auto-filled category names, without duplicates", () => {
    const data = base(); // the first expense was saved as "Groceries" (no description)
    expect(getRecentDescriptions(data)).toEqual(["Le Bistrot", "Carrefour City"]);
    expect(normalizeDescription("Épicerie  Crème")).toBe("epicerie creme");
  });
});

describe("undo", () => {
  it("restores a deleted expense", () => {
    const data = spend(sampleMonth(), SEPT_2026, "Groceries", 3250, "2026-09-03");
    const tx = data.transactions[0];
    const deleted = deleteTransaction(data, tx.id);
    const restored = buildUndo(data, deleted)(deleted);
    expect(restored.transactions).toEqual([tx]);
  });

  it("restores a category with its expenses, keeping changes made in between", () => {
    let data = spend(sampleMonth(), SEPT_2026, "Groceries", 3250, "2026-09-03");
    data = spend(data, SEPT_2026, "Transport", 200, "2026-09-04");
    const groceries = categoryByName(data, SEPT_2026, "Groceries");
    const deleted = deleteCategory(data, groceries.id);
    expect(deleted.transactions).toHaveLength(1);
    const later = spend(deleted, SEPT_2026, "Going out", 1600, "2026-09-05");
    const restored = buildUndo(data, deleted)(later);
    expect(restored.categories.find((c) => c.id === groceries.id)).toEqual(groceries);
    expect(restored.transactions).toHaveLength(3);
  });

  it("restores a goal, its history and its links to savings categories", () => {
    const { data: withGoal, goal } = createSavingsGoal(sampleMonth(), {
      name: "Holidays", emoji: "🏖️", color: "amber", targetAmount: 80000, initialAmount: 0, targetDate: null,
    });
    let data = updateCategory(withGoal, categoryByName(withGoal, SEPT_2026, "Savings").id, { savingsGoalId: goal.id });
    data = addSavingsTransaction(data, { goalId: goal.id, amount: 2000, date: "2026-09-10", note: "Gift" });
    const deleted = deleteSavingsGoal(data, goal.id);
    expect(categoryByName(deleted, SEPT_2026, "Savings").savingsGoalId).toBeNull();
    const restored = buildUndo(data, deleted)(deleted);
    expect(restored.savingsGoals).toEqual([goal]);
    expect(restored.savingsTransactions).toHaveLength(1);
    expect(categoryByName(restored, SEPT_2026, "Savings").savingsGoalId).toBe(goal.id);
  });

  it("does nothing twice and skips records whose parent is gone", () => {
    const data = spend(sampleMonth(), SEPT_2026, "Groceries", 3250, "2026-09-03");
    const deleted = deleteTransaction(data, data.transactions[0].id);
    const undo = buildUndo(data, deleted);
    const once = undo(deleted);
    expect(undo(once).transactions).toHaveLength(1);
    const withoutCategory = deleteCategory(deleted, categoryByName(deleted, SEPT_2026, "Groceries").id);
    expect(undo(withoutCategory).transactions).toHaveLength(0);
  });
});

describe("undo of an addition", () => {
  it("removes an expense that was just added, keeping later changes", () => {
    const data = sampleMonth();
    const added = spend(data, SEPT_2026, "Rent", 60000, "2026-09-01");
    const later = spend(added, SEPT_2026, "Groceries", 3250, "2026-09-02");
    const restored = buildUndo(data, added)(later);
    expect(restored.transactions.map((t) => t.amount)).toEqual([3250]);
  });
});

describe("fixed expenses: Paid button", () => {
  it("records the full amount once, then is ticked", async () => {
    const { isFixedPaid, markFixedPaid } = await import("@/lib/domain/actions");
    const data = sampleMonth();
    const rent = categoryByName(data, SEPT_2026, "Rent");
    const paid = markFixedPaid(data, rent.id, "2026-09-03");
    expect(paid.transactions).toEqual([expect.objectContaining({ categoryId: rent.id, amount: 60000, description: "Rent", date: "2026-09-03" })]);
    expect(isFixedPaid(rent, 60000)).toBe(true);
    expect(markFixedPaid(paid, rent.id, "2026-09-04")).toBe(paid); // nothing left to pay
  });

  it("pays only the rest after a partial payment", async () => {
    const { markFixedPaid } = await import("@/lib/domain/actions");
    const data = spend(sampleMonth(), SEPT_2026, "Rent", 20000, "2026-09-01");
    const paid = markFixedPaid(data, categoryByName(data, SEPT_2026, "Rent").id, "2026-09-03");
    expect(paid.transactions.map((t) => t.amount)).toEqual([20000, 40000]);
  });

  it("unticking removes the payments but keeps the budgeted amount", async () => {
    const { markFixedPaid, markFixedUnpaid } = await import("@/lib/domain/actions");
    const data = sampleMonth();
    const rent = categoryByName(data, SEPT_2026, "Rent");
    const unpaid = markFixedUnpaid(markFixedPaid(data, rent.id, "2026-09-03"), rent.id);
    expect(unpaid.transactions).toHaveLength(0);
    expect(categoryByName(unpaid, SEPT_2026, "Rent").assigned).toBe(60000);
  });

  it("refuses non-fixed categories", async () => {
    const { markFixedPaid } = await import("@/lib/domain/actions");
    const data = sampleMonth();
    expect(() => markFixedPaid(data, categoryByName(data, SEPT_2026, "Groceries").id, "2026-09-03")).toThrow();
  });
});
