import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session (important for SSR)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Block access to debug endpoints in production
  if (
    process.env.NODE_ENV === "production" &&
    (pathname.startsWith("/api/debug-all") || pathname.startsWith("/api/debug-news"))
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Redirect logged-in users away from login page
  if (pathname === "/admin/login") {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
    // Prevent CDN/edge caching of admin login page
    supabaseResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    supabaseResponse.headers.set("CDN-Cache-Control", "no-store");
    supabaseResponse.headers.set("Vercel-CDN-Cache-Control", "no-store");
    return supabaseResponse;
  }

  // Protect all /admin routes — require authentication
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    // Prevent CDN/edge caching of all admin routes
    supabaseResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    supabaseResponse.headers.set("CDN-Cache-Control", "no-store");
    supabaseResponse.headers.set("Vercel-CDN-Cache-Control", "no-store");
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/api/debug-all", "/api/debug-news"],
};

export { middleware as proxy };
