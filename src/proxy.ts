import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Mantiene viva la sesión de Supabase y protege /admin — el barbero es el
// único usuario autenticado del sistema (ver README: RLS por es_admin()).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";

  if (pathname.startsWith("/admin") && !isLoginPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }
  if (isLoginPage && user) {
    // Tener sesión no basta para saltarse el login: los clientes también
    // inician sesión (en /cuenta). Si se redirigía a cualquiera con sesión,
    // el layout protegido lo devolvía aquí por no ser admin y el navegador
    // entraba en un bucle de redirecciones.
    const { data: esAdmin } = await supabase.rpc("es_admin");
    if (esAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/hoy";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
