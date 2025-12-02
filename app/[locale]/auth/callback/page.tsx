"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando autenticación...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Refrescar la sesión para obtener el usuario autenticado
        await refreshSession();
        
        setStatus('success');
        setMessage('¡Autenticación exitosa! Redirigiendo...');
        
        // Redirigir después de un breve delay
        setTimeout(() => {
          const redirectUrl = searchParams.get('redirect') || '/dashboard';
          router.push(redirectUrl);
        }, 2000);
        
      } catch (error) {
        console.error('[AuthCallback] Error:', error);
        setStatus('error');
        setMessage('Error al procesar la autenticación. Por favor intenta de nuevo.');
        
        // Redirigir al login después de mostrar el error
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [refreshSession, router, searchParams]);

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-semibold text-[color:var(--text-strong)]">
            Procesando Autenticación
          </h1>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            {status === 'loading' && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            )}
            
            {status === 'success' && (
              <div className="text-green-600">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            
            {status === 'error' && (
              <div className="text-red-600">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            
            <p className="text-center text-sm text-[color:var(--text-muted)]">
              {message}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
