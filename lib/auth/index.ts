/**
 * Interfaz unificada de autenticación
 * Funciona tanto con Supabase como con modo JSON según la configuración
 */

import { isSupabaseEnabled, getSupabaseBrowserClient, createSupabaseServerClient, type AppUser, mapSupabaseUser } from './supabase';
import { getJsonAuthClient, mapJsonUser, getDemoUsers } from './json-auth';
import type { NextRequest, NextResponse } from 'next/server';
import type { Session, User, Provider } from '@supabase/supabase-js';

/**
 * Tipo para cliente de autenticación unificado
 */
export type AuthClient = {
  auth: {
    getSession: () => Promise<{ data: { session: Session | null }; error: any }>;
    getUser: () => Promise<{ data: { user: User | null }; error: any }>;
    signIn: (userId: string) => Promise<{ error: any }>;
    signOut: () => Promise<{ error: any }>;
    signInWithOtp: (options: { email: string; options?: { emailRedirectTo?: string; shouldCreateUser?: boolean } }) => Promise<{ error: any; data?: { autoAuthenticated?: boolean } }>;
    signInWithOAuth: (options: { provider: Provider; options?: { redirectTo?: string } }) => Promise<{ error: any }>;
    updateUser: (options: { data: Record<string, any> }) => Promise<{ error: any }>;
    onAuthStateChange: (callback: (event: string, session: Session | null) => void) => { data: { subscription: any }; unsubscribe: () => void };
  };
};

/**
 * Obtiene el cliente de autenticación apropiado según la configuración
 * Unifica la lógica para evitar conflictos entre mock y Supabase
 * Optimizado para flujo de solo inversionistas
 */
export function getAuthClient(): AuthClient {
  if (isSupabaseEnabled()) {
    console.log('[AuthClient] Using Supabase client for investor authentication');
    const supabase = getSupabaseBrowserClient();
    return {
      auth: {
        getSession: () => supabase.auth.getSession(),
        getUser: () => supabase.auth.getUser(),
        signIn: async () => {
          throw new Error('signIn directo no disponible en modo Supabase. Use signInWithOtp para inversionistas.');
        },
        signOut: () => supabase.auth.signOut(),
        signInWithOtp: async (options) => {
          console.log('[AuthClient] Supabase OTP sign in for investor:', options.email);
          const result = await supabase.auth.signInWithOtp({
            email: options.email,
            options: {
              ...options.options,
              data: {
                role: 'investor', // Asignar rol de inversionista por defecto
                kycStatus: 'none'
              }
            }
          });
          // En Supabase, nunca es autenticación automática - requiere verificar email
          return { ...result, data: { autoAuthenticated: false } };
        },
        signInWithOAuth: (options) => supabase.auth.signInWithOAuth(options),
        updateUser: (options) => supabase.auth.updateUser(options),
        onAuthStateChange: (callback) => supabase.auth.onAuthStateChange((event, session) => callback(event, session))
      }
    };
  } else {
    console.log('[AuthClient] Using JSON mock client for development');
    const jsonAuth = getJsonAuthClient();
    return {
      auth: {
        getSession: () => jsonAuth.getSession(),
        getUser: () => jsonAuth.getUser(),
        signIn: (userId: string) => jsonAuth.signIn(userId),
        signOut: () => jsonAuth.signOut(),
        signInWithOtp: (options) => {
          console.log('[AuthClient] Mock OTP sign in for development:', options.email);
          return jsonAuth.signInWithOtp(options);
        },
        signInWithOAuth: (options) => jsonAuth.signInWithOAuth(options),
        updateUser: (options) => jsonAuth.updateUser(options),
        onAuthStateChange: (callback) => jsonAuth.onAuthStateChange(callback)
      }
    };
  }
}

/**
 * Crea cliente de servidor (solo para Supabase, en modo JSON retorna null)
 */
export function createServerAuthClient(
  request: NextRequest,
  response: NextResponse
): AuthClient | null {
  if (!isSupabaseEnabled()) {
    return null;
  }

  const supabase = createSupabaseServerClient(request, response);
  return {
    auth: {
      getSession: () => supabase.auth.getSession(),
      getUser: () => supabase.auth.getUser(),
      signIn: async () => {
        throw new Error('signIn directo no disponible en modo Supabase.');
      },
      signOut: () => supabase.auth.signOut(),
      signInWithOtp: (options) => supabase.auth.signInWithOtp(options),
      signInWithOAuth: (options) => supabase.auth.signInWithOAuth(options),
      updateUser: (options) => supabase.auth.updateUser(options),
      onAuthStateChange: (callback) => supabase.auth.onAuthStateChange((event, session) => callback(event, session))
    }
  };
}

/**
 * Obtiene el usuario autenticado (funciona en ambos modos)
 * Unificado para usar el cliente correcto según configuración
 * Optimizado para sistema de solo inversionistas y admin
 */
export async function getAuthenticatedUser(): Promise<AppUser | null> {
  try {
    const authClient = getAuthClient();
    const { data, error } = await authClient.auth.getSession();
    
    if (error || !data.session) {
      return null;
    }

    if (isSupabaseEnabled()) {
      // En modo Supabase, mapear desde user_metadata con roles simplificados
      const supabaseUser = data.session.user;
      const role = (supabaseUser.user_metadata?.role as 'investor' | 'admin') ?? 'investor';
      
      // Validar que el rol sea válido (solo investor o admin)
      if (role !== 'investor' && role !== 'admin') {
        console.warn('[getAuthenticatedUser] Invalid role detected, defaulting to investor:', role);
      }
      
      return {
        id: supabaseUser.id,
        email: supabaseUser.email ?? '',
        role: (role === 'admin') ? 'admin' : 'investor',
        kycStatus: (supabaseUser.user_metadata?.kycStatus as 'none' | 'complete') ?? 'none',
        fullName: supabaseUser.user_metadata?.fullName ?? supabaseUser.user_metadata?.name ?? null,
        avatarUrl: supabaseUser.user_metadata?.avatarUrl ?? null,
        metadata: supabaseUser.user_metadata ?? {}
      };
    } else {
      // En modo mock, usar mapJsonUser (ya actualizado para nuevos roles)
      return mapJsonUser(data.session.user.id) ?? null;
    }
  } catch (error) {
    console.error('[getAuthenticatedUser] Error:', error);
    return null;
  }
}

/**
 * Exportar funciones y tipos útiles
 */
export { isSupabaseEnabled, mapSupabaseUser, getDemoUsers, mapJsonUser };
export type { AppUser };

