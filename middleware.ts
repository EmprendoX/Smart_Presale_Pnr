import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { getAuthenticatedUserEdge } from './lib/auth/roles';
import { isSupabaseEnabled } from './lib/auth/supabase';

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const locale = pathname.split('/')[1];
  const hasLocale = ['es', 'en'].includes(locale);
  const pathWithoutLocale = hasLocale ? pathname.slice(locale.length + 1) || '/' : pathname;

  // Aplicar middleware de internacionalización primero
  const intlResponse = intlMiddleware(request);

  if (!isSupabaseEnabled()) {
    return intlResponse;
  }

  // Rutas protegidas - Solo para usuarios autenticados (inversionistas y admin)
  const protectedRoutes = ['/dashboard', '/projects', '/community', '/p'];
  // Rutas de admin - Solo para administradores
  const adminRoutes = ['/admin', '/admin/projects', '/admin/reservations'];

  const isProtectedRoute = protectedRoutes.some(route =>
    pathWithoutLocale.startsWith(route) || pathWithoutLocale.includes('/documents') || pathWithoutLocale.includes('/reserve')
  );
  const isAdminRoute = adminRoutes.some(route => pathWithoutLocale.startsWith(route));

  if (isProtectedRoute || isAdminRoute) {
    const user = await getAuthenticatedUserEdge(request, response);

    if (!user && (isProtectedRoute || isAdminRoute)) {
      console.log('[Middleware] Redirecting unauthenticated user to login:', pathname);
      const basePath = hasLocale ? `/${locale}` : '';
      const loginUrl = new URL(`${basePath}/auth/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (user && isAdminRoute && user.role !== 'admin') {
      console.log('[Middleware] Redirecting unauthorized user from admin route:', pathname);
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return intlResponse;
}

export const config = {
  matcher: ['/', '/(es|en)/:path*']
};