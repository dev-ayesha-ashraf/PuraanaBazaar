import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

export function Footer() {
  const cols = [
    { title: "Marketplace", links: ["Browse", "Categories", "Featured", "Recently listed"] },
    { title: "Sell", links: ["Post an ad", "Pricing", "Boost listing", "Seller hub"] },
    { title: "Company", links: ["About", "Careers", "Press", "Blog"] },
    { title: "Support", links: ["Help center", "Safety tips", "Contact", "Report"] },
  ];
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-16 grid gap-10 md:grid-cols-6">
        <div className="md:col-span-2 space-y-4">
          <Logo />
          <p className="text-sm text-muted-foreground max-w-xs">
            Pakistan's most trusted modern marketplace for preloved treasures. Buy smart. Sell easy. Live sustainably.
          </p>
          <div className="flex gap-2">
            {[Facebook, Instagram, Twitter, Youtube].map((I, i) => (
              <a key={i} href="#" className="h-9 w-9 grid place-items-center rounded-full border border-border hover:bg-primary hover:text-primary-foreground transition">
                <I className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="font-serif text-base text-primary mb-4">{c.title}</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {c.links.map((l) => (
                <li key={l}><Link to="/" className="hover:text-primary transition">{l}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
          <span>© 2026 Purana Bazaar. All rights reserved.</span>
          <span className="flex gap-5"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Cookies</a></span>
        </div>
      </div>
    </footer>
  );
}
