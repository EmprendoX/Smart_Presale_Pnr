'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { ErrorContent } from '@/components/ErrorContent';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  
  useEffect(() => {
    console.error('Admin Error:', error);
  }, [error]);

  return <ErrorContent error={error} reset={reset} />;
}