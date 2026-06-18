-- Forage — performance indexes.
-- Run in the Supabase SQL Editor (safe to re-run; uses IF NOT EXISTS).
--
-- Why: PostgreSQL auto-indexes primary keys and UNIQUE constraints, but NOT
-- foreign-key columns. Every per-user query filters on user_id (and usually a
-- date range), so without these indexes Postgres does a sequential scan of the
-- whole table. These composite indexes make the app's hot queries index-only.
--
-- For very large existing tables, add CONCURRENTLY (and run each statement on
-- its own, outside a transaction) to avoid write locks. These tables are small,
-- so plain CREATE INDEX is fine.

-- meal_logs — by far the hottest table: today's log, 7-day macros, 30-day
-- streak, friend progress, AI insights all filter user_id + logged_at range
-- and order by logged_at.
create index if not exists idx_meal_logs_user_logged_at
  on public.meal_logs (user_id, logged_at desc);

-- water_logs — today's hydration total (user_id + logged_at range).
create index if not exists idx_water_logs_user_logged_at
  on public.water_logs (user_id, logged_at desc);

-- supplements — active stack lookup (user_id, active) ordered by created_at.
create index if not exists idx_supplements_user_active
  on public.supplements (user_id, active, created_at);

-- receipts — receipt history (user_id ordered by scanned_at).
create index if not exists idx_receipts_user_scanned_at
  on public.receipts (user_id, scanned_at desc);

-- friendships — friend progress reads both directions + status filter.
create index if not exists idx_friendships_requester
  on public.friendships (requester_id, status);
create index if not exists idx_friendships_addressee
  on public.friendships (addressee_id, status);

-- group_members — "my groups" (user_id) and member counts (group_id).
create index if not exists idx_group_members_user
  on public.group_members (user_id);
create index if not exists idx_group_members_group
  on public.group_members (group_id);

-- nutrition_groups — join-by-code lookup. (Make it UNIQUE if codes must be
-- unique — that also creates the index.)
create index if not exists idx_nutrition_groups_invite_code
  on public.nutrition_groups (invite_code);

-- Verify what exists:
--   select tablename, indexname from pg_indexes
--   where schemaname = 'public' order by tablename, indexname;
