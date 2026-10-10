/**
 * Install-to-home-screen helpers.
 * Why it matters: Safari (iOS and macOS) erases a website's stored data after ~7 days without a visit,
 * unless the site is installed on the home screen. Guest data lives only in the browser, so it's at risk.
 */

export interface BrowserInfo {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  /** Already running as an installed app. */
  standalone: boolean;
}

export type InstallPlatform = "ios" | "android" | "other";

export function detectInstallPlatform(info: BrowserInfo): InstallPlatform {
  const ua = info.userAgent;
  const iPadOS = info.platform === "MacIntel" && (info.maxTouchPoints ?? 0) > 1;
  if (/iPhone|iPad|iPod/i.test(ua) || iPadOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

/** Safari on a Mac (not Chrome/Firefox/Edge, which don't erase data this way). */
function isDesktopSafari(ua: string): boolean {
  return /Macintosh/i.test(ua) && /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Firefox/i.test(ua);
}

/** Show the nudge only where data can actually be lost: phones and Safari, outside the installed app. */
export function shouldOfferInstall(info: BrowserInfo): boolean {
  if (info.standalone) return false;
  const platform = detectInstallPlatform(info);
  return platform !== "other" || isDesktopSafari(info.userAgent);
}

export function readBrowserInfo(): BrowserInfo | null {
  if (typeof window === "undefined") return null;
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    maxTouchPoints: nav.maxTouchPoints,
    standalone: window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true,
  };
}

// ---- Android/Chrome native install prompt -------------------------------------------------
// The browser fires `beforeinstallprompt` once, early; we keep it so a button can trigger it later.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function listenForInstallPrompt(): void {
  if (typeof window === "undefined" || (window as { __pfInstall?: boolean }).__pfInstall) return;
  (window as { __pfInstall?: boolean }).__pfInstall = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    notify();
  });
}

export function canPromptInstall(): boolean {
  return deferred !== null;
}

export function wasJustInstalled(): boolean {
  return installed;
}

/** Opens the browser's own install dialog. Returns true if the person accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  notify();
  return outcome === "accepted";
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
