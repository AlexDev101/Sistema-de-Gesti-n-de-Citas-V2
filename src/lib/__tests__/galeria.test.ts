import { describe, expect, it } from "vitest";
import {
  agrupar,
  enlaceVideoValido,
  nombreArchivo,
  problemaArchivo,
  rutaEnBucket,
  tipoDeArchivo,
  urlMediaValida,
  vecino,
  youtubeId,
} from "@/lib/galeria";

describe("galería", () => {
  it("reconoce fotos y vídeos por su tipo", () => {
    expect(tipoDeArchivo("image/jpeg")).toBe("foto");
    expect(tipoDeArchivo("image/webp")).toBe("foto");
    expect(tipoDeArchivo("video/mp4")).toBe("video");
    expect(tipoDeArchivo("video/quicktime")).toBe("video");
    expect(tipoDeArchivo("application/pdf")).toBeNull();
    expect(tipoDeArchivo("image/svg+xml")).toBeNull();
  });

  it("rechaza archivos demasiado grandes o de otro tipo", () => {
    expect(problemaArchivo({ type: "image/png", size: 2 * 1024 * 1024, name: "a.png" })).toBeNull();
    expect(problemaArchivo({ type: "image/png", size: 11 * 1024 * 1024, name: "a.png" })).toMatch(/10 MB/);
    expect(problemaArchivo({ type: "video/mp4", size: 40 * 1024 * 1024, name: "v.mp4" })).toBeNull();
    expect(problemaArchivo({ type: "video/mp4", size: 60 * 1024 * 1024, name: "v.mp4" })).toMatch(/50 MB/);
    expect(problemaArchivo({ type: "text/plain", size: 10, name: "x.txt" })).toMatch(/no es una foto/);
  });

  it("saca el id de los enlaces de YouTube", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtube.com/watch?feature=x&v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ?t=3")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
  });

  it("valida las direcciones", () => {
    expect(urlMediaValida("/uploads/trabajo-1.jpeg")).toBe(true);
    expect(urlMediaValida("https://x.supabase.co/storage/v1/object/public/galeria/a.jpg")).toBe(true);
    expect(urlMediaValida("http://inseguro.com/a.jpg")).toBe(false);
    expect(urlMediaValida("javascript:alert(1)")).toBe(false);
    expect(urlMediaValida("/uploads/../secreto")).toBe(false);
    expect(enlaceVideoValido("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    expect(enlaceVideoValido("https://cdn.x.com/corte.mp4")).toBe(true);
    expect(enlaceVideoValido("https://www.instagram.com/reel/abc")).toBe(false);
  });

  it("sabe qué archivos son del bucket", () => {
    expect(rutaEnBucket("https://x.supabase.co/storage/v1/object/public/galeria/123-ab.jpg")).toBe("123-ab.jpg");
    expect(rutaEnBucket("/uploads/trabajo-1.jpeg")).toBeNull();
    expect(rutaEnBucket("https://youtu.be/dQw4w9WgXcQ")).toBeNull();
  });

  it("genera nombres de archivo limpios", () => {
    expect(nombreArchivo("Foto Corte Ñ.JPG", 1000, 0.5)).toMatch(/^1000-[a-z0-9]+\.jpg$/);
    expect(nombreArchivo("sin-extension", 1, 0.1)).toMatch(/\.bin$/);
  });

  it("agrupa los elementos por sección y en orden", () => {
    const g = agrupar(
      [
        { id: "b", nombre: "Barba", orden: 2 },
        { id: "a", nombre: "Fade", orden: 1 },
      ],
      [
        { id: "2", seccion_id: "a", tipo: "foto", url: "/uploads/x.jpg", titulo: null, orden: 2 },
        { id: "1", seccion_id: "a", tipo: "video", url: "https://youtu.be/dQw4w9WgXcQ", titulo: "Vídeo", orden: 1 },
        { id: "3", seccion_id: "b", tipo: "foto", url: "/uploads/y.jpg", titulo: null, orden: 1 },
        { id: "4", seccion_id: null, tipo: "foto", url: "/uploads/z.jpg", titulo: null, orden: 1 },
      ]
    );
    expect(g.map((s) => s.nombre)).toEqual(["Fade", "Barba"]);
    expect(g[0].items.map((i) => i.id)).toEqual(["1", "2"]);
    expect(g[1].items).toHaveLength(1);
  });

  it("encuentra el vecino para reordenar", () => {
    const l = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(vecino(l, "b", -1)?.id).toBe("a");
    expect(vecino(l, "b", 1)?.id).toBe("c");
    expect(vecino(l, "a", -1)).toBeNull();
    expect(vecino(l, "x", 1)).toBeNull();
  });
});
