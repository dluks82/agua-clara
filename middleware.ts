import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { NextRequest } from "next/server";

type AuthRequest = NextRequest & {
  auth?: { user?: { id?: string } } | null;
};

const publicPaths = new Set<string>(["/login"]);
const tenantSelectPaths = new Set<string>(["/select-tenant"]);

export default auth((req: AuthRequest) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  if (pathname.startsWith("/api/auth")) return;
  if (pathname.startsWith("/api/migrations")) return;
  if (pathname.startsWith("/api")) return;
  if (pathname.startsWith("/_next")) return;
  if (pathname === "/favicon.ico") return;

  const isLoggedIn = !!req.auth?.user?.id;
  if (!isLoggedIn && !publicPaths.has(pathname)) {
    const url = new URL("/login", nextUrl);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && !tenantSelectPaths.has(pathname)) {
    const activeTenant = req.cookies.get("ac_tenant")?.value;
    if (!activeTenant) {
      const url = new URL("/select-tenant", nextUrl);
      return NextResponse.redirect(url);
    }
  }

  return;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
