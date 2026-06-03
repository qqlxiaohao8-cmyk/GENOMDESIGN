-- Daily Color Hunt: photo submissions per calendar day, upvotes, one vote per user per submission.
-- Uses public bucket `style-images` with paths `{user_id}/color-hunt/{hunt_date}/…` (existing storage policies).

create table if not exists public.color_hunt_submissions (
  id uuid primary key default gen_random_uuid(),
  hunt_date date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  image_url text not null,
  palette jsonb,
  submitter_display_name text,
  created_at timestamptz not null default now(),
  constraint color_hunt_submissions_one_per_user_per_day unique (hunt_date, user_id)
);

create table if not exists public.color_hunt_votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.color_hunt_submissions (id) on delete cascade,
  voter_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint color_hunt_votes_one_per_voter_per_submission unique (submission_id, voter_user_id)
);

create index if not exists color_hunt_submissions_hunt_date_idx on public.color_hunt_submissions (hunt_date desc);
create index if not exists color_hunt_submissions_user_idx on public.color_hunt_submissions (user_id);
create index if not exists color_hunt_votes_submission_idx on public.color_hunt_votes (submission_id);

alter table public.color_hunt_submissions enable row level security;
alter table public.color_hunt_votes enable row level security;

drop policy if exists "color_hunt_submissions_select_all" on public.color_hunt_submissions;
drop policy if exists "color_hunt_submissions_insert_own" on public.color_hunt_submissions;

create policy "color_hunt_submissions_select_all"
  on public.color_hunt_submissions for select
  using (true);

create policy "color_hunt_submissions_insert_own"
  on public.color_hunt_submissions for insert
  with check (auth.uid() = user_id);

drop policy if exists "color_hunt_votes_select_all" on public.color_hunt_votes;
drop policy if exists "color_hunt_votes_insert_own" on public.color_hunt_votes;

create policy "color_hunt_votes_select_all"
  on public.color_hunt_votes for select
  using (true);

create policy "color_hunt_votes_insert_own"
  on public.color_hunt_votes for insert
  with check (auth.uid() = voter_user_id);

-- Reject self-votes at database level
create or replace function public.color_hunt_prevent_self_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.color_hunt_submissions s
    where s.id = new.submission_id and s.user_id = new.voter_user_id
  ) then
    raise exception 'self_vote_not_allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_color_hunt_vote_no_self on public.color_hunt_votes;
create trigger trg_color_hunt_vote_no_self
  before insert on public.color_hunt_votes
  for each row execute function public.color_hunt_prevent_self_vote();

-- Optional: Supabase Dashboard → Database → Replication → enable realtime for color_hunt_votes
