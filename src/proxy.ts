import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - static assets (_next/static, _next/image)
     * - favicon and other public files (images, fonts, the pdfjs worker
     *   script) — these need no session context, and running the
     *   Supabase session-refresh on every font/asset request is both
     *   wasted work and, for an unauthenticated visitor (e.g. on the
     *   public counterparty sign page), was silently redirecting these
     *   requests to /login instead of serving the file.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|otf|woff|woff2|mjs)$).*)",
  ],
};
