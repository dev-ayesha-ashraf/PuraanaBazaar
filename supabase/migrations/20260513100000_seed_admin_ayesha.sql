
insert into public.profiles (id, full_name, role, is_blocked)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'admin',
  false
from auth.users u
where u.email = 'ayeshaashraf0091@gmail.com'
on conflict (id)
do update set
  role = 'admin',
  is_blocked = false,
  updated_at = now();
