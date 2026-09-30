import { describe, expect, it } from "vitest";
import {
  calculateGoalBalance, calculateGoalProgress, calculateMonthlySavingsHistory, calculateSavingsTotal,
} from "@/lib/calculations/savings";
import {
  addSavingsTransaction, createMonthBudget, createSavingsGoal, deleteSavingsGoal, moveUnusedToSavings, updateCategory,
} from "@/lib/domain/actions";
import { createEmptyData } from "@/lib/domain/factories";
import { buildMonthView, findBudget } from "@/lib/domain/selectors";
import { buildDemoData } from "@/lib/domain/demo";
import { categoryByName, draft } from "./helpers";

const JUL = { year: 2026, month: 7 };
const AUG = { year: 2026, month: 8 };
const SEP = { year: 2026, month: 9 };
const OCT = { year: 2026, month: 10 };

/** €500 saved before September, then +€50 in September. */
function setup() {
  const { data: withGoal, goal } = createSavingsGoal(createEmptyData(), {
    name: "Emergency fund", emoji: "🛟", color: "teal", targetAmount: 100000, initialAmount: 50000, targetDate: null,
  });
  const data = createMonthBudget(withGoal, {
    key: SEP, amount: 100000, reuseAmounts: true,
    seedCategories: [draft("Rent", "fixed", 60000), draft("Groceries", "variable", 20000), draft("Savings", "savings", 5000, { savingsGoalId: goal.id })],
  });
  return { data, goal };
}

describe("savings", () => {
  it("adds the monthly allocation to the goal (500 + 50 = 550)", () => {
    const { data, goal } = setup();
    expect(calculateGoalBalance(goal, data)).toBe(55000);
    expect(calculateSavingsTotal(data.savingsGoals, data)).toBe(55000);
  });

  it("carries over to the next month and grows with each allocation", () => {
    const { data, goal } = setup();
    const oct = createMonthBudget(data, { key: OCT, amount: 100000, reuseAmounts: true });
    expect(calculateGoalBalance(goal, oct)).toBe(60000);
    const zeroOct = updateCategory(oct, categoryByName(oct, OCT, "Savings").id, { assigned: 0 });
    expect(calculateGoalBalance(goal, zeroOct)).toBe(55000);
  });

  it("includes manual deposits and withdrawals", () => {
    const { data, goal } = setup();
    let next = addSavingsTransaction(data, { goalId: goal.id, amount: 2000, date: "2026-09-15", note: "Birthday" });
    next = addSavingsTransaction(next, { goalId: goal.id, amount: -1000, date: "2026-09-20", note: "" });
    expect(calculateGoalBalance(goal, next)).toBe(56000);
  });

  it("rejects zero amounts and unknown goals", () => {
    const { data, goal } = setup();
    expect(() => addSavingsTransaction(data, { goalId: goal.id, amount: 0, date: "2026-09-15", note: "" })).toThrow();
    expect(() => addSavingsTransaction(data, { goalId: "nope", amount: 100, date: "2026-09-15", note: "" })).toThrow();
  });

  it("builds a per-month history (Sep +50, Aug +30, Jul +70)", () => {
    const { data: base, goal } = createSavingsGoal(createEmptyData(), {
      name: "Holidays", emoji: "🏖️", color: "amber", targetAmount: null, initialAmount: 0, targetDate: null,
    });
    let data = base;
    for (const [key, amount] of [[JUL, 7000], [AUG, 3000], [SEP, 5000]] as const) {
      data = createMonthBudget({ ...data, budgets: data.budgets }, { key, amount: 100000, reuseAmounts: true,
        seedCategories: [draft("Savings", "savings", amount, { savingsGoalId: goal.id })] });
      data = updateCategory(data, categoryByName(data, key, "Savings").id, { assigned: amount });
    }
    const history = calculateMonthlySavingsHistory(data);
    expect(history.map((h) => [h.monthKey.month, h.amount])).toEqual([[9, 5000], [8, 3000], [7, 7000]]);
  });

  it("moves unused money at month end and counts it as saved", () => {
    const { data, goal } = setup();
    const budget = findBudget(data, SEP)!;
    const before = buildMonthView(data, SEP)!.summary;
    expect(before.unused).toBe(95000);
    const moved = moveUnusedToSavings(data, budget.id, goal.id, 10000, "2026-09-30", "Unused");
    const after = buildMonthView(moved, SEP)!.summary;
    expect(after.saved).toBe(15000);
    expect(after.unused).toBe(85000);
    expect(findBudget(moved, SEP)?.reviewedAt).not.toBeNull();
    expect(calculateGoalBalance(goal, moved)).toBe(65000);
  });

  it("deleting a goal keeps monthly allocations in history, unlinked", () => {
    const { data, goal } = setup();
    const next = deleteSavingsGoal(data, goal.id);
    expect(next.savingsGoals).toHaveLength(0);
    expect(categoryByName(next, SEP, "Savings").savingsGoalId).toBeNull();
    expect(buildMonthView(next, SEP)!.summary.saved).toBe(5000);
  });

  it("computes goal progress, capped at 100%", () => {
    expect(calculateGoalProgress(18000, 80000)).toBeCloseTo(0.225);
    expect(calculateGoalProgress(90000, 80000)).toBe(1);
    expect(calculateGoalProgress(5000, null)).toBeNull();
  });
});

describe("demo data", () => {
  it("matches the spec: €1,000 budget, €30 left to assign, Carrefour/Bus/Restaurant/Cinema", () => {
    const today = new Date(2026, 8, 20);
    const data = buildDemoData(today);
    const view = buildMonthView(data, SEP, today)!;
    expect(view.summary.budget).toBe(100000);
    expect(view.summary.unassigned).toBe(3000);
    const variable = new Set(view.categories.filter((c) => c.type === "variable").map((c) => c.id));
    const spends = view.transactions.filter((t) => variable.has(t.categoryId)).map((t) => t.amount).sort((a, b) => a - b);
    expect(spends).toEqual([200, 1250, 1600, 3250]);
  });
});
