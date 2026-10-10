"use client";

import { Share, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useApp, useT } from "@/hooks/use-app";
import {
  canPromptInstall, detectInstallPlatform, promptInstall, readBrowserInfo, shouldOfferInstall, subscribeInstall,
  wasJustInstalled, type InstallPlatform,
} from "@/lib/pwa/install";
import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage/keys";

/** After "Later", the card comes back after this delay: the risk hasn't gone away. */
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Guest mode only, in a browser where data can be erased (phones, Safari).
 * iPhone: an installed web app doesn't see Safari's data, so creating an account comes first.
 */
export function InstallNudge() {
  const t = useT();
  const router = useRouter();
  const { mode, cloudAvailable } = useApp();
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [iosGuide, setIosGuide] = useState(false);

  useEffect(() => {
    const info = readBrowserInfo();
    if (!info || mode !== "guest" || !shouldOfferInstall(info)) return setHidden(true);
    const dismissedAt = Number(safeGet(STORAGE_KEYS.installNudgeDismissed) ?? 0);
    setHidden(Date.now() - dismissedAt < SNOOZE_MS);
    setPlatform(detectInstallPlatform(info));
    setCanPrompt(canPromptInstall());
    return subscribeInstall(() => {
      setCanPrompt(canPromptInstall());
      if (wasJustInstalled()) setHidden(true);
    }) as () => void;
  }, [mode]);

  const ios = platform === "ios";
  const canInstall = ios || canPrompt;
  if (hidden || !platform || (!canInstall && !cloudAvailable)) return null;

  const snooze = () => {
    try {
      safeSet(STORAGE_KEYS.installNudgeDismissed, String(Date.now()));
    } catch {
      /* ignore */
    }
    setHidden(true);
  };
  const install = async () => {
    if (ios) return setIosGuide(true);
    if (await promptInstall()) setHidden(true);
  };
  const createAccount = () => router.push("/auth");

  // iPhone: the account is the safe path (data kept); elsewhere installing is the quickest fix.
  const accountFirst = ios && cloudAvailable;

  return (
    <>
      <section
        aria-labelledby="install-nudge-title"
        className="relative rounded-3xl border border-border bg-card p-4 pr-12 shadow-soft animate-fade-in"
      >
        <button
          type="button"
          onClick={snooze}
          aria-label={t.install.later}
          className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary" aria-hidden>
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id="install-nudge-title" className="font-semibold">
              {t.install.title}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{ios ? t.install.bodyIos : t.install.body}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 pl-[52px]">
          {accountFirst ? (
            <>
              <Button size="sm" onClick={createAccount}>
                {t.install.createAccount}
              </Button>
              <Button size="sm" variant="ghost" onClick={install}>
                {t.install.install}
              </Button>
            </>
          ) : (
            <>
              {canInstall && (
                <Button size="sm" onClick={install}>
                  {t.install.install}
                </Button>
              )}
              {cloudAvailable && (
                <Button size="sm" variant={canInstall ? "ghost" : "primary"} onClick={createAccount}>
                  {t.install.createAccount}
                </Button>
              )}
            </>
          )}
        </div>
      </section>

      <Sheet open={iosGuide} onClose={() => setIosGuide(false)} title={t.install.iosTitle} closeLabel={t.common.close}>
        <ol className="space-y-3">
          {t.install.iosSteps.map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <span className="tabular grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">
                {i + 1}
              </span>
              <span className="flex-1">{step}</span>
              {i === 0 && <Share className="h-5 w-5 shrink-0 text-primary" aria-hidden />}
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-2xl bg-warning/10 px-4 py-3 text-sm text-foreground">{t.install.iosWarning}</p>
        <div className="mt-5 flex flex-col gap-2">
          {cloudAvailable && (
            <Button size="lg" onClick={createAccount}>
              {t.install.createAccount}
            </Button>
          )}
          <Button size="lg" variant={cloudAvailable ? "ghost" : "primary"} onClick={() => setIosGuide(false)}>
            {t.install.iosFresh}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
