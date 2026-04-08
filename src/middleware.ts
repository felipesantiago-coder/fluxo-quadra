import { type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/server";

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
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path((?!login).*)"],
};
