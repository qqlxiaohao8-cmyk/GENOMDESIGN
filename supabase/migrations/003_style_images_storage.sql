-- Full extraction JSON (optional column; safe to run after 001_styles.sql).
alter table public.styles
  add column if not exists extraction_snapshot jsonb;

-- Public bucket for style cover images (URLs work in <img> for Vault + Community).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'style-images',
  'style-images',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "style_images_select_public" on storage.objects;
drop policy if exists "style_images_insert_own_folder" on storage.objects;
drop policy if exists "style_images_update_own_folder" on storage.objects;
drop policy if exists "style_images_delete_own_folder" on storage.objects;

create policy "style_images_select_public"
  on storage.objects for select
  using (bucket_id = 'style-images');

create policy "style_images_insert_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'style-images'
    and name like auth.uid()::text || '/%'
  );

create policy "style_images_update_own_folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'style-images'
    and name like auth.uid()::text || '/%'
  );

create policy "style_images_delete_own_folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'style-images'
    and name like auth.uid()::text || '/%'
  );
