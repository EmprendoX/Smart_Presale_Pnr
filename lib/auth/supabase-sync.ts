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

const MAX_SYNC_RETRIES = 3;
const SYNC_RETRY_DELAY = 500;

export const ensureSupabaseAppUser = async (user: User, retryCount: number = 0): Promise<void> => {
  if (process.env.USE_SUPABASE?.toLowerCase() !== 'true') {
    console.warn('[supabase-sync] Skipping sync because USE_SUPABASE is not enabled');
    return;
  }

  const payload = buildSupabaseAppUserPayload(user);

  try {
    console.log(`[supabase-sync] Syncing user ${user.id} (attempt ${retryCount + 1}/${MAX_SYNC_RETRIES})...`);

    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Asegurar que se envíen las cookies
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMessage = response.statusText || 'Unknown error';
      let statusCode = response.status;
      
      try {
        const body = await response.json();
        if (body?.error) {
          errorMessage = body.error;
        }
      } catch (error) {
        // Ignorar error al parsear JSON y usar statusText
      }

      // Si es un error 409 (conflict), el usuario ya existe, no es un error crítico
      if (statusCode === 409) {
        console.log('[supabase-sync] User already exists in database, skipping sync');
        return;
      }

      // Si es un error 401 o 403, no tiene sentido reintentar
      if (statusCode === 401 || statusCode === 403) {
        console.error(`[supabase-sync] Authentication error (${statusCode}), not retrying`);
        throw new Error(`[Supabase] Authentication failed: ${errorMessage}`);
      }

      // Reintentar si no hemos alcanzado el máximo
      if (retryCount < MAX_SYNC_RETRIES - 1) {
        console.warn(`[supabase-sync] Sync failed (${statusCode}), retrying in ${SYNC_RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, SYNC_RETRY_DELAY));
        return ensureSupabaseAppUser(user, retryCount + 1);
      }

      throw new Error(`[Supabase] Failed to synchronize user after ${MAX_SYNC_RETRIES} attempts: ${errorMessage}`);
    }

    console.log(`[supabase-sync] User ${user.id} synchronized successfully`);
  } catch (error: any) {
    // Si es un error de red, reintentar
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      if (retryCount < MAX_SYNC_RETRIES - 1) {
        console.warn(`[supabase-sync] Network error, retrying in ${SYNC_RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, SYNC_RETRY_DELAY));
        return ensureSupabaseAppUser(user, retryCount + 1);
      }
    }
    
    // Re-lanzar el error si ya hemos intentado todas las veces
    throw error;
  }
};
