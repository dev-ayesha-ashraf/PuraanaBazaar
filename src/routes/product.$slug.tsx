import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { OrderConfirmationDialog } from "@/components/OrderConfirmationDialog";
import { formatPKR, timeAgo } from "@/lib/data";
import { fetchListing, fetchListings } from "@/lib/listings";
import { Button } from "@/components/ui/button";
import { Heart, LayoutGrid, List, MapPin, MessageCircle, Share2, ShieldCheck, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFavorite } from "@/hooks/use-favorites";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isVideoUrl } from "@/lib/media";

export const Route = createFileRoute("/product/$slug")({
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.product?.title ?? "Listing"} — Purana Bazaar` }],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <h1 className="font-serif text-4xl text-primary">Listing not found</h1>
        <Link to="/browse" className="text-primary underline mt-4 inline-block">Back to browse</Link>
      </div>
    </div>
  ),
  loader: async ({ params }) => {
    const product = await fetchListing(params.slug);
    if (!product) throw notFound();
    return { product };
  },
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"desc" | "specs" | "safety">("desc");
  const [activeImg, setActiveImg] = useState(0);
  const [relatedView, setRelatedView] = useState<"grid" | "list">("grid");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [buyerNote, setBuyerNote] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const { isFav, toggle } = useFavorite(product.id);

  useEffect(() => {
    if (!contactEmail && user?.email) setContactEmail(user.email);
  }, [contactEmail, user?.email]);

  const { data: related = [] } = useQuery({
    queryKey: ["related", product.category, product.id],
    queryFn: async () => {
      const items = await fetchListings({ category: product.category, limit: 8 });
      return items.filter((p) => p.id !== product.id).slice(0, 4);
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["seller-reviews", product.seller_id],
    queryFn: async () => {
      if (!product.seller_id) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("id,rating,comment,created_at,buyer_id")
        .eq("seller_id", product.seller_id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const rows = data ?? [];

      // Fetch buyer names from profiles
      const buyerIds = [...new Set(rows.map((r) => r.buyer_id).filter(Boolean))];
      let nameMap: Record<string, string> = {};
      if (buyerIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id,full_name")
          .in("id", buyerIds);
        for (const p of profiles ?? []) nameMap[p.id] = p.full_name ?? "Anonymous";
      }

      return rows.map((r) => ({ ...r, buyer_name: nameMap[r.buyer_id] ?? "Anonymous" }));
    },
  });

  const avgRating = reviews.length ? (reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length).toFixed(1) : null;

  const mediaItems = product.images?.length ? product.images : ["https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=1200"];

  const handleSave = async () => {
    if (!user) { toast.info("Sign in to save items"); navigate({ to: "/login" }); return; }
    await toggle();
  };

  const handleContactSeller = () => {
    if (!user) { 
      toast.info("Sign in to contact seller"); 
      navigate({ to: "/login" }); 
      return; 
    }
    
    const message = `Hi ${product.seller_name}! I'm interested in "${product.title}" listed on Purana Bazaar for ${formatPKR(product.price)}. Can we discuss this?`;
    const encodedMessage = encodeURIComponent(message);

    if (product.seller_phone) {
      const phone = product.seller_phone.replace(/\D/g, "");
      window.open(`https://wa.me/${phone}?text=${encodedMessage}`, "_blank");
      return;
    }

    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  };

  const handleShowOrderConfirmation = () => {
    if (!user) {
      toast.info("Sign in to place an order");
      navigate({ to: "/login" });
      return;
    }
    if (!product.seller_id) {
      toast.error("This listing is currently unavailable for orders.");
      return;
    }
    if (!contactEmail.trim() || !contactPhone.trim()) {
      toast.error("Email and phone are required");
      return;
    }
    const cleanAddress = deliveryAddress.trim();
    if (!cleanAddress) {
      toast.error("Delivery address is required");
      return;
    }
    const addressParts = cleanAddress.split(/\s+/).filter(Boolean);
    if (cleanAddress.length < 15 || addressParts.length < 3) {
      toast.error("Please enter a complete address (house/street/area/city)");
      return;
    }
    if (paymentMethod === "ONLINE") {
      toast.info("Online payments with Stripe are coming soon. Please select Cash on Delivery for now.");
      return;
    }

    setShowOrderConfirmation(true);
  };

  const handlePlaceOrder = async () => {
    setPlacingOrder(true);
    setShowOrderConfirmation(false);
    try {
      const cleanAddress = deliveryAddress.trim();
      const { error } = await supabase.from("orders").insert({
        listing_id: product.id,
        buyer_id: user!.id,
        seller_id: product.seller_id,
        amount: product.price,
        payment_method: paymentMethod,
        payment_status: "pending",
        status: "pending_seller_confirmation",
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        delivery_address: cleanAddress,
        buyer_note: buyerNote.trim() || null,
      });
      if (error) throw error;
      toast.success("Order placed. Waiting for seller confirmation.");
      navigate({ to: "/dashboard" });
    } catch (error: any) {
      toast.error(error.message || "Unable to place order");
      setShowOrderConfirmation(false);
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-8">
        <nav className="text-xs text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">Home</Link> / <Link to="/browse" className="hover:text-primary">Browse</Link> / <span className="text-foreground">{product.title}</span>
        </nav>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10">
          <div className="space-y-3">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-card shadow-elegant">
              {isVideoUrl(mediaItems[activeImg]) ? (
                <video src={mediaItems[activeImg]} className="w-full h-full object-contain bg-black/5" controls playsInline preload="metadata" />
              ) : (
                <img src={mediaItems[activeImg]} alt={product.title} className="w-full h-full object-contain" />
              )}
            </div>
            {mediaItems.length > 1 && (
              <div className="grid grid-cols-5 gap-3">
                {mediaItems.map((src: string, i: number) => (
                  <button key={i} onClick={() => setActiveImg(i)} className={`aspect-square rounded-xl overflow-hidden border-2 ${i === activeImg ? "border-primary" : "border-border"}`}>
                    {isVideoUrl(src) ? (
                      <video src={src} className="w-full h-full object-contain bg-black/5" muted playsInline preload="metadata" />
                    ) : (
                      <img src={src} alt="" className="w-full h-full object-contain" />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-8 rounded-2xl bg-card border border-border p-1 inline-flex">
              {(["desc", "specs", "safety"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 text-sm rounded-xl transition ${tab === t ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-primary"}`}>
                  {t === "desc" ? "Description" : t === "specs" ? "Specifications" : "Safety tips"}
                </button>
              ))}
            </div>
            <div className="rounded-2xl bg-card border border-border p-6 mt-3 leading-relaxed text-sm text-foreground/80">
              {tab === "desc" && <p className="whitespace-pre-line">{product.description || "No description provided."}</p>}
              {tab === "specs" && (
                <ul className="grid sm:grid-cols-2 gap-2">
                  {[["Condition", product.condition], ["Posted", timeAgo(product.created_at)], ["Category", product.category], ["Location", product.city], ["Views", String(product.views)], ["Status", product.status]].map(([k, v]) => (
                    <li key={k} className="flex justify-between border-b border-border py-2"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></li>
                  ))}
                </ul>
              )}
              {tab === "safety" && (
                <ul className="space-y-2 list-disc pl-5">
                  <li>Always meet in a public place during the day.</li>
                  <li>Inspect the item thoroughly before payment.</li>
                  <li>Use Stripe-secured checkout when possible.</li>
                  <li>Never wire money in advance to unknown sellers.</li>
                </ul>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl bg-card border border-border p-6 shadow-soft sticky top-20">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-gradient-gold text-gold-foreground font-semibold">{product.condition}</span>
                {product.verified && <span className="px-2.5 py-1 rounded-full bg-success/15 text-success inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Verified</span>}
              </div>
              <h1 className="font-serif text-3xl text-primary mt-4 leading-tight">{product.title}</h1>
              <div className="font-serif text-4xl mt-3">{formatPKR(product.price)}</div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-3">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{product.city}</span>
                <span>·</span><span>{timeAgo(product.created_at)}</span>
              </div>

              <div className="mt-6 space-y-2">
                <Button variant="hero" size="lg" className="w-full" onClick={handleContactSeller}><MessageCircle /> Contact seller</Button>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button variant="ghost" onClick={handleSave}><Heart className={isFav ? "fill-destructive text-destructive" : ""} /> {isFav ? "Saved" : "Save"}</Button>
                  <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }}><Share2 /> Share</Button>
                </div>
              </div>

              <div className="mt-7 pt-6 border-t border-border">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center font-serif text-lg">{product.seller_name[0]}</div>
                  <div className="flex-1">
                    <div className="font-medium">{product.seller_name}</div>
                    {avgRating ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-gold">{"★".repeat(Math.round(Number(avgRating)))}{"☆".repeat(5 - Math.round(Number(avgRating)))}</span>
                        <span className="text-xs text-muted-foreground">{avgRating} / 5 ({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
                        <a href="#seller-reviews" className="text-xs text-primary underline underline-offset-2 hover:opacity-80 transition">View all reviews</a>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><Star className="h-3 w-3 fill-gold text-gold" /> Trusted seller</div>
                    )}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <Stat n="98%" l="Response" />
                  <Stat n="2 yrs" l="Member" />
                  <Stat n="<1h" l="Replies" />
                </div>
              </div>

              {product.status !== "sold" && (
                <div className="mt-6 pt-6 border-t border-border space-y-2">
                  <h3 className="font-serif text-xl text-primary">Place order</h3>
                  <p className="text-xs text-muted-foreground">Seller must confirm before delivery starts.</p>
                  <div className="grid gap-2">
                    <input
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                      type="email"
                      placeholder="Your email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                    <input
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                      type="tel"
                      placeholder="Your phone"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                    <input
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                      placeholder="Delivery address (required)"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">Include house number, street, area and city for delivery.</p>
                    <textarea
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Message for seller (optional)"
                      value={buyerNote}
                      onChange={(e) => setBuyerNote(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("COD")}
                        className={`h-10 rounded-lg border text-sm ${paymentMethod === "COD" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                      >
                        Cash on Delivery
                      </button>
                      <button
                        type="button"
                        disabled
                        className="h-10 rounded-lg border text-sm border-border text-muted-foreground cursor-not-allowed opacity-70"
                      >
                        Online (Temporarily disabled)
                      </button>
                    </div>
                    <Button disabled={placingOrder} onClick={handleShowOrderConfirmation}>{placingOrder ? "Placing order..." : "Place order"}</Button>
                    {!product.seller_id && <p className="text-[11px] text-destructive">Seller account is unavailable, so orders are disabled for this listing.</p>}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="mt-20">
            <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
              <h2 className="font-serif text-3xl text-primary">Similar listings</h2>
              <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-soft">
                <button
                  type="button"
                  onClick={() => setRelatedView("grid")}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition ${relatedView === "grid" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-primary"}`}
                  aria-label="Card view"
                  title="Card view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRelatedView("list")}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition ${relatedView === "list" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-primary"}`}
                  aria-label="List view"
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className={relatedView === "list" ? "space-y-4" : "grid sm:grid-cols-2 lg:grid-cols-4 gap-6"}>
              {related.map((p) => <ProductCard key={p.id} product={p} compact={relatedView === "list"} />)}
            </div>
          </div>
        )}

        <div className="mt-20" id="seller-reviews">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-serif text-3xl text-primary">Seller Reviews</h2>
            <div className="text-sm text-muted-foreground">{avgRating ? `${avgRating} / 5 from ${reviews.length} review${reviews.length !== 1 ? "s" : ""}` : "No reviews yet"}</div>
          </div>
          <div className="mt-6 space-y-3">
            {reviews.length === 0 && <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">This seller has no reviews yet.</div>}
            {reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center text-xs font-semibold">
                      {review.buyer_name[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{review.buyer_name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{timeAgo(review.created_at)}</div>
                </div>
                <div className="mt-2 font-medium text-sm">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
                <p className="mt-1 text-sm text-foreground/85">{review.comment || "No comment provided."}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <OrderConfirmationDialog
        isOpen={showOrderConfirmation}
        productTitle={product.title}
        productPrice={formatPKR(product.price)}
        onConfirm={handlePlaceOrder}
        onCancel={() => setShowOrderConfirmation(false)}
      />
      <Footer />
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="rounded-xl bg-secondary py-2">
      <div className="font-serif text-base text-primary">{n}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
    </div>
  );
}
