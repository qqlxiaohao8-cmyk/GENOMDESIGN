-- UI Studio: private projects + public gallery RPC (use with UI tab in the app).

create table if not exists public.ui_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled UI',
  is_public boolean not null default false,
  layout_description text,
  cursor_prompt text,
  html_document text not null default '',
  source_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ui_projects_user_id_idx on public.ui_projects (user_id);
create index if not exists ui_projects_public_created_idx on public.ui_projects (is_public, created_at desc);

alter table public.ui_projects enable row level security;

drop policy if exists "ui_projects_select_own" on public.ui_projects;
drop policy if exists "ui_projects_insert_own" on public.ui_projects;
drop policy if exists "ui_projects_update_own" on public.ui_projects;
drop policy if exists "ui_projects_delete_own" on public.ui_projects;

create policy "ui_projects_select_own"
  on public.ui_projects for select
  using (auth.uid() = user_id);

create policy "ui_projects_insert_own"
  on public.ui_projects for insert
  with check (auth.uid() = user_id);

create policy "ui_projects_update_own"
  on public.ui_projects for update
  using (auth.uid() = user_id);

create policy "ui_projects_delete_own"
  on public.ui_projects for delete
  using (auth.uid() = user_id);

-- Public gallery: only safe columns (no cursor_prompt / layout in API).
create or replace function public.list_public_ui_projects()
returns table (
  id uuid,
  title text,
  preview_html text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.title, p.html_document as preview_html, p.created_at
  from public.ui_projects p
  where p.is_public = true
  order by p.created_at desc;
$$;

grant execute on function public.list_public_ui_projects() to anon, authenticated;
