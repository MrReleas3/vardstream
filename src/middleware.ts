import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || "development_super_secret_access_key_min_32_characters_12345"
);

// Paths accessible to anyone
const PUBLIC_PAGE_PATHS = ["/welcome", "/login", "/register", "/forgot-password", "/reset-password"];
const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/health",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore static assets, images, and next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/cron") || // crons have their own CRON_SECRET check
    pathname.includes(".") || // static files like favicon.ico, images
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("accessToken")?.value;
  let userPayload: any = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, ACCESS_SECRET);
      userPayload = payload;
    } catch {
      // Invalid or expired token
      userPayload = null;
    }
  }

  const isPublicPage = PUBLIC_PAGE_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
  const isPublicApi = PUBLIC_API_PATHS.some((path) => pathname === path);
  const isApiRoute = pathname.startsWith("/api/");

  // 1. If user is logged in and visits login / register / welcome -> Redirect to home
  if (userPayload && isPublicPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. If user is NOT logged in and visits protected route
  if (!userPayload) {
    if (isPublicPage || isPublicApi) {
      return NextResponse.next();
    }

    // If API route without auth -> return 401
    if (isApiRoute) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication required." } },
        { status: 401 }
      );
    }

    // If page route without auth -> redirect to /welcome (Landing Page)
    return NextResponse.redirect(new URL("/welcome", request.url));
  }

  // 3. Admin Route Protection
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (userPayload.role !== "admin") {
      if (isApiRoute) {
        return NextResponse.json(
          { ok: false, error: { code: "FORBIDDEN", message: "Administrator access required." } },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
