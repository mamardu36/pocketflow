/**
 * Central app identity. Change the name here — nothing else depends on it.
 * `storagePrefix` is intentionally separate so renaming the app never wipes local data.
 */
export const APP_CONFIG = {
  name: "PocketFlow",
  shortName: "PocketFlow",
  description: "Decide where your money goes before you spend it.",
  storagePrefix: "pocketflow",
  themeColor: { light: "#f4f5f2", dark: "#0f1112" },
  defaultCurrency: "EUR",
  defaultLanguage: "en",
} as const;
