-- LISTING SLUGS
alter table public.listings
add column if not exists slug text;

create or replace function public.slugify_listing_title(value text)
returns text
language plpgsql
immutable
as $$
declare
  slug text;
begin
  slug := lower(trim(coalesce(value, '')));
  slug := regexp_replace(slug, '[^a-z0-9\s-]', '', 'g');
  slug := regexp_replace(slug, '\s+', '-', 'g');
  slug := regexp_replace(slug, '-+', '-', 'g');
  slug := trim(both '-' from slug);
  return nullif(slug, '');
end;
$$;

create or replace function public.ensure_unique_listing_slug(base_slug text, listing_id uuid)
returns text
language plpgsql
as $$
declare
  candidate text;
  suffix text;
  counter integer := 0;
begin
  if base_slug is null or base_slug = '' then
    base_slug := 'listing';
  end if;

  candidate := base_slug;

  loop
    if counter = 0 then
      candidate := base_slug;
    else
      candidate := base_slug || '-' || suffix;
    end if;

    exit when not exists (
      select 1
      from public.listings l
      where l.slug = candidate
        and l.id <> listing_id
    );

    counter := counter + 1;
    suffix := substr(replace(listing_id::text, '-', ''), 1, 4) || '-' || counter::text;
  end loop;

  return candidate;
end;
$$;

create or replace function public.set_listing_slug()
returns trigger
language plpgsql
as $$
declare
  base_slug text;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;

  base_slug := public.slugify_listing_title(new.title);
  new.slug := public.ensure_unique_listing_slug(base_slug, coalesce(new.id, gen_random_uuid()));
  return new;
end;
$$;

update public.listings
set slug = public.ensure_unique_listing_slug(public.slugify_listing_title(title), id)
where slug is null or slug = '';

alter table public.listings
alter column slug set not null;

create unique index if not exists listings_slug_key on public.listings(slug);

drop trigger if exists listings_set_slug on public.listings;
create trigger listings_set_slug
before insert or update of title on public.listings
for each row execute function public.set_listing_slug();