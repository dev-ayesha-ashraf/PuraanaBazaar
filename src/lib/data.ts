import type { LucideIcon } from "lucide-react";
import {
  Bike,
  Briefcase,
  Car,
  Computer,
  Hammer,
  Home,
  Shirt,
  Smartphone,
  Sofa,
  Trophy,
  BookOpen,
  PawPrint,
} from "lucide-react";

type Category = {
  slug: string;
  name: string;
  icon: LucideIcon;
};

export const categories: Category[] = [
  { slug: "mobiles", name: "Mobiles", icon: Smartphone },
  { slug: "cars", name: "Cars", icon: Car },
  { slug: "bikes", name: "Bikes", icon: Bike },
  { slug: "real-estate", name: "Real Estate", icon: Home },
  { slug: "electronics", name: "Electronics", icon: Computer },
  { slug: "furniture", name: "Furniture", icon: Sofa },
  { slug: "fashion", name: "Fashion", icon: Shirt },
  { slug: "books", name: "Books", icon: BookOpen },
  { slug: "jobs", name: "Jobs", icon: Briefcase },
  { slug: "services", name: "Services", icon: Hammer },
  { slug: "pets", name: "Pets", icon: PawPrint },
  { slug: "sports", name: "Sports", icon: Trophy },
];

export const cities = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Multan", "Faisalabad", "Peshawar", "Quetta"];
export const conditions = ["New", "Like New", "Good", "Used"] as const;

export const formatPKR = (n: number) =>
  "Rs " + new Intl.NumberFormat("en-PK").format(Math.round(n));

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export type Listing = {
  id: string;
  slug: string;
  seller_id: string | null;
  seller_name: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  condition: string;
  city: string;
  images: string[];
  seller_email: string | null;
  seller_phone: string | null;
  featured: boolean;
  verified: boolean;
  status: string;
  views: number;
  created_at: string;
};
