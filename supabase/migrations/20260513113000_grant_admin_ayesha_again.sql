-- Re-grant admin access for ayeshaashraf0091 account.
-- Needed because an earlier migration deleted the user and old seed won't apply to re-created accounts.

insert into public.profiles (id, full_name, role, is_blocked)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'admin',
  false
from auth.users u
where split_part(lower(u.email), '@', 1) = 'ayeshaashraf0091'
on conflict (id)
do update set
  role = 'admin',
  is_blocked = false,
  updated_at = now();
