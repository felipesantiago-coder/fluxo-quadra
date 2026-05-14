import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirecionar rota antiga de login para a nova página inicial
  if (pathname === "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Rotas protegidas: /admin, /admin-sistema, /espelho, /villa-bianco, /moment, /projetos, /empreendimento
  const isProtectedRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/admin-sistema") ||
    pathname.startsWith("/empreendimento") ||
    pathname === "/espelho" ||
    pathname === "/villa-bianco" ||
    pathname === "/moment" ||
    pathname === "/projetos";

  if (!isProtectedRoute) {
    return NextResponse.next({ request });
  }

  // Verificar autenticação via cookie de sessão do Supabase
  try {
    const allCookies = request.cookies.getAll();
    const hasSessionCookie = allCookies.some(
      (c) => c.name.includes("sb-") && c.name.includes("-auth-token")
    );

    if (!hasSessionCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("reason", "unauthenticated");
      return NextResponse.redirect(url);
    }
  } catch {
    return NextResponse.next({ request });
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/admin/:path*", "/admin-sistema/:path*", "/empreendimento/:path*", "/espelho", "/villa-bianco", "/moment", "/projetos"],
};
