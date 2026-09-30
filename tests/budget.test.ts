import { describe, expect, it } from "vitest";
import {
  calculateAssignedMoney, calculateCategoryRemaining, calculateCategorySpent, calculateDailyAllowance,
  calculateMonthSummary, calculateMonthlySpent, calculateRemainingDays, calculateRemainingVariableMoney,
  calculateUnassignedMoney, getCategoryStatus,
} from "@/lib/calculations/budget";
import { buildMonthView } from "@/lib/domain/selectors";
import { SEPT_2026, category, categoryByName, sampleMonth, spend, tx } from "./helpers";

describe("assigned / left to assign", () => {
  it("computes the spec example (1,000 → 950 assigned → 50 left)", () => {
    const cats = [category("rent", "fixed", 60000), category("gro", "variable", 20000), category("tr", "variable", 5000),
      category("out", "variable", 5000), category("sav", "savings", 5000)];
    expect(calculateAssignedMoney(cats)).toBe(95000);
    expect(calculateUnassignedMoney(100000, cats)).toBe(5000);
  });

  it("returns 0 when everything is assigned", () => {
    expect(calculateUnassignedMoney(100000, [category("a", "fixed", 100000)])).toBe(0);
  });

  it("goes negative when over-assigned (1,000 budget, 1,050 assigned → −50)", () => {
    const cats = [category("a", "fixed", 60000), category("b", "variable", 45000)];
    expect(calculateUnassignedMoney(100000, cats)).toBe(-5000);
  });

  it("reports overAssignedBy in the month summary without touching data", () => {
    const data = sampleMonth();
    const rent = categoryByName(data, SEPT_2026, "Rent");
    const bumped = { ...data, categories: data.categories.map((c) => (c.id === rent.id ? { ...c, assigned: 70000 } : c)) };
    const view = buildMonthView(bumped, SEPT_2026)!;
    expect(view.summary.assigned).toBe(105000);
    expect(view.summary.unassigned).toBe(-5000);
    expect(view.summary.overAssignedBy).toBe(5000);
    expect(bumped.categories).toHaveLength(5);
  });
});

describe("category remaining & overrun", () => {
  it("Groceries 200 − Carrefour 32.50 = 167.50 left", () => {
    const groceries = category("gro", "variable", 20000);
    const txs = [tx("gro", 3250), tx("other", 999)];
    expect(calculateCategorySpent("gro", txs)).toBe(3250);
    expect(calculateCategoryRemaining(groceries, txs)).toBe(16750);
  });

  it("is negative when over budget (200 budget, 218 spent → −18)", () => {
    const groceries = category("gro", "variable", 20000);
    const txs = [tx("gro", 20000), tx("gro", 1800, "2026-09-11")];
    expect(calculateCategoryRemaining(groceries, txs)).toBe(-1800);
    expect(getCategoryStatus(20000, 21800)).toBe("over");
  });

  it("never blocks recording an overspending expense", () => {
    let data = sampleMonth();
    data = spend(data, SEPT_2026, "Going out", 4000, "2026-09-05");
    data = spend(data, SEPT_2026, "Going out", 2500, "2026-09-06");
    const view = buildMonthView(data, SEPT_2026)!;
    const out = categoryByName(data, SEPT_2026, "Going out");
    expect(view.stats.get(out.id)?.remaining).toBe(-1500);
    expect(view.stats.get(out.id)?.status).toBe("over");
  });

  it("flags categories near their limit", () => {
    expect(getCategoryStatus(10000, 0)).toBe("untouched");
    expect(getCategoryStatus(10000, 5000)).toBe("on-track");
    expect(getCategoryStatus(10000, 8500)).toBe("near-limit");
    expect(getCategoryStatus(10000, 10000)).toBe("near-limit");
  });

  it("handles the main user flow: Going out 70, spend 16 then 12 → 42 left", () => {
    const cats = [category("out", "variable", 7000)];
    const txs = [tx("out", 1600), tx("out", 1200, "2026-09-12")];
    expect(calculateCategoryRemaining(cats[0], txs)).toBe(4200);
  });
});

describe("monthly spent & summary", () => {
  it("sums all expenses of the month", () => {
    expect(calculateMonthlySpent([tx("a", 3250), tx("b", 200), tx("c", 1600), tx("d", 1250)])).toBe(6300);
  });

  it("computes budget / spent / saved / unused", () => {
    let data = sampleMonth();
    data = spend(data, SEPT_2026, "Rent", 60000, "2026-09-01");
    data = spend(data, SEPT_2026, "Groceries", 15000, "2026-09-10");
    const view = buildMonthView(data, SEPT_2026)!;
    expect(view.summary).toMatchObject({ budget: 100000, spent: 75000, saved: 5000, unused: 20000, overspentBy: 0 });
  });

  it("never reports negative unused money", () => {
    const budget = { id: "b1", year: 2026, month: 9, amount: 10000, reviewedAt: null, createdAt: "", updatedAt: "" };
    const s = calculateMonthSummary(budget, [category("a", "variable", 10000)], [tx("a", 12000)], []);
    expect(s.unused).toBe(0);
    expect(s.overspentBy).toBe(2000);
  });
});

describe("remaining days", () => {
  it("counts today in a 30-day month", () => {
    expect(calculateRemainingDays(SEPT_2026, new Date(2026, 8, 13))).toBe(18);
    expect(calculateRemainingDays(SEPT_2026, new Date(2026, 8, 30))).toBe(1);
  });

  it("handles February in leap and non-leap years", () => {
    expect(calculateRemainingDays({ year: 2028, month: 2 }, new Date(2028, 1, 1))).toBe(29);
    expect(calculateRemainingDays({ year: 2027, month: 2 }, new Date(2027, 1, 1))).toBe(28);
    expect(calculateRemainingDays({ year: 2100, month: 2 }, new Date(2100, 1, 1))).toBe(28);
    expect(calculateRemainingDays({ year: 2000, month: 2 }, new Date(2000, 1, 1))).toBe(29);
  });

  it("is 0 for past months and the full month for future months", () => {
    const today = new Date(2026, 8, 15);
    expect(calculateRemainingDays({ year: 2026, month: 8 }, today)).toBe(0);
    expect(calculateRemainingDays({ year: 2025, month: 12 }, today)).toBe(0);
    expect(calculateRemainingDays({ year: 2026, month: 10 }, today)).toBe(31);
    expect(calculateRemainingDays({ year: 2027, month: 2 }, today)).toBe(28);
  });
});

describe("daily allowance", () => {
  it("243 € over 18 days = 13.50 €/day", () => {
    expect(calculateDailyAllowance(24300, 18)).toBe(1350);
  });

  it("rounds down to the cent and never divides by zero", () => {
    expect(calculateDailyAllowance(10000, 3)).toBe(3333);
    expect(calculateDailyAllowance(10000, 0)).toBe(0);
    expect(calculateDailyAllowance(0, 10)).toBe(0);
  });

  it("only uses variable categories (fixed costs and savings are already reserved)", () => {
    const cats = [category("rent", "fixed", 60000), category("gro", "variable", 20000), category("out", "variable", 7000), category("sav", "savings", 5000)];
    const txs = [tx("rent", 60000), tx("gro", 3250), tx("out", 1600)];
    expect(calculateRemainingVariableMoney(cats, txs)).toBe(22150);
  });

  it("overspending in one variable category reduces the others, floored at 0", () => {
    const cats = [category("gro", "variable", 10000), category("out", "variable", 5000)];
    expect(calculateRemainingVariableMoney(cats, [tx("out", 8000)])).toBe(7000);
    expect(calculateRemainingVariableMoney(cats, [tx("out", 20000)])).toBe(0);
  });

  it("is exposed on the month view for the current month", () => {
    const data = sampleMonth();
    const view = buildMonthView(data, SEPT_2026, new Date(2026, 8, 13))!;
    expect(view.isCurrent).toBe(true);
    expect(view.remainingDays).toBe(18);
    expect(view.remainingVariable).toBe(30000);
    expect(view.dailyAllowance).toBe(Math.floor(30000 / 18));
  });
});
