import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import {
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/token";
import { applySecurityHeaders } from "@/lib/security/headers";


// Paths that require an authenticated session.
// NOTE: "/admin/login" is EXCLUDED — it's the admin's own entry point.
const PROTECTED_PREFIXES = ["/admin", "/profile"];

// Admin login path — never protected (would cause infinite redirect).
const ADMIN_LOGIN_PATH = "/admin/login";

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(`/${locale}`.length);
  }
  return pathname;
}

function isProtected(pathname: string): boolean {
  const stripped = stripLocale(pathname);
  // Admin login page is never protected
  if (stripped === ADMIN_LOGIN_PATH) return false;
  return PROTECTED_PREFIXES.some((p) =>
    stripped === p || stripped.startsWith(`${p}/`),
  );
}

// Admin-only paths (require admin/super_admin role).
const ADMIN_PREFIXES = ["/admin"];

function isAdminPath(pathname: string): boolean {
  const stripped = stripLocale(pathname);
  // Admin login page is not subject to admin role check
  if (stripped === ADMIN_LOGIN_PATH) return false;
  return ADMIN_PREFIXES.some((p) =>
    stripped === p || stripped.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;


  let response = NextResponse.next({ request: { headers: request.headers } });

  const localeCookie = request.cookies.get("NEXT_LOCALE");

  let preferredLocale = localeCookie?.value || routing.defaultLocale;

  const pathnameIsMissingLocale = routing.locales.every(
    (locale) =>
      !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`,
  );

  if (pathnameIsMissingLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${preferredLocale}${pathname}`;
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  const intlResponse = createMiddleware(routing)(request);

  if (intlResponse) {
    intlResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });
    response = intlResponse;
  }

  const localeInPath = routing.locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (localeInPath && localeInPath !== localeCookie?.value) {
    response?.cookies.set("NEXT_LOCALE", localeInPath, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
  }

  // Server-side route protection: verify the session JWT cookie for protected
  // paths. Invalid/missing sessions redirect to the login page.
  if (isProtected(pathname)) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      const locale = localeInPath || routing.defaultLocale;
      const loginUrl = request.nextUrl.clone();
      // Admin paths redirect to the dedicated admin login page;
      // other protected paths (e.g. /profile) use the user login.
      const isAdmin = isAdminPath(pathname);
      loginUrl.pathname = isAdmin
        ? `/${locale}/admin/login`
        : `/${locale}/login`;
      loginUrl.searchParams.set("redirect", pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }

    // Admin paths require an admin or super_admin role.
    if (isAdminPath(pathname) && session.role !== "admin" && session.role !== "super_admin") {
      const locale = localeInPath || routing.defaultLocale;
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = `/${locale}`;
      return applySecurityHeaders(NextResponse.redirect(homeUrl));
    }
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icons|screenshots|.*\\..*).*)"],
};
