const SITE_URL = "https://puraana-bazaar.vercel.app";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toDescription(listing) {
  const base = (listing?.description || `Buy ${listing?.title || "this item"} on Purana Bazaar.`)
    .replace(/\s+/g, " ")
    .trim();
  if (!base) return "Find trusted preloved listings on Purana Bazaar.";
  return base.length > 170 ? `${base.slice(0, 167)}...` : base;
}

function pickOgImage(images) {
  const arr = Array.isArray(images) ? images : [];
  const preferred = arr.find((item) => typeof item === "string" && !/\.(mp4|webm|mov)(\?|$)/i.test(item));
  if (preferred) return preferred;
  return "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=1200&fit=crop&auto=format";
}

async function fetchListing(slug) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon || !slug) return null;

  const url = new URL(`${supabaseUrl}/rest/v1/listings`);
  url.searchParams.set("select", "slug,title,description,images,city,price");
  url.searchParams.set("slug", `eq.${slug}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      apikey: supabaseAnon,
      Authorization: `Bearer ${supabaseAnon}`,
    },
  });

  if (!response.ok) return null;
  const rows = await response.json();
  return rows?.[0] ?? null;
}

export default async function handler(req, res) {
  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  const listing = await fetchListing(slug);

  const safeSlug = encodeURIComponent(slug || "");
  const canonicalUrl = `${SITE_URL}/product/${safeSlug}`;

  const title = listing?.title ? `${listing.title} — Purana Bazaar` : "Purana Bazaar listing";
  const description = toDescription(listing);
  const image = pickOgImage(listing?.images);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="Purana Bazaar" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <meta http-equiv="refresh" content="0; url=${escapeHtml(canonicalUrl)}" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(canonicalUrl)});</script>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.end(html);
}
