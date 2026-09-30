import { describe, expect, it } from "vitest";
import { centsToInput, formatMoney, parseMoneyInput } from "@/lib/money";
import { diffData } from "@/lib/domain/diff";
import { addTransaction, updatePreferences } from "@/lib/domain/actions";
import { parseAppData } from "@/lib/storage/schema";
import { SEPT_2026, categoryByName, sampleMonth } from "./helpers";

describe("parseMoneyInput", () => {
  it.each([
    ["32.50", 3250], ["32,50", 3250], ["32", 3200], ["0.1", 10], ["1,000", 100000], ["1,000.50", 100050],
    ["1.000,50", 100050], ["€ 12", 1200], ["12 €", 1200], ["1 000", 100000], ["0.07", 7],
  ])("%s → %i", (input, cents) => {
    expect(parseMoneyInput(input)).toBe(cents);
  });

  it.each(["", "abc", "-5", "12.345", "1,2,3"])("rejects %s", (input) => {
    expect(parseMoneyInput(input)).toBeNull();
  });

  it("avoids floating point errors", () => {
    expect((parseMoneyInput("0.1") ?? 0) + (parseMoneyInput("0.2") ?? 0)).toBe(30);
  });

  it("round-trips through the input format", () => {
    expect(parseMoneyInput(centsToInput(16750))).toBe(16750);
  });
});

describe("formatMoney", () => {
  it("formats EUR, dropping decimals for whole amounts", () => {
    expect(formatMoney(100000, "EUR")).toBe("€1,000");
    expect(formatMoney(16750, "EUR")).toBe("€167.50");
    expect(formatMoney(-1800, "EUR")).toBe("−€18");
    expect(formatMoney(5000, "EUR", { signed: true })).toBe("+€50");
  });

  it("supports other currencies", () => {
    expect(formatMoney(1350, "USD")).toBe("$13.50");
    expect(formatMoney(2000, "GBP")).toBe("£20");
  });
});

describe("persistence helpers", () => {
  it("diffs only the records that changed", () => {
    const data = sampleMonth();
    const next = addTransaction(data, { categoryId: categoryByName(data, SEPT_2026, "Groceries").id, amount: 3250, description: "Carrefour", date: "2026-09-30" });
    const diff = diffData(data, next);
    expect(diff.transactions.upserts).toHaveLength(1);
    expect(diff.categories.upserts).toHaveLength(0);
    expect(diff.budgets.upserts).toHaveLength(0);
    expect(diff.preferencesChanged).toBe(false);
    expect(diffData(next, updatePreferences(next, { currency: "USD" })).preferencesChanged).toBe(true);
  });

  it("parses exported data back and rejects garbage", () => {
    const data = sampleMonth();
    const parsed = parseAppData(JSON.parse(JSON.stringify({ app: "PocketFlow", format: 1, data })));
    expect(parsed.budgets).toHaveLength(1);
    expect(parsed.categories).toHaveLength(5);
    expect(() => parseAppData("nope")).toThrow();
  });
});
