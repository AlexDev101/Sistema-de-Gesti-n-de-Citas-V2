import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.SITE_URL ?? process.env.URL ?? "").replace(/\/$/, "");
  if (!base) return [];
  return ["", "/reservar", "/privacidad", "/aviso-legal"].map((ruta) => ({
    url: `${base}${ruta}`,
    changeFrequency: ruta === "" ? "weekly" : "monthly",
    priority: ruta === "" ? 1 : 0.5,
  }));
}
