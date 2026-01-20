import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/studio") ||
    request.nextUrl.pathname.startsWith("/tool") ||
    request.nextUrl.pathname.startsWith("/marketplace") ||
    request.nextUrl.pathname.startsWith("/api/tools") ||
    request.nextUrl.pathname.startsWith("/api/marketplace") ||
    request.nextUrl.pathname.startsWith("/api/chat");

  // Redirect to login if accessing protected route without token
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/studio/:path*",
    "/tool/:path*",
    "/marketplace/:path*",
    "/api/tools/:path*",
    "/api/marketplace/:path*",
    "/api/chat/:path*",
  ],
};
