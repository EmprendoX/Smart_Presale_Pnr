"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';

export const dynamic = 'force-dynamic';

const MAX_RETRIES = 5;
const INITIAL_DELAY = 300;
const RETRY_DELAY = 500;

function VerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, refreshSession } = useAuth();
  const locale = searchParams.get('locale') || 'es';
  const next = searchParams.get('next') || '/dashboard';
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let retryTimeoutId: NodeJS.Timeout;
    let isMounted = true;

    // Verificación inmediata al cargar la página
    const immediateCheck = async () => {
      try {
        const { getSupabaseBrowserClient, isSupabaseEnabled } = await import('@/lib/auth/supabase');
        if (isSupabaseEnabled()) {
          const client = getSupabaseBrowserClient();
          // Forzar lectura inmediata de sesión
          const { data: { session } } = await client.auth.getSession();
          if (session) {
            console.log('[auth/verify] Session found immediately on page load!');
            
            // Forzar sincronización de cookies en el cliente
            if (typeof window !== 'undefined' && session.access_token) {
              try {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
                const cookieName = `sb-${projectRef}-auth-token`;
                
                const sessionData = {
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                  expires_at: session.expires_at,
                  expires_in: session.expires_in || 3600,
                  token_type: session.token_type || 'bearer',
                  user: session.user
                };
                
                const expires = session.expires_at 
                  ? new Date(session.expires_at * 1000).toUTCString()
                  : new Date(Date.now() + 3600000).toUTCString();
                
                document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(sessionData))}; expires=${expires}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
                console.log('[auth/verify] Cookie synced immediately after session detection');
              } catch (cookieError) {
                console.error('[auth/verify] Failed to sync cookie:', cookieError);
              }
            }
            
            const { mapSupabaseUser } = await import('@/lib/auth/supabase');
            const appUser = mapSupabaseUser(session.user);
            if (appUser) {
              const roleHome: Record<string, string> = {
                buyer: '/dashboard',
                developer: '/dev',
                admin: '/admin'
              };
              const destination = roleHome[appUser.role] || '/dashboard';
              setStatus('success');
              router.replace(`/${locale}${destination}`);
              return true;
            }
          }
        }
      } catch (error) {
        console.error('[auth/verify] Error in immediate check:', error);
      }
      return false;
    };

    const verifyAndRedirect = async (retryCount: number = 0): Promise<void> => {
      if (!isMounted) return;

      console.log(`[auth/verify] Attempt ${retryCount + 1}/${MAX_RETRIES} - Verifying session...`);

      try {
        // Forzar refresh de sesión
        await refreshSession();

        // Esperar un momento para que el AuthProvider actualice el estado
        await new Promise(resolve => setTimeout(resolve, 300));

        // Verificar sesión directamente desde el cliente de Supabase
        const { getSupabaseBrowserClient, isSupabaseEnabled } = await import('@/lib/auth/supabase');
        
        if (!isSupabaseEnabled()) {
          console.warn('[auth/verify] Supabase not enabled, checking user from AuthProvider');
          // En modo JSON, usar el usuario del AuthProvider
          if (user) {
            const roleHome: Record<string, string> = {
              buyer: '/dashboard',
              developer: '/dev',
              admin: '/admin'
            };
            const destination = roleHome[user.role] || '/dashboard';
            console.log('[auth/verify] User found, redirecting to:', destination);
            setStatus('success');
            router.replace(`/${locale}${destination}`);
            return;
          }
        } else {
          const client = getSupabaseBrowserClient();
          const { data: { session }, error } = await client.auth.getSession();

          if (error) {
            console.error('[auth/verify] Error getting session:', error);
          }

          if (session && session.user) {
            // Sesión detectada, determinar destino
            
            // Forzar sincronización de cookies en el cliente
            if (typeof window !== 'undefined' && session.access_token) {
              try {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
                const cookieName = `sb-${projectRef}-auth-token`;
                
                const sessionData = {
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                  expires_at: session.expires_at,
                  expires_in: session.expires_in || 3600,
                  token_type: session.token_type || 'bearer',
                  user: session.user
                };
                
                const expires = session.expires_at 
                  ? new Date(session.expires_at * 1000).toUTCString()
                  : new Date(Date.now() + 3600000).toUTCString();
                
                document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(sessionData))}; expires=${expires}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
                console.log('[auth/verify] Cookie synced after session detection');
              } catch (cookieError) {
                console.error('[auth/verify] Failed to sync cookie:', cookieError);
              }
            }
            
            const { mapSupabaseUser } = await import('@/lib/auth/supabase');
            const appUser = mapSupabaseUser(session.user);

            console.log('[auth/verify] Session found:', {
              userId: appUser?.id,
              email: appUser?.email,
              role: appUser?.role,
              kycStatus: appUser?.kycStatus
            });

            let destination = next;
            
            if (appUser) {
              // Redirigir según rol
              const roleHome: Record<string, string> = {
                buyer: '/dashboard',
                developer: '/dev',
                admin: '/admin'
              };
              destination = roleHome[appUser.role] || '/dashboard';
            }

            console.log('[auth/verify] Session verified, redirecting to:', destination);
            setStatus('success');
            router.replace(`/${locale}${destination}`);
            return;
          }
        }

        // No hay sesión aún, intentar de nuevo si no hemos alcanzado el máximo
        if (retryCount < MAX_RETRIES - 1) {
          console.log(`[auth/verify] No session found, retrying in ${RETRY_DELAY}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          setAttempt(retryCount + 1);
          retryTimeoutId = setTimeout(() => {
            verifyAndRedirect(retryCount + 1);
          }, RETRY_DELAY);
        } else {
          // Máximo de intentos alcanzado, verificar cookies manualmente
          console.warn('[auth/verify] Max retries reached, checking cookies manually...');
          
          // Verificar si hay cookies de sesión presentes
          const hasAuthCookies = typeof document !== 'undefined' && 
            document.cookie.split(';').some(cookie => {
              const trimmed = cookie.trim();
              return trimmed.startsWith('sb-') || 
                     trimmed.includes('supabase') ||
                     trimmed.includes('auth-token') ||
                     trimmed.includes('access_token');
            });

          if (hasAuthCookies) {
            console.log('[auth/verify] Auth cookies found but session not detected, forcing full page reload...');
            // Forzar recarga completa de la página para que el navegador lea las cookies
            // Usar window.location.href en lugar de router para forzar recarga completa
            setTimeout(() => {
              window.location.href = `/${locale}${next}`;
            }, 500);
            return;
          }

          // Último intento: forzar recarga completa de todas formas
          // A veces las cookies están pero el cliente de Supabase no las detecta inmediatamente
          console.log('[auth/verify] Forcing full page reload as last resort...');
          setTimeout(() => {
            // Intentar primero recargar la página actual para que el cliente de Supabase lea las cookies
            window.location.reload();
          }, 1000);
        }
      } catch (error: any) {
        console.error('[auth/verify] Error during verification:', error);
        
        if (retryCount < MAX_RETRIES - 1) {
          console.log(`[auth/verify] Error occurred, retrying in ${RETRY_DELAY}ms...`);
          setAttempt(retryCount + 1);
          retryTimeoutId = setTimeout(() => {
            verifyAndRedirect(retryCount + 1);
          }, RETRY_DELAY);
        } else {
          console.error('[auth/verify] Max retries reached with errors, redirecting to sign-up');
          setStatus('error');
          router.replace(`/${locale}/sign-up?error=verification_failed`);
        }
      }
    };

    // Primero intentar verificación inmediata
    immediateCheck().then(found => {
      if (!found && isMounted) {
        // Si no se encontró inmediatamente, ejecutar verificación con retry logic
        timeoutId = setTimeout(() => {
          verifyAndRedirect(0);
        }, INITIAL_DELAY);
      }
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
    };
  }, [router, locale, next, refreshSession, user]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
        <p className="text-neutral-600">
          {status === 'verifying' 
            ? `Verificando sesión... (${attempt + 1}/${MAX_RETRIES})`
            : status === 'success'
            ? 'Redirigiendo...'
            : 'Error al verificar sesión'}
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <AuthProvider>
      <VerifyPageContent />
    </AuthProvider>
  );
}

