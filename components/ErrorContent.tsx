'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export function ErrorContent({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-semibold mb-2">{t('title')}</h1>
          <p className="text-neutral-600 mb-6">{t('message')}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={reset}>{t('reload')}</Button>
            <Link href="/">
              <Button variant="secondary">{t('backHome')}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

