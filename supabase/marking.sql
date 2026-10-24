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

-- The console reads contact messages with the signed-in admin's own session.
drop policy if exists "admins read contact messages" on public.contact_messages;
create policy "admins read contact messages"
  on public.contact_messages
  for select
  to authenticated
  using (public.is_staff_admin());

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

-- Schools are derived from coordinators: once a school has no staff, no
-- unexpired invite and no submission, it disappears by itself.
create or replace function public.cleanup_empty_schools()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.schools s
  where not exists (select 1 from public.staff st where st.school_id = s.id)
    and not exists (
      select 1 from public.staff_invites i
      where i.school_id = s.id
        and i.used_at is null
        and i.expires_at > now()
    )
    and not exists (
      select 1 from public.submissions sub where sub.school_id = s.id
    );
  return null;
end;
$$;

revoke all on function public.cleanup_empty_schools() from public, anon, authenticated;

drop trigger if exists staff_cleanup_empty_schools on public.staff;
create trigger staff_cleanup_empty_schools
  after delete on public.staff
  for each row execute function public.cleanup_empty_schools();

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
    and public.is_staff_admin()
  );

-- Admins may also remove files (e.g. cleaning up test data); the storage
-- API refuses direct table deletes, so this is the supported path.
drop policy if exists "admins delete submission files" on storage.objects;
create policy "admins delete submission files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'submissions'
    and public.is_staff_admin()
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
-- Coordinator invites
--
-- Admins generate one-time codes tied to a school; coordinators use them on
-- the public /register page to create their own account. Redemption goes
-- through the staff Edge Function (service role), so anonymous visitors can
-- never read or guess invite rows.
-- ---------------------------------------------------------------------------
create table if not exists public.staff_invites (
  code text primary key check (char_length(code) = 12),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null
);

comment on table public.staff_invites is
  'One-time coordinator registration codes, one school each, admin-generated.';

create index if not exists staff_invites_school_id_idx on public.staff_invites (school_id);

alter table public.staff_invites enable row level security;

drop policy if exists "admins manage invites" on public.staff_invites;
create policy "admins manage invites"
  on public.staff_invites
  for all
  to authenticated
  using (public.is_staff_admin())
  with check (public.is_staff_admin());

-- ---------------------------------------------------------------------------
-- Coordinator registration applications
--
-- Coordinators register themselves on the public /register page and type
-- their school's name; the admin's approval creates the school (or reuses a
-- same-named one) and links the staff row. The auth account exists from
-- registration, but the console only admits accounts with a staff row, so
-- pending and rejected applicants have no access to anything.
-- ---------------------------------------------------------------------------
drop table if exists public.staff_applications;

create table if not exists public.staff_applications (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid references auth.users(id) on delete set null,
  email text not null unique check (char_length(email) between 3 and 320),
  name text not null check (char_length(name) between 1 and 200),
  school_name text not null check (char_length(school_name) between 1 and 200),
  message text check (char_length(message) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

comment on table public.staff_applications is
  'Self-registered coordinator accounts awaiting admin approval, with a typed school name.';

create index if not exists staff_applications_status_idx on public.staff_applications (status);

alter table public.staff_applications enable row level security;

drop policy if exists "anyone can submit an application" on public.staff_applications;
create policy "anyone can submit an application"
  on public.staff_applications
  for insert
  to anon, authenticated
  with check (status = 'pending');

drop policy if exists "admins read applications" on public.staff_applications;
create policy "admins read applications"
  on public.staff_applications
  for select
  to authenticated
  using (public.is_staff_admin());

drop policy if exists "applicants read their own application" on public.staff_applications;
create policy "applicants read their own application"
  on public.staff_applications
  for select
  to authenticated
  using (auth_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Table privileges for the authenticated role
-- ---------------------------------------------------------------------------
grant select on table public.schools to anon, authenticated;
grant insert, update, delete on table public.schools to authenticated;

grant select on table public.staff to authenticated;

grant select on table public.contact_messages to authenticated;
grant select on table public.submissions to authenticated;
grant select, insert, update on table public.marks to authenticated;

grant select, insert, update, delete on table public.staff_invites to authenticated;
grant insert, select on table public.staff_applications to authenticated;

-- The service role owns the backend flow (new projects do not grant these
-- automatically when DDL is applied through the Management API).
grant all privileges on table public.schools, public.staff, public.marks,
  public.staff_invites, public.staff_applications to service_role;
