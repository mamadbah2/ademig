import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { decisionProxy } from "@/lib/admin/routes";

// Simple commodité : renvoie vers la connexion sans cookie de session.
// La vraie vérification se fait dans chaque page et chaque Server Action.
export function proxy(request: NextRequest) {
  const redirection = decisionProxy(request.nextUrl.pathname, Boolean(getSessionCookie(request)));
  return redirection ? NextResponse.redirect(new URL(redirection, request.url)) : NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/espace-membre/:path*"] };
