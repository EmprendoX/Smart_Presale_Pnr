import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { getAuthenticatedUser } from './lib/auth/roles';
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

  // Si Supabase está habilitado, aplicar lógica de autenticación robusta
  if (isSupabaseEnabled()) {
    // Rutas protegidas - Solo para usuarios autenticados (inversionistas y admin)
    const protectedRoutes = ['/dashboard', '/projects', '/community', '/p'];
    // Rutas de admin - Solo para administradores
    const adminRoutes = ['/admin', '/admin/projects', '/admin/reservations'];

    const isProtectedRoute = protectedRoutes.some(route =>
      pathWithoutLocale.startsWith(route) || pathWithoutLocale.includes('/documents') || pathWithoutLocale.includes('/reserve')
    );
    const isAdminRoute = adminRoutes.some(route => pathWithoutLocale.startsWith(route));

    if (isProtectedRoute || isAdminRoute) {
      // Usar getAuthenticatedUser de lib/auth/roles.ts para obtener el usuario con su rol de app_users
      const user = await getAuthenticatedUser(request, response);

      // Verificar autenticación para rutas protegidas
      if (!user && (isProtectedRoute || isAdminRoute)) {
        console.log('[Middleware] Redirecting unauthenticated user to login:', pathname);
        const basePath = hasLocale ? `/${locale}` : '';
        const loginUrl = new URL(`${basePath}/auth/login`, request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Verificar permisos de admin para rutas administrativas
      if (user && isAdminRoute) {
        if (user.role !== 'admin') {
          console.log('[Middleware] Redirecting unauthorized user from admin route:', pathname);
          return NextResponse.redirect(new URL('/', request.url)); // Redirigir si no es admin
        }
      }
    }
  }

  return intlResponse;
}

export const config = {
  matcher: ['/', '/(es|en)/:path*']
};