import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { categories } from "@/lib/data";
import { useQuery } from "@tanstack/react-query";
import { fetchListingCategoryCounts } from "@/lib/listings";

function stableListingCount(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return 1000 + (Math.abs(hash) % 9000);
}

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Categories — Purana Bazaar" }] }),
  component: Categories,
});

function Categories() {
  const { data: categoryCounts = new Map<string, number>() } = useQuery({
    queryKey: ["listing-category-counts"],
    queryFn: fetchListingCategoryCounts,
  });

  const visibleCategories = categories.filter((category) => (categoryCounts.get(category.slug) ?? 0) > 0);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-12">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-[0.3em] text-gold">Explore</span>
          <h1 className="font-serif text-5xl text-primary mt-2">All categories</h1>
          <p className="text-muted-foreground mt-2">Find what you're looking for across Pakistan.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {visibleCategories.map((c) => (
            <Link key={c.slug} to="/browse" search={{ category: c.slug }} className="group rounded-3xl bg-card border border-border p-8 text-center hover:shadow-elegant hover:-translate-y-1 transition">
              <div className="mb-4 flex justify-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/70 text-primary transition-all group-hover:scale-110 group-hover:bg-accent group-hover:shadow-soft">
                  <c.icon className="h-8 w-8" />
                </div>
              </div>
              <div className="font-serif text-xl text-primary">{c.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{stableListingCount(c.slug)} listings</div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
