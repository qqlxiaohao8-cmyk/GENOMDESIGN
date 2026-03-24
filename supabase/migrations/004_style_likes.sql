-- Like counts for public community styles (color cards + full styles).

alter table public.styles
  add column if not exists like_count integer not null default 0;

create table if not exists public.style_likes (
  style_id uuid not null references public.styles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (style_id, user_id)
);

create index if not exists style_likes_user_id_idx on public.style_likes (user_id);

alter table public.style_likes enable row level security;

create policy "style_likes_select_own"
  on public.style_likes for select
  using (auth.uid() = user_id);

create policy "style_likes_insert_own"
  on public.style_likes for insert
  with check (auth.uid() = user_id);

create policy "style_likes_delete_own"
  on public.style_likes for delete
  using (auth.uid() = user_id);

create or replace function public.bump_style_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.styles
      set like_count = coalesce(like_count, 0) + 1
      where id = new.style_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.styles
      set like_count = greatest(0, coalesce(like_count, 0) - 1)
      where id = old.style_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists style_likes_count on public.style_likes;
create trigger style_likes_count
  after insert or delete on public.style_likes
  for each row execute function public.bump_style_like_count();
