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

  // Rotas protegidas: /admin e /espelho
  const isProtectedRoute = pathname.startsWith("/admin") || pathname === "/espelho";

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
  } catch {
    // Em caso de erro, apenas deixa passar — a validação real acontece no client/server component
    return NextResponse.next({ request });
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/admin/:path*", "/espelho"],
};
