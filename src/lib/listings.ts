import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "@/lib/data";

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularize(value: string) {
  if (value.length > 4 && value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  if (value.length > 4 && value.endsWith("es")) return value.slice(0, -2);
  if (value.length > 3 && value.endsWith("s")) return value.slice(0, -1);
  return value;
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost,
      );
    }
    for (let j = 0; j <= b.length; j++) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function tokenMatches(queryToken: string, fieldToken: string) {
  if (queryToken === fieldToken) return true;
  if (singularize(queryToken) === singularize(fieldToken)) return true;
  if (queryToken.length >= 3 && fieldToken.startsWith(queryToken)) return true;
  if (fieldToken.length >= 3 && queryToken.startsWith(fieldToken)) return true;

  const distance = levenshteinDistance(queryToken, fieldToken);
  return distance <= (queryToken.length <= 4 ? 1 : 2);
}

function matchesSearchQuery(listing: Listing, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const fieldValues = [
    listing.title,
    listing.category,
    listing.condition,
    listing.city,
    listing.seller_name,
    listing.description ?? "",
    listing.slug,
  ]
    .map(normalizeSearchText)
    .filter(Boolean);

  const fieldTokens = fieldValues.flatMap((value) => value.split(" ").filter(Boolean));

  return queryTokens.every((queryToken) =>
    fieldValues.some((fieldValue) =>
      fieldValue.includes(queryToken) ||
      fieldTokens.some((fieldToken) => tokenMatches(queryToken, fieldToken)),
    ),
  );
}

export async function fetchListings(opts: { category?: string; q?: string; city?: string; featured?: boolean; limit?: number } = {}): Promise<Listing[]> {
  let q = supabase.from("listings").select("*").eq("status", "active").order("created_at", { ascending: false });
  if (opts.category && opts.category !== "all") q = q.eq("category", opts.category);
  if (opts.city) q = q.eq("city", opts.city);
  if (opts.featured) q = q.eq("featured", true);
  if (opts.q) q = q.ilike("title", `%${opts.q}%`);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Listing[];
}

export async function searchListings(opts: { category?: string; q?: string; city?: string; featured?: boolean; limit?: number } = {}): Promise<Listing[]> {
  const baseListings = await fetchListings({
    category: opts.category,
    city: opts.city,
    featured: opts.featured,
    limit: opts.q ? undefined : opts.limit,
  });

  if (!opts.q) {
    return opts.limit ? baseListings.slice(0, opts.limit) : baseListings;
  }

  const filtered = baseListings.filter((listing) => matchesSearchQuery(listing, opts.q ?? ""));
  return opts.limit ? filtered.slice(0, opts.limit) : filtered;
}

export async function fetchListingCategoryCounts() {
  const { data, error } = await supabase
    .from("listings")
    .select("category")
    .eq("status", "active");

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.category) continue;
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  }

  return counts;
}

export async function fetchActiveCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("slug,name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchListing(id: string): Promise<Listing | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  const query = supabase.from("listings").select("*").limit(1);
  const { data, error } = await (isUuid ? query.eq("id", id) : query.eq("slug", id)).maybeSingle();
  if (error) throw error;
  return data as Listing | null;
}

export async function fetchMyListings(userId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Listing[];
}

export async function fetchSoldListings(opts: { limit?: number } = {}): Promise<Listing[]> {
  let q = supabase.from("listings").select("*").eq("status", "sold").order("created_at", { ascending: false });
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Listing[];
}
