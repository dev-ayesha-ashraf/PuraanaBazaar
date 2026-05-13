
-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  city text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- updated_at trigger fn
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

-- handle_new_user trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- LISTINGS
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id) on delete set null,
  seller_name text not null default 'Purana Bazaar',
  title text not null,
  description text,
  price numeric(14,2) not null,
  category text not null,
  condition text not null default 'Good',
  city text not null,
  images text[] not null default '{}',
  featured boolean not null default false,
  verified boolean not null default false,
  status text not null default 'active',
  views integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listings_category_idx on public.listings(category);
create index listings_city_idx on public.listings(city);
create index listings_created_at_idx on public.listings(created_at desc);
create index listings_seller_idx on public.listings(seller_id);

alter table public.listings enable row level security;
create policy "Active listings viewable by everyone"
  on public.listings for select using (status = 'active' or auth.uid() = seller_id);
create policy "Authenticated users can create listings"
  on public.listings for insert with check (auth.uid() = seller_id);
create policy "Sellers can update own listings"
  on public.listings for update using (auth.uid() = seller_id);
create policy "Sellers can delete own listings"
  on public.listings for delete using (auth.uid() = seller_id);

create trigger listings_set_updated_at before update on public.listings
for each row execute function public.set_updated_at();

-- FAVORITES
create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
alter table public.favorites enable row level security;
create policy "Users view own favorites" on public.favorites for select using (auth.uid() = user_id);
create policy "Users add own favorites" on public.favorites for insert with check (auth.uid() = user_id);
create policy "Users remove own favorites" on public.favorites for delete using (auth.uid() = user_id);

-- STORAGE bucket for listing photos
insert into storage.buckets (id, name, public) values ('listings', 'listings', true);

create policy "Listing photos publicly viewable"
  on storage.objects for select using (bucket_id = 'listings');
create policy "Authenticated can upload listing photos"
  on storage.objects for insert
  with check (
    bucket_id = 'listings'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users can update own listing photos"
  on storage.objects for update
  using (bucket_id = 'listings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can delete own listing photos"
  on storage.objects for delete
  using (bucket_id = 'listings' and (storage.foldername(name))[1] = auth.uid()::text);
