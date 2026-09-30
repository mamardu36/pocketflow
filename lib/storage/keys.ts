import { APP_CONFIG } from "@/config/app";
import type { AppMode } from "@/types";

const p = APP_CONFIG.storagePrefix;

export const STORAGE_KEYS = {
  mode: `${p}:mode`,
  guestData: `${p}:guest-data`,
  demoData: `${p}:demo-data`,
  theme: `${p}:theme`,
  cloudCache: (userId: string) => `${p}:cloud-cache:${userId}`,
  migrationHandled: (userId: string) => `${p}:migration-handled:${userId}`,
} as const;

export function safeGet(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): void {
  window.localStorage.setItem(key, value);
}

export function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readMode(): AppMode | null {
  const value = safeGet(STORAGE_KEYS.mode);
  return value === "guest" || value === "demo" || value === "cloud" ? value : null;
}

export function writeMode(mode: AppMode | null): void {
  try {
    if (mode) safeSet(STORAGE_KEYS.mode, mode);
    else safeRemove(STORAGE_KEYS.mode);
  } catch {
    /* storage unavailable: mode stays in memory */
  }
}
