import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MockedAuthResponse = { data?: Record<string, unknown> | null; error?: any };

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    auth: {
      signInWithOtp: (params: { email: string; options?: { emailRedirectTo?: string; shouldCreateUser?: boolean } }) => Promise<MockedAuthResponse>;
      signInWithOAuth: (params: { provider: string; options?: { redirectTo?: string; scopes?: string } }) => Promise<MockedAuthResponse & { data?: Record<string, unknown> | null }>;
      signOut: () => Promise<MockedAuthResponse>;
    };
  }
}

type SupabaseMocks = {
  signInWithOtp: ReturnType<typeof vi.fn>;
  signInWithOAuth: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  createClient: ReturnType<typeof vi.fn>;
};

const SUPABASE_URL = 'https://example.supabase.co';
const SUPABASE_ANON_KEY = 'anon-test-key';

let originalUrl: string | undefined;
let originalAnonKey: string | undefined;

const setupSupabaseMocks = (overrides: Partial<SupabaseMocks> = {}): SupabaseMocks => {
  const signInWithOtp =
    overrides.signInWithOtp ??
    vi.fn().mockResolvedValue({ data: null, error: null });
  const signInWithOAuth =
    overrides.signInWithOAuth ??
    vi.fn().mockResolvedValue({ data: { provider: 'github', url: 'https://redirect.example' }, error: null });
  const signOut = overrides.signOut ?? vi.fn().mockResolvedValue({ error: null });

  const client = {
    auth: {
      signInWithOtp,
      signInWithOAuth,
      signOut
    }
  };

  const createClient = overrides.createClient ?? vi.fn(() => client);

  vi.doMock('@supabase/supabase-js', () => ({
    createClient
  }));

  vi.doMock('@supabase/auth-helpers-nextjs', () => ({
    createMiddlewareSupabaseClient: vi.fn()
  }));

  return { signInWithOtp, signInWithOAuth, signOut, createClient };
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();

  originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
});

afterEach(() => {
  if (originalUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  }

  if (originalAnonKey === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
  }

  vi.resetModules();
  vi.restoreAllMocks();
  vi.doUnmock('@supabase/supabase-js');
  vi.doUnmock('@supabase/auth-helpers-nextjs');
});

describe('Supabase browser auth helpers', () => {
  it('sends OTP sign-in request allowing account creation by default (sign-up path)', async () => {
    const mocks = setupSupabaseMocks();
    const { signInWithOtp } = await import('@/lib/auth/supabase');

    await signInWithOtp('new-user@example.com');

    expect(mocks.createClient).toHaveBeenCalledWith(SUPABASE_URL, SUPABASE_ANON_KEY, expect.any(Object));
    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: 'new-user@example.com',
      options: {
        emailRedirectTo: undefined,
        shouldCreateUser: true
      }
    });
  });

  it('allows disabling automatic user creation for existing accounts (sign-in path)', async () => {
    const mocks = setupSupabaseMocks();
    const { signInWithOtp } = await import('@/lib/auth/supabase');

    await signInWithOtp('existing@example.com', { redirectTo: 'https://app.example.com/dashboard', shouldCreateUser: false });

    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: 'existing@example.com',
      options: {
        emailRedirectTo: 'https://app.example.com/dashboard',
        shouldCreateUser: false
      }
    });
  });

  it('rethrows Supabase errors when OTP request fails', async () => {
    const authError = new Error('Rate limit exceeded');
    const mocks = setupSupabaseMocks({
      signInWithOtp: vi.fn().mockResolvedValue({ error: authError })
    });
    const { signInWithOtp } = await import('@/lib/auth/supabase');

    await expect(signInWithOtp('fail@example.com')).rejects.toBe(authError);
    expect(mocks.signInWithOtp).toHaveBeenCalledTimes(1);
  });

  it('returns provider data on OAuth sign-in and propagates errors', async () => {
    const oauthError = new Error('oauth boom');
    const mocks = setupSupabaseMocks({
      signInWithOAuth: vi
        .fn()
        .mockResolvedValueOnce({ data: { provider: 'github', url: 'https://redirect.example' }, error: null })
        .mockResolvedValueOnce({ error: oauthError })
    });
    const { signInWithOAuth } = await import('@/lib/auth/supabase');

    const data = await signInWithOAuth('github', { redirectTo: 'https://app.example.com/callback', scopes: 'openid email' });
    expect(data).toEqual({ provider: 'github', url: 'https://redirect.example' });
    expect(mocks.signInWithOAuth).toHaveBeenNthCalledWith(1, {
      provider: 'github',
      options: {
        redirectTo: 'https://app.example.com/callback',
        scopes: 'openid email'
      }
    });

    await expect(signInWithOAuth('github')).rejects.toBe(oauthError);
  });

  it('signs out current session and surfaces Supabase failures', async () => {
    const signOutError = new Error('signout failed');
    const mocks = setupSupabaseMocks({
      signOut: vi
        .fn()
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: signOutError })
    });
    const { signOut } = await import('@/lib/auth/supabase');

    await expect(signOut()).resolves.toBeUndefined();
    await expect(signOut()).rejects.toBe(signOutError);
    expect(mocks.signOut).toHaveBeenCalledTimes(2);
  });
});
