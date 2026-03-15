import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get the Supabase auth token from cookies
  // Supabase stores session in cookies prefixed with `sb-` 
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  const hasSession = projectRef 
    ? request.cookies.has(`sb-${projectRef}-auth-token`) ||
      request.cookies.has(`sb-${projectRef}-auth-token.0`) ||
      [...request.cookies.getAll()].some(c => c.name.startsWith(`sb-`) && c.name.includes(`auth-token`))
    : false;

  // Protect admin routes (except login)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!hasSession) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect logged-in users away from login page
  if (pathname.startsWith("/admin/login") && hasSession) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/admin/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

export { middleware as proxy };
