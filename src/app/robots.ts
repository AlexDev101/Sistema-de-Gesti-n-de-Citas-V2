import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.SITE_URL ?? process.env.URL ?? "").replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/reservar/confirmacion", "/cuenta"] },
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
