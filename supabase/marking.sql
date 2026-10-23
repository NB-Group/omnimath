-- Omnimath — staff accounts, school scoping and marking
--
-- Companion migration to schema.sql. It introduces:
--   * schools — the list of participating schools
--   * staff   — auth-user accounts: one 'admin' (sees and marks everything)
--               and per-school 'coordinator' accounts (see and mark only
--               their own school's submissions)
--   * marks   — one editable mark per submission (0–10 + comment)
--   * RLS so the browser can query everything with the user's own session:
--     coordinators are scoped to their school by the database, not the UI.
--
-- Apply with: supabase db query --linked --project-ref <ref> -f this-file.sql

-- ---------------------------------------------------------------------------
-- Role helper
--
-- Policies on staff must not select from staff itself (infinite recursion),
-- so role checks go through this security-definer function owned by postgres,
-- which bypasses RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff s
    where s.id = auth.uid() and s.role = 'admin'
  );
$$;

revoke all on function public.is_staff_admin() from public, anon;
grant execute on function public.is_staff_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Schools
-- ---------------------------------------------------------------------------
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 200),
  created_at timestamptz not null default now()
);

comment on table public.schools is 'Participating schools; submissions and coordinator accounts are scoped to these.';

alter table public.schools enable row level security;

-- The public submit form lists school names so students can pick one.
drop policy if exists "schools are publicly readable" on public.schools;
create policy "schools are publicly readable"
  on public.schools
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Staff (admins and school coordinators)
--
-- Rows are written by the staff Edge Function with the service role; the
-- policies here only allow reading.
-- ---------------------------------------------------------------------------
create table if not exists public.staff (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (char_length(email) between 3 and 320),
  name text not null check (char_length(name) between 1 and 200),
  role text not null check (role in ('admin', 'coordinator')),
  school_id uuid references public.schools(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (role = 'admin' or school_id is not null)
);

comment on table public.staff is
  'Staff accounts. id is the auth.users id; coordinators are tied to one school.';

create index if not exists staff_school_id_idx on public.staff (school_id);

alter table public.staff enable row level security;

-- Only the admin role may manage the list.
drop policy if exists "admins manage schools" on public.schools;
create policy "admins manage schools"
  on public.schools
  for all
  to authenticated
  using (
public.is_staff_admin()
  )
  with check (
public.is_staff_admin()
  );


drop policy if exists "staff can read their own row" on public.staff;
create policy "staff can read their own row"
  on public.staff
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "admins can read all staff" on public.staff;
create policy "admins can read all staff"
  on public.staff
  for select
  to authenticated
  using (
public.is_staff_admin()
  );

-- ---------------------------------------------------------------------------
-- Submissions: school scoping
-- ---------------------------------------------------------------------------
alter table public.submissions
  add column if not exists school_id uuid references public.schools(id) on delete set null;

create index if not exists submissions_school_id_idx on public.submissions (school_id);

drop policy if exists "admins read all submissions" on public.submissions;
create policy "admins read all submissions"
  on public.submissions
  for select
  to authenticated
  using (
public.is_staff_admin()
  );

drop policy if exists "coordinators read their school submissions" on public.submissions;
create policy "coordinators read their school submissions"
  on public.submissions
  for select
  to authenticated
  using (
    school_id is not null
    and exists (
      select 1 from public.staff s
      where s.id = auth.uid()
        and s.role = 'coordinator'
        and s.school_id = submissions.school_id
    )
  );

-- ---------------------------------------------------------------------------
-- Marks: one editable mark per submission
-- ---------------------------------------------------------------------------
create table if not exists public.marks (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  score smallint not null check (score between 0 and 10),
  comment text check (char_length(comment) <= 2000),
  awarded_by uuid references auth.users(id) on delete set null,
  awarded_by_name text check (char_length(awarded_by_name) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.marks is 'One mark per submission, out of ten, editable by its author or an admin.';

alter table public.marks enable row level security;

-- A mark is visible to whoever can see the submission it belongs to.
drop policy if exists "staff read marks in scope" on public.marks;
create policy "staff read marks in scope"
  on public.marks
  for select
  to authenticated
  using (
    exists (
      select 1 from public.submissions sub
      where sub.id = marks.submission_id
        and (
          exists (
            select 1 from public.staff a
            where a.id = auth.uid() and a.role = 'admin'
          )
          or (
            sub.school_id is not null
            and exists (
              select 1 from public.staff c
              where c.id = auth.uid()
                and c.role = 'coordinator'
                and c.school_id = sub.school_id
            )
          )
        )
    )
  );

-- Coordinators mark their school's submissions; admins may mark anything.
drop policy if exists "staff write marks in scope" on public.marks;
create policy "staff write marks in scope"
  on public.marks
  for insert
  to authenticated
  with check (
    awarded_by = auth.uid()
    and exists (
      select 1 from public.submissions sub
      where sub.id = marks.submission_id
        and (
          exists (
            select 1 from public.staff a
            where a.id = auth.uid() and a.role = 'admin'
          )
          or (
            sub.school_id is not null
            and exists (
              select 1 from public.staff c
              where c.id = auth.uid()
                and c.role = 'coordinator'
                and c.school_id = sub.school_id
            )
          )
        )
    )
  );

drop policy if exists "staff update marks in scope" on public.marks;
create policy "staff update marks in scope"
  on public.marks
  for update
  to authenticated
  using (
    exists (
      select 1 from public.submissions sub
      where sub.id = marks.submission_id
        and (
          exists (
            select 1 from public.staff a
            where a.id = auth.uid() and a.role = 'admin'
          )
          or (
            sub.school_id is not null
            and exists (
              select 1 from public.staff c
              where c.id = auth.uid()
                and c.role = 'coordinator'
                and c.school_id = sub.school_id
            )
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.submissions sub
      where sub.id = marks.submission_id
        and (
          exists (
            select 1 from public.staff a
            where a.id = auth.uid() and a.role = 'admin'
          )
          or (
            sub.school_id is not null
            and exists (
              select 1 from public.staff c
              where c.id = auth.uid()
                and c.role = 'coordinator'
                and c.school_id = sub.school_id
            )
          )
        )
    )
  );

-- Keep updated_at and the marker stamp fresh on every edit.
create or replace function public.touch_mark()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists marks_touch on public.marks;
create trigger marks_touch
  before update on public.marks
  for each row execute function public.touch_mark();

-- ---------------------------------------------------------------------------
-- Storage: staff can open submission files
--
-- Files are uploaded under "<school_id>/<uuid>" so the first folder names the
-- owning school and the policy can scope listing and signed URLs per role.
-- ---------------------------------------------------------------------------
drop policy if exists "admins read submission files" on storage.objects;
create policy "admins read submission files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'submissions'
    and exists (
      select 1 from public.staff s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists "coordinators read own school files" on storage.objects;
create policy "coordinators read own school files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'submissions'
    and exists (
      select 1 from public.staff s
      where s.id = auth.uid()
        and s.role = 'coordinator'
        and s.school_id::text = (storage.foldername(name))[1]
    )
  );

-- ---------------------------------------------------------------------------
-- Table privileges for the authenticated role
-- ---------------------------------------------------------------------------
grant select on table public.schools to anon, authenticated;
grant insert, update, delete on table public.schools to authenticated;

grant select on table public.staff to authenticated;

grant select on table public.submissions to authenticated;
grant select, insert, update on table public.marks to authenticated;

-- The service role owns the backend flow (new projects do not grant these
-- automatically when DDL is applied through the Management API).
grant all privileges on table public.schools, public.staff, public.marks to service_role;
