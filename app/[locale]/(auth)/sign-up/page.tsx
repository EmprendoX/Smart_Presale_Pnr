"use client";

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';

function SignUpContent() {
  const t = useTranslations('auth.signUp');
  const locale = useLocale();
  const router = useRouter();
  const { signInWithOtp, user, refreshSession } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  // Verificar si hay error en la URL (del callback)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');
      if (error) {
        setStatus('error');
        setMessage(error === 'missing_code' 
          ? 'Código de autenticación faltante. Por favor intenta nuevamente.'
          : error === 'no_session'
          ? 'No se pudo establecer la sesión. Por favor intenta nuevamente.'
          : `Error: ${decodeURIComponent(error)}`
        );
        // Limpiar el parámetro de error de la URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;

    try {
      setStatus('loading');
      setMessage('');
      // Incluir locale en el redirectTo para que el callback sepa a dónde redirigir
      const redirectTo = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback?locale=${locale}&next=/dashboard`
        : undefined;
      const result = await signInWithOtp(email, { redirectTo });
      
      // Verificar si fue autenticación automática (solo entornos demo)
      if (result?.autoAuthenticated) {
        setStatus('sent');
        setMessage(t('autoAuthenticated'));
        // En entornos demo, el usuario ya está autenticado; refrescar sesión para que el useEffect detecte el cambio
        await refreshSession();
      } else {
        // Supabase: se envió el email
        setStatus('sent');
        setMessage(t('otpSent'));
      }
    } catch (error: any) {
      console.error('[SignUp] OTP error', error);
      setStatus('error');
      setMessage(error?.message ?? t('genericError'));
    }
  };


  // Si el usuario ya está autenticado, refrescar sesión y redirigir
  useEffect(() => {
    if (user) {
      refreshSession().then(() => {
        const roleHome: Record<string, string> = {
          buyer: '/dashboard',
          developer: '/dev',
          admin: '/admin'
        };
        router.replace(roleHome[user.role] || '/dashboard');
      });
    }
  }, [user, router, refreshSession]);

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-semibold mb-2">{t('title')}</h1>
      <p className="text-neutral-600 mb-6">{t('subtitle')}</p>

      <section className="space-y-4 rounded-lg border p-6 shadow-sm">
        <h2 className="text-xl font-medium">{t('emailTitle')}</h2>
        <p className="text-sm text-neutral-600">{t('emailDescription')}</p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="space-y-2 block">
            <span className="text-sm font-medium text-neutral-700">{t('emailLabel')}</span>
            <Input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="ana@example.com"
              required
            />
          </label>
          <Button type="submit" disabled={status === 'loading'} className="w-full">
            {status === 'loading' ? t('sending') : t('sendOtp')}
          </Button>
        </form>
        {message && (
          <p className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message}</p>
        )}
      </section>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <AuthProvider>
      <SignUpContent />
    </AuthProvider>
  );
}
