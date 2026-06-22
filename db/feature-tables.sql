-- Forage — schema for the adaptive-targets / weight-trend / food-cache features.
-- Run in the Supabase SQL Editor. Safe to re-run (IF NOT EXISTS everywhere).
-- The app degrades gracefully until this is applied (features quietly no-op).

-- ── Personalized targets + activity level on onboarding ──────────────────────
alter table public.onboarding add column if not exists activity_level      text default 'moderate';
alter table public.onboarding add column if not exists daily_calorie_target int;
alter table public.onboarding add column if not exists protein_target       int;
alter table public.onboarding add column if not exists carbs_target         int;
alter table public.onboarding add column if not exists fat_target           int;
alter table public.onboarding add column if not exists targets_updated_at   timestamptz;

-- ── Bodyweight log (drives adaptive targets + Insights trend) ────────────────
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  logged_at timestamptz default now() not null,
  weight_kg numeric not null
);
alter table public.weight_logs enable row level security;
do $$ begin
  create policy "own weight logs" on public.weight_logs for all
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
create index if not exists idx_weight_logs_user_logged on public.weight_logs (user_id, logged_at desc);

-- ── Saved / recent / favorite foods (instant re-log) ─────────────────────────
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  brand text,
  calories int not null,
  protein_g numeric default 0,
  carbs_g numeric default 0,
  fat_g numeric default 0,
  nutrition_meta jsonb,
  barcode text,
  favorite boolean default false,
  last_used timestamptz default now(),
  use_count int default 1,
  created_at timestamptz default now()
);
alter table public.foods enable row level security;
do $$ begin
  create policy "own foods" on public.foods for all
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
create index if not exists idx_foods_user_lastused on public.foods (user_id, last_used desc);
create unique index if not exists uq_foods_user_key on public.foods (user_id, lower(name), lower(coalesce(brand, '')));

-- ── Web-push subscriptions (reminders) ──────────────────────────────────────
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);
alter table public.push_subscriptions enable row level security;
do $$ begin
  create policy "own push subs" on public.push_subscriptions for all
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
create index if not exists idx_push_subs_user on public.push_subscriptions (user_id);

-- ── Saved meal templates (reusable crafted meals) ───────────────────────────
create table if not exists public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  calories int not null,
  protein_g numeric default 0,
  carbs_g numeric default 0,
  fat_g numeric default 0,
  nutrition_meta jsonb,
  created_at timestamptz default now()
);
alter table public.meal_templates enable row level security;
do $$ begin
  create policy "own meal templates" on public.meal_templates for all
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
create index if not exists idx_meal_templates_user on public.meal_templates (user_id, created_at desc);

-- ── Atomic AI-quota increment (closes the read-then-write race) ──────────────
-- Returns whether the request is allowed and the new monthly count. Resets the
-- counter when a new month has started. SECURITY DEFINER so it runs with the
-- table owner's rights (service role calls it; bypasses column locks).
create or replace function public.increment_ai_usage(p_user_id uuid, p_month_start timestamptz, p_limit int)
returns table(allowed boolean, used int)
language plpgsql security definer as $$
declare cur int;
begin
  update public.profiles
    set ai_requests_month = 0, ai_requests_reset_at = p_month_start
    where id = p_user_id and (ai_requests_reset_at is null or ai_requests_reset_at < p_month_start);

  select coalesce(ai_requests_month, 0) into cur from public.profiles where id = p_user_id for update;

  if cur >= p_limit then
    return query select false, cur;
  else
    update public.profiles set ai_requests_month = cur + 1 where id = p_user_id;
    return query select true, cur + 1;
  end if;
end; $$;
