import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "sonner";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { CSSProperties } from "react";

import appCss from "../styles.css?url";
import logoPng from "@/assets/logo.png";

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
      { title: "Lovable App" },
      { name: "description", content: "Lovable Generated Project" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Lovable Generated Project" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
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
        <div id="app-splash" className="app-splash" aria-hidden="true">
          <div className="app-splash__falling" aria-hidden="true">
            <span className="app-splash__fall-item app-splash__fall-item--a" style={{ "--x": "44%", "--d": "0.15s" } as CSSProperties} />
            <span className="app-splash__fall-item app-splash__fall-item--b" style={{ "--x": "50%", "--d": "0.45s" } as CSSProperties} />
            <span className="app-splash__fall-item app-splash__fall-item--c" style={{ "--x": "56%", "--d": "0.75s" } as CSSProperties} />
            <span className="app-splash__fall-item app-splash__fall-item--a" style={{ "--x": "47%", "--d": "1.05s" } as CSSProperties} />
            <span className="app-splash__fall-item app-splash__fall-item--b" style={{ "--x": "53%", "--d": "1.35s" } as CSSProperties} />
            <span className="app-splash__fall-item app-splash__fall-item--c" style={{ "--x": "49%", "--d": "1.65s" } as CSSProperties} />
            <span className="app-splash__fall-item app-splash__fall-item--a" style={{ "--x": "55%", "--d": "1.95s" } as CSSProperties} />
            <span className="app-splash__fall-item app-splash__fall-item--b" style={{ "--x": "46%", "--d": "2.2s" } as CSSProperties} />
          </div>

          <div className="app-splash__stage">
            <div className="app-splash__bag-drop" aria-hidden="true">
              <div className="app-splash__bag">
                <div className="app-splash__bag-handle" />
                <div className="app-splash__bag-opening" />
                <div className="app-splash__bag-body">
                  <img src={logoPng} alt="Purana Bazaar" className="app-splash__bag-logo" />
                  <p className="app-splash__bag-name">PB</p>
                  <p className="app-splash__bag-sub">Purana Bazaar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
  var splash = document.getElementById("app-splash");
  if (!splash) return;

  var start = Date.now();
  var minVisibleMs = 4400;
  var fadeMs = 760;
  var hidden = false;

  function hideSplash() {
    if (hidden) return;
    hidden = true;
    var elapsed = Date.now() - start;
    var wait = Math.max(minVisibleMs - elapsed, 0);

    window.setTimeout(function () {
      splash.classList.add("app-splash--hide");
      window.setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, fadeMs + 60);
    }, wait);
  }

  if (document.readyState === "complete") {
    hideSplash();
  } else {
    window.addEventListener("load", hideSplash, { once: true });
    window.setTimeout(hideSplash, 7600);
  }
})();`,
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
