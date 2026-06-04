-- 每日一色：挑战色卡投稿池、每日 5 票投票、凌晨结算 Top3 → 色海「每日色卡」标签

create table if not exists public.daily_palette_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  style_id uuid not null references public.styles (id) on delete cascade,
  title text not null,
  palette jsonb not null,
  image_url text not null,
  tags jsonb not null default '[]'::jsonb,
  daily_anchor_hex text,
  winner_rank smallint,
  created_at timestamptz not null default now(),
  constraint daily_palette_submissions_one_per_user_per_day unique (challenge_date, user_id)
);

create table if not exists public.daily_palette_votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.daily_palette_submissions (id) on delete cascade,
  voter_user_id uuid not null references auth.users (id) on delete cascade,
  challenge_date date not null,
  created_at timestamptz not null default now(),
  constraint daily_palette_votes_one_per_voter_per_sub unique (submission_id, voter_user_id)
);

create table if not exists public.daily_palette_tallies (
  challenge_date date primary key,
  tallied_at timestamptz not null default now(),
  winner_submission_ids uuid[] not null default '{}'
);

create index if not exists daily_palette_submissions_date_idx
  on public.daily_palette_submissions (challenge_date desc, created_at asc);
create index if not exists daily_palette_votes_date_voter_idx
  on public.daily_palette_votes (challenge_date, voter_user_id);
create index if not exists daily_palette_votes_submission_idx
  on public.daily_palette_votes (submission_id);

alter table public.daily_palette_submissions enable row level security;
alter table public.daily_palette_votes enable row level security;
alter table public.daily_palette_tallies enable row level security;

drop policy if exists "daily_palette_submissions_select_all" on public.daily_palette_submissions;
create policy "daily_palette_submissions_select_all"
  on public.daily_palette_submissions for select using (true);

drop policy if exists "daily_palette_submissions_insert_own" on public.daily_palette_submissions;
create policy "daily_palette_submissions_insert_own"
  on public.daily_palette_submissions for insert
  with check (auth.uid() = user_id);

drop policy if exists "daily_palette_votes_select_all" on public.daily_palette_votes;
create policy "daily_palette_votes_select_all"
  on public.daily_palette_votes for select using (true);

drop policy if exists "daily_palette_votes_insert_own" on public.daily_palette_votes;
create policy "daily_palette_votes_insert_own"
  on public.daily_palette_votes for insert
  with check (auth.uid() = voter_user_id);

drop policy if exists "daily_palette_tallies_select_all" on public.daily_palette_tallies;
create policy "daily_palette_tallies_select_all"
  on public.daily_palette_tallies for select using (true);

-- 禁止给自己投稿投票
create or replace function public.daily_palette_prevent_self_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.daily_palette_submissions s
    where s.id = new.submission_id and s.user_id = new.voter_user_id
  ) then
    raise exception 'self_vote_not_allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_daily_palette_vote_no_self on public.daily_palette_votes;
create trigger trg_daily_palette_vote_no_self
  before insert on public.daily_palette_votes
  for each row execute function public.daily_palette_prevent_self_vote();

-- 每人每挑战日最多 5 票
create or replace function public.daily_palette_enforce_vote_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  select count(*)::int into n
  from public.daily_palette_votes v
  where v.voter_user_id = new.voter_user_id
    and v.challenge_date = new.challenge_date;
  if n >= 5 then
    raise exception 'daily_vote_quota_exceeded';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_daily_palette_vote_quota on public.daily_palette_votes;
create trigger trg_daily_palette_vote_quota
  before insert on public.daily_palette_votes
  for each row execute function public.daily_palette_enforce_vote_quota();

-- 同步 challenge_date（与投稿日一致）
create or replace function public.daily_palette_sync_vote_date()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select s.challenge_date into new.challenge_date
  from public.daily_palette_submissions s
  where s.id = new.submission_id;
  if new.challenge_date is null then
    raise exception 'invalid_submission';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_daily_palette_sync_vote_date on public.daily_palette_votes;
create trigger trg_daily_palette_sync_vote_date
  before insert on public.daily_palette_votes
  for each row execute function public.daily_palette_sync_vote_date();

-- 结算某日 Top3：写入 winner_rank，公开 styles 并加「每日色卡」标签（幂等）
create or replace function public.tally_daily_one_color_winners(p_challenge_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  winner_tag text := '每日色卡';
  ranked record;
  winners uuid[] := '{}';
  r smallint := 0;
begin
  if exists (
    select 1 from public.daily_palette_tallies t where t.challenge_date = p_challenge_date
  ) then
    return jsonb_build_object('ok', true, 'skipped', true);
  end if;

  for ranked in
    with counts as (
      select
        s.id,
        s.style_id,
        s.user_id,
        s.created_at,
        count(v.id)::int as vote_count
      from public.daily_palette_submissions s
      left join public.daily_palette_votes v on v.submission_id = s.id
      where s.challenge_date = p_challenge_date
      group by s.id, s.style_id, s.user_id, s.created_at
    ),
    ordered as (
      select *
      from counts
      order by vote_count desc, created_at asc
      limit 3
    )
    select * from ordered where vote_count > 0
  loop
    r := r + 1;
    winners := array_append(winners, ranked.id);

    update public.daily_palette_submissions
    set winner_rank = r
    where id = ranked.id;

    update public.styles st
    set
      is_public = true,
      keywords = case
        when coalesce(st.keywords, '[]'::jsonb) @> jsonb_build_array(winner_tag)
          then st.keywords
        else coalesce(st.keywords, '[]'::jsonb) || jsonb_build_array(winner_tag)
      end,
      extraction_snapshot = coalesce(st.extraction_snapshot, '{}'::jsonb)
        || jsonb_build_object(
          'dailyWinner', true,
          'dailyWinnerDate', p_challenge_date::text,
          'dailyWinnerRank', r
        )
    where st.id = ranked.style_id;
  end loop;

  insert into public.daily_palette_tallies (challenge_date, winner_submission_ids)
  values (p_challenge_date, coalesce(winners, '{}'));

  return jsonb_build_object('ok', true, 'winners', winners, 'count', r);
end;
$$;

grant execute on function public.tally_daily_one_color_winners(date) to authenticated;
grant execute on function public.tally_daily_one_color_winners(date) to anon;
