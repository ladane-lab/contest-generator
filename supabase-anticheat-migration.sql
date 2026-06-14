-- ─── Anti-cheat DB migration ─────────────────────────────────────────────────
-- Run this in your Supabase SQL Editor ONCE to enable the anti-cheat features.

-- 1. Add is_flagged column to participants (tracks if admin should review them)
alter table participants
  add column if not exists is_flagged boolean default false;

-- 2. Add tab_switches column for quick reporting on leaderboard/admin view
alter table participants
  add column if not exists tab_switches integer default 0;

-- 3. Create cheat_logs table (full event log per participant)
create table if not exists cheat_logs (
  id            uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  event_type    text not null,   -- e.g. 'tab_switch', 'large_paste_blocked'
  detail        text default '',
  occurred_at   timestamptz default now()
);

-- 4. RLS: open access (same pattern as rest of schema)
alter table cheat_logs enable row level security;
create policy "allow_all_cheat_logs" on cheat_logs for all using (true) with check (true);

-- 5. Enable realtime on cheat_logs so admin can monitor live
alter publication supabase_realtime add table cheat_logs;
