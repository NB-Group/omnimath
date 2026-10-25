-- Omnimath — Supabase schema
-- Run this once in the Supabase SQL editor (or with `supabase db push`).
--
-- The website uses only the public anon key. Row-level security is enabled on
-- every table and the only anonymous permission is INSERT. Reading rows is
-- restricted to the dashboard / service role, so submissions are private.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Contact messages and coordinator registrations
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 320),
  topic text not null check (char_length(topic) between 1 and 120),
  school text check (char_length(school) <= 200),
  role text check (char_length(role) <= 120),
  message text not null check (char_length(message) between 1 and 6000),
  source text not null default 'website'
);

comment on table public.contact_messages is
  'Website enquiries and school coordinator registrations.';

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists "anon can submit contact messages" on public.contact_messages;
-- (removed: the contact form posts through the Edge Function, which checks
-- Turnstile and rate limits; the database no longer accepts anon inserts)

-- ---------------------------------------------------------------------------
-- Online challenge submissions
-- ---------------------------------------------------------------------------
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  student_name text not null check (char_length(student_name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 320),
  year_level smallint not null check (year_level between 5 and 8),
  school text check (char_length(school) <= 200),
  challenge_number smallint not null check (challenge_number between 1 and 15),
  work_link text check (char_length(work_link) <= 1000),
  notes text check (char_length(notes) <= 4000),
  file_path text,
  file_name text,
  status text not null default 'received' check (status in ('pending', 'received')),
  source text not null default 'website'
);

-- For projects created before the signed-upload flow was added:
alter table public.submissions
  add column if not exists status text not null default 'received';

comment on table public.submissions is
  'Challenge work submitted through the website. Files live in the submissions bucket.';

create index if not exists submissions_created_at_idx
  on public.submissions (created_at desc);

alter table public.submissions enable row level security;

-- Anonymous writes go exclusively through the submit Edge Function
-- (Turnstile + rate limits). The database itself only accepts inserts from
-- logged-in staff; see marking.sql for those policies.

-- ---------------------------------------------------------------------------
-- Private storage bucket for scanned work / PDFs
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions',
  'submissions',
  false,
  10485760, -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Uploads happen through signed upload URLs minted by the Edge Function
-- (service role) or by logged-in staff; no anon storage policy is needed.

-- No select/update/delete policies for anon: only the dashboard or a service
-- role can read or manage the uploaded files.

-- ---------------------------------------------------------------------------
-- Table privileges
--
-- RLS policies decide which rows a role may touch; Postgres still needs the
-- underlying table privilege. New Supabase projects do not grant these by
-- default when DDL is applied through the Management API, so grant them
-- explicitly. anon may only INSERT; the service role owns the backend flow.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant insert on table public.contact_messages to authenticated;
grant insert on table public.submissions to authenticated;

grant all privileges on table public.contact_messages to service_role;
grant all privileges on table public.submissions to service_role;

-- ---------------------------------------------------------------------------
-- Rate limiting
--
-- Turnstile is a signal, not a guarantee. This fixed-window counter gives the
-- Edge Function a cheap per-IP and per-email throttle that survives across
-- function instances. Bucket keys are salted hashes, never raw IPs or emails.
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);

alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;
grant all privileges on table public.rate_limits to service_role;

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_hits integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    return false;
  end if;

  insert into public.rate_limits as rl (bucket, window_start, hits)
  values (p_bucket, v_now, 1)
  on conflict (bucket) do update
    set hits = case
          when rl.window_start < v_now - make_interval(secs => p_window_seconds) then 1
          else rl.hits + 1
        end,
        window_start = case
          when rl.window_start < v_now - make_interval(secs => p_window_seconds) then v_now
          else rl.window_start
        end
  returning rl.hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- Staff accounts, school scoping and marks live in marking.sql (applied on top
-- of this file). Staff sign in through Supabase Auth; there are no password
-- hashes or session tables on our side.



