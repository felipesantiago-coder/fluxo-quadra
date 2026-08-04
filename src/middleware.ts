import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirecionar rota antiga de login para a nova página inicial
  if (pathname === "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Rotas públicas ou auto-gerenciadas (nunca interceptar)
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/change-password" ||
    pathname === "/mfa-onboarding" ||
    pathname === "/mfa-verify" ||
    pathname === "/mfa-setup";

  const isApiRoute = pathname.startsWith("/api/");

  if (isPublicRoute || isApiRoute) {
    return NextResponse.next({ request });
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

  if (!isProtectedRoute) {
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

    // 2. Fluxo de primeiro acesso — verificar cookie first_login_step
    const firstLoginStep = allCookies.find((c) => c.name === "first_login_step");

    if (firstLoginStep) {
      const step = firstLoginStep.value;

      if (step === "change_password" && pathname !== "/change-password") {
        const url = request.nextUrl.clone();
        url.pathname = "/change-password";
        return NextResponse.redirect(url);
      }

      if (step === "setup_mfa" && pathname !== "/mfa-onboarding") {
        const url = request.nextUrl.clone();
        url.pathname = "/mfa-onboarding";
        return NextResponse.redirect(url);
      }
    }

    // 3. Verificar MFA: se cookie mfa_pending existe, o usuário precisa verificar
    const mfaPending = allCookies.some((c) => c.name === "mfa_pending");
    const mfaVerified = allCookies.some((c) => c.name === "mfa_verified");

    if (mfaPending && !mfaVerified) {
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
    "/change-password",
    "/mfa-onboarding",
  ],
};
