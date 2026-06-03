-- Reports for Daily Color Hunt submissions (admin reviews in Supabase dashboard / service role).

create table if not exists public.color_hunt_reports (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.color_hunt_submissions (id) on delete cascade,
  reporter_user_id uuid not null references auth.users (id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'action_taken', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint color_hunt_reports_one_per_reporter unique (submission_id, reporter_user_id)
);

create index if not exists color_hunt_reports_submission_idx on public.color_hunt_reports (submission_id);
create index if not exists color_hunt_reports_status_idx on public.color_hunt_reports (status);

alter table public.color_hunt_reports enable row level security;

drop policy if exists "color_hunt_reports_insert_own" on public.color_hunt_reports;
drop policy if exists "color_hunt_reports_select_none" on public.color_hunt_reports;

-- Authenticated users can file a report; no public read (admins use dashboard / service role).
create policy "color_hunt_reports_insert_own"
  on public.color_hunt_reports for insert
  with check (auth.uid() = reporter_user_id);

create policy "color_hunt_reports_select_none"
  on public.color_hunt_reports for select
  using (false);
