'use client';

import { useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { ErrorContent } from '@/components/ErrorContent';

// Mensajes estáticos completos para evitar problemas con hooks
const messages = {
  es: {
    error: {
      title: 'Algo salió mal',
      message: 'Ocurrió un error inesperado. Por favor intenta nuevamente.',
      reload: 'Recargar página',
      backHome: 'Volver al inicio'
    }
  },
  en: {
    error: {
      title: 'Something went wrong',
      message: 'An unexpected error occurred. Please try again.',
      reload: 'Reload page',
      backHome: 'Back to home'
    }
  }
};

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<'es' | 'en'>('es');
  
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Error:', error);
    
    // Obtener el locale de la URL de forma segura
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const pathLocale = path.split('/')[1];
      if (pathLocale === 'en' || pathLocale === 'es') {
        setLocale(pathLocale);
      }
    }
  }, [error]);

  const localeMessages = messages[locale];

  return (
    <NextIntlClientProvider messages={localeMessages}>
      <ErrorContent error={error} reset={reset} />
    </NextIntlClientProvider>
  );
}

