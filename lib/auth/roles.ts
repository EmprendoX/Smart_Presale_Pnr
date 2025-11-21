import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseServerClientForReading, getSessionFromCookies, mapSupabaseUser, isSupabaseEnabled, type AppUser } from './supabase';
import { mapJsonUser } from './json-auth';
import { Role } from '@/lib/types';
import { db } from '@/lib/config';

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? 'tenant_default';

/**
 * Obtiene el usuario autenticado desde la sesión (Supabase o JSON según configuración)
 * Consulta primero la tabla app_users, y si no existe, la crea automáticamente
 * @param request Request de Next.js
 * @param response Response de Next.js (opcional, se crea si no se proporciona)
 * @returns Usuario autenticado o null si no hay sesión
 */
export async function getAuthenticatedUser(
  request: NextRequest,
  response?: NextResponse
): Promise<AppUser | null> {
  try {
    // Modo JSON: leer cookie directamente
    if (!isSupabaseEnabled()) {
      const sessionCookie = request.cookies.get('sps_user');
      if (!sessionCookie?.value) {
        return null;
      }
      
      try {
        let userId: string;
        
        // Intentar primero con decodeURIComponent (formato nuevo)
        try {
          userId = decodeURIComponent(sessionCookie.value);
        } catch {
          // Si falla, intentar con JSON.parse (formato legacy)
          try {
            userId = JSON.parse(sessionCookie.value);
          } catch {
            // Si ambos fallan, usar el valor directamente
            userId = sessionCookie.value;
          }
        }
        
        const appUser = mapJsonUser(userId);
        
        if (!appUser) {
          console.warn('[getAuthenticatedUser] Usuario no encontrado:', userId);
          return null;
        }
        
        // Retornar AppUser directamente desde mapJsonUser
        return appUser;
      } catch (error) {
        console.error('[getAuthenticatedUser] Error parsing JSON cookie:', error);
        return null;
      }
    }
    
    // Modo Supabase: usar Supabase Auth
    // ESTRATEGIA: Usar el helper de Supabase directamente (es el método más confiable)
    // El helper maneja automáticamente la lectura de cookies en el formato correcto
    
    let session = null;
    let sessionError = null;
    
    try {
      // Crear cliente de Supabase usando el helper
      // El helper lee las cookies automáticamente del request
      let supabase;
      if (response) {
        // Si hay response, usar el método normal (útil para establecer cookies)
        supabase = createSupabaseServerClient(request, response);
      } else {
        // Si no hay response, usar el método de solo lectura
        supabase = createSupabaseServerClientForReading(request);
      }
      
      // Obtener sesión usando el helper (método más confiable)
      const sessionResult = await supabase.auth.getSession();
      sessionError = sessionResult.error;
      session = sessionResult.data.session;
      
      if (session && session.user) {
        console.log('[getAuthenticatedUser] ✅ Session found using Supabase helper');
      } else if (sessionError) {
        console.warn('[getAuthenticatedUser] Helper method error:', {
          message: sessionError.message,
          status: sessionError.status
        });
      }
    } catch (error: any) {
      console.error('[getAuthenticatedUser] Helper method failed:', error.message);
      sessionError = error;
    }
    
    // Si el helper falló, intentar método directo como fallback
    if (!session && !sessionError) {
      try {
        session = await getSessionFromCookies(request);
        if (session && session.user) {
          console.log('[getAuthenticatedUser] ✅ Session found using direct cookie method (fallback)');
        }
      } catch (error: any) {
        console.warn('[getAuthenticatedUser] Direct cookie method also failed:', error.message);
      }
    }

    // Si ambos métodos fallaron, retornar null
    if (!session || !session.user) {
      if (process.env.NODE_ENV === 'development') {
        const cookieHeader = request.headers.get('cookie') || '';
        const cookieNames = cookieHeader.split(';').map(c => c.trim().split('=')[0]).filter(Boolean);
        console.log('[getAuthenticatedUser] ❌ No session found after all methods', {
          hasCookies: cookieHeader.includes('sb-'),
          cookieHeaderLength: cookieHeader.length,
          cookieNames: cookieNames,
          supabaseCookies: cookieNames.filter(n => n.includes('sb-')),
          triedHelperMethod: true,
          triedDirectMethod: true
        });
      }
      return null;
    }

    const authUser = session.user;
    const userId = authUser.id;

    // Intentar obtener el usuario de la tabla app_users primero
    let appUser = null;
    try {
      appUser = await db.getUserById(userId);
    } catch (error) {
      console.warn('[getAuthenticatedUser] No se pudo obtener usuario de app_users, usando user_metadata:', error);
    }

    // Si no existe en app_users, intentar crear registro automáticamente
    if (!appUser) {
      try {
        // Obtener rol de user_metadata o usar 'buyer' por defecto
        const roleFromMetadata = (authUser.user_metadata?.role as Role) ?? 'buyer';
        const kycStatusFromMetadata = (authUser.user_metadata?.kycStatus as 'none' | 'complete') ?? 'none';
        
        // Crear usuario en app_users
        appUser = await db.upsertUser({
          id: userId,
          name: authUser.user_metadata?.fullName ?? authUser.user_metadata?.name ?? authUser.email?.split('@')[0] ?? 'Usuario',
          role: roleFromMetadata,
          kycStatus: kycStatusFromMetadata,
          tenantId: DEFAULT_TENANT_ID,
          email: authUser.email ?? undefined,
          metadata: authUser.user_metadata ?? null
        });
      } catch (error) {
        console.warn('[getAuthenticatedUser] No se pudo crear usuario en app_users, usando user_metadata:', error);
        // Si falla, usar user_metadata directamente
        const roleFromMetadata = (authUser.user_metadata?.role as Role) ?? 'buyer';
        const kycStatusFromMetadata = (authUser.user_metadata?.kycStatus as 'none' | 'complete') ?? 'none';
        
        return {
          id: userId,
          email: authUser.email ?? '',
          role: roleFromMetadata,
          kycStatus: kycStatusFromMetadata,
          fullName: authUser.user_metadata?.fullName ?? authUser.user_metadata?.name ?? authUser.email?.split('@')[0] ?? null,
          avatarUrl: authUser.user_metadata?.avatarUrl ?? null,
          metadata: authUser.user_metadata ?? {}
        };
      }
    }

    // Mapear a AppUser (formato esperado por el resto de la aplicación)
    return {
      id: appUser.id,
      email: appUser.email ?? authUser.email ?? '',
      role: appUser.role,
      kycStatus: appUser.kycStatus,
      fullName: appUser.name,
      avatarUrl: authUser.user_metadata?.avatarUrl ?? null,
      metadata: appUser.metadata ?? {}
    };
  } catch (error) {
    console.error('[getAuthenticatedUser] Error:', error);
    return null;
  }
}

/**
 * Valida que el usuario tenga uno de los roles permitidos
 * @param user Usuario autenticado
 * @param allowedRoles Roles permitidos
 * @returns true si el usuario tiene un rol permitido
 */
export function requireRole(user: AppUser | null, allowedRoles: Role[]): boolean {
  if (!user) {
    return false;
  }

  return allowedRoles.includes(user.role);
}

/**
 * Helper para validar autenticación y rol en rutas API
 * Retorna el usuario si es válido, o null si no cumple los requisitos
 * @param request Request de Next.js
 * @param allowedRoles Roles permitidos (opcional, si no se especifica solo valida autenticación)
 * @returns Usuario autenticado o null
 */
export async function validateAuthAndRole(
  request: NextRequest,
  allowedRoles?: Role[]
): Promise<AppUser | null> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return null;
  }

  if (allowedRoles && !requireRole(user, allowedRoles)) {
    return null;
  }

  return user;
}

/**
 * Helper para crear respuesta de error de autenticación
 */
export function createAuthErrorResponse(message: string = 'Autenticación requerida') {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 401 }
  );
}

/**
 * Helper para crear respuesta de error de permisos
 */
export function createPermissionErrorResponse(message: string = 'No tienes permisos para realizar esta acción') {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 403 }
  );
}

