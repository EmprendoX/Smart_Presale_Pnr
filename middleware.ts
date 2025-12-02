import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // Solo manejar internacionalización, sin autenticación ni tenant
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(es|en)/:path*']
};

