import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Aquí aterriza el enlace de "he olvidado mi contraseña" que manda Supabase.
// Sin esta ruta el enlace caía en una URL que nadie consumía, así que la app
// no tenía ninguna forma de recuperar el acceso: la contraseña era la única
// llave y perderla obligaba a entrar por base de datos.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  // `next` viene de la URL, así que solo se aceptan rutas internas: sin esto,
  // un "next=https://otro-sitio" convertiría esta ruta en un redirector
  // abierto con la marca del negocio delante.
  const pedido = searchParams.get("next") ?? "";
  const destino = pedido.startsWith("/") && !pedido.startsWith("//") ? pedido : "/admin/nueva-password";

  if (!code) return NextResponse.redirect(new URL("/admin/login?error=enlace", origin));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/admin/login?error=caducado", origin));

  return NextResponse.redirect(new URL(destino, origin));
}
