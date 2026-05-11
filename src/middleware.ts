import { type NextRequest, NextResponse } from "next/server";

// E-mails autorizados como admin (separados por vírgula)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter((e) => e.length > 0);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirecionar rota antiga de login para a nova página inicial
  if (pathname === "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Rotas protegidas: /admin, /espelho, /villa-bianco, /projetos
  const isProtectedRoute = pathname.startsWith("/admin") || pathname === "/espelho" || pathname === "/villa-bianco" || pathname === "/moment" || pathname === "/projetos";

  if (!isProtectedRoute) {
    return NextResponse.next({ request });
  }

  // Verificar autenticação via cookie de sessão do Supabase
  try {
    // Ler o cookie de sessão diretamente sem criar client Supabase
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
  } catch (error) {
    console.error("[middleware] Erro ao verificar sessão:", error);
    // Em caso de erro, redireciona para login por segurança
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("reason", "session_error");
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/admin/:path*", "/espelho", "/villa-bianco", "/moment", "/projetos"],
};
