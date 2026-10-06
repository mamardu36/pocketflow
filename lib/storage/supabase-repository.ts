import type { SupabaseClient } from "@supabase/supabase-js";
import { diffData } from "@/lib/domain/diff";
import { STORAGE_KEYS, safeGet, safeRemove, safeSet } from "@/lib/storage/keys";
import type { BudgetRepository } from "@/lib/storage/repository";
import { parseAppData } from "@/lib/storage/schema";
import * as m from "@/lib/supabase/mappers";
import type { AppData } from "@/types";

const PAGE_SIZE = 1000;
const CHUNK_SIZE = 500;

type Table = "budgets" | "budget_categories" | "transactions" | "savings_goals" | "savings_transactions";

/**
 * Cloud storage. Writes are diff-based (only changed rows are sent).
 * Every change is cached locally first, so the app opens offline and changes made offline
 * are pushed later (see the sync logic in hooks/use-app.tsx).
 */
export class SupabaseRepository implements BudgetRepository {
  readonly kind = "supabase" as const;

  constructor(private readonly client: SupabaseClient, private readonly userId: string) {}

  /** Server state only. Throws when offline. */
  async fetchRemote(): Promise<AppData> {
    const [budgets, categories, transactions, goals, savingsTx, prefs] = await Promise.all([
      this.selectAll<m.BudgetRow>("budgets"),
      this.selectAll<m.CategoryRow>("budget_categories"),
      this.selectAll<m.TransactionRow>("transactions"),
      this.selectAll<m.GoalRow>("savings_goals"),
      this.selectAll<m.SavingsTransactionRow>("savings_transactions"),
      this.client.from("user_preferences").select("*").eq("user_id", this.userId).maybeSingle(),
    ]);
    if (prefs.error) throw new Error(prefs.error.message);
    return parseAppData({
      budgets: budgets.map(m.budgetFromRow),
      categories: categories.map(m.categoryFromRow),
      transactions: transactions.map(m.transactionFromRow),
      savingsGoals: goals.map(m.goalFromRow),
      savingsTransactions: savingsTx.map(m.savingsTxFromRow),
      preferences: prefs.data ? m.preferencesFromRow(prefs.data as m.PreferencesRow) : undefined,
    });
  }

  async load(): Promise<AppData> {
    return (await this.loadForSync()).local;
  }

  /**
   * `local` is what the app should show; `synced` is the last state known to be on the server (null if unknown).
   * Unsynced local changes (saved while offline) win over the server copy and get pushed on the next flush.
   */
  async loadForSync(): Promise<{ local: AppData; synced: AppData | null }> {
    const cached = this.readCache();
    const pending = this.hasPendingChanges();
    let remote: AppData | null = null;
    try {
      remote = await this.fetchRemote();
    } catch (error) {
      if (!cached) throw error;
    }
    if (pending && cached) return { local: cached, synced: remote };
    if (remote) {
      this.writeCache(remote);
      return { local: remote, synced: remote };
    }
    return { local: cached!, synced: null };
  }

  hasPendingChanges(): boolean {
    return safeGet(STORAGE_KEYS.cloudPending(this.userId)) !== null;
  }

  async persist(prev: AppData, next: AppData): Promise<void> {
    // Save locally first: if the network fails, nothing typed by the user is lost.
    this.writeCache(next);
    this.setPending(true);
    const c = diffData(prev, next);
    const u = this.userId;
    // Parents first for inserts, children first for deletes.
    await this.upsert("savings_goals", c.savingsGoals.upserts.map((g) => m.goalToRow(g, u)));
    await this.upsert("budgets", c.budgets.upserts.map((b) => m.budgetToRow(b, u)));
    await this.upsert("budget_categories", c.categories.upserts.map((x) => m.categoryToRow(x, u)));
    await this.upsert("transactions", c.transactions.upserts.map((t) => m.transactionToRow(t, u)));
    await this.upsert("savings_transactions", c.savingsTransactions.upserts.map((s) => m.savingsTxToRow(s, u)));
    await this.remove("savings_transactions", c.savingsTransactions.deletes);
    await this.remove("transactions", c.transactions.deletes);
    await this.remove("budget_categories", c.categories.deletes);
    await this.remove("budgets", c.budgets.deletes);
    await this.remove("savings_goals", c.savingsGoals.deletes);
    if (c.preferencesChanged) await this.savePreferences(next);
    this.setPending(false);
  }

  /** Used by guest → account migration and imports. Deleting parents cascades to children. */
  async replaceAll(data: AppData): Promise<void> {
    for (const table of ["budgets", "savings_goals"] as const) {
      const { error } = await this.client.from(table).delete().eq("user_id", this.userId);
      if (error) throw new Error(error.message);
    }
    const u = this.userId;
    await this.upsert("savings_goals", data.savingsGoals.map((g) => m.goalToRow(g, u)));
    await this.upsert("budgets", data.budgets.map((b) => m.budgetToRow(b, u)));
    await this.upsert("budget_categories", data.categories.map((x) => m.categoryToRow(x, u)));
    await this.upsert("transactions", data.transactions.map((t) => m.transactionToRow(t, u)));
    await this.upsert("savings_transactions", data.savingsTransactions.map((s) => m.savingsTxToRow(s, u)));
    await this.savePreferences(data);
    this.writeCache(data);
    this.setPending(false);
  }

  async clear(): Promise<void> {
    safeRemove(STORAGE_KEYS.cloudCache(this.userId));
    safeRemove(STORAGE_KEYS.cloudPending(this.userId));
  }

  private setPending(pending: boolean): void {
    try {
      if (pending) safeSet(STORAGE_KEYS.cloudPending(this.userId), new Date().toISOString());
      else safeRemove(STORAGE_KEYS.cloudPending(this.userId));
    } catch {
      /* best effort */
    }
  }

  private async selectAll<T>(table: Table): Promise<T[]> {
    const rows: T[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await this.client
        .from(table).select("*").eq("user_id", this.userId)
        .order("created_at").order("id").range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      rows.push(...((data ?? []) as T[]));
      if (!data || data.length < PAGE_SIZE) return rows;
    }
  }

  private async upsert(table: Table, rows: object[]): Promise<void> {
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const { error } = await this.client.from(table).upsert(rows.slice(i, i + CHUNK_SIZE), { onConflict: "id" });
      if (error) throw new Error(`Sync failed (${table}): ${error.message}`);
    }
  }

  private async remove(table: Table, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.client.from(table).delete().eq("user_id", this.userId).in("id", ids);
    if (error) throw new Error(`Sync failed (${table}): ${error.message}`);
  }

  private async savePreferences(data: AppData): Promise<void> {
    const { error } = await this.client.from("user_preferences").upsert(m.preferencesToRow(data.preferences, this.userId), { onConflict: "user_id" });
    if (error) throw new Error(`Sync failed (preferences): ${error.message}`);
  }

  private readCache(): AppData | null {
    const raw = safeGet(STORAGE_KEYS.cloudCache(this.userId));
    if (!raw) return null;
    try {
      return parseAppData(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  private writeCache(data: AppData): void {
    try {
      safeSet(STORAGE_KEYS.cloudCache(this.userId), JSON.stringify(data));
    } catch {
      /* cache is best effort */
    }
  }
}
