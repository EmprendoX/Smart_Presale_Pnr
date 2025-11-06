import { NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request: Request) {
  try {
    // Obtener el locale del query parameter o usar el default
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || routing.defaultLocale;
    
    // Validar que el locale sea válido
    const validLocale = routing.locales.includes(locale as any) ? locale : routing.defaultLocale;
    
    // Leer mensajes directamente desde los archivos JSON
    const messagesPath = join(process.cwd(), 'messages', `${validLocale}.json`);
    const messages = JSON.parse(readFileSync(messagesPath, 'utf-8'));
    
    return NextResponse.json(messages);
  } catch (error) {
    // Fallback a mensajes por defecto
    return NextResponse.json({
      error: {
        title: 'Something went wrong',
        message: 'An unexpected error occurred. Please try again.',
        reload: 'Reload page',
        backHome: 'Back to home'
      },
      notFound: {
        title: 'Page not found',
        message: 'Sorry, the page you are looking for does not exist.',
        backHome: 'Back to home'
      }
    });
  }
}

