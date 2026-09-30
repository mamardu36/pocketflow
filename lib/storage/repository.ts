import type { AppData } from "@/types";

/**
 * The UI only talks to this interface. Guest/demo → LocalRepository, account → SupabaseRepository.
 * `persist` receives the previous and next state so implementations can sync only what changed.
 */
export interface BudgetRepository {
  readonly kind: "local" | "supabase";
  load(): Promise<AppData>;
  persist(prev: AppData, next: AppData): Promise<void>;
  replaceAll(data: AppData): Promise<void>;
  clear(): Promise<void>;
}
