import { type NextRequest, NextResponse } from "next/server";

// SEC-003/004 FIX: Lista de valores permitidos para o cookie subscription_status.
// Este cookie é apenas um HINT de cache — nunca é fonte de verdade.
// Todas as APIs verificam sessão via supabase.auth.getUser() server-side.
// Valores fora desta lista são tratados como ausência de cookie (fallback seguro).
const ALLOWED_SUB_STATUS_VALUES = new Set(['active', 'cancelled', 'lifetime', 'none', 'pending']);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirecionar rota antiga de login para a nova página inicial
  if (pathname === "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Rotas públicas (nunca interceptar)
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/change-password" ||
    pathname === "/mfa-onboarding" ||
    pathname === "/mfa-verify" ||
    pathname === "/mfa-setup" ||
    pathname === "/planos" ||
    pathname === "/aguardando-pagamento";

  const isApiRoute = pathname.startsWith("/api/");

  if (isPublicRoute || isApiRoute) {
    return NextResponse.next({ request });
  }

  // Rotas que exigem autenticacao
  const isProtectedRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/admin-sistema") ||
    pathname.startsWith("/empreendimento") ||
    pathname === "/espelho" ||
    pathname === "/villa-bianco" ||
    pathname === "/moment" ||
    pathname === "/projetos" ||
    pathname === "/vitta" ||
    pathname === "/assinatura";

  if (!isProtectedRoute) {
    return NextResponse.next({ request });
  }

  try {
    const allCookies = request.cookies.getAll();

    // 1. Verificar autenticacao Supabase
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

    // 3. Verificar MFA
    const mfaPending = allCookies.some((c) => c.name === "mfa_pending");
    const mfaVerified = allCookies.some((c) => c.name === "mfa_verified");

    if (mfaPending && !mfaVerified) {
      const url = request.nextUrl.clone();
      url.pathname = "/mfa-verify";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // 4. Verificar assinatura ativa via cookie (HINT — não é fonte de verdade)
    //    SEC-003/004 FIX: O cookie subscription_status é apenas um cache hint.
    //    Valores são validados contra allowlist. Qualquer valor forjado ou
    //    desconhecido é tratado como ausência de cookie (fallback: permitir),
    //    pois a verificação real acontece server-side nas APIs via getUser().
    //
    //    Comportamento:
    //    - Cookie ausente ou valor inválido/forjado → permitir (fallback seguro)
    //    - Cookie = 'active'/'cancelled'/'none' → permitir
    //    - Cookie = 'pending' → redirecionar para aguardando-pagamento
    const isAdminRoute = pathname.startsWith("/admin-sistema");
    const isAssinaturaRoute = pathname === "/assinatura";

    if (!isAdminRoute && !isAssinaturaRoute) {
      const subCookie = allCookies.find(
        (c) => c.name === "subscription_status"
      );

      // SEC-003/004 FIX: Só redirecionar se o valor for 'pending' E estiver na allowlist.
      // Valores forjados (ex: 'active' injetado) que não estão na allowlist
      // são ignorados — o fallback é permitir acesso (as APIs verificam de verdade).
      if (subCookie && ALLOWED_SUB_STATUS_VALUES.has(subCookie.value) && subCookie.value === 'pending') {
        const url = request.nextUrl.clone();
        url.pathname = "/aguardando-pagamento";
        return NextResponse.redirect(url);
      }
    }
  } catch {
    // SEC-AUDIT: Fail-closed on middleware errors — redirect to login
    // instead of silently allowing the request through.
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("reason", "error");
    return NextResponse.redirect(url);
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
    "/planos",
    "/assinatura",
    "/aguardando-pagamento",
  ],
};
