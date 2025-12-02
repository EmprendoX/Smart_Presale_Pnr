import { describe, expect, it, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('next-intl/middleware', () => ({
  default: () => () => NextResponse.next()
}));

const SUPABASE_ENV = {
  USE_SUPABASE: 'true',
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key'
};

const buildRequest = (path: string) => new NextRequest(`http://example.com${path}`);

async function importMiddleware() {
  return (await import('../../middleware')).default;
}

describe('middleware authentication and authorization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    Object.assign(process.env, SUPABASE_ENV);
  });

  it('redirects unauthenticated users on protected routes to login with redirect param', async () => {
    const middleware = await importMiddleware();
    const roles = await import('@/lib/auth/roles');
    const supabase = await import('@/lib/auth/supabase');

    vi.spyOn(supabase, 'isSupabaseEnabled').mockReturnValue(true);
    vi.spyOn(roles, 'getAuthenticatedUser').mockResolvedValue(null);

    const response = await middleware(buildRequest('/dashboard'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://example.com/auth/login?redirect=%2Fdashboard');
  });

  it('allows admin users to access admin routes', async () => {
    const middleware = await importMiddleware();
    const roles = await import('@/lib/auth/roles');
    const supabase = await import('@/lib/auth/supabase');

    vi.spyOn(supabase, 'isSupabaseEnabled').mockReturnValue(true);
    vi.spyOn(roles, 'getAuthenticatedUser').mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      kycStatus: 'complete',
      fullName: 'Admin User',
      avatarUrl: null,
      metadata: {}
    });

    const response = await middleware(buildRequest('/admin/projects'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects investors away from admin routes', async () => {
    const middleware = await importMiddleware();
    const roles = await import('@/lib/auth/roles');
    const supabase = await import('@/lib/auth/supabase');

    vi.spyOn(supabase, 'isSupabaseEnabled').mockReturnValue(true);
    vi.spyOn(roles, 'getAuthenticatedUser').mockResolvedValue({
      id: 'investor-1',
      email: 'investor@example.com',
      role: 'investor',
      kycStatus: 'complete',
      fullName: 'Investor User',
      avatarUrl: null,
      metadata: {}
    });

    const response = await middleware(buildRequest('/admin'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://example.com/');
  });

  it('allows investors with a session to explore and reserve projects', async () => {
    const middleware = await importMiddleware();
    const roles = await import('@/lib/auth/roles');
    const supabase = await import('@/lib/auth/supabase');

    vi.spyOn(supabase, 'isSupabaseEnabled').mockReturnValue(true);
    vi.spyOn(roles, 'getAuthenticatedUser').mockResolvedValue({
      id: 'investor-2',
      email: 'investor2@example.com',
      role: 'investor',
      kycStatus: 'complete',
      fullName: 'Investor Two',
      avatarUrl: null,
      metadata: {}
    });

    const exploreResponse = await middleware(buildRequest('/projects'));
    const reserveResponse = await middleware(buildRequest('/projects/alpha/reserve'));

    expect(exploreResponse.status).toBe(200);
    expect(reserveResponse.status).toBe(200);
    expect(exploreResponse.headers.get('location')).toBeNull();
    expect(reserveResponse.headers.get('location')).toBeNull();
  });
});

describe('getAuthenticatedUser logging', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    Object.assign(process.env, SUPABASE_ENV);
  });

  it('logs when a Supabase session is detected via helper', async () => {
    const supabaseClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                id: 'user-123',
                email: 'user@example.com',
                user_metadata: { role: 'admin', fullName: 'Test Admin', kycStatus: 'complete' }
              }
            }
          },
          error: null
        })
      }
    } as any;

    vi.doMock('@/lib/auth/supabase', () => ({
      isSupabaseEnabled: vi.fn(() => true),
      createSupabaseServerClient: vi.fn(() => supabaseClient),
      createSupabaseServerClientForReading: vi.fn(() => supabaseClient),
      getSessionFromCookies: vi.fn(),
      mapSupabaseUser: vi.fn()
    }));

    vi.doMock('@/lib/config', () => ({
      db: {
        getUserById: vi.fn().mockResolvedValue({
          id: 'user-123',
          name: 'Test Admin',
          role: 'admin',
          kycStatus: 'complete',
          tenantId: 'tenant_default',
          email: 'user@example.com',
          metadata: { role: 'admin' }
        })
      }
    }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { getAuthenticatedUser } = await import('@/lib/auth/roles');

    const user = await getAuthenticatedUser(new NextRequest('http://example.com/dashboard'));

    expect(user).toEqual(
      expect.objectContaining({ id: 'user-123', role: 'admin', email: 'user@example.com' })
    );
    expect(logSpy).toHaveBeenCalledWith('[getAuthenticatedUser] ✅ Session found using Supabase helper');
  });
});
