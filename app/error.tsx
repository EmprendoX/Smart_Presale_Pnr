'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { routing } from '@/i18n/routing';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  
  useEffect(() => {
    console.error('Error:', error);
    // Redirigir al locale por defecto para que el error se maneje en el layout de locale
    router.replace(`/${routing.defaultLocale}`);
  }, [error, router]);

  return null;
}

