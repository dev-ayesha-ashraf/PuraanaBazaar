import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Heart, Search, User, Plus, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "./Logo";

const nav = [
  { to: "/browse", label: "Browse" },
  { to: "/categories", label: "Categories" },
  { to: "/dashboard", label: "Dashboard" },
];

export function Header() {
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["header-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const canSell = profile?.role === "admin";
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logged out successfully");
    setOpen(false);
  };

  return (
    <header className={`sticky top-0 z-50 transition-all ${scrolled ? "glass shadow-soft" : "bg-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
        <Logo />
        <nav className="hidden lg:flex items-center gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="px-4 py-2 rounded-full text-sm text-foreground/80 hover:text-primary hover:bg-accent transition"
              activeProps={{ className: "text-primary bg-accent font-medium" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="hidden lg:inline-flex" aria-label="Language"><Globe /></Button>
          <Button variant="ghost" size="icon" className="hidden lg:inline-flex" aria-label="Favorites" asChild><Link to="/dashboard"><Heart /></Link></Button>
          <Button variant="ghost" size="icon" className="hidden lg:inline-flex relative" aria-label="Notifications">
            <Bell />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-gold" />
          </Button>
          {user ? (
            <>
              <Button variant="outline" size="sm" className="hidden lg:inline-flex" asChild>
                <Link to="/dashboard"><User /> Dashboard</Link>
              </Button>
              <Button variant="ghost" size="sm" className="hidden lg:inline-flex" onClick={handleSignOut}>
                Logout
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" className="hidden lg:inline-flex" asChild>
              <Link to="/login"><User /> Sign in</Link>
            </Button>
          )}
          <Button variant="hero" size="sm" className="hidden lg:inline-flex" asChild>
            <Link to="/sell"><Plus /> {canSell ? "Sell Now" : "Sell Now (Soon)"}</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10 rounded-full border border-border/70 bg-card/80 backdrop-blur-sm"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <span className="relative block h-4 w-5">
              <span
                className={`absolute left-0 h-0.5 w-5 rounded-full bg-foreground transition-all duration-200 ${
                  open ? "top-[7px] rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-foreground transition-all duration-200 ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 h-0.5 w-5 rounded-full bg-foreground transition-all duration-200 ${
                  open ? "top-[7px] -rotate-45" : "top-[14px]"
                }`}
              />
            </span>
          </Button>
        </div>
      </div>
      {open && (
        <>
          <button
            type="button"
            className="lg:hidden fixed inset-0 top-16 z-40 bg-black/25"
            aria-label="Close mobile menu"
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-menu"
            className="lg:hidden fixed top-[4.5rem] left-3 right-3 z-50 rounded-3xl border border-border/70 bg-background/95 p-3 shadow-elegant backdrop-blur"
          >
            <div className="mb-2 px-2 pt-1 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Menu</div>
            <div className="space-y-1.5">
              {nav.map((n, i) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="group flex items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-sm text-foreground/85 transition hover:border-border hover:bg-accent"
                  onClick={() => setOpen(false)}
                >
                  <span className="font-medium">{n.label}</span>
                  <span className="text-xs text-muted-foreground transition group-hover:text-primary">{String(i + 1).padStart(2, "0")}</span>
                </Link>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card text-sm font-medium text-foreground/85 transition hover:bg-accent"
                >
                  Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card text-sm font-medium text-foreground/85 transition hover:bg-accent"
                >
                  Sign in
                </Link>
              )}
              <Link
                to="/sell"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                {canSell ? "Sell now" : "Sell soon"}
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

export function SearchHero() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const handleSearch = () => {
    if (!query.trim()) return;
    navigate({
      to: "/browse",
      search: {
        q: query,
        category: category === "all" ? undefined : category,
      },
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="glass rounded-2xl p-2 flex flex-col sm:flex-row items-stretch gap-2 shadow-elegant">
      <div className="flex items-center gap-2 px-4 py-2 sm:border-r border-border/60">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9 w-[170px] border-0 bg-transparent px-0 text-sm shadow-none ring-0 focus:ring-0">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/70 shadow-elegant">
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="mobiles">Mobiles</SelectItem>
            <SelectItem value="cars">Cars</SelectItem>
            <SelectItem value="bikes">Bikes</SelectItem>
            <SelectItem value="real-estate">Real Estate</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <input
        placeholder="Search for iPhone, Honda 125, sofa…"
        className="flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={handleKeyPress}
      />
      <Button variant="hero" size="lg" className="shrink-0" onClick={handleSearch}>Search</Button>
    </div>
  );
}
