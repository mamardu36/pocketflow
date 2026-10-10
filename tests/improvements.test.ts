import { describe, expect, it } from "vitest";
import { calculateMonthProgress, isSpendingAheadOfPace } from "@/lib/calculations/budget";
import { buildDemoData } from "@/lib/domain/demo";
import { buildMonthRecap, buildMonthView } from "@/lib/domain/selectors";
import { createMonthBudget } from "@/lib/domain/actions";
import { DATE_LOCALES, getMessages, localizeName } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { fr } from "@/lib/i18n/fr";
import { formatMoney, parseMoneyInput } from "@/lib/money";
import { formatLongDate, formatMonthLabel } from "@/lib/dates";
import { SEPT_2026, categoryByName, sampleMonth, spend } from "./helpers";

describe("month progress & spending pace", () => {
  it("measures how much of the month has passed", () => {
    expect(calculateMonthProgress(SEPT_2026, new Date(2026, 8, 15))).toBeCloseTo(0.5);
    expect(calculateMonthProgress(SEPT_2026, new Date(2026, 8, 30))).toBe(1);
    expect(calculateMonthProgress(SEPT_2026, new Date(2026, 9, 2))).toBe(1);
    expect(calculateMonthProgress(SEPT_2026, new Date(2026, 7, 31))).toBe(0);
  });

  it("flags 72% used at 55% of the month, but not 65% (under the 15-point margin)", () => {
    expect(isSpendingAheadOfPace(7200, 10000, 0.55)).toBe(true); // 17 points ahead
    expect(isSpendingAheadOfPace(6500, 10000, 0.55)).toBe(false); // 10 points ahead: not worth a message
  });

  it("stays quiet when there's nothing to say", () => {
    expect(isSpendingAheadOfPace(0, 10000, 0.1)).toBe(false); // nothing spent
    expect(isSpendingAheadOfPace(12000, 10000, 0.3)).toBe(false); // already over budget: shown elsewhere
    expect(isSpendingAheadOfPace(5000, 0, 0.3)).toBe(false); // no budget
    expect(isSpendingAheadOfPace(9000, 10000, 1)).toBe(false); // month finished
  });

  it("is exposed on the month view", () => {
    const view = buildMonthView(sampleMonth(), SEPT_2026, new Date(2026, 8, 6))!;
    expect(view.monthProgress).toBeCloseTo(0.2);
  });
});

describe("left to spend", () => {
  it("is budget − spent − savings, and can go negative", () => {
    let data = sampleMonth(); // €1,000, €50 to savings
    data = spend(data, SEPT_2026, "Rent", 60000, "2026-09-01");
    expect(buildMonthView(data, SEPT_2026)!.summary.leftToSpend).toBe(35000);
    data = spend(data, SEPT_2026, "Groceries", 40000, "2026-09-02");
    expect(buildMonthView(data, SEPT_2026)!.summary.leftToSpend).toBe(-5000);
  });
});

describe("monthly recap", () => {
  const AUG = { year: 2026, month: 8 };
  const today = new Date(2026, 9, 5);

  it("finds the top category and compares with the previous month", () => {
    let data = sampleMonth(AUG);
    data = spend(data, AUG, "Groceries", 20000, "2026-08-10");
    data = createMonthBudget(data, { key: SEPT_2026, amount: 100000, reuseAmounts: true });
    data = spend(data, SEPT_2026, "Groceries", 9000, "2026-09-10");
    data = spend(data, SEPT_2026, "Going out", 3000, "2026-09-12");
    const recap = buildMonthRecap(data, buildMonthView(data, SEPT_2026, today)!);
    expect(recap.top?.category.name).toBe("Groceries");
    expect(recap.top?.spent).toBe(9000);
    expect(recap.previous).toEqual({ key: AUG, difference: -8000 });
  });

  it("ignores savings and skips the comparison for the current month", () => {
    const data = sampleMonth();
    const recap = buildMonthRecap(data, buildMonthView(data, SEPT_2026, new Date(2026, 8, 10))!);
    expect(recap.top).toBeNull();
    expect(recap.previous).toBeNull();
  });
});

describe("French", () => {
  it("has a translation for every English key", () => {
    const keys = (o: object, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) && k !== "categoryNames" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
    expect(keys(fr).sort()).toEqual(keys(en).sort());
    expect(getMessages("fr").nav.home).toBe("Accueil");
  });

  it("formats money and months the French way", () => {
    expect(formatMoney(100000, "EUR", { language: "fr" }).replace(/\s/g, " ")).toBe("1 000 €");
    expect(formatMoney(16750, "EUR", { language: "fr" }).replace(/\s/g, " ")).toBe("167,50 €");
    expect(formatMoney(-1800, "EUR", { language: "fr" }).replace(/\s/g, " ")).toBe("−18 €");
    expect(formatMonthLabel(SEPT_2026, DATE_LOCALES.fr)).toBe("Septembre 2026");
    expect(formatLongDate("2026-09-30", DATE_LOCALES.fr)).toBe("Mercredi 30 septembre");
  });

  it("parses French-formatted amounts, including narrow no-break spaces", () => {
    expect(parseMoneyInput("1\u202f000,50")).toBe(100050);
    expect(parseMoneyInput("32,50 €")).toBe(3250);
  });

  it("translates built-in names but never user-typed ones", () => {
    expect(localizeName("Groceries", fr)).toBe("Courses");
    expect(localizeName("Ma super catégorie", fr)).toBe("Ma super catégorie");
    expect(localizeName("Groceries", en)).toBe("Groceries");
  });

  it("builds the demo in French", () => {
    const today = new Date(2026, 8, 20);
    const data = buildDemoData(today, "fr");
    expect(data.preferences.language).toBe("fr");
    expect(categoryByName(data, SEPT_2026, "Courses").assigned).toBe(18000);
    expect(data.transactions.some((t) => t.description === "Cinéma")).toBe(true);
    expect(buildMonthView(data, SEPT_2026, today)!.summary.unassigned).toBe(3000);
  });
});

describe("currency symbol position in the amount field", () => {
  it("goes after the number in French, before in English", async () => {
    const { currencySymbolPosition } = await import("@/lib/money");
    expect(currencySymbolPosition("EUR", "fr")).toBe("suffix");
    expect(currencySymbolPosition("CHF", "fr")).toBe("suffix");
    expect(currencySymbolPosition("EUR", "en")).toBe("prefix");
    expect(currencySymbolPosition("USD", "en")).toBe("prefix");
    expect(currencySymbolPosition("GBP", "en")).toBe("prefix");
  });
});
