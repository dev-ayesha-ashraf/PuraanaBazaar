import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { categories, cities, conditions } from "@/lib/data";
import { fetchListingCategoryCounts, fetchSoldListings, searchListings } from "@/lib/listings";
import { ArrowDownAZ, ArrowDownWideNarrow, ArrowUpDown, LayoutGrid, List, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/browse")({
  head: () => ({ meta: [{ title: "Browse — Purana Bazaar" }, { name: "description", content: "Browse verified second-hand listings across Pakistan." }] }),
  component: Browse,
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) || "",
    category: (search.category as string) || "",
    sort: (search.sort as string) || "newest",
    view: (search.view as string) || "grid",
  }),
});

function Browse() {
  const searchParams = useSearch({ from: "/browse" });
  const navigate = useNavigate();
  const [cat, setCat] = useState<string>(searchParams.category || "all");
  const [q, setQ] = useState<string>(searchParams.q || "");
  const [city, setCity] = useState<string>("");
  const [condFilter, setCondFilter] = useState<Set<string>>(new Set());
  const [minP, setMinP] = useState("");
  const [maxP, setMaxP] = useState("");
  const [sort, setSort] = useState<string>(searchParams.sort || "newest");
  const [view, setView] = useState<string>(searchParams.view || "grid");

  const { data: categoryCounts = new Map<string, number>() } = useQuery({
    queryKey: ["listing-category-counts"],
    queryFn: fetchListingCategoryCounts,
  });

  useEffect(() => {
    setCat(searchParams.category || "all");
    setQ(searchParams.q || "");
    setSort(searchParams.sort || "newest");
    setView(searchParams.view || "grid");
  }, [searchParams.category, searchParams.q, searchParams.sort, searchParams.view]);

  useEffect(() => {
    if (searchParams.sort === sort && searchParams.view === view) return;
    navigate({
      to: "/browse",
      search: (prev) => ({
        ...prev,
        sort,
        view,
      }),
      replace: true,
    });
  }, [navigate, searchParams.sort, searchParams.view, sort, view]);

  const { data: soldListings = [] } = useQuery({
    queryKey: ["sold-listings"],
    queryFn: () => fetchSoldListings({ limit: 8 }),
  });

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["listings", cat, q, city, sort],
    queryFn: () => searchListings({ category: cat, q, city: city || undefined }),
  });

  const visibleCategories = categories.filter((category) => (categoryCounts.get(category.slug) ?? 0) > 0);

  const filtered = listings.filter((p) => {
    if (condFilter.size > 0 && !condFilter.has(p.condition)) return false;
    if (minP && p.price < Number(minP)) return false;
    if (maxP && p.price > Number(maxP)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "newest":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const toggleCond = (c: string) => {
    const next = new Set(condFilter);
    next.has(c) ? next.delete(c) : next.add(c);
    setCondFilter(next);
  };

  const handleCategoryClick = (slug: string) => {
    setCat(slug);
    navigate({
      to: "/browse",
      search: (prev) => ({
        ...prev,
        category: slug === "all" ? undefined : slug,
      }),
    });
  };

  const handleSearchChange = (value: string) => {
    setQ(value);
    navigate({
      to: "/browse",
      search: (prev) => ({
        ...prev,
        q: value || undefined,
      }),
      replace: true,
    });
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    navigate({
      to: "/browse",
      search: (prev) => ({
        ...prev,
        sort: value,
      }),
      replace: true,
    });
  };

  const handleViewChange = (value: string) => {
    setView(value);
    navigate({
      to: "/browse",
      search: (prev) => ({
        ...prev,
        view: value,
      }),
      replace: true,
    });
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-10">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl text-primary">Browse Marketplace</h1>
            <p className="text-muted-foreground mt-1">{isLoading ? "Loading…" : `${filtered.length} items found`}</p>
          </div>
          <div className="flex gap-2 items-center glass rounded-full p-1.5 pl-4 shadow-soft">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search listings..." className="bg-transparent outline-none text-sm py-2 w-48 md:w-64" />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="h-11 w-full min-w-0 sm:w-[240px] rounded-xl border-border bg-card text-sm shadow-soft">
                <SelectValue placeholder="Sort results" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/70 shadow-elegant">
                <SelectItem value="newest">
                  <span className="inline-flex items-center gap-2"><ArrowDownWideNarrow className="h-4 w-4" /> Newest first</span>
                </SelectItem>
                <SelectItem value="oldest">
                  <span className="inline-flex items-center gap-2"><ArrowUpDown className="h-4 w-4" /> Oldest first</span>
                </SelectItem>
                <SelectItem value="price-low">
                  <span className="inline-flex items-center gap-2"><ArrowDownWideNarrow className="h-4 w-4" /> Price low to high</span>
                </SelectItem>
                <SelectItem value="price-high">
                  <span className="inline-flex items-center gap-2"><ArrowDownAZ className="h-4 w-4" /> Price high to low</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="inline-flex shrink-0 rounded-xl border border-border bg-card p-1 shadow-soft">
            <button
              type="button"
              onClick={() => handleViewChange("grid")}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition ${view === "grid" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-primary"}`}
              aria-label="Card view"
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleViewChange("list")}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition ${view === "list" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-primary"}`}
              aria-label="List view"
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-8 flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-2">
          {[{ slug: "all", name: "All", icon: Sparkles }, ...visibleCategories].map((c) => (
            <button
              key={c.slug}
              onClick={() => handleCategoryClick(c.slug)}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition ${cat === c.slug ? "bg-primary text-primary-foreground border-primary shadow-soft" : "bg-card border-border hover:border-primary/40"}`}
            >
              <c.icon className="h-4 w-4" /> {c.name}
            </button>
          ))}
        </div>

        <div className="mt-8 grid lg:grid-cols-[260px_1fr] gap-8">
          <aside className="hidden lg:block space-y-6 rounded-2xl bg-card border border-border p-6 h-fit sticky top-20">
            <div className="flex items-center gap-2 text-primary"><SlidersHorizontal className="h-4 w-4" /><span className="font-medium">Filters</span></div>
            <FilterGroup title="Price">
              <div className="flex gap-2">
                <input value={minP} onChange={(e) => setMinP(e.target.value)} placeholder="Min" type="number" className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
                <input value={maxP} onChange={(e) => setMaxP(e.target.value)} placeholder="Max" type="number" className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
              </div>
            </FilterGroup>
            <FilterGroup title="Condition">
              {conditions.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm text-foreground/80 py-1">
                  <input type="checkbox" checked={condFilter.has(c)} onChange={() => toggleCond(c)} className="accent-primary" /> {c}
                </label>
              ))}
            </FilterGroup>
            <FilterGroup title="Location">
              <Select value={city || "all"} onValueChange={(v) => setCity(v === "all" ? "" : v)}>
                <SelectTrigger className="h-11 rounded-xl border-border bg-background text-sm shadow-none">
                  <SelectValue placeholder="All cities" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/70 shadow-elegant">
                  <SelectItem value="all">All cities</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterGroup>
            <Button variant="outline" className="w-full" onClick={() => { setCondFilter(new Set()); setMinP(""); setMaxP(""); setCity(""); }}>Reset</Button>
          </aside>

          <div className={view === "list" ? "space-y-4" : "grid sm:grid-cols-2 xl:grid-cols-3 gap-6"}>
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`rounded-2xl bg-card border border-border animate-pulse ${view === "list" ? "h-44" : "h-80"}`} />
            ))}
            {!isLoading && sorted.map((p) => <ProductCard key={p.id} product={p} compact={view === "list"} />)}
            {!isLoading && filtered.length === 0 && (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                No listings match. Try a different filter or <Link className="text-primary underline" to="/sell">list one yourself</Link>.
              </div>
            )}
          </div>
        </div>

        {soldListings.length > 0 && (
          <div className="mt-20">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <h2 className="font-serif text-3xl text-primary">Recently Sold</h2>
                <p className="text-sm text-muted-foreground mt-1">Items that found a new home</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold uppercase tracking-wider">{soldListings.length} sold</span>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {soldListings.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}
