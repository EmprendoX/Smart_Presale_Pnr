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
        userId: nextSession?.user?.id
      });

      setSession(nextSession ?? null);
      await ensureSupabaseUserRecord(nextSession ?? null);

      // Obtener usuario completo para asegurar que tenemos los datos más recientes
      if (nextSession) {
        try {
          const { data: userData, error: userError } = await client.auth.getUser();
          if (!userError && userData?.user) {
            // Mapear según el modo
            if (isSupabaseEnabled()) {
              setUser(mapSupabaseUser(userData.user));
            } else {
              setUser(mapJsonUser(userData.user.id));
            }
          } else {
            // Mapear según el modo
            if (isSupabaseEnabled()) {
              setUser(mapSupabaseUser(nextSession.user));
            } else {
              setUser(mapJsonUser(nextSession.user.id));
            }
          }
        } catch (error: any) {
          console.error('[AuthProvider] Error fetching user on auth change:', error);
          // Mapear según el modo
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
        const [{ data, error }, userResult] = await Promise.all([
          client.auth.getSession(),
          client.auth.getUser()
        ]);

        if (error) {
          console.error('[AuthProvider] Error refreshing session:', error.message);
          return;
        }

        setSession(data.session ?? null);
        await ensureSupabaseUserRecord(data.session ?? null);
        if (userResult.error) {
          console.error('[AuthProvider] Error refreshing user:', userResult.error.message);
          // Mapear según el modo
          if (isSupabaseEnabled()) {
            setUser(mapSupabaseUser(data.session?.user ?? null));
          } else {
            setUser(data.session?.user ? mapJsonUser(data.session.user.id) : null);
          }
        } else {
          // Mapear según el modo
          if (isSupabaseEnabled()) {
            setUser(mapSupabaseUser(userResult.data.user ?? null));
          } else {
            setUser(userResult.data.user ? mapJsonUser(userResult.data.user.id) : null);
          }
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
