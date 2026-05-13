grant usage on schema public to anon, authenticated;
grant insert on table public.newsletter_subscribers to anon, authenticated;

drop policy if exists "Anyone can subscribe to newsletter" on public.newsletter_subscribers;
create policy "Anyone can subscribe to newsletter"
  on public.newsletter_subscribers
  for insert
  to anon, authenticated
  with check (true);
