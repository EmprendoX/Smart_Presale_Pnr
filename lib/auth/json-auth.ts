"use client";

import type { Session, User } from '@supabase/supabase-js';
import type { Provider } from '@supabase/supabase-js';
import type { AppUser, Role, KycStatus } from './supabase';

// Usuarios demo disponibles (de lib/mockdb.ts)
const DEMO_USERS: Record<string, AppUser> = {
  "u_investor_1": {
    id: "u_investor_1",
    email: "ana@example.com",
    role: "investor",
    kycStatus: "complete",
    fullName: "Ana Inversionista",
    metadata: {}
  },
  "u_admin_1": {
    id: "u_admin_1",
    email: "admin@example.com",
    role: "admin",
    kycStatus: "complete",
    fullName: "Administrador",
    metadata: {}
  }
};

const STORAGE_KEY = 'sps_user';

/**
 * Cliente de autenticación simulado para modo JSON
 * Implementa una interfaz compatible con Supabase Auth
 */
class JsonAuthClient {
  private listeners: Set<(event: string, session: Session | null) => void> = new Set();

  /**
   * Obtiene la sesión actual desde localStorage
   */
  async getSession(): Promise<{ data: { session: Session | null }; error: null }> {
    if (typeof window === 'undefined') {
      return { data: { session: null }, error: null };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return { data: { session: null }, error: null };
      }

      // Parsear userId del localStorage (se guarda con JSON.stringify)
      const userId = JSON.parse(stored);
      const user = DEMO_USERS[userId];
      
      if (!user) {
        localStorage.removeItem(STORAGE_KEY);
        return { data: { session: null }, error: null };
      }

      const session: Session = {
        access_token: `demo_token_${userId}`,
        refresh_token: `demo_refresh_${userId}`,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: this.mapToSupabaseUser(user)
      };

      return { data: { session }, error: null };
    } catch (error) {
      console.error('[JsonAuth] Error reading session:', error);
      return { data: { session: null }, error: null };
    }
  }

  /**
   * Obtiene el usuario actual
   */
  async getUser(): Promise<{ data: { user: User | null }; error: null }> {
    const { data } = await this.getSession();
    return { data: { user: data.session?.user ?? null }, error: null };
  }

  /**
   * Inicia sesión con un usuario demo
   */
  async signIn(userId: string): Promise<{ error: null }> {
    if (!DEMO_USERS[userId]) {
      throw new Error(`Usuario demo no encontrado: ${userId}`);
    }

    if (typeof window === 'undefined') {
      throw new Error('localStorage no disponible');
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(userId));
    
    // Establecer cookie para que el middleware pueda leerla
    // Guardar userId directamente (es un string simple) para evitar problemas de parsing
    // Usar SameSite=Lax para permitir que se envíe en requests cross-site desde el mismo dominio
    // No usar Secure en desarrollo (solo en producción con HTTPS)
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isSecure ? '; Secure' : '';
    document.cookie = `sps_user=${encodeURIComponent(userId)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secureFlag}`;
    
    // Notificar a los listeners
    const { data } = await this.getSession();
    this.notifyListeners('SIGNED_IN', data.session);

    return { error: null };
  }

  /**
   * Cierra sesión
   */
  async signOut(): Promise<{ error: null }> {
    if (typeof window === 'undefined') {
      return { error: null };
    }

    localStorage.removeItem(STORAGE_KEY);
    
    // Eliminar cookie
    document.cookie = `sps_user=; path=/; max-age=0; SameSite=Lax;`;
    
    this.notifyListeners('SIGNED_OUT', null);

    return { error: null };
  }

  /**
   * Simula signInWithOtp (no hace nada en modo JSON, pero permite que el código funcione)
   * En modo JSON, autentica automáticamente al usuario
   */
  async signInWithOtp(options: { email: string; options?: { emailRedirectTo?: string } }): Promise<{ error: null; data?: { autoAuthenticated?: boolean } }> {
    // En modo JSON, buscar usuario por email o usar el primero disponible
    const user = Object.values(DEMO_USERS).find(u => u.email === options.email);
    if (user) {
      await this.signIn(user.id);
    } else {
      console.warn('[JsonAuth] Usuario no encontrado por email, usando buyer por defecto');
      await this.signIn('u_investor_1');
    }
    // Retornar información sobre autenticación automática
    return { error: null, data: { autoAuthenticated: true } };
  }

  /**
   * Simula signInWithOAuth (no hace nada en modo JSON)
   */
  async signInWithOAuth(options: { provider: Provider; options?: { redirectTo?: string } }): Promise<{ error: null }> {
    // En modo JSON, usar admin por defecto para OAuth
    await this.signIn('u_admin_1');
    return { error: null };
  }

  /**
   * Escucha cambios en el estado de autenticación
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    this.listeners.add(callback);

    // Retornar función de unsubscribe
    return {
      data: { subscription: {} },
      unsubscribe: () => {
        this.listeners.delete(callback);
      }
    };
  }

  /**
   * Actualiza metadatos del usuario (simulado)
   */
  async updateUser(options: { data: Record<string, any> }): Promise<{ error: null }> {
    const { data } = await this.getSession();
    if (data.session?.user) {
      const userId = data.session.user.id;
      const user = DEMO_USERS[userId];
      if (user) {
        DEMO_USERS[userId] = {
          ...user,
          ...options.data,
          metadata: { ...user.metadata, ...options.data }
        };
        // Guardar cambios
        await this.getSession();
      }
    }
    return { error: null };
  }

  /**
   * Mapea AppUser a formato User de Supabase
   */
  private mapToSupabaseUser(appUser: AppUser): User {
    return {
      id: appUser.id,
      email: appUser.email,
      aud: 'authenticated',
      role: 'authenticated',
      email_confirmed_at: new Date().toISOString(),
      phone: null,
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {
        role: appUser.role,
        kycStatus: appUser.kycStatus,
        fullName: appUser.fullName,
        ...appUser.metadata
      },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as User;
  }

  /**
   * Notifica a todos los listeners sobre cambios
   */
  private notifyListeners(event: string, session: Session | null) {
    this.listeners.forEach(callback => {
      try {
        callback(event, session);
      } catch (error) {
        console.error('[JsonAuth] Error in auth state change listener:', error);
      }
    });
  }

  /**
   * Notifica cambios de estado de autenticación (método público para uso externo)
   */
  notifyAuthStateChange(event: string, session: Session | null) {
    this.notifyListeners(event, session);
  }
}

let jsonAuthClient: JsonAuthClient | null = null;

/**
 * Obtiene el cliente de autenticación JSON
 */
export function getJsonAuthClient(): JsonAuthClient {
  if (!jsonAuthClient) {
    jsonAuthClient = new JsonAuthClient();
  }
  return jsonAuthClient;
}

/**
 * Mapea usuario demo a AppUser
 */
export function mapJsonUser(userId: string): AppUser | null {
  return DEMO_USERS[userId] ?? null;
}

/**
 * Actualiza un usuario demo
 */
export function updateDemoUser(userId: string, updates: Partial<AppUser>): AppUser | null {
  if (!DEMO_USERS[userId]) {
    console.warn(`[updateDemoUser] Usuario no encontrado: ${userId}`);
    return null;
  }

  // Actualizar el usuario en DEMO_USERS
  DEMO_USERS[userId] = {
    ...DEMO_USERS[userId],
    ...updates
  };

  // Si hay cambios en metadata, mergearlos
  if (updates.metadata) {
    DEMO_USERS[userId].metadata = {
      ...DEMO_USERS[userId].metadata,
      ...updates.metadata
    };
  }

  // Si el usuario está autenticado actualmente, actualizar localStorage y cookie
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const currentUserId = JSON.parse(stored);
        if (currentUserId === userId) {
          // Actualizar cookie para reflejar cambios
          const isSecure = window.location.protocol === 'https:';
          const secureFlag = isSecure ? '; Secure' : '';
          document.cookie = `sps_user=${encodeURIComponent(userId)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secureFlag}`;
          
          // Notificar a los listeners del JsonAuthClient sobre el cambio
          const jsonClient = getJsonAuthClient();
          jsonClient.getSession().then(({ data }) => {
            // Disparar evento SIGNED_IN para que el AuthProvider se actualice
            jsonClient.notifyAuthStateChange('SIGNED_IN', data.session);
          }).catch(error => {
            console.error('[updateDemoUser] Error notifying listeners:', error);
          });
        }
      } catch (error) {
        console.error('[updateDemoUser] Error updating cookie:', error);
      }
    }
  }

  return DEMO_USERS[userId];
}

/**
 * Obtiene todos los usuarios demo disponibles
 */
export function getDemoUsers(): AppUser[] {
  return Object.values(DEMO_USERS);
}

