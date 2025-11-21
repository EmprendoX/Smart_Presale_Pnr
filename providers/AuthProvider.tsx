"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Provider as OAuthProvider, Session } from '@supabase/supabase-js';
import { getAuthClient, isSupabaseEnabled, mapSupabaseUser, type AppUser } from '@/lib/auth';
import { mapJsonUser } from '@/lib/auth/json-auth';
import { ensureSupabaseAppUser } from '@/lib/auth/supabase-sync';

type AuthContextValue = {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signInWithOtp: (email: string, options?: { redirectTo?: string; shouldCreateUser?: boolean }) => Promise<{ autoAuthenticated?: boolean } | undefined>;
  signInWithOAuth: (
    provider: OAuthProvider,
    options?: {
      redirectTo?: string;
      scopes?: string;
    }
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ensureSupabaseUserRecord = useCallback(
    async (nextSession: Session | null) => {
      if (!isSupabaseEnabled()) {
        return;
      }

      if (!nextSession?.user) {
        return;
      }
      try {
        await ensureSupabaseAppUser(nextSession.user);
      } catch (syncError) {
        console.error('[AuthProvider] Failed to sync Supabase user record:', syncError);
      }
    },
    []
  );

  // Obtener cliente de autenticación (funciona en ambos modos)
  let client;
  try {
    client = getAuthClient();
  } catch (err: any) {
    console.error('[AuthProvider] Error initializing auth client:', err);
    setError(err.message || 'Error al inicializar autenticación');
    setLoading(false);
  }

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let loadingTimeoutRef: NodeJS.Timeout | null = null;
    let unsubscribe: (() => void) | null = null;

    // Timeout de seguridad: si después de 5 segundos aún está cargando, forzar a false
    loadingTimeoutRef = setTimeout(() => {
      if (isMounted) {
        console.warn('[AuthProvider] Loading timeout reached, forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    const loadSession = async () => {
      try {
        console.log('[AuthProvider] Loading session...', { mode: isSupabaseEnabled() ? 'Supabase' : 'JSON' });
        const [{ data, error }, userResult] = await Promise.all([
          client.auth.getSession(),
          client.auth.getUser()
        ]);

        if (!isMounted) return;

        if (error) {
          console.error('[AuthProvider] Error fetching session:', error.message);
          setSession(null);
          setUser(null);
        } else {
          const hasSession = !!data.session;
          console.log('[AuthProvider] Session loaded:', { hasSession, userId: data.session?.user?.id });

          setSession(data.session ?? null);
          
          // Sincronizar sesión inicial a cookies
          if (data.session && typeof window !== 'undefined') {
            try {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
              const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
              const cookieName = `sb-${projectRef}-auth-token`;
              
              const sessionData = {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
                expires_in: data.session.expires_in || 3600,
                token_type: data.session.token_type || 'bearer',
                user: data.session.user
              };
              
              const expires = data.session.expires_at 
                ? new Date(data.session.expires_at * 1000).toUTCString()
                : new Date(Date.now() + 3600000).toUTCString();
              
              document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(sessionData))}; expires=${expires}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
              
              console.log('[AuthProvider] Initial session synced to cookie');
            } catch (cookieError) {
              console.error('[AuthProvider] Failed to sync initial session to cookie:', cookieError);
            }
          }
          
          await ensureSupabaseUserRecord(data.session ?? null);

          if (userResult.error) {
            console.error('[AuthProvider] Error fetching user:', userResult.error.message);
            // Mapear usuario según el modo
            if (isSupabaseEnabled()) {
              setUser(mapSupabaseUser(data.session?.user ?? null));
            } else {
              setUser(data.session?.user ? mapJsonUser(data.session.user.id) : null);
            }
          } else {
            // Mapear usuario según el modo
            if (isSupabaseEnabled()) {
              setUser(mapSupabaseUser(userResult.data.user ?? null));
            } else {
              setUser(userResult.data.user ? mapJsonUser(userResult.data.user.id) : null);
            }
          }
        }
      } catch (error: any) {
        console.error('[AuthProvider] Unexpected session error:', error);
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setError(error.message || 'Error al cargar sesión');
      } finally {
        // SIEMPRE poner loading en false, sin importar qué pase
        if (isMounted) {
          console.log('[AuthProvider] Setting loading to false');
          setLoading(false);
          // Limpiar timeout si la carga terminó exitosamente
          if (loadingTimeoutRef) {
            clearTimeout(loadingTimeoutRef);
            loadingTimeoutRef = null;
          }
        }
      }
    };

    loadSession();

    // Suscribirse a cambios de estado de autenticación
    const subscription = client.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) return;
      
      console.log('[AuthProvider] Auth state changed:', event, {
        hasSession: !!nextSession,
        userId: nextSession?.user?.id,
        email: nextSession?.user?.email
      });

      // Manejar eventos específicos
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('[AuthProvider] User signed in or token refreshed, updating session');
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthProvider] User signed out, clearing session');
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(nextSession ?? null);
      
      // Sincronizar sesión a cookies para que el servidor pueda leerla
      if (nextSession && typeof window !== 'undefined') {
        try {
          // Obtener el project ref de la URL de Supabase
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
          const cookieName = `sb-${projectRef}-auth-token`;
          
          // Construir el objeto de sesión para la cookie
          const sessionData = {
            access_token: nextSession.access_token,
            refresh_token: nextSession.refresh_token,
            expires_at: nextSession.expires_at,
            expires_in: nextSession.expires_in || 3600,
            token_type: nextSession.token_type || 'bearer',
            user: nextSession.user
          };
          
          // Establecer cookie
          const expires = nextSession.expires_at 
            ? new Date(nextSession.expires_at * 1000).toUTCString()
            : new Date(Date.now() + 3600000).toUTCString();
          
          document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(sessionData))}; expires=${expires}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
          
          console.log('[AuthProvider] Session synced to cookie:', cookieName);
        } catch (cookieError) {
          console.error('[AuthProvider] Failed to sync session to cookie:', cookieError);
        }
      } else if (!nextSession && typeof window !== 'undefined') {
        // Eliminar cookies cuando no hay sesión
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
          const cookieName = `sb-${projectRef}-auth-token`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        } catch (e) {
          // Ignorar errores
        }
      }
      
      // Sincronizar usuario en Supabase si hay sesión
      if (nextSession?.user) {
        try {
          await ensureSupabaseUserRecord(nextSession);
        } catch (syncError) {
          console.error('[AuthProvider] Failed to sync user record on auth change:', syncError);
          // Continuar aunque falle la sincronización
        }
      }

      // Obtener usuario completo para asegurar que tenemos los datos más recientes
      if (nextSession) {
        try {
          const { data: userData, error: userError } = await client.auth.getUser();
          if (!userError && userData?.user) {
            console.log('[AuthProvider] User data fetched successfully:', {
              userId: userData.user.id,
              email: userData.user.email
            });
            // Mapear según el modo
            if (isSupabaseEnabled()) {
              const mappedUser = mapSupabaseUser(userData.user);
              setUser(mappedUser);
              console.log('[AuthProvider] Mapped Supabase user:', {
                id: mappedUser?.id,
                role: mappedUser?.role,
                kycStatus: mappedUser?.kycStatus
              });
            } else {
              setUser(mapJsonUser(userData.user.id));
            }
          } else {
            console.warn('[AuthProvider] Error fetching user, using session user:', userError?.message);
            // Mapear según el modo usando el usuario de la sesión
            if (isSupabaseEnabled()) {
              setUser(mapSupabaseUser(nextSession.user));
            } else {
              setUser(mapJsonUser(nextSession.user.id));
            }
          }
        } catch (error: any) {
          console.error('[AuthProvider] Error fetching user on auth change:', error);
          // Mapear según el modo usando el usuario de la sesión como fallback
          if (isSupabaseEnabled()) {
            setUser(mapSupabaseUser(nextSession.user));
          } else {
            setUser(mapJsonUser(nextSession.user.id));
          }
        }
      } else {
        setUser(null);
      }
      
      // SIEMPRE poner loading en false cuando cambia el estado de auth
      setLoading(false);
    });

    unsubscribe = subscription.unsubscribe;

    // Cleanup: desmontar y limpiar recursos
    return () => {
      isMounted = false;
      if (loadingTimeoutRef) {
        clearTimeout(loadingTimeoutRef);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [client, ensureSupabaseUserRecord]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signInWithOtp: async (email, options) => {
        if (!client) {
          throw new Error('Cliente de autenticación no inicializado');
        }
        const result = await client.auth.signInWithOtp({ email, options });
        if (result.error) {
          throw result.error;
        }
        // Retornar información sobre autenticación automática si existe
        return result.data;
      },
      signInWithOAuth: async (provider, options) => {
        if (!client) {
          throw new Error('Cliente de autenticación no inicializado');
        }
        const result = await client.auth.signInWithOAuth({ provider, options });
        if (result.error) {
          throw result.error;
        }
      },
      signOut: async () => {
        if (!client) {
          setUser(null);
          setSession(null);
          return;
        }
        await client.auth.signOut();
        setUser(null);
        setSession(null);
      },
      refreshSession: async () => {
        if (!client) {
          console.warn('[AuthProvider] Cannot refresh session: client not initialized');
          return;
        }
        
        console.log('[AuthProvider] Refreshing session...');
        
        try {
          const [{ data, error }, userResult] = await Promise.all([
            client.auth.getSession(),
            client.auth.getUser()
          ]);

          if (error) {
            console.error('[AuthProvider] Error refreshing session:', {
              message: error.message,
              status: error.status,
              name: error.name
            });
            setSession(null);
            setUser(null);
            return;
          }

          const hasSession = !!data.session;
          console.log('[AuthProvider] Session refreshed:', {
            hasSession,
            userId: data.session?.user?.id,
            email: data.session?.user?.email
          });

          setSession(data.session ?? null);
          
          // Sincronizar sesión a cookies cuando se refresca
          if (data.session && typeof window !== 'undefined') {
            try {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
              const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
              const cookieName = `sb-${projectRef}-auth-token`;
              
              const sessionData = {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
                expires_in: data.session.expires_in || 3600,
                token_type: data.session.token_type || 'bearer',
                user: data.session.user
              };
              
              const expires = data.session.expires_at 
                ? new Date(data.session.expires_at * 1000).toUTCString()
                : new Date(Date.now() + 3600000).toUTCString();
              
              document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(sessionData))}; expires=${expires}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
              
              console.log('[AuthProvider] Session refreshed and synced to cookie');
            } catch (cookieError) {
              console.error('[AuthProvider] Failed to sync refreshed session to cookie:', cookieError);
            }
          }
          
          // Sincronizar usuario en Supabase si hay sesión
          if (data.session?.user) {
            try {
              await ensureSupabaseUserRecord(data.session);
            } catch (syncError) {
              console.error('[AuthProvider] Failed to sync user record on refresh:', syncError);
              // Continuar aunque falle la sincronización
            }
          }

          if (userResult.error) {
            console.warn('[AuthProvider] Error refreshing user, using session user:', userResult.error.message);
            // Mapear según el modo usando el usuario de la sesión
            if (isSupabaseEnabled()) {
              setUser(mapSupabaseUser(data.session?.user ?? null));
            } else {
              setUser(data.session?.user ? mapJsonUser(data.session.user.id) : null);
            }
          } else {
            // Mapear según el modo usando el usuario completo
            if (isSupabaseEnabled()) {
              const mappedUser = mapSupabaseUser(userResult.data.user ?? null);
              setUser(mappedUser);
              console.log('[AuthProvider] User refreshed:', {
                id: mappedUser?.id,
                role: mappedUser?.role,
                kycStatus: mappedUser?.kycStatus
              });
            } else {
              setUser(userResult.data.user ? mapJsonUser(userResult.data.user.id) : null);
            }
          }
        } catch (error: any) {
          console.error('[AuthProvider] Unexpected error refreshing session:', error);
          setSession(null);
          setUser(null);
        }
      }
    }),
    [client, loading, session, user]
  );

  // Mostrar error en desarrollo si hay problemas de configuración
  if (error && process.env.NODE_ENV === 'development') {
    console.error('[AuthProvider] Configuration error:', error);
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
