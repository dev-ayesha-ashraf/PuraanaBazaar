-- Allow public viewing of sold listings so they appear in "Recently Sold" sections

drop policy if exists "Active listings viewable by everyone" on public.listings;

create policy "Active and sold listings viewable by everyone"
  on public.listings for select
  using (status in ('active', 'sold') or auth.uid() = seller_id);
