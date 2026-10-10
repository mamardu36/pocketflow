"use client";

import { useEffect } from "react";
import { listenForInstallPrompt } from "@/lib/pwa/install";

// Chrome fires `beforeinstallprompt` once, early: start listening as soon as this module loads.
listenForInstallPrompt();

/** Registers /sw.js in production only (avoids stale caches while developing). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is progressive enhancement */
    });
  }, []);
  return null;
}
