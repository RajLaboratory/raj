import { NextResponse, type NextRequest } from "next/server";

// Cheap edge gate: real session validation happens server-side in getCurrentUser().
const PUBLIC = ["/login", "/portal", "/api/v1/auth/login", "/api/v1/portal", "/api/v1/webhooks"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  if (!req.cookies.get("raj_session")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Please sign in" } }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
