import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addTransaction } from "@/lib/domain/actions";
import { STORAGE_KEYS } from "@/lib/storage/keys";
import { SupabaseRepository } from "@/lib/storage/supabase-repository";
import { SEPT_2026, categoryByName, sampleMonth } from "./helpers";

/** Minimal in-memory stand-in for the Supabase tables, with an on/off network switch. */
function fakeSupabase() {
  const tables = new Map<string, Map<string, Record<string, unknown>>>();
  const table = (name: string) => tables.get(name) ?? tables.set(name, new Map()).get(name)!;
  const state = { online: true, writes: 0 };
  const net = <T,>(value: T) => (state.online ? Promise.resolve(value) : Promise.reject(new TypeError("Load failed")));

  const client = {
    from(name: string) {
      const rows = table(name);
      const keyOf = (r: Record<string, unknown>) => String(name === "user_preferences" ? r.user_id : r.id);
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        range: () => net({ data: [...rows.values()], error: null }),
        maybeSingle: () => net({ data: [...rows.values()][0] ?? null, error: null }),
      };
      return {
        ...query,
        upsert: (input: Record<string, unknown> | Record<string, unknown>[]) => {
          if (!state.online) return Promise.reject(new TypeError("Load failed"));
          for (const r of Array.isArray(input) ? input : [input]) rows.set(keyOf(r), r);
          state.writes += Array.isArray(input) ? input.length : 1;
          return Promise.resolve({ error: null });
        },
        delete: () => ({
          eq: () => ({
            in: (_col: string, ids: string[]) => {
              if (!state.online) return Promise.reject(new TypeError("Load failed"));
              ids.forEach((id) => rows.delete(id));
              return Promise.resolve({ error: null });
            },
          }),
        }),
      };
    },
  };
  return { client: client as unknown as SupabaseClient, state, tables };
}

const storage = new Map<string, string>();
beforeEach(() => {
  storage.clear();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    },
  };
});

describe("offline changes in account mode", () => {
  it("keeps an expense added offline and pushes it when back online", async () => {
    const { client, state, tables } = fakeSupabase();
    const repo = new SupabaseRepository(client, "user-1");
    const initial = sampleMonth();
    await repo.replaceAll(initial);

    // Offline: the save fails, but the expense is kept on the device and flagged as pending.
    state.online = false;
    const groceries = categoryByName(initial, SEPT_2026, "Groceries");
    const withExpense = addTransaction(initial, { categoryId: groceries.id, amount: 3250, description: "Carrefour", date: "2026-09-12" });
    await expect(repo.persist(initial, withExpense)).rejects.toThrow();
    expect(repo.hasPendingChanges()).toBe(true);
    expect(storage.get(STORAGE_KEYS.cloudCache("user-1"))).toContain("Carrefour");
    expect(tables.get("transactions")?.size ?? 0).toBe(0);

    // App reopened while still offline: the local copy is shown.
    const offline = await repo.loadForSync();
    expect(offline.local.transactions.map((t) => t.description)).toEqual(["Carrefour"]);
    expect(offline.synced).toBeNull();

    // Back online: the local copy still wins over the (older) server copy…
    state.online = true;
    const reopened = await repo.loadForSync();
    expect(reopened.local.transactions).toHaveLength(1);
    expect(reopened.synced?.transactions).toHaveLength(0);

    // …and only the missing expense is sent, not the whole dataset.
    state.writes = 0;
    await repo.persist(reopened.synced!, reopened.local);
    expect(state.writes).toBe(1);
    expect(tables.get("transactions")?.size).toBe(1);
    expect(repo.hasPendingChanges()).toBe(false);

    // From now on the server copy is used again.
    const fresh = await repo.loadForSync();
    expect(fresh.synced?.transactions).toHaveLength(1);
  });

  it("opens from the cache when offline with nothing pending", async () => {
    const { client, state } = fakeSupabase();
    const repo = new SupabaseRepository(client, "user-2");
    await repo.replaceAll(sampleMonth());
    state.online = false;
    const { local, synced } = await repo.loadForSync();
    expect(local.budgets).toHaveLength(1);
    expect(synced).toBeNull();
    expect(repo.hasPendingChanges()).toBe(false);
  });

  it("sign-out clears the cache and the pending flag", async () => {
    const { client, state } = fakeSupabase();
    const repo = new SupabaseRepository(client, "user-3");
    const data = sampleMonth();
    await repo.replaceAll(data);
    state.online = false;
    await repo.persist(sampleMonth(), data).catch(() => undefined);
    await repo.clear();
    expect(repo.hasPendingChanges()).toBe(false);
    expect(storage.has(STORAGE_KEYS.cloudCache("user-3"))).toBe(false);
  });
});
