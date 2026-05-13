import logo from "@/assets/logo.png";
import { Link } from "@tanstack/react-router";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <img src={logo} alt="Purana Bazaar" className="h-9 w-9 object-contain transition-transform group-hover:scale-105" />
      {!compact && (
        <div className="leading-tight">
          <div className="font-serif text-lg font-semibold text-foreground">Purana Bazaar</div>
          <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-foreground/75">Preloved · Trusted</div>
        </div>
      )}
    </Link>
  );
}
