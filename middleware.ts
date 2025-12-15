import { NextResponse } from "next/server";
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";

const publicPaths = new Set<string>(["/login"]);
const publicPrefixPaths = ["/public/"];
const tenantSelectPaths = new Set<string>(["/select-tenant"]);

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  if (pathname.startsWith("/_next")) return;
  if (pathname === "/favicon.ico") return;

  const isLoggedIn = typeof req.nextauth?.token?.userId === "string";
  if (!isLoggedIn && !(publicPaths.has(pathname) || publicPrefixPaths.some((p) => pathname.startsWith(p)))) {
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
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname;
        if (publicPaths.has(pathname) || publicPrefixPaths.some((p) => pathname.startsWith(p))) return true;
        return typeof token?.userId === "string";
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
