import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, MapPin, Upload, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { categories, cities, conditions } from "@/lib/data";
import { isVideoFile, isVideoUrl } from "@/lib/media";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchListing } from "@/lib/listings";

type MediaItem = {
  preview: string;
  file?: File;
  existingUrl?: string;
};

export const Route = createFileRoute("/edit/$slug")({
  head: () => ({ meta: [{ title: "Edit Listing — Purana Bazaar" }] }),
  component: EditListing,
  loader: async ({ params }) => {
    const product = await fetchListing(params.slug);
    if (!product) throw notFound();
    return { product };
  },
});

function EditListing() {
  const { product } = Route.useLoaderData();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(
    (product.images || []).map((url) => ({ preview: url, existingUrl: url })),
  );
  const [title, setTitle] = useState(product.title);
  const [category, setCategory] = useState(product.category);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(String(product.price));
  const [condition, setCondition] = useState(product.condition);
  const [city, setCity] = useState(product.city);
  const [contactEmail, setContactEmail] = useState(product.seller_email);
  const [contactPhone, setContactPhone] = useState(product.seller_phone);
  const [submitting, setSubmitting] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, is_blocked, role")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: dbCategories = [] } = useQuery({
    queryKey: ["active-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("slug,name")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const categoryOptions = dbCategories.length
    ? dbCategories.map((item) => ({ value: item.slug, label: item.name }))
    : categories.map((c) => ({ value: c.slug, label: c.name }));

  const isAdmin = profile?.role === "admin";

  // Check if user is the owner of this listing
  if (!authLoading && user && product.seller_id !== user.id) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-md mx-auto py-32 text-center px-4">
          <h1 className="font-serif text-4xl text-primary">Access denied</h1>
          <p className="text-muted-foreground mt-3">You can only edit your own listings.</p>
          <div className="mt-6 flex gap-2 justify-center">
            <Button variant="hero" asChild><Link to="/dashboard">Go to dashboard</Link></Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []).slice(0, 12 - mediaItems.length);
    if (!list.length) return;
    setMediaItems((prev) => [
      ...prev,
      ...list.map((file) => ({ preview: URL.createObjectURL(file), file })),
    ]);
    e.target.value = "";
  };

  const removeFile = (i: number) => {
    setMediaItems((prev) => {
      const removed = prev[i];
      if (removed?.file) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const setPrimaryMedia = (index: number) => {
    setMediaItems((prev) => {
      const selected = prev[index];
      if (!selected) return prev;
      const remaining = prev.filter((_, idx) => idx !== index);
      return [selected, ...remaining];
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.info("Please sign in to edit"); navigate({ to: "/login" }); return; }
    if (!title || !price) { toast.error("Title and price are required"); return; }
    if (!contactEmail.trim() || !contactPhone.trim()) { toast.error("Email and phone are required for listing contact"); return; }
    if (profile?.is_blocked) { toast.error("Your account is blocked. You cannot edit listings."); return; }
    
    setSubmitting(true);
    try {
      // Index 0 is treated as primary media, so preserve current media order.
      const urls: string[] = [];
      for (const item of mediaItems) {
        if (item.existingUrl) {
          urls.push(item.existingUrl);
          continue;
        }
        if (!item.file) continue;
        const ext = item.file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("listings").upload(path, item.file, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("listings").getPublicUrl(path);
        urls.push(pub.publicUrl);
      }

      const { error } = await supabase.from("listings").update({
        title,
        description,
        price: Number(price),
        category,
        condition,
        city,
        seller_email: contactEmail.trim(),
        seller_phone: contactPhone.trim(),
        images: urls,
      }).eq("id", product.id);
      if (error) throw error;
      toast.success("Listing updated!");
      navigate({ to: "/product/$slug", params: { slug: product.slug } });
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-md mx-auto py-32 text-center px-4">
          <h1 className="font-serif text-4xl text-primary">Sign in to edit</h1>
          <p className="text-muted-foreground mt-3">Create a free account in 30 seconds.</p>
          <div className="mt-6 flex gap-2 justify-center">
            <Button variant="hero" asChild><Link to="/login">Sign in</Link></Button>
            <Button variant="outline" asChild><Link to="/signup">Create account</Link></Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!authLoading && !!user && profileLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-md mx-auto py-32 text-center px-4">
          <h1 className="font-serif text-4xl text-primary">Checking access…</h1>
          <p className="text-muted-foreground mt-3">Please wait a moment.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-4xl px-4 md:px-8 py-12">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs uppercase tracking-[0.3em] text-gold">Edit listing</span>
          <h1 className="font-serif text-4xl md:text-5xl text-primary mt-2">Update your item details</h1>
          <p className="text-muted-foreground mt-3">Make changes to your listing information.</p>
        </div>

        <form onSubmit={submit} className="mt-12 space-y-6 rounded-3xl bg-card border border-border p-6 md:p-10 shadow-soft">
          <div>
            <Label>Photos and videos · up to 12</Label>
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              <label className="aspect-square rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-accent transition flex flex-col items-center justify-center gap-1 text-muted-foreground cursor-pointer">
                <Camera className="h-5 w-5" /><span className="text-xs">Add</span>
                <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={onPickFiles} />
              </label>
              {mediaItems.map((item, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-secondary">
                  {(item.existingUrl && isVideoUrl(item.existingUrl)) || (!!item.file && isVideoFile(item.file)) ? (
                    <video src={item.preview} className="w-full h-full object-contain bg-black/5" muted playsInline preload="metadata" />
                  ) : (
                    <img src={item.preview} alt="" className="w-full h-full object-contain" />
                  )}
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Primary</span>
                  )}
                  {isAdmin && mediaItems.length > 2 && i !== 0 && (
                    <button
                      type="button"
                      onClick={() => setPrimaryMedia(i)}
                      className="absolute bottom-1 left-1 rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-semibold hover:bg-card"
                    >
                      Set primary
                    </button>
                  )}
                  <button type="button" onClick={() => removeFile(i)} className="absolute top-1 right-1 h-6 w-6 grid place-items-center rounded-full bg-card/90"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            {isAdmin && mediaItems.length > 2 && (
              <p className="mt-2 text-xs text-muted-foreground">Admins can choose one primary media item. The primary media appears first.</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="iPhone 13 Pro 256GB — Mint" />
            <FormSelect label="Category" value={category} onValueChange={setCategory} options={categoryOptions} />
          </div>

          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe condition, accessories, reason for selling..." />

          <div className="grid sm:grid-cols-3 gap-5">
            <Input label="Price (PKR)" required type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="215000" />
            <FormSelect label="Condition" value={condition} onValueChange={setCondition} options={conditions.map((c) => ({ value: c, label: c }))} />
            <FormSelect label="City" value={city} onValueChange={setCity} options={cities.map((c) => ({ value: c, label: c }))} />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Input
              label="Contact email"
              required
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Contact phone"
              required
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="03xx-xxxxxxx"
            />
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary">
            <MapPin className="h-5 w-5 text-primary" />
            <div className="flex-1 text-sm">Location: {city} · helps nearby buyers find you</div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" type="button" asChild><Link to="/dashboard">Cancel</Link></Button>
            <Button variant="hero" size="lg" type="submit" disabled={submitting}><Upload /> {submitting ? "Updating…" : "Update listing"}</Button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{children}</span>;
}
function Input({ label, ...r }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block"><Label>{label}</Label><input {...r} className="mt-1.5 w-full h-11 px-4 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm" /></label>;
}
function Textarea({ label, ...r }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <label className="block"><Label>{label}</Label><textarea rows={4} {...r} className="mt-1.5 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none text-sm" /></label>;
}
function FormSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="mt-1.5 h-11 rounded-xl border-border bg-background text-sm shadow-none">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border/70 shadow-elegant">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
