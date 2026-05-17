import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Eye, Heart, KeyRound, LayoutGrid, List, ListChecks, LogOut, Plus, ShieldCheck, Star, Truck, UserRound, UserRoundCog } from "lucide-react";
import { formatPKR, timeAgo, type Listing } from "@/lib/data";
import { isVideoUrl } from "@/lib/media";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMyListings, fetchListing } from "@/lib/listings";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { useFavoriteIds } from "@/hooks/use-favorites";
import { ProductCard } from "@/components/ProductCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

type DashboardTab = "listings" | "favorites" | "orders" | "admin" | "profile";
type OrderStatus = "pending_seller_confirmation" | "confirmed" | "rejected" | "in_delivery" | "delivered" | "cancelled";

type DbOrder = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  status: OrderStatus;
  contact_email: string;
  contact_phone: string;
  delivery_address: string | null;
  buyer_note: string | null;
  created_at: string;
};

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Purana Bazaar" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<DashboardTab>("listings");
  const [favoritesView, setFavoritesView] = useState<"grid" | "list">("grid");

  const { data: profile } = useQuery({
    queryKey: ["dashboard-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, role, is_blocked")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const isAdmin = profile?.role === "admin";

  if (!loading && !user) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-md mx-auto py-32 text-center px-4">
          <h1 className="font-serif text-4xl text-primary">Sign in to view dashboard</h1>
          <div className="mt-6 flex gap-2 justify-center">
            <Button variant="hero" onClick={() => navigate({ to: "/login" })}>Sign in</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen overflow-x-clip">
      <Header />
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 md:py-8 grid xl:grid-cols-[260px_1fr] gap-5 md:gap-8">
        <aside className="xl:sticky xl:top-20 h-fit rounded-2xl bg-card border border-border p-3">
          <div className="p-2 sm:p-3 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center font-serif text-lg">{(user?.email?.[0] || "U").toUpperCase()}</div>
            <div className="min-w-0">
              <div className="font-medium truncate">{profile?.full_name || user?.email}</div>
              <div className="text-xs text-success inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-success" /> {isAdmin ? "Admin" : "Member"}
              </div>
            </div>
          </div>
          <nav className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-1 gap-1.5">
            <NavBtn active={tab === "listings"} onClick={() => setTab("listings")} icon={ListChecks}>My listings</NavBtn>
            <NavBtn active={tab === "favorites"} onClick={() => setTab("favorites")} icon={Heart}>Favorites</NavBtn>
            <NavBtn active={tab === "orders"} onClick={() => setTab("orders")} icon={Truck}>Orders</NavBtn>
            <NavBtn active={tab === "profile"} onClick={() => setTab("profile")} icon={UserRound}>My profile</NavBtn>
            {isAdmin && <NavBtn active={tab === "admin"} onClick={() => setTab("admin")} icon={UserRoundCog}>Admin panel</NavBtn>}
            <button onClick={handleSignOut} className="w-full mt-0.5 xl:mt-2 flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition hover:bg-accent text-foreground/80">
              <LogOut className="h-4 w-4 shrink-0" /> <span className="truncate">Logout</span>
            </button>
          </nav>
        </aside>

        <main className="space-y-8 min-w-0">
          {profile?.is_blocked && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Your account is blocked. Buying/selling actions are disabled.
            </div>
          )}

          <div className="flex items-end justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-serif text-4xl text-primary">Welcome back</h1>
              <p className="text-muted-foreground">Manage your listings, orders and profile activity.</p>
            </div>
            <Button variant="hero" className="w-full sm:w-auto" asChild><Link to="/sell">+ New listing</Link></Button>
          </div>

          {tab === "listings" && user && <MyListings userId={user.id} isBlocked={!!profile?.is_blocked} />}
          {tab === "favorites" && <Favorites view={favoritesView} onViewChange={setFavoritesView} />}
          {tab === "orders" && user && <OrdersTab userId={user.id} />}
          {tab === "profile" && user && <ProfileTab userId={user.id} userEmail={user.email ?? ""} />}
          {tab === "admin" && isAdmin && <AdminPanel />}
        </main>
      </div>
      <Footer />
    </div>
  );
}

function NavBtn({ icon: Icon, children, active, onClick }: { icon: any; children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm transition ${active ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground/80"}`}>
      <Icon className="h-4 w-4 shrink-0" /> <span className="truncate text-left">{children}</span>
    </button>
  );
}

function ProfileTab({ userId, userEmail }: { userId: string; userEmail: string }) {
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-tab", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const trimmedName = fullName.trim();
      const trimmedPhone = phone.trim();

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: trimmedName, phone: trimmedPhone })
        .eq("id", userId);
      if (profileError) throw profileError;

      // Keep seller_name in sync on all listings owned by this user
      const { error: listingsError } = await supabase
        .from("listings")
        .update({ seller_name: trimmedName })
        .eq("seller_id", userId);
      if (listingsError) throw listingsError;

      qc.invalidateQueries({ queryKey: ["dashboard-profile", userId] });
      qc.invalidateQueries({ queryKey: ["profile-tab", userId] });
      qc.invalidateQueries({ queryKey: ["my-listings", userId] });
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update profile");
    } finally {
      setSavingInfo(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    try {
      // Re-authenticate with current password first
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: userEmail, password: currentPassword });
      if (signInError) {
        toast.error("Current password is incorrect");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 animate-pulse h-48" />
    );
  }

  return (
    <div className="space-y-6">
      {/* Personal information */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <UserRound className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-2xl text-primary">Personal information</h2>
        </div>
        <form onSubmit={handleUpdateInfo} className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="profile-email">Email address</label>
            <input
              id="profile-email"
              type="email"
              value={userEmail}
              disabled
              className="w-full h-11 rounded-xl border-2 border-border bg-muted px-4 text-sm text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="profile-name">Full name</label>
            <input
              id="profile-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full h-11 rounded-xl border-2 border-border bg-background px-4 text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="profile-phone">Phone number</label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 03001234567"
              className="w-full h-11 rounded-xl border-2 border-border bg-background px-4 text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none"
            />
          </div>
          <Button type="submit" variant="hero" disabled={savingInfo} className="w-full sm:w-auto">
            {savingInfo ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </div>

      {/* Change password */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-2xl text-primary">Change password</h2>
        </div>
        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="current-password">Current password</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
              className="w-full h-11 rounded-xl border-2 border-border bg-background px-4 text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="w-full h-11 rounded-xl border-2 border-border bg-background px-4 text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              autoComplete="new-password"
              className="w-full h-11 rounded-xl border-2 border-border bg-background px-4 text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none"
            />
          </div>
          <Button type="submit" variant="hero" disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword} className="w-full sm:w-auto">
            {savingPassword ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function MyListings({ userId, isBlocked }: { userId: string; isBlocked: boolean }) {
  const qc = useQueryClient();
  const [listingTab, setListingTab] = useState<"active" | "sold">("active");
  const { data: listings = [], isLoading } = useQuery({ queryKey: ["my-listings", userId], queryFn: () => fetchMyListings(userId) });

  const totalViews = listings.reduce((s, l) => s + l.views, 0);
  const active = listings.filter((l) => l.status === "active").length;
  const sold = listings.filter((l) => l.status === "sold").length;
  const visibleListings = listings.filter((listing) => listingTab === "sold" ? listing.status === "sold" : listing.status !== "sold");

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-listings", userId] });
      toast.success("Listing removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markSold = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").update({ status: "sold" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-listings", userId] });
      toast.success("Listing marked as sold");
      setListingTab("sold");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markUnsold = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").update({ status: "active" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-listings", userId] });
      toast.success("Listing marked as unsold");
      setListingTab("active");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={ListChecks} label="Active listings" value={String(active)} />
        <Kpi icon={Eye} label="Total views" value={String(totalViews)} />
        <Kpi icon={ShieldCheck} label="Sold" value={String(sold)} />
        <Kpi icon={Heart} label="Total listed" value={String(listings.length)} />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-serif text-2xl text-primary">Your listings</h3>
          <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-soft">
            <button
              type="button"
              onClick={() => setListingTab("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${listingTab === "active" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-primary"}`}
            >
              Active ({active})
            </button>
            <button
              type="button"
              onClick={() => setListingTab("sold")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${listingTab === "sold" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-primary"}`}
            >
              Sold ({sold})
            </button>
          </div>
        </div>
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading…</div>
          ) : listings.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">You have not listed anything yet.</p>
              <Button variant="hero" className="mt-4" asChild><Link to="/sell">Create your first listing</Link></Button>
            </div>
          ) : visibleListings.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No {listingTab} listings yet.</div>
          ) : (
            <>
              <div className="sm:hidden divide-y divide-border">
                {visibleListings.map((p) => (
                  <details key={p.id} className="group">
                    <summary className="list-none cursor-pointer p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {isVideoUrl(p.images[0] || "") ? (
                          <video src={p.images[0]} className="h-12 w-12 rounded-lg object-contain bg-black/5 shrink-0" muted playsInline preload="metadata" />
                        ) : (
                          <img src={p.images[0] || "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=400"} alt="" className="h-12 w-12 rounded-lg object-contain shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium line-clamp-1">{p.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatPKR(p.price)} · {timeAgo(p.created_at)}</p>
                        </div>
                        <span className="text-xs text-primary font-medium">Details</span>
                      </div>
                    </summary>

                    <div className="px-4 pb-4 space-y-3">
                      <div>
                        {p.status === "sold" ? (
                          <span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">SOLD</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-success/15 text-success text-xs">{p.status}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <Button variant="outline" size="sm" className="w-full" asChild><Link to="/product/$slug" params={{ slug: p.slug }}>View listing</Link></Button>
                        {p.status === "sold" ? (
                          <Button variant="outline" size="sm" className="w-full" disabled={isBlocked || markUnsold.isPending} onClick={() => markUnsold.mutate(p.id)}>Mark unsold</Button>
                        ) : (
                          <Button variant="outline" size="sm" className="w-full" disabled={isBlocked || markSold.isPending} onClick={() => markSold.mutate(p.id)}>Mark sold</Button>
                        )}
                        <Button variant="outline" size="sm" className="w-full" asChild><Link to="/edit/$slug" params={{ slug: p.slug }}>Edit</Link></Button>
                        <Button variant="ghost" size="sm" className="w-full" disabled={del.isPending} onClick={() => del.mutate(p.id)}>Delete</Button>
                      </div>
                    </div>
                  </details>
                ))}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-3">Item</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">Price</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Posted</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleListings.map((p) => (
                      <tr key={p.id} className="border-t border-border hover:bg-accent/40 transition">
                        <td className="px-4 py-3">
                          <Link to="/product/$slug" params={{ slug: p.slug }} className="flex items-center gap-3">
                            {isVideoUrl(p.images[0] || "") ? (
                              <video src={p.images[0]} className="h-12 w-12 rounded-lg object-contain bg-black/5" muted playsInline preload="metadata" />
                            ) : (
                              <img src={p.images[0] || "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=400"} alt="" className="h-12 w-12 rounded-lg object-contain" />
                            )}
                            <span className="font-medium line-clamp-1">{p.title}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell font-medium">{formatPKR(p.price)}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{timeAgo(p.created_at)}</td>
                        <td className="px-4 py-3">
                          {p.status === "sold" ? (
                            <span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">SOLD</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-success/15 text-success text-xs">{p.status}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {p.status === "sold" ? (
                              <Button variant="outline" size="sm" disabled={isBlocked || markUnsold.isPending} onClick={() => markUnsold.mutate(p.id)}>Mark unsold</Button>
                            ) : (
                              <Button variant="outline" size="sm" disabled={isBlocked || markSold.isPending} onClick={() => markSold.mutate(p.id)}>Mark sold</Button>
                            )}
                            <Button variant="outline" size="sm" asChild><Link to="/edit/$slug" params={{ slug: p.slug }}>Edit</Link></Button>
                            <Button variant="ghost" size="sm" disabled={del.isPending} onClick={() => del.mutate(p.id)}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Favorites({ view, onViewChange }: { view: "grid" | "list"; onViewChange: (value: "grid" | "list") => void }) {
  const { data: favIds } = useFavoriteIds();
  const ids = favIds ? Array.from(favIds) : [];
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["fav-listings", ids.join(",")],
    queryFn: async () => {
      const results = await Promise.all(ids.map((id) => fetchListing(id)));
      return results.filter(Boolean) as NonNullable<Awaited<ReturnType<typeof fetchListing>>>[];
    },
    enabled: ids.length > 0,
  });

  if (ids.length === 0) {
    return <div className="text-center py-16 text-muted-foreground rounded-2xl bg-card border border-border">No favorites yet. Browse listings and tap the heart to save.</div>;
  }
  if (isLoading) return <div className="text-center py-16 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-soft">
          <button type="button" onClick={() => onViewChange("grid")} className={`inline-flex h-11 w-11 items-center justify-center rounded-lg transition ${view === "grid" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-primary"}`}>
            <LayoutGrid className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => onViewChange("list")} className={`inline-flex h-11 w-11 items-center justify-center rounded-lg transition ${view === "list" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-primary"}`}>
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className={view === "list" ? "space-y-4" : "grid sm:grid-cols-2 lg:grid-cols-3 gap-6"}>
        {items.map((p) => <ProductCard key={p.id} product={p} compact={view === "list"} />)}
      </div>
    </div>
  );
}

function OrdersTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [note, setNote] = useState<Record<string, string>>({});

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbOrder[];
    },
  });

  const listingIds = useMemo(() => Array.from(new Set(orders.map((o) => o.listing_id))), [orders]);
  const { data: listings = [] } = useQuery({
    queryKey: ["order-listings", listingIds.join(",")],
    enabled: listingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("id,title,slug,images").in("id", listingIds);
      if (error) throw error;
      return (data ?? []) as Pick<Listing, "id" | "title" | "slug" | "images">[];
    },
  });

  const { data: myReviews = [] } = useQuery({
    queryKey: ["my-reviews", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("order_id").eq("buyer_id", userId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders", userId] });
      toast.success("Order updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addReview = useMutation({
    mutationFn: async ({ order, rating, comment }: { order: DbOrder; rating: number; comment: string }) => {
      const { error } = await supabase.from("reviews").insert({
        order_id: order.id,
        listing_id: order.listing_id,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
        rating,
        comment,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-reviews", userId] });
      toast.success("Review submitted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const listingMap = new Map(listings.map((l) => [l.id, l]));
  const reviewedOrderIds = new Set(myReviews.map((r) => r.order_id));
  const sellerOrders = orders.filter((o) => o.seller_id === userId);
  const buyerOrders = orders.filter((o) => o.buyer_id === userId);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-serif text-2xl text-primary">Orders to confirm (Seller)</h3>
        <div className="mt-4 space-y-3">
          {sellerOrders.length === 0 && <p className="text-sm text-muted-foreground">No incoming orders yet.</p>}
          {sellerOrders.map((order) => {
            const listing = listingMap.get(order.listing_id);
            return (
              <div key={order.id} className="rounded-xl border border-border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="font-medium">{listing?.title || "Listing"}</div>
                  <div className="text-xs text-muted-foreground">{formatPKR(order.amount)} · {order.payment_method} · {order.status}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {order.status === "pending_seller_confirmation" && (
                    <>
                      <Button size="sm" onClick={() => updateOrder.mutate({ id: order.id, status: "confirmed" })}>Confirm</Button>
                      <Button size="sm" variant="outline" onClick={() => updateOrder.mutate({ id: order.id, status: "rejected" })}>Reject</Button>
                    </>
                  )}
                  {order.status === "confirmed" && (
                    <Button size="sm" onClick={() => updateOrder.mutate({ id: order.id, status: "in_delivery" })}>Move to delivery</Button>
                  )}
                  {order.status === "in_delivery" && (
                    <Button size="sm" onClick={() => updateOrder.mutate({ id: order.id, status: "delivered" })}>Mark delivered</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-serif text-2xl text-primary">My purchases</h3>
        <div className="mt-4 space-y-3">
          {buyerOrders.length === 0 && <p className="text-sm text-muted-foreground">No orders placed yet.</p>}
          {buyerOrders.map((order) => {
            const listing = listingMap.get(order.listing_id);
            const canReview = order.status === "delivered" && !reviewedOrderIds.has(order.id);
            return (
              <div key={order.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="font-medium">{listing?.title || "Listing"}</div>
                    <div className="text-xs text-muted-foreground">{formatPKR(order.amount)} · {order.payment_method} · {order.status}</div>
                  </div>
                  {listing?.slug && <Button variant="outline" size="sm" asChild><Link to="/product/$slug" params={{ slug: listing.slug }}>View listing</Link></Button>}
                </div>
                {canReview && (
                  <div className="mt-3 grid md:grid-cols-[120px_1fr_auto] gap-2">
                    <select
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                      onChange={(e) => setNote((prev) => ({ ...prev, [`rating:${order.id}`]: e.target.value }))}
                      defaultValue="5"
                    >
                      <option value="5">5 stars</option>
                      <option value="4">4 stars</option>
                      <option value="3">3 stars</option>
                      <option value="2">2 stars</option>
                      <option value="1">1 star</option>
                    </select>
                    <input
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                      placeholder="Share your experience"
                      value={note[`comment:${order.id}`] || ""}
                      onChange={(e) => setNote((prev) => ({ ...prev, [`comment:${order.id}`]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      disabled={addReview.isPending}
                      onClick={() => addReview.mutate({
                        order,
                        rating: Number(note[`rating:${order.id}`] || "5"),
                        comment: note[`comment:${order.id}`] || "",
                      })}
                    >
                      Submit review
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AdminPanel() {
  const qc = useQueryClient();
  const [newCategory, setNewCategory] = useState("");

  const { data: listings = [] } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,title,category,price,status,seller_name,created_at,featured")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,phone,role,is_blocked,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name,slug,is_active").order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("amount,status,created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const revenue = orders.filter((o) => o.status === "delivered").reduce((sum, o) => sum + Number(o.amount || 0), 0);

  const categorySeries = useMemo(() => {
    const map = new Map<string, number>();
    for (const listing of listings) map.set(listing.category, (map.get(listing.category) || 0) + 1);
    return Array.from(map.entries()).map(([name, total]) => ({ name, total }));
  }, [listings]);

  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      const slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
      const { error } = await supabase.from("categories").insert({ name: name.trim(), slug });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewCategory("");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleCategory = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("categories").update({ is_active: !isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markSold = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").update({ status: "sold" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-listings"] });
      toast.success("Listing marked sold");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase.from("listings").update({ featured: !featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-listings"] });
      qc.invalidateQueries({ queryKey: ["featured"] });
      toast.success("Featured status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleBlock = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_blocked: !blocked }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-8 min-w-0">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi icon={ListChecks} label="Total listings" value={String(listings.length)} />
        <Kpi icon={ShieldCheck} label="Sold listings" value={String(listings.filter((l) => l.status === "sold").length)} />
        <Kpi icon={UserRoundCog} label="Total users" value={String(users.length)} />
        <Kpi icon={Star} label="Revenue (delivered)" value={formatPKR(revenue)} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-serif text-2xl text-primary">Listings by category</h3>
        <ChartContainer
          className="mt-4 h-[230px] sm:h-[280px] w-full"
          config={{
            total: { label: "Listings", color: "var(--primary)" },
          }}
        >
          <BarChart data={categorySeries} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="total" fill="var(--color-total)" radius={6} />
          </BarChart>
        </ChartContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h3 className="font-serif text-2xl text-primary">Category management</h3>
          <div className="mt-4 rounded-xl border border-border/80 bg-background/60 p-3 sm:p-3.5 space-y-2.5">
            <label htmlFor="new-category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New category</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="new-category"
                className="h-[54px] min-h-[54px] sm:h-11 sm:min-h-11 flex-1 rounded-xl border-2 border-border bg-background px-4 text-base sm:text-sm leading-6 appearance-none transition focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Home appliances"
              />
              <Button size="sm" className="h-12 sm:h-11 sm:w-auto w-full" onClick={() => createCategory.mutate(newCategory)} disabled={!newCategory.trim() || createCategory.isPending}>
                <Plus className="h-4 w-4" /> Create
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Use a short, clear name. Slug is generated automatically.</p>
          </div>
          <div className="mt-4 space-y-2 max-h-64 overflow-auto">
            {categories.map((c) => (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-border p-2 text-sm">
                <div className="break-words">{c.name} <span className="text-muted-foreground">({c.slug})</span></div>
                <Button size="sm" className="w-full sm:w-auto" variant="outline" onClick={() => toggleCategory.mutate({ id: c.id, isActive: c.is_active })}>{c.is_active ? "Disable" : "Enable"}</Button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h3 className="font-serif text-2xl text-primary">User moderation</h3>
          <div className="mt-4 space-y-2 max-h-80 overflow-auto">
            {users.map((u) => (
              <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-border p-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">{u.full_name || "Unnamed user"}</div>
                  <div className="text-xs text-muted-foreground">{u.phone || "No phone"} · {u.role}</div>
                </div>
                <Button size="sm" className="w-full sm:w-auto" variant={u.is_blocked ? "default" : "outline"} onClick={() => toggleBlock.mutate({ id: u.id, blocked: u.is_blocked })}>
                  {u.is_blocked ? "Unblock" : "Block"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h3 className="font-serif text-2xl text-primary">All listings</h3>
        <div className="mt-4 space-y-2 max-h-96 overflow-auto">
          {listings.map((l) => (
            <div key={l.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg border border-border p-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{l.title}</div>
                <div className="text-xs text-muted-foreground break-words">{l.category} · {formatPKR(Number(l.price))} · {l.status} · {l.seller_name}</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Button size="sm" className="w-full md:w-auto" variant={l.featured ? "default" : "outline"} disabled={toggleFeatured.isPending} onClick={() => toggleFeatured.mutate({ id: l.id, featured: !!l.featured })}>
                  {l.featured ? "Unfeature" : "Feature"}
                </Button>
                <Button size="sm" className="w-full md:w-auto" variant="outline" disabled={l.status === "sold" || markSold.isPending} onClick={() => markSold.mutate(l.id)}>Mark sold</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary"><Icon className="h-4 w-4" /></div>
      </div>
      <div className="mt-4 font-serif text-2xl sm:text-3xl text-primary break-words">{value}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
