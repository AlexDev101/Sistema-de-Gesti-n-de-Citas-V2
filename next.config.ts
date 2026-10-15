import type { NextConfig } from "next";

// Las fotos de la galería se suben al Storage de Supabase de cada instalación:
// se permite sólo la ruta pública de ese proyecto (sacada de la URL que ya
// está en las variables de entorno) y las miniaturas de YouTube.
function hostSupabase(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname || "*.supabase.co";
  } catch {
    return "*.supabase.co";
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: hostSupabase(), pathname: "/storage/v1/object/public/galeria/**" },
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
    ],
  },
};

export default nextConfig;
