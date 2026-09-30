"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getCurrentMonthKey } from "@/lib/dates";
import { buildDemoData } from "@/lib/domain/demo";
import { createEmptyData } from "@/lib/domain/factories";
import { hasUserData } from "@/lib/domain/selectors";
import { DATE_LOCALES, getMessages, type Messages } from "@/lib/i18n";
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
  openMigration: () => void;
  resolveMigration: (action: "transfer" | "skip") => Promise<void>;
  replaceAllData: (data: AppData) => Promise<void>;
  clearGuestData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function toUser(u: { id: string; email?: string | null }): User {
  return { id: u.id, email: u.email ?? "" };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [mode, setMode] = useState<AppMode | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<AppData>(createEmptyData);
  const [month, setMonth] = useState<MonthKey>(() => getCurrentMonthKey());
  const [migration, setMigration] = useState<MigrationOffer | null>(null);

  const dataRef = useRef(data);
  const repoRef = useRef<BudgetRepository | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const applyData = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  /** Writes are serialized so the backend always sees them in order. */
  const enqueue = useCallback((task: () => Promise<void>, rethrow = false) => {
    const run = queueRef.current.then(task);
    queueRef.current = run.catch((error) => {
      if (!rethrow) toast.error(errorMessage(error, "Couldn't save your changes."));
    });
    return run;
  }, []);

  const activate = useCallback(
    (nextMode: AppMode, repo: BudgetRepository | null, nextData: AppData, nextUser: User | null = null) => {
      repoRef.current = repo;
      writeMode(nextMode);
      setMode(nextMode);
      setUser(nextUser);
      applyData(nextData);
      setMonth(getCurrentMonthKey());
    },
    [applyData],
  );

  const deactivate = useCallback(() => {
    repoRef.current = null;
    writeMode(null);
    setMode(null);
    setUser(null);
    setMigration(null);
    applyData(createEmptyData());
  }, [applyData]);

  const enterCloud = useCallback(
    async (u: User, offerMigration: boolean) => {
      const client = getSupabaseClient();
      if (!client) throw new Error("Supabase isn't configured.");
      const repo = new SupabaseRepository(client, u.id);
      const cloudData = await repo.load();
      activate("cloud", repo, cloudData, u);
      if (offerMigration && !safeGet(STORAGE_KEYS.migrationHandled(u.id))) {
        const local = LocalRepository.guest().peek();
        if (hasUserData(local)) setMigration({ localData: local!, cloudHasData: hasUserData(cloudData) });
      }
    },
    [activate],
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
      } catch (error) {
        toast.error(errorMessage(error));
      } finally {
        if (!cancelled) setStatus("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activate, enterCloud]);

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
      const repo = repoRef.current;
      if (repo) void enqueue(() => repo.persist(prev, next));
      return true;
    },
    [applyData, enqueue],
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
    const demo = buildDemoData();
    await repo.replaceAll(demo);
    activate("demo", repo, demo);
  }, [activate]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const client = getSupabaseClient();
      if (!client) throw new Error("Supabase isn't configured.");
      const { data: res, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      await enterCloud(toUser(res.user), true);
    },
    [enterCloud],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const client = getSupabaseClient();
      if (!client) throw new Error("Supabase isn't configured.");
      const { data: res, error } = await client.auth.signUp({ email, password });
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
    const client = getSupabaseClient();
    if (!client) return;
    const { error } = await client.rpc("delete_user");
    if (error) throw new Error(error.message);
    await signOut();
  }, [signOut]);

  const openMigration = useCallback(() => {
    const local = LocalRepository.guest().peek();
    if (!hasUserData(local)) {
      toast.info("There's no local data on this device.");
      return;
    }
    setMigration({ localData: local!, cloudHasData: hasUserData(dataRef.current) });
  }, []);

  const resolveMigration = useCallback(
    async (action: "transfer" | "skip") => {
      const offer = migration;
      const u = user;
      if (!offer || !u) return setMigration(null);
      if (action === "transfer") {
        const repo = repoRef.current;
        if (!repo) return;
        await enqueue(() => repo.replaceAll(offer.localData), true);
        applyData(offer.localData);
        toast.success(getMessages(offer.localData.preferences.language).migration.done);
      }
      try {
        safeSet(STORAGE_KEYS.migrationHandled(u.id), new Date().toISOString());
      } catch {
        /* ignore */
      }
      setMigration(null);
    },
    [migration, user, enqueue, applyData],
  );

  const replaceAllData = useCallback(
    async (next: AppData) => {
      const repo = repoRef.current;
      if (repo) await enqueue(() => repo.replaceAll(next), true);
      applyData(next);
    },
    [enqueue, applyData],
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

  const value = useMemo<AppContextValue>(
    () => ({
      status, mode, user, data, month, migration,
      cloudAvailable: isSupabaseConfigured,
      setMonth, commit, startGuest, startDemo, leave: deactivate, signIn, signUp, signOut, deleteAccount,
      openMigration, resolveMigration, replaceAllData, clearGuestData,
    }),
    [status, mode, user, data, month, migration, commit, startGuest, startDemo, deactivate, signIn, signUp, signOut,
      deleteAccount, openMigration, resolveMigration, replaceAllData, clearGuestData],
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
  const currency = useApp().data.preferences.currency;
  return useCallback((cents: Cents, options?: FormatMoneyOptions) => formatMoney(cents, currency, options), [currency]);
}
