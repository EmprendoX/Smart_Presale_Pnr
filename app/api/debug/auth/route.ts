import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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
            parsedCookies[name] = {
              raw: value.substring(0, 100) + (value.length > 100 ? '...' : ''),
              parsed: JSON.parse(decodeURIComponent(value))
            };
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
  
  return NextResponse.json({
    cookieHeader: cookieHeader.substring(0, 500) + (cookieHeader.length > 500 ? '...' : ''),
    cookieHeaderLength: cookieHeader.length,
    cookiesFromHeaders: Object.keys(parsedCookies),
    cookiesFromRequest: allCookies.map(c => ({ name: c.name, valueLength: c.value.length })),
    parsedCookies,
    hasSupabaseCookies: Object.keys(parsedCookies).some(k => k.includes('sb-')),
    supabaseCookies: Object.keys(parsedCookies).filter(k => k.includes('sb-')),
    headers: {
      'user-agent': request.headers.get('user-agent'),
      'origin': request.headers.get('origin'),
      'referer': request.headers.get('referer')
    }
  });
}





