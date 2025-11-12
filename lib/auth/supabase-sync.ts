import type { User } from '@supabase/supabase-js';
import type { Role, KycStatus } from '@/lib/types';

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? 'tenant_default';

export type AppUserPayload = {
  id: string;
  name: string;
  role: Role;
  kycStatus: KycStatus;
  tenantId: string;
  email?: string;
  metadata?: Record<string, any> | null;
};

const deriveNameFromUser = (user: User): string => {
  return (
    (user.user_metadata?.fullName as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    (user.email ? user.email.split('@')[0] : undefined) ??
    'Usuario'
  );
};

const extractRole = (user: User): Role => {
  const role = user.user_metadata?.role as Role | undefined;
  return role ?? 'buyer';
};

const extractKycStatus = (user: User): KycStatus => {
  const kycStatus = user.user_metadata?.kycStatus as KycStatus | undefined;
  return kycStatus ?? 'none';
};

export const buildSupabaseAppUserPayload = (user: User): AppUserPayload => {
  return {
    id: user.id,
    name: deriveNameFromUser(user),
    role: extractRole(user),
    kycStatus: extractKycStatus(user),
    tenantId: DEFAULT_TENANT_ID,
    email: user.email ?? undefined,
    metadata: (user.user_metadata as Record<string, any>) ?? null
  };
};

export const ensureSupabaseAppUser = async (user: User): Promise<void> => {
  const payload = buildSupabaseAppUserPayload(user);

  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errorMessage = response.statusText || 'Unknown error';
    try {
      const body = await response.json();
      if (body?.error) {
        errorMessage = body.error;
      }
    } catch (error) {
      // Ignorar error al parsear JSON y usar statusText
    }

    throw new Error(`[Supabase] Failed to synchronize user: ${errorMessage}`);
  }
};
