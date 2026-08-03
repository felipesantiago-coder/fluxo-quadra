import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirecionar rota antiga de login para a nova página inicial
  if (pathname === "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Rotas protegidas
  const isProtectedRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/admin-sistema") ||
    pathname.startsWith("/empreendimento") ||
    pathname === "/espelho" ||
    pathname === "/villa-bianco" ||
    pathname === "/moment" ||
    pathname === "/projetos" ||
    pathname === "/vitta";

  // Rotas que NÃO devem ser interceptadas (são públicas ou auto-gerenciadas)
  const isMfaRoute = pathname === "/mfa-verify" || pathname === "/mfa-setup";
  const isApiRoute = pathname.startsWith("/api/");

  if (!isProtectedRoute || isMfaRoute || isApiRoute) {
    return NextResponse.next({ request });
  }

  try {
    const allCookies = request.cookies.getAll();

    // 1. Verificar autenticação Supabase
    const hasSessionCookie = allCookies.some(
      (c) => c.name.includes("sb-") && c.name.includes("-auth-token")
    );

    if (!hasSessionCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("reason", "unauthenticated");
      return NextResponse.redirect(url);
    }

    // 2. Verificar MFA: se cookie mfa_pending existe, o usuário precisa verificar
    const mfaPending = allCookies.some((c) => c.name === "mfa_pending");
    const mfaVerified = allCookies.some((c) => c.name === "mfa_verified");

    if (mfaPending && !mfaVerified) {
      // Redirecionar para verificação MFA, preservando a URL original
      const url = request.nextUrl.clone();
      url.pathname = "/mfa-verify";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  } catch {
    return NextResponse.next({ request });
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/admin-sistema/:path*",
    "/empreendimento/:path*",
    "/espelho",
    "/villa-bianco",
    "/moment",
    "/projetos",
    "/vitta",
    "/mfa-setup",
  ],
};
