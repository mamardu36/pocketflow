import { describe, expect, it } from "vitest";
import { addMonths, compareMonthKeys, daysInMonth, defaultDateForMonth, isDateInMonth, lastDayOfMonth, monthKeyFromISODate } from "@/lib/dates";
import { createMonthBudget, deleteCategory, updateCategory } from "@/lib/domain/actions";
import { buildMonthView, findBudget, findTemplateBudget, getCategoriesForBudget } from "@/lib/domain/selectors";
import { SEPT_2026, categoryByName, sampleMonth, spend } from "./helpers";

const OCT_2026 = { year: 2026, month: 10 };

describe("month keys", () => {
  it("adds months across year boundaries", () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths({ year: 2026, month: 9 }, 15)).toEqual({ year: 2027, month: 12 });
    expect(addMonths({ year: 2026, month: 9 }, -21)).toEqual({ year: 2024, month: 12 });
  });

  it("compares months", () => {
    expect(compareMonthKeys({ year: 2026, month: 12 }, { year: 2027, month: 1 })).toBeLessThan(0);
    expect(compareMonthKeys(SEPT_2026, SEPT_2026)).toBe(0);
  });

  it("knows month lengths including leap years", () => {
    expect(daysInMonth({ year: 2024, month: 2 })).toBe(29);
    expect(daysInMonth({ year: 2026, month: 2 })).toBe(28);
    expect(daysInMonth({ year: 2026, month: 4 })).toBe(30);
    expect(lastDayOfMonth({ year: 2028, month: 2 })).toBe("2028-02-29");
  });

  it("works with local calendar dates, not UTC", () => {
    expect(monthKeyFromISODate("2026-12-31")).toEqual({ year: 2026, month: 12 });
    expect(isDateInMonth("2026-09-30", SEPT_2026)).toBe(true);
    expect(isDateInMonth("2026-10-01", SEPT_2026)).toBe(false);
    // Late evening on the last day of the month must stay in that month.
    expect(defaultDateForMonth(SEPT_2026, new Date(2026, 8, 30, 23, 59))).toBe("2026-09-30");
  });
});

describe("new month", () => {
  it("starts with 0 spent, keeps categories and fixed amounts", () => {
    let data = sampleMonth();
    data = spend(data, SEPT_2026, "Groceries", 3250, "2026-09-30");
    data = createMonthBudget(data, { key: OCT_2026, amount: 100000, reuseAmounts: true });

    const oct = buildMonthView(data, OCT_2026)!;
    expect(oct.transactions).toHaveLength(0);
    expect(oct.summary.spent).toBe(0);
    expect(oct.categories.map((c) => c.name)).toEqual(["Rent", "Groceries", "Transport", "Going out", "Savings"]);
    expect(categoryByName(data, OCT_2026, "Rent").assigned).toBe(60000);
    expect(categoryByName(data, OCT_2026, "Groceries").assigned).toBe(20000);
  });

  it("keeps only recurring amounts when not reusing variable amounts", () => {
    const data = createMonthBudget(sampleMonth(), { key: OCT_2026, amount: 90000, reuseAmounts: false });
    expect(categoryByName(data, OCT_2026, "Rent").assigned).toBe(60000);
    expect(categoryByName(data, OCT_2026, "Groceries").assigned).toBe(0);
    expect(findBudget(data, OCT_2026)?.amount).toBe(90000);
  });

  it("leaves the previous month untouched (history is immutable)", () => {
    let data = sampleMonth();
    data = spend(data, SEPT_2026, "Groceries", 3250, "2026-09-12");
    const before = buildMonthView(data, SEPT_2026)!.summary;
    data = createMonthBudget(data, { key: OCT_2026, amount: 50000, reuseAmounts: true });
    const octGroceries = categoryByName(data, OCT_2026, "Groceries");
    data = updateCategory(data, octGroceries.id, { assigned: 1000 });
    data = deleteCategory(data, categoryByName(data, OCT_2026, "Transport").id);
    expect(buildMonthView(data, SEPT_2026)!.summary).toEqual(before);
    expect(getCategoriesForBudget(data, findBudget(data, SEPT_2026)!.id)).toHaveLength(5);
  });

  it("handles December → January", () => {
    const dec = { year: 2026, month: 12 };
    const data = createMonthBudget(sampleMonth(dec), { key: { year: 2027, month: 1 }, amount: 100000, reuseAmounts: true });
    expect(findBudget(data, { year: 2027, month: 1 })).not.toBeNull();
    expect(findTemplateBudget(data, { year: 2027, month: 2 })?.year).toBe(2027);
  });

  it("does not duplicate an existing month", () => {
    const data = sampleMonth();
    expect(createMonthBudget(data, { key: SEPT_2026, amount: 1, reuseAmounts: true })).toBe(data);
  });

  it("keeps the savings link when copying a savings category", () => {
    const data = sampleMonth();
    const withGoal = { ...data, savingsGoals: [{ id: "g1", name: "Holidays", emoji: "🏖️", color: "amber" as const, targetAmount: null, initialAmount: 0, targetDate: null, sortOrder: 0, createdAt: "", updatedAt: "" }] };
    const linked = updateCategory(withGoal, categoryByName(withGoal, SEPT_2026, "Savings").id, { savingsGoalId: "g1" });
    const next = createMonthBudget(linked, { key: OCT_2026, amount: 100000, reuseAmounts: true });
    expect(categoryByName(next, OCT_2026, "Savings").savingsGoalId).toBe("g1");
  });
});
