-- Run this SQL in Supabase SQL Editor (https://supabase.com/dashboard -> SQL Editor)

create table if not exists settings (
  key text primary key,
  value text
);

-- Initialize with default event name
insert into settings (key, value) 
values ('event_name', 'Decode to Code') 
on conflict (key) do nothing;

-- Enable RLS
alter table settings enable row level security;

-- Allow all users to read settings
create policy "allow_read_settings" on settings for select using (true);

-- Allow admins to update settings (In a real app, this should be restricted to admin roles)
create policy "allow_all_settings" on settings for all using (true) with check (true);
