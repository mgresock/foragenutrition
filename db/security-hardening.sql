-- Forage — security hardening for the `profiles` table.
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- It is safe to re-run. Fixes two browser-exploitable holes:
--   1. Any logged-in user could read EVERY profile (PII + Stripe IDs).
--   2. Any logged-in user could self-grant Pro / reset their AI quota.
--
-- App-side support for this already shipped: friend lookups + friend progress
-- run server-side with the service role, and checkout writes stripe_customer_id
-- with the service role — so locking these down does NOT break any feature.

-- ── 1. Lock profile READS to the owner ───────────────────────────────────────
-- Drops any permissive SELECT policy (e.g. USING (true)) and replaces it with
-- an own-row policy. Service-role code bypasses RLS, so server routes are fine.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.profiles', pol.policyname);
  end loop;
end $$;

create policy "Users read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- ── 2. Block billing / quota tampering (column-level privileges) ─────────────
-- RLS row policies don't restrict WHICH columns a user updates. Postgres column
-- privileges do. We revoke blanket UPDATE, then grant UPDATE back on ONLY the
-- safe, user-editable columns. subscription_tier / ai_requests_* / stripe_* /
-- friend_code are intentionally NOT granted → the browser can't write them.
-- (Service-role code — webhook, subscription.ts, checkout — bypasses this.)
revoke update on public.profiles from anon, authenticated;

grant update (
  display_name, avatar_url, age, height_cm, weight_kg,
  biological_sex, goal, meals_per_week, zip_code, weekly_budget
) on public.profiles to authenticated;

-- NOTE: adjust the column list above if your profiles schema differs. List your
-- actual columns with:
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles' order by 1;

-- ── 3. Verify ────────────────────────────────────────────────────────────────
-- After running, check the policy + grants:
--   select policyname, cmd, qual from pg_policies
--   where tablename = 'profiles';
--   select privilege_type, column_name from information_schema.column_privileges
--   where table_name = 'profiles' and grantee = 'authenticated' order by 2;
--
-- Then, logged in as a normal user in the browser console, confirm BOTH fail:
--   await supabase.from('profiles').select('*')                                  // only your row
--   await supabase.from('profiles').update({subscription_tier:'pro'}).eq('id', MY_ID)  // permission denied
