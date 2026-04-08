import { type NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/server";

// E-mails autorizados como admin (separados por vírgula)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Proteger rota /admin (exceto /admin/login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const supabase = await createMiddlewareClient(request);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("reason", "unauthenticated");
      return NextResponse.redirect(url);
    }

    // Verificar se o e-mail do usuário está na lista de admins
    if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("reason", "unauthorized");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path((?!login).*)"],
};
