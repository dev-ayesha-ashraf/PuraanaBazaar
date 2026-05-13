import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, MapPin, ShieldCheck } from "lucide-react";
import { formatPKR, timeAgo, type Listing } from "@/lib/data";
import { useAuth } from "@/hooks/use-auth";
import { useFavorite } from "@/hooks/use-favorites";
import { toast } from "sonner";

type ProductCardProps = {
  product: Listing;
  compact?: boolean;
};

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isFav, toggle, pending } = useFavorite(product.id);

  const onFav = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info("Sign in to save items");
      navigate({ to: "/login" });
      return;
    }
    await toggle();
  };

  const img = product.images?.[0] || "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=1200";

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className={`group relative block rounded-2xl bg-card overflow-hidden border border-border/60 shadow-soft hover:shadow-elegant transition-all duration-500 hover:-translate-y-1 ${compact ? "flex hover:-translate-y-0" : ""}`}
    >
      <div className={`relative overflow-hidden bg-muted ${compact ? "aspect-square w-28 shrink-0 sm:w-36" : "aspect-[4/3]"}`}>
        <img src={img} alt={product.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        {product.status === "sold" && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 pointer-events-none">
            <span className="px-4 py-1.5 text-sm uppercase tracking-widest rounded-full bg-destructive text-white font-bold shadow-lg">Sold</span>
          </div>
        )}
        {!compact && (
          <div className="absolute top-3 left-3 flex gap-1.5">
            {product.featured && (
              <span className="px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-full bg-gradient-gold text-gold-foreground font-semibold shadow-soft">Featured</span>
            )}
            <span className="px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-full bg-card/90 backdrop-blur text-foreground/80 font-medium">{product.condition}</span>
          </div>
        )}
        <button
          onClick={onFav}
          disabled={pending}
          className="absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full bg-card/90 backdrop-blur shadow-soft hover:bg-card transition disabled:opacity-50"
          aria-label="Favorite"
        >
          <Heart className={`h-4 w-4 transition ${isFav ? "fill-destructive text-destructive" : "text-foreground/70"}`} />
        </button>
      </div>
      <div className={`p-4 space-y-2 ${compact ? "flex-1 sm:p-5 sm:space-y-3" : ""}`}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-serif text-lg font-semibold text-primary">{formatPKR(product.price)}</span>
          <span className="text-[11px] text-muted-foreground">{timeAgo(product.created_at)}</span>
        </div>
        <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition">{product.title}</h3>
        {compact && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {product.status === "sold" && (
              <span className="px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-full bg-destructive/15 text-destructive font-semibold">Sold</span>
            )}
            {product.featured && (
              <span className="px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-full bg-gradient-gold text-gold-foreground font-semibold shadow-soft">Featured</span>
            )}
            <span className="px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-full bg-secondary text-foreground/80 font-medium">{product.condition}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{product.city}</span>
          <span className="inline-flex items-center gap-1.5">
            {product.verified && <ShieldCheck className="h-3 w-3 text-success" />}
            <span className="truncate max-w-[100px]">{product.seller_name}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
