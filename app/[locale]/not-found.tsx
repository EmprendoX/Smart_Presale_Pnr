'use client';

import { useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { NotFoundContent } from '@/components/NotFoundContent';

// Mensajes estáticos completos para evitar problemas con getMessages
const messages = {
  es: {
    notFound: {
      title: 'Página no encontrada',
      message: 'Lo sentimos, la página que buscas no existe.',
      backHome: 'Volver al inicio'
    }
  },
  en: {
    notFound: {
      title: 'Page not found',
      message: 'Sorry, the page you are looking for does not exist.',
      backHome: 'Back to home'
    }
  }
};

export default function NotFound() {
  const [locale, setLocale] = useState<'es' | 'en'>('es');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const pathLocale = path.split('/')[1];
      if (pathLocale === 'en' || pathLocale === 'es') {
        setLocale(pathLocale);
      }
    }
  }, []);

  const localeMessages = messages[locale];

  return (
    <NextIntlClientProvider messages={localeMessages}>
      <NotFoundContent />
    </NextIntlClientProvider>
  );
}

