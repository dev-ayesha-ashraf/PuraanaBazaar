const DEFAULT_SITE_URL = "https://puraana-bazaar.vercel.app";

function normalizeSiteUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export const SITE_URL = normalizeSiteUrl(
  import.meta.env.VITE_PUBLIC_SITE_URL ??
    import.meta.env.VITE_SITE_URL ??
    import.meta.env.VITE_APP_URL ??
    DEFAULT_SITE_URL,
);

export function toAbsoluteUrl(path: string) {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getListingUrl(slug: string) {
  return toAbsoluteUrl(`/product/${encodeURIComponent(slug)}`);
}

export function getListingShareUrl(slug: string) {
  return toAbsoluteUrl(`/api/share/${encodeURIComponent(slug)}`);
}
