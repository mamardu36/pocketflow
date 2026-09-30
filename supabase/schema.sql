-- =====================================================================
-- PocketFlow — Supabase schema
-- Run once in Supabase Dashboard → SQL Editor (safe to re-run).
-- All money columns are integer cents (bigint). €32.50 = 3250.
-- Every row belongs to auth.uid(); Row Level Security enforces it.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles (1 row per auth user)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  display_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- user_preferences (1 row per user)
-- ---------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  currency    text not null default 'EUR' check (currency in ('EUR', 'USD', 'GBP', 'CHF', 'CAD')),
  theme       text not null default 'system' check (theme in ('system', 'light', 'dark')),
  language    text not null default 'en' check (language in ('en', 'fr')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- savings_goals (persist across months; balance is derived)
-- ---------------------------------------------------------------------
create table if not exists public.savings_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 80),
  emoji          text not null default '🐷',
  color          text not null default 'teal',
  target_amount  bigint check (target_amount is null or target_amount > 0),
  initial_amount bigint not null default 0 check (initial_amount >= 0),
  target_date    date,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, user_id)
);

-- ---------------------------------------------------------------------
-- budgets (one per user per month)
-- ---------------------------------------------------------------------
create table if not exists public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  year        smallint not null check (year between 1970 and 9999),
  month       smallint not null check (month between 1 and 12),
  amount      bigint not null check (amount >= 0),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, year, month),
  unique (id, user_id)
);

-- ---------------------------------------------------------------------
-- budget_categories (month-scoped allocations: history stays immutable)
-- ---------------------------------------------------------------------
create table if not exists public.budget_categories (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  budget_id       uuid not null,
  name            text not null check (char_length(name) between 1 and 80),
  emoji           text not null default '📦',
  type            text not null check (type in ('fixed', 'variable', 'savings')),
  color           text not null default 'slate',
  assigned        bigint not null default 0 check (assigned >= 0),
  recurring       boolean not null default false,
  savings_goal_id uuid,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, user_id),
  -- Composite FKs guarantee a row can only point at the same user's parent rows.
  foreign key (budget_id, user_id) references public.budgets (id, user_id) on delete cascade,
  foreign key (savings_goal_id, user_id) references public.savings_goals (id, user_id) on delete set null (savings_goal_id),
  check (type = 'savings' or savings_goal_id is null)
);

-- ---------------------------------------------------------------------
-- transactions (expenses)
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  budget_id   uuid not null,
  category_id uuid not null,
  amount      bigint not null check (amount > 0),
  description text not null default '' check (char_length(description) <= 200),
  date        date not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (budget_id, user_id) references public.budgets (id, user_id) on delete cascade,
  foreign key (category_id, user_id) references public.budget_categories (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------
-- savings_transactions (manual deposits/withdrawals, unused money moved)
-- ---------------------------------------------------------------------
create table if not exists public.savings_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id     uuid not null,
  budget_id   uuid,
  amount      bigint not null check (amount <> 0),
  note        text not null default '' check (char_length(note) <= 200),
  date        date not null,
  source      text not null default 'manual' check (source in ('manual', 'unused')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.savings_goals (id, user_id) on delete cascade,
  foreign key (budget_id, user_id) references public.budgets (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
create index if not exists budgets_user_period_idx       on public.budgets (user_id, year desc, month desc);
create index if not exists categories_user_idx           on public.budget_categories (user_id);
create index if not exists categories_budget_idx         on public.budget_categories (budget_id, sort_order);
create index if not exists categories_goal_idx           on public.budget_categories (savings_goal_id) where savings_goal_id is not null;
create index if not exists transactions_user_idx         on public.transactions (user_id);
create index if not exists transactions_budget_date_idx  on public.transactions (budget_id, date desc);
create index if not exists transactions_category_idx     on public.transactions (category_id);
create index if not exists goals_user_idx                on public.savings_goals (user_id, sort_order);
create index if not exists savings_tx_user_idx           on public.savings_transactions (user_id);
create index if not exists savings_tx_goal_date_idx      on public.savings_transactions (goal_id, date desc);
create index if not exists savings_tx_budget_idx         on public.savings_transactions (budget_id) where budget_id is not null;

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles', 'user_preferences', 'savings_goals', 'budgets', 'budget_categories', 'transactions', 'savings_transactions']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- New user → profile + default preferences
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  insert into public.user_preferences (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row Level Security: users only ever see and write their own rows
-- ---------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.user_preferences     enable row level security;
alter table public.savings_goals        enable row level security;
alter table public.budgets              enable row level security;
alter table public.budget_categories    enable row level security;
alter table public.transactions         enable row level security;
alter table public.savings_transactions enable row level security;

-- profiles: key column is `id`
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Every other table: key column is `user_id`
do $$
declare t text;
begin
  foreach t in array array['user_preferences', 'savings_goals', 'budgets', 'budget_categories', 'transactions', 'savings_transactions']
  loop
    execute format('drop policy if exists "%s_select_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%I', t, t);
    execute format('create policy "%s_select_own" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t, t);
    execute format('create policy "%s_insert_own" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t, t);
    execute format('create policy "%s_update_own" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t, t);
    execute format('create policy "%s_delete_own" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t, t);
  end loop;
end;
$$;

-- Nothing for anonymous visitors.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------------------------------------------------------------------
-- Account deletion (called from Settings → Delete account)
-- Deletes the caller only; all their rows cascade.
-- ---------------------------------------------------------------------
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
