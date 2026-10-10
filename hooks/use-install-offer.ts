"use client";

import { useCallback, useEffect, useState } from "react";
import {
  canPromptInstall, detectInstallPlatform, promptInstall, readBrowserInfo, shouldOfferInstall, subscribeInstall,
  wasJustInstalled, type InstallPlatform,
} from "@/lib/pwa/install";

/**
 * Everything needed to offer "install on the home screen": where we are, whether installing is possible,
 * and the action (native prompt on Android/Chrome, a step-by-step guide on iPhone).
 */
export function useInstallOffer() {
  const [env, setEnv] = useState<{ platform: InstallPlatform; standalone: boolean; atRisk: boolean } | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const info = readBrowserInfo();
    if (!info) return;
    setEnv({ platform: detectInstallPlatform(info), standalone: info.standalone, atRisk: shouldOfferInstall(info) });
    setCanPrompt(canPromptInstall());
    const unsubscribe = subscribeInstall(() => {
      setCanPrompt(canPromptInstall());
      setInstalled(wasJustInstalled());
    });
    return () => void unsubscribe();
  }, []);

  const ios = env?.platform === "ios";
  /** Installing is possible right now from this browser. */
  const canInstall = !!env && !env.standalone && !installed && (ios || canPrompt);

  const install = useCallback(async () => {
    if (ios) setGuideOpen(true);
    else await promptInstall();
  }, [ios]);

  return {
    ready: env !== null,
    platform: env?.platform ?? null,
    ios,
    /** Guest data can be erased here (phone or Safari, not installed). */
    atRisk: !!env?.atRisk && !installed,
    onPhone: env?.platform === "ios" || env?.platform === "android",
    canInstall,
    install,
    guideOpen,
    closeGuide: () => setGuideOpen(false),
  };
}
