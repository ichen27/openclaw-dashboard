import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verify } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for these paths
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|ico|css|js|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // Allow unauthenticated access to API routes from localhost
  if (pathname.startsWith("/api/")) {
    const forwarded = request.headers.get("x-forwarded-for");
    const origin = request.headers.get("origin") || request.headers.get("referer") || "";
    const localhostIps = ["127.0.0.1", "::1", "localhost"];

    const isForwardedFromLocalhost =
      forwarded && localhostIps.some((ip) => forwarded.split(",")[0].trim() === ip);
    const isOriginLocalhost = localhostIps.some(
      (ip) => origin.includes(`//${ip}`) || origin.includes(`//localhost`)
    );

    if (isForwardedFromLocalhost || isOriginLocalhost) {
      return NextResponse.next();
    }

    // Fall through to cookie auth for non-localhost API requests
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value;

  if (!cookie) {
    // API routes return 401 instead of redirecting to login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verify(cookie);
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
