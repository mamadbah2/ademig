import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { estRouteAdminPublique } from "@/lib/admin/routes";

// Simple commodité : renvoie vers la connexion sans cookie de session.
// La vraie vérification se fait dans chaque page et chaque Server Action.
export function proxy(request: NextRequest) {
  if (estRouteAdminPublique(request.nextUrl.pathname)) return NextResponse.next();
  if (!getSessionCookie(request)) return NextResponse.redirect(new URL("/admin/connexion", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
