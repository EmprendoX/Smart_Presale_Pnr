import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User as SupabaseUser } from '@supabase/supabase-js';

import { buildSupabaseAppUserPayload, ensureSupabaseAppUser } from '@/lib/auth/supabase-sync';
import { SupabaseService } from '@/lib/services/supabase-service';
import type { User } from '@/lib/types';

const createSupabaseUser = (overrides: Partial<SupabaseUser> = {}): SupabaseUser => {
  const baseUser: Partial<SupabaseUser> = {
    id: 'user_123',
    aud: 'authenticated',
    email: 'user@example.com',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {
      role: 'developer',
      kycStatus: 'basic',
      fullName: 'Example User',
      extra: 'value'
    },
    identities: [],
    created_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    phone_confirmed_at: null,
    phone: null,
    updated_at: new Date().toISOString(),
    is_anonymous: false,
    factors: []
  };

  return { ...baseUser, ...overrides } as SupabaseUser;
};

beforeEach(() => {
  process.env.DEFAULT_TENANT_ID = 'tenant_default';
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Supabase auth OTP flow', () => {
  it('buildSupabaseAppUserPayload maps role, kycStatus and metadata', () => {
    const supabaseUser = createSupabaseUser();

    const payload = buildSupabaseAppUserPayload(supabaseUser);

    expect(payload).toEqual(
      expect.objectContaining({
        id: supabaseUser.id,
        email: supabaseUser.email,
        role: 'developer',
        kycStatus: 'basic',
        metadata: expect.objectContaining({ extra: 'value' })
      })
    );
  });

  it('ensureSupabaseAppUser posts to API with normalized payload', async () => {
    const supabaseUser = createSupabaseUser();
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', fetchSpy);

    await ensureSupabaseAppUser(supabaseUser);

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/users',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const [, requestInit] = fetchSpy.mock.calls[0];
    const body = JSON.parse((requestInit as RequestInit).body as string);
    expect(body).toEqual(
      expect.objectContaining({
        id: supabaseUser.id,
        role: 'developer',
        kycStatus: 'basic',
        tenantId: 'tenant_default'
      })
    );
  });

  it('ensureSupabaseAppUser throws when API responds with error', async () => {
    const supabaseUser = createSupabaseUser();
    const mockResponse = new Response(JSON.stringify({ error: 'boom' }), { status: 500, statusText: 'Server error' });
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', fetchSpy);

    await expect(ensureSupabaseAppUser(supabaseUser)).rejects.toThrow(/Failed to synchronize user/i);
  });
});

describe('SupabaseService.upsertUser', () => {
  const baseUser: User = {
    id: 'user_123',
    name: 'Example User',
    role: 'developer',
    kycStatus: 'basic',
    tenantId: 'tenant_default',
    email: 'user@example.com',
    metadata: { extra: 'value' }
  };

  it('inserts a new record into app_users when missing', async () => {
    const service = new SupabaseService({} as any, { usesServiceKey: true });
    const getUserSpy = vi.spyOn(service, 'getUserById').mockResolvedValue(null);
    const insertSpy = vi
      .spyOn(service as any, 'insertSingle')
      .mockResolvedValue({ ...baseUser });

    const result = await service.upsertUser(baseUser);

    expect(getUserSpy).toHaveBeenCalledWith(baseUser.id);
    expect(insertSpy).toHaveBeenCalledWith('app_users', expect.any(Object), expect.any(Function));
    expect(result).toEqual(baseUser);
  });

  it('updates existing app_users record when found', async () => {
    const service = new SupabaseService({} as any, { usesServiceKey: true });
    const existing = { ...baseUser, name: 'Old name' };
    const updated = { ...baseUser, name: 'Updated name' };

    vi.spyOn(service, 'getUserById').mockResolvedValue(existing);
    const updateSpy = vi
      .spyOn(service as any, 'updateSingle')
      .mockResolvedValue(updated);

    const result = await service.upsertUser(updated);

    expect(updateSpy).toHaveBeenCalledWith('app_users', updated.id, expect.any(Object), expect.any(Function));
    expect(result).toEqual(updated);
  });

  it('requires service role key to perform upsert', async () => {
    const service = new SupabaseService({} as any, { usesServiceKey: false });

    await expect(service.upsertUser(baseUser)).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
