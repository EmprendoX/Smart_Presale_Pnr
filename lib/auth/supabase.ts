import { createClient, type Provider, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextRequest, NextResponse } from 'next/server';
import type { Role, KycStatus } from '@/lib/types';

let browserClient: SupabaseClient | null = null;

function getSupabaseCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase credentials are not configured.');
  }

  return { url, anonKey };
}

export const getSupabaseBrowserClient = (): SupabaseClient => {
  if (!browserClient) {
    const { url, anonKey } = getSupabaseCredentials();
    browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  }

  return browserClient;
};

export const createSupabaseServerClient = (
  request: NextRequest,
  response: NextResponse
): SupabaseClient => {
  return createMiddlewareSupabaseClient({ req: request, res: response }) as unknown as SupabaseClient;
};

export type AppUser = {
  id: string;
  email: string;
  role: Role;
  kycStatus: KycStatus;
  fullName?: string | null;
  avatarUrl?: string | null;
  metadata?: Record<string, any>;
};

export const mapSupabaseUser = (user: User | null): AppUser | null => {
  if (!user) {
    return null;
  }

  const role = (user.user_metadata?.role as Role) ?? 'buyer';
  const kycStatus = (user.user_metadata?.kycStatus as KycStatus) ?? 'none';

  return {
    id: user.id,
    email: user.email ?? '',
    role,
    kycStatus,
    fullName: user.user_metadata?.fullName ?? user.user_metadata?.name ?? null,
    avatarUrl: user.user_metadata?.avatarUrl ?? null,
    metadata: user.user_metadata ?? {}
  };
};

export const getActiveSession = async (): Promise<Session | null> => {
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session ?? null;
};

export const signInWithOtp = async (
  email: string,
  options?: { redirectTo?: string; shouldCreateUser?: boolean }
): Promise<void> => {
  const client = getSupabaseBrowserClient();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: options?.redirectTo,
      shouldCreateUser: options?.shouldCreateUser ?? true
    }
  });

  if (error) {
    throw error;
  }
};

export const signInWithOAuth = async (
  provider: Provider,
  options?: { redirectTo?: string; scopes?: string }
) => {
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: options?.redirectTo,
      scopes: options?.scopes
    }
  });

  if (error) {
    throw error;
  }

  return data;
};

export const signOut = async (): Promise<void> => {
  const client = getSupabaseBrowserClient();
  const { error } = await client.auth.signOut();
  if (error) {
    throw error;
  }
};

export type KycPersonalData = {
  firstName: string;
  lastName: string;
  birthdate: string;
  country: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode?: string;
};

export type KycDocument = {
  file: File;
  type: 'id_front' | 'id_back' | 'proof_of_address';
};

const mapKycPersonalDataToProfile = (data: KycPersonalData) => ({
  first_name: data.firstName,
  last_name: data.lastName,
  birthdate: data.birthdate,
  country: data.country,
  phone: data.phone,
  address_line1: data.addressLine1,
  address_line2: data.addressLine2 ?? null,
  city: data.city,
  state: data.state ?? null,
  postal_code: data.postalCode ?? null
});

export const saveKycPersonalData = async (data: KycPersonalData) => {
  const client = getSupabaseBrowserClient();
  const {
    data: { user },
    error: userError
  } = await client.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error('Debe iniciar sesión para continuar con KYC.');
  }

  const payload = {
    user_id: user.id,
    status: 'basic',
    ...mapKycPersonalDataToProfile(data)
  };

  const { error } = await client.from('kyc_profiles').upsert(payload, { onConflict: 'user_id' });
  if (error) {
    throw error;
  }

  const metadata = {
    ...user.user_metadata,
    fullName: `${data.firstName} ${data.lastName}`.trim(),
    kycStatus: 'basic'
  };

  const { error: updateError } = await client.auth.updateUser({ data: metadata });
  if (updateError) {
    throw updateError;
  }
};

export const uploadKycDocument = async (document: KycDocument) => {
  const client = getSupabaseBrowserClient();
  const {
    data: { user },
    error: userError
  } = await client.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error('Debe iniciar sesión para subir documentos.');
  }

  const extension = document.file.name.split('.').pop();
  const filePath = `${user.id}/${Date.now()}-${document.type}.${extension ?? 'bin'}`;

  const { error: storageError } = await client.storage
    .from('kyc-documents')
    .upload(filePath, document.file, { upsert: true });

  if (storageError) {
    throw storageError;
  }

  const meta = {
    userId: user.id,
    type: document.type,
    path: filePath,
    status: 'pending'
  };

  const { error: insertError } = await client.from('kyc_documents').insert(meta);
  if (insertError) {
    throw insertError;
  }

  const metadata = {
    ...user.user_metadata,
    kycStatus: 'verified'
  };

  const { error: updateError } = await client.auth.updateUser({ data: metadata });
  if (updateError) {
    throw updateError;
  }

  return filePath;
};
