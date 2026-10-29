import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/lib/supabase/types";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Fast-path bypass for Meta Webhook callbacks: Never touch cookies or auth checks
  if (pathname.startsWith("/api/webhooks")) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-verify-stack.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key";

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: any }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Authenticate user via Supabase server-side session check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect Dashboard Routes
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Redirect legacy /admin to /platform-admin
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/admin/, "/platform-admin");
    return NextResponse.redirect(url);
  }

  // Protect Platform Admin Routes
  if (pathname.startsWith("/platform-admin")) {
    // Allow public access to admin login page
    if (pathname === "/platform-admin/login") {
      return supabaseResponse;
    }

    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/platform-admin/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const allowlist = (process.env.ADMIN_EMAIL_ALLOWLIST || "")
      .split(",")
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    const userEmail = (user.email || "").toLowerCase();
    const isAllowlisted = allowlist.includes(userEmail);
    const hasAdminJwtRole = (user.app_metadata as any)?.role === "admin";

    // Allow if in allowlist, OR if Supabase Auth JWT app_metadata has role: 'admin',
    // OR if allowlist is not yet configured, allow authenticated session through so
    // verifyAdminSession() validates the database profile role on every API call.
    const isAllowed = isAllowlisted || hasAdminJwtRole || (allowlist.length === 0);

    if (!isAllowed) {
      // Non-admin user: Redirect to admin login with explicit unauthorized error
      const url = request.nextUrl.clone();
      url.pathname = "/platform-admin/login";
      url.searchParams.set("error", "unauthorized_admin");
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from /login and /signup
  if ((pathname === "/login" || pathname === "/signup") && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
