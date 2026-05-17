-- Backfill seller_name from profiles and add automatic sync trigger
-- This ensures existing listings use the current seller's full_name from their profile

-- Update all existing listings with seller's current full_name
update public.listings l
set seller_name = coalesce(p.full_name, 'Seller')
from public.profiles p
where l.seller_id = p.id
  and l.seller_name is distinct from coalesce(p.full_name, 'Seller');

-- Create trigger to automatically sync seller_name when profile is updated
create or replace function public.sync_seller_name_on_profile_update()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Update all listings for this user if their full_name changed
  if new.full_name is distinct from old.full_name then
    update public.listings
    set seller_name = coalesce(new.full_name, 'Seller')
    where seller_id = new.id;
  end if;
  return new;
end;
$$;

-- Drop trigger if it exists (to prevent duplicate)
drop trigger if exists on_profile_name_change on public.profiles;

-- Create trigger
create trigger on_profile_name_change
after update on public.profiles
for each row
execute function public.sync_seller_name_on_profile_update();
