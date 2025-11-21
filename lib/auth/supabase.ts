import { createClient, type Provider, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextRequest, NextResponse } from 'next/server';
import type { Role, KycStatus } from '@/lib/types';
import { getJsonAuthClient, updateDemoUser } from './json-auth';

let browserClient: SupabaseClient | null = null;

/**
 * Verifica si Supabase está habilitado y configurado correctamente
 */
export function isSupabaseEnabled(): boolean {
  const useSupabase = process.env.USE_SUPABASE?.toLowerCase() === 'true';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return !!(useSupabase && url && anonKey);
}

function getSupabaseMockClient(): SupabaseClient {
  const disabledError = new Error('Supabase is disabled (set USE_SUPABASE=true to re-enable it).');

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithOtp: async () => ({ data: {}, error: disabledError as any }),
      signInWithOAuth: async () => ({ data: {}, error: disabledError as any }),
      updateUser: async () => ({ data: { user: null }, error: disabledError as any }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: (callback) => {
        callback('SIGNED_OUT', null);
        const subscription = { unsubscribe: () => {} };
        return { data: { subscription }, unsubscribe: () => subscription.unsubscribe() };
      }
    }
    // Casting allows us to satisfy the SupabaseClient contract while keeping calls inert.
  } as unknown as SupabaseClient;
}

function getSupabaseCredentials() {
  if (!isSupabaseEnabled()) {
    throw new Error('Supabase is not enabled. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase credentials are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  return { url, anonKey };
}

export const getSupabaseBrowserClient = (): SupabaseClient => {
  if (!isSupabaseEnabled()) {
    console.warn('[Supabase] Returning mock client because USE_SUPABASE is not enabled');
    return getSupabaseMockClient();
  }

  if (!browserClient) {
    const { url, anonKey } = getSupabaseCredentials();
    
    // Configurar el cliente con opciones que aseguran la lectura correcta de cookies
    // IMPORTANTE: Usar un storage personalizado que sincronice con cookies
    // para que el servidor pueda leer la sesión
    const customStorage = typeof window !== 'undefined' ? {
      getItem: (key: string) => {
        // Primero intentar leer de localStorage
        const localStorageValue = window.localStorage.getItem(key);
        if (localStorageValue) return localStorageValue;
        
        // Si no está en localStorage, intentar leer de cookies
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [name, value] = cookie.trim().split('=');
          acc[name] = value;
          return acc;
        }, {} as Record<string, string>);
        
        // Buscar cookie de Supabase
        const cookieKey = Object.keys(cookies).find(k => k.includes('sb-') && k.includes('auth'));
        if (cookieKey) {
          try {
            const cookieValue = decodeURIComponent(cookies[cookieKey]);
            const parsed = JSON.parse(cookieValue);
            if (parsed.access_token) {
              // Sincronizar a localStorage
              window.localStorage.setItem(key, JSON.stringify(parsed));
              return JSON.stringify(parsed);
            }
          } catch (e) {
            // Ignorar errores de parsing
          }
        }
        
        return null;
      },
      setItem: (key: string, value: string) => {
        // Guardar en localStorage
        window.localStorage.setItem(key, value);
        
        // También sincronizar a cookies para que el servidor pueda leerlas
        try {
          const parsed = JSON.parse(value);
          if (parsed.access_token) {
            // Obtener el project ref de la URL
            const projectRef = url.split('//')[1]?.split('.')[0] || 'default';
            const cookieName = `sb-${projectRef}-auth-token`;
            
            // Establecer cookie con los mismos datos
            const expires = parsed.expires_at 
              ? new Date(parsed.expires_at * 1000).toUTCString()
              : new Date(Date.now() + 3600000).toUTCString(); // 1 hora por defecto
            
            document.cookie = `${cookieName}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
          }
        } catch (e) {
          // Si falla el parsing, solo guardar en localStorage
          console.warn('[Supabase Client] Failed to sync to cookies:', e);
        }
      },
      removeItem: (key: string) => {
        window.localStorage.removeItem(key);
        // También eliminar cookies relacionadas
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
          const name = cookie.trim().split('=')[0];
          if (name.includes('sb-') && name.includes('auth')) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        });
      }
    } : undefined;
    
    browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // Detectar sesión en la URL (útil después de redirects)
        storage: customStorage,
        storageKey: 'supabase.auth.token',
        flowType: 'pkce' // Usar PKCE para mejor seguridad y compatibilidad
      },
      global: {
        headers: {
          'X-Client-Info': 'smart-presale'
        }
      }
    });

    // Añadir listener para debug en desarrollo
    if (process.env.NODE_ENV === 'development') {
      browserClient.auth.onAuthStateChange((event, session) => {
        console.log('[Supabase Client] Auth state changed:', {
          event,
          hasSession: !!session,
          userId: session?.user?.id
        });
      });
    }
  }

  return browserClient;
};

export const createSupabaseServerClient = (
  request: NextRequest,
  response: NextResponse
): SupabaseClient => {
  if (!isSupabaseEnabled()) {
    console.warn('[Supabase] Returning mock server client because USE_SUPABASE is not enabled');
    return getSupabaseMockClient();
  }

  return createMiddlewareSupabaseClient({ req: request, res: response }) as unknown as SupabaseClient;
};

/**
 * Crea un cliente de Supabase para lectura de sesión desde las cookies del request
 * Útil cuando solo necesitamos leer la sesión sin modificar cookies
 * 
 * En rutas API, el helper de middleware necesita un response válido, pero solo lee del request
 */
export const createSupabaseServerClientForReading = (
  request: NextRequest
): SupabaseClient => {
  if (!isSupabaseEnabled()) {
    console.warn('[Supabase] Returning mock read-only client because USE_SUPABASE is not enabled');
    return getSupabaseMockClient();
  }
  
  // El helper de middleware lee las cookies directamente del request
  // Solo necesita un response válido para funcionar, aunque no lo use para leer cookies
  // Crear un response temporal vacío
  const tempResponse = new NextResponse();
  
  // El helper de Supabase lee las cookies del request automáticamente
  // El response solo se usa si necesitamos establecer nuevas cookies
  return createMiddlewareSupabaseClient({ req: request, res: tempResponse }) as unknown as SupabaseClient;
};

/**
 * Lee la sesión directamente desde las cookies del request usando el cliente de Supabase estándar
 * Este método es más confiable que el helper de middleware en rutas API
 * 
 * ESTRATEGIA: Leer TODAS las cookies posibles y probar diferentes formatos
 */
export async function getSessionFromCookies(request: NextRequest): Promise<Session | null> {
  if (!isSupabaseEnabled()) {
    return null;
  }

  try {
    const cookieHeader = request.headers.get('cookie') || '';
    if (!cookieHeader) {
      console.log('[getSessionFromCookies] No cookie header');
      return null;
    }
    
    const cookies = parseCookies(cookieHeader);
    console.log('[getSessionFromCookies] ===== DEBUGGING COOKIES =====');
    console.log('[getSessionFromCookies] All cookie names:', Object.keys(cookies));
    console.log('[getSessionFromCookies] Cookies with "sb-":', Object.keys(cookies).filter(k => k.includes('sb-')));
    
    // ESTRATEGIA 1: Buscar cookie de auth-token (formato del helper)
    let authCookieName = Object.keys(cookies).find(key => {
      const lowerKey = key.toLowerCase();
      return (lowerKey.includes('sb-') && 
              (lowerKey.includes('auth-token') || 
               lowerKey.includes('auth.token') ||
               lowerKey.includes('auth_token')));
    });
    
    // ESTRATEGIA 2: Si no encontramos, buscar cualquier cookie que contenga "sb-" y "auth"
    if (!authCookieName) {
      authCookieName = Object.keys(cookies).find(key => {
        const lowerKey = key.toLowerCase();
        return lowerKey.includes('sb-') && lowerKey.includes('auth');
      });
    }
    
    // ESTRATEGIA 3: Buscar cualquier cookie que empiece con "sb-"
    if (!authCookieName) {
      authCookieName = Object.keys(cookies).find(key => key.toLowerCase().startsWith('sb-'));
    }
    
    if (!authCookieName) {
      console.error('[getSessionFromCookies] NO AUTH COOKIE FOUND!');
      console.error('[getSessionFromCookies] All available cookies:', Object.keys(cookies));
      return null;
    }
    
    console.log('[getSessionFromCookies] Found potential auth cookie:', authCookieName);
    
    try {
      const cookieValue = cookies[authCookieName];
      console.log('[getSessionFromCookies] Cookie value length:', cookieValue.length);
      console.log('[getSessionFromCookies] Cookie value preview:', cookieValue.substring(0, 150));
      
      let authData: any = null;
      
      // Intentar múltiples formas de parsear
      const parseAttempts = [
        () => JSON.parse(decodeURIComponent(cookieValue)),
        () => JSON.parse(cookieValue),
        () => {
          // Intentar como string base64
          try {
            const decoded = Buffer.from(cookieValue, 'base64').toString('utf-8');
            return JSON.parse(decoded);
          } catch {
            throw new Error('Not base64');
          }
        }
      ];
      
      for (const attempt of parseAttempts) {
        try {
          authData = attempt();
          if (authData && (authData.access_token || authData.session?.access_token)) {
            console.log('[getSessionFromCookies] Successfully parsed cookie');
            break;
          }
        } catch (e) {
          // Continuar con el siguiente intento
        }
      }
      
      // Si authData tiene una estructura anidada, extraerla
      if (authData?.session) {
        authData = authData.session;
      }
      
      if (!authData) {
        console.error('[getSessionFromCookies] Failed to parse cookie as JSON');
        return null;
      }
      
      // Obtener access_token de diferentes lugares posibles
      const accessToken = authData.access_token || authData.session?.access_token;
      const refreshToken = authData.refresh_token || authData.session?.refresh_token;
      
      if (!accessToken) {
        console.error('[getSessionFromCookies] No access_token found in parsed data');
        console.error('[getSessionFromCookies] Parsed data keys:', Object.keys(authData));
        return null;
      }
      
      console.log('[getSessionFromCookies] Found access_token, validating with Supabase...');
      
      const { url, anonKey } = getSupabaseCredentials();
      
      // Crear cliente de Supabase estándar
      const supabase = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      });
      
      // Establecer la sesión usando setSession (método estándar)
      // Esto valida el token y establece la sesión en el cliente
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || ''
      });
      
      if (sessionError) {
        console.error('[getSessionFromCookies] Error setting session:', {
          message: sessionError.message,
          status: sessionError.status,
          name: sessionError.name
        });
        
        // Si setSession falla, intentar validar el token directamente con getUser
        // getUser() sin parámetros usa el token del header Authorization
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError || !userData?.user) {
          console.error('[getSessionFromCookies] getUser also failed:', {
            message: userError?.message,
            status: userError?.status
          });
          return null;
        }
        
        // Construir la sesión manualmente con el usuario validado
        const session: Session = {
          access_token: accessToken,
          refresh_token: refreshToken || '',
          expires_in: authData.expires_in || 3600,
          expires_at: authData.expires_at || Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: userData.user
        };
        
        console.log('[getSessionFromCookies] Session validated via getUser fallback');
        return session;
      }
      
      if (!sessionData?.session || !sessionData.session.user) {
        console.error('[getSessionFromCookies] setSession succeeded but no session returned');
        return null;
      }
      
      console.log('[getSessionFromCookies] Session successfully validated via setSession');
      return sessionData.session;
      
    } catch (parseError: any) {
      console.error('[getSessionFromCookies] Error processing cookie:', {
        error: parseError.message,
        stack: parseError.stack,
        cookieName: authCookieName
      });
      return null;
    }
  } catch (error: any) {
    console.error('[getSessionFromCookies] Unexpected error:', {
      error: error.message,
      stack: error.stack
    });
    return null;
  }
}

/**
 * Parsea el header de cookies en un objeto
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length > 0) {
      cookies[name] = rest.join('=');
    }
  });
  
  return cookies;
}

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
  if (!isSupabaseEnabled()) {
    return null;
  }
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
  // Modo JSON: actualizar usuario demo directamente
  if (!isSupabaseEnabled()) {
    const jsonClient = getJsonAuthClient();
    const { data: sessionData } = await jsonClient.getSession();
    
    if (!sessionData.session?.user) {
      throw new Error('Debe iniciar sesión para continuar con KYC.');
    }

    const userId = sessionData.session.user.id;
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    
    // Actualizar usuario demo con datos personales y cambiar kycStatus a 'complete'
    const updatedUser = updateDemoUser(userId, {
      fullName,
      kycStatus: 'complete',
      metadata: {
        firstName: data.firstName,
        lastName: data.lastName,
        birthdate: data.birthdate,
        country: data.country,
        phone: data.phone,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode
      }
    });

    if (!updatedUser) {
      throw new Error('No se pudo actualizar el usuario.');
    }

    // Notificar cambio de estado para que el AuthProvider se actualice
    await jsonClient.getSession();
    return;
  }

  // Modo Supabase: usar Supabase normalmente
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
    status: 'complete',
    ...mapKycPersonalDataToProfile(data)
  };

  const { error } = await client.from('kyc_profiles').upsert(payload, { onConflict: 'user_id' });
  if (error) {
    throw error;
  }

  const metadata = {
    ...user.user_metadata,
    fullName: `${data.firstName} ${data.lastName}`.trim(),
    kycStatus: 'complete'
  };

  const { error: updateError } = await client.auth.updateUser({ data: metadata });
  if (updateError) {
    throw updateError;
  }
};

export const uploadKycDocument = async (document: KycDocument) => {
  // Modo JSON: simular subida de documento y marcar como verificado
  if (!isSupabaseEnabled()) {
    const jsonClient = getJsonAuthClient();
    const { data: sessionData } = await jsonClient.getSession();
    
    if (!sessionData.session?.user) {
      throw new Error('Debe iniciar sesión para subir documentos.');
    }

    const userId = sessionData.session.user.id;
    
    // En modo JSON, solo simulamos la subida y marcamos como verificado
    // No guardamos el archivo realmente, solo actualizamos el estado
    const extension = document.file.name.split('.').pop();
    const filePath = `mock/${userId}/${Date.now()}-${document.type}.${extension ?? 'bin'}`;
    
    // Actualizar usuario demo con kycStatus 'complete'
    const updatedUser = updateDemoUser(userId, {
      kycStatus: 'complete',
      metadata: {
        ...(sessionData.session.user.user_metadata || {}),
        [`kyc_${document.type}_uploaded`]: true,
        [`kyc_${document.type}_path`]: filePath
      }
    });

    if (!updatedUser) {
      throw new Error('No se pudo actualizar el usuario.');
    }

    // Notificar cambio de estado para que el AuthProvider se actualice
    await jsonClient.getSession();
    return filePath;
  }

  // Modo Supabase: usar Supabase normalmente
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
    kycStatus: 'complete'
  };

  const { error: updateError } = await client.auth.updateUser({ data: metadata });
  if (updateError) {
    throw updateError;
  }

  return filePath;
};
