import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { createSupabaseServerClient, isSupabaseEnabled } from '@/lib/auth/supabase';

type SupabaseTenant = {
  id: string;
  slug: string;
  name: string;
  status: string;
  region: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

type SupabaseTenantSettings = {
  id: string;
  tenant_id: string;
  logo_url: string | null;
  dark_logo_url: string | null;
  square_logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  primary_color_foreground: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  surface_color: string | null;
  foreground_color: string | null;
  font_family: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG ?? 'smart-presale';
const TENANT_BASE_DOMAIN = process.env.TENANT_BASE_DOMAIN ?? '';
const TENANT_HEADER = 'x-tenant-slug';
const TENANT_COOKIE = 'tenant_settings';
const TENANT_SLUG_COOKIE = 'tenant_slug';

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  try {
    // Resolver tenant (solo si Supabase está habilitado)
    if (isSupabaseEnabled()) {
      try {
        const supabase = createSupabaseServerClient(request, response);
        const tenantSlug = await resolveTenantSlug(request);
        const tenantData = await resolveTenantContext(supabase, tenantSlug);

        if (tenantData) {
          persistTenantContext(response, tenantData);
        }
      } catch (error) {
        console.error('[middleware] Error resolving tenant (non-fatal):', error);
        // No bloquear la request si falla el tenant
      }
    }
  } catch (error) {
    console.error('[middleware] Error handling auth redirect:', error);
    // En caso de error, permitir que la request continúe
  }

  return response;
}

async function resolveTenantSlug(request: NextRequest): Promise<string> {
  const headerSlug = request.headers.get(TENANT_HEADER) ?? request.headers.get('x-tenant');
  if (headerSlug) {
    return headerSlug.toLowerCase();
  }

  const hostHeader = request.headers.get('host') ?? '';
  const hostname = hostHeader.split(':')[0]?.toLowerCase() ?? '';

  if (hostname && TENANT_BASE_DOMAIN && hostname.endsWith(TENANT_BASE_DOMAIN.toLowerCase())) {
    const maybeSubdomain = hostname.slice(0, -TENANT_BASE_DOMAIN.length).replace(/\.$/, '');
    if (maybeSubdomain && maybeSubdomain !== 'www') {
      return maybeSubdomain;
    }
  }

  if (hostname && !TENANT_BASE_DOMAIN) {
    const [subdomain] = hostname.split('.');
    if (subdomain && subdomain !== 'www') {
      return subdomain;
    }
  }

  return DEFAULT_TENANT_SLUG;
}

async function resolveTenantContext(
  supabase: ReturnType<typeof createSupabaseServerClient> | null,
  slug: string
): Promise<{ tenant: SupabaseTenant; settings: SupabaseTenantSettings | null } | null> {
  if (!supabase) {
    return null;
  }
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, slug, name, status, region, metadata, created_at, updated_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[middleware] Error fetching tenant', error);
  }

  let resolvedTenant = tenant as SupabaseTenant | null;

  if (!resolvedTenant && slug !== DEFAULT_TENANT_SLUG) {
    const { data: fallbackTenant, error: fallbackError } = await supabase
      .from('tenants')
      .select('id, slug, name, status, region, metadata, created_at, updated_at')
      .eq('slug', DEFAULT_TENANT_SLUG)
      .maybeSingle();

    if (fallbackError) {
      console.error('[middleware] Error fetching default tenant', fallbackError);
    }

    resolvedTenant = fallbackTenant as SupabaseTenant | null;
  }

  if (!resolvedTenant) {
    return null;
  }

  const { data: settings, error: settingsError } = await supabase
    .from('tenant_settings')
    .select(
      [
        'id',
        'tenant_id',
        'logo_url',
        'dark_logo_url',
        'square_logo_url',
        'favicon_url',
        'primary_color',
        'primary_color_foreground',
        'secondary_color',
        'accent_color',
        'background_color',
        'surface_color',
        'foreground_color',
        'font_family',
        'metadata',
        'created_at',
        'updated_at'
      ].join(',')
    )
    .eq('tenant_id', resolvedTenant.id)
    .maybeSingle();

  if (settingsError) {
    console.error('[middleware] Error fetching tenant settings', settingsError);
  }

  return {
    tenant: resolvedTenant,
    settings: (settings as SupabaseTenantSettings | null) ?? null
  };
}

function persistTenantContext(
  response: NextResponse,
  context: { tenant: SupabaseTenant; settings: SupabaseTenantSettings | null }
) {
  const payload = {
    tenant: context.tenant,
    settings: context.settings
  };

  const serialized = encodeURIComponent(JSON.stringify(payload));

  response.cookies.set({
    name: TENANT_COOKIE,
    value: serialized,
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60,
    path: '/'
  });

  response.cookies.set({
    name: TENANT_SLUG_COOKIE,
    value: context.tenant.slug,
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60,
    path: '/'
  });

  response.headers.set(TENANT_HEADER, context.tenant.slug);
}

export const config = {
  matcher: [
    '/',
    '/(es|en)/:path*',
    // Excluir rutas de API, auth, archivos estáticos y Next.js internals
    '/((?!api|_next|_vercel|auth|.*\\..*).*)'
  ]
};

