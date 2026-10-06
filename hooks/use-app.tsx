"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getCurrentMonthKey } from "@/lib/dates";
import { updatePreferences } from "@/lib/domain/actions";
import { buildDemoData } from "@/lib/domain/demo";
import { createEmptyData } from "@/lib/domain/factories";
import { hasUserData } from "@/lib/domain/selectors";
import { DATE_LOCALES, detectLanguage, getMessages, type Messages } from "@/lib/i18n";
import { formatMoney, type FormatMoneyOptions } from "@/lib/money";
import { STORAGE_KEYS, readMode, safeGet, safeSet, writeMode } from "@/lib/storage/keys";
import { LocalRepository } from "@/lib/storage/local-repository";
import type { BudgetRepository } from "@/lib/storage/repository";
import { SupabaseRepository } from "@/lib/storage/supabase-repository";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/utils";
import type { AppData, AppMode, Cents, MonthKey, User } from "@/types";

export interface MigrationOffer {
  localData: AppData;
  cloudHasData: boolean;
}

interface AppContextValue {
  status: "loading" | "ready";
  mode: AppMode | null;
  user: User | null;
  data: AppData;
  month: MonthKey;
  cloudAvailable: boolean;
  migration: MigrationOffer | null;
  /** True while some changes exist only on this device (account mode, e.g. offline). */
  syncPending: boolean;
  setMonth: (key: MonthKey) => void;
  /** Apply a pure update. Returns false if the updater threw (error is shown as a toast). */
  commit: (updater: (data: AppData) => AppData) => boolean;
  startGuest: (initial?: AppData) => Promise<void>;
  startDemo: () => Promise<void>;
  leave: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  completePasswordReset: (password: string) => Promise<void>;
  openMigration: () => void;
  resolveMigration: (action: "transfer" | "skip") => Promise<void>;
  replaceAllData: (data: AppData) => Promise<void>;
  clearGuestData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000, 120_000];

function toUser(u: { id: string; email?: string | null }): User {
  return { id: u.id, email: u.email ?? "" };
}

function requireClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase isn't configured.");
  return client;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [mode, setMode] = useState<AppMode | null>(null);
  const [user, setUser] = useState<User | null>(null);
  // Deterministic first render (server and client agree); the device language is applied after mount.
  const [data, setData] = useState<AppData>(createEmptyData);
  const [month, setMonth] = useState<MonthKey>(() => getCurrentMonthKey());
  const [migration, setMigration] = useState<MigrationOffer | null>(null);
  const [syncPending, setSyncPending] = useState(false);

  const dataRef = useRef(data);
  const repoRef = useRef<BudgetRepository | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  /** Last state known to be saved by the repository. null = unknown (opened offline). */
  const syncedRef = useRef<AppData | null>(null);
  const pendingRef = useRef(false);
  const notifiedRef = useRef(false);
  const retryRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; attempt: number }>({ timer: null, attempt: 0 });
  const flushRef = useRef<() => Promise<void>>(async () => undefined);

  const messages = useCallback((): Messages => getMessages(dataRef.current.preferences.language), []);

  const applyData = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  /** Repository work is serialized so the backend always sees changes in order. */
  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = queueRef.current.then(task);
    queueRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  const clearRetry = useCallback(() => {
    if (retryRef.current.timer) clearTimeout(retryRef.current.timer);
    retryRef.current = { timer: null, attempt: 0 };
  }, []);

  const setPending = useCallback((pending: boolean) => {
    pendingRef.current = pending;
    setSyncPending(pending);
  }, []);

  /**
   * Pushes everything that changed since the last successful save.
   * Several quick edits are coalesced; failures keep the changes locally and retry later.
   */
  const flush = useCallback(
    () =>
      enqueue(async () => {
        const repo = repoRef.current;
        if (!repo) return;
        const target = dataRef.current;
        if (syncedRef.current === target) return;
        try {
          const base = syncedRef.current ?? (repo.fetchRemote ? await repo.fetchRemote() : target);
          await repo.persist(base, target);
          if (repoRef.current !== repo) return;
          syncedRef.current = target;
          clearRetry();
          if (pendingRef.current) {
            setPending(false);
            if (notifiedRef.current) toast.success(messages().sync.synced);
          }
          notifiedRef.current = false;
          // Edits made while this save was running are flushed right away.
          if (dataRef.current !== target) void flushRef.current();
        } catch (error) {
          if (repoRef.current !== repo) return;
          const m = messages();
          if (repo.kind !== "supabase") {
            toast.error(errorMessage(error, m.sync.saveFailed));
            return;
          }
          setPending(true);
          if (!notifiedRef.current) {
            notifiedRef.current = true;
            const offline = typeof navigator !== "undefined" && navigator.onLine === false;
            if (offline) toast.info(m.sync.pendingToast);
            else toast.error(errorMessage(error, m.sync.saveFailed));
          }
          const { attempt } = retryRef.current;
          if (retryRef.current.timer) clearTimeout(retryRef.current.timer);
          retryRef.current = {
            attempt: attempt + 1,
            timer: setTimeout(() => void flushRef.current(), RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]),
          };
        }
      }),
    [enqueue, clearRetry, setPending, messages],
  );
  flushRef.current = flush;

  // Retry as soon as the connection comes back or the app is reopened.
  useEffect(() => {
    const retry = () => {
      if (pendingRef.current && document.visibilityState !== "hidden") void flushRef.current();
    };
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", retry);
    return () => {
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", retry);
    };
  }, []);

  const activate = useCallback(
    (nextMode: AppMode, repo: BudgetRepository | null, nextData: AppData, nextUser: User | null = null, synced: AppData | null = nextData) => {
      repoRef.current = repo;
      syncedRef.current = synced;
      clearRetry();
      setPending(false);
      notifiedRef.current = false;
      writeMode(nextMode);
      setMode(nextMode);
      setUser(nextUser);
      applyData(nextData);
      setMonth(getCurrentMonthKey());
    },
    [applyData, clearRetry, setPending],
  );

  const deactivate = useCallback(() => {
    repoRef.current = null;
    syncedRef.current = null;
    clearRetry();
    setPending(false);
    writeMode(null);
    setMode(null);
    setUser(null);
    setMigration(null);
    applyData(createEmptyData(dataRef.current.preferences.language));
  }, [applyData, clearRetry, setPending]);

  const enterCloud = useCallback(
    async (u: User, offerMigration: boolean) => {
      const uiLanguage = dataRef.current.preferences.language;
      const repo = new SupabaseRepository(requireClient(), u.id);
      const { local, synced } = await repo.loadForSync();
      activate("cloud", repo, local, u, synced);
      if (repo.hasPendingChanges()) {
        setPending(true);
        void flushRef.current();
      }
      // A brand-new account keeps the language the person was already using.
      if (!hasUserData(local) && local.preferences.language !== uiLanguage) {
        applyData(updatePreferences(local, { language: uiLanguage }));
        void flushRef.current();
      }
      if (offerMigration && !safeGet(STORAGE_KEYS.migrationHandled(u.id))) {
        const guest = LocalRepository.guest().peek();
        if (hasUserData(guest)) setMigration({ localData: guest!, cloudHasData: hasUserData(local) });
      }
    },
    [activate, applyData, setPending],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = readMode();
      try {
        if (saved === "guest" || saved === "demo") {
          const repo = saved === "guest" ? LocalRepository.guest() : LocalRepository.demo();
          const loaded = await repo.load();
          if (!cancelled) activate(saved, repo, loaded);
        } else if (saved === "cloud") {
          const client = getSupabaseClient();
          const session = client ? (await client.auth.getSession()).data.session : null;
          if (session?.user && !cancelled) await enterCloud(toUser(session.user), true);
          else writeMode(null);
        }
        if (!cancelled && !repoRef.current) applyData(createEmptyData(detectLanguage()));
      } catch (error) {
        toast.error(errorMessage(error));
      } finally {
        if (!cancelled) setStatus("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activate, enterCloud, applyData]);

  const commit = useCallback(
    (updater: (d: AppData) => AppData) => {
      const prev = dataRef.current;
      let next: AppData;
      try {
        next = updater(prev);
      } catch (error) {
        toast.error(errorMessage(error));
        return false;
      }
      if (next === prev) return true;
      applyData(next);
      if (repoRef.current) void flush();
      return true;
    },
    [applyData, flush],
  );

  const startGuest = useCallback(
    async (initial?: AppData) => {
      const repo = LocalRepository.guest();
      if (initial) {
        await repo.replaceAll(initial);
        activate("guest", repo, initial);
      } else {
        activate("guest", repo, await repo.load());
      }
    },
    [activate],
  );

  const startDemo = useCallback(async () => {
    const repo = LocalRepository.demo();
    const language = dataRef.current.preferences.language;
    const demo = buildDemoData(new Date(), language);
    await repo.replaceAll(demo);
    activate("demo", repo, demo);
  }, [activate]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data: res, error } = await requireClient().auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      await enterCloud(toUser(res.user), true);
    },
    [enterCloud],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const { data: res, error } = await requireClient().auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      if (res.session && res.user) {
        await enterCloud(toUser(res.user), true);
        return { needsConfirmation: false };
      }
      return { needsConfirmation: true };
    },
    [enterCloud],
  );

  const signOut = useCallback(async () => {
    const client = getSupabaseClient();
    await repoRef.current?.clear();
    try {
      await client?.auth.signOut();
    } catch {
      /* already signed out */
    }
    deactivate();
  }, [deactivate]);

  const deleteAccount = useCallback(async () => {
    const { error } = await requireClient().rpc("delete_user");
    if (error) throw new Error(error.message);
    await signOut();
  }, [signOut]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await requireClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  }, []);

  /** Called from /reset-password, where the recovery link has already opened a session. */
  const completePasswordReset = useCallback(
    async (password: string) => {
      const client = requireClient();
      const { data: res, error } = await client.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      await enterCloud(toUser(res.user), true);
    },
    [enterCloud],
  );

  const openMigration = useCallback(() => {
    const local = LocalRepository.guest().peek();
    if (!hasUserData(local)) {
      toast.info(messages().errors.noLocalData);
      return;
    }
    setMigration({ localData: local!, cloudHasData: hasUserData(dataRef.current) });
  }, [messages]);

  const replaceAllData = useCallback(
    async (next: AppData) => {
      const repo = repoRef.current;
      if (repo) await enqueue(() => repo.replaceAll(next));
      syncedRef.current = next;
      clearRetry();
      setPending(false);
      applyData(next);
    },
    [enqueue, applyData, clearRetry, setPending],
  );

  const resolveMigration = useCallback(
    async (action: "transfer" | "skip") => {
      const offer = migration;
      const u = user;
      if (!offer || !u) return setMigration(null);
      if (action === "transfer") {
        await replaceAllData(offer.localData);
        toast.success(getMessages(offer.localData.preferences.language).migration.done);
      }
      try {
        safeSet(STORAGE_KEYS.migrationHandled(u.id), new Date().toISOString());
      } catch {
        /* ignore */
      }
      setMigration(null);
    },
    [migration, user, replaceAllData],
  );

  const clearGuestData = useCallback(async () => {
    await LocalRepository.guest().clear();
    if (mode === "guest") deactivate();
  }, [mode, deactivate]);

  // Theme: apply class + remember for the no-flash inline script.
  const theme = data.preferences.theme;
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    try {
      safeSet(STORAGE_KEYS.theme, theme);
    } catch {
      /* ignore */
    }
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const language = data.preferences.language;
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<AppContextValue>(
    () => ({
      status, mode, user, data, month, migration, syncPending,
      cloudAvailable: isSupabaseConfigured,
      setMonth, commit, startGuest, startDemo, leave: deactivate, signIn, signUp, signOut, deleteAccount,
      requestPasswordReset, completePasswordReset, openMigration, resolveMigration, replaceAllData, clearGuestData,
    }),
    [status, mode, user, data, month, migration, syncPending, commit, startGuest, startDemo, deactivate, signIn, signUp,
      signOut, deleteAccount, requestPasswordReset, completePasswordReset, openMigration, resolveMigration, replaceAllData,
      clearGuestData],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

export function useT(): Messages {
  return getMessages(useApp().data.preferences.language);
}

export function useDateLocale(): string {
  return DATE_LOCALES[useApp().data.preferences.language];
}

export function useMoney(): (cents: Cents, options?: FormatMoneyOptions) => string {
  const { currency, language } = useApp().data.preferences;
  return useCallback(
    (cents: Cents, options?: FormatMoneyOptions) => formatMoney(cents, currency, { language, ...options }),
    [currency, language],
  );
}
