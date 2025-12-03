import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    const error = new Error('NEXT_REDIRECT');
    (error as any).digest = 'NEXT_REDIRECT';
    (error as any).location = url;
    throw error;
  }
}));

vi.mock('next/headers', () => ({
  headers: () => new Headers(),
  cookies: () => ({
    get: () => undefined
  })
}));

describe('Admin server component access control', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('redirects investors to dashboard', async () => {
    vi.doMock('@/lib/auth/roles', async () => {
      const actual = await vi.importActual<typeof import('@/lib/auth/roles')>('@/lib/auth/roles');
      return {
        ...actual,
        getServerComponentUser: vi.fn().mockResolvedValue({
          id: 'investor-1',
          email: 'investor@example.com',
          role: 'investor',
          kycStatus: 'complete',
          fullName: 'Investor'
        })
      };
    });

    const adminPage = (await import('@/app/[locale]/admin/page')).default;
    await expect(
      adminPage({ params: { locale: 'es' } })
    ).rejects.toMatchObject({ digest: 'NEXT_REDIRECT', location: '/es/dashboard' });
  });

  it('allows admins to render dashboard', async () => {
    vi.doMock('@/lib/auth/roles', async () => {
      const actual = await vi.importActual<typeof import('@/lib/auth/roles')>('@/lib/auth/roles');
      return {
        ...actual,
        getServerComponentUser: vi.fn().mockResolvedValue({
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          kycStatus: 'complete',
          fullName: 'Admin'
        })
      };
    });

    const adminPage = (await import('@/app/[locale]/admin/page')).default;
    const result = await adminPage({ params: { locale: 'en' } });
    expect(result).toBeTruthy();
  });
});

