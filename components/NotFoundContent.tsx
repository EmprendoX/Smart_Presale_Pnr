'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export function NotFoundContent() {
  const t = useTranslations('notFound');

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center">
          <div className="text-6xl font-bold text-neutral-300 mb-4">404</div>
          <h1 className="text-2xl font-semibold mb-2">{t('title')}</h1>
          <p className="text-neutral-600 mb-6">{t('message')}</p>
          <Link href="/">
            <Button>{t('backHome')}</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

