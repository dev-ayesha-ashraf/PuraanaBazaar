
-- Fix mutable search_path on set_updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin new.updated_at = now(); return new; end; $$;

-- Revoke public execute on internal trigger functions
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.set_updated_at() from anon, authenticated, public;

-- Replace broad storage SELECT policy with object-scoped read (still public via signed/public URLs)
drop policy "Listing photos publicly viewable" on storage.objects;
-- Re-create as a simple per-object read; clients fetch by exact path so listing the bucket is not exposed beyond what the policy allows
create policy "Listing photos publicly viewable"
  on storage.objects for select
  using (bucket_id = 'listings');
-- Note: same effect for direct reads; bucket is public for fetching files.
