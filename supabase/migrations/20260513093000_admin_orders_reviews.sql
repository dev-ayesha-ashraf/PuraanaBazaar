-- Roles, moderation, categories, orders, and reviews

-- 1) Profiles: role + blocking
alter table public.profiles
  add column if not exists role text not null default 'user',
  add column if not exists is_blocked boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

-- 2) Listings: require contact details for new listings
alter table public.listings
  add column if not exists seller_email text,
  add column if not exists seller_phone text;

-- 3) Categories managed by admin
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

insert into public.categories (slug, name)
values
  ('mobiles', 'Mobiles'),
  ('cars', 'Cars'),
  ('bikes', 'Bikes'),
  ('real-estate', 'Real Estate'),
  ('electronics', 'Electronics'),
  ('furniture', 'Furniture'),
  ('fashion', 'Fashion'),
  ('books', 'Books'),
  ('jobs', 'Jobs'),
  ('services', 'Services'),
  ('pets', 'Pets'),
  ('sports', 'Sports')
on conflict (slug) do nothing;

-- 4) Orders + reviews tables
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null,
  payment_method text not null,
  payment_status text not null default 'pending',
  status text not null default 'pending_seller_confirmation',
  contact_email text not null,
  contact_phone text not null,
  delivery_address text,
  buyer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders
  drop constraint if exists orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check check (payment_method in ('COD', 'ONLINE'));

alter table public.orders
  drop constraint if exists orders_payment_status_check;
alter table public.orders
  add constraint orders_payment_status_check check (payment_status in ('pending', 'paid', 'failed', 'refunded'));

alter table public.orders
  drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check check (status in ('pending_seller_confirmation', 'confirmed', 'rejected', 'in_delivery', 'delivered', 'cancelled'));

create index if not exists orders_listing_idx on public.orders(listing_id);
create index if not exists orders_buyer_idx on public.orders(buyer_id);
create index if not exists orders_seller_idx on public.orders(seller_id);
create index if not exists orders_status_idx on public.orders(status);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  rating integer not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

alter table public.reviews
  drop constraint if exists reviews_rating_check;
alter table public.reviews
  add constraint reviews_rating_check check (rating between 1 and 5);

create index if not exists reviews_listing_idx on public.reviews(listing_id);
create index if not exists reviews_seller_idx on public.reviews(seller_id);

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

-- 5) Admin helper function
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = uid
      and p.role = 'admin'
      and p.is_blocked = false
  );
$$;

revoke execute on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- 6) Enable RLS on new tables
alter table public.categories enable row level security;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;

-- 7) Categories policies
create policy "Categories are viewable by everyone"
  on public.categories for select
  using (is_active = true or public.is_admin(auth.uid()));

create policy "Admins can manage categories"
  on public.categories for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- 8) Listings policy upgrades for admin + blocked users + required contact
create policy "Admins can view all listings"
  on public.listings for select
  using (public.is_admin(auth.uid()));

create policy "Admins can update listings"
  on public.listings for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins can delete listings"
  on public.listings for delete
  using (public.is_admin(auth.uid()));

drop policy if exists "Authenticated users can create listings" on public.listings;
create policy "Authenticated users can create listings"
  on public.listings for insert
  with check (
    auth.uid() = seller_id
    and coalesce(seller_email, '') <> ''
    and coalesce(seller_phone, '') <> ''
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_blocked = false
    )
  );

-- 9) Orders policies
create policy "Buyer and seller can view related orders"
  on public.orders for select
  using (
    auth.uid() = buyer_id
    or auth.uid() = seller_id
    or public.is_admin(auth.uid())
  );

create policy "Buyer can place own order"
  on public.orders for insert
  with check (
    auth.uid() = buyer_id
    and auth.uid() <> seller_id
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_blocked = false
    )
  );

create policy "Seller can update order status"
  on public.orders for update
  using (
    auth.uid() = seller_id
    or public.is_admin(auth.uid())
  )
  with check (
    auth.uid() = seller_id
    or public.is_admin(auth.uid())
  );

-- 10) Reviews policies
create policy "Reviews are publicly visible"
  on public.reviews for select using (true);

create policy "Buyer can write review after delivered order"
  on public.reviews for insert
  with check (
    auth.uid() = buyer_id
    and exists (
      select 1
      from public.orders o
      where o.id = order_id
        and o.listing_id = listing_id
        and o.buyer_id = auth.uid()
        and o.seller_id = seller_id
        and o.status = 'delivered'
    )
  );

create policy "Buyer can edit own review"
  on public.reviews for update
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

create policy "Buyer can delete own review"
  on public.reviews for delete
  using (auth.uid() = buyer_id or public.is_admin(auth.uid()));

-- 11) Keep blocked users from adding favorites
drop policy if exists "Users add own favorites" on public.favorites;
create policy "Users add own favorites"
  on public.favorites for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_blocked = false
    )
  );

-- 12) Keep profile bootstrap in sync with signup metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
