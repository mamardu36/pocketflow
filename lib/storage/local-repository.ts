import { createEmptyData } from "@/lib/domain/factories";
import { STORAGE_KEYS, safeGet, safeRemove, safeSet } from "@/lib/storage/keys";
import type { BudgetRepository } from "@/lib/storage/repository";
import { parseAppData } from "@/lib/storage/schema";
import type { AppData } from "@/types";

/** Browser storage (works fully offline). One key holds the whole dataset. */
export class LocalRepository implements BudgetRepository {
  readonly kind = "local" as const;

  constructor(private readonly key: string) {}

  static guest(): LocalRepository {
    return new LocalRepository(STORAGE_KEYS.guestData);
  }

  static demo(): LocalRepository {
    return new LocalRepository(STORAGE_KEYS.demoData);
  }

  /** Synchronous read, used to detect guest data before migration. */
  peek(): AppData | null {
    const raw = safeGet(this.key);
    if (!raw) return null;
    try {
      return parseAppData(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async load(): Promise<AppData> {
    return this.peek() ?? createEmptyData();
  }

  async persist(_prev: AppData, next: AppData): Promise<void> {
    this.write(next);
  }

  async replaceAll(data: AppData): Promise<void> {
    this.write(data);
  }

  async clear(): Promise<void> {
    safeRemove(this.key);
  }

  private write(data: AppData): void {
    try {
      safeSet(this.key, JSON.stringify(data));
    } catch {
      throw new Error("Couldn't save on this device. Browser storage may be full or disabled.");
    }
  }
}
