import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/roles';
import { getSessionFromCookies, createSupabaseServerClientForReading } from '@/lib/auth/supabase';
import { isSupabaseEnabled } from '@/lib/auth/supabase';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const allCookies = request.cookies.getAll();
    
    // Parsear cookies manualmente
    const parsedCookies: Record<string, any> = {};
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const [name, ...rest] = cookie.trim().split('=');
        if (name && rest.length > 0) {
          const value = rest.join('=');
          try {
            // Intentar parsear como JSON si parece ser JSON
            if (value.startsWith('{') || value.startsWith('[')) {
              try {
                parsedCookies[name] = {
                  raw: value.substring(0, 100) + (value.length > 100 ? '...' : ''),
                  parsed: JSON.parse(decodeURIComponent(value))
                };
              } catch {
                parsedCookies[name] = {
                  raw: value.substring(0, 100) + (value.length > 100 ? '...' : ''),
                  parsed: null
                };
              }
            } else {
              parsedCookies[name] = {
                raw: value.substring(0, 100) + (value.length > 100 ? '...' : ''),
                parsed: null
              };
            }
          } catch {
            parsedCookies[name] = {
              raw: value.substring(0, 100) + (value.length > 100 ? '...' : ''),
              parsed: null
            };
          }
        }
      });
    }
    
    // Intentar obtener usuario autenticado
    const user = await getAuthenticatedUser(request);
    
    // Intentar obtener sesión directamente de cookies
    let sessionFromCookies = null;
    try {
      sessionFromCookies = await getSessionFromCookies(request);
    } catch (e: any) {
      console.error('[debug/auth-status] Error getting session from cookies:', e.message);
    }
    
    // Intentar obtener sesión usando el helper de Supabase
    let sessionFromHelper = null;
    let helperError = null;
    if (isSupabaseEnabled()) {
      try {
        const supabase = createSupabaseServerClientForReading(request);
        const result = await supabase.auth.getSession();
        if (result.data.session) {
          sessionFromHelper = {
            hasSession: true,
            userId: result.data.session.user?.id,
            email: result.data.session.user?.email,
            expiresAt: result.data.session.expires_at
          };
        } else if (result.error) {
          helperError = {
            message: result.error.message,
            status: result.error.status
          };
        }
      } catch (e: any) {
        helperError = {
          message: e.message,
          stack: e.stack
        };
      }
    }
    
    return NextResponse.json({
      authenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role,
        kycStatus: user.kycStatus,
        fullName: user.fullName
      } : null,
      cookies: {
        headerPresent: !!cookieHeader,
        headerLength: cookieHeader.length,
        cookieCount: allCookies.length,
        cookieNames: allCookies.map(c => c.name),
        supabaseCookies: allCookies.filter(c => c.name.includes('sb-')).map(c => ({
          name: c.name,
          valueLength: c.value.length
        })),
        parsedCookies: Object.keys(parsedCookies).reduce((acc, key) => {
          acc[key] = {
            hasValue: !!parsedCookies[key].raw,
            valueLength: parsedCookies[key].raw?.length || 0,
            isParsed: !!parsedCookies[key].parsed,
            hasAccessToken: parsedCookies[key].parsed?.access_token || parsedCookies[key].parsed?.session?.access_token
          };
          return acc;
        }, {} as Record<string, any>)
      },
      sessions: {
        fromCookies: sessionFromCookies ? {
          hasSession: true,
          userId: sessionFromCookies.user?.id,
          email: sessionFromCookies.user?.email
        } : null,
        fromHelper: sessionFromHelper,
        helperError: helperError
      },
      supabaseEnabled: isSupabaseEnabled()
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

