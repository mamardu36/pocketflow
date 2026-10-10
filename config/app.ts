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
  /** Shown in Settings → About. Bump it when you ship a notable change. */
  version: "1.4.1",
  /**
   * Where "Send feedback" emails go, also shown on the privacy page.
   * Leave empty to hide the feedback button and the contact line.
   */
  contactEmail: "marius.piolat@gmail.com",
} as const;
