import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/signup', '/story', '/invite'];
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith('/api/documents/') || pathname.startsWith('/auth/'));

  // Check for authorization header (which would contain the JWT from the client)
  const authHeader = req.headers.get('authorization');
  const hasAuth = !!authHeader;

  console.log('[Middleware]', {
    pathname,
    hasAuth,
    isPublicRoute,
  });

  // For protected routes, we'll let the client-side handle authentication
  // This is because Next.js middleware can't access localStorage
  // The client-side auth check in dashboard-layout will handle redirects
  if (!isPublicRoute && !hasAuth) {
    // Don't redirect here - let the page load and client-side auth will handle it
    // This prevents the middleware redirect loop
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
