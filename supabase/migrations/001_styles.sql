-- Run in Supabase SQL editor or via CLI after linking the project.
-- Library + community styles for Stylyze.

create table if not exists public.styles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  is_public boolean not null default false,
  image_url text not null,
  aesthetic text,
  typography text,
  fonts jsonb,
  palette jsonb,
  design_logic text,
  keywords jsonb,
  prompt text,
  created_at timestamptz not null default now()
);

create index if not exists styles_user_id_idx on public.styles (user_id);
create index if not exists styles_is_public_created_idx on public.styles (is_public, created_at desc);

alter table public.styles enable row level security;

create policy "styles_select_own_or_public"
  on public.styles for select
  using (auth.uid() = user_id or is_public = true);

create policy "styles_insert_own"
  on public.styles for insert
  with check (auth.uid() = user_id);

create policy "styles_update_own"
  on public.styles for update
  using (auth.uid() = user_id);

create policy "styles_delete_own"
  on public.styles for delete
  using (auth.uid() = user_id);

-- Optional: in Supabase Dashboard → Database → Replication, enable realtime for public.styles
-- so the app receives live updates without refreshing.
