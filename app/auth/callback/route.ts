import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, mapSupabaseUser } from '@/lib/auth/supabase';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';
  const locale = requestUrl.searchParams.get('locale') || 'es';

  if (!code) {
    console.error('[auth/callback] No code parameter found');
    return NextResponse.redirect(
      new URL(`/${locale}/sign-up?error=missing_code`, request.url)
    );
  }

  try {
    // Crear la respuesta de redirect primero
    const verifyUrl = new URL(`/auth/verify?locale=${locale}&next=${encodeURIComponent(next)}`, request.url);
    const response = NextResponse.redirect(verifyUrl);
    
    // Crear cliente de Supabase usando la respuesta de redirect
    // Esto asegura que las cookies se establezcan en la respuesta correcta
    const supabase = createSupabaseServerClient(request, response);

    console.log('[auth/callback] Exchanging code for session...', { code: code.substring(0, 10) + '...' });

    // Intercambiar código por sesión
    // Esto debería establecer las cookies automáticamente en la respuesta
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback] Error exchanging code for session:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      return NextResponse.redirect(
        new URL(`/${locale}/sign-up?error=${encodeURIComponent(error.message)}`, request.url)
      );
    }

    if (!data.session) {
      console.error('[auth/callback] No session returned after code exchange');
      return NextResponse.redirect(
        new URL(`/${locale}/sign-up?error=no_session`, request.url)
      );
    }

    // Verificar que la sesión tiene los datos necesarios
    if (!data.session.user) {
      console.error('[auth/callback] Session exists but user is missing');
      return NextResponse.redirect(
        new URL(`/${locale}/sign-up?error=invalid_session`, request.url)
      );
    }

    // Mapear usuario para obtener rol y estado KYC
    const user = mapSupabaseUser(data.session.user);

    console.log('[auth/callback] Successfully authenticated user:', {
      userId: user?.id,
      email: user?.email,
      role: user?.role,
      kycStatus: user?.kycStatus,
      sessionExpiresAt: data.session.expires_at,
      hasAccessToken: !!data.session.access_token
    });

    // Verificar que las cookies se establecieron
    const setCookieHeaders = response.headers.getSetCookie();
    console.log('[auth/callback] Session cookies status:', {
      cookieCount: setCookieHeaders.length,
      cookies: setCookieHeaders.map(c => c.split(';')[0]), // Solo mostrar nombres
      verifyUrl: verifyUrl.toString()
    });

    // Asegurar que las cookies tengan los flags correctos
    // El helper de Supabase debería hacer esto automáticamente, pero verificamos
    if (setCookieHeaders.length > 0) {
      console.log('[auth/callback] ✅ Cookies set successfully by Supabase helper');
      
      // Verificar que hay una cookie de auth-token
      const hasAuthCookie = setCookieHeaders.some(c => 
        c.toLowerCase().includes('sb-') && 
        (c.toLowerCase().includes('auth-token') || c.toLowerCase().includes('auth.token'))
      );
      
      if (!hasAuthCookie) {
        console.warn('[auth/callback] ⚠️ WARNING: No auth-token cookie detected in set cookies');
        console.warn('[auth/callback] Cookie names:', setCookieHeaders.map(c => c.split(';')[0]));
      } else {
        console.log('[auth/callback] ✅ Auth-token cookie detected');
      }
    } else {
      console.error('[auth/callback] ❌ ERROR: No cookies detected after exchangeCodeForSession');
      console.error('[auth/callback] This indicates a problem with the Supabase auth helper');
      console.error('[auth/callback] Session data available:', {
        hasAccessToken: !!data.session.access_token,
        hasRefreshToken: !!data.session.refresh_token,
        expiresAt: data.session.expires_at
      });
      
      // Intentar establecer la cookie manualmente como fallback
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
        
        response.cookies.set(cookieName, JSON.stringify(sessionData), {
          expires: new Date(data.session.expires_at * 1000),
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
        
        console.log('[auth/callback] ✅ Manually set auth cookie as fallback');
      } catch (manualCookieError: any) {
        console.error('[auth/callback] Failed to manually set cookie:', manualCookieError.message);
      }
    }

    return response;
  } catch (error: any) {
    console.error('[auth/callback] Unexpected error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.redirect(
      new URL(`/${locale}/sign-up?error=${encodeURIComponent(error.message || 'unknown_error')}`, request.url)
    );
  }
}

