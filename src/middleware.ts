import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Helper to decode base64url payload of a JWT
function decodeJWTPayload(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Retrieve JWT cookie
  const tokenCookie = request.cookies.get("token");
  const token = tokenCookie ? tokenCookie.value : null;

  // Path is /login or landing
  const isLoginPage = pathname === "/login" || pathname === "/";
  const isDashboardPage = pathname.startsWith("/dashboard");

  if (isDashboardPage) {
    if (!token) {
      // Redirect unauthenticated user to login
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const payload = decodeJWTPayload(token);
    if (!payload || !payload.role) {
      // Clear invalid token cookie and redirect
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("token");
      return response;
    }

    const role = payload.role;

    // Direct dashboard path root: redirect to specific dashboard
    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      if (role === "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard/admin", request.url));
      } else if (role === "FLEET_MANAGER") {
        return NextResponse.redirect(new URL("/dashboard/fleet-manager", request.url));
      } else if (role === "SAFETY_OFFICER") {
        return NextResponse.redirect(new URL("/dashboard/safety", request.url));
      } else if (role === "DRIVER") {
        return NextResponse.redirect(new URL("/dashboard/driver", request.url));
      }
    }

    // Role-based directory guarding
    if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (pathname.startsWith("/dashboard/fleet-manager") && role !== "FLEET_MANAGER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (pathname.startsWith("/dashboard/safety") && role !== "SAFETY_OFFICER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (pathname.startsWith("/dashboard/driver") && role !== "DRIVER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // If user is logged in, restrict access to login/landing page (redirect to dashboard)
  if (isLoginPage && token) {
    const payload = decodeJWTPayload(token);
    if (payload && payload.role) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

// Intercept dashboard access and login endpoints
export const config = {
  matcher: ["/dashboard/:path*", "/login", "/"],
};
