import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
    const isDashboard = req.nextUrl.pathname === '/';
    const isPublicRoute = isDashboard ||
                          req.nextUrl.pathname.startsWith('/_next') ||
                          req.nextUrl.pathname.startsWith('/api/auth') ||
                          isAuthPage;

    // Allow access to auth pages and dashboard (always public)
    if (isPublicRoute) {
      return NextResponse.next();
    }

    // Require authentication for all other pages
    if (!isAuth) {
      let from = req.nextUrl.pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }

      return NextResponse.redirect(
        new URL(`/auth/signin?callbackUrl=${encodeURIComponent(from)}`, req.url)
      );
    }

    // Check admin-only routes
    const isAdminRoute =
      req.nextUrl.pathname.startsWith('/settings') ||
      req.nextUrl.pathname.startsWith('/employees/new') ||
      req.nextUrl.pathname.includes('/edit');

    if (isAdminRoute && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token: _token, req }) => {
        // Allow access to dashboard and public routes without authentication
        const isDashboard = req.nextUrl.pathname === '/';
        const isPublicRoute = isDashboard ||
                              req.nextUrl.pathname.startsWith('/_next') ||
                              req.nextUrl.pathname.startsWith('/api/auth') ||
                              req.nextUrl.pathname.startsWith('/auth');

        if (isPublicRoute) {
          return true;
        }

        // For all other routes, allow the middleware function to handle authorization
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
