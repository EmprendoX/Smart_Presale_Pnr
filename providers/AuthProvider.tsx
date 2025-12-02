"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Provider as OAuthProvider, Session } from '@supabase/supabase-js';
import { getAuthClient } from '@/lib/auth/index';
import { isSupabaseEnabled } from '@/lib/auth/supabase';
import { mapJsonUser, type AppUser } from '@/lib/auth/json-auth';

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

  useEffect(() => {
    // Crear cliente solo en el cliente (después de montar)
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const authClient = getAuthClient();
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const loadSession = async () => {
      try {
        const { data } = await authClient.auth.getSession();
        
        if (!isMounted) return;

        setSession(data.session ?? null);
        
        if (data.session?.user) {
          if (isSupabaseEnabled()) {
            // En modo Supabase, mapear desde user_metadata
            const supabaseUser = data.session.user;
            setUser({
              id: supabaseUser.id,
              email: supabaseUser.email ?? '',
              role: (supabaseUser.user_metadata?.role as 'investor' | 'admin') ?? 'investor',
              kycStatus: (supabaseUser.user_metadata?.kycStatus as 'none' | 'complete') ?? 'none',
              fullName: supabaseUser.user_metadata?.fullName ?? supabaseUser.user_metadata?.name ?? null,
              avatarUrl: supabaseUser.user_metadata?.avatarUrl ?? null,
              metadata: supabaseUser.user_metadata ?? {}
            });
          } else {
            // En modo mock, usar mapJsonUser
            setUser(mapJsonUser(data.session.user.id));
          }
        } else {
          setUser(null);
        }
      } catch (error: any) {
        console.error('[AuthProvider] Error loading session:', error);
        if (!isMounted) return;
        setSession(null);
        setUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSession();

    // Suscribirse a cambios de estado de autenticación
    const subscription = authClient.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) return;
      
      console.log('[AuthProvider] Auth state changed:', event);

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(nextSession ?? null);
      
      if (nextSession?.user) {
        if (isSupabaseEnabled()) {
          // En modo Supabase, mapear desde user_metadata
          const supabaseUser = nextSession.user;
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email ?? '',
            role: (supabaseUser.user_metadata?.role as 'investor' | 'admin') ?? 'investor',
            kycStatus: (supabaseUser.user_metadata?.kycStatus as 'none' | 'complete') ?? 'none',
            fullName: supabaseUser.user_metadata?.fullName ?? supabaseUser.user_metadata?.name ?? null,
            avatarUrl: supabaseUser.user_metadata?.avatarUrl ?? null,
            metadata: supabaseUser.user_metadata ?? {}
          });
        } else {
          // En modo mock, usar mapJsonUser
          setUser(mapJsonUser(nextSession.user.id));
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    unsubscribe = subscription.unsubscribe;

    // Cleanup
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signInWithOtp: async (email, options) => {
        if (typeof window === 'undefined') return;
        const authClient = getAuthClient();
        const result = await authClient.auth.signInWithOtp({ email, options });
        return result.data;
      },
      signInWithOAuth: async (provider, options) => {
        if (typeof window === 'undefined') return;
        const authClient = getAuthClient();
        await authClient.auth.signInWithOAuth({ provider, options });
      },
      signOut: async () => {
        if (typeof window === 'undefined') return;
        const authClient = getAuthClient();
        await authClient.auth.signOut();
        setUser(null);
        setSession(null);
      },
      refreshSession: async () => {
        if (typeof window === 'undefined') return;
        try {
          const authClient = getAuthClient();
          const { data } = await authClient.auth.getSession();
          setSession(data.session ?? null);
          
          if (data.session?.user) {
            if (isSupabaseEnabled()) {
              // En modo Supabase, mapear desde user_metadata
              const supabaseUser = data.session.user;
              setUser({
                id: supabaseUser.id,
                email: supabaseUser.email ?? '',
                role: (supabaseUser.user_metadata?.role as 'investor' | 'admin') ?? 'investor',
                kycStatus: (supabaseUser.user_metadata?.kycStatus as 'none' | 'complete') ?? 'none',
                fullName: supabaseUser.user_metadata?.fullName ?? supabaseUser.user_metadata?.name ?? null,
                avatarUrl: supabaseUser.user_metadata?.avatarUrl ?? null,
                metadata: supabaseUser.user_metadata ?? {}
              });
            } else {
              // En modo mock, usar mapJsonUser
              setUser(mapJsonUser(data.session.user.id));
            }
          } else {
            setUser(null);
          }
        } catch (error: any) {
          console.error('[AuthProvider] Error refreshing session:', error);
          setSession(null);
          setUser(null);
        }
      }
    }),
    [loading, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
