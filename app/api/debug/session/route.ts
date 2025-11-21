import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/roles';
import { getSessionFromCookies } from '@/lib/auth/supabase';

export async function GET(request: NextRequest) {
  try {
    // Intentar obtener usuario autenticado
    const user = await getAuthenticatedUser(request);
    
    // Intentar obtener sesión directamente de cookies
    const session = await getSessionFromCookies(request);
    
    const cookieHeader = request.headers.get('cookie') || '';
    const allCookies = request.cookies.getAll();
    
    return NextResponse.json({
      authenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role,
        kycStatus: user.kycStatus
      } : null,
      session: session ? {
        hasSession: true,
        userId: session.user?.id,
        expiresAt: session.expires_at
      } : null,
      cookies: {
        headerPresent: !!cookieHeader,
        headerLength: cookieHeader.length,
        cookieCount: allCookies.length,
        cookieNames: allCookies.map(c => c.name),
        supabaseCookies: allCookies.filter(c => c.name.includes('sb-')).map(c => ({
          name: c.name,
          valueLength: c.value.length
        }))
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}





