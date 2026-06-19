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
-- privileges do. We revoke blanket UPDATE, then grant UPDATE back on every
-- column EXCEPT the protected billing/quota ones — discovered dynamically from
-- the live schema so this works no matter which profile columns you actually
-- have. The protected columns are never granted → the browser can't write them.
-- (Service-role code — webhook, subscription.ts, checkout — bypasses this.)
do $$
declare safe_cols text;
begin
  select string_agg(format('%I', column_name), ', ')
  into safe_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name not in (
      'id',
      'created_at',
      'subscription_tier',
      'ai_requests_month',
      'ai_requests_reset_at',
      'stripe_customer_id',
      'stripe_subscription_id',
      'friend_code'
    );

  execute 'revoke update on public.profiles from anon, authenticated';
  execute format('grant update (%s) on public.profiles to authenticated', safe_cols);
end $$;

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
