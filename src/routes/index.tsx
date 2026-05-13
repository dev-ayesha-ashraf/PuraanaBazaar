import { createFileRoute, Link } from "@tanstack/react-router";
import { Header, SearchHero } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { categories, formatPKR } from "@/lib/data";
import { fetchListingCategoryCounts, fetchListings } from "@/lib/listings";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import heroImg from "@/assets/hero.jpg";
import appMock from "@/assets/app-mock.jpg";
import { ArrowRight, BadgeCheck, Camera, FileText, Leaf, LayoutGrid, List, MessageCircle, MessagesSquare, Quote, Search, ShieldCheck, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Purana Bazaar — Pakistan's Premium Preloved Marketplace" },
      { name: "description", content: "Buy and sell preloved mobiles, cars, bikes, furniture and more across Pakistan. Verified sellers and secure chat." },
      { property: "og:title", content: "Purana Bazaar — Preloved, Reimagined" },
      { property: "og:description", content: "Pakistan's most trusted modern second-hand marketplace." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: featured = [] } = useQuery({ queryKey: ["featured"], queryFn: () => fetchListings({ featured: true, limit: 4 }) });
  const { data: recent = [] } = useQuery({ queryKey: ["recent"], queryFn: () => fetchListings({ limit: 8 }) });
  const { data: categoryCounts = new Map<string, number>() } = useQuery({
    queryKey: ["listing-category-counts"],
    queryFn: fetchListingCategoryCounts,
  });
  const [featuredView, setFeaturedView] = useState<"grid" | "list">("grid");
  const [recentView, setRecentView] = useState<"grid" | "list">("grid");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);

  const visibleCategories = categories.filter((category) => (categoryCounts.get(category.slug) ?? 0) > 0);
  const totalActiveListings = Array.from(categoryCounts.values()).reduce((sum, count) => sum + count, 0);
  const topCategoryEntry = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const topCategoryCount = topCategoryEntry?.[1] ?? 0;
  const topCategoryName = categories.find((category) => category.slug === topCategoryEntry?.[0])?.name ?? "No category data";
  const topCategoryShare = totalActiveListings > 0 ? Math.round((topCategoryCount / totalActiveListings) * 100) : 0;
  const topRecent = recent[0];

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const email = newsletterEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setNewsletterSubmitting(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email });

      if (error) {
        // Unique violation means already subscribed - treat it as success UX.
        if (error.code === "23505") {
          setNewsletterEmail("");
          toast.success("You are already subscribed");
          return;
        }
        throw error;
      }

      setNewsletterEmail("");
      toast.success("Subscribed successfully");
    } catch (error: any) {
      toast.error(error.message || "Subscription failed. Please try again.");
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 md:px-8 pt-10 md:pt-20 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-7 animate-fade-up">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              {totalActiveListings > 0
                ? `${totalActiveListings.toLocaleString("en-PK")} live listings · updated from active ads`
                : "Live listings update as sellers post"}
            </span>
            <h1 className="font-serif text-5xl md:text-7xl font-semibold leading-[1.05] text-balance">
              Preloved.
              <span className="block text-primary">Reimagined for Pakistan.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl text-balance">
              The smarter, classier way to buy and sell second-hand. Verified sellers and a marketplace built for the modern Pakistani.
            </p>
            <SearchHero />
            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="hero" size="xl" asChild><Link to="/browse">Browse Items <ArrowRight /></Link></Button>
              <Button variant="outline" size="xl" asChild><Link to="/sell">Sell Now</Link></Button>
            </div>
            <div className="flex flex-wrap items-center gap-6 pt-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" /> Verified sellers</span>
              <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-gold" /> Secure chat</span>
              <span className="inline-flex items-center gap-2"><Leaf className="h-4 w-4 text-primary" /> Eco-friendly</span>
            </div>
          </div>
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-elegant">
              <img src={heroImg} alt="Curated preloved items" width={1536} height={1280} className="w-full h-[560px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-transparent" />
            </div>
            {/* floating cards */}
            <div className="absolute -left-6 top-10 glass rounded-2xl p-4 shadow-elegant w-56 animate-float">
              <div className="text-xs text-muted-foreground">Latest listing</div>
              <div className="font-serif text-lg text-primary mt-1 line-clamp-2">{topRecent?.title ?? "No active listings yet"}</div>
              <div className="text-sm font-semibold mt-1">{topRecent ? formatPKR(topRecent.price) : "Post the first item"}</div>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-success">
                <TrendingUp className="h-3 w-3" /> {topRecent ? `${topRecent.city} · just listed` : "Listings appear here in real time"}
              </div>
            </div>
            <div className="absolute -right-4 bottom-8 glass rounded-2xl p-4 shadow-elegant w-60 animate-float [animation-delay:-3s]">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-success" /> Most active category</div>
              <div className="font-serif text-base text-primary mt-1">{topCategoryName}</div>
              <div className="text-sm font-semibold mt-1">{topCategoryCount.toLocaleString("en-PK")} active ads</div>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-gold" style={{ width: `${Math.max(topCategoryShare, topCategoryCount > 0 ? 8 : 0)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border/60 bg-card/50">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { n: totalActiveListings.toLocaleString("en-PK"), l: "Active listings" },
            { n: visibleCategories.length.toString(), l: "Categories with listings" },
            { n: featured.length.toString(), l: "Featured in this feed" },
            { n: recent.length.toString(), l: "Recent items shown" },
          ].map((s) => (
            <div key={s.l}>
              <div className="font-serif text-3xl md:text-4xl text-primary">{s.n}</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 md:px-8 py-20">
        <SectionHead eyebrow="Explore" title="Trending categories" cta={{ label: "View all", to: "/categories" }} />
        <div className="mt-10 grid grid-cols-3 md:grid-cols-6 gap-4">
          {visibleCategories.slice(0, 12).map((c) => (
            <Link
              key={c.slug}
              to="/browse"
              search={{ category: c.slug }}
              className="group rounded-2xl bg-card border border-border/60 p-5 text-center hover:shadow-elegant hover:-translate-y-1 transition-all"
            >
              <div className="mb-2 flex justify-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/70 text-primary transition-transform group-hover:scale-110 group-hover:bg-accent">
                  <c.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="text-xs font-medium text-foreground/80 group-hover:text-primary">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-4 md:px-8 py-10">
        <SectionHead eyebrow="Handpicked" title="Featured listings" cta={{ label: "Browse all", to: "/browse" }} view={featuredView} onViewChange={setFeaturedView} />
        <div className={featuredView === "list" ? "mt-10 space-y-4" : "mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6"}>
          {featured.map((p) => <ProductCard key={p.id} product={p} compact={featuredView === "list"} />)}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 md:px-8 py-20">
        <SectionHead eyebrow="How it works" title="Buy or sell in 3 simple steps" />
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[
            { i: Search, t: "Discover", d: "Browse thousands of curated, verified listings near you." },
            { i: MessagesSquare, t: "Connect", d: "Chat directly with sellers, negotiate, schedule a meet." },
            { i: Wallet, t: "Trade securely", d: "Pay safely with Stripe-powered checkout or in person." },
          ].map(({ i: Icon, t, d }, idx) => (
            <div key={t} className="relative rounded-3xl glass p-8 shadow-soft">
              <div className="absolute -top-5 left-8 h-10 w-10 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center font-serif">{idx + 1}</div>
              <Icon className="h-8 w-8 text-gold" />
              <h3 className="font-serif text-2xl text-primary mt-4">{t}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section className="bg-primary text-primary-foreground rounded-none">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-gold">Why Purana Bazaar</span>
            <h2 className="font-serif text-4xl md:text-5xl mt-3 leading-tight">A marketplace built on trust, design, and respect.</h2>
            <p className="text-primary-foreground/70 mt-4 max-w-lg">
              We obsess over the buyer-seller experience. From verified profiles to AI-suggested fair prices, every detail is engineered to feel premium, safe, and effortless.
            </p>
            <div className="mt-8 grid sm:grid-cols-2 gap-5">
              {[
                { i: ShieldCheck, t: "Verified sellers", d: "ID & phone verified profiles." },
                { i: Sparkles, t: "Faster discovery", d: "Find relevant buyers and listings quickly." },
                { i: Camera, t: "Multi-image & video", d: "Showcase like a pro." },
                { i: Leaf, t: "Eco-conscious", d: "Every trade reduces waste." },
              ].map(({ i: Icon, t, d }) => (
                <div key={t} className="flex gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gold/20 grid place-items-center"><Icon className="h-5 w-5 text-gold" /></div>
                  <div>
                    <div className="font-medium">{t}</div>
                    <div className="text-sm text-primary-foreground/60">{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <img src={appMock} alt="Mobile app" loading="lazy" className="w-full max-w-md mx-auto rounded-3xl shadow-glow" />
          </div>
        </div>
      </section>

      {/* RECENT */}
      <section className="mx-auto max-w-7xl px-4 md:px-8 py-20">
        <SectionHead eyebrow="Just in" title="Recently listed" cta={{ label: "See more", to: "/browse" }} view={recentView} onViewChange={setRecentView} />
        <div className={recentView === "list" ? "mt-10 space-y-4" : "mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6"}>
          {recent.map((p) => <ProductCard key={p.id} product={p} compact={recentView === "list"} />)}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-4 md:px-8 py-20">
        <SectionHead eyebrow="Loved across Pakistan" title="What our community says" />
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[
            { n: "Ayesha M.", c: "Karachi", q: "Sold my old iPhone in 4 hours. The verified-seller badge made buyers trust me instantly." },
            { n: "Hamza R.", c: "Lahore", q: "Found a Toyota Corolla 30% below market. The chat and offer system feels seamless." },
            { n: "Sana T.", c: "Islamabad", q: "Most beautiful marketplace I've used. Feels like Airbnb but for second-hand." },
          ].map((t) => (
            <div key={t.n} className="rounded-3xl bg-card border border-border/60 p-7 shadow-soft hover:shadow-elegant transition">
              <Quote className="h-7 w-7 text-gold" />
              <p className="mt-4 text-foreground/80 leading-relaxed">"{t.q}"</p>
              <div className="mt-6 flex items-center gap-3 pt-4 border-t border-border/60">
                <div className="h-10 w-10 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center font-serif">{t.n[0]}</div>
                <div>
                  <div className="font-medium text-sm">{t.n}</div>
                  <div className="text-xs text-muted-foreground">{t.c}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SELL CTA */}
      <section className="mx-auto max-w-7xl px-4 md:px-8 py-12">
        <div className="rounded-3xl bg-gradient-primary text-primary-foreground p-6 sm:p-8 md:p-16 shadow-elegant relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(600px 300px at 80% 20%, var(--gold), transparent)" }} />
          <div className="relative grid lg:grid-cols-2 gap-8 md:gap-10 items-start lg:items-center">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-tight">Got something to sell? <span className="text-gold">List it in 60 seconds.</span></h2>
              <p className="mt-4 text-primary-foreground/70 max-w-md">Free for individuals. Premium boosts available. Reach thousands of buyers across Pakistan today.</p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Button variant="gold" size="xl" className="w-full sm:w-auto" asChild><Link to="/sell">Start selling</Link></Button>
                <Button variant="outline" size="xl" className="w-full sm:w-auto bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10" asChild><Link to="/browse">Learn more</Link></Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: Camera, label: "Snap photos" },
                { icon: FileText, label: "Add details" },
                { icon: TrendingUp, label: "Boost reach" },
                { icon: MessageCircle, label: "Chat & sell" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-2xl bg-primary-foreground/10 backdrop-blur p-4 sm:p-5 border border-primary-foreground/15 flex items-center gap-3">
                  <Icon className="h-5 w-5 text-gold shrink-0" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="mx-auto max-w-3xl px-4 md:px-8 py-20 text-center">
        <h2 className="font-serif text-3xl sm:text-4xl text-primary">Get the best deals weekly</h2>
        <p className="text-muted-foreground mt-3">Curated listings, market trends and seller tips — straight to your inbox.</p>
        <form onSubmit={handleNewsletterSubmit} className="mt-8 max-w-md mx-auto rounded-2xl border border-border/70 bg-card/80 p-2 shadow-soft backdrop-blur">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              placeholder="you@example.com"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              required
              className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary"
            />
            <Button type="submit" variant="hero" size="lg" className="w-full sm:w-auto sm:px-6" disabled={newsletterSubmitting}>
              {newsletterSubmitting ? "Subscribing..." : "Subscribe"}
            </Button>
          </div>
          <p className="px-1 pt-2 text-left text-[11px] text-muted-foreground">No spam. Unsubscribe anytime.</p>
        </form>
      </section>

      <Footer />
    </div>
  );
}

function SectionHead({ eyebrow, title, cta, view, onViewChange }: { eyebrow: string; title: string; cta?: { label: string; to: string }; view?: "grid" | "list"; onViewChange?: (value: "grid" | "list") => void }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-gold">{eyebrow}</div>
        <h2 className="font-serif text-4xl md:text-5xl text-primary mt-2 leading-tight">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        {view && onViewChange && (
          <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-soft">
            <button
              type="button"
              onClick={() => onViewChange("grid")}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition ${view === "grid" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-primary"}`}
              aria-label="Card view"
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewChange("list")}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition ${view === "list" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-primary"}`}
              aria-label="List view"
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        )}
        {cta && (
          <Link to={cta.to} className="text-sm font-medium text-primary inline-flex items-center gap-1 hover:gap-2 transition-all">
            {cta.label} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
