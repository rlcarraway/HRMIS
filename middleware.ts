import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
    const isDashboard = req.nextUrl.pathname === '/';

    // Always allow access to auth pages and dashboard
    if (isAuthPage || isDashboard) {
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
        // Always allow access to dashboard, auth pages, NextJS internals, and auth API
        const isDashboard = req.nextUrl.pathname === '/';
        const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
        const isNextInternal = req.nextUrl.pathname.startsWith('/_next');
        const isAuthApi = req.nextUrl.pathname.startsWith('/api/auth');

        if (isDashboard || isAuthPage || isNextInternal || isAuthApi) {
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
