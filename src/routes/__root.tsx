import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import logoPng from "@/assets/logo.png";
import { SITE_URL, toAbsoluteUrl } from "@/lib/site";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Purana Bazaar — Pakistan's Premium Preloved Marketplace" },
      { name: "description", content: "Buy and sell preloved mobiles, cars, bikes, furniture and more across Pakistan." },
      { name: "author", content: "Purana Bazaar" },
      { property: "og:title", content: "Purana Bazaar — Pakistan's Premium Preloved Marketplace" },
      { property: "og:description", content: "Buy and sell preloved items across Pakistan with verified sellers." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: toAbsoluteUrl(logoPng) },
      { property: "og:site_name", content: "Purana Bazaar" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Purana Bazaar — Pakistan's Premium Preloved Marketplace" },
      { name: "twitter:description", content: "Buy and sell preloved items across Pakistan with verified sellers." },
      { name: "twitter:image", content: toAbsoluteUrl(logoPng) },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "canonical",
        href: SITE_URL,
      },
      {
        rel: "icon",
        type: "image/png",
        href: logoPng,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowPreloader(false);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, []);

  if (showPreloader) {
    return (
      <div className="pb-preloader" aria-live="polite" aria-label="Loading Purana Bazaar">
        <div className="pb-preloader__content">
          <img src={logoPng} alt="Purana Bazaar" className="pb-preloader__icon" />
          <div className="pb-preloader__wordmark" aria-hidden="true">
            <span className="pb-preloader__wordmark-top">purana</span>
            <span className="pb-preloader__wordmark-bottom">bazaar</span>
          </div>
          <p className="pb-preloader__tagline" aria-hidden="true">PURANA SAMAN, NAYI PEHCHAAN</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
