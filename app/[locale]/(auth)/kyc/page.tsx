"use client";

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';

function KycContent() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirigir al dashboard - KYC simplificado, los datos se capturan al reservar
  useEffect(() => {
    if (user) {
      const roleHome: Record<string, string> = {
        buyer: '/dashboard',
        developer: '/dev',
        admin: '/admin'
      };
      router.replace(roleHome[user.role] || '/dashboard');
    } else {
      router.replace('/sign-up');
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
        <p className="text-neutral-600">Redirigiendo...</p>
      </div>
    </div>
  );
}

export default function KycPage() {
  return (
    <AuthProvider>
      <KycContent />
    </AuthProvider>
  );
}
