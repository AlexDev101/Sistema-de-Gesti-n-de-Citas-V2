import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Aquí aterriza el enlace de "he olvidado mi contraseña" que manda Supabase.
//
// La plantilla del correo usa {{ .TokenHash }} en vez del {{ .ConfirmationURL }}
// por defecto. La diferencia importa: .ConfirmationURL apunta al propio
// /auth/v1/verify de Supabase, que confirma el token y redirige de vuelta
// aquí devolviendo la sesión en el fragmento de la URL (#access_token=...) —
// un fragmento que un Route Handler en el servidor nunca puede leer, porque
// el navegador no lo envía en la petición HTTP. Con eso la ruta recibía
// siempre "sin código" y el enlace parecía roto pasara el tiempo que pasara.
// Al enlazar aquí directamente con el token_hash como parámetro normal de
// la URL, sí llega al servidor, y verifyOtp() lo intercambia por una sesión
// sin depender de que el navegador que pidió el enlace sea el mismo que lo
// abre — a diferencia del intercambio por código (PKCE), que si lo hubiera
// usado habría exigido eso.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL("/admin/nueva-password", origin));
  }

  return NextResponse.redirect(new URL("/admin/login?error=caducado", origin));
}
