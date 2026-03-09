-- Run this SQL in Supabase SQL Editor (https://supabase.com/dashboard -> SQL Editor)

-- CONTESTS
create table if not exists contests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text default '',
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- PROBLEMS
create table if not exists problems (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid references contests(id) on delete cascade,
  title text not null,
  statement text not null,
  input_format text default '',
  output_format text default '',
  constraints text default '',
  points integer default 100,
  time_limit_ms integer default 2000,
  sample_input text default '',
  sample_output text default '',
  order_index integer default 0
);

-- TEST CASES
create table if not exists test_cases (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid references problems(id) on delete cascade,
  input text not null,
  expected_output text not null,
  is_hidden boolean default false
);

-- PARTICIPANTS
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid references contests(id) on delete cascade,
  name text not null,
  college text not null,
  joined_at timestamptz default now()
);

-- SUBMISSIONS
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  problem_id uuid references problems(id),
  language text not null,
  code text not null,
  verdict text default 'PENDING',
  score integer default 0,
  runtime_ms integer,
  submitted_at timestamptz default now()
);

-- Enable Realtime on submissions and participants
alter publication supabase_realtime add table submissions;
alter publication supabase_realtime add table participants;

-- RLS: allow anonymous read/insert (open contest, no auth)
alter table contests enable row level security;
alter table problems enable row level security;
alter table test_cases enable row level security;
alter table participants enable row level security;
alter table submissions enable row level security;

create policy "allow_all_contests" on contests for all using (true) with check (true);
create policy "allow_all_problems" on problems for all using (true) with check (true);
create policy "allow_all_test_cases" on test_cases for all using (true) with check (true);
create policy "allow_all_participants" on participants for all using (true) with check (true);
create policy "allow_all_submissions" on submissions for all using (true) with check (true);
